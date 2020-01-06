export interface AzTrack {
  pullRequests: number[],
  // true to prevent the issue from being closed or moved across the project board.
  labelsOnly: boolean,
}

export function tryExtractTrackingInfo(issueBody: string) {
  const lines = issueBody.split(/\r?\n/);

  let insideAzTrack = false;
  let pullRequests: number[] = [];
  let labelsOnly = false;
  for (const line of lines) {
    if (insideAzTrack) {
      const prMatches = line.match(/https:\/\/dev.azure.com\/mseng\/AzureDevOps\/.*\/pullrequest\/(\d+)/);
      if (prMatches) {
        pullRequests.push(parseInt(prMatches[1]));
      }

      const labelsOnlyMatches = line.match(/(labels[\s-]*only)(:(.*))?/i);
      if (labelsOnlyMatches) {
        labelsOnly = true;
        const value = labelsOnlyMatches[2];
        if (value) {
          if (value.toLowerCase().includes("false") || value.toLowerCase().includes("off")) {
            labelsOnly = false;
          }
        }
      }
    }
    else if (line.match(/^#+\s*az.*tracking$/i)) {
      insideAzTrack = true;
    }
  }

  if (pullRequests.length) {
    return {
      pullRequests,
      labelsOnly,
    };
  }
}
