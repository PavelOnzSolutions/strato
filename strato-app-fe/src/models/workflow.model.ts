export interface WorkflowStepDefinition {
  id: string;
  name: string;
  type: string; // e.g., 'REST_CALL', 'JAVA_DELEGATE', 'WAIT'
  async: boolean;
  config: Record<string, any>;
  nextStepId?: string;
  errorStepId?: string;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  description: string;
  steps: WorkflowStepDefinition[];
}

export interface StepExecution {
  stepId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  startTime: string;
  endTime?: string;
  outputs?: Record<string, any>;
  errorMessage?: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUSPENDED';
  currentStepId: string;
  variables: Record<string, any>;
  history: StepExecution[];
  startTime: string;
  endTime?: string;
}

// Backward-compatible legacy types used by existing editors/components
export interface IWorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: IWorkflowStep[];
  variables?: Record<string, any>;
}

export interface IWorkflowStep {
  id: string;
  name: string;
  type: EStepHandlerType;
  config: Record<string, any>;
  nextStepId: string | null;
  async: boolean;
}

export enum EStepHandlerType {
  REST_CALL = 'REST_CALL',
  JAVA_DELEGATE = 'JAVA_DELEGATE',
}

export interface IWorkflowStepExecution {
  stepId: string;
  status: EStepStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
  output?: any;
}

export enum EStepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
