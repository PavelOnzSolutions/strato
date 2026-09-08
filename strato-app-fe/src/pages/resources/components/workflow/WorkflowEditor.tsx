import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {addEdge, Background, Connection, Controls, MiniMap, Node, NodeTypes, ReactFlow, useEdgesState, useNodesState} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {Badge, Box, Button, Dialog, Flex, ScrollArea, Spinner, Table, Text, TextField} from '@radix-ui/themes';
import {Clock, FlaskConical, HelpCircle, LayoutGrid, PlayCircle, Plus, Trash2} from 'lucide-react';
import {WorkflowNode} from './WorkflowNode';
import {StepConfigDialog} from './StepConfigDialog';
import WorkflowEditorHelp from '../../../documentation/WorkflowEditorHelp';
import {IWorkflowDefinition, IWorkflowStep, WorkflowInstance, EStepStatus} from '../../../../models/workflow.model';
import {
  createNewStep,
  layoutNodes,
  reactFlowToWorkflow,
  WorkflowNodeData,
  workflowToReactFlow,
} from '../../../../utils/workflow-transform';
import {useTranslation} from "react-i18next";
import {WorkflowService} from '../../../../services/WorkflowService';
import {useToast} from '../../../../context/ToastContext';
import {useWebSocket} from '../../../../context/WebSocketContext';

interface WorkflowEditorProps {
  definition: IWorkflowDefinition | null;
  onChange: (steps: IWorkflowStep[]) => void;
  readOnly?: boolean;
}

export const WorkflowEditor = ({definition, onChange, readOnly = false}: WorkflowEditorProps) => {
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const { t } = useTranslation();

  const initialData = useMemo(() => {
    if (definition && definition.steps.length > 0) {
      return workflowToReactFlow(definition);
    }
    return {nodes: [], edges: []};
  }, [definition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  useEffect(() => {
    setNodes(initialData.nodes);
    setEdges(initialData.edges);
  }, [initialData, setNodes, setEdges]);

  const [selectedStep, setSelectedStep] = useState<IWorkflowStep | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testVars, setTestVars] = useState<Record<string, any>>({});
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testInstance, setTestInstance] = useState<WorkflowInstance | null>(null);
  const { showToast } = useToast();
  const { subscribe } = useWebSocket();

  const handleConfigureNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const node = currentNodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedStep(node.data.step);
        setSelectedNodeId(nodeId);
        setConfigDialogOpen(true);
      }
      return currentNodes;
    });
  }, []);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      workflowNode: (props) => (
        <WorkflowNode
          {...props}
          data={{
            ...props.data,
            onConfigure: handleConfigureNode,
          }}
        />
      ),
    }),
    [handleConfigureNode]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge({...connection, animated: true}, eds));
      // Update backend data
      const updatedSteps = reactFlowToWorkflow(nodes, addEdge({...connection, animated: true}, edges));
      onChange(updatedSteps);
    },
    [nodes, edges, onChange, readOnly]
  );

  const handleAddNode = useCallback(() => {
    const newId = `step-${Date.now()}`;
    const newStep = createNewStep(newId, 'New Step');
    const newNode: Node<WorkflowNodeData> = {
      id: newId,
      type: 'workflowNode',
      position: {x: Math.random() * 400, y: Math.random() * 400},
      data: {
        label: newStep.name,
        step: newStep,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    onChange(reactFlowToWorkflow([...nodes, newNode], edges));
  }, [nodes, edges, onChange]);

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const newNodes = nodes.filter((n) => !selectedIds.has(n.id));
    const newEdges = edges.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target));

    setNodes(newNodes);
    setEdges(newEdges);
    onChange(reactFlowToWorkflow(newNodes, newEdges));
  }, [nodes, edges, onChange]);

  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = layoutNodes(nodes, edges);
    setNodes(layoutedNodes);
  }, [nodes, edges]);

  useEffect(() => {
    if (testDialogOpen) {
      setTestVars(definition?.variables || {});
      setTestError(null);
      setTestInstance(null);
    }
  }, [testDialogOpen, definition]);

  useEffect(() => {
    if (testInstance && testInstance.status !== 'COMPLETED' && testInstance.status !== 'FAILED') {
      const unsubscribe = subscribe('/topic/observable/workflow_instances', (change) => {
        if (change.entityId === testInstance.id) {
          setTestInstance(prev => ({ ...prev!, ...change.payload }));
        }
      });
      return () => { unsubscribe && unsubscribe(); };
    }
  }, [testInstance, subscribe]);

  const handleStartTest = useCallback(async () => {
    if (!definition?.id) {
      setTestError('Definition ID is missing. Save the workflow definition first.');
      return;
    }
    try {
      setTestLoading(true);
      setTestError(null);
      const instance = await WorkflowService.startWorkflow(definition.id, testVars);
      setTestInstance(instance);
      showToast(`Workflow started: ${instance.id}`, 'success');
    } catch (e: any) {
      const msg = e?.message || 'Failed to start workflow';
      setTestError(msg);
      showToast(msg, 'error');
    } finally {
      setTestLoading(false);
    }
  }, [definition, testVars, showToast]);

  const testNodes = useMemo(() => {
    const { nodes: baseNodes } = workflowToReactFlow(definition || { id: '', name: '', steps: [] });
    return baseNodes.map(node => {
      const execution = testInstance?.history?.find(h => h.stepId === node.id);
      const isCurrent = testInstance?.currentStepId === node.id;
      let status: EStepStatus | undefined = undefined;
      
      if (execution) {
        if (execution.status === 'COMPLETED') status = EStepStatus.COMPLETED;
        else if (execution.status === 'FAILED') status = EStepStatus.FAILED;
        else if (execution.status === 'RUNNING') status = EStepStatus.RUNNING;
      } else if (isCurrent) {
        status = EStepStatus.RUNNING;
      }

      return {
        ...node,
        data: {
          ...node.data,
          status, // Pass status to node for animation
        },
      };
    });
  }, [definition, testInstance]);

  const testEdges = useMemo(() => {
    const { edges: baseEdges } = workflowToReactFlow(definition || { id: '', name: '', steps: [] });
    return baseEdges.map(edge => ({
      ...edge,
      animated: testInstance?.currentStepId === edge.source || 
                testInstance?.history?.some(h => h.stepId === edge.source && h.status === 'RUNNING'),
    }));
  }, [definition, testInstance]);

  const handleSaveStep = useCallback(
    (updatedStep: IWorkflowStep) => {
      if (!selectedNodeId) return;

      const updatedNodes = nodes.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            id: updatedStep.id,
            data: {
              ...node.data,
              label: updatedStep.name,
              step: updatedStep,
            },
          };
        }
        return node;
      });

      // Update edges if node ID changed
      const updatedEdges = edges.map((edge) => {
        if (edge.source === selectedNodeId) {
          return {...edge, source: updatedStep.id};
        }
        if (edge.target === selectedNodeId) {
          return {...edge, target: updatedStep.id};
        }
        return edge;
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);
      onChange(reactFlowToWorkflow(updatedNodes, updatedEdges));
    },
    [selectedNodeId, nodes, edges, onChange]
  );

  return (
    <Box style={{height: '600px', borderRadius: '8px', overflow: 'hidden'}} className="border border-(--glass-border)">
      <Flex direction="column" style={{height: '100%'}}>
        {!readOnly && (
          <Flex gap="2" p="2" className="glass !rounded-none !rounded-t-lg border-b border-(--glass-border)">
            <Button size="2" variant="soft" onClick={handleAddNode}>
              <Plus size={16}/>
              {t('mit_workflow_editor_add_step', 'Add Step')}
            </Button>
            <Button size="2" variant="soft" color="red" onClick={handleDeleteSelected}>
              <Trash2 size={16}/>
              {t('mit_workflow_editor_delete_selected', 'Delete Selected')}
            </Button>
            <Button size="2" variant="soft" onClick={handleAutoLayout}>
              <LayoutGrid size={16}/>
              {t('mit_workflow_editor_auto_layout', 'Auto Layout')}
            </Button>
            <Button size="2" variant="soft" onClick={() => setTestDialogOpen(true)} color="mint">
              <FlaskConical size={16}/>
              {t('mit_workflow_editor_test_workflow', 'Test Workflow')}
            </Button>
            <Box style={{marginLeft: 'auto'}}>
              <Button size="2" variant="soft" onClick={() => setHelpDialogOpen(true)}>
                <HelpCircle size={16}/>
                Help
              </Button>
            </Box>
          </Flex>
        )}

        <Box style={{flex: 1}}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
          >
            <Background/>
            <Controls
              className="glass-card !rounded-lg [&>button]:!bg-transparent [&>button]:!border-[var(--glass-border)] [&>button:hover]:!bg-[var(--glass-bg)] [&>button>svg]:!fill-current"/>
            <MiniMap className="glass-card !rounded-lg"/>
          </ReactFlow>
        </Box>
      </Flex>

      <StepConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        step={selectedStep}
        onSave={handleSaveStep}
      />

      <Dialog.Root open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <Dialog.Content style={{ maxWidth: 1000, width: '90vw', maxHeight: '90vh' }}>
          <Dialog.Title>{t('mit_workflow_editor_test_workflow', 'Test Workflow')}</Dialog.Title>
          
          <Flex direction="column" gap="4">
            <Flex gap="4">
              {/* Left Side: Parameters Table */}
              <Box style={{ width: '350px' }}>
                <Text size="2" weight="bold" mb="2" as="div">Input Parameters</Text>
                <Table.Root variant="surface" size="1">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Parameter</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {Object.keys(testVars).length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={2} align="center">
                          <Text size="1" color="gray">No variables defined</Text>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      Object.entries(testVars).map(([key, value], idx) => (
                        <Table.Row key={`${key}-${idx}`}>
                          <Table.Cell><Text size="1">{key}</Text></Table.Cell>
                          <Table.Cell>
                            <TextField.Root 
                              size="1" 
                              value={typeof value === 'object' ? JSON.stringify(value) : String(value)} 
                              onChange={(e) => setTestVars(prev => ({ ...prev, [key]: e.target.value }))}
                              disabled={testInstance !== null && testInstance.status === 'RUNNING'}
                            />
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>

                {testInstance && (
                  <Box mt="4">
                    <Text size="2" weight="bold" mb="2" as="div">Output Parameters</Text>
                    <Table.Root variant="surface" size="1">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Parameter</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {Object.keys(testInstance.variables || {}).filter(k => !definition?.variables?.[k]).length === 0 ? (
                           <Table.Row>
                           <Table.Cell colSpan={2} align="center">
                             <Text size="1" color="gray">No outputs yet</Text>
                           </Table.Cell>
                         </Table.Row>
                        ) : (
                          Object.entries(testInstance.variables || {})
                            .filter(([k]) => !definition?.variables?.[k])
                            .map(([key, value], idx) => (
                            <Table.Row key={`${key}-${idx}`}>
                              <Table.Cell><Text size="1">{key}</Text></Table.Cell>
                              <Table.Cell>
                                <code className="text-[10px]">{JSON.stringify(value)}</code>
                              </Table.Cell>
                            </Table.Row>
                          ))
                        )}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                )}
              </Box>

              {/* Right Side: Animated Flow */}
              <Box style={{ flex: 1, height: '60vh', position: 'relative' }} className="border border-(--glass-border) rounded-lg overflow-hidden">
                <ReactFlow
                  nodes={testNodes}
                  edges={testEdges}
                  nodeTypes={nodeTypes}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  panOnDrag={true}
                  zoomOnScroll={true}
                >
                  <Background />
                </ReactFlow>
                {testInstance && (
                  <Box className="absolute top-2 right-2 glass-card p-2 rounded flex items-center gap-2">
                    <PlayCircle size={16} className={testInstance.status === 'RUNNING' ? 'animate-pulse text-blue-500' : ''} />
                    <Text size="1" weight="bold">{testInstance.status}</Text>
                  </Box>
                )}
              </Box>
            </Flex>

            {testError && (
              <Box className="text-red-600 text-sm p-2 bg-red-50 rounded border border-red-200">
                {testError}
              </Box>
            )}

            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  {t('btn_close', 'Close')}
                </Button>
              </Dialog.Close>
              {!testInstance || testInstance.status === 'COMPLETED' || testInstance.status === 'FAILED' ? (
                <Button onClick={handleStartTest} loading={testLoading}>
                  <FlaskConical size={16} />
                  {t('btn_start_test', 'Start Test')}
                </Button>
              ) : (
                <Button disabled variant="outline">
                   <Spinner size="1" />
                   Running...
                </Button>
              )}
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <Dialog.Content style={{maxWidth: 800, maxHeight: '85vh'}}>
          <Dialog.Title>Workflow Editor Help</Dialog.Title>
          <ScrollArea style={{height: '86vh'}}>
            <WorkflowEditorHelp hideTitle/>
          </ScrollArea>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};
