import {fetchWithAuth} from '../utils/api.ts';
import {WorkflowDefinition, WorkflowInstance} from '../models/workflow.model.ts';

const API_BASE_DEFINITIONS = '/workflow-definitions';
const API_BASE_INSTANCES = '/workflow-instances';

export const WorkflowService = {
    // Workflow Definitions
    async getDefinitions(): Promise<WorkflowDefinition[]> {
        const response = await fetchWithAuth(API_BASE_DEFINITIONS);
        if (!response.ok) throw new Error('Failed to fetch workflow definitions');
        return response.json();
    },

    async getDefinition(id: string): Promise<WorkflowDefinition> {
        const response = await fetchWithAuth(`${API_BASE_DEFINITIONS}/${id}`);
        if (!response.ok) throw new Error(`Failed to fetch workflow definition ${id}`);
        return response.json();
    },

    async createDefinition(definition: WorkflowDefinition): Promise<WorkflowDefinition> {
        const response = await fetchWithAuth(API_BASE_DEFINITIONS, {
            method: 'POST',
            body: JSON.stringify(definition),
        });
        if (!response.ok) throw new Error('Failed to create workflow definition');
        return response.json();
    },

    async updateDefinition(id: string, definition: WorkflowDefinition): Promise<WorkflowDefinition> {
        const response = await fetchWithAuth(`${API_BASE_DEFINITIONS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(definition),
        });
        if (!response.ok) throw new Error(`Failed to update workflow definition ${id}`);
        return response.json();
    },

    async patchDefinition(id: string, definition: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
        const response = await fetchWithAuth(`${API_BASE_DEFINITIONS}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(definition),
        });
        if (!response.ok) throw new Error(`Failed to patch workflow definition ${id}`);
        return response.json();
    },

    async deleteDefinition(id: string): Promise<void> {
        const response = await fetchWithAuth(`${API_BASE_DEFINITIONS}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`Failed to delete workflow definition ${id}`);
    },

    // Workflow Instances
    async getInstances(): Promise<WorkflowInstance[]> {
        const response = await fetchWithAuth(API_BASE_INSTANCES);
        if (!response.ok) throw new Error('Failed to fetch workflow instances');
        return response.json();
    },

    async getInstance(id: string): Promise<WorkflowInstance> {
        const response = await fetchWithAuth(`${API_BASE_INSTANCES}/${id}`);
        if (!response.ok) throw new Error(`Failed to fetch workflow instance ${id}`);
        return response.json();
    },

    async startWorkflow(definitionId: string, variables: Record<string, any> = {}): Promise<WorkflowInstance> {
        const response = await fetchWithAuth(`${API_BASE_INSTANCES}/start/${definitionId}`, {
            method: 'POST',
            body: JSON.stringify(variables),
        });
        if (!response.ok) throw new Error(`Failed to start workflow ${definitionId}`);
        return response.json();
    },
};
