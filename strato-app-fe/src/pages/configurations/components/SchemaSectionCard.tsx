import React, {useState} from 'react';
import {Badge, Box, Card, Code, Flex, IconButton, Text, Tooltip} from '@radix-ui/themes';
import {Ban, ChevronDown, ChevronRight, ChevronUp, Cog, ReplaceIcon, User2Icon, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {ISectionCatalogEntry} from '../../../models/section-catalog.model';
import {ISchemaSection} from '../../../models/configuration.model';
import {SchemaOverlayEditor} from './SchemaOverlayEditor';
import {CatalogIcon} from '../../../components/system/CatalogIcon';

export interface SchemaSectionCardProps {
    catalog: ISectionCatalogEntry;
    section: ISchemaSection;
    onChange: (next: ISchemaSection) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

export const SchemaSectionCard: React.FC<SchemaSectionCardProps> = ({
                                                                        catalog,
                                                                        section,
                                                                        onChange,
                                                                        onRemove,
                                                                        onMoveUp,
                                                                        onMoveDown,
                                                                    }) => {
    const {t} = useTranslation();
    const [expanded, setExpanded] = useState(true);

    const disabledCount = section.disabledFieldPaths?.length ?? 0;
    const overrideCount = Object.keys(section.fieldDefaults ?? {}).length;
    const customCount = section.customFields?.length ?? 0;

    return (
        <Card size="2">
            <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                    <IconButton
                        size="1"
                        variant="ghost"
                        onClick={() => setExpanded(!expanded)}
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </IconButton>
                    <CatalogIcon icon={catalog.icon} size={20} alt={catalog.displayName}/>
                    <Text weight="bold">{catalog.displayName}</Text>
                    <Code size="1" color="gold">{catalog.sectionKey}</Code>
                    {catalog.system && (
                        <Badge color="amber" size="1" variant="soft">
                            <Cog size={12}/>
                            {t('lbl_system', 'System')}
                        </Badge>
                    )}
                    {disabledCount > 0 && (
                        <Tooltip content={t('tt_disabled_fields', 'Hidden field paths')}>
                            <Badge color="amber" size="1" variant="soft">
                                <Ban size={12}/>
                                {t('lbl_hidden', 'Hidden')}: {disabledCount}
                            </Badge>
                        </Tooltip>
                    )}
                    {overrideCount > 0 && (
                        <Tooltip content={t('tt_overridden_defaults', 'Overridden defaults')}>
                            <Badge color="teal" size="1" variant="soft">
                                <ReplaceIcon size={12}/>
                                {t('lbl_overrides', 'Overrides')}: {overrideCount}
                            </Badge>
                        </Tooltip>
                    )}
                    {customCount > 0 && (
                        <Tooltip content={t('tt_custom_fields', 'Custom (overlay) fields')}>
                            <Badge color="violet" size="1" variant="soft">
                                <User2Icon size={12}/>
                                {t('lbl_custom', 'Custom')}: {customCount}
                            </Badge>
                        </Tooltip>
                    )}
                    <Box style={{flex: 1}}/>
                    <Tooltip content={t('btn_move_up', 'Move up')}>
                        <IconButton size="1" variant="soft" onClick={onMoveUp}>
                            <ChevronUp size={14}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip content={t('btn_move_down', 'Move down')}>
                        <IconButton size="1" variant="soft" onClick={onMoveDown}>
                            <ChevronDown size={14}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip content={t('btn_remove', 'Remove')}>
                        <IconButton size="1" variant="soft" color="red" onClick={onRemove}>
                            <X size={14}/>
                        </IconButton>
                    </Tooltip>
                </Flex>

                {expanded && (
                    <Box>
                        <SchemaOverlayEditor
                            catalog={catalog}
                            section={section}
                            onChange={onChange}
                        />
                    </Box>
                )}
            </Flex>
        </Card>
    );
};

export default SchemaSectionCard;
