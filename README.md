# update-issues-with-azure-devops-tracking-blocks

## Adding a tracking block to an issue

Tracking blocks are added to a GitHub issue body (the first comment under the issue title). A tracking block starts with a heading that matches `/az.*tracking/` case-insensitively. Then include one or more Azure DevOps pull request urls.

### Example

```
This issue tracks the work to support intergalatic ticketing. Changes will
be made to the Azure DevOps codebase.

## AzTracking

https://dev.azure.com/myOrg/myProject/_git/myProject/pullrequest/523
https://dev.azure.com/myOrg/myProject/_git/myProject/pullrequest/525
https://dev.azure.com/myOrg/myProject/_git/myProject/pullrequest/526
```

## Sample workflow

```
name: "Azure DevOps tracking"
on:
  schedule:
    - cron: "0 * * * *"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Run Action
      uses: hashtagchris/update-issues-with-azure-devops-tracking-blocks@v1
      with:
        issuesToken: ${{ secrets.GITHUB_TOKEN }}
        azureDevOpsOrgUrl: "https://dev.azure.com/myOrg"
        azureDevOpsToken: ${{ secrets.AZURE_PERSONAL_ACCESS_TOKEN }}
        azureDevOpsProjectName: "myProject"
        azureDevOpsReleaseDefinitionId: 3
        projectToken: ${{ secrets.REPO_PAT }}
        projectUrl: "https://github.com/orgs/myGitHubOrg/projects/1"
        projectColumnNameForCompletedPRs: "In progress"
```