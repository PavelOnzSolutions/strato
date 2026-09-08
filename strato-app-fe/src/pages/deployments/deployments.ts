import {fetchWithAuth} from '../../utils/api.ts';
import {DeploymentStatus, DeploymentTask} from '../../models/deployment.model.ts';

export const triggerDeployment = async (environmentId: string, plan: any) => {
  const response = await fetchWithAuth(`/deployments/${environmentId}`, {
    method: 'POST',
    body: JSON.stringify(plan),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Deployment failed');
  }
  return response.json() as Promise<{ taskId: string }>;
};

export const getDeploymentStatus = async (taskId: string) => {
  const response = await fetchWithAuth(`/deployments/status/${taskId}`);
  if (!response.ok) throw new Error('Failed to fetch deployment status');
  return response.json() as Promise<DeploymentStatus>;
};

export const getRunningTasks = async () => {
  const response = await fetchWithAuth('/deployments/tasks');
  if (!response.ok) throw new Error('Failed to fetch running tasks');
  return response.json() as Promise<DeploymentTask[]>;
};
