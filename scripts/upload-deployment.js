const yaml = require('js-yaml');

const deploymentBatchData = process.env.INPUT_DEPLOYMENT_BATCH_DATA;
const cdpActionsApiToken = process.env.INPUT_CDP_ACTIONS_API_TOKEN;
const cdpServerApiUrl = process.env.INPUT_CDP_SERVER_API_URL;
const githubRunId = process.env.GITHUB_RUN_ID;

let deploymentData;
try {
  deploymentData = yaml.load(deploymentBatchData);
} catch (e) {
  console.error('Failed to parse YAML:', e.message);
  process.exit(1);
}

// 确保 deploymentData 是数组
if (!Array.isArray(deploymentData)) {
  deploymentData = [deploymentData];
}

// 注入 workflowRunId
deploymentData = deploymentData.map(deployment => ({
  ...deployment,
  workflowRunId: githubRunId
}));

const retries = 6;
const retryDelay = 10000;

async function sendData() {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${cdpServerApiUrl}/api/v1/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CDP-Actions-API-Token': `Bearer ${cdpActionsApiToken}`,
        },
        body: JSON.stringify(deploymentData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Deployment data sent successfully:', data);
        return;
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to send deployment data after ${retries} attempts`);
      }
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

sendData().catch(error => {
  console.error('Deployment data upload failed:', error.message);
  process.exit(1);
});