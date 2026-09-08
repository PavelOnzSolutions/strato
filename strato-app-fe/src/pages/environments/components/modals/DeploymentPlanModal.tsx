import React, {useMemo, useState} from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  IconButton,
  ScrollArea,
  Select,
  Spinner,
  Text,
  Tooltip
} from '@radix-ui/themes';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {fetchWithAuth} from '../../../../utils/api.ts';
import {IEnvironment, IEnvironmentNew} from '../../../../models/environment.model.ts';
import {EResourceType, IResource} from '../../../../models/resource.model.ts';
import {Activity, ArrowRight, Dices, Maximize, Rocket, ZoomIn, ZoomOut} from 'lucide-react';
import {useToast} from '../../../../context/ToastContext.tsx';
import {useTheme} from '../../../../context/ThemeContext.tsx';
import {useDeploy} from '../../../deployments/useDeploy.ts';
import {useDeploymentStatus} from '../../../deployments/useDeploymentStatus.ts';
import {useDeploymentNotifications} from '../../../deployments/useDeploymentNotifications.ts';
import {useNavigate} from 'react-router-dom';

interface DeploymentPlanModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    environment: IEnvironment | IEnvironmentNew;
}

interface PlanEdge {
    from: string;
    to: string;
    reason: string;
}

interface DeploymentPlan {
    order: string[];
    edges: PlanEdge[];
}

const SequenceDiagram: React.FC<{ plan: DeploymentPlan; environment: IEnvironment | IEnvironmentNew }> = ({ plan, environment }) => {
    const { t } = useTranslation();
    const { accentColor } = useTheme();
    const [zoom, setZoom] = useState(1);

    const { data: resources } = useQuery<IResource[]>({
        queryKey: ['resources'],
        queryFn: async () => {
            const response = await fetchWithAuth('/resources');
            if (!response.ok) throw new Error('Failed to fetch resources');
            return response.json();
        }
    });

    const participants = useMemo(() => {
        return plan.order.map(key => {
            const envNode = environment.nodes.find(n => n.key === key);
            const resource = resources?.find(r => r.id === envNode?.resourceClassId);
            return {
                key,
                label: envNode?.label || key,
                icon: resource?.icon
            };
        });
    }, [plan.order, environment.nodes, resources]);

    const steps = useMemo(() => {
        return plan.order.map((key, index) => {
            const incomingEdges = plan.edges.filter(e => e.to === key);
            return { key, index, incomingEdges };
        });
    }, [plan.order, plan.edges]);

    if (participants.length === 0) {
        return (
            <Flex align="center" justify="center" className="h-full">
                <Text color="gray">{t('msg_empty_plan', 'No steps in deployment plan')}</Text>
            </Flex>
        );
    }

    const colWidth = 220;
    const stepHeight = 100;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => setZoom(1);

    // @ts-ignore
    return (
        <Flex direction="column" className="h-full relative">
            <Box style={{ position: 'absolute', top: 10, right: 20, zIndex: 20, display: 'flex', gap: 8 }}>
                <Tooltip content={t('btn_zoom_in', 'Zoom In')}>
                    <IconButton variant="soft" color="gray" onClick={handleZoomIn} size="1">
                        <ZoomIn size={14} />
                    </IconButton>
                </Tooltip>
                <Tooltip content={t('btn_zoom_out', 'Zoom Out')}>
                    <IconButton variant="soft" color="gray" onClick={handleZoomOut} size="1">
                        <ZoomOut size={14} />
                    </IconButton>
                </Tooltip>
                <Tooltip content={t('btn_reset_zoom', 'Reset Zoom')}>
                    <IconButton variant="soft" color="gray" onClick={handleResetZoom} size="1">
                        <Maximize size={14} />
                    </IconButton>
                </Tooltip>
            </Box>

            <ScrollArea scrollbars="both" style={{ flex: 1 }}>
                <Box
                    style={{
                        minWidth: participants.length * colWidth * zoom,
                        padding: 40,
                        position: 'relative',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        transition: 'transform 0.2s ease-out'
                    }}
                >
                    {/* Participants Headers */}
                    <Flex mb="6" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        {participants.map((p) => (
                            <Box key={p.key} style={{ width: colWidth, textAlign: 'center', flexShrink: 0 }}>
                                <Card
                                    variant="surface"
                                    style={{
                                        margin: '0 10px',
                                        background: 'var(--accent-surface)',
                                        borderColor: 'var(--accent-7)',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                        padding: '8px 12px'
                                    }}
                                >
                                    <Flex align="center" gap="2" justify="center">
                                        {p.icon && <img src={`/assets/${p.icon}`} className="w-5 h-5" alt="" />}
                                        <Text size="2" weight="bold" truncate>{p.label}</Text>
                                    </Flex>
                                </Card>
                            </Box>
                        ))}
                    </Flex>

                    {/* Timelines and Steps */}
                    <Box style={{ position: 'relative', height: steps.length * stepHeight }}>
                        {/* Vertical Lines */}
                        {participants.map((p, i) => (
                            <Box
                                key={`line-${p.key}`}
                                style={{
                                    position: 'absolute',
                                    left: i * colWidth + colWidth / 2,
                                    top: -24,
                                    bottom: 0,
                                    width: 2,
                                    background: 'linear-gradient(to bottom, var(--accent-7), var(--gray-5))',
                                    zIndex: 0
                                }}
                            />
                        ))}

                        {/* Sequence Steps */}
                        {steps.map((step, stepIdx) => {
                            const participantIdx = participants.findIndex(p => p.key === step.key);
                            const y = stepIdx * stepHeight + stepHeight / 2;

                            return (
                                <React.Fragment key={`step-${step.key}`}>
                                    {/* Execution Indicator */}
                                    <Box
                                        style={{
                                            position: 'absolute',
                                            left: participantIdx * colWidth + colWidth / 2 - 10,
                                            top: y - 10,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'var(--accent-9)',
                                            border: '4px solid var(--gray-2)',
                                            boxShadow: 'var(--shadow-2)',
                                            zIndex: 5
                                        }}
                                        title={`Step ${stepIdx + 1}: ${participants[participantIdx].label}`}
                                    />
                                    <Box
                                        style={{
                                            position: 'absolute',
                                            left: participantIdx * colWidth + colWidth / 2 + 18,
                                            top: y - 12,
                                            zIndex: 5,
                                            background: 'var(--accent-3)',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--accent-6)',
                                            boxShadow: 'var(--shadow-1)'
                                        }}
                                    >
                                        <Text size="1" color={accentColor as any} weight="bold">#{stepIdx + 1}</Text>
                                    </Box>

                                    {/* Dependency Arrows */}
                                    {step.incomingEdges.map((edge, edgeIdx) => {
                                        const fromIdx = participants.findIndex(p => p.key === edge.from);
                                        if (fromIdx === -1) return null;

                                        const isForward = participantIdx > fromIdx;
                                        const startX = fromIdx * colWidth + colWidth / 2;
                                        const endX = participantIdx * colWidth + colWidth / 2;
                                        // Offset Y slightly for multiple edges to the same node
                                        const arrowY = y - 30 - (edgeIdx * 20);

                                        return (
                                            <Box
                                                key={`edge-${stepIdx}-${edgeIdx}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: Math.min(startX, endX),
                                                    top: arrowY,
                                                    width: Math.abs(endX - startX),
                                                    height: 30,
                                                    zIndex: 2
                                                }}
                                            >
                                                {/* Horizontal Line */}
                                                <Box
                                                    style={{
                                                        position: 'absolute',
                                                        top: 15,
                                                        left: 0,
                                                        right: 0,
                                                        height: 2,
                                                        background: 'var(--gray-8)',
                                                        borderTop: '1px dashed var(--gray-10)'
                                                    }}
                                                />
                                                {/* Arrow Head */}
                                                <Box
                                                    style={{
                                                        position: 'absolute',
                                                        top: 10,
                                                        [isForward ? 'right' : 'left']: 0,
                                                        transform: isForward ? 'rotate(0deg)' : 'rotate(180deg)'
                                                    }}
                                                >
                                                    <ArrowRight size={12} color="var(--gray-10)" />
                                                </Box>
                                                {/* Reason Label */}
                                                <Box
                                                    style={{
                                                        position: 'absolute',
                                                        top: -2,
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        background: 'var(--gray-2)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--gray-5)',
                                                        boxShadow: 'var(--shadow-1)',
                                                        maxWidth: '90%',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <Text size="1" color="gray" truncate title={edge.reason} style={{ fontSize: '10px' }}>
                                                        {edge.reason.replace(`${edge.from}.`, '').replace(`${edge.to}.`, '')}
                                                    </Text>
                                                </Box>
                                            </Box>
                                        );
                                    })}

                                    {/* Connection to the next step indicator (vertical label) */}
                                    {stepIdx < steps.length - 1 && (
                                        <Box
                                            style={{
                                                position: 'absolute',
                                                left: participantIdx * colWidth + colWidth / 2 - 30,
                                                top: y + stepHeight / 2 - 10,
                                                zIndex: 1,
                                                transform: 'rotate(-90deg)',
                                                transformOrigin: 'center'
                                            }}
                                        >
                                            <Text size="1" color="gray" style={{ fontSize: '9px', opacity: 0.6 }}>NEXT</Text>
                                        </Box>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </Box>
                </Box>
            </ScrollArea>
        </Flex>
    );
};

const DeploymentPlanModal: React.FC<DeploymentPlanModalProps> = ({ open, onOpenChange, environment }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    // @ts-ignore
    const { data: status, refetch: refetchStatus } = useDeploymentStatus(currentTaskId);
    const { mutate: deploy, isPending: isDeploying } = useDeploy();

    const handleWsMessage = React.useCallback((payload: any) => {
        if (payload.taskId === currentTaskId || payload.environmentId === (environment as IEnvironment).id) {
            queryClient.invalidateQueries({ queryKey: ['deploymentStatus', currentTaskId] });
        }
    }, [currentTaskId, environment, queryClient]);

    useDeploymentNotifications(handleWsMessage);

    const { data: resources } = useQuery<IResource[]>({
        queryKey: ['resources'],
        queryFn: async () => {
            const response = await fetchWithAuth('/resources');
            if (!response.ok) throw new Error('Failed to fetch resources');
            return response.json();
        }
    });

    const azureCredentials = useMemo(() => {
        return resources?.filter(r => r.type === EResourceType.AZURE_CREDENTIAL) || [];
    }, [resources]);

    const updateCredentialMutation = useMutation({
        mutationFn: async (credentialId: string | null) => {
            const envId = (environment as IEnvironment).id;
            if (!envId) return;

            const response = await fetchWithAuth(`/environments/${envId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        ...environment.config,
                        azureCredentialId: credentialId
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to update credential');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['environments'] });
            queryClient.invalidateQueries({ queryKey: ['deployment-plan', environment] });
        },
        onError: (error: Error) => {
            showToast(error.message, 'error');
        }
    });

    const { data: plan, isLoading, isError } = useQuery<DeploymentPlan>({
        queryKey: ['deployment-plan', environment],
        queryFn: async () => {
            const response = await fetchWithAuth('/environments/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(environment),
            });
            if (!response.ok) throw new Error('Failed to fetch deployment plan');
            return response.json();
        },
        enabled: open,
        refetchOnWindowFocus: false,
    });

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 1300, maxHeight: 900, display: 'flex', flexDirection: 'column' }}>
                <Dialog.Title>{t('lbl_deployment_plan', 'Deployment Plan')}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t('msg_deployment_plan_desc', 'Visualizes the execution order and dependencies for this environment.')}
                </Dialog.Description>

                <Flex gap="3" align="center" mb="4">
                    <Text size="2" weight="bold">{t('lbl_deployment_credential', 'Deployment Credential')}:</Text>
                    <Box style={{ width: 250 }}>
                        <Select.Root
                            value={environment.config?.azureCredentialId || 'null'}
                            onValueChange={(val) => updateCredentialMutation.mutate(val === 'null' ? null : val)}
                            disabled={updateCredentialMutation.isPending}
                        >
                            <Select.Trigger placeholder={t('ph_select_credential', 'Select Credential')} style={{ width: '100%' }} />
                            <Select.Content>
                                <Select.Item value="null">(System Default)</Select.Item>
                                {azureCredentials.map(cred => (
                                    <Select.Item key={cred.id} value={cred.id}>{cred.name}</Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>
                    {updateCredentialMutation.isPending && <Text size="1" color="gray">Updating...</Text>}
                </Flex>

                <Box className="flex-1 border rounded-md overflow-hidden relative bg-[var(--gray-2)]">
                    {isLoading && (
                        <Flex align="center" justify="center" className="h-full">
                            <Text>{t('lbl_loading_plan', 'Calculating plan...')}</Text>
                        </Flex>
                    )}
                    {isError && (
                        <Flex align="center" justify="center" className="h-full text-red-500">
                            <Text>{t('msg_plan_error', 'Failed to calculate plan')}</Text>
                        </Flex>
                    )}
                    {!isLoading && !isError && plan && (
                        <SequenceDiagram plan={plan} environment={environment} />
                    )}
                </Box>

                <Flex gap="3" mt="4" justify="end" align="center">
                    {status && status.status !== 'SUCCESS' && status.status !== 'FAILURE' && (
                        <Flex align="center" gap="2" mr="auto">
                            <Activity size={16} className="text-orange-500 animate-pulse" />
                            <Text size="1" color="gray">
                                {status.message || t('msg_deployment_in_progress', 'Deployment in progress...')}
                            </Text>
                        </Flex>
                    )}
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            {t('btn_close', 'Close')}
                        </Button>
                    </Dialog.Close>
                    <Button color="sky">
                        <Dices className="w-4 h-4 mr-2" />
                        {t('btn_dry_run', 'Dry Run')}
                    </Button>
                    <Button
                        color='orange'
                        disabled={isLoading || isError || isDeploying || (status && (status.status === 'START' || status.status === 'PENDING'))}
                        onClick={() => {
                            const envId = (environment as IEnvironment).id;
                            if (!envId) {
                                showToast(t('msg_save_before_deploy', 'Please save the environment before deploying'), 'error');
                                return;
                            }

                            deploy({ environmentId: envId, plan }, {
                                onSuccess: (data) => {
                                    setCurrentTaskId(data.taskId);
                                    showToast(t('msg_deployment_initiated', 'Deployment initiated. Tracking progress...'), 'info');
                                },
                                onError: (error: any) => {
                                    showToast(error.message || t('msg_deployment_failed', 'Deployment failed'), 'error');
                                }
                            });
                        }}
                    >
                        {isDeploying ? <Spinner size="1" /> : <Rocket className="w-4 h-4 mr-2" />}
                        {t('btn_deploy', 'Deploy')}
                    </Button>
                    {(status?.status === 'START' || status?.status === 'PENDING') && (
                        <Button 
                            variant="surface" 
                            color="gray"
                            onClick={() => navigate('/deployments/running')}
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            {t('btn_view_tasks', 'View Running Tasks')}
                        </Button>
                    )}
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default DeploymentPlanModal;
