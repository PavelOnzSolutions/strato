import {Box, Button, Callout, Card, Flex, Heading, Text, TextArea, TextField} from '@radix-ui/themes';
import {useToolbar} from '../../context/ToolbarContext';
import {AlertCircle, ArrowLeft, FileUp, Save, Upload} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchWithAuth} from '../../utils/api';
import {useToast} from '../../context/ToastContext';
import {useTranslation} from 'react-i18next';
import type {IConfigurationSchema, ISchemaSection} from '../../models/configuration.model';
import type {ISectionCatalogEntry} from '../../models/section-catalog.model';
import {FLAVORS, Flavor} from '../../constants/flavors';

interface ValidationResult {
    errors: string[];
    parsed: IConfigurationSchema | null;
}

const ConfigurationSchemaImport = () => {
    const navigate = useNavigate();
    const {showToast} = useToast();
    const {t} = useTranslation();
    const queryClient = useQueryClient();

    const [pasted, setPasted] = useState('');
    const [renameTo, setRenameTo] = useState('');
    const [validation, setValidation] = useState<ValidationResult>({errors: [], parsed: null});
    const [hasValidated, setHasValidated] = useState(false);

    const parsedReady = validation.parsed && validation.errors.length === 0;

    const validate = async (raw: string): Promise<ValidationResult> => {
        const errors: string[] = [];
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch (e: any) {
            return {errors: [t('msg_invalid_json', 'Invalid JSON: ') + e.message], parsed: null};
        }

        // Shape validation
        if (typeof parsed !== 'object' || parsed === null) {
            errors.push(t('msg_root_not_object', 'Root must be a JSON object'));
            return {errors, parsed: null};
        }
        if (typeof parsed.name !== 'string' || parsed.name.trim() === '') {
            errors.push(t('msg_name_required', 'Field "name" must be a non-empty string'));
        }
        if (!FLAVORS.includes(parsed.flavor as Flavor)) {
            errors.push(t('msg_flavor_invalid', `Field "flavor" must be one of: ${FLAVORS.join(', ')}`));
        }
        if (!Array.isArray(parsed.sections)) {
            errors.push(t('msg_sections_array', 'Field "sections" must be an array'));
            return {errors, parsed: null};
        }

        // Per-section validation
        const sections = parsed.sections as ISchemaSection[];
        const seenIds = new Set<string>();
        sections.forEach((sec, idx) => {
            if (!sec || typeof sec.catalogEntryDocumentId !== 'string' || !sec.catalogEntryDocumentId) {
                errors.push(t('msg_section_missing_id', `Section #${idx + 1} is missing catalogEntryDocumentId`));
                return;
            }
            if (seenIds.has(sec.catalogEntryDocumentId)) {
                errors.push(t('msg_section_duplicate', `Section #${idx + 1}: duplicate catalogEntryDocumentId "${sec.catalogEntryDocumentId}"`));
            }
            seenIds.add(sec.catalogEntryDocumentId);

            // Custom-field name collision check (within a section)
            if (Array.isArray(sec.customFields)) {
                const names = new Set<string>();
                for (const f of sec.customFields) {
                    if (!f || typeof f.name !== 'string' || !f.name) continue;
                    if (names.has(f.name)) {
                        errors.push(t('msg_field_dup', `Section #${idx + 1}: duplicate custom field name "${f.name}"`));
                    }
                    names.add(f.name);
                }
            }
        });

        // Catalog validation
        if (errors.length === 0) {
            try {
                const r = await fetchWithAuth(`/section-catalog?flavor=${parsed.flavor}`);
                if (!r.ok) {
                    errors.push(t('msg_catalog_fetch_failed', 'Failed to fetch section catalog for validation'));
                } else {
                    const catalog: ISectionCatalogEntry[] = await r.json();
                    const valid = new Set(catalog.map(e => e.documentId));
                    sections.forEach((sec, idx) => {
                        if (!valid.has(sec.catalogEntryDocumentId)) {
                            errors.push(t('msg_catalog_missing', `Section #${idx + 1}: catalogEntryDocumentId "${sec.catalogEntryDocumentId}" not found in ${parsed.flavor} catalog`));
                        }
                    });
                }
            } catch (e: any) {
                errors.push(t('msg_catalog_error', 'Catalog validation error: ') + e.message);
            }
        }

        return {errors, parsed: errors.length === 0 ? (parsed as IConfigurationSchema) : null};
    };

    const handleValidate = async (raw: string) => {
        setHasValidated(false);
        if (!raw.trim()) {
            setValidation({errors: [t('msg_paste_required', 'Please paste JSON or upload a file')], parsed: null});
            setHasValidated(true);
            return;
        }
        const result = await validate(raw);
        setValidation(result);
        if (result.parsed) {
            setRenameTo(result.parsed.name);
        }
        setHasValidated(true);
    };

    const handlePasteChange = (val: string) => {
        setPasted(val);
        setValidation({errors: [], parsed: null});
        setHasValidated(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            setPasted(content);
            await handleValidate(content);
        };
        reader.readAsText(file);
    };

    const importMutation = useMutation({
        mutationFn: async (schema: IConfigurationSchema) => {
            const payload: Partial<IConfigurationSchema> = {...schema};
            // Drop server-managed fields so server treats this as creation
            delete (payload as any).id;
            delete (payload as any).version;
            delete (payload as any).createdBy;
            delete (payload as any).createdDate;
            const r = await fetchWithAuth('/configuration-schemas', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });
            if (!r.ok) {
                const body = await r.text();
                throw new Error(body || `HTTP ${r.status}`);
            }
            return r.json() as Promise<IConfigurationSchema>;
        },
        onSuccess: () => {
            showToast(t('msg_schema_imported', 'Schema imported successfully'), 'success');
            queryClient.invalidateQueries({queryKey: ['configuration-schemas']});
            navigate('/configurations/schemas');
        },
        onError: (err: any) => {
            showToast(err.message || t('msg_import_failed', 'Import failed'), 'error');
        }
    });

    const handleConfirm = () => {
        if (!validation.parsed) return;
        const finalSchema: IConfigurationSchema = {
            ...validation.parsed,
            name: renameTo.trim() || validation.parsed.name,
        };
        importMutation.mutate(finalSchema);
    };

    usePageTitle(t('ptitle_import_schema', 'Import Schema'));

    const sectionCount = useMemo(() => validation.parsed?.sections?.length ?? 0, [validation.parsed]);

    useToolbar([
        {
            id: 'back',
            label: t('btn_back', 'Back'),
            icon: ArrowLeft,
            onClick: () => navigate('/configurations/schemas'),
        },
        {
            id: 'validate',
            label: t('btn_validate', 'Validate'),
            icon: Upload,
            onClick: () => handleValidate(pasted),
        },
        {
            id: 'import',
            label: t('btn_import', 'Import'),
            icon: Save,
            onClick: handleConfirm,
            variant: 'solid',
            disabled: !parsedReady,
            isLoading: importMutation.isPending,
        },
    ]);

    return (
        <Flex direction="column" gap="4" p="4">
            <Card size="3">
                <Flex direction="column" gap="3">
                    <Heading size="4">{t('lbl_import_schema_source', 'Schema source')}</Heading>
                    <Text size="2" color="gray">
                        {t('lbl_import_schema_help', 'Paste a single schema JSON document, or upload a .json file. The schema must reference catalog entries already present in this instance for the same flavor.')}
                    </Text>

                    <Box>
                        <input
                            type="file"
                            id="schema-import-file"
                            style={{display: 'none'}}
                            accept=".json,application/json"
                            onChange={handleFileUpload}
                        />
                        <Button variant="soft" onClick={() => document.getElementById('schema-import-file')?.click()}>
                            <FileUp size={16}/> {t('btn_upload_file', 'Upload .json')}
                        </Button>
                    </Box>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold">{t('lbl_paste_json', 'Paste JSON')}</Text>
                        <TextArea
                            rows={14}
                            style={{fontFamily: 'var(--code-font-family, monospace)', fontSize: 12}}
                            placeholder='{"name":"...","flavor":"AZURE","sections":[...]}'
                            value={pasted}
                            onChange={(e) => handlePasteChange(e.target.value)}
                        />
                    </Box>
                </Flex>
            </Card>

            {hasValidated && validation.errors.length > 0 && (
                <Callout.Root color="red">
                    <Callout.Icon>
                        <AlertCircle size={16}/>
                    </Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">{t('lbl_validation_failed', 'Validation failed')}</Text>
                        <ul style={{marginTop: 8, marginBottom: 0, paddingLeft: 18}}>
                            {validation.errors.map((e, i) => <li key={i}><Text size="2">{e}</Text></li>)}
                        </ul>
                    </Callout.Text>
                </Callout.Root>
            )}

            {hasValidated && parsedReady && validation.parsed && (
                <Card size="3">
                    <Flex direction="column" gap="3">
                        <Heading size="4">{t('lbl_review_and_confirm', 'Review and confirm')}</Heading>
                        <Callout.Root color="green">
                            <Callout.Text>
                                {t('msg_schema_valid', `Schema "${validation.parsed.name}" (flavor ${validation.parsed.flavor}) parsed successfully with ${sectionCount} section(s).`)}
                            </Callout.Text>
                        </Callout.Root>
                        <Box>
                            <Text as="label" size="2" mb="1" weight="bold">{t('lbl_name_on_import', 'Name on import')}</Text>
                            <TextField.Root
                                value={renameTo}
                                onChange={(e) => setRenameTo(e.target.value)}
                                placeholder={t('ph_schema_name', 'Schema name')}
                            />
                            <Text size="1" color="gray" mt="1" as="div">
                                {t('lbl_rename_help', 'You can rename the schema to avoid collisions with existing schemas.')}
                            </Text>
                        </Box>
                    </Flex>
                </Card>
            )}
        </Flex>
    );
};

export default ConfigurationSchemaImport;
