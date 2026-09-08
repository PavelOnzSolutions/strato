import React, {useMemo} from 'react';
import {Badge, Box, Button, Card, Flex, ScrollArea, Text, Tooltip} from '@radix-ui/themes';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Plus} from 'lucide-react';

import {fetchWithAuth} from '../../../utils/api';
import {ISectionCatalogEntry} from '../../../models/section-catalog.model';
import {Flavor} from '../../../constants/flavors';
import {CatalogIcon} from '../../../components/system/CatalogIcon';

export interface SchemaCatalogPanelProps {
    flavor: Flavor;
    addedCatalogIds: string[];
    onAdd: (entry: ISectionCatalogEntry) => void;
}

const fetchCatalog = async (flavor: Flavor): Promise<ISectionCatalogEntry[]> => {
    const r = await fetchWithAuth(`/section-catalog?flavor=${flavor}`);
    if (!r.ok) throw new Error('Failed to fetch section catalog');
    return r.json();
};

interface GroupProps {
    title: string;
    entries: ISectionCatalogEntry[];
    addedCatalogIds: string[];
    onAdd: (entry: ISectionCatalogEntry) => void;
}

const CatalogRow: React.FC<{
    entry: ISectionCatalogEntry;
    added: boolean;
    onAdd: (entry: ISectionCatalogEntry) => void;
}> = ({entry, added, onAdd}) => {
    const {t} = useTranslation();

    return (
        <Tooltip content={entry.description ?? entry.displayName}>
            <Flex
                align="center"
                gap="2"
                px="2"
                py="1"
                style={{
                    borderRadius: 'var(--radius-2)',
                    border: '1px solid var(--gray-a4)',
                    background: 'var(--color-panel-translucent)',
                }}
            >
                <Box style={{flexShrink: 0, display: 'flex', alignItems: 'center'}}>
                    <CatalogIcon icon={entry.icon} size={20} alt={entry.displayName}/>
                </Box>
                <Flex direction="column" style={{flex: 1, minWidth: 0}}>
                    <Text size="2" weight="medium" truncate>
                        {entry.displayName}
                    </Text>
                    <Text size="1" color="gray" truncate>
                        {entry.sectionKey}
                    </Text>
                </Flex>
                {entry.system && (
                    <Badge color="gray" size="1" variant="soft">
                        {t('lbl_system', 'System')}
                    </Badge>
                )}
                {added ? (
                    <Badge color="green" size="1" variant="soft">
                        {t('lbl_added', 'Added')}
                    </Badge>
                ) : (
                    <Button size="1" variant="soft" onClick={() => onAdd(entry)}>
                        <Plus size={12}/> {t('btn_add', 'Add')}
                    </Button>
                )}
            </Flex>
        </Tooltip>
    );
};

const Group: React.FC<GroupProps> = ({title, entries, addedCatalogIds, onAdd}) => {
    const {t} = useTranslation();
    if (entries.length === 0) return null;
    return (
        <Flex direction="column" gap="2" mb="3">
            <Text size="1" color="gray" weight="bold" style={{textTransform: 'uppercase'}}>
                {title}
            </Text>
            <Flex direction="column" gap="1">
                {entries.map((entry) => (
                    <CatalogRow
                        key={entry.documentId}
                        entry={entry}
                        added={addedCatalogIds.includes(entry.documentId)}
                        onAdd={onAdd}
                    />
                ))}
            </Flex>
            {entries.length === 0 && (
                <Text size="1" color="gray">
                    {t('lbl_no_entries', 'No entries')}
                </Text>
            )}
        </Flex>
    );
};

export const SchemaCatalogPanel: React.FC<SchemaCatalogPanelProps> = ({
                                                                          flavor,
                                                                          addedCatalogIds,
                                                                          onAdd,
                                                                      }) => {
    const {t} = useTranslation();
    const {data: catalog, isLoading} = useQuery({
        queryKey: ['section-catalog', flavor],
        queryFn: () => fetchCatalog(flavor),
    });

    const [systemEntries, extensionEntries] = useMemo(() => {
        const list = catalog ?? [];
        const sorter = (a: ISectionCatalogEntry, b: ISectionCatalogEntry) =>
            a.displayName.localeCompare(b.displayName);
        const sys = list.filter((e) => e.system).sort(sorter);
        const ext = list.filter((e) => !e.system).sort(sorter);
        return [sys, ext];
    }, [catalog]);

    return (
        <Card size="2" style={{height: '100%'}}>
            <Flex direction="column" gap="2" style={{height: '100%'}}>
                <Text size="2" weight="bold">
                    {t('lbl_section_catalog', 'Section catalog')}
                </Text>
                {isLoading && (
                    <Text size="1" color="gray">
                        {t('lbl_loading', 'Loading...')}
                    </Text>
                )}
                <ScrollArea style={{flex: 1}}>
                    <Box pr="2">
                        <Group
                            title={t('lbl_system_sections', 'System')}
                            entries={systemEntries}
                            addedCatalogIds={addedCatalogIds}
                            onAdd={onAdd}
                        />
                        <Group
                            title={t('lbl_extension_sections', 'Extensions')}
                            entries={extensionEntries}
                            addedCatalogIds={addedCatalogIds}
                            onAdd={onAdd}
                        />
                        {!isLoading && (catalog?.length ?? 0) === 0 && (
                            <Text size="1" color="gray">
                                {t('lbl_no_catalog_entries', 'No catalog entries')}
                            </Text>
                        )}
                    </Box>
                </ScrollArea>
            </Flex>
        </Card>
    );
};

export default SchemaCatalogPanel;
