import {fetchWithAuth} from "../../utils/api.ts";
import {OperationalMetricsResponse} from "../../models/cache.model.ts";

interface IDashboardStats {
  totalEnvironments: number;
  totalResources: number;
  successRate: number;
  activeDeployments: number;
  distribution?: Record<string, number>;
}

interface IDeploymentActivity {
  id: string;
  timestamp: string;
  userLogin: string;
  data: {
    status: 'START' | 'SUCCESS' | 'FAILURE';
    environmentName: string;
    message?: string;
  };
  entityId: string;
}

export const fetchStats = async (): Promise<IDashboardStats> => {
  const response = await fetchWithAuth('/dashboard/stats');
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

export const fetchStatusSummary = async (): Promise<string> => {
  const response = await fetchWithAuth('/dashboard/summary');
  if (!response.ok) throw new Error('Failed to fetch system summary');
  return response.text()
};

export const fetchRecentDeployments = async (): Promise<IDeploymentActivity[]> => {
  const response = await fetchWithAuth('/dashboard/deployments');
  if (!response.ok) throw new Error('Failed to fetch deployments');
  return response.json();
};

export const fetchMetrics = async (): Promise<OperationalMetricsResponse> => {
  const response = await fetchWithAuth('/management/strato-metrics');
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
};