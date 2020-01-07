export const projectCardsQuery = `
query projectCards($owner: String!, $repo: String!, $issueNumber: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $issueNumber) {
      title
      projectCards(first: 100) {
        nodes {
          id
          column {
            name
            id
          }
          project {
            url
            columns(first: 100) {
              nodes {
                name
                id
              }
            }
          }
        }
      }
    }
  }
}
`;

export interface projectCardsGraphqlResult {
  repository: {
    issue: {
      title: string,
      projectCards: {
        nodes: projectCard[]
      }
    }
  }
}

interface projectCard {
  id: string,
  column: projectColumn,
  // the easiest way to find the right columnId is to return project info with each card.
  project: project,
}

interface project {
  url: string,
  columns: {
    nodes: projectColumn[]
  }
}

interface projectColumn {
  name: string,
  id: string,
}
