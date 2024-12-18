const {
  GITHUB_SHA,
  GITHUB_REF_NAME,
  GITHUB_WORKFLOW,
  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  INPUT_CDP_ACTIONS_API_TOKEN,
  INPUT_NAME,
  INPUT_VERSION,
  INPUT_SIZE_KB,
  INPUT_ENV,
  INPUT_TYPE,
  INPUT_TAGS
} = process.env;

async function uploadArtifact({
                                cdpActionsApiToken,
                                name = null,
                                version = null,
                                sizeKb = '0',
                                env = null,
                                type = null,
                                tags = '{}',
                              }) {
  const url = 'https://cdp-next-test.vercel.app/api/v1/artifacts';
  const retries = 6;
  const retryDelay = 10000; // 10 seconds

  const payload = {
    name,
    version,
    sizeKb,
    env,
    type,
    codebaseCommit: GITHUB_SHA,
    repoBranch: GITHUB_REF_NAME,
    workflowTitle: GITHUB_WORKFLOW,
    workflowUrl: `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`,
    workflowRunId: GITHUB_RUN_ID,
    githubRepoName: GITHUB_REPOSITORY,
    tags,
  };

  const headers = {
    'Content-Type': 'application/json',
    'CDP-Actions-API-Token': `Bearer ${cdpActionsApiToken}`,
  };

  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Artifact uploaded successfully:', responseData);
        return;
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt >= retries) {
        throw new Error(`Failed to upload artifact after ${retries} attempts`);
      }
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  }
}

uploadArtifact({
  cdpActionsApiToken: INPUT_CDP_ACTIONS_API_TOKEN,
  name: INPUT_NAME,
  version: INPUT_VERSION,
  sizeKb: INPUT_SIZE_KB,
  env: INPUT_ENV,
  type: INPUT_TYPE,
  tags: INPUT_TAGS,
}).catch(error => {
  console.error('Artifact upload failed:', error.message);
  process.exit(1);
});
