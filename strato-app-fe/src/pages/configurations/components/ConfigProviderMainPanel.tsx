import React, {useState} from 'react';
import {Box, Button, Card, Flex, Text} from '@radix-ui/themes';
import {ChevronRight, ChevronsDownUp, ChevronsUpDown} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {ISectionItemField} from '../../../models/section-catalog.model';
import {ItemForm} from './ItemForm';

interface ConfigProviderMainPanelProps {
    selected: {sectionKey: string; itemName: string} | null;
    effectiveFields: ISectionItemField[];
    data: Record<string, unknown> | undefined;
    onDataChange: (next: Record<string, unknown>) => void;
    locked: boolean;
}

export const ConfigProviderMainPanel: React.FC<ConfigProviderMainPanelProps> = ({
    selected,
    effectiveFields,
    data,
    onDataChange,
    locked,
}) => {
    const {t} = useTranslation();

    // Set of EXPANDED top-level field names. Empty = everything collapsed (the default).
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    // Reset to all-collapsed whenever the selected item changes (adjust-state-during-render
    // pattern, so the new item renders collapsed without a flash).
    const selectionKey = selected ? `${selected.sectionKey}/${selected.itemName}` : '';
    const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
    if (selectionKey !== prevSelectionKey) {
        setPrevSelectionKey(selectionKey);
        setExpandedFields(new Set());
    }

    if (!selected) {
        return (
            <Flex align="center" justify="center" style={{height: '100%'}}>
                <Text color="gray" size="2">
                    {t('msg_select_or_add_item', 'Select or add an item from the left.')}
                </Text>
            </Flex>
        );
    }

    const toggleField = (name: string) =>
        setExpandedFields((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });

    const collapseAll = () => setExpandedFields(new Set());
    const expandAll = () => setExpandedFields(new Set(effectiveFields.map((f) => f.name)));

    return (
        <Card size="2">
            <Flex align="center" gap="1" mb="3">
                <Text size="4" weight="bold" color="gray">{selected.sectionKey}</Text>
                <ChevronRight size={14} color="var(--gray-10)"/>
                <Text size="4" weight="bold">{selected.itemName}</Text>
                {effectiveFields.length > 0 && (
                    <Flex gap="2" style={{marginLeft: 'auto'}}>
                        <Button size="1" variant="soft" color="gray" onClick={collapseAll} type="button">
                            <ChevronsDownUp size={14}/> {t('btn_collapse_all', 'Collapse all')}
                        </Button>
                        <Button size="1" variant="soft" color="gray" onClick={expandAll} type="button">
                            <ChevronsUpDown size={14}/> {t('btn_expand_all', 'Expand all')}
                        </Button>
                    </Flex>
                )}
            </Flex>
            <Box>
                <ItemForm
                    effectiveFields={effectiveFields}
                    value={data ?? {}}
                    onChange={onDataChange}
                    locked={locked}
                    expandedFields={expandedFields}
                    onToggleField={toggleField}
                />
            </Box>
        </Card>
    );
};

export default ConfigProviderMainPanel;
