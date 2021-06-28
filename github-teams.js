const { Octokit } = require("@octokit/rest");
const { throttling } = require("@octokit/plugin-throttling");
const MyOctokit = Octokit.plugin(throttling);

`The permission to grant the team on this repository. Can be one of:
* pull - team members can pull, but not push to or administer this repository.
* push - team members can pull and push, but not administer this repository.
* admin - team members can pull, push and administer this repository.
* maintain - team members can manage the repository without access to sensitive or destructive actions. Recommended for project managers. Only applies to repositories owned by organizations.
* triage - team members can proactively manage issues and pull requests without write access. Recommended for contributors who triage a repository. Only applies to repositories owned by organizations.
`;

const permissions = {
  read: "pull",
  triage: "triage",
  write: "push",
  maintain: "maintain",
  admin: "admin",
};

const org = "agrc";
const token = "personal access token with admin org read/write";

const octokit = new MyOctokit({
  auth: `token ${token}`,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );

      // Retry twice after hitting a rate limit error, then give up
      if (options.request.retryCount <= 2) {
        console.log(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onAbuseLimit: (_, options) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
    },
  },
});

const getRepoList = async (org) => {
  let repositories = [];
  for await (const response of octokit.paginate.iterator(
    octokit.rest.repos.listForOrg,
    {
      org,
      per_page: 100,
      sort: "full_name",
    }
  )) {
    repositories = repositories.concat(response.data.map((repo) => repo.name));
  }

  return repositories;
};

const updatePermissions = (repos) => {
  for (let repo of repos) {
    try {
      console.log(`Updating team for ${repo}`);
      octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
        team_slug: "administrators",
        owner: org,
        org,
        repo,
        permission: permissions.admin,
      });
    } catch (e) {
      console.error(e.message);
    }
  }
};

const run = async () => {
  const repositoryList = await getRepoList(org);
  console.log(repositoryList.length);
  updatePermissions(repositoryList);
};

run();
