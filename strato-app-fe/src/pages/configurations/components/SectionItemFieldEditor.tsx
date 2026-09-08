import React, {useState} from 'react';
import {Button, Dialog, Flex, IconButton, Select, Switch, Table, Text, TextField, Tooltip} from '@radix-ui/themes';
import {Eye, ListTree, Plus, Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {ISectionItemField, SectionItemFieldType} from '../../../models/section-catalog.model';

export interface SectionItemFieldEditorProps {
    value: ISectionItemField[];
    onChange: (next: ISectionItemField[]) => void;
    allowSecretToggle: boolean;
    readOnly?: boolean;
}

const FIELD_TYPES: SectionItemFieldType[] = [
    'STRING',
    'NUMBER',
    'BOOLEAN',
    'OBJECT',
    'ARRAY_OF_STRING',
    'ARRAY_OF_OBJECT',
    'MAP_OF_STRING',
    'MAP_OF_OBJECT',
];

const isNested = (type: SectionItemFieldType): boolean =>
    type === 'OBJECT' || type === 'ARRAY_OF_OBJECT' || type === 'MAP_OF_OBJECT';

const newEmptyField = (): ISectionItemField => ({
    name: '',
    displayName: '',
    type: 'STRING',
    defaultValue: '',
    secret: false,
});

const arrayOfStringToText = (val: unknown): string => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') return val;
    return '';
};

const textToArrayOfString = (text: string): string[] =>
    text
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

export const SectionItemFieldEditor: React.FC<SectionItemFieldEditorProps> = ({
                                                                                  value,
                                                                                  onChange,
                                                                                  allowSecretToggle,
                                                                                  readOnly = false,
                                                                              }) => {
    const {t} = useTranslation();
    const [nestedDialogIndex, setNestedDialogIndex] = useState<number | null>(null);

    const updateField = (index: number, updates: Partial<ISectionItemField>) => {
        const next = [...value];
        next[index] = {...next[index], ...updates};
        onChange(next);
    };

    const onTypeChange = (index: number, newType: SectionItemFieldType) => {
        const cur = value[index];
        const updates: Partial<ISectionItemField> = {type: newType};

        // Reset defaultValue to a sensible empty per type
        switch (newType) {
            case 'STRING':
                updates.defaultValue = '';
                break;
            case 'NUMBER':
                updates.defaultValue = 0;
                break;
            case 'BOOLEAN':
                updates.defaultValue = false;
                break;
            case 'ARRAY_OF_STRING':
                updates.defaultValue = [];
                break;
            case 'OBJECT':
            case 'ARRAY_OF_OBJECT':
                updates.defaultValue = undefined;
                if (!cur.nestedFields) {
                    updates.nestedFields = [];
                }
                break;
            case 'MAP_OF_STRING':
                updates.defaultValue = undefined;
                break;
            case 'MAP_OF_OBJECT':
                updates.defaultValue = undefined;
                if (!cur.nestedFields) {
                    updates.nestedFields = [];
                }
                break;
        }

        // Clear nestedFields when switching away from nested types
        if (!isNested(newType)) {
            updates.nestedFields = undefined;
        }

        updateField(index, updates);
    };

    const removeField = (index: number) => {
        const next = value.filter((_, i) => i !== index);
        onChange(next);
    };

    const addField = () => {
        onChange([...value, newEmptyField()]);
    };

    const updateNestedFields = (index: number, nested: ISectionItemField[]) => {
        updateField(index, {nestedFields: nested});
    };

    const renderDefaultValueEditor = (field: ISectionItemField, index: number) => {
        switch (field.type) {
            case 'STRING':
                return (
                    <TextField.Root
                        size="1"
                        disabled={readOnly}
                        value={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
                        onChange={(e) => updateField(index, {defaultValue: e.target.value})}
                    />
                );
            case 'NUMBER':
                return (
                    <TextField.Root
                        size="1"
                        type="number"
                        disabled={readOnly}
                        value={
                            typeof field.defaultValue === 'number'
                                ? String(field.defaultValue)
                                : ''
                        }
                        onChange={(e) => {
                            const n = e.target.value === '' ? undefined : Number(e.target.value);
                            updateField(index, {defaultValue: n});
                        }}
                    />
                );
            case 'BOOLEAN':
                return (
                    <Switch
                        checked={Boolean(field.defaultValue)}
                        disabled={readOnly}
                        onCheckedChange={(checked) => updateField(index, {defaultValue: checked})}
                    />
                );
            case 'ARRAY_OF_STRING':
                return (
                    <TextField.Root
                        size="1"
                        placeholder={t('ph_comma_separated', 'a, b, c')}
                        disabled={readOnly}
                        value={arrayOfStringToText(field.defaultValue)}
                        onChange={(e) =>
                            updateField(index, {defaultValue: textToArrayOfString(e.target.value)})
                        }
                    />
                );
            case 'OBJECT':
            case 'ARRAY_OF_OBJECT':
            case 'MAP_OF_STRING':
            case 'MAP_OF_OBJECT':
                return (
                    <Text size="1" color="gray">
                        {t('lbl_nested_value_note', '(nested)')}
                    </Text>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Table.Root variant="surface" size="1">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>{t('thead_name', 'Name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_display_name', 'Display name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_type', 'Type')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_default', 'Default')}</Table.ColumnHeaderCell>
                        {allowSecretToggle && (
                            <Table.ColumnHeaderCell>{t('thead_secret', 'Secret')}</Table.ColumnHeaderCell>
                        )}
                        <Table.ColumnHeaderCell>{t('thead_description', 'Description')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell/>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {value.map((field, index) => (
                        <Table.Row key={index}>
                            <Table.Cell>
                                <TextField.Root
                                    size="1"
                                    value={field.name}
                                    disabled={readOnly}
                                    onChange={(e) => updateField(index, {name: e.target.value})}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <TextField.Root
                                    size="1"
                                    value={field.displayName}
                                    disabled={readOnly}
                                    onChange={(e) => updateField(index, {displayName: e.target.value})}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Select.Root
                                    size="1"
                                    value={field.type}
                                    disabled={readOnly}
                                    onValueChange={(v) => onTypeChange(index, v as SectionItemFieldType)}
                                >
                                    <Select.Trigger/>
                                    <Select.Content>
                                        {FIELD_TYPES.map((ft) => (
                                            <Select.Item key={ft} value={ft}>
                                                {ft}
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Table.Cell>
                            <Table.Cell>{renderDefaultValueEditor(field, index)}</Table.Cell>
                            {allowSecretToggle && (
                                <Table.Cell>
                                    <Switch
                                        checked={Boolean(field.secret)}
                                        disabled={readOnly}
                                        onCheckedChange={(checked) => updateField(index, {secret: checked})}
                                    />
                                </Table.Cell>
                            )}
                            <Table.Cell>
                                <TextField.Root
                                    size="1"
                                    value={field.description ?? ''}
                                    disabled={readOnly}
                                    onChange={(e) => updateField(index, {description: e.target.value})}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Flex gap="1">
                                    {isNested(field.type) && (
                                        <Tooltip content={
                                            readOnly
                                                ? t('btn_view_nested', 'View nested fields')
                                                : t('btn_edit_nested', 'Edit nested fields')
                                        }>
                                            <IconButton
                                                size="1"
                                                variant="soft"
                                                onClick={() => setNestedDialogIndex(index)}
                                            >
                                                {readOnly ? <Eye size={14}/> : <ListTree size={14}/>}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {!readOnly && (
                                        <Tooltip content={t('btn_remove', 'Remove')}>
                                            <IconButton
                                                size="1"
                                                variant="soft"
                                                color="red"
                                                onClick={() => removeField(index)}
                                            >
                                                <Trash2 size={14}/>
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Flex>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                    {value.length === 0 && (
                        <Table.Row>
                            <Table.Cell colSpan={allowSecretToggle ? 7 : 6}>
                                <Text size="1" color="gray" align="center" as="div">
                                    {t('lbl_no_fields', 'No fields')}
                                </Text>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table.Root>

            {!readOnly && (
                <Flex mt="2">
                    <Button size="1" variant="soft" onClick={addField}>
                        <Plus size={14}/> {t('btn_add_field', 'Add field')}
                    </Button>
                </Flex>
            )}

            <Dialog.Root
                open={nestedDialogIndex !== null}
                onOpenChange={(open) => {
                    if (!open) setNestedDialogIndex(null);
                }}
            >
                <Dialog.Content maxWidth="1100px" maxHeight="80vh">
                    <Dialog.Title>
                        {t('dlg_nested_fields', 'Nested fields')}
                    </Dialog.Title>
                    {nestedDialogIndex !== null && (
                        <>
                            <Text size="2" color="gray" mb="2" as="div">
                                {value[nestedDialogIndex]?.displayName || value[nestedDialogIndex]?.name || ''}
                            </Text>
                            <SectionItemFieldEditor
                                value={value[nestedDialogIndex]?.nestedFields ?? []}
                                onChange={(next) => updateNestedFields(nestedDialogIndex, next)}
                                allowSecretToggle={allowSecretToggle}
                                readOnly={readOnly}
                            />
                            <Flex gap="3" mt="4" justify="end">
                                <Dialog.Close>
                                    <Button variant="soft" color="gray">
                                        {t('btn_close', 'Close')}
                                    </Button>
                                </Dialog.Close>
                            </Flex>
                        </>
                    )}
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
};

export default SectionItemFieldEditor;
