import React, {useCallback} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Badge, Box, Card, Flex, Heading, Spinner, Table, Text, Tabs} from '@radix-ui/themes';
import {Activity, Clock, PlayCircle, Server} from 'lucide-react';
import {getRunningTasks} from './deployments.ts';
import {useDeploymentNotifications} from './useDeploymentNotifications.ts';
import WorkflowInstances from './WorkflowInstances.tsx';

const RunningTasks: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: tasks, isLoading, isError } = useQuery({
        queryKey: ['running-tasks'],
        queryFn: getRunningTasks,
        refetchInterval: 5000,
    });

    const handleWsMessage = useCallback(() => {
        // Invalidate running tasks query when a notification is received
        queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
    }, [queryClient]);

    useDeploymentNotifications(handleWsMessage);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'START':
                return <Badge color="blue">{t('status_start', 'Starting')}</Badge>;
            case 'PENDING':
                return <Badge color="orange">{t('status_pending', 'Pending')}</Badge>;
            case 'SUCCESS':
                return <Badge color="green">{t('status_success', 'Success')}</Badge>;
            case 'FAILURE':
                return <Badge color="red">{t('status_failure', 'Failure')}</Badge>;
            default:
                return <Badge color="gray">{status}</Badge>;
        }
    };

    return (
        <Box p="6">
            <Tabs.Root defaultValue="deployments">
                <Tabs.List>
                    <Tabs.Trigger value="deployments">
                        <Flex align="center" gap="2">
                            <Activity className="inline-block w-4 h-4" />
                            {t('lbl_running_tasks', 'Running Tasks')}
                        </Flex>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="workflows">
                        <Flex align="center" gap="2">
                            <PlayCircle className="inline-block w-4 h-4" />
                            {t('lbl_workflow_instances', 'Workflow Instances')}
                        </Flex>
                    </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="deployments">
                    <Flex justify="between" align="center" mb="6" mt="4">
                        <Box>
                            <Heading size="6" mb="1">
                                <Activity className="inline-block mr-2 w-6 h-6 text-(--accent-9)" />
                                {t('lbl_running_tasks', 'Running Tasks')}
                            </Heading>
                            <Text color="gray" size="2">
                                {t('msg_running_tasks_desc', 'Monitor active deployment processes')}
                            </Text>
                        </Box>
                    </Flex>

                    <Card>
                        {isLoading ? (
                            <Flex align="center" justify="center" className="h-64">
                                <Spinner size="3" />
                            </Flex>
                        ) : isError ? (
                            <Flex align="center" justify="center" className="h-64">
                                <Text color="red">{t('msg_failed_to_load_tasks', 'Failed to load running tasks')}</Text>
                            </Flex>
                        ) : tasks && tasks.length > 0 ? (
                            <Table.Root variant="surface">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeaderCell>{t('lbl_task_id', 'Task ID')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_environment', 'Environment')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_status', 'Status')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_message', 'Message')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_started', 'Started')}</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {tasks.map((task) => (
                                        <Table.Row key={task.taskId}>
                                            <Table.RowHeaderCell>
                                                <code className="text-xs">{task.taskId}</code>
                                            </Table.RowHeaderCell>
                                            <Table.Cell>
                                                <Flex align="center" gap="2">
                                                    <Server size={14} className="text-gray-400" />
                                                    {task.environmentLabel || task.environmentId}
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>{getStatusBadge(task.status)}</Table.Cell>
                                            <Table.Cell>
                                                <Text size="1" color="gray">{task.message}</Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Flex align="center" gap="2">
                                                    <Clock size={14} className="text-gray-400" />
                                                    <Text size="1">
                                                        {new Date(task.startTime).toLocaleString()}
                                                    </Text>
                                                </Flex>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        ) : (
                            <Flex align="center" justify="center" p="6">
                                <Text color="gray">{t('msg_no_running_tasks', 'No running tasks at the moment')}</Text>
                            </Flex>
                        )}
                    </Card>
                </Tabs.Content>

                <Tabs.Content value="workflows">
                    <Box mt="4">
                        <WorkflowInstances />
                    </Box>
                </Tabs.Content>
            </Tabs.Root>
        </Box>
    );
};

export default RunningTasks;
