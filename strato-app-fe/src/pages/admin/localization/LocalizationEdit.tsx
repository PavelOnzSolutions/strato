import {Button, Card, Flex, Heading, IconButton, Progress, Table, TextField} from '@radix-ui/themes';
import {ArrowLeft, Braces, HelpCircle, Plus, RefreshCw, Save, Trash2} from 'lucide-react';
import {useToolbar} from '../../../context/ToolbarContext';
import {useToast} from '../../../context/ToastContext';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {usePageTitle} from '../../../context/PageTitleContext';


import {fetchWithAuth} from '../../../utils/api';
import {useTranslation} from 'react-i18next';
import {fetchLocale} from "./api.ts";

interface TranslationEntry {
    key: string;
    value: string;
}

const LocalizationEdit = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isNew = !id;
    // @ts-ignore
    const { t, i18n } = useTranslation();

    const [label, setLabel] = useState('');
    const [key, setKey] = useState('');
    const [translations, setTranslations] = useState<TranslationEntry[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [initializedId, setInitializedId] = useState<string | null>(null);

    const { data: locale, isLoading, refetch } = useQuery({
        queryKey: ['locale', id],
        queryFn: () => fetchLocale(id!),
        enabled: !!id,
        refetchOnWindowFocus: false,
    });

    const pageTitle = isNew ? 'New Locale' : 'Edit Locale';
    usePageTitle(pageTitle);

    useEffect(() => {
        if (locale && locale.id !== initializedId) {
            setLabel(locale.label);
            setKey(locale.key);
            setTranslations(
                Object.entries(locale.translations).map(([k, v]) => ({ key: k, value: v }))
            );
            setInitializedId(locale.id);
        }
    }, [locale, initializedId]);

    const handleSave = async () => {
        setIsSaving(true);
        const translationsRecord = translations.reduce((acc, curr) => {
            if (curr.key) acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        const payload = {
            label,
            key,
            translations: translationsRecord,
        };


        try {
            const url = isNew
                ? '/locales'
                : `/locales/${id}`;

            const method = isNew ? 'POST' : 'PATCH';

            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to save locale: ' + response.status.toString);
            }

            showToast(`Locale ${isNew ? 'created' : 'updated'} successfully`, 'success');
            navigate('/admin/localization');
            i18n.reloadResources();
        } catch (error) {
            console.error('Error saving locale:', error);
            showToast('Failed to save locale', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Use a ref to keep the latest handleSave accessible without triggering effect updates
    const handleSaveRef = useRef(handleSave);
    useEffect(() => {
        handleSaveRef.current = handleSave;
    }, [handleSave]);

    const handleRefresh = async () => {
        setInitializedId(null);
        await refetch();
        showToast('Locale data refreshed', 'success');
    };

    const showHelp = () => {

    }

    useToolbar([
        { id: 'back', label: 'Back', icon: ArrowLeft, onClick: () => navigate('/admin/localization'), variant: 'outline' },
        { id: 'save', label: 'Save', icon: Save, onClick: () => handleSaveRef.current(), variant: 'solid', isLoading: isSaving },
        { id: 'json', label: 'JSON edit', icon: Braces, onClick: () => navigate(`/admin/localization/${id}/json`), variant: 'soft' },
        { id: 'refresh', label: 'Refresh', icon: RefreshCw, onClick: handleRefresh, variant: 'soft' },
        { id: 'help', label: 'Help', icon: HelpCircle, onClick: showHelp, variant: 'soft', color: 'sky' },
    ]);

    const addEntry = () => {
        setTranslations([...translations, { key: '', value: '' }]);
    };

    const removeEntry = (index: number) => {
        setTranslations(translations.filter((_, i) => i !== index));
    };

    const updateEntry = (index: number, field: keyof TranslationEntry, value: string) => {
        const newTranslations = [...translations];
        newTranslations[index][field] = value;
        setTranslations(newTranslations);
    };

    return (
        <Card size="4" className="w-full shadow-lg space-y-6">
            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}
            <Heading size="4" mb="4">{isNew ? 'New Locale' : `Edit Locale ${locale?.id} (${locale?.key})`}</Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--gray-12)]">Label</label>
                    <TextField.Root
                        placeholder="e.g. English (US)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--gray-12)]">BCP47 Language Tag</label>
                    <TextField.Root
                        placeholder="e.g. en-US"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <Flex justify="between" align="center">
                    <Heading size="3">Translations</Heading>
                    <Button onClick={addEntry} variant="soft">
                        <Plus className="w-4 h-4 mr-2" /> Add Entry
                    </Button>
                </Flex>

                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell width="40%">Key</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell width="50%">Value</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell width="10%">Actions</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {translations.map((entry, index) => (
                            <Table.Row key={index}>
                                <Table.Cell>
                                    <TextField.Root
                                        value={entry.key}
                                        onChange={(e) => updateEntry(index, 'key', e.target.value)}
                                        placeholder="Key"
                                        className="font-mono [&_input]:font-mono"
                                    />

                                </Table.Cell>
                                <Table.Cell>
                                    <TextField.Root
                                        value={entry.value}
                                        onChange={(e) => updateEntry(index, 'value', e.target.value)}
                                        placeholder="Value"
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <IconButton color="red" variant="ghost" onClick={() => removeEntry(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </IconButton>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        {translations.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={3} className="text-center text-[var(--gray-11)]">
                                    No translations added
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </div>
        </Card>
    );
};

export default LocalizationEdit;
