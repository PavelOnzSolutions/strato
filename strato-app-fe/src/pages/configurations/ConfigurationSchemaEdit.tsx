import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Badge, Box, Card, Flex, Select, Text, TextArea, TextField} from '@radix-ui/themes';
import {ArrowLeft, Code, Eye, Save} from 'lucide-react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import Editor from '@monaco-editor/react';

import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useToast} from '../../context/ToastContext';
import {useTheme} from '../../context/ThemeContext';
import {useTranslation} from 'react-i18next';
import {ISchemaSection} from '../../models/configuration.model';
import {ISectionCatalogEntry} from '../../models/section-catalog.model';
import {FLAVOR_LABELS, FLAVORS, Flavor} from '../../constants/flavors';
import {SchemaCatalogPanel} from './components/SchemaCatalogPanel';
import {SchemaSectionCard} from './components/SchemaSectionCard';

import {fetchSchema, fetchMaterialized, fetchCatalogList, saveSchema} from './api';
import {useCanWrite} from '../../components/permissions/WriteGuard';

const ConfigurationSchemaEdit: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {showToast} = useToast();
    const {appearance} = useTheme();
    const qc = useQueryClient();
    const canWrite = useCanWrite('PERM_CONFIG_SCHEMA_WRITE');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [flavor, setFlavor] = useState<Flavor>('AZURE');
    const [sections, setSections] = useState<ISchemaSection[]>([]);
    const [viewMode, setViewMode] = useState<'form' | 'json'>('form');

    const {data: existing} = useQuery({
        queryKey: ['configuration-schema', id],
        queryFn: () => fetchSchema(id!),
        enabled: !isNew,
    });

    useEffect(() => {
        if (existing) {
            setName(existing.name);
            setDescription(existing.description ?? '');
            setFlavor(existing.flavor);
            setSections(existing.sections ?? []);
        }
    }, [existing]);

    const {data: catalog} = useQuery({
        queryKey: ['section-catalog', flavor],
        queryFn: () => fetchCatalogList(flavor),
    });

    const catalogByDocId = useMemo(() => {
        const m = new Map<string, ISectionCatalogEntry>();
        (catalog ?? []).forEach((c) => m.set(c.documentId, c));
        return m;
    }, [catalog]);

    const addedCatalogIds = sections.map((s) => s.catalogEntryDocumentId);

    const {data: materialized} = useQuery({
        queryKey: ['configuration-schema-materialized', id],
        queryFn: () => fetchMaterialized(id!),
        enabled: !isNew && viewMode === 'json',
    });

    const mutation = useMutation({
        mutationFn: saveSchema,
        onSuccess: (s) => {
            qc.invalidateQueries({queryKey: ['configuration-schema', s.id]});
            qc.invalidateQueries({queryKey: ['configuration-schemas']});
            showToast(t('msg_schema_saved', 'Schema saved'), 'success');
            navigate(`/configurations/schemas/${s.id}`);
        },
        onError: (e: Error) => showToast(e.message, 'error'),
    });

    usePageTitle(`${t('ptitle_schema_edit', 'Edit schema')}: ${name || t('lbl_new', 'New')}`);

    useToolbar([
        {
            id: 'back',
            label: t('btn_back', 'Back'),
            icon: ArrowLeft,
            onClick: () => navigate('/configurations/schemas'),
        },
        {
            id: 'save',
            label: t('btn_save', 'Save'),
            icon: Save,
            color: 'green',
            variant: 'solid',
            disabled: !canWrite,
            onClick: () =>
                mutation.mutate({
                    id: isNew ? undefined : id,
                    name,
                    description,
                    flavor,
                    sections,
                }),
        },
    ]);

    const handleAdd = (entry: ISectionCatalogEntry) => {
        if (addedCatalogIds.includes(entry.documentId)) return;
        setSections([
            ...sections,
            {
                catalogEntryDocumentId: entry.documentId,
                disabledFieldPaths: [],
                fieldDefaults: {},
                customFields: [],
            },
        ]);
    };

    const handleSectionChange = (idx: number, next: ISchemaSection) => {
        const copy = [...sections];
        copy[idx] = next;
        setSections(copy);
    };

    const handleRemove = (idx: number) =>
        setSections(sections.filter((_, i) => i !== idx));

    const handleMove = (idx: number, dir: -1 | 1) => {
        const copy = [...sections];
        const j = idx + dir;
        if (j < 0 || j >= copy.length) return;
        [copy[idx], copy[j]] = [copy[j], copy[idx]];
        setSections(copy);
    };

    return (
        <Card size="3">
            <Flex direction="column" gap="2" mb="3">
                <Flex gap="2">
                    <TextField.Root
                        placeholder={t('ph_schema_name', 'Name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{flex: 1}}
                    />
                    <Select.Root value={flavor} onValueChange={(v) => setFlavor(v as Flavor)}>
                        <Select.Trigger/>
                        <Select.Content>
                            {FLAVORS.map((f) => (
                                <Select.Item key={f} value={f} disabled={f === 'AWS'}>
                                    {FLAVOR_LABELS[f]}
                                    {f === 'AWS' ? ` (${t('lbl_coming_soon', 'coming soon')})` : ''}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </Flex>
                <TextArea
                    placeholder={t('ph_description', 'Description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <ToggleGroup.Root
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => v && setViewMode(v as 'form' | 'json')}
                    style={{display: 'inline-flex', gap: 4}}
                >
                    <ToggleGroup.Item
                        value="form"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-3)',
                            border: '1px solid var(--gray-a4)',
                            background: viewMode === 'form' ? 'var(--accent-3)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: 'small',
                            fontWeight: 'bold',
                        }}
                    >
                        <Eye size={14}/> {t('btn_view_form', 'Form')}
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                        value="json"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-3)',
                            border: '1px solid var(--gray-a4)',
                            background: viewMode === 'json' ? 'var(--accent-3)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: 'small',
                            fontWeight: 'bold',
                        }}
                    >
                        <Code size={14}/> {t('btn_view_json', 'JSON preview')}
                    </ToggleGroup.Item>
                </ToggleGroup.Root>
            </Flex>

            {viewMode === 'form' ? (
                <Flex gap="3" align="start">
                    <Box style={{width: 320, flexShrink: 0}}>
                        <SchemaCatalogPanel
                            flavor={flavor}
                            addedCatalogIds={addedCatalogIds}
                            onAdd={handleAdd}
                        />
                    </Box>
                    <Flex direction="column" gap="2" style={{flex: 1, minWidth: 0}}>
                        {sections.length === 0 && (
                            <Card size="2">
                                <Flex align="center" justify="center" p="4">
                                    <Text color="gray" size="2">
                                        {t(
                                            'msg_no_sections',
                                            'No sections yet — add from the catalog on the left',
                                        )}
                                    </Text>
                                </Flex>
                            </Card>
                        )}
                        {sections.map((sec, idx) => {
                            const cat = catalogByDocId.get(sec.catalogEntryDocumentId);
                            if (!cat) {
                                return (
                                    <Card key={sec.catalogEntryDocumentId} size="2">
                                        <Flex align="center" gap="2">
                                            <Badge color="red">{t('lbl_unknown_section', 'Unknown section')}</Badge>
                                            <Text size="1" color="gray">
                                                {sec.catalogEntryDocumentId}
                                            </Text>
                                        </Flex>
                                    </Card>
                                );
                            }
                            return (
                                <SchemaSectionCard
                                    key={sec.catalogEntryDocumentId}
                                    catalog={cat}
                                    section={sec}
                                    onChange={(n) => handleSectionChange(idx, n)}
                                    onRemove={() => handleRemove(idx)}
                                    onMoveUp={() => handleMove(idx, -1)}
                                    onMoveDown={() => handleMove(idx, 1)}
                                />
                            );
                        })}
                    </Flex>
                </Flex>
            ) : (
                <Box style={{height: '60vh'}}>
                    <Editor
                        height="100%"
                        language="json"
                        value={JSON.stringify(materialized ?? {}, null, 2)}
                        theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                        options={{readOnly: true, minimap: {enabled: false}}}
                    />
                </Box>
            )}
        </Card>
    );
};

export default ConfigurationSchemaEdit;
