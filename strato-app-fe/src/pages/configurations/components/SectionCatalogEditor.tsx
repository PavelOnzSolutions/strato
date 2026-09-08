import React, {useEffect, useMemo, useState} from 'react';
import {Badge, Box, Button, Dialog, Flex, Text, TextArea, TextField} from '@radix-ui/themes';
import {Eye, Save, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {fetchWithAuth} from '../../../utils/api';
import {useToast} from '../../../context/ToastContext';
import {ISectionCatalogEntry, ISectionItemField} from '../../../models/section-catalog.model';
import {Flavor, FLAVOR_LABELS} from '../../../constants/flavors';
import {SectionItemFieldEditor} from './SectionItemFieldEditor';
import {CatalogIcon} from '../../../components/system/CatalogIcon';
import {IconSelectorDialog} from '../../resources/components/modals/IconSelectorDialog';
import {useCanWrite} from '../../../components/permissions/WriteGuard';

export interface SectionCatalogEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: ISectionCatalogEntry | null;
    flavor: Flavor;
    onSaved: () => void;
}

const SECTION_KEY_RE = /^[a-z][a-zA-Z0-9]*$/;

interface FormState {
    sectionKey: string;
    displayName: string;
    description: string;
    icon: string;
    requiredReadPermission: string;
    requiredWritePermission: string;
    itemFields: ISectionItemField[];
}

const emptyForm = (): FormState => ({
    sectionKey: '',
    displayName: '',
    description: '',
    icon: '',
    requiredReadPermission: '',
    requiredWritePermission: '',
    itemFields: [],
});

const stateFromEntry = (entry: ISectionCatalogEntry | null): FormState => {
    if (!entry) return emptyForm();
    return {
        sectionKey: entry.sectionKey ?? '',
        displayName: entry.displayName ?? '',
        description: entry.description ?? '',
        icon: entry.icon ?? '',
        requiredReadPermission: entry.requiredReadPermission ?? '',
        requiredWritePermission: entry.requiredWritePermission ?? '',
        itemFields: entry.itemFields ?? [],
    };
};

export const SectionCatalogEditor: React.FC<SectionCatalogEditorProps> = ({
                                                                              open,
                                                                              onOpenChange,
                                                                              entry,
                                                                              flavor,
                                                                              onSaved,
                                                                          }) => {
    const {t} = useTranslation();
    const {showToast} = useToast();
    const [form, setForm] = useState<FormState>(() => stateFromEntry(entry));
    const [saving, setSaving] = useState(false);

    // Icon selector state (mirrors ClassEditor pattern)
    const [iconSelectorOpen, setIconSelectorOpen] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const initialIconCategory = (entry?.icon ?? '').includes('/')
        ? (entry?.icon ?? '').split('/')[0]
        : 'azure';
    const [iconCategory, setIconCategory] = useState<string>(initialIconCategory);

    const effectiveFlavor: Flavor = entry?.flavor ?? flavor;
    const isEdit = entry != null;
    // General Edit/Save actions use PERM_CONFIG_SECTIONS_WRITE per the permission redesign.
    // PERM_CATALOG_ADMIN remains reserved for system-flagged entry overrides (none currently in this flow).
    const canWrite = useCanWrite('PERM_CONFIG_SECTIONS_WRITE');
    const readOnly = !canWrite;

    useEffect(() => {
        if (open) {
            setForm(stateFromEntry(entry));
            const cat = (entry?.icon ?? '').includes('/')
                ? (entry?.icon ?? '').split('/')[0]
                : 'azure';
            setIconCategory(cat);
            setIconSearch('');
        }
    }, [open, entry]);

    const sectionKeyError = useMemo(() => {
        if (!form.sectionKey) return null;
        if (!SECTION_KEY_RE.test(form.sectionKey)) {
            return t(
                'err_section_key_invalid',
                'Must start with a lowercase letter and contain only letters and digits',
            );
        }
        return null;
    }, [form.sectionKey, t]);

    const canSave =
        form.sectionKey.trim().length > 0 &&
        !sectionKeyError &&
        form.displayName.trim().length > 0 &&
        !saving;

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({...prev, [key]: value}));
    };

    const handleSave = async () => {
        const trim = (s: string) => s.trim();
        const nullable = (s: string) => {
            const v = trim(s);
            return v.length > 0 ? v : null;
        };

        const body: Record<string, unknown> = {
            flavor: effectiveFlavor,
            sectionKey: trim(form.sectionKey),
            displayName: trim(form.displayName),
            description: trim(form.description),
            icon: trim(form.icon),
            requiredReadPermission: nullable(form.requiredReadPermission),
            requiredWritePermission: nullable(form.requiredWritePermission),
            itemFields: form.itemFields,
            system: false,
        };

        let path = '/section-catalog';
        let method: 'POST' | 'PUT' = 'POST';
        if (isEdit && entry) {
            path = `/section-catalog/${entry.id}`;
            method = 'PUT';
            body.id = entry.id;
        }

        setSaving(true);
        try {
            const response = await fetchWithAuth(path, {
                method,
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const text = await response.text();
                showToast(text || t('err_save_failed', 'Failed to save catalog entry'), 'error');
                return;
            }
            showToast(
                isEdit
                    ? t('msg_catalog_entry_updated', 'Catalog entry updated')
                    : t('msg_catalog_entry_created', 'Catalog entry created'),
                'success',
            );
            onSaved();
        } catch (e: any) {
            showToast(e?.message ?? t('err_save_failed', 'Failed to save catalog entry'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="1200px" maxHeight="90vh">
                <Dialog.Title>
                    {readOnly
                        ? t('dlg_view_catalog_entry', 'View section type')
                        : isEdit
                            ? t('dlg_edit_catalog_entry', 'Edit section type')
                            : t('dlg_new_catalog_entry', 'New section type')
                    }
                </Dialog.Title>
                <Flex direction="column" gap="3">
                    {readOnly && (
                        <Box>
                            <Badge color="gray" variant="soft" size="2">
                                <Eye size={12}/> {t('lbl_system_read_only', 'System — read only')}
                            </Badge>
                        </Box>
                    )}

                    <Box>
                        <Text as="div" size="2" weight="bold" mb="1">
                            {t('lbl_flavor', 'Flavor')}
                        </Text>
                        <Badge color="iris" variant="soft">{FLAVOR_LABELS[effectiveFlavor]}</Badge>
                    </Box>

                    <Box>
                        <Text as="div" size="2" weight="bold" mb="1">
                            {t('lbl_section_key', 'Section key')} *
                        </Text>
                        <TextField.Root
                            placeholder="myCustomSection"
                            value={form.sectionKey}
                            disabled={isEdit || readOnly}
                            onChange={(e) => update('sectionKey', e.target.value)}
                        />
                        {sectionKeyError && (
                            <Text size="1" color="red" mt="1" as="div">
                                {sectionKeyError}
                            </Text>
                        )}
                    </Box>

                    <Box>
                        <Text as="div" size="2" weight="bold" mb="1">
                            {t('lbl_display_name', 'Display name')} *
                        </Text>
                        <TextField.Root
                            value={form.displayName}
                            disabled={readOnly}
                            onChange={(e) => update('displayName', e.target.value)}
                        />
                    </Box>

                    <Box>
                        <Text as="div" size="2" weight="bold" mb="1">
                            {t('lbl_description', 'Description')}
                        </Text>
                        <TextArea
                            value={form.description}
                            disabled={readOnly}
                            onChange={(e) => update('description', e.target.value)}
                        />
                    </Box>

                    <Box>
                        <Text as="div" size="2" weight="bold" mb="1">
                            {t('lbl_icon', 'Icon')}
                        </Text>
                        <Flex gap="2" align="center">
                            <Button
                                variant="outline"
                                disabled={readOnly}
                                onClick={() => setIconSelectorOpen(true)}
                                style={{flex: 1, justifyContent: 'flex-start'}}
                            >
                                {form.icon ? (
                                    <Flex gap="2" align="center">
                                        <CatalogIcon icon={form.icon} size={20}/>
                                        <span>{form.icon.split('/').pop()?.replace('.svg', '') ?? form.icon}</span>
                                    </Flex>
                                ) : (
                                    t('btn_select_icon', 'Select Icon')
                                )}
                            </Button>
                            {form.icon && !readOnly && (
                                <Button
                                    variant="soft"
                                    color="gray"
                                    onClick={() => update('icon', '')}
                                    title={t('btn_clear_icon', 'Clear icon')}
                                >
                                    <X size={14}/>
                                </Button>
                            )}
                        </Flex>
                    </Box>

                    <Flex gap="3" wrap="wrap">
                        <Box style={{flex: 1, minWidth: 240}}>
                            <Text as="div" size="2" weight="bold" mb="1">
                                {t('lbl_required_read_permission', 'Required read permission')}
                            </Text>
                            <TextField.Root
                                placeholder="PERM_X_READ"
                                value={form.requiredReadPermission}
                                disabled={readOnly}
                                onChange={(e) => update('requiredReadPermission', e.target.value)}
                            />
                        </Box>
                        <Box style={{flex: 1, minWidth: 240}}>
                            <Text as="div" size="2" weight="bold" mb="1">
                                {t('lbl_required_write_permission', 'Required write permission')}
                            </Text>
                            <TextField.Root
                                placeholder="PERM_X_WRITE"
                                value={form.requiredWritePermission}
                                disabled={readOnly}
                                onChange={(e) => update('requiredWritePermission', e.target.value)}
                            />
                        </Box>
                    </Flex>

                    <Box>
                        <Text as="div" size="2" weight="bold" mb="2">
                            {t('lbl_item_fields', 'Item fields')}
                        </Text>
                        <SectionItemFieldEditor
                            value={form.itemFields}
                            onChange={(next) => update('itemFields', next)}
                            allowSecretToggle={true}
                            readOnly={readOnly}
                        />
                    </Box>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <X size={16}/> {readOnly ? t('btn_close', 'Close') : t('btn_cancel', 'Cancel')}
                            </Button>
                        </Dialog.Close>
                        {!readOnly && (
                            <Button onClick={handleSave} disabled={!canSave}>
                                <Save size={16}/> {t('btn_save', 'Save')}
                            </Button>
                        )}
                    </Flex>
                </Flex>

                <IconSelectorDialog
                    open={iconSelectorOpen}
                    onOpenChange={setIconSelectorOpen}
                    t={t}
                    iconCategory={iconCategory}
                    setIconCategory={setIconCategory}
                    iconSearch={iconSearch}
                    setIconSearch={setIconSearch}
                    icon={form.icon}
                    setIcon={(val) => update('icon', val)}
                />
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default SectionCatalogEditor;
