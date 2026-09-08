import React, {useMemo, useState} from 'react';
import {Badge, Box, Button, ContextMenu, Dialog, Flex, IconButton, Text, TextField} from '@radix-ui/themes';
import {Plus, Search, Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {ConfigurationData, IConfigurationSchema} from '../../../models/configuration.model';
import {ISectionCatalogEntry} from '../../../models/section-catalog.model';
import {CatalogIcon} from '../../../components/system/CatalogIcon';

interface ConfigProviderSidebarProps {
    schema: IConfigurationSchema;
    catalogByDocId: Map<string, ISectionCatalogEntry>;
    data: ConfigurationData;
    selected: {sectionKey: string; itemName: string} | null;
    onSelect: (sectionKey: string, itemName: string) => void;
    onAddItem: (sectionKey: string) => void;
    onDeleteItem: (sectionKey: string, itemName: string) => void;
    locked: boolean;
    userHasReadPerm: (perm?: string | null) => boolean;
    userHasWritePerm: (perm?: string | null) => boolean;
}

export const ConfigProviderSidebar: React.FC<ConfigProviderSidebarProps> = ({
    schema,
    catalogByDocId,
    data,
    selected,
    onSelect,
    onAddItem,
    onDeleteItem,
    locked,
    userHasReadPerm,
    userHasWritePerm,
}) => {
    const {t} = useTranslation();
    const [search, setSearch] = useState('');
    const [pendingDelete, setPendingDelete] = useState<{sectionKey: string; itemName: string} | null>(null);

    const visibleSections = useMemo(() => {
        const out: Array<{
            section: typeof schema.sections[number];
            catalog: ISectionCatalogEntry;
        }> = [];
        for (const section of schema.sections ?? []) {
            const catalog = catalogByDocId.get(section.catalogEntryDocumentId);
            if (!catalog) continue;
            if (!userHasReadPerm(catalog.requiredReadPermission)) continue;
            out.push({section, catalog});
        }
        return out;
    }, [schema.sections, catalogByDocId, userHasReadPerm]);

    const term = search.trim().toLowerCase();

    return (
        <Box p="3" style={{height: '100%', overflowY: 'auto'}}>
            <Box mb="3">
                <TextField.Root
                    placeholder={t('ph_filter_items', 'Filter items...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                >
                    <TextField.Slot>
                        <Search size={14}/>
                    </TextField.Slot>
                </TextField.Root>
            </Box>

            <Flex direction="column" gap="3">
                {visibleSections.map(({section, catalog}) => {
                    const items = data[catalog.sectionKey] ?? {};
                    const itemNames = Object.keys(items).filter((n) =>
                        !term || n.toLowerCase().includes(term),
                    );
                    const canWrite = userHasWritePerm(catalog.requiredWritePermission);

                    return (
                        <Box key={`${section.catalogEntryDocumentId}-${catalog.sectionKey}`}>
                            <Flex align="center" gap="2" mb="1">
                                <CatalogIcon icon={catalog.icon} size={20} alt={catalog.displayName}/>
                                <Text size="2" weight="bold" style={{flex: 1}}>
                                    {catalog.displayName}
                                </Text>
                                <Badge color="gray" size="1" variant="soft">
                                    {Object.keys(items).length}
                                </Badge>
                                {!locked && canWrite && (
                                    <IconButton
                                        size="1"
                                        variant="ghost"
                                        color="green"
                                        title={t('btn_add_item', 'Add item')}
                                        onClick={() => onAddItem(catalog.sectionKey)}
                                        type="button"
                                    >
                                        <Plus size={14}/>
                                    </IconButton>
                                )}
                            </Flex>
                            <Flex direction="column" gap="1" style={{paddingLeft: 8}}>
                                {itemNames.length === 0 ? (
                                    <Text size="1" color="gray">
                                        {t('lbl_no_items', 'No items')}
                                    </Text>
                                ) : (
                                    itemNames.map((itemName) => {
                                        const isSelected =
                                            selected?.sectionKey === catalog.sectionKey
                                            && selected.itemName === itemName;
                                        const row = (
                                            <Flex
                                                key={itemName}
                                                align="center"
                                                gap="2"
                                                px="2"
                                                py="1"
                                                onClick={() => onSelect(catalog.sectionKey, itemName)}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-2)',
                                                    background: isSelected ? 'var(--accent-3)' : 'transparent',
                                                }}
                                            >
                                                <Text
                                                    size="2"
                                                    weight={isSelected ? 'bold' : 'regular'}
                                                    style={{flex: 1}}
                                                    truncate
                                                >
                                                    {itemName}
                                                </Text>
                                            </Flex>
                                        );
                                        if (locked || !canWrite) {
                                            return <React.Fragment key={itemName}>{row}</React.Fragment>;
                                        }
                                        return (
                                            <ContextMenu.Root key={itemName}>
                                                <ContextMenu.Trigger>{row}</ContextMenu.Trigger>
                                                <ContextMenu.Content>
                                                    <ContextMenu.Item
                                                        color="red"
                                                        onClick={() =>
                                                            setPendingDelete({
                                                                sectionKey: catalog.sectionKey,
                                                                itemName,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 size={14}/>
                                                        {t('btn_delete', 'Delete')}
                                                    </ContextMenu.Item>
                                                </ContextMenu.Content>
                                            </ContextMenu.Root>
                                        );
                                    })
                                )}
                            </Flex>
                        </Box>
                    );
                })}
            </Flex>

            <Dialog.Root
                open={!!pendingDelete}
                onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
            >
                <Dialog.Content maxWidth="420px">
                    <Dialog.Title>{t('title_confirm_delete', 'Delete item')}</Dialog.Title>
                    <Dialog.Description size="2" mb="3">
                        {t(
                            'msg_confirm_delete_item',
                            'Are you sure you want to delete "{{name}}"? This change is not saved until you click Save.',
                            {name: pendingDelete?.itemName ?? ''},
                        )}
                    </Dialog.Description>
                    <Flex gap="2" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" type="button">
                                {t('btn_cancel', 'Cancel')}
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button
                                color="red"
                                type="button"
                                onClick={() => {
                                    if (pendingDelete) {
                                        onDeleteItem(pendingDelete.sectionKey, pendingDelete.itemName);
                                    }
                                    setPendingDelete(null);
                                }}
                            >
                                {t('btn_delete', 'Delete')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>
    );
};

export default ConfigProviderSidebar;
