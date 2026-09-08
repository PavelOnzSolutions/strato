import React, {useEffect, useState} from 'react';
import {Badge, Box, Flex, Table, Text} from '@radix-ui/themes';
import {ChevronDown, ChevronRight} from 'lucide-react';
import {useTheme} from '../../../context/ThemeContext';
import {useTranslation} from 'react-i18next';
import {dataTypeToIcon} from "../../../utils/utils.ts";
import {DynamicIcon} from "lucide-react/dynamic";
import {TYPE_COLORS} from "../../../constants/colors.ts";
import {getTypeColor} from "../../../utils/color-utils.ts";

interface HierarchicalTableViewProps {
  data: any;
  selectedPath?: string;
  onPathSelect?: (path: string) => void;
}

interface TableRow {
  key: string;
  value: any;
  type: string;
  path: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export const HierarchicalTableView: React.FC<HierarchicalTableViewProps> = ({ 
  data, 
  selectedPath,
  onPathSelect 
}) => {
  const { appearance } = useTheme();
  const { t } = useTranslation();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['Configuration']));
  const [rows, setRows] = useState<TableRow[]>([]);

  // Build table rows from data
  useEffect(() => {
    const buildRows = (obj: any, parentPath: string = '', level: number = 0): TableRow[] => {
      const result: TableRow[] = [];
      
      if (obj === null || obj === undefined) {
        return result;
      }

      const type = Array.isArray(obj) ? 'array' : typeof obj;

      if (type === 'object' && !Array.isArray(obj)) {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = parentPath ? `${parentPath}.${key}` : key;
          const valueType = Array.isArray(value) ? 'array' : typeof value;
          const hasChildren = valueType === 'object' || valueType === 'array';
          const isExpanded = expandedPaths.has(currentPath);

          result.push({
            key,
            value,
            type: valueType,
            path: currentPath,
            level,
            hasChildren,
            isExpanded,
          });

          if (hasChildren && isExpanded) {
            result.push(...buildRows(value, currentPath, level + 1));
          }
        });
      } else if (type === 'array') {
        obj.forEach((item: any, idx: number) => {
          const key = `[${idx}]`;
          const currentPath = parentPath ? `${parentPath}.${key}` : key;
          const valueType = Array.isArray(item) ? 'array' : typeof item;
          const hasChildren = valueType === 'object' || valueType === 'array';
          const isExpanded = expandedPaths.has(currentPath);

          result.push({
            key,
            value: item,
            type: valueType,
            path: currentPath,
            level,
            hasChildren,
            isExpanded,
          });

          if (hasChildren && isExpanded) {
            result.push(...buildRows(item, currentPath, level + 1));
          }
        });
      }

      return result;
    };

    // Add root row
    const rootRow: TableRow = {
      key: 'Configuration',
      value: data,
      type: Array.isArray(data) ? 'array' : typeof data,
      path: 'Configuration',
      level: 0,
      hasChildren: true,
      isExpanded: expandedPaths.has('Configuration'),
    };

    const allRows = [rootRow];
    if (rootRow.isExpanded) {
      allRows.push(...buildRows(data, 'Configuration', 1));
    }

    setRows(allRows);
  }, [data, expandedPaths]);

  // Auto-expand to selected path
  useEffect(() => {
    if (selectedPath) {
      const pathParts = selectedPath.split('.');
      const newExpanded = new Set(expandedPaths);
      let currentPath = '';
      
      pathParts.forEach(part => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        newExpanded.add(currentPath);
      });

      setExpandedPaths(newExpanded);
    }
  }, [selectedPath]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleRowClick = (row: TableRow) => {
    if (row.hasChildren) {
      toggleExpand(row.path);
    }
    if (onPathSelect) {
      onPathSelect(row.path);
    }
  };


  const formatValue = (row: TableRow): string => {
    if (row.type === 'object') {
      const count = Object.keys(row.value || {}).length;
      return `{${count} fields}`;
    }
    if (row.type === 'array') {
      return `[${row.value?.length || 0} items]`;
    }
    if (row.type === 'string') {
      const str = String(row.value);
      return str.length > 100 ? str.substring(0, 100) + '...' : str;
    }
    return String(row.value);
  };

  const isSelected = (path: string) => selectedPath === path;

  return (
    <Box style={{ height: '100%', overflow: 'auto' }}>
      <Table.Root variant="surface" size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell style={{ width: '40%' }}>
              {t('lbl_key', 'Key')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: '15%' }}>
              {t('lbl_type', 'Type')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: '45%' }}>
              {t('lbl_value', 'Value')}
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row, idx) => (
            <Table.Row
              key={`${row.path}-${idx}`}
              style={{
                cursor: 'pointer',
                backgroundColor: isSelected(row.path) 
                  ? 'var(--accent-3)' 
                  : undefined,
              }}
              onClick={() => handleRowClick(row)}
            >
              <Table.Cell>
                <Flex 
                  align="center" 
                  gap="1" 
                  style={{ paddingLeft: `${row.level * 20}px` }}
                >
                  {row.hasChildren ? (
                    row.isExpanded ? (
                      <ChevronDown size={14} style={{ flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={14} style={{ flexShrink: 0 }} />
                    )
                  ) : (
                    <Box style={{ width: '14px', flexShrink: 0 }} />
                  )}
                  <Text 
                    size="2" 
                    weight={row.hasChildren ? 'bold' : 'regular'}
                    style={{ 
                      fontFamily: 'monospace',
                      color: isSelected(row.path) ? 'var(--accent-11)' : undefined,
                    }}
                  >
                    {row.key}
                  </Text>
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Badge color={getTypeColor(row.type) as any} size="1">
                  <DynamicIcon name={dataTypeToIcon(row.type.toLowerCase())} size={16} style={{ color: `var(--color-${TYPE_COLORS[row.type] || 'gray'}-300)` }} ></DynamicIcon>
                  {row.type}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text 
                  size="2" 
                  style={{ 
                    fontFamily: 'monospace',
                    wordBreak: 'break-word',
                    color: appearance === 'dark' ? '#aaa' : '#666',
                  }}
                >
                  {formatValue(row)}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};

export default HierarchicalTableView;
