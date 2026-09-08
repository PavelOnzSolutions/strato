import React, {useEffect, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  Select,
  Separator,
  Switch,
  Text,
  Tooltip
} from '@radix-ui/themes';
import {ArrowLeft, HelpCircle} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {DiffEditor} from '@monaco-editor/react';
import {useTheme} from '../../../../context/ThemeContext';
import {fetchWithAuth} from '../../../../utils/api';
import {IConfiguration} from '../../../../models/configuration.model';
import ConfigDiffD3 from '../ConfigDiffD3.tsx';
import {ConfigComparatorHelp} from '../../../documentation/ConfigComparatorHelp';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent';

interface CompareConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: IConfiguration | undefined;
}

const fetchConfigurationVersions = async (documentId: string): Promise<IConfiguration[]> => {
  const response = await fetchWithAuth(`/configurations/versions/${documentId}`);
  if (!response.ok) throw new Error('Failed to fetch configuration versions');
  return response.json();
};

const fetchAllConfigurations = async (): Promise<IConfiguration[]> => {
  const response = await fetchWithAuth(`/configurations`);
  if (!response.ok) throw new Error('Failed to fetch configurations');
  return response.json();
};

// Flatten an object to a path->value map for visual diff
const flatten = (obj: any, prefix = ''): Record<string, any> => {
  const out: Record<string, any> = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object') {
    out[prefix || ''] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const path = prefix ? `${prefix}[${i}]` : `[${i}]`;
      Object.assign(out, flatten(v, path));
    });
    return out;
  }
  Object.keys(obj).forEach((k) => {
    const val = obj[k];
    const path = prefix ? `${prefix}.${k}` : k;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flatten(val, path));
    } else {
      out[path] = val;
    }
  });
  return out;
};

const computeDiff = (left: any, right: any) => {
  const l = flatten(left || {});
  const r = flatten(right || {});
  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ key: string; left: any; right: any }> = [];

  const allKeys = new Set([...Object.keys(l), ...Object.keys(r)]);
  allKeys.forEach((k) => {
    const lv = l[k];
    const rv = r[k];
    if (!(k in l)) added.push(k);
    else if (!(k in r)) removed.push(k);
    else if (JSON.stringify(lv) !== JSON.stringify(rv)) changed.push({ key: k, left: lv, right: rv });
  });
  return { added, removed, changed };
};

const formatVersionOption = (v: IConfiguration) => {
  const author = (v as any).createdBy || '-';
  const dateRaw = (v as any).createdDate || null;
  const dateStr = dateRaw ? new Date(dateRaw).toLocaleString() : '-';
  return `${author} - ${dateStr}`;
};

export const CompareConfigDialog: React.FC<CompareConfigDialogProps> = ({ open, onOpenChange, currentConfig }) => {
  const { t } = useTranslation();
  const { appearance, codeFont } = useTheme();
  const [compareTargetConfigId, setCompareTargetConfigId] = useState<string | null>(null);
  const [compareTargetVersionIndex, setCompareTargetVersionIndex] = useState<number | null>(null);
  const [compareViewMode, setCompareViewMode] = useState<'visual' | 'monaco'>('visual');
  const [hideUnchanged, setHideUnchanged] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Fetch all configurations and filter by same schema for comparison list
  const { data: allConfigurations } = useQuery({
    queryKey: ['all-configurations-for-compare'],
    queryFn: fetchAllConfigurations,
    enabled: open,
  });

  const comparableConfigurations = useMemo(() => {
    if (!allConfigurations || !currentConfig?.schemaId) return [] as IConfiguration[];
    return allConfigurations
      .filter(c => c.id !== currentConfig.id && c.schemaId === currentConfig.schemaId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allConfigurations, currentConfig?.id, currentConfig?.schemaId]);

  const selectedRightConfig = useMemo(() => {
    if (!compareTargetConfigId) return null as IConfiguration | null;
    return comparableConfigurations.find(c => c.id === compareTargetConfigId) || null;
  }, [compareTargetConfigId, comparableConfigurations]);

  // Reset the selected right version when the target configuration changes
  useEffect(() => {
    setCompareTargetVersionIndex(null);
  }, [compareTargetConfigId]);

  // Load versions for the selected right configuration
  const { data: rightVersions } = useQuery({
    queryKey: ['configuration-versions', selectedRightConfig?.documentId, 'right'],
    queryFn: () => fetchConfigurationVersions(selectedRightConfig!.documentId!),
    enabled: !!selectedRightConfig?.documentId && open,
    select: (data) => [...data].sort((a, b) => (a.version || 0) - (b.version || 0)),
  });

  // Default to the latest version on the right when available
  useEffect(() => {
    if (rightVersions && rightVersions.length > 0 && compareTargetVersionIndex === null) {
      setCompareTargetVersionIndex(rightVersions.length - 1);
    }
  }, [rightVersions, compareTargetVersionIndex]);

  const rightData = useMemo(() => {
    if (rightVersions && compareTargetVersionIndex != null) {
      return rightVersions[compareTargetVersionIndex]?.data ?? {};
    }
    return selectedRightConfig?.data ?? {};
  }, [rightVersions, compareTargetVersionIndex, selectedRightConfig]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="4" style={{ maxWidth: '95vw', width: '95vw', maxHeight: '95vh', height: '95vh' }}>
        <Flex direction="column" gap="3" style={{ height: '90vh' }}>
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <Dialog.Title size="6">{t('title_compare_configurations', 'Compare configurations')}
                <Tooltip content={t('btn_help', 'Help')}>
                  <IconButton variant="ghost" color="sky" onClick={() => setHelpOpen(true)} size="2" style={{ marginLeft: 'auto' }}>
                    <HelpCircle size={18} />
                  </IconButton>
                </Tooltip>
              </Dialog.Title>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <ArrowLeft size={16} /> {t('btn_close', 'Close')}
              </Button>
            </Dialog.Close>
          </Flex>
          <Separator size="4" />
          <Flex gap="3" align="center" wrap="wrap">
            <Badge color="purple">{t('lbl_left', 'Left')}</Badge>
            <Text>{t('lbl_current_version', 'Current version')} {currentConfig?.version != null ? `(v${currentConfig.version})` : ''}</Text>
            <Separator orientation="vertical" />
            <Badge color="indigo">{t('lbl_right', 'Right')}</Badge>
            <Select.Root
              value={compareTargetConfigId ?? ''}
              onValueChange={(val) => setCompareTargetConfigId(val === '' ? null : val)}
            >
              <Select.Trigger style={{ minWidth: 360 }} placeholder={t('ph_select_target_configuration', 'Select target configuration')} />
              <Select.Content>
                {comparableConfigurations?.map((c) => (
                  <Select.Item key={c.id} value={c.id}>
                    {c.name}
                  </Select.Item>
                ))}
                {(!comparableConfigurations || comparableConfigurations.length === 0) && (
                  <Select.Item disabled value="__none__">{t('lbl_no_compatible_configs', 'No configurations with the same schema')}</Select.Item>
                )}
              </Select.Content>
            </Select.Root>
            {selectedRightConfig && (
              <Select.Root
                value={compareTargetVersionIndex !== null ? String(compareTargetVersionIndex) : ''}
                onValueChange={(val) => setCompareTargetVersionIndex(val === '' ? null : parseInt(val))}
              >
                <Select.Trigger style={{ minWidth: 260 }} placeholder={t('ph_select_target_version', 'Select target version')} />
                <Select.Content>
                  {rightVersions?.map((v, idx) => (
                    <Select.Item key={idx} value={String(idx)}>
                      <Badge color="purple" mr="2">v{v.version}</Badge>{` ${formatVersionOption(v)}`}
                    </Select.Item>
                  ))}
                  {(!rightVersions || rightVersions.length === 0) && (
                    <Select.Item disabled value="__none__">{t('lbl_no_versions', 'No versions found')}</Select.Item>
                  )}
                </Select.Content>
              </Select.Root>
            )}
            <Box style={{ marginLeft: 'auto' }}>
              <Flex gap="4" align="center">
                {compareViewMode === 'visual' && (
                  <Flex gap="2" align="center">
                    <Text size="2">{t('lbl_hide_unchanged', 'Hide unchanged')}</Text>
                    <Switch checked={hideUnchanged} onCheckedChange={setHideUnchanged} />
                  </Flex>
                )}
                <SegmentedControl.Root value={compareViewMode} onValueChange={(val) => setCompareViewMode(val as any)}>
                  <SegmentedControl.Item value="visual">{t('tab_visual', 'Visual')}</SegmentedControl.Item>
                  <SegmentedControl.Item value="monaco">{t('tab_monaco', 'JSON')}</SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>
            </Box>
          </Flex>

          <Box style={{ flex: 1, border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)', overflow: 'hidden' }}>
            {compareViewMode === 'monaco' ? (
              <DiffEditor
                height="100%"
                language="json"
                original={JSON.stringify((currentConfig?.data) ?? {}, null, 2)}
                modified={JSON.stringify(rightData as any, null, 2)}
                theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  renderSideBySide: true,
                  readOnly: true,
                  automaticLayout: true,
                  minimap: { enabled: false },
                  fontFamily: codeFont,
                  fontLigatures: true
                }}
              />
            ) : (
              <Box p="3" style={{ height: '100%', overflow: 'hidden' }}>
                {(() => {
                  const right = rightData;
                  const d = computeDiff(currentConfig?.data, right);
                  return (
                    <Flex direction="column" gap="3" style={{ height: '100%' }}>
                      <Flex gap="3" align="center">
                        <Badge color="green">{t('lbl_added', 'Added')}: {d.added.length}</Badge>
                        <Badge color="red">{t('lbl_removed', 'Removed')}: {d.removed.length}</Badge>
                        <Badge color="amber">{t('lbl_changed', 'Changed')}: {d.changed.length}</Badge>
                      </Flex>
                      <Separator />
                      <Box style={{ flex: 1, minHeight: 360 }}>
                        <ConfigDiffD3 left={(currentConfig?.data) ?? {}} right={right ?? {}} hideUnchanged={hideUnchanged} />
                      </Box>
                    </Flex>
                  );
                })()}
              </Box>
            )}
          </Box>
        </Flex>
      </Dialog.Content>

      <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
        <DraggableDialogContent maxWidth="900px" maxHeight="85vh" title={t('title_config_comparator_help', 'Configuration Comparator – Help')}>
          <Box style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
            <ConfigComparatorHelp hideTitle />
          </Box>
        </DraggableDialogContent>
      </Dialog.Root>
    </Dialog.Root>
  );
};
