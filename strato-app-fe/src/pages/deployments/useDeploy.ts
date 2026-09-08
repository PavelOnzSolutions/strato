import {useMutation} from '@tanstack/react-query';
import {triggerDeployment} from './deployments.ts';

export const useDeploy = () => {
  return useMutation({
    mutationFn: ({ environmentId, plan }: { environmentId: string; plan: any }) => 
      triggerDeployment(environmentId, plan),
  });
};
