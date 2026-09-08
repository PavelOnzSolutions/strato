import {useQuery} from '@tanstack/react-query';
import {getDeploymentStatus} from './deployments.ts';

export const useDeploymentStatus = (taskId: string | null) => {
  return useQuery({
    queryKey: ['deploymentStatus', taskId],
    queryFn: () => getDeploymentStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (data) => 
      data?.status === 'SUCCESS' || data?.status === 'FAILURE' ? false : 2000,
  });
};
