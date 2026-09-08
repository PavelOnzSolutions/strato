export interface DeploymentStatus {
  taskId: string;
  environmentId: string;
  status: 'START' | 'SUCCESS' | 'FAILURE' | 'PENDING';
  message: string;
  timestamp: string;
}

export interface DeploymentTask {
  taskId: string;
  environmentId: string;
  environmentLabel?: string;
  status: 'START' | 'SUCCESS' | 'FAILURE' | 'PENDING';
  message: string;
  startTime: string;
}
