import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
    type Edge,
} from '@xyflow/react';
import {Badge, Flex, IconButton, Text, Tooltip} from '@radix-ui/themes';
import {Pencil, Trash2} from 'lucide-react';

export type IMapping = { id?: string; from: string; to: string };

export type EditableEdgeData = {
    mappings: IMapping[];
    onLabelClick?: (id: string) => void;
    onDelete?: (id: string) => void;
};

export default function EditableEdge({
                                         id,
                                         sourceX,
                                         sourceY,
                                         targetX,
                                         targetY,
                                         sourcePosition,
                                         targetPosition,
                                         style = {},
                                         markerEnd,
                                         data,
                                         selected,
                                     }: EdgeProps<Edge<EditableEdgeData>>) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const displayLabel = data?.mappings
        ? data.mappings.map(m => `${m.from} -> ${m.to}`).join(', ')
        : 'no mapping';

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={{
                ...style,
                stroke: selected ? 'var(--accent-9)' : (style.stroke || 'var(--gray-7)'),
                strokeWidth: selected ? 3 : 2,
            }}/>
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                        maxWidth: '250px',
                    }}
                    className="nodrag nopan"
                >
                    <Flex
                        align="center"
                        gap="2"
                        style={{
                            background: 'var(--color-panel-solid)',
                            padding: '2px 4px 2px 8px',
                            borderRadius: '16px',
                            border: '1px solid var(--gray-6)',
                            boxShadow: 'var(--shadow-2)',
                        }}
                    >
                        <Tooltip content={displayLabel}>
                            <Badge
                                variant="surface"
                                color="indigo"
                                radius="full"
                                style={{
                                    cursor: 'pointer',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (data?.onLabelClick) {
                                        data.onLabelClick(id);
                                    }
                                }}
                            >
                                <Flex align="center" gap="1">
                                    <Text style={{textOverflow: 'ellipsis', textWrapMode: 'nowrap', fontSize: 'xx-small'}}>{displayLabel}</Text>
                                    <Pencil size={10}/>
                                </Flex>
                            </Badge>
                        </Tooltip>

                        <IconButton
                            variant="ghost"
                            color="red"
                            size="1"
                            style={{cursor: 'pointer', borderRadius: '50%'}}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (data?.onDelete) {
                                    data.onDelete(id);
                                }
                            }}
                        >
                            <Trash2 size={12}/>
                        </IconButton>
                    </Flex>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
