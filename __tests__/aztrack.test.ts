import * as aztrack from '../src/aztrack'
import { writeFileSync } from 'fs';

test('Returns undefined for text without tracking', () => {
    const issueBody = `
Fixing a typo.
I need to learn hwo to spell.
    `;

    expect(aztrack.tryExtractTrackingInfo(issueBody)).toBeUndefined();
})

test('Extracts PR and FFs from text', () => {
    const issueBody = `
Fixing a major bug

## AzTracking

https://dev.azure.com/mseng/AzureDevOps/_git/AzureDevOps/pullrequest/515655
FFs: Actions.Foo, Pipelines.Bar
    `;

    expect(aztrack.tryExtractTrackingInfo(issueBody)).toEqual({
        pullRequests: [515655],
        featureFlags: ["Actions.Foo", "Pipelines.Bar"],
        labelsOnly: false,
    });
})

test('FFs: None', () => {
    const issueBody = `## AzTracking

https://dev.azure.com/mseng/AzureDevOps/_git/AzureDevOps/pullrequest/513094
FFs: None`;

    expect(aztrack.tryExtractTrackingInfo(issueBody)).toEqual({
        pullRequests: [513094],
        featureFlags: [],
        labelsOnly: false,
    });
})

test('FFs: None', () => {
    const base64Body = "IyMgQXpUcmFja2luZw0KDQpodHRwczovL2Rldi5henVyZS5jb20vbXNlbmcvQXp1cmVEZXZPcHMvX2dpdC9BenVyZURldk9wcy9wdWxscmVxdWVzdC81MTMwOTQNCkZGczogTm9uZQ==";
    const issueBodyBuffer = Buffer.from(base64Body, 'base64');
    // writeFileSync('issueBody.txt', issueBodyBuffer);

    const issueBody = issueBodyBuffer.toString();
    // console.log(issueBody);

    expect(aztrack.tryExtractTrackingInfo(issueBody)).toEqual({
        pullRequests: [513094],
        featureFlags: [],
        labelsOnly: false,
    });
})