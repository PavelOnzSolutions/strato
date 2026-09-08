import {Edge, Node} from '@xyflow/react';
import {IWorkflowDefinition, IWorkflowStep} from '../models/workflow.model';
import * as dagre from 'dagre';

export interface WorkflowNodeData {
    label: string;
    step: IWorkflowStep;
    [key: string]: unknown;
}

/**
 * Convert backend WorkflowDefinition to ReactFlow nodes and edges
 */
export const workflowToReactFlow = (
    definition: IWorkflowDefinition
): { nodes: Node<WorkflowNodeData>[]; edges: Edge[] } => {
    const nodes: Node<WorkflowNodeData>[] = definition.steps.map((step) => ({
        id: step.id,
        type: 'workflowNode',
        data: {
            label: step.name,
            step: step,
        },
        position: { x: 0, y: 0 }, // Will be set by the layout engine
    }));

    const edges: Edge[] = definition.steps
        .filter((step) => step.nextStepId)
        .map((step) => ({
            id: `e-${step.id}-${step.nextStepId}`,
            source: step.id,
            target: step.nextStepId!,
            animated: true,
        }));

    return { nodes: layoutNodes(nodes, edges), edges };
};


/**
 * Convert ReactFlow nodes and edges back to backend WorkflowDefinition steps
 */
export const reactFlowToWorkflow = (
    nodes: Node<WorkflowNodeData>[],
    edges: Edge[],
): IWorkflowStep[] => {
    return nodes.map((node) => {
        const outgoingEdge = edges.find((e) => e.source === node.id);
        return {
            ...node.data.step,
            id: node.id,
            name: node.data.label,
            nextStepId: outgoingEdge ? outgoingEdge.target : null,
        };
    });
};

/**
 * Auto-layout nodes using dagre
 */
export const layoutNodes = <T extends Record<string, unknown>>(nodes: Node<T>[], edges: Edge[]): Node<T>[] => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 200, height: 80 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - 100,
                y: nodeWithPosition.y - 40,
            },
        };
    });
};

/**
 * Create a new workflow step with default values
 */
export const createNewStep = (id: string, name: string): IWorkflowStep => ({
    id,
    name,
    type: 'REST_CALL' as any,
    config: {},
    nextStepId: null,
    async: false,
});
