import {IEnvironment, IEnvironmentCompact} from "../../models/environment.model.ts";
import {fetchWithAuth} from "../../utils/api.ts";

export const fetchEnvironments = async (): Promise<IEnvironment[]> => {
    const response = await fetchWithAuth('/environments');
    if (!response.ok) {
        throw new Error(`Environments API GET all: Network response was failure: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

export const fetchEnvironmentByIdCompact = async (id: string): Promise<IEnvironmentCompact> => {
    const response = await fetchWithAuth(`/environments/${id}/compact`);
    if (!response.ok) {
        throw new Error(`Environments API GET by ID: Network response was failure: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export const fetchEnvironmentById = async (id: string): Promise<IEnvironment> => {
    const response = await fetchWithAuth(`/environments/${id}`);
    if (!response.ok) throw new Error(`Environments API GET by ID: Network response was failure: ${response.status} ${response.statusText}`);
    return response.json();
};

export const deleteEnvironment = async (documentId: string): Promise<void> => {
    const response = await fetchWithAuth(`/environments/document/${documentId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Environments API DELETE by ID: Network response was failure: ${response.status} ${response.statusText}`);
    }
};