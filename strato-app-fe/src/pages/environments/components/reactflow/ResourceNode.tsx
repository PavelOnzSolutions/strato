import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import {Flex, Text, Box} from '@radix-ui/themes';
import { memo } from 'react';

type ResourceNodeData = {
    label: string;
    type: string;
    icon?: string;
    resourceClassId?: string;
    values?: Record<string, string>;
    categoryColor?: string;
    isCompact?: boolean;
    [key: string]: unknown;
};

type ResourceNodeProps = NodeProps<Node<ResourceNodeData>>;

// Custom node component for Resource
const ResourceNode = ({ data, selected }: ResourceNodeProps) => {
    const isCompact = data.isCompact;

    return (
        <Box
            className={`transition-colors ${isCompact
                ? `p-1 rounded-sm ${selected ? 'bg-[var(--accent-a3)] outline outline-1 outline-[var(--accent-9)]' : ''}`
                : `px-4 py-2 shadow-md rounded-md border-2`
                }`}
            style={{
                minWidth: isCompact ? 'auto' : 150,
                display: 'inline-block',
                background: !isCompact ? (data.categoryColor ? `var(--${data.categoryColor}-a3)` : 'var(--color-panel-solid)') : undefined,
                borderColor: !isCompact ? (selected ? 'var(--accent-9)' : (data.categoryColor ? `var(--${data.categoryColor}-a7)` : 'var(--gray-6)')) : undefined,
                backdropFilter: !isCompact ? 'blur(4px)' : undefined,
                WebkitBackdropFilter: !isCompact ? 'blur(4px)' : undefined,
                boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2)'
            }}
        >
            <Handle
                type="target"
                id="top"
                position={Position.Top}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="source"
                id="top-out"
                position={Position.Top}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="target"
                id="bottom"
                position={Position.Bottom}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="source"
                id="bottom-out"
                position={Position.Bottom}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="target"
                id="left"
                position={Position.Left}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="source"
                id="left-out"
                position={Position.Left}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="target"
                id="right"
                position={Position.Right}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />
            <Handle
                type="source"
                id="right-out"
                position={Position.Right}
                style={{ background: '#555', width: '8px', height: '8px' }}
            />

            <Flex align="center" gap={isCompact ? "1" : "3"}>
                {data.icon && (
                    <div className={`${isCompact ? 'p-0.5' : 'p-1'} rounded bg-[var(--gray-3)] shrink-0`}>
                        <img
                            src={data.icon.includes('/') ? `/assets/${data.icon}` : `/assets/azure/${data.icon}`}
                            alt=""
                            className={isCompact ? "w-5 h-5" : "w-8 h-8"}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                )}
                <Flex direction="column" className="overflow-hidden">
                    <Text
                        size={isCompact ? "1" : "2"}
                        weight="bold"
                        className={isCompact ? 'whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]' : ''}
                    >
                        {data.label}
                    </Text>
                    {!isCompact && <Text className="text-xs">{data.type}</Text>}
                </Flex>
            </Flex>
        </Box>
    );
};

export default memo(ResourceNode);
