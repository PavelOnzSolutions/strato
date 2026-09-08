import {Box, Button, Flex, Table, Text, TextField} from '@radix-ui/themes';
import {Plus, Trash2} from 'lucide-react';
import {WorkflowEditor} from '../workflow/WorkflowEditor.tsx';
import {IWorkflowDefinition, IWorkflowStep} from '../../../../models/workflow.model';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';

interface ProcessEditorProps {
    workflowDefinition: IWorkflowDefinition | null;
    inputMappings: Record<string, string>;
    outputMappings: Record<string, string>;
    onWorkflowChange: (steps: IWorkflowStep[]) => void;
    onInputMappingsChange: (mappings: Record<string, string>) => void;
    onOutputMappingsChange: (mappings: Record<string, string>) => void;
}

export const ProcessEditor = ({
    workflowDefinition,
    inputMappings,
    outputMappings,
    onWorkflowChange,
    onInputMappingsChange,
    onOutputMappingsChange,
}: ProcessEditorProps) => {
    const {t} = useTranslation();
    const [newInputKey, setNewInputKey] = useState('');
    const [newInputExpression, setNewInputExpression] = useState('');
    const [newOutputKey, setNewOutputKey] = useState('');
    const [newOutputVariable, setNewOutputVariable] = useState('');

    const handleAddInputMapping = () => {
        if (newInputKey && newInputExpression) {
            onInputMappingsChange({
                ...inputMappings,
                [newInputKey]: newInputExpression,
            });
            setNewInputKey('');
            setNewInputExpression('');
        }
    };

    const handleDeleteInputMapping = (key: string) => {
        const updated = { ...inputMappings };
        delete updated[key];
        onInputMappingsChange(updated);
    };

    const handleAddOutputMapping = () => {
        if (newOutputKey && newOutputVariable) {
            onOutputMappingsChange({
                ...outputMappings,
                [newOutputKey]: newOutputVariable,
            });
            setNewOutputKey('');
            setNewOutputVariable('');
        }
    };

    const handleDeleteOutputMapping = (key: string) => {
        const updated = { ...outputMappings };
        delete updated[key];
        onOutputMappingsChange(updated);
    };

    return (
        <Flex direction="column" gap="4">
            {/* Workflow Editor */}
            <Box>
                <Text as="div" size="3" weight="bold" mb="2">
                    {t('lbl_workflow_definition', 'Workflow Definition')}
                </Text>
                <WorkflowEditor
                    definition={workflowDefinition}
                    onChange={onWorkflowChange}
                />
            </Box>

            {/* Input Mappings */}
            <Box>
                <Text as="div" size="3" weight="bold" mb="2">
                    {t('lbl_input_mappings', 'Input Mappings')}
                </Text>
                <Text as="div" size="2" color="gray" mb="2">
                    {t('msg_input_mappings_desc', "Map workflow input variables to expressions (e.g., key: 'user_id', expression: '{{node.values.owner}}')")}
                </Text>
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>{t('lbl_workflow_variable', 'Workflow Variable')}</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>{t('lbl_expression', 'Expression')}</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: '80px' }}>{t('lbl_actions', 'Actions')}</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {Object.entries(inputMappings).map(([key, expression]) => (
                            <Table.Row key={key}>
                                <Table.Cell>{key}</Table.Cell>
                                <Table.Cell>
                                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">{expression}</code>
                                </Table.Cell>
                                <Table.Cell>
                                    <Button
                                        size="1"
                                        variant="soft"
                                        color="red"
                                        onClick={() => handleDeleteInputMapping(key)}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        <Table.Row>
                            <Table.Cell>
                                <TextField.Root
                                    placeholder="e.g. user_id"
                                    value={newInputKey}
                                    onChange={(e) => setNewInputKey(e.target.value)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <TextField.Root
                                    placeholder="e.g. {{node.values.owner}}"
                                    value={newInputExpression}
                                    onChange={(e) => setNewInputExpression(e.target.value)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Button size="1" variant="soft" onClick={handleAddInputMapping}>
                                    <Plus size={14} />
                                </Button>
                            </Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>
            </Box>

            {/* Output Mappings */}
            <Box>
                <Text as="div" size="3" weight="bold" mb="2">
                    {t('lbl_output_mappings', 'Output Mappings')}
                </Text>
                <Text as="div" size="2" color="gray" mb="2">
                    {t('msg_output_mappings_desc', 'Map resource output keys to workflow variable names (e.g., key: "vm_id", variable: "created_instance_id")')}
                </Text>
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>{t('lbl_resource_output_key', 'Resource Output Key')}</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>{t('lbl_workflow_variable', 'Workflow Variable')}</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: '80px' }}>{t('lbl_actions', 'Actions')}</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {Object.entries(outputMappings).map(([key, variable]) => (
                            <Table.Row key={key}>
                                <Table.Cell>{key}</Table.Cell>
                                <Table.Cell>
                                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">{variable}</code>
                                </Table.Cell>
                                <Table.Cell>
                                    <Button
                                        size="1"
                                        variant="soft"
                                        color="red"
                                        onClick={() => handleDeleteOutputMapping(key)}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        <Table.Row>
                            <Table.Cell>
                                <TextField.Root
                                    placeholder="e.g. vm_id"
                                    value={newOutputKey}
                                    onChange={(e) => setNewOutputKey(e.target.value)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <TextField.Root
                                    placeholder="e.g. created_instance_id"
                                    value={newOutputVariable}
                                    onChange={(e) => setNewOutputVariable(e.target.value)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Button size="1" variant="soft" onClick={handleAddOutputMapping}>
                                    <Plus size={14} />
                                </Button>
                            </Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>
            </Box>
        </Flex>
    );
};
