import React, {useState} from 'react';
import {Box, Button, Card, Flex, IconButton, Switch, Text, TextArea, TextField, Tooltip} from '@radix-ui/themes';
import {ChevronDown, ChevronRight, Eye, EyeOff, Plus, Trash2} from 'lucide-react';
import {DynamicIcon} from 'lucide-react/dynamic';
import {useTranslation} from 'react-i18next';

import {ISectionItemField} from '../../../models/section-catalog.model';
import {entriesToObject, MapEntry, objectToEntries} from '../../../utils/map-field';
import {TYPE_COLORS} from '../../../constants/colors';
import {dataTypeToIcon, fieldTypeToDisplayType} from '../../../utils/utils';

const NESTED_INDENT_PX = 24;

interface ItemFormProps {
    effectiveFields: ISectionItemField[];
    value: Record<string, unknown>;
    onChange: (next: Record<string, unknown>) => void;
    locked: boolean;
    /** True for the outermost form rendered against the configuration item.
     *  Defaults to true; the recursive renderer for OBJECT / ARRAY_OF_OBJECT passes false. */
    topLevel?: boolean;
    /** Controlled set of EXPANDED top-level field names. Fields absent from the set
     *  render collapsed. Only consulted for top-level fields. */
    expandedFields?: Set<string>;
    /** Toggle handler for a top-level field's collapse state. Only used for top-level fields. */
    onToggleField?: (name: string) => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({
    effectiveFields,
    value,
    onChange,
    locked,
    topLevel = true,
    expandedFields,
    onToggleField,
}) => {
    return (
        <Flex direction="column" gap={topLevel ? '4' : '3'}>
            {effectiveFields.map((field) => (
                <FieldRow
                    key={field.name}
                    field={field}
                    value={value?.[field.name]}
                    onChange={(v) => onChange({...value, [field.name]: v})}
                    locked={locked}
                    topLevel={topLevel}
                    open={topLevel ? (expandedFields?.has(field.name) ?? false) : true}
                    onToggle={topLevel ? () => onToggleField?.(field.name) : undefined}
                />
            ))}
        </Flex>
    );
};

interface FieldRowProps {
    field: ISectionItemField;
    value: unknown;
    onChange: (v: unknown) => void;
    locked: boolean;
    topLevel: boolean;
    /** Whether this row's body is expanded. Nested rows are always passed true. */
    open: boolean;
    /** Toggle handler; provided only for collapsible top-level rows. */
    onToggle?: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({field, value, onChange, locked, topLevel, open, onToggle}) => {
    const expanded = open;

    const headerInner = (
        <>
            {topLevel && (open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>)}
            <Text
                size={topLevel ? '3' : '2'}
                weight={topLevel ? 'bold' : 'medium'}
                style={topLevel ? {letterSpacing: '0.01em'} : undefined}
                className={topLevel ? 'bg-linear-to-l from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent' : undefined}
            >
                {field.displayName || field.name}
            </Text>
            <Tooltip content={fieldTypeToDisplayType(field.type, field.secret)} style={{background: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-11)`, fontWeight: 'bold', fontSize: '20px'}}>
                <DynamicIcon name={dataTypeToIcon(field.type.toLowerCase())} size={16}
                             style={{color: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-10)`}}></DynamicIcon>
            </Tooltip>
        </>
    );

    return (
        <Box>
            {topLevel ? (
                <Flex
                    align="center"
                    gap="2"
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={onToggle}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onToggle?.();
                        }
                    }}
                    style={{cursor: 'pointer', userSelect: 'none'}}
                >
                    {headerInner}
                </Flex>
            ) : (
                <Flex align="center" gap="2">{headerInner}</Flex>
            )}
            {expanded && (
                <>
                    {field.description && (
                        <Text size="1" color="gray" as="div" mb="1">{field.description}</Text>
                    )}
                    <Box mt="1">
                        <FieldEditor field={field} value={value} onChange={onChange} locked={locked}/>
                    </Box>
                </>
            )}
        </Box>
    );
};

interface FieldEditorProps {
    field: ISectionItemField;
    value: unknown;
    onChange: (v: unknown) => void;
    locked: boolean;
}

const FieldEditor: React.FC<FieldEditorProps> = ({field, value, onChange, locked}) => {
    const {t} = useTranslation();
    const [revealed, setRevealed] = useState(false);

    switch (field.type) {
        case 'STRING': {
            const v = (value as string | undefined) ?? '';
            if (field.secret) {
                return (
                    <Flex gap="1" align="center">
                        <TextField.Root
                            type={revealed ? 'text' : 'password'}
                            value={v}
                            onChange={(e) => onChange(e.target.value)}
                            disabled={locked}
                            style={{flex: 1}}
                        />
                        <Tooltip content={revealed ? t('tooltip_hide', 'Hide') : t('tooltip_reveal', 'Reveal')}>
                            <IconButton
                                size="1"
                                variant="soft"
                                color="gray"
                                onClick={() => setRevealed((p) => !p)}
                                type="button"
                            >
                                {revealed ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </IconButton>
                        </Tooltip>
                    </Flex>
                );
            }
            return (
                <TextField.Root
                    value={v}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={locked}
                />
            );
        }
        case 'NUMBER': {
            const v = value as number | undefined;
            return (
                <TextField.Root
                    type="number"
                    value={v === undefined || v === null ? '' : String(v)}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            onChange(0);
                        } else {
                            const n = Number(raw);
                            onChange(Number.isFinite(n) ? n : 0);
                        }
                    }}
                    disabled={locked}
                />
            );
        }
        case 'BOOLEAN': {
            const v = Boolean(value);
            return (
                <Switch
                    checked={v}
                    onCheckedChange={(checked) => onChange(checked)}
                    disabled={locked}
                />
            );
        }
        case 'ARRAY_OF_STRING':
            return (
                <ArrayOfStringEditor
                    value={value}
                    onChange={onChange}
                    locked={locked}
                    placeholder={t('ph_array_of_string', 'value1, value2, value3')}
                />
            );
        case 'OBJECT': {
            const obj = (value as Record<string, unknown> | undefined) ?? {};
            const nested = field.nestedFields ?? [];
            return (
                <Box
                    ml="2"
                    style={{
                        paddingLeft: NESTED_INDENT_PX,
                        borderLeft: '2px solid var(--accent-a5)',
                    }}
                >
                    <ItemForm
                        effectiveFields={nested}
                        value={obj}
                        onChange={(next) => onChange(next)}
                        locked={locked}
                        topLevel={false}
                    />
                </Box>
            );
        }
        case 'ARRAY_OF_OBJECT': {
            const arr = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
            const nested = field.nestedFields ?? [];
            const addRow = () => {
                const blank: Record<string, unknown> = {};
                for (const nf of nested) {
                    switch (nf.type) {
                        case 'STRING':
                            blank[nf.name] = '';
                            break;
                        case 'NUMBER':
                            blank[nf.name] = 0;
                            break;
                        case 'BOOLEAN':
                            blank[nf.name] = false;
                            break;
                        case 'ARRAY_OF_STRING':
                        case 'ARRAY_OF_OBJECT':
                            blank[nf.name] = [];
                            break;
                        case 'OBJECT':
                            blank[nf.name] = {};
                            break;
                        case 'MAP_OF_STRING':
                        case 'MAP_OF_OBJECT':
                            blank[nf.name] = {};
                            break;
                    }
                }
                onChange([...arr, blank]);
            };
            const removeRow = (idx: number) => {
                const next = arr.slice();
                next.splice(idx, 1);
                onChange(next);
            };
            const updateRow = (idx: number, val: Record<string, unknown>) => {
                const next = arr.slice();
                next[idx] = val;
                onChange(next);
            };
            return (
                <Box
                    ml="2"
                    style={{
                        paddingLeft: NESTED_INDENT_PX,
                        borderLeft: '2px solid var(--accent-a5)',
                    }}
                >
                    <Flex direction="column" gap="2">
                        {arr.map((row, idx) => (
                            <Card key={idx} variant="surface" className="glass-card">
                                <Flex justify="between" align="center" mb="2">
                                    <Text size="1" color="gray">#{idx + 1}</Text>
                                    {!locked && (
                                        <IconButton
                                            size="1"
                                            color="red"
                                            variant="soft"
                                            onClick={() => removeRow(idx)}
                                            type="button"
                                        >
                                            <Trash2 size={14}/>
                                        </IconButton>
                                    )}
                                </Flex>
                                <ItemForm
                                    effectiveFields={nested}
                                    value={row}
                                    onChange={(val) => updateRow(idx, val)}
                                    locked={locked}
                                    topLevel={false}
                                />
                            </Card>
                        ))}
                        {!locked && (
                            <Button size="2" variant="soft" onClick={addRow} type="button">
                                <Plus size={14}/> {t('btn_add_row', 'Add row')}
                            </Button>
                        )}
                    </Flex>
                </Box>
            );
        }
        case 'MAP_OF_STRING':
            return <MapOfStringEditor value={value} onChange={onChange} locked={locked}/>;
        case 'MAP_OF_OBJECT':
            return <MapOfObjectEditor field={field} value={value} onChange={onChange} locked={locked}/>;
        default:
            return <Text size="1" color="gray">Unsupported field type</Text>;
    }
};

interface MapEditorProps {
    field?: ISectionItemField;
    value: unknown;
    onChange: (v: unknown) => void;
    locked: boolean;
}

/**
 * Editor for MAP_OF_STRING: dynamic string keys → string values.
 *
 * Backed by a local ordered-entry buffer (same approach as ArrayOfStringEditor) so
 * keys can be renamed without focus loss or duplicate-key collapse mid-typing. The
 * buffer serializes to a plain object on every change and re-seeds when the model
 * changes from outside (item switch / remote merge), detected via canonical compare.
 */
const MapOfStringEditor: React.FC<MapEditorProps> = ({value, onChange, locked}) => {
    const {t} = useTranslation();
    const [entries, setEntries] = useState<MapEntry[]>(() => objectToEntries(value));

    const incoming = JSON.stringify(value ?? {});
    const [synced, setSynced] = useState(incoming);
    if (incoming !== synced) {
        setSynced(incoming);
        if (JSON.stringify(entriesToObject(entries)) !== incoming) {
            setEntries(objectToEntries(value));
        }
    }

    const commit = (next: MapEntry[]) => {
        setEntries(next);
        onChange(entriesToObject(next));
    };
    const updateKey = (idx: number, key: string) => commit(entries.map((e, i) => i === idx ? {...e, key} : e));
    const updateValue = (idx: number, v: string) => commit(entries.map((e, i) => i === idx ? {...e, value: v} : e));
    const removeEntry = (idx: number) => commit(entries.filter((_, i) => i !== idx));
    const addEntry = () => commit([...entries, {key: '', value: ''}]);

    return (
        <Box ml="2" style={{paddingLeft: NESTED_INDENT_PX, borderLeft: '2px solid var(--accent-a5)'}}>
            <Flex direction="column" gap="2">
                {entries.map((entry, idx) => (
                    <Flex key={idx} gap="2" align="center">
                        <TextField.Root
                            placeholder={t('ph_map_key', 'key')}
                            value={entry.key}
                            onChange={(e) => updateKey(idx, e.target.value)}
                            disabled={locked}
                            style={{flex: 1}}
                        />
                        <TextField.Root
                            placeholder={t('ph_map_value', 'value')}
                            value={String(entry.value ?? '')}
                            onChange={(e) => updateValue(idx, e.target.value)}
                            disabled={locked}
                            style={{flex: 2}}
                        />
                        {!locked && (
                            <IconButton size="1" color="red" variant="soft" type="button" onClick={() => removeEntry(idx)}>
                                <Trash2 size={14}/>
                            </IconButton>
                        )}
                    </Flex>
                ))}
                {!locked && (
                    <Button size="2" variant="soft" onClick={addEntry} type="button">
                        <Plus size={14}/> {t('btn_add_entry', 'Add entry')}
                    </Button>
                )}
            </Flex>
        </Box>
    );
};

/**
 * Editor for MAP_OF_OBJECT: dynamic string keys → objects whose shape is the field's
 * nestedFields. Mirrors the ARRAY_OF_OBJECT card layout, with an editable key per row
 * and a nested ItemForm for the value object. Same buffer strategy as MapOfStringEditor.
 */
const MapOfObjectEditor: React.FC<MapEditorProps> = ({field, value, onChange, locked}) => {
    const {t} = useTranslation();
    const nested = field?.nestedFields ?? [];
    const [entries, setEntries] = useState<MapEntry[]>(() => objectToEntries(value));

    const incoming = JSON.stringify(value ?? {});
    const [synced, setSynced] = useState(incoming);
    if (incoming !== synced) {
        setSynced(incoming);
        if (JSON.stringify(entriesToObject(entries)) !== incoming) {
            setEntries(objectToEntries(value));
        }
    }

    const commit = (next: MapEntry[]) => {
        setEntries(next);
        onChange(entriesToObject(next));
    };
    const updateKey = (idx: number, key: string) => commit(entries.map((e, i) => i === idx ? {...e, key} : e));
    const updateValue = (idx: number, v: Record<string, unknown>) =>
        commit(entries.map((e, i) => i === idx ? {...e, value: v} : e));
    const removeEntry = (idx: number) => commit(entries.filter((_, i) => i !== idx));
    const addEntry = () => commit([...entries, {key: '', value: {}}]);

    return (
        <Box ml="2" style={{paddingLeft: NESTED_INDENT_PX, borderLeft: '2px solid var(--accent-a5)'}}>
            <Flex direction="column" gap="2">
                {entries.map((entry, idx) => (
                    <Card key={idx} variant="surface" className="glass-card">
                        <Flex justify="between" align="center" gap="2" mb="2">
                            <TextField.Root
                                placeholder={t('ph_map_key', 'key')}
                                value={entry.key}
                                onChange={(e) => updateKey(idx, e.target.value)}
                                disabled={locked}
                                style={{flex: 1}}
                            />
                            {!locked && (
                                <IconButton size="1" color="red" variant="soft" type="button" onClick={() => removeEntry(idx)}>
                                    <Trash2 size={14}/>
                                </IconButton>
                            )}
                        </Flex>
                        <ItemForm
                            effectiveFields={nested}
                            value={(entry.value as Record<string, unknown>) ?? {}}
                            onChange={(val) => updateValue(idx, val)}
                            locked={locked}
                            topLevel={false}
                        />
                    </Card>
                ))}
                {!locked && (
                    <Button size="2" variant="soft" onClick={addEntry} type="button">
                        <Plus size={14}/> {t('btn_add_entry', 'Add entry')}
                    </Button>
                )}
            </Flex>
        </Box>
    );
};

/** Split the comma-separated editing buffer into a clean string array. */
const parseStringArray = (text: string): string[] =>
    text
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

interface ArrayOfStringEditorProps {
    value: unknown;
    onChange: (v: unknown) => void;
    locked: boolean;
    placeholder: string;
}

/**
 * Comma-separated string-array editor.
 *
 * The textarea is backed by a local editing buffer rather than being re-derived
 * from the parsed array on every render. Re-deriving (`arr.join(', ')`) erased a
 * freshly typed comma: parsing momentarily produces a trailing empty segment that
 * gets filtered out, so the comma never survived to the next keystroke. Keeping a
 * raw buffer lets the user type commas and spaces freely while the model still
 * stores the parsed, trimmed array.
 */
const ArrayOfStringEditor: React.FC<ArrayOfStringEditorProps> = ({value, onChange, locked, placeholder}) => {
    const arr = Array.isArray(value) ? (value as unknown[]).map(String) : [];
    const canonical = arr.join(', ');

    const [text, setText] = useState(canonical);

    // Re-seed the buffer only when the model changes from the outside (different
    // item selected, remote merge, etc.) — detected by the incoming array not
    // matching what our current buffer parses to. This avoids clobbering raw
    // commas/spaces the user is mid-typing.
    const [syncedCanonical, setSyncedCanonical] = useState(canonical);
    if (canonical !== syncedCanonical) {
        setSyncedCanonical(canonical);
        if (parseStringArray(text).join(', ') !== canonical) {
            setText(canonical);
        }
    }

    return (
        <TextArea
            placeholder={placeholder}
            value={text}
            onChange={(e) => {
                setText(e.target.value);
                onChange(parseStringArray(e.target.value));
            }}
            onBlur={() => setText(parseStringArray(text).join(', '))}
            disabled={locked}
        />
    );
};

export default ItemForm;
