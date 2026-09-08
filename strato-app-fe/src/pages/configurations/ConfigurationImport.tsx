import {Box, Button, Callout, Card, Flex, Heading, Select, Text, TextField} from '@radix-ui/themes';
import {useToolbar} from '../../context/ToolbarContext';
import {AlertCircle, AlertTriangle, ArrowLeft, FileUp, Save, Upload} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '../../context/ToastContext';
import {useTranslation} from 'react-i18next';
import type {IConfiguration} from '../../models/configuration.model';
import {fetchCatalogByFlavor, fetchMaterialized, fetchSchemas, saveConfiguration} from './api';
import {findUnknownSectionKeys, parseDataObject} from './importValidation';
import JsonDataEditor from './components/JsonDataEditor';
import {sanitizeJsonSchemaForMonaco} from '../../utils/monaco-json-schema';

interface ValidationResult {
    errors: string[];
    warnings: string[];
    data: IConfiguration['data'] | null;
}

const ConfigurationImport = () => {
    const navigate = useNavigate();
    const {showToast} = useToast();
    const {t} = useTranslation();
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [schemaId, setSchemaId] = useState<string>('');
    const [pasted, setPasted] = useState('');
    const [validation, setValidation] = useState<ValidationResult>({errors: [], warnings: [], data: null});
    const [hasValidated, setHasValidated] = useState(false);

    const {data: schemas = []} = useQuery({
        queryKey: ['configuration-schemas'],
        queryFn: fetchSchemas,
    });

    const selectedSchema = useMemo(
        () => schemas.find((s) => s.id === schemaId),
        [schemas, schemaId],
    );

    const {data: materialized} = useQuery({
        queryKey: ['materialized-schema', schemaId],
        queryFn: () => fetchMaterialized(schemaId),
        enabled: !!schemaId,
    });

    const monacoSchema = useMemo(
        () => (materialized ? (sanitizeJsonSchemaForMonaco(materialized) as object) : undefined),
        [materialized],
    );

    const dataReady = !!validation.data && validation.errors.length === 0;

    const resetValidation = () => {
        setValidation({errors: [], warnings: [], data: null});
        setHasValidated(false);
    };

    const handleNameChange = (val: string) => {
        setName(val);
        resetValidation();
    };

    const handleSchemaChange = (val: string) => {
        setSchemaId(val);
        resetValidation();
    };

    const handlePasteChange = (val: string) => {
        setPasted(val);
        resetValidation();
    };

    const validate = async (): Promise<ValidationResult> => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!name.trim()) {
            errors.push(t('msg_import_name_required', 'Name is required'));
        }
        if (!selectedSchema) {
            errors.push(t('msg_import_schema_required', 'Select a schema'));
        }

        const {error: parseError, data} = parseDataObject(pasted);
        if (parseError) {
            errors.push(parseError);
        }

        if (errors.length > 0 || !data || !selectedSchema) {
            return {errors, warnings, data: null};
        }

        // Soft check (non-blocking): every section key in data must resolve to the
        // selected schema's declared sections.
        try {
            const catalog = await fetchCatalogByFlavor(selectedSchema.flavor);
            for (const sectionKey of findUnknownSectionKeys(data, selectedSchema, catalog)) {
                warnings.push(t(
                    'msg_section_not_in_schema',
                    `Section "${sectionKey}" in data is not declared in the selected schema; the backend will reject this on save.`,
                ));
            }
        } catch (e) {
            warnings.push(t('msg_section_check_warn', 'Could not run section cross-check: ') + (e as Error).message);
        }

        return {errors, warnings, data};
    };

    const handleValidate = async () => {
        setHasValidated(false);
        const result = await validate();
        setValidation(result);
        setHasValidated(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            handlePasteChange((event.target?.result as string) ?? '');
        };
        reader.readAsText(file);
    };

    const importMutation = useMutation({
        mutationFn: async () => {
            if (!selectedSchema || !validation.data) {
                throw new Error('Not ready to import');
            }
            const payload: Partial<IConfiguration> = {
                name: name.trim(),
                schemaId: selectedSchema.id,
                flavor: selectedSchema.flavor,
                data: validation.data,
            };
            return saveConfiguration(payload);
        },
        onSuccess: (saved) => {
            showToast(t('msg_config_imported', 'Configuration imported successfully'), 'success');
            queryClient.invalidateQueries({queryKey: ['configurations']});
            navigate(`/configurations/maps/${saved.id}/provider-view`);
        },
        onError: (err: any) => {
            showToast(err.message || t('msg_import_failed', 'Import failed'), 'error');
        },
    });

    usePageTitle(t('ptitle_import_config', 'Import Configuration'));

    const sectionCount = useMemo(
        () => (validation.data ? Object.keys(validation.data).length : 0),
        [validation.data],
    );

    useToolbar([
        {
            id: 'back',
            label: t('btn_back', 'Back'),
            icon: ArrowLeft,
            onClick: () => navigate('/configurations/maps'),
        },
        {
            id: 'validate',
            label: t('btn_validate', 'Validate'),
            icon: Upload,
            onClick: handleValidate,
        },
        {
            id: 'import',
            label: t('btn_import', 'Import'),
            icon: Save,
            onClick: () => importMutation.mutate(),
            variant: 'solid',
            disabled: !dataReady,
            isLoading: importMutation.isPending,
        },
    ]);

    return (
        <Flex direction="column" gap="4" p="4">
            <Card size="3">
                <Flex direction="column" gap="3">
                    <Heading size="4">{t('lbl_import_config_source', 'Configuration details')}</Heading>
                    <Text size="2" color="gray">
                        {t('lbl_import_config_help', 'Choose a name and schema, then paste or upload only the configuration data object (sectionKey → itemName → fields). A new configuration document will be created.')}
                    </Text>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold">{t('lbl_config_name', 'Name')}</Text>
                        <TextField.Root
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder={t('ph_config_name', 'Configuration name')}
                        />
                    </Box>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold" style={{display: 'block'}}>
                            {t('lbl_schema', 'Schema')}
                        </Text>
                        <Select.Root value={schemaId} onValueChange={handleSchemaChange}>
                            <Select.Trigger placeholder={t('ph_select_schema', 'Select a schema')}/>
                            <Select.Content>
                                {schemas.map((s) => (
                                    <Select.Item key={s.id} value={s.id}>
                                        {s.name} ({s.flavor})
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    <Box>
                        <input
                            type="file"
                            id="config-import-file"
                            style={{display: 'none'}}
                            accept=".json,application/json"
                            onChange={handleFileUpload}
                        />
                        <Button variant="soft" onClick={() => document.getElementById('config-import-file')?.click()}>
                            <FileUp size={16}/> {t('btn_upload_file', 'Upload .json')}
                        </Button>
                    </Box>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold" style={{display: 'block'}}>
                            {t('lbl_paste_data', 'Paste data')}
                        </Text>
                        <JsonDataEditor
                            value={pasted}
                            onChange={handlePasteChange}
                            schema={monacoSchema}
                        />
                    </Box>
                </Flex>
            </Card>

            {hasValidated && validation.errors.length > 0 && (
                <Callout.Root color="red">
                    <Callout.Icon><AlertCircle size={16}/></Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">{t('lbl_validation_failed', 'Validation failed')}</Text>
                        <ul style={{marginTop: 8, marginBottom: 0, paddingLeft: 18}}>
                            {validation.errors.map((e, i) => <li key={i}><Text size="2">{e}</Text></li>)}
                        </ul>
                    </Callout.Text>
                </Callout.Root>
            )}

            {hasValidated && validation.warnings.length > 0 && (
                <Callout.Root color="amber">
                    <Callout.Icon><AlertTriangle size={16}/></Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">{t('lbl_validation_warnings', 'Warnings')}</Text>
                        <ul style={{marginTop: 8, marginBottom: 0, paddingLeft: 18}}>
                            {validation.warnings.map((w, i) => <li key={i}><Text size="2">{w}</Text></li>)}
                        </ul>
                    </Callout.Text>
                </Callout.Root>
            )}

            {hasValidated && dataReady && (
                <Card size="3">
                    <Callout.Root color="green">
                        <Callout.Text>
                            {t('msg_config_data_valid', `Data parsed successfully with ${sectionCount} section(s). Click Import to create a new configuration.`)}
                        </Callout.Text>
                    </Callout.Root>
                </Card>
            )}
        </Flex>
    );
};

export default ConfigurationImport;
