import {Handle, NodeProps, Position} from '@xyflow/react';
import {AlertCircle, CheckCircle, Loader2, Settings} from 'lucide-react';
import {WorkflowNodeData} from '../../../../utils/workflow-transform';
import {EStepStatus} from '../../../../models/workflow.model';

interface WorkflowNodeProps extends NodeProps {
    data: WorkflowNodeData & {
        status?: EStepStatus;
        onConfigure?: (nodeId: string) => void;
    };
}

export const WorkflowNode = ({ data, id, selected }: WorkflowNodeProps) => {
    const handleConfigure = () => {
        if (data.onConfigure) {
            data.onConfigure(id);
        }
    };

    const getStatusIcon = () => {
        switch (data.status) {
            case EStepStatus.COMPLETED:
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case EStepStatus.RUNNING:
                return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
            case EStepStatus.FAILED:
                return <AlertCircle className="w-4 h-4 text-red-600" />;
            default:
                return null;
        }
    };

    const getStatusBorderColor = () => {
        switch (data.status) {
            case EStepStatus.COMPLETED:
                return 'border-green-500';
            case EStepStatus.RUNNING:
                return 'border-blue-500 animate-pulse';
            case EStepStatus.FAILED:
                return 'border-red-500';
            default:
                return selected ? 'border-blue-400' : 'border-slate-200';
        }
    };

    return (
        <div
            className={`bg-white border-2 ${getStatusBorderColor()} rounded-lg p-4 shadow-sm min-w-[200px] transition-all hover:shadow-md`}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3" />
            
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                    {data.step.type}
                </span>
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <Settings
                        className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600"
                        onClick={handleConfigure}
                    />
                </div>
            </div>
            
            <div className="font-medium text-slate-800">{data.label}</div>
            
            {data.step.async && (
                <div className="mt-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Async
                    </span>
                </div>
            )}
            
            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
};
