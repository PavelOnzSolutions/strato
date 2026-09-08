import React, {useState} from 'react';
import {Badge, Box, Checkbox, Flex, IconButton, Switch, Text, TextField, Tooltip} from '@radix-ui/themes';
import {ChevronDown, ChevronRight, Eye, EyeOff, Lock, Settings} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {ISectionCatalogEntry, ISectionItemField} from '../../../models/section-catalog.model';
import {ISchemaSection} from '../../../models/configuration.model';
import {SectionItemFieldEditor} from './SectionItemFieldEditor';
import {DynamicIcon} from "lucide-react/dynamic";
import {dataTypeToIcon, fieldTypeToDisplayType} from "../../../utils/utils.ts";
import {TYPE_COLORS} from "../../../constants/colors.ts";

export interface SchemaOverlayEditorProps {
    catalog: ISectionCatalogEntry;
    section: ISchemaSection;
    onChange: (next: ISchemaSection) => void;
}

const isNested = (f: ISectionItemField) =>
    f.type === 'OBJECT' || f.type === 'ARRAY_OF_OBJECT' || f.type === 'MAP_OF_OBJECT';

const buildPath = (parent: string, name: string): string =>
    parent.length === 0 ? name : `${parent}.${name}`;

/* ------------------------------ Foldable group ----------------------------- */

const FoldGroup: React.FC<{
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({title, icon, children, defaultOpen = true}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Box
            style={{
                border: '1px solid var(--gray-a4)',
                borderRadius: 'var(--radius-3)',
                background: 'var(--color-panel-translucent)',
            }}
        >
            <Flex
                align="center"
                gap="2"
                px="3"
                py="2"
                onClick={() => setOpen(!open)}
                style={{cursor: 'pointer', userSelect: 'none'}}
            >
                {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                {icon}
                <Text size="2" weight="bold">{title}</Text>
            </Flex>
            {open && (
                <Box px="3" pb="3">
                    {children}
                </Box>
            )}
        </Box>
    );
};

/* --------------------------- Field visibility tree ------------------------- */

interface VisibilityTreeProps {
    fields: ISectionItemField[];
    parentPath: string;
    disabledFieldPaths: string[];
    onToggle: (path: string, hidden: boolean) => void;
}

const VisibilityRow: React.FC<{
    field: ISectionItemField;
    path: string;
    hidden: boolean;
    onToggle: (path: string, hidden: boolean) => void;
    children?: React.ReactNode;
}> = ({field, path, hidden, onToggle, children}) => {
    const {t} = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const hasChildren = isNested(field) && (field.nestedFields?.length ?? 0) > 0;
    const isSecret = field.secret === true;

    const checkbox = (
        <Checkbox
            checked={!hidden}
            disabled={isSecret}
            onCheckedChange={(c) => onToggle(path, !c)}
        />
    );

    return (
        <Box>
            <Flex align="center" gap="2" py="1">
                {hasChildren ? (
                    <IconButton
                        size="1"
                        variant="ghost"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                    </IconButton>
                ) : (
                    <Box style={{width: 20}}/>
                )}
                {isSecret ? (
                    <Tooltip
                        content={t(
                            'msg_secret_visibility_locked',
                            'Catalog-secret fields cannot be hidden by overlay',
                        )}
                    >
                        <Flex align="center" gap="2">
                            {checkbox}
                            <Lock size={12} color="var(--orange-9)"/>
                        </Flex>
                    </Tooltip>
                ) : (
                    checkbox
                )}
                <Tooltip content={fieldTypeToDisplayType(field.type, field.secret)} style={{background: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-11)`, fontWeight: 'bold'}}>
                    <DynamicIcon name={dataTypeToIcon(field.type.toLowerCase())} size={16}
                                 style={{color: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-10)`}}></DynamicIcon>
                </Tooltip>
                <Text size="2">{field.displayName || field.name}</Text>
                {isSecret && (
                    <Badge color="orange" size="1" variant="soft">
                        {t('lbl_secret', 'Secret')}
                    </Badge>
                )}
            </Flex>
            {hasChildren && expanded && (
                <Box pl="4">{children}</Box>
            )}
        </Box>
    );
};

const VisibilityTree: React.FC<VisibilityTreeProps> = ({
                                                           fields,
                                                           parentPath,
                                                           disabledFieldPaths,
                                                           onToggle,
                                                       }) => {
    return (
        <Box>
            {fields.map((field) => {
                const path = buildPath(parentPath, field.name);
                const hidden = disabledFieldPaths.includes(path);
                return (
                    <VisibilityRow
                        key={path}
                        field={field}
                        path={path}
                        hidden={hidden}
                        onToggle={onToggle}
                    >
                        {isNested(field) && (field.nestedFields?.length ?? 0) > 0 && (
                            <VisibilityTree
                                fields={field.nestedFields!}
                                parentPath={path}
                                disabledFieldPaths={disabledFieldPaths}
                                onToggle={onToggle}
                            />
                        )}
                    </VisibilityRow>
                );
            })}
        </Box>
    );
};

/* ---------------------------- Field defaults tree -------------------------- */

interface DefaultsTreeProps {
    fields: ISectionItemField[];
    parentPath: string;
    depth?: number;
    fieldDefaults: Record<string, unknown>;
    onSetDefault: (path: string, value: unknown) => void;
    onClearDefault: (path: string) => void;
}

const stringifyDefault = (v: unknown): string => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
};

const DefaultsRowHoverStyle = {
    backgroundColor: 'var(--accent-a3)',
    borderRadius: 'var(--radius-2)',
    transition: 'background-color 120ms ease',
} as const;

const DefaultsBranchRow: React.FC<{
    field: ISectionItemField;
    depth: number;
}> = ({field, depth}) => {
    const [hovered, setHovered] = useState(false);

    return (
        <Flex
            align="center"
            gap="2"
            py="1"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                paddingLeft: `${depth * 16}px`,
                ...(hovered ? DefaultsRowHoverStyle : {}),
            }}
        >
            <Tooltip content={fieldTypeToDisplayType(field.type, field.secret)} style={{background: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-11)`, fontWeight: 'bold'}}>
                <DynamicIcon name={dataTypeToIcon(field.type.toLowerCase())} size={16}
                             style={{color: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-10)`}}></DynamicIcon>
            </Tooltip>
            <Text size="2" weight="medium">{field.displayName || field.name}</Text>
        </Flex>
    );
};

const DefaultsLeafRow: React.FC<{
    field: ISectionItemField;
    path: string;
    depth: number;
    overrideValue: unknown;
    hasOverride: boolean;
    onSetDefault: (path: string, value: unknown) => void;
    onClearDefault: (path: string) => void;
}> = ({field, path, depth, overrideValue, hasOverride, onSetDefault, onClearDefault}) => {
    const {t} = useTranslation();
    const isSecret = field.secret === true;
    const [hovered, setHovered] = useState(false);

    const emptyForType = (): unknown => {
        switch (field.type) {
            case 'STRING':
                return '';
            case 'NUMBER':
                return 0;
            case 'BOOLEAN':
                return false;
            case 'ARRAY_OF_STRING':
                return [] as string[];
            default:
                return null;
        }
    };

    const renderInput = () => {
        switch (field.type) {
            case 'STRING':
                return (
                    <TextField.Root
                        size="1"
                        value={typeof overrideValue === 'string' ? overrideValue : ''}
                        onChange={(e) => onSetDefault(path, e.target.value)}
                    />
                );
            case 'NUMBER':
                return (
                    <TextField.Root
                        size="1"
                        type="number"
                        value={
                            typeof overrideValue === 'number'
                                ? String(overrideValue)
                                : ''
                        }
                        onChange={(e) => {
                            const n = e.target.value === '' ? 0 : Number(e.target.value);
                            onSetDefault(path, n);
                        }}
                    />
                );
            case 'BOOLEAN':
                return (
                    <Switch
                        size="1"
                        checked={Boolean(overrideValue)}
                        onCheckedChange={(c) => onSetDefault(path, c)}
                    />
                );
            case 'ARRAY_OF_STRING':
                return (
                    <TextField.Root
                        size="1"
                        placeholder={t('ph_comma_separated', 'a, b, c')}
                        value={
                            Array.isArray(overrideValue)
                                ? (overrideValue as unknown[]).join(', ')
                                : ''
                        }
                        onChange={(e) =>
                            onSetDefault(
                                path,
                                e.target.value
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter((s) => s.length > 0),
                            )
                        }
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Flex
            align="center"
            gap="2"
            py="1"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: '100%',
                ...(hovered ? DefaultsRowHoverStyle : {}),
            }}
        >
            <Flex align="center" gap="2" style={{flex: 1, minWidth: 0, paddingLeft: `${depth * 16}px`}}>
                <Box style={{width: 20, flexShrink: 0}}/>
                <Text size="2" style={{minWidth: 180}}>
                    {field.displayName || field.name}
                </Text>

            </Flex>
            <Tooltip
                content={
                    isSecret
                        ? t(
                            'msg_secret_default_locked',
                            'Catalog-secret defaults cannot be overridden by overlay',
                        )
                        : t('lbl_override', 'Override')
                }
            >
                <Flex align="center" gap="1" style={{flexShrink: 0}}>
                    <Switch
                        size="1"
                        disabled={isSecret}
                        checked={hasOverride}
                        onCheckedChange={(c) => {
                            if (c) {
                                onSetDefault(path, emptyForType());
                            } else {
                                onClearDefault(path);
                            }
                        }}
                    />
                    <Text size="1" color="gray">
                        {t('lbl_override', 'Override')}
                    </Text>
                </Flex>
            </Tooltip>
            <Flex direction="row" align="baseline" style={{minWidth: 220, justifyContent: 'flex-end'}}>
                {hasOverride ? (
                    <Box style={{width: 220}}>{renderInput()}</Box>
                ) : (
                    <Text size="1" color="gray" style={{textAlign: 'right'}}>
                        {t('lbl_catalog_default', 'Default')}: <code>{stringifyDefault(field.defaultValue)}</code>
                    </Text>
                )}
            </Flex>
            <Flex direction="row" align="baseline" style={{minWidth: 24, justifyContent: 'flex-end'}}>
                <Tooltip content={fieldTypeToDisplayType(field.type, field.secret)} style={{background: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-11)`, fontWeight: 'bold'}}>
                    <DynamicIcon name={dataTypeToIcon(field.type.toLowerCase())} size={16}
                                 style={{color: `var(--${TYPE_COLORS[field.type.toLowerCase()] || 'gray'}-10)`}}></DynamicIcon>
                </Tooltip>
                {isSecret && (
                    <Badge color="orange" size="1" variant="soft">
                        {t('lbl_secret', 'Secret')}
                    </Badge>
                )}
            </Flex>
        </Flex>
    );
};

const DefaultsTree: React.FC<DefaultsTreeProps> = ({
                                                       fields,
                                                       parentPath,
                                                       depth = 0,
                                                       fieldDefaults,
                                                       onSetDefault,
                                                       onClearDefault,
                                                   }) => {
    return (
        <Box>
            {fields.map((field) => {
                const path = buildPath(parentPath, field.name);
                if (isNested(field)) {
                    return (
                        <Box key={path} pb="1">
                            <DefaultsBranchRow field={field} depth={depth}/>
                            {(field.nestedFields?.length ?? 0) > 0 && (
                                <DefaultsTree
                                    fields={field.nestedFields!}
                                    parentPath={path}
                                    depth={depth + 1}
                                    fieldDefaults={fieldDefaults}
                                    onSetDefault={onSetDefault}
                                    onClearDefault={onClearDefault}
                                />
                            )}
                        </Box>
                    );
                }
                const hasOverride = Object.prototype.hasOwnProperty.call(fieldDefaults, path);
                return (
                    <DefaultsLeafRow
                        key={path}
                        field={field}
                        path={path}
                        depth={depth}
                        overrideValue={fieldDefaults[path]}
                        hasOverride={hasOverride}
                        onSetDefault={onSetDefault}
                        onClearDefault={onClearDefault}
                    />
                );
            })}
        </Box>
    );
};

/* --------------------------------- Editor ---------------------------------- */

export const SchemaOverlayEditor: React.FC<SchemaOverlayEditorProps> = ({
                                                                            catalog,
                                                                            section,
                                                                            onChange,
                                                                        }) => {
    const {t} = useTranslation();

    const setDisabled = (path: string, hidden: boolean) => {
        const cur = section.disabledFieldPaths ?? [];
        const next = hidden
            ? Array.from(new Set([...cur, path]))
            : cur.filter((p) => p !== path);
        onChange({...section, disabledFieldPaths: next});
    };

    const setDefault = (path: string, value: unknown) => {
        const next = {...(section.fieldDefaults ?? {}), [path]: value};
        onChange({...section, fieldDefaults: next});
    };

    const clearDefault = (path: string) => {
        const next = {...(section.fieldDefaults ?? {})};
        delete next[path];
        onChange({...section, fieldDefaults: next});
    };

    return (
        <Flex direction="column" gap="2">
            <FoldGroup
                title={t('lbl_field_visibility', 'Field visibility')}
                icon={<Eye size={14}/>}
                defaultOpen={true}
            >
                {catalog.itemFields.length === 0 ? (
                    <Text size="1" color="gray">{t('lbl_no_fields', 'No fields')}</Text>
                ) : (
                    <VisibilityTree
                        fields={catalog.itemFields}
                        parentPath=""
                        disabledFieldPaths={section.disabledFieldPaths ?? []}
                        onToggle={setDisabled}
                    />
                )}
            </FoldGroup>

            <FoldGroup
                title={t('lbl_field_defaults', 'Field defaults')}
                icon={<EyeOff size={14}/>}
                defaultOpen={false}
            >
                {catalog.itemFields.length === 0 ? (
                    <Text size="1" color="gray">{t('lbl_no_fields', 'No fields')}</Text>
                ) : (
                    <DefaultsTree
                        fields={catalog.itemFields}
                        parentPath=""
                        fieldDefaults={section.fieldDefaults ?? {}}
                        onSetDefault={setDefault}
                        onClearDefault={clearDefault}
                    />
                )}
            </FoldGroup>

            <FoldGroup
                title={t('lbl_custom_fields', 'Custom fields')}
                icon={<Settings size={14}/>}
                defaultOpen={false}
            >
                <SectionItemFieldEditor
                    value={section.customFields ?? []}
                    onChange={(cf) => onChange({...section, customFields: cf})}
                    allowSecretToggle={true}
                />
            </FoldGroup>
        </Flex>
    );
};

export default SchemaOverlayEditor;
