import {Box, Button, Dialog, Flex, Select, Switch, Table, Text, TextArea, TextField} from '@radix-ui/themes';
import {EStepHandlerType, IWorkflowStep} from '../../../../models/workflow.model';
import {useEffect, useState} from 'react';
import {Plus, Save, Trash2, X} from 'lucide-react';
import {useTheme} from '../../../../context/ThemeContext';

interface StepConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    step: IWorkflowStep | null;
    onSave: (step: IWorkflowStep) => void;
}

export const StepConfigDialog = ({ open, onOpenChange, step, onSave }: StepConfigDialogProps) => {
    const { codeFont } = useTheme();
    const [name, setName] = useState('');
    const [stepId, setStepId] = useState('');
    const [handlerType, setHandlerType] = useState<EStepHandlerType>(EStepHandlerType.REST_CALL);
    const [isAsync, setIsAsync] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Specific config fields
    const [restUrl, setRestUrl] = useState('');
    const [restMethod, setRestMethod] = useState('GET');
    const [restPayload, setRestPayload] = useState('');
    const [restHeaders, setRestHeaders] = useState<{ key: string; value: string }[]>([]);
    const [delegateClass, setDelegateClass] = useState('');

    useEffect(() => {
        if (step) {
            setName(step.name);
            setStepId(step.id);
            setHandlerType(step.type);
            setIsAsync(step.async);
            setError(null);

            if (step.type === EStepHandlerType.REST_CALL) {
                setRestUrl(step.config?.url || '');
                setRestMethod(step.config?.method || 'GET');
                setRestPayload(step.config?.payload || '');
                
                // Convert headers object to array
                const headers = step.config?.headers || {};
                setRestHeaders(Object.entries(headers).map(([k, v]) => ({ key: k, value: String(v) })));
            } else if (step.type === EStepHandlerType.JAVA_DELEGATE) {
                setDelegateClass(step.config?.delegateClass || '');
            }
        }
    }, [step]);

    const handleAddHeader = () => {
        setRestHeaders([...restHeaders, { key: '', value: '' }]);
    };

    const handleUpdateHeader = (index: number, field: 'key' | 'value', value: string) => {
        const updated = [...restHeaders];
        updated[index][field] = value;
        setRestHeaders(updated);
    };

    const handleDeleteHeader = (index: number) => {
        setRestHeaders(restHeaders.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const config: Record<string, any> = {};
        if (handlerType === EStepHandlerType.REST_CALL) {
            config.url = restUrl;
            config.method = restMethod;
            
            if (['POST', 'PUT', 'PATCH'].includes(restMethod)) {
                config.payload = restPayload;
            }

            // Convert headers array back to object
            if (restHeaders.length > 0) {
                const headersObj: Record<string, string> = {};
                restHeaders.forEach(h => {
                    if (h.key) headersObj[h.key] = h.value;
                });
                config.headers = headersObj;
            }
        } else if (handlerType === EStepHandlerType.JAVA_DELEGATE) {
            config.delegateClass = delegateClass;
        }

        const updatedStep: IWorkflowStep = {
            id: stepId,
            name,
            type: handlerType,
            config,
            nextStepId: step?.nextStepId || null,
            async: isAsync,
        };
        onSave(updatedStep);
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 600 }}>
                <Dialog.Title>Configure Step</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Edit step properties and configuration
                </Dialog.Description>

                <Flex direction="column" gap="4">
                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">
                            Step ID
                        </Text>
                        <TextField.Root
                            value={stepId}
                            onChange={(e) => setStepId(e.target.value)}
                            placeholder="e.g. step-1"
                        />
                    </Box>

                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">
                            Name
                        </Text>
                        <TextField.Root
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Create Resource"
                        />
                    </Box>

                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">
                            Handler Type
                        </Text>
                        <Select.Root value={handlerType} onValueChange={(val) => setHandlerType(val as EStepHandlerType)}>
                            <Select.Trigger style={{ width: '100%' }} />
                            <Select.Content>
                                <Select.Item value={EStepHandlerType.REST_CALL}>REST Call</Select.Item>
                                <Select.Item value={EStepHandlerType.JAVA_DELEGATE}>Java Delegate</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    <Box>
                        <Flex align="center" gap="2">
                            <Switch checked={isAsync} onCheckedChange={setIsAsync} />
                            <Text size="2" weight="bold">
                                Async Execution
                            </Text>
                        </Flex>
                    </Box>

                    {handlerType === EStepHandlerType.REST_CALL && (
                        <>
                            <Box>
                                <Text as="div" size="2" mb="1" weight="bold">
                                    REST URL
                                </Text>
                                <TextField.Root
                                    value={restUrl}
                                    onChange={(e) => setRestUrl(e.target.value)}
                                    placeholder="https://api.example.com/v1/resource"
                                />
                            </Box>
                            <Box>
                                <Text as="div" size="2" mb="1" weight="bold">
                                    Method
                                </Text>
                                <Select.Root value={restMethod} onValueChange={setRestMethod}>
                                    <Select.Trigger style={{ width: '100%' }} />
                                    <Select.Content>
                                        <Select.Item value="GET">GET</Select.Item>
                                        <Select.Item value="POST">POST</Select.Item>
                                        <Select.Item value="PUT">PUT</Select.Item>
                                        <Select.Item value="DELETE">DELETE</Select.Item>
                                        <Select.Item value="PATCH">PATCH</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>

                            <Box>
                                <Flex justify="between" align="center" mb="1">
                                    <Text size="2" weight="bold">
                                        Headers
                                    </Text>
                                    <Button size="1" variant="soft" onClick={handleAddHeader}>
                                        <Plus size={14} />
                                    </Button>
                                </Flex>
                                {restHeaders.length > 0 ? (
                                    <Table.Root variant="surface" size="1">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
                                                <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                                                <Table.ColumnHeaderCell style={{ width: '40px' }}></Table.ColumnHeaderCell>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {restHeaders.map((header, idx) => (
                                                <Table.Row key={idx}>
                                                    <Table.Cell>
                                                        <TextField.Root
                                                            size="1"
                                                            value={header.key}
                                                            onChange={(e) => handleUpdateHeader(idx, 'key', e.target.value)}
                                                            placeholder="Content-Type"
                                                        />
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <TextField.Root
                                                            size="1"
                                                            value={header.value}
                                                            onChange={(e) => handleUpdateHeader(idx, 'value', e.target.value)}
                                                            placeholder="application/json"
                                                        />
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Button size="1" variant="ghost" color="red" onClick={() => handleDeleteHeader(idx)}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Root>
                                ) : (
                                    <Text size="1" color="gray" align="center" as="div" py="2" className="border border-dashed rounded">
                                        No custom headers
                                    </Text>
                                )}
                            </Box>

                            {['POST', 'PUT', 'PATCH'].includes(restMethod) && (
                                <Box>
                                    <Text as="div" size="2" mb="1" weight="bold">
                                        Payload (JSON)
                                    </Text>
                                    <TextArea
                                        value={restPayload}
                                        onChange={(e) => setRestPayload(e.target.value)}
                                        placeholder='{ "key": "value" }'
                                        style={{ height: '120px', fontFamily: codeFont }}
                                    />
                                </Box>
                            )}
                        </>
                    )}

                    {handlerType === EStepHandlerType.JAVA_DELEGATE && (
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Delegate Class
                            </Text>
                            <TextField.Root
                                value={delegateClass}
                                onChange={(e) => setDelegateClass(e.target.value)}
                                placeholder="com.strato.workflow.delegates.MyDelegate"
                            />
                        </Box>
                    )}
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            <X size={16} />
                            Cancel
                        </Button>
                    </Dialog.Close>
                    <Button onClick={handleSave}>
                        <Save size={16} />
                        Save
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
