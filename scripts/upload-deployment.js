const yaml = require('js-yaml');

const {
  GITHUB_RUN_ID,
  INPUT_CDP_ACTIONS_API_TOKEN,
  INPUT_DEPLOYMENT_BATCH_DATA,
} = process.env;

async function uploadDeployment({
                                  cdpActionsApiToken,
                                  deploymentBatchData,
                                }) {
  const url = 'https://cdp-next-test.vercel.app/api/v1/deployments';
  const retries = 6;
  const retryDelay = 10000;

  let deploymentData;
  try {
    deploymentData = yaml.load(deploymentBatchData);
  } catch (e) {
    console.error('Failed to parse YAML:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(deploymentData)) {
    deploymentData = [deploymentData];
  }

  deploymentData = deploymentData.map(deployment => ({
    ...deployment,
    workflowRunId: GITHUB_RUN_ID,
  }));

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
        body: JSON.stringify(deploymentData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Deployment data sent successfully:', responseData);
        return;
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt >= retries) {
        throw new Error(`Failed to send deployment data after ${retries} attempts`);
      }
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  }
}

uploadDeployment({
  cdpActionsApiToken: INPUT_CDP_ACTIONS_API_TOKEN,
  deploymentBatchData: INPUT_DEPLOYMENT_BATCH_DATA,
}).catch(error => {
  console.error('Deployment data upload failed:', error.message);
  process.exit(1);
});