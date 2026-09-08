import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    addEdge,
    Background,
    Connection,
    ConnectionMode,
    Controls,
    Edge,
    EdgeTypes,
    MarkerType,
    Node,
    Panel,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import {
    Box,
    Button,
    Card,
    Dialog,
    Flex,
    Heading,
    IconButton,
    ScrollArea,
    Select,
    Separator,
    Switch,
    Text,
    TextField,
    Tooltip
} from '@radix-ui/themes';
import {
    CircleQuestionMark,
    Download,
    LayoutDashboard,
    Pencil,
    Plus,
    Save,
    Settings,
    ShieldCheck,
    Trash,
    VectorSquare,
    X
} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {useToast} from '../../context/ToastContext';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {usePageTitle} from '../../context/PageTitleContext';
import {fetchWithAuth} from '../../utils/api';
import {IEnvironment, IEnvironmentNew, IEnvironmentNode, IEnvironmentReference} from '../../models/environment.model';
import {EResourceType, IResource} from '../../models/resource.model';
import ResourceNode from './components/reactflow/ResourceNode.tsx';

import EditableEdge, {EditableEdgeData, IMapping} from './components/reactflow/EditableEdge.tsx';
import {useTranslation} from 'react-i18next';
import DeploymentPlanModal from './components/modals/DeploymentPlanModal.tsx';
import EnvironmentConfigModal from './components/modals/EnvironmentConfigModal.tsx';
import ConfigurationMapModal from './components/modals/ConfigurationMapModal.tsx';
import ConnectAttributesModal from './components/modals/ConnectAttributesModal.tsx';
import JsonEditorModal from '../../components/modals/JsonEditorModal.tsx';
import ArrayEditorModal from '../../components/modals/ArrayEditorModal.tsx';
import ReferenceAutocomplete from '../../components/system/ReferenceAutocomplete.tsx';
import {EnvironmentEditorHelpContent} from '../documentation/EnvironmentEditorDoc.tsx';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent.tsx';
import {useCanWrite} from '../../components/permissions/WriteGuard';


const nodeWidth = 200;
const nodeHeight = 80;

const getClosestHandle = (source: Node, target: Node) => {
    const sourceX = source.position.x + nodeWidth / 2;
    const sourceY = source.position.y + nodeHeight / 2;
    const targetX = target.position.x + nodeWidth / 2;
    const targetY = target.position.y + nodeHeight / 2;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            return { sourceHandle: 'right-out', targetHandle: 'left' };
        } else {
            return { sourceHandle: 'left-out', targetHandle: 'right' };
        }
    } else {
        if (dy > 0) {
            return { sourceHandle: 'bottom-out', targetHandle: 'top' };
        } else {
            return { sourceHandle: 'top-out', targetHandle: 'bottom' };
        }
    }
};

const getPositionedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 50,
        ranksep: 100,
        marginx: 50,
        marginy: 50
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // If there are many nodes and they are all in one rank, we might want to manually wrap them, however,
    //  dagre doesn't easily support "max width".
    // Let's check if we have many nodes and they are mostly at the same y (for TB) or same x (for LR)

    const ranks = new Map<number, string[]>();
    nodes.forEach(node => {
        const dagreNode = dagreGraph.node(node.id);
        const rankValue = direction === 'TB' ? dagreNode.y : dagreNode.x;
        if (!ranks.has(rankValue)) {
            ranks.set(rankValue, []);
        }
        ranks.get(rankValue)!.push(node.id);
    });

    const MAX_NODES_PER_RANK = 6;
    const nodeOffsets = new Map<string, { dx: number, dy: number }>();

    Array.from(ranks.keys()).sort((a, b) => a - b).forEach(rankKey => {
        const nodeIds = ranks.get(rankKey)!;
        if (nodeIds.length > MAX_NODES_PER_RANK) {
            nodeIds.forEach((id, index) => {
                const subRank = Math.floor(index / MAX_NODES_PER_RANK);
                const subIndex = index % MAX_NODES_PER_RANK;
                if (subRank > 0) {
                    if (direction === 'TB') {
                        // In TB, same rank means same Y. 
                        // If we have too many, we push them down (increase Y) 
                        // and reset their X to be based on subIndex.
                        // But wait, if we reset X we might overlap with other nodes.
                        // Simpler: just offset Y.
                        nodeOffsets.set(id, {
                            dx: (subIndex - index) * (nodeWidth + 50),
                            dy: subRank * (nodeHeight + 50)
                        });
                    } else {
                        // In LR, same rank means same X.
                        nodeOffsets.set(id, {
                            dx: subRank * (nodeWidth + 50),
                            dy: (subIndex - index) * (nodeHeight + 50)
                        });
                    }
                }
            });
        }
    });

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const offset = nodeOffsets.get(node.id) || { dx: 0, dy: 0 };

        let x = nodeWithPosition.x - nodeWidth / 2 + offset.dx;
        let y = nodeWithPosition.y - nodeHeight / 2 + offset.dy;

        // If it's TB and we have no edges, dagre puts everything at y = nodeHeight/2
        // We can wrap them into multiple rows
        if (edges.length === 0 && direction === 'TB') {
            const index = nodes.findIndex(n => n.id === node.id);
            const cols = Math.ceil(Math.sqrt(nodes.length));
            const row = Math.floor(index / cols);
            const col = index % cols;
            x = col * (nodeWidth + 50);
            y = row * (nodeHeight + 50);
        } else if (edges.length === 0 && direction === 'LR') {
            const index = nodes.findIndex(n => n.id === node.id);
            const rows = Math.ceil(Math.sqrt(nodes.length));
            const row = index % rows;
            const col = Math.floor(index / rows);
            x = col * (nodeWidth + 50);
            y = row * (nodeHeight + 50);
        }

        const newNode = {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            position: { x, y },
        };

        return newNode;
    });

    const newEdges = edges.map(edge => {
        const sourceNode = newNodes.find(n => n.id === edge.source);
        const targetNode = newNodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
            const handles = getClosestHandle(sourceNode, targetNode);
            return {
                ...edge,
                sourceHandle: handles.sourceHandle,
                targetHandle: handles.targetHandle
            };
        }
        return edge;
    });

    return { nodes: newNodes, edges: newEdges };
};

const generateRandomString = (length: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const applyNamingRule = (
    rule: string,
    resource: IResource,
    envName: string,
    envRegionId: string,
    userValues: Record<string, string>,
    resources: IResource[] | undefined
): string => {
    if (!rule) return userValues['name'] || 'limit-name'; // Fallback

    let result = rule;

    // {abbrv}
    result = result.replace('{abbrv}', resource.abbreviation || 'res');

    // {env}
    result = result.replace('{env}', envName || 'env');

    // {name}
    result = result.replace('{name}', userValues['name'] || 'unnamed');

    // {region}
    const regionResource = resources?.find(r => r.id === envRegionId);
    const regionName = regionResource?.name || envRegionId || 'region';
    result = result.replace('{region}', regionName);
    const regionAbbrv = regionResource?.defaults?.short || regionResource?.template?.short || (envRegionId ? envRegionId.substring(0, 4) : 'reg');
    result = result.replace('{region-abbrv}', regionAbbrv);

    // {rnd}
    if (result.includes('{rnd}')) {
        // We expect _rnd to be in values, initialized on creation
        const rnd = userValues['_rnd'] || '00000';
        result = result.replace('{rnd}', rnd);
    }

    return result.toLowerCase(); // Enforce lowercase convention usually? Or keep case? Resource names usually lower.
};

const nodeTypes = {
    resource: ResourceNode,
};

const edgeTypes: EdgeTypes = {
    editable: EditableEdge,
};

const fetchEnvironmentById = async (id: string): Promise<IEnvironment> => {
    const response = await fetchWithAuth(`/environments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch environment');
    return response.json();
};

const fetchResources = async (): Promise<IResource[]> => {
    const response = await fetchWithAuth('/resources');
    if (!response.ok) throw new Error('Failed to fetch resources');
    return response.json();
};

const EnvironmentEditContent = () => {
    const { id } = useParams<{ id: string }>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const canWrite = useCanWrite('PERM_ENVIRONMENT_WRITE');

    // State for ReactFlow
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // State for Environment Config
    const [config, setConfig] = useState({
        subscriptionId: '',
        region: '',
        resourceGroup: '',
        azureCredentialId: '',
        values: {} as Record<string, string>
    });

    // State for UI
    const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [planDialogOpen, setPlanDialogOpen] = useState(false);
    // Connect dialog state
    const [connectDialogOpen, setConnectDialogOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [sourceAttributes, setSourceAttributes] = useState<string[]>([]);
    const [targetAttributes, setTargetAttributes] = useState<string[]>([]);
    const [selectedFromAttr, setSelectedFromAttr] = useState<string>('');
    const [selectedToAttr, setSelectedToAttr] = useState<string>('');
    const [currentMappings, setCurrentMappings] = useState<IMapping[]>([]);
    const [envId, setEnvId] = useState('');
    const [envName, setEnvName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [contextMenu, setContextMenu] = useState<{ id: string; top: number; left: number } | null>(null);
    const [isCompactMode, setIsCompactMode] = useState(false);
    const [configMapDialogOpen, setConfigMapDialogOpen] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // Typed Template Variable State
    const [paramTypes, setParamTypes] = useState<Record<string, { type: string, secure?: boolean, subType?: string, catalogName?: string }>>({});

    // Editor modal states
    const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
    const [arrayEditorOpen, setArrayEditorOpen] = useState(false);
    const [editorTargetId, setEditorTargetId] = useState<string | null>(null);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorValue, setEditorValue] = useState<any>(null);
    const [editorItemType, setEditorItemType] = useState<'string' | 'number' | 'object'>('string');

    // Refs to avoid stale closures in edge data handlers
    const onLabelClickRef = useRef<(id: string) => void>(() => { });
    const onDeleteRef = useRef<(id: string) => void>(() => { });

    // Sync compact mode to nodes
    useEffect(() => {
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                isCompact: isCompactMode
            }
        })));
    }, [isCompactMode, setNodes]);

    const syncEdgesFromValues = useCallback((targetNodeId: string, values: unknown, currentNodes: Node[]) => {
        if (!values || typeof values !== 'object') return;

        setEdges((eds) => {
            // Group mappings by source node
            const sourceGroups = new Map<string, IMapping[]>();

            const walkAndFindReferences = (obj: any, path: string) => {
                if (typeof obj === 'string') {
                    // Match [[ ID:outputs:OutputName ]]
                    const regex = /\[\[\s*([\w.-]+):outputs:([\w.-]+)\s*\]\]/g;
                    let match;
                    while ((match = regex.exec(obj)) !== null) {
                        const sourceIdOrLabel = match[1];
                        const fromAttr = match[2];

                        // Try finding by ID first (preferred for stability), fallback to label (legacy support)
                        const sourceNode = currentNodes.find(n => n.id === sourceIdOrLabel) ||
                            currentNodes.find(n => n.data.label === sourceIdOrLabel);

                        if (sourceNode) {
                            if (!sourceGroups.has(sourceNode.id)) {
                                sourceGroups.set(sourceNode.id, []);
                            }
                            sourceGroups.get(sourceNode.id)!.push({ from: fromAttr, to: path });
                        }
                    }
                } else if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        walkAndFindReferences(item, `${path}[${index}]`);
                    });
                } else if (obj !== null && typeof obj === 'object') {
                    Object.entries(obj).forEach(([key, value]) => {
                        const newPath = path ? `${path}.${key}` : key;
                        walkAndFindReferences(value, newPath);
                    });
                }
            };

            walkAndFindReferences(values, '');

            // Filter out existing edges that target this node
            const otherEdges = eds.filter(e => e.target !== targetNodeId);
            const newEdges: Edge[] = [];

            sourceGroups.forEach((mappings, sourceId) => {
                const sourceNode = currentNodes.find(n => n.id === sourceId);
                const targetNode = currentNodes.find(n => n.id === targetNodeId);
                const handles = (sourceNode && targetNode) ? getClosestHandle(sourceNode, targetNode) : { sourceHandle: null, targetHandle: null };

                newEdges.push({
                    id: `e-${sourceId}-${targetNodeId}`,
                    type: 'editable',
                    source: sourceId,
                    target: targetNodeId,
                    sourceHandle: handles.sourceHandle,
                    targetHandle: handles.targetHandle,
                    markerEnd: { type: MarkerType.ArrowClosed },
                    data: {
                        mappings,
                        onLabelClick: (id: string) => onLabelClickRef.current(id),
                        onDelete: (id: string) => onDeleteRef.current(id)
                    },
                    animated: true,
                    deletable: true,
                });
            });

            const finalEdges = [...otherEdges, ...newEdges];

            // Only update if edges actually changed to avoid unnecessary re-renders
            // We use a simple length + source/target/mappings check for efficiency 
            // instead of full stringify if possible, but stringify is safest for data.mappings
            if (eds.length === finalEdges.length && JSON.stringify(eds) === JSON.stringify(finalEdges)) {
                return eds;
            }

            return finalEdges;
        });
    }, []);

    const syncAllEdges = useCallback((allNodes: Node[]) => {
        allNodes.forEach(node => {
            syncEdgesFromValues(node.id, node.data.values, allNodes);
        });
    }, [syncEdgesFromValues]);

    const handleLabelChange = useCallback((nodeId: string, newLabel: string) => {
        setNodes(nds => {
            // Find the old label of the node being renamed
            const targetNode = nds.find(n => n.id === nodeId);
            const oldLabel = targetNode?.data.label as string;

            const updatedNodes = nds.map(n => {
                let newNode = n;
                if (n.id === nodeId) {
                    newNode = { ...n, data: { ...n.data, label: newLabel } };
                }

                // If we have an old label, and it's different from the new one,
                // we should migrate any legacy label-based references to ID-based ones
                // in ALL nodes (including the one being renamed, though unlikely it references itself by label)
                if (oldLabel && oldLabel !== newLabel) {
                    const migrateReferences = (obj: any): any => {
                        if (typeof obj === 'string') {
                            // Match [[ OldLabel:outputs:OutputName ]]
                            const regex = new RegExp(`\\[\\[\\s*${oldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:outputs:([\\w.-]+)\\s*\\]\\]`, 'g');
                            if (regex.test(obj)) {
                                return obj.replace(regex, (_, output) => `[[ ${nodeId}:outputs:${output} ]]`);
                            }
                            return obj;
                        } else if (Array.isArray(obj)) {
                            return obj.map(migrateReferences);
                        } else if (obj !== null && typeof obj === 'object') {
                            const newObj: any = {};
                            for (const key in obj) {
                                newObj[key] = migrateReferences(obj[key]);
                            }
                            return newObj;
                        }
                        return obj;
                    };

                    const migratedValues = migrateReferences(newNode.data.values);
                    if (JSON.stringify(migratedValues) !== JSON.stringify(newNode.data.values)) {
                        newNode = {
                            ...newNode,
                            data: {
                                ...newNode.data,
                                values: migratedValues
                            }
                        };
                    }
                }

                return newNode;
            });

            syncAllEdges(updatedNodes);
            return updatedNodes;
        });
    }, [syncAllEdges]);

    // Data fetching
    const { data: environment } = useQuery({
        queryKey: ['environment', id],
        queryFn: () => fetchEnvironmentById(id!),
        enabled: !isNew,
        refetchOnWindowFocus: false,
    });

    const { data: resources } = useQuery({
        queryKey: ['resources'],
        queryFn: fetchResources,
    });

    const availableOutputs = React.useMemo(() => {
        const outs: { value: string; label: string }[] = [];
        nodes.forEach(node => {
            const res = resources?.find(r => r.id === node.data.resourceClassId);
            if (res?.outputs) {
                Object.keys(res.outputs).forEach(outName => {
                    outs.push({
                        value: `${node.id}:outputs:${outName}`,
                        label: `${node.data.label}:outputs:${outName}`
                    });
                });
            }
        });
        return outs;
    }, [nodes, resources]);

    usePageTitle(isNew ? t('ptitle_new_environment', 'New Environment') : `${t('ptitle_edit_environment', 'Edit Environment')}`);

    // Initialize from existing environment
    useEffect(() => {
        if (environment) {
            setConfig({
                subscriptionId: environment.config?.subscriptionId || '',
                region: environment.config?.region || '',
                azureCredentialId: environment.config?.azureCredentialId || '',
                resourceGroup: environment.config?.resourceGroup || '',
                values: environment.config?.values || {}
            });
            setEnvId(environment.id);
            setEnvName(environment.name || '');

            // Map EnvironmentNodes to ReactFlow Nodes
            const initialNodes: Node[] = (environment.nodes || []).map((node, index) => {
                const resource = resources?.find(r => r.id === node.resourceClassId);

                // Recalculate label based on current naming rule
                let label = node.label || node.key;
                if (resource && resource.namingRule?.format && !node.disableNamingRule) {
                    label = applyNamingRule(
                        resource.namingRule.format,
                        resource,
                        environment.name || '',
                        environment.config?.region || '',
                        node.values || {},
                        resources
                    );
                }

                return {
                    id: node.key, // Use key as ID for simplicity in this demo
                    type: 'resource',
                    style: {
                        border: '2px solid ' + (resource?.resourceCategory?.color || 'gray'),
                        borderRadius: '8px'

                    },
                    position: node.position || { x: 100 + (index * 200), y: 100 }, // Simple layout if no position
                    data: {
                        label: label,
                        type: resource?.name || 'Unknown Resource',
                        icon: resource?.icon,
                        resourceClassId: node.resourceClassId,
                        values: node.values || {},
                        disableNamingRule: node.disableNamingRule,
                        categoryColor: resource?.resourceCategory?.color,
                        persistenceId: node.id
                    },
                };
            });
            setNodes(initialNodes);

            // Synchronize edges from node values instead of relying on environment.references
            // which might be out of sync or in a different format.
            // This ensures the graph accurately reflects the [[ ... ]] expressions.
            setEdges([]); // Clear and let sync populate
            initialNodes.forEach(node => {
                syncEdgesFromValues(node.id, node.data.values, initialNodes);
            });

            // If there are no references in values, but there ARE environment.references, 
            // maybe we should keep them? But the requirement says node linking IS equivalent to [[...]]
            // So if it's not in the value, it's not a link.
        }
    }, [environment, resources, setNodes, setEdges, syncEdgesFromValues]);

    const onLayout = useCallback(
        (direction: string) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getPositionedElements(
                nodes,
                edges,
                direction
            );

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        },
        [nodes, edges, setNodes, setEdges]
    );

    // helper to flatten template keys (dot notation)
    const flattenKeys = useCallback((obj: Record<string, any>, prefix = ''): string[] => {
        if (!obj || typeof obj !== 'object') return [];
        const keys: string[] = [];
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                keys.push(...flattenKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        return keys;
    }, []);

    const onConnect = useCallback(
        (params: Connection) => {
            // When connecting nodes, show dialog to select attributes
            const sourceId = params.source;
            const targetId = params.target;
            if (!sourceId || !targetId) return;

            const sourceNode = nodes.find(n => n.id === sourceId);
            const targetNode = nodes.find(n => n.id === targetId);
            if (!sourceNode || !targetNode) return;

            const sourceRes = resources?.find(r => r.id === (sourceNode.data?.resourceClassId as string));
            const targetRes = resources?.find(r => r.id === (targetNode.data?.resourceClassId as string));

            const outputs = sourceRes?.outputs ? Object.keys(sourceRes.outputs) : ['output'];
            const inputs = targetRes?.template ? flattenKeys(targetRes.template) : (targetRes?.defaults ? Object.keys(targetRes.defaults) : ['input']);

            setSourceAttributes(outputs);
            setTargetAttributes(inputs);
            setSelectedFromAttr(outputs[0] || 'output');
            setSelectedToAttr(inputs[0] || 'input');
            setCurrentMappings([]);
            setPendingConnection(params);
            setEditingEdgeId(null);
            setConnectDialogOpen(true);
        },
        [nodes, resources, flattenKeys]
    );

    const handleEdgeLabelClick = useCallback((id: string) => {
        console.log('handleEdgeLabelClick called with id:', id);
        const edge = edges.find(e => e.id === id);
        if (!edge) return;

        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const sourceRes = resources?.find(r => r.id === (sourceNode.data?.resourceClassId as string));
        const targetRes = resources?.find(r => r.id === (targetNode.data?.resourceClassId as string));

        const outputs = sourceRes?.outputs ? Object.keys(sourceRes.outputs) : ['output'];
        const inputs = targetRes?.template ? flattenKeys(targetRes.template) : (targetRes?.defaults ? Object.keys(targetRes.defaults) : ['input']);

        const edgeData = edge.data as EditableEdgeData;

        setSourceAttributes(outputs);
        setTargetAttributes(inputs);

        if (edgeData.mappings && edgeData.mappings.length > 0) {
            setSelectedFromAttr(edgeData.mappings[0].from);
            setSelectedToAttr(edgeData.mappings[0].to);
            setCurrentMappings(edgeData.mappings);
        } else {
            setSelectedFromAttr(outputs[0] || 'output');
            setSelectedToAttr(inputs[0] || 'input');
            setCurrentMappings([]);
        }

        setPendingConnection({ source: edge.source, target: edge.target, sourceHandle: null, targetHandle: null });
        setEditingEdgeId(edge.id);
        setConnectDialogOpen(true);
    }, [nodes, edges, resources, flattenKeys]);

    const handleDeleteEdge = useCallback((id: string) => {
        setEdges((eds) => {
            const edgeToDelete = eds.find(e => e.id === id);
            if (edgeToDelete) {
                const mappings = (edgeToDelete.data as EditableEdgeData)?.mappings || [];
                const targetNodeId = edgeToDelete.target;
                const sourceNode = nodes.find(n => n.id === edgeToDelete.source);

                if (sourceNode) {
                    setNodes(nds => nds.map(n => {
                        if (n.id === targetNodeId) {
                            let newValues = { ...n.data.values as Record<string, any> };
                            let hasChanged = false;

                            mappings.forEach(mapping => {
                                const refExpression = `[[ ${sourceNode.id}:outputs:${mapping.from} ]]`;

                                const removeFromPath = (obj: any, path: string): any => {
                                    if (!path) return obj;
                                    if (typeof obj !== 'object' || obj === null) return obj;

                                    const parts = path.split('.');
                                    const part = parts[0];
                                    const isArrayMatch = part.match(/(.+)\[(\d+)\]$/);

                                    if (isArrayMatch) {
                                        const key = isArrayMatch[1];
                                        const index = parseInt(isArrayMatch[2], 10);
                                        if (obj[key] && Array.isArray(obj[key])) {
                                            if (parts.length === 1) {
                                                if (obj[key][index] === refExpression) {
                                                    obj[key].splice(index, 1);
                                                    hasChanged = true;
                                                }
                                            } else {
                                                obj[key][index] = removeFromPath(obj[key][index], parts.slice(1).join('.'));
                                            }
                                        }
                                    } else {
                                        if (parts.length === 1) {
                                            if (obj[part] === refExpression) {
                                                delete obj[part];
                                                hasChanged = true;
                                            }
                                        } else {
                                            obj[part] = removeFromPath(obj[part], parts.slice(1).join('.'));
                                        }
                                    }
                                    return obj;
                                };

                                newValues = removeFromPath(newValues, mapping.to);
                            });

                            if (hasChanged) {
                                return { ...n, data: { ...n.data, values: newValues } };
                            }
                        }
                        return n;
                    }));
                }
            }
            return eds.filter((e) => e.id !== id);
        });
    }, [nodes, setNodes, setEdges]);

    // Update refs to latest handlers
    useEffect(() => {
        onLabelClickRef.current = handleEdgeLabelClick;
        onDeleteRef.current = handleDeleteEdge;
    }, [handleEdgeLabelClick, handleDeleteEdge]);

    const confirmConnect = useCallback(() => {
        if (!pendingConnection) return;

        const finalMappings = currentMappings.length > 0 ? currentMappings : [{ from: selectedFromAttr, to: selectedToAttr }];

        const data: EditableEdgeData = {
            mappings: finalMappings,
            onLabelClick: (id: string) => onLabelClickRef.current(id),
            onDelete: (id: string) => onDeleteRef.current(id)
        };

        if (editingEdgeId) {
            setEdges((eds) => eds.map(e => e.id === editingEdgeId ? { ...e, data } : e));
        } else {
            const sourceNode = nodes.find(n => n.id === pendingConnection.source);
            const targetNode = nodes.find(n => n.id === pendingConnection.target);
            const handles = (sourceNode && targetNode) ? getClosestHandle(sourceNode, targetNode) : { sourceHandle: null, targetHandle: null };

            setEdges((eds) => addEdge({
                ...pendingConnection,
                sourceHandle: handles.sourceHandle,
                targetHandle: handles.targetHandle,
                type: 'editable',
                markerEnd: { type: MarkerType.ArrowClosed },
                data,
                animated: true
            }, eds));
            
            // Auto-populate the [[sourceNode.attribute]] in the target node's values
            if (sourceNode && targetNode) {
                setNodes(nds => nds.map(n => {
                    if (n.id === targetNode.id) {
                        let newValues = { ...n.data.values as Record<string, any> };
                        finalMappings.forEach(mapping => {
                            const refExpression = `[[ ${sourceNode.id}:outputs:${mapping.from} ]]`;
                            newValues[mapping.to] = refExpression;
                        });
                        
                        // If we are currently editing this node in the properties panel, 
                        // the change will be reflected because selectedNode is derived from nodes state
                        
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                values: newValues
                            }
                        };
                    }
                    return n;
                }));
            }
        }
        setConnectDialogOpen(false);
        setPendingConnection(null);
        setEditingEdgeId(null);
        setCurrentMappings([]);
    }, [pendingConnection, editingEdgeId, selectedFromAttr, selectedToAttr, currentMappings, setEdges, handleEdgeLabelClick, handleDeleteEdge, nodes, setNodes]);

    const cancelConnect = useCallback(() => {
        setConnectDialogOpen(false);
        setPendingConnection(null);
        setEditingEdgeId(null);
        setCurrentMappings([]);
    }, []);

    const addMapping = () => {
        if (selectedFromAttr && selectedToAttr) {
            setCurrentMappings(prev => [...prev, { from: selectedFromAttr, to: selectedToAttr }]);
        }
    };

    const removeMapping = (index: number) => {
        setCurrentMappings(prev => prev.filter((_, i) => i !== index));
    };

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
        setContextMenu(null);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setContextMenu(null);
    }, []);

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            event.preventDefault();
            if (!reactFlowWrapper.current) return;
            const pane = reactFlowWrapper.current.getBoundingClientRect();
            setContextMenu({
                id: 'pane',
                top: event.clientY - pane.top,
                left: event.clientX - pane.left,
            });
        },
        [],
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            if (!reactFlowWrapper.current) return;
            const pane = reactFlowWrapper.current.getBoundingClientRect();
            setContextMenu({
                id: node.id,
                top: event.clientY - pane.top,
                left: event.clientX - pane.left,
            });
        },
        [],
    );

    const scrubNodeReferences = useCallback((nodeId: string, nodeLabel?: string) => {
        setNodes((nds) => nds.map((node) => {
            const values = { ...(node.data.values as Record<string, any>) };
            let hasChanged = false;

            const walkAndScrub = (obj: any): any => {
                if (typeof obj === 'string') {
                    // Match [[ nodeId:outputs:OutputName ]] OR legacy [[ nodeLabel:outputs:OutputName ]]
                    const idRegex = new RegExp(`\\[\\[\\s*${nodeId}:outputs:[\\w.-]+\\s*\\]\\]`, 'g');
                    let result = obj;
                    if (idRegex.test(result)) {
                        hasChanged = true;
                        result = result.replace(idRegex, '').trim();
                    }
                    
                    if (nodeLabel) {
                        const labelRegex = new RegExp(`\\[\\[\\s*${nodeLabel}:outputs:[\\w.-]+\\s*\\]\\]`, 'g');
                        if (labelRegex.test(result)) {
                            hasChanged = true;
                            result = result.replace(labelRegex, '').trim();
                        }
                    }

                    return result === '' ? undefined : result;
                } else if (Array.isArray(obj)) {
                    const scrubbedArray = obj.map(walkAndScrub).filter(i => i !== undefined);
                    if (scrubbedArray.length !== obj.length) hasChanged = true;
                    return scrubbedArray;
                } else if (obj !== null && typeof obj === 'object') {
                    const newObj: any = {};
                    for (const key in obj) {
                        const scrubbedValue = walkAndScrub(obj[key]);
                        if (scrubbedValue !== undefined) {
                            newObj[key] = scrubbedValue;
                        } else {
                            hasChanged = true;
                        }
                    }
                    return newObj;
                }
                return obj;
            };

            const newValues = walkAndScrub(values);

            if (hasChanged) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        values: newValues,
                    },
                };
            }
            return node;
        }));
    }, [setNodes]);

    const handleConfigureNode = () => {
        if (contextMenu) {
            setSelectedNodeId(contextMenu.id);
            setContextMenu(null);
        }
    };

    const handleEditResourceClass = () => {
        if (contextMenu) {
            const node = nodes.find(n => n.id === contextMenu.id);
            if (node && node.data.resourceClassId) {
                navigate(`/resources/definitions/${node.data.resourceClassId}`);
            }
            setContextMenu(null);
        }
    };

    const handleDeleteNode = () => {
        if (contextMenu) {
            const nodeToDelete = nodes.find(n => n.id === contextMenu.id);
            if (nodeToDelete) {
                // Find all edges where this node is the source and clear references in target nodes
                const outgoingEdges = edges.filter(e => e.source === nodeToDelete.id);
                outgoingEdges.forEach(edge => {
                    const mappings = (edge.data as EditableEdgeData)?.mappings || [];
                    const targetNodeId = edge.target;

                    setNodes(nds => nds.map(n => {
                        if (n.id === targetNodeId) {
                            let newValues = { ...n.data.values as Record<string, any> };
                            let hasChanged = false;

                            mappings.forEach(mapping => {
                                const refExpression = `[[ ${nodeToDelete.id}:outputs:${mapping.from} ]]`;

                                const removeFromPath = (obj: any, path: string): any => {
                                    if (!path) return obj;
                                    if (typeof obj !== 'object' || obj === null) return obj;

                                    const parts = path.split('.');
                                    const part = parts[0];
                                    const isArrayMatch = part.match(/(.+)\[(\d+)\]$/);

                                    if (isArrayMatch) {
                                        const key = isArrayMatch[1];
                                        const index = parseInt(isArrayMatch[2], 10);
                                        if (obj[key] && Array.isArray(obj[key])) {
                                            if (parts.length === 1) {
                                                if (obj[key][index] === refExpression) {
                                                    obj[key].splice(index, 1);
                                                    hasChanged = true;
                                                }
                                            } else {
                                                obj[key][index] = removeFromPath(obj[key][index], parts.slice(1).join('.'));
                                            }
                                        }
                                    } else {
                                        if (parts.length === 1) {
                                            if (obj[part] === refExpression) {
                                                delete obj[part];
                                                hasChanged = true;
                                            }
                                        } else {
                                            obj[part] = removeFromPath(obj[part], parts.slice(1).join('.'));
                                        }
                                    }
                                    return obj;
                                };

                                newValues = removeFromPath(newValues, mapping.to);
                            });

                            if (hasChanged) {
                                return { ...n, data: { ...n.data, values: newValues } };
                            }
                        }
                        return n;
                    }));
                });

                scrubNodeReferences(nodeToDelete.id, nodeToDelete.data.label as string);
            }
            setNodes((nds) => nds.filter((node) => node.id !== contextMenu.id));
            setEdges((eds) => eds.filter((edge) => edge.source !== contextMenu.id && edge.target !== contextMenu.id));
            if (selectedNodeId === contextMenu.id) {
                setSelectedNodeId(null);
            }
            setContextMenu(null);
        }
    };

    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        deletedNodes.forEach(node => {
            // Find all edges where this node is the source
            const outgoingEdges = edges.filter(e => e.source === node.id);
            outgoingEdges.forEach(edge => {
                const mappings = (edge.data as EditableEdgeData)?.mappings || [];
                const targetNodeId = edge.target;
                
                setNodes(nds => nds.map(n => {
                    if (n.id === targetNodeId) {
                        let newValues = { ...n.data.values as Record<string, any> };
                        let hasChanged = false;

                        mappings.forEach(mapping => {
                            const refExpression = `[[ ${node.id}:outputs:${mapping.from} ]]`;

                            const removeFromPath = (obj: any, path: string): any => {
                                if (!path) return obj;
                                if (typeof obj !== 'object' || obj === null) return obj;

                                const parts = path.split('.');
                                const part = parts[0];
                                const isArrayMatch = part.match(/(.+)\[(\d+)\]$/);

                                if (isArrayMatch) {
                                    const key = isArrayMatch[1];
                                    const index = parseInt(isArrayMatch[2], 10);
                                    if (obj[key] && Array.isArray(obj[key])) {
                                        if (parts.length === 1) {
                                            if (obj[key][index] === refExpression) {
                                                obj[key].splice(index, 1);
                                                hasChanged = true;
                                            }
                                        } else {
                                            obj[key][index] = removeFromPath(obj[key][index], parts.slice(1).join('.'));
                                        }
                                    }
                                } else {
                                    if (parts.length === 1) {
                                        if (obj[part] === refExpression) {
                                            delete obj[part];
                                            hasChanged = true;
                                        }
                                    } else {
                                        obj[part] = removeFromPath(obj[part], parts.slice(1).join('.'));
                                    }
                                }
                                return obj;
                            };

                            newValues = removeFromPath(newValues, mapping.to);
                        });

                        if (hasChanged) {
                            return { ...n, data: { ...n.data, values: newValues } };
                        }
                    }
                    return n;
                }));
            });

            scrubNodeReferences(node.id, node.data.label as string);
            setEdges((eds) => eds.filter((edge) => edge.source !== node.id && edge.target !== node.id));
        });
        if (selectedNodeId && deletedNodes.some(n => n.id === selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [edges, scrubNodeReferences, selectedNodeId, setEdges, setNodes]);

    const handleAddNode = (resource: IResource) => {
        const newNodeId = crypto.randomUUID();
        const initialName = `new-${resource.name.toLowerCase().replace(/\s+/g, '-')}`;
        const rnd = generateRandomString(5);

        const initialValues = {
            name: initialName,
            _rnd: rnd
        };

        let label = initialName;
        if (resource.namingRule?.format) {
            label = applyNamingRule(resource.namingRule.format, resource, envName, config.region, initialValues, resources);
        } else {
            label = `${initialName}-${newNodeId.substring(0, 4)}`;
        }

        const newNode: Node = {
            id: newNodeId,
            type: 'resource',
            position: { x: 250, y: 250 },
            data: {
                label: label,
                type: resource.name,
                icon: resource.icon,
                resourceClassId: resource.id,
                values: initialValues,
                categoryColor: resource.resourceCategory?.color,
                isCompact: isCompactMode
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setAddNodeDialogOpen(false);
    };

    const handleSaveClick = () => {
        setSaveDialogOpen(true);
    };

    const getEnvironmentObject = (overriddenName?: string, overriddenConfig?: any): IEnvironment | IEnvironmentNew => {
        const currentName = overriddenName !== undefined ? overriddenName : envName;
        const currentConfig = overriddenConfig !== undefined ? overriddenConfig : config;

        const envNodes: IEnvironmentNode[] = nodes.map(node => {
            // Filter out helper properties that start with underscore
            const nodeValues = node.data.values as Record<string, string>;
            const filteredValues = Object.keys(nodeValues || {}).reduce((acc, key) => {
                if (!key.startsWith('_')) {
                    acc[key] = nodeValues[key];
                }
                return acc;
            }, {} as Record<string, string>);

            return {
                key: node.id,
                id: node.data.persistenceId as string,
                label: node.data.label as string,
                resourceClassId: node.data.resourceClassId as string,
                values: filteredValues,
                disableNamingRule: node.data.disableNamingRule as boolean,
                position: node.position
            };
        });

        const envReferences: IEnvironmentReference[] = edges.flatMap(edge => {
            const edgeData = edge.data as EditableEdgeData;
            return (edgeData.mappings || []).map(m => ({
                id: m.id,
                fromNode: edge.source,
                fromHandle: edge.sourceHandle || undefined,
                toNode: edge.target,
                toHandle: edge.targetHandle || undefined,
                fromAttribute: m.from,
                toAttribute: m.to
            }));
        });

        return isNew ? {
            name: currentName,
            config: {
                ...currentConfig,
                values: currentConfig.values || {}
            },
            nodes: envNodes,
            references: envReferences
        } : {
            id,
            name: currentName,
            config: {
                ...currentConfig,
                values: currentConfig.values || {}
            },
            nodes: envNodes,
            references: envReferences
        };
    };

    const handleConfirmSave = async (overriddenName?: string, overriddenConfig?: any) => {
        setIsSaving(true);
        try {
            const payload = getEnvironmentObject(overriddenName, overriddenConfig);
            const url = isNew ? '/environments' : `/environments/${id}`;
            const method = isNew ? 'POST' : 'PATCH';

            const response = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to save environment');

            showToast(isNew ? 'Environment created successfully' : 'Environment updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['environments'] });
            setSaveDialogOpen(false);
        } catch (error) {
            console.error('Error saving environment:', error);
            showToast('Failed to save environment', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeploy = async () => {
        if (isNew) {
            showToast('Please save the environment before deploying', 'error');
            return;
        }

        try {
            showToast('Starting deployment...', 'info');
            const response = await fetchWithAuth(`/deployments/${id}`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Deployment failed');
            }

            showToast('Deployment completed successfully', 'success');
        } catch (error) {
            console.error('Error during deployment:', error);
            showToast(error instanceof Error ? error.message : 'Deployment failed', 'error');
        }
    };

    const handleExportBicep = async () => {
        if (isNew) {
            showToast('Please save the environment before exporting', 'error');
            return;
        }

        try {
            showToast('Preparing Bicep export...', 'info');
            const response = await fetchWithAuth(`/environments/${id}/export/bicep`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers.get('content-disposition');
            let fileName = `environment-${id}-bicep.zip`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1];
                }
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast('Bicep export downloaded successfully', 'success');
        } catch (error) {
            console.error('Error during Bicep export:', error);
            showToast(error instanceof Error ? error.message : 'Export failed', 'error');
        }
    };


    const handleCancel = () => navigate('/environments/definitions');


    // Update the onCheckedChange and name onChange to use handleLabelChange
    // and also ensure syncEdgesFromValues is called when values change.
    const handleCancelRef = useRef(handleCancel);
    const handleSaveRef = useRef(handleSaveClick);
    const handlePlanRef = useRef(() => setPlanDialogOpen(true));
    const handleDeployRef = useRef(handleDeploy);
    const handleExportBicepRef = useRef(handleExportBicep);


    useEffect(() => {
        handleSaveRef.current = handleSaveClick;
        handleCancelRef.current = handleCancel;
        handlePlanRef.current = () => setPlanDialogOpen(true);
        handleDeployRef.current = handleDeploy;
        handleExportBicepRef.current = handleExportBicep;
    }, [handleSaveClick, handleCancel, handleDeploy, handleExportBicep]);

    useToolbar([
        { id: 'cancel', label: t('btn_close', 'Close'), icon: X, onClick: () => handleCancelRef.current(), variant: 'soft', color: 'amber' },
        { id: 'plan', label: t('btn_preview_plan', 'Preview Plan'), icon: VectorSquare, onClick: () => handlePlanRef.current(), color: 'mint' },
        { id: 'export-bicep', label: t('btn_export_bicep', 'Export Bicep'), icon: Download, onClick: () => handleExportBicepRef.current(), hidden: isNew },
        { id: 'save', label: t('btn_save', 'Save'), icon: Save, onClick: () => handleSaveRef.current(), variant: 'solid', color: 'green', disabled: !canWrite },
        { id: 'help', label: t('btn_help', 'Help'), icon: CircleQuestionMark, onClick: () => setHelpDialogOpen(true), color: 'sky' },
    ]);

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const selectedResource = resources?.find(r => r.id === (selectedNode?.data?.resourceClassId as string));

    // Parse template types when selected resource changes
    useEffect(() => {
        if (!selectedResource || !selectedResource.template) {
            setParamTypes({});
            return;
        }

        const types: Record<string, { type: string, secure?: boolean, subType?: string, catalogName?: string }> = {};
        const placeholderRegex = /\{\{\s*([\w.-]+)(?::([\w.-]+)(!)?)?(?::([\w.-]+))?(?::([\w.-]+))?\s*\}\}/g;

        const walk = (obj: any) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
            for (const k of Object.keys(obj)) {
                const val = obj[k];
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                    walk(val);
                } else if (typeof val === 'string') {
                    let m;
                    while ((m = placeholderRegex.exec(val)) !== null) {
                        const param = m[1];
                        let type = m[2] || 'string';
                        const secure = m[3] === '!';
                        let subType: string | undefined = m[4];
                        let catalogName = m[5];

                        if (type === 'catalog' && subType) {
                            catalogName = subType;
                            subType = undefined;
                        }

                        types[param] = { type, secure, subType, catalogName };
                    }
                }
            }
        };

        walk(selectedResource.template);
        setParamTypes(types);
    }, [selectedResource]);


    const handleDefaultValueChange = (key: string, value: any) => {
        if (!selectedNodeId) return;

        let finalValue = value;
        const typeInfo = paramTypes[key];
        if (typeInfo && typeInfo.type === 'catalog' && value && !String(value).startsWith('{{')) {
            const catalogName = typeInfo.catalogName || typeInfo.type;
            finalValue = `{{ catalog:${catalogName}:${value} }}`;
        }

        setNodes(nds => {
            const newNodes = nds.map(n => {
                if (n.id === selectedNodeId) {
                    const currentValues = (n.data.values as Record<string, string>) || {};
                    const newValues = {
                        ...currentValues,
                        [key]: finalValue
                    };
                    
                    // Trigger edge sync for this node
                    syncEdgesFromValues(n.id, newValues, nds);

                    // Also trigger sync for nodes that might reference THIS node 
                    // if THIS node's label has changed. But handleDefaultValueChange 
                    // is for property values, not label. Label change is handled in other places.
            
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            values: newValues
                        }
                    };
                }
                return n;
            });
            return newNodes;
        });
    };

    const openEditor = (key: string, value: any, type: string, subType?: string) => {
        setEditorTargetId(key);
        setEditorTitle(`Edit ${key}`);

        if (type === 'object') {
            const valStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            setEditorValue(valStr);
            setJsonEditorOpen(true);
        } else if (type === 'array') {
            setEditorValue(Array.isArray(value) ? value : []);
            setEditorItemType((subType as any) || 'string');
            setArrayEditorOpen(true);
        }
    };

    const handleEditorSave = (newVal: any) => {
        if (editorTargetId) {
            handleDefaultValueChange(editorTargetId, newVal);
        }
    };

    const renderInput = (key: string, defaultValue: any) => {
        let value = (selectedNode?.data.values as Record<string, any>)?.[key] ?? defaultValue;
        const typeInfo = paramTypes[key] || { type: 'string' };
        const type = typeInfo.type;
        const catalogName = (typeInfo as any).catalogName;

        const secure = typeInfo.secure;

        // Check if type refers to a Catalog
        const catalogResource = type === 'catalog' && catalogName
            ? (resources || []).find(r => r.type === EResourceType.CATALOG && r.name === catalogName)
            : (resources || []).find(r => r.type === EResourceType.CATALOG && r.name === type);

        if (catalogResource) {
            // If value is in {{ catalog:name:key }} format, extract key for the dropdown
            let displayValue = value;
            if (value && typeof value === 'string' && value.startsWith('{{') && value.includes(':')) {
                const parts = value.replace(/\{\{\s*|\s*\}\}/g, '').split(':');
                if (parts.length >= 3 && parts[0] === 'catalog') {
                    displayValue = parts[2];
                }
            }

            const catalogItems = catalogResource.template || {};
            const itemKeys = Object.keys(catalogItems);
            const selectedValue = catalogItems[displayValue];

            return (
                <Flex align="center" gap="2" style={{ width: '100%' }}>
                    <Select.Root
                        value={displayValue || ""}
                        onValueChange={(val) => handleDefaultValueChange(key, val)}
                    >
                        <Select.Trigger placeholder="Select from Catalog..." style={{ flex: 1 }} />
                        <Select.Content>
                            {itemKeys.map(k => (
                                <Select.Item key={k} value={k}>{k}</Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                    {displayValue && selectedValue !== undefined && (
                        <Tooltip content={typeof selectedValue === 'string' ? selectedValue : JSON.stringify(selectedValue)}>
                            <IconButton variant="ghost" size="1" color="gray">
                                <CircleQuestionMark size={14} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {secure && <ShieldCheck size={16} className="text-green-600" />}
                </Flex>
            );
        }

        if (type === 'boolean') {
            return (
                <Flex align="center" gap="2">
                    <Switch
                        checked={!!value}
                        onCheckedChange={(checked) => handleDefaultValueChange(key, checked)}
                    />
                    {secure && <ShieldCheck size={16} className="text-green-600" />}
                </Flex>
            );
        }

        if (type === 'number') {
            return (
                <TextField.Root
                    type="number"
                    value={value}
                    onChange={(e) => handleDefaultValueChange(key, Number(e.target.value))}
                >
                    {secure && (
                        <TextField.Slot color="green">
                            <ShieldCheck size={16} />
                        </TextField.Slot>
                    )}
                </TextField.Root>
            );
        }

        if (type === 'object' || type === 'array') {
            const isArray = type === 'array';
            const count = isArray ? (Array.isArray(value) ? value.length : 0) : Object.keys(value || {}).length;
            return (
                <Flex align="center" gap="2">
                    <Button variant="soft" onClick={() => openEditor(key, value, type, typeInfo.subType)}>
                        {isArray ? `Array [${count}]` : 'Object {}'}
                        <Pencil size={14} />
                    </Button>
                    {secure && <ShieldCheck size={16} className="text-green-600" />}
                </Flex>
            );
        }

        const nodeInfos = nodes.map(n => ({ id: n.id, label: n.data.label as string }));

        return (
            <ReferenceAutocomplete
                type={secure ? "password" : "text"}
                value={value}
                onChange={(val) => handleDefaultValueChange(key, val)}
                availableOutputs={availableOutputs}
                allNodes={nodeInfos}
            >
                {secure && (
                    <TextField.Slot color="green">
                        <ShieldCheck size={16} />
                    </TextField.Slot>
                )}
            </ReferenceAutocomplete>
        );
    };

    // @ts-ignore
    return (
        <Flex className="h-[calc(100vh-8rem)] gap-4">
            {/* Main Editor Area */}
            <Card ref={reactFlowWrapper} className="flex-1 shadow-lg relative p-0 overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneClick={onPaneClick}
                    onPaneContextMenu={onPaneContextMenu}
                    onNodesDelete={onNodesDelete}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                >
                    <Controls />
                    <Background />

                    <Panel position="top-right">
                        <Flex gap="3" align="center">
                            <Flex gap="2" align="center" style={{
                                background: 'var(--accent-a3)',
                                padding: '0 12px',
                                height: '32px',
                                borderRadius: 'var(--radius-2)',
                            }}>
                                <Text size="1" weight="bold" style={{ color: 'var(--accent-11)' }}>Compact Mode</Text>
                                <Switch
                                    size="1"
                                    checked={isCompactMode}
                                    onCheckedChange={setIsCompactMode}
                                />
                            </Flex>
                            <Button variant="soft" onClick={() => onLayout('TB')}>
                                <LayoutDashboard className="w-4 h-4" /> Auto Layout
                            </Button>
                            <Button variant="soft" onClick={() => setConfigMapDialogOpen(true)}>
                                <Settings className="w-4 h-4" /> Configuration Map
                            </Button>
                            <Button variant="soft" onClick={() => onLayout('LR')} title="Horizontal Layout">
                                <LayoutDashboard className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => setAddNodeDialogOpen(true)}>
                                <Plus className="w-4 h-4" /> {t('btn_add_resource', 'Add Resource')}
                            </Button>
                        </Flex>
                    </Panel>
                </ReactFlow>
                {contextMenu && (
                    <Card
                        style={{
                            position: 'absolute',
                            top: contextMenu.top,
                            left: contextMenu.left,
                            zIndex: 1000,
                            padding: '4px',
                            width: '180px'
                        }}
                    >
                        <Flex direction="column" gap="1">
                            {contextMenu.id === 'pane' ? (
                                <Button variant="ghost" color="gray" style={{ justifyContent: 'start' }} onClick={() => {
                                    setAddNodeDialogOpen(true);
                                    setContextMenu(null);
                                }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('btn_add_resource', 'Add Resource')}
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" color="gray" style={{ justifyContent: 'start' }} onClick={handleConfigureNode}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        {t('btn_configure', 'Configure')}
                                    </Button>
                                    <Button variant="ghost" color="gray" style={{ justifyContent: 'start' }} onClick={handleEditResourceClass}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        {t('btn_edit_resource_class', 'Edit Resource Class')}
                                    </Button>
                                    <Button variant="ghost" color="red" style={{ justifyContent: 'start' }} onClick={() => {
                                        if (contextMenu.id !== 'pane') {
                                            handleDeleteNode();
                                        }
                                    }}>
                                        <Trash className="w-4 h-4 mr-2" />
                                        {t('btn_delete', 'Delete')}
                                    </Button>
                                </>
                            )}
                        </Flex>
                    </Card>
                )}
            </Card>

            {/* Properties Panel */}
            {selectedNode && (
                <Card className="w-80 shadow-lg flex flex-col">
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="3">Properties</Heading>
                        <Button variant="ghost" color="gray" onClick={() => setSelectedNodeId(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </Flex>

                    <ScrollArea className="flex-1 pr-4">
                        <Flex direction="column" gap="4">
                            <Box>
                                <Text size="2" weight="bold" mb="1" as="div">Node Key (Generated)</Text>
                                <TextField.Root
                                    value={selectedNode.data.label as string}
                                    disabled
                                    variant="soft"
                                />
                                <Text size="1" color="gray">
                                    {selectedResource?.namingRule?.format
                                        ? (selectedNode.data.disableNamingRule ? 'Naming rule disabled.' : `Generated by rule: ${selectedResource.namingRule.format}`)
                                        : 'No naming rule defined.'}
                                </Text>
                                {selectedResource?.namingRule?.format && (
                                    <Flex align="center" gap="2" mt="2">
                                        <Switch
                                            size="1"
                                            checked={!!selectedNode.data.disableNamingRule}
                                            onCheckedChange={(checked) => {
                                                const currentValues = (selectedNode.data.values as Record<string, string>) || {};
                                                let newLabel = selectedNode.data.label as string;
                                                if (checked) {
                                                    newLabel = currentValues.name || (selectedNode.data.label as string);
                                                } else if (selectedResource && selectedResource.namingRule?.format) {
                                                    newLabel = applyNamingRule(selectedResource.namingRule.format, selectedResource, envName, config.region, currentValues, resources);
                                                }

                                                setNodes(nds => nds.map(n => {
                                                    if (n.id === selectedNode.id) {
                                                        return {
                                                            ...n,
                                                            data: {
                                                                ...n.data,
                                                                label: newLabel,
                                                                disableNamingRule: checked
                                                            }
                                                        };
                                                    }
                                                    return n;
                                                }));

                                                if (newLabel !== selectedNode.data.label) {
                                                    handleLabelChange(selectedNode.id, newLabel);
                                                }
                                            }}
                                        />
                                        <Text size="1">Disable Naming Rule</Text>
                                    </Flex>
                                )}
                            </Box>

                            <Box>
                                <Text size="2" weight="bold" mb="1" as="div">Name</Text>
                                <TextField.Root
                                    value={(selectedNode.data.values as Record<string, string>).name || ''}
                                    placeholder="Enter resource name"
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        const currentValues = (selectedNode.data.values as Record<string, string>) || {};
                                        const newValues = { ...currentValues, name: newName };

                                        let newLabel = selectedNode.data.label as string;
                                        const disableNamingRule = selectedNode.data.disableNamingRule as boolean;
                                        if (selectedResource && selectedResource.namingRule?.format && !disableNamingRule) {
                                            newLabel = applyNamingRule(selectedResource.namingRule.format, selectedResource, envName, config.region, newValues, resources);
                                        } else {
                                            newLabel = newName;
                                        }

                                        setNodes(nds => nds.map(n => {
                                            if (n.id === selectedNode.id) {
                                                return {
                                                    ...n,
                                                    data: {
                                                        ...n.data,
                                                        label: newLabel,
                                                        values: newValues
                                                    }
                                                };
                                            }
                                            return n;
                                        }));

                                        if (newLabel !== selectedNode.data.label) {
                                            handleLabelChange(selectedNode.id, newLabel);
                                        }
                                        // Name change also affects values, so we should sync edges just in case 
                                        // (though unlikely name field itself contains a reference)
                                        syncEdgesFromValues(selectedNode.id, newValues, nodes);
                                    }}
                                />
                            </Box>

                            <Separator size="4" />

                            <Box>
                                <Text size="2" weight="bold" mb="2" as="div">Resource Values</Text>
                                {Object.keys(paramTypes).length > 0 ? (
                                    Object.keys(paramTypes).map(key => {
                                        const defaultValue = selectedResource?.defaults?.[key];

                                        return (
                                            <Box key={key} mb="2">
                                                <Text size="2" mb="1" as="div" style={{ textTransform: 'capitalize' }}>
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    {paramTypes[key] && paramTypes[key].type !== 'string' && (
                                                        <Text size="1" color="gray" ml="2">
                                                            ({paramTypes[key].type}{paramTypes[key].type === 'catalog' && (paramTypes[key] as any).catalogName ? `:${(paramTypes[key] as any).catalogName}` : (paramTypes[key].subType ? `:${paramTypes[key].subType}` : '')})
                                                        </Text>
                                                    )}
                                                </Text>
                                                {renderInput(key, defaultValue)}
                                            </Box>
                                        );
                                    })
                                ) : (
                                    <Text size="1" color="gray">
                                        No configuration values available for this resource.
                                    </Text>
                                )}
                            </Box>
                        </Flex>
                    </ScrollArea>
                </Card>
            )}

            {/* Add Node Dialog */}
            <Dialog.Root open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
                <Dialog.Content style={{ maxWidth: 600, maxHeight: '80vh' }}>
                    <Dialog.Title>Add Resource</Dialog.Title>
                    <Box mb="3">
                        <TextField.Root
                            placeholder={t('ph_search_resources', 'Search resources...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        >
                            <TextField.Slot>
                                <Plus className="w-4 h-4" />
                            </TextField.Slot>
                        </TextField.Root>
                    </Box>
                    <ScrollArea style={{ height: 400 }}>
                        <Flex direction="column" gap="2">
                            {resources?.filter(r =>
                                r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                (r.type === EResourceType.AZURE_RESOURCE
                                    || r.type === EResourceType.MSGRAPH
                                    || r.type === EResourceType.KUBERNETES_RESOURCE
                                    || r.type === EResourceType.PROCESS)
                            ).map(resource => (
                                <Card
                                    key={resource.id}

                                    className="cursor-pointer hover:bg-[var(--accent-2)]"
                                    onClick={() => handleAddNode(resource)}
                                >
                                    <Flex align="center" gap="3">
                                        {resource.icon && (
                                            <img src={`/assets/${resource.icon}`} className="w-6 h-6" />
                                        )}
                                        <Text weight="bold">{resource.name}</Text>
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>
                    </ScrollArea>
                    <Flex justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Cancel</Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Save Dialog */}
            <EnvironmentConfigModal
                open={saveDialogOpen}
                onOpenChange={setSaveDialogOpen}
                title={t('dlg_save_environment_title', 'Save Environment')}
                confirmLabel={t('btn_save', 'Save')}
                resources={resources}
                initialName={envName}
                initialConfig={config}
                onConfirm={(name, newConfig) => {
                    setEnvName(name);
                    setConfig(newConfig);
                    handleConfirmSave(name, newConfig);
                }}
                isNew={isNew}
                envId={envId}
                loading={isSaving}
            />


            <ConnectAttributesModal
                open={connectDialogOpen}
                onOpenChange={setConnectDialogOpen}
                onConfirm={confirmConnect}
                onCancel={cancelConnect}
                sourceAttributes={sourceAttributes}
                targetAttributes={targetAttributes}
                selectedFromAttr={selectedFromAttr}
                setSelectedFromAttr={setSelectedFromAttr}
                selectedToAttr={selectedToAttr}
                setSelectedToAttr={setSelectedToAttr}
                currentMappings={currentMappings}
                addMapping={addMapping}
                removeMapping={removeMapping}
            />

            {/* Deployment Plan Modal */}
            <DeploymentPlanModal
                open={planDialogOpen}
                onOpenChange={setPlanDialogOpen}
                environment={getEnvironmentObject()}
            />


            {/* Editor Modals */}
            <JsonEditorModal
                open={jsonEditorOpen}
                onOpenChange={setJsonEditorOpen}
                title={editorTitle}
                value={typeof editorValue === 'string' ? editorValue : JSON.stringify(editorValue, null, 2)}
                onSave={(val) => handleEditorSave(JSON.parse(val))}
                availableOutputs={availableOutputs}
            />

            <ArrayEditorModal
                open={arrayEditorOpen}
                onOpenChange={setArrayEditorOpen}
                title={editorTitle}
                value={editorValue}
                itemType={editorItemType}
                onSave={handleEditorSave}
                availableOutputs={availableOutputs}
                allNodes={nodes.map(n => ({ id: n.id, label: n.data.label as string }))}
            />
            <ConfigurationMapModal
                open={configMapDialogOpen}
                onOpenChange={setConfigMapDialogOpen}
                nodes={nodes}
            />

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <DraggableDialogContent maxWidth="1000px" maxHeight="90vh" title={t('btn_help', 'Help')}>
                    <ScrollArea type="auto" style={{ height: 'calc(90vh - 120px)' }}>
                        <Box p="4">
                            <EnvironmentEditorHelpContent />
                        </Box>
                    </ScrollArea>
                </DraggableDialogContent>
            </Dialog.Root>
        </Flex>
    );
};

const EnvironmentEditor = () => (
    <ReactFlowProvider>
        <EnvironmentEditContent />
    </ReactFlowProvider>
);

export default EnvironmentEditor;
