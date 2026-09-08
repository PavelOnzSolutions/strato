import React, {useCallback, useEffect} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Badge, Box, Card, Flex, Heading, Spinner, Table, Text} from '@radix-ui/themes';
import {Clock, ListTree, PlayCircle} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {WorkflowService} from '../../services/WorkflowService.ts';
import {WorkflowInstance} from '../../models/workflow.model.ts';
import {useWebSocket} from '../../context/WebSocketContext.tsx';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'RUNNING' ? 'blue' :
    status === 'COMPLETED' ? 'green' :
    status === 'FAILED' ? 'red' :
    status === 'PENDING' ? 'orange' : 'gray';
  return <Badge color={color as any}>{status}</Badge>;
};

const WorkflowInstances: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  const { data: instances, isLoading: isLoadingInstances, isError: isErrorInstances } = useQuery<WorkflowInstance[]>({
    queryKey: ['workflow-instances'],
    queryFn: WorkflowService.getInstances,
    refetchInterval: 10000,
  });

  const { data: definitions } = useQuery({
    queryKey: ['workflow-definitions'],
    queryFn: WorkflowService.getDefinitions,
    staleTime: 60000,
  });

  const getDefinitionName = (id: string) => {
    return definitions?.find(d => d.id === id)?.name || id;
  };

  const handleWsUpdate = useCallback((change: any) => {
    // change: { entityId, operation, payload }
    queryClient.setQueryData<WorkflowInstance[] | undefined>(['workflow-instances'], (old) => {
      if (!old) return old;
      const idx = old.findIndex(i => i.id === change.entityId);
      if (idx === -1) {
        // for CREATE we may push
        if (change.operation === 'CREATE' && change.payload) {
          return [{ ...(change.payload as WorkflowInstance) }, ...old];
        }
        return old;
      }
      const updated = { ...old[idx], ...(change.payload || {}) } as WorkflowInstance;
      const copy = [...old];
      copy[idx] = updated;
      return copy;
    });
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = subscribe('/topic/observable/workflow_instances', handleWsUpdate);
    return () => { unsubscribe && unsubscribe(); };
  }, [subscribe, handleWsUpdate]);

  if (isLoadingInstances) {
    return (
      <Flex align="center" justify="center" className="h-64">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (isErrorInstances) {
    return (
      <Flex align="center" justify="center" className="h-64">
        <Text color="red">{t('msg_failed_to_load_workflows', 'Failed to load workflow instances')}</Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="6" mb="1">
            <PlayCircle className="inline-block mr-2 w-6 h-6 text-(--accent-9)" />
            {t('lbl_workflow_instances', 'Workflow Instances')}
          </Heading>
          <Text color="gray" size="2">
            {t('msg_workflow_instances_desc', 'Monitor running and completed workflow executions')}
          </Text>
        </Box>
      </Flex>

      <Card>
        {instances && instances.length > 0 ? (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t('lbl_instance_id', 'Instance ID')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('lbl_definition_id', 'Definition')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('lbl_status', 'Status')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('lbl_current_step', 'Current Step')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('lbl_started', 'Started')}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {instances!.map((inst) => (
                <Table.Row key={inst.id}>
                  <Table.RowHeaderCell>
                    <code className="text-xs">{inst.id}</code>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <ListTree size={14} className="text-gray-400" />
                      {getDefinitionName(inst.definitionId)}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={inst.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">{inst.currentStepId || '-'}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Clock size={14} className="text-gray-400" />
                      <Text size="1">{new Date(inst.startTime).toLocaleString()}</Text>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <Flex align="center" justify="center" p="6">
            <Text color="gray">{t('msg_no_workflow_instances', 'No workflow instances yet')}</Text>
          </Flex>
        )}
      </Card>
    </Box>
  );
};

export default WorkflowInstances;
