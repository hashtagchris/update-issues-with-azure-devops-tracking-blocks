import * as core from '@actions/core';
import * as github from '@actions/github';
import { tryExtractTrackingInfo } from './aztrack';
import { projectCardsQuery, projectCardsGraphqlResult } from './graphql-queries';

import { PullRequestTracker } from '@hashtagchris/azure-devops-pull-request-tracking';
import { PullRequestStatus } from 'azure-devops-node-api/interfaces/GitInterfaces';

async function run() {
  try {
    const context = github.context;

    core.debug(`Connecting to GitHub...`);
    const octokit = new github.GitHub(core.getInput('issuesToken'));
    const projectOctokit = new github.GitHub(core.getInput('projectToken'));

    const environmentsToIgnore = core.getInput('azureDevOpsReleaseEnvironmentsToIgnore').split(/,\s*/);
    core.debug(`Release environments to ignore: ${JSON.stringify(environmentsToIgnore)}`);

    core.debug(`Constructing PullRequestTracker...`);
    const prTracker = new PullRequestTracker(
      core.getInput('azureDevOpsOrgUrl'),
      core.getInput('azureDevOpsToken'),
      core.getInput('azureDevOpsProjectName'),
      parseInt(core.getInput('azureDevOpsReleaseDefinitionId')),
      environmentsToIgnore);

    core.debug('Getting environment names.');
    const prEnvironments = await prTracker.getEnvironmentNames();
    core.info(`PR environments: ${prEnvironments}`);

    core.debug(`Querying issues...`);

    // TODO: Retrieve multiple pages of issues?
    const openIssues = await octokit.issues.listForRepo({
      ...context.repo,
      state: "open",
    });

    core.debug(`Status: ${openIssues.status}`);
    core.debug(`Issues found: ${openIssues.data.length}`);

    for (const issuePair of openIssues.data.entries()) {
      const issue = issuePair[1];
      core.debug(`Inspecting #${issue.number}: ${issue.title}...`);

      if (issue.pull_request) {
        core.debug("Skipping pull request.");
        continue;
      }

      core.debug(`Body: ${issue.body}`);
      // Log the body in base64 to find unprintable characters and crlf.
      core.debug(`Body (base64): ${Buffer.from(issue.body).toString('base64')}`);

      const azTrack = tryExtractTrackingInfo(issue.body);
      if (!azTrack) {
        core.debug(`No tracking information found. Skipping issue ${issue.number}.`);
        continue;
      }

      core.debug(`Getting Azure DevOps deployInfos for issue ${issue.number}...`);
      const deployInfos = await prTracker.getDeployInfos(azTrack.pullRequests);
      core.debug(JSON.stringify(deployInfos));

      const unmergedPR = deployInfos.find(info => info.pullRequest.status !== PullRequestStatus.Completed);
      if (unmergedPR) {
        core.debug(`PR ${unmergedPR.pullRequest.id}'s status is ${unmergedPR.pullRequest.status}, not 3 ('Completed'). Skipping...`);
        continue;
      }

      core.debug(`Building deploy labels for issue ${issue.number}...`);
      const labels = deployInfos
                      .map(info => Object.keys(info.deployedEnvironments!))
                      // intersection: only keep environments all PRs are deployed to.
                      .reduce((res, set) => res.filter(env => set.includes(env)))
                      // e.g. "Deploy - Ring 0"
                      .map(env => `Deploy - ${env}`);

      core.debug(`Labels: ${labels}`);

      // What labels aren't already on the issue?
      const newLabels = labels.filter(v => !issue.labels.find(l => l.name === v));
      core.debug(`New labels for issue ${issue.number}: ${newLabels}`);

      if (newLabels.length) {
        core.info(`[issue ${issue.number}] Adding labels (${JSON.stringify(newLabels)})...`);
        const addLabelsResponse = await octokit.issues.addLabels({
          ...context.repo,
          issue_number: issue.number,
          labels: newLabels,
        });
        core.debug(JSON.stringify(addLabelsResponse));
      }
      else {
        core.debug(`No new labels to add.`);
      }

      if (azTrack.labelsOnly) {
        core.debug(`labels-only set. Done processing issue ${issue.number}`);
        continue;
      }

      let closeIssue = deployInfos.every(info => info.deployedToAllEnvironments);

      core.debug(`Close issue ${issue.number}: ${closeIssue}`);

      if (closeIssue) {
        core.info(`[issue ${issue.number}] PR changes deployed to all environments. Closing issue...`);

        const issueUpdateResponse = await octokit.issues.update({
          ...context.repo,
          issue_number: issue.number,
          state: "closed"
        });

        core.debug(JSON.stringify(issueUpdateResponse));
      }
      else {
        // Check if we need to move the project card to a different column.
        const projectCardsQueryResponse = await projectOctokit.graphql(projectCardsQuery, {
          ...context.repo,
          issueNumber: issue.number,
        });

        // TODO: Check errors collection? When does projectOctokit.graphql throw?

        // We know the shape of the graphql response.
        const projectCardsQueryResult = projectCardsQueryResponse as projectCardsGraphqlResult;

        core.debug(JSON.stringify(projectCardsQueryResult));

        for (const card of projectCardsQueryResult.repository.issue.projectCards.nodes) {
          if (card.project.url === core.getInput('projectUrl')) {
            const targetColumnName = core.getInput('projectColumnNameForCompletedPRs').toLowerCase();

            const targetColumn = card.project.columns.nodes.find(column => column.name.toLowerCase() === targetColumnName);
            if (!targetColumn) {
              throw new Error(`${card.project.url} doesn't include a column named ${targetColumnName}`);
            }

            if (card.column.id !== targetColumn.id) {
              core.info(`[issue ${issue.number}] Moving project card from '${card.column.name}' column to '${targetColumn.name}' column...`);

              const mutationResult = await projectOctokit.graphql(`
                mutation($moveInput: MoveProjectCardInput!) {
                  moveProjectCard(input: $moveInput) {
                    __typename
                    clientMutationId
                  }
                }
              `, {
                moveInput: {
                  cardId: card.id,
                  columnId: targetColumn.id,
                }
              });

              core.debug(JSON.stringify(mutationResult));
            }
          }
        }
      }
    }
  }
  catch (error) {
    core.debug("Caught error");
    core.debug(error);
    core.setFailed(error.message);
  }
}

function min<T>(values: T[]) {
  let minValue: T | undefined = undefined;
  for (const value of values) {
    if (minValue === undefined || minValue > value) {
      minValue = value;
    }
  }

  return minValue;
}

run();
