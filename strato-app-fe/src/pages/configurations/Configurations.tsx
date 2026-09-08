import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Code,
  ContextMenu,
  Dialog,
  Flex,
  Progress,
  Select,
  Table,
  Text,
  TextField, Tooltip
} from '@radix-ui/themes';
import {useToolbar} from '../../context/ToolbarContext';
import {
  Clock,
  Copy,
  DoorOpen,
  Download,
  Edit,
  Eye,
  HelpCircle,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Trash2, Unlock,
  Upload
} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchWithAuth} from '../../utils/api';
import {useToast} from '../../context/ToastContext';
import {IConfiguration} from '../../models/configuration.model';
import {useTranslation} from 'react-i18next';
import {DiffEditor} from '@monaco-editor/react';
import {useTheme} from '../../context/ThemeContext';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent.tsx';
import {CloneDialog} from './components/modals/CloneDialog.tsx';
import {NewConfigurationDialog} from './components/modals/NewConfigurationDialog.tsx';
import ConfigurationsHelp from '../documentation/ConfigurationsHelp.tsx';
import {formatVersionOption, stringifyContent} from "../../utils/utils.ts";
import {fetchConfigurations, deleteConfiguration, cloneConfiguration, fetchSchemas} from './api.ts';
import {useCanWrite} from '../../components/permissions/WriteGuard';

const Configurations = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<IConfiguration | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyConfigName, setHistoryConfigName] = useState<string | undefined>(undefined);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedLeftVersionIndex, setSelectedLeftVersionIndex] = useState<number | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [newConfigDialogOpen, setNewConfigDialogOpen] = useState(false);
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {showToast} = useToast();
  const queryClient = useQueryClient();
  const {appearance, codeFont} = useTheme();
  const canWrite = useCanWrite('PERM_CONFIG_PROVIDER_WRITE');

  const {data: configurations, isLoading, refetch} = useQuery({
    queryKey: ['configurations', searchTerm],
    queryFn: () => fetchConfigurations(searchTerm),
  });

  const {data: schemas} = useQuery({
    queryKey: ['configuration-schemas-lookup'],
    queryFn: fetchSchemas,
  });

  const schemaMap = useMemo(() => {
    const map = new Map<string, string>();
    schemas?.forEach(s => map.set(s.id || '', s.name));
    return map;
  }, [schemas]);

  const deleteMutation = useMutation({
    mutationFn: deleteConfiguration,
    onSuccess: () => {
      showToast('Configuration deleted successfully', 'success');
      queryClient.invalidateQueries({queryKey: ['configurations']});
    },
    onError: () => showToast('Failed to delete configuration', 'error'),
  });

  const cloneMutation = useMutation({
    mutationFn: ({id, name}: { id: string, name: string }) => cloneConfiguration(id, name),
    onSuccess: (newConfig) => {
      showToast('Configuration cloned successfully', 'success');
      queryClient.invalidateQueries({queryKey: ['configurations']});
      setCloneDialogOpen(false);
      navigate(`/configurations/maps/${newConfig.id}/provider-view`);
    },
    onError: () => showToast('Failed to clone configuration', 'error'),
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && configurations) setSelectedIds(configurations.map(c => c.documentId));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
  };

  const confirmDelete = async () => {
    for (const id of selectedIds) await deleteMutation.mutateAsync(id);
    setSelectedIds([]);
    setDeleteDialogOpen(false);
  };

  const allSelected = configurations && configurations.length > 0 && selectedIds.length === configurations.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < (configurations?.length || 0);

  usePageTitle(t('ptitle_configurations', 'Configurations'));

  const handleExportSingle = (c: IConfiguration) => {
    const json = JSON.stringify(c, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.name}.config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBatch = async () => {
    if (selectedIds.length === 0) return;
    const r = await fetchWithAuth('/configurations/export-batch', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(selectedIds),
    });
    if (!r.ok) {
      showToast(t('msg_export_error', 'Export failed'), 'error');
      return;
    }
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `configurations-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useToolbar([
    {
      id: 'new',
      label: t('btn_new', 'New'),
      icon: Plus,
      onClick: () => setNewConfigDialogOpen(true),
      variant: 'solid',
      disabled: !canWrite,
    },
    {
      id: 'import',
      label: t('btn_import', 'Import'),
      icon: Upload,
      onClick: () => navigate('/configurations/maps/import'),
      disabled: !canWrite,
    },
    ...(selectedIds.length > 0 ? [{
      id: 'export-selected',
      label: t('btn_export_selected', 'Export selected'),
      icon: Download,
      onClick: handleExportBatch
    }] : []),
    {
      id: 'refresh',
      label: t('btn_refresh', 'Refresh'),
      icon: RefreshCw,
      onClick: () => refetch(),
      isLoading: isLoading
    },
    {id: 'help', label: t('btn_help', 'Help'), icon: HelpCircle, onClick: () => setHelpDialogOpen(true), color: 'sky'},
  ]);

  const loadVersions = async (docId?: string, name?: string) => {
    if (!docId) return;
    try {
      setHistoryLoading(true);
      setHistoryConfigName(name);
      const response = await fetchWithAuth(`/configurations/versions/${docId}`);
      if (!response.ok) throw new Error('Failed to load versions');
      const data = await response.json();
      const sorted = [...data].sort((a, b) => (a.version || 0) - (b.version || 0));
      setVersions(sorted);
      setSelectedLeftVersionIndex(sorted.length >= 2 ? sorted.length - 2 : 0);
      setHistoryDialogOpen(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Card size="4" className="w-full shadow-lg">
      <Flex mb="4" gap="3" align="center">
        <Box style={{width: 300}}>
          <TextField.Root
            placeholder={t('ph_search_configurations', 'Search configurations...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          >
            <TextField.Slot><Search size={16}/></TextField.Slot>
          </TextField.Root>
        </Box>
      </Flex>

      {isLoading && <Progress className="mb-4"/>}

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>
              <Checkbox checked={allSelected}
                        onCheckedChange={handleSelectAll} {...(someSelected && {'data-state': 'indeterminate'})} />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('thead_name', 'Name')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('thead_schema', 'Schema')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('thead_version', 'Version')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('thead_doc_id', 'Document ID')}</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {configurations?.map((config) => (
            <ContextMenu.Root key={config.id}>
              <ContextMenu.Trigger>
                <Table.Row className="hover:bg-(--accent-2)"
                           onClick={() => navigate(`/configurations/maps/${config.id}/provider-view`)}>
                  <Table.Cell>
                    <Checkbox checked={selectedIds.includes(config.id)}
                              onCheckedChange={(checked) => handleSelectOne(config.id, checked === true)}/>
                  </Table.Cell>
                  <Table.RowHeaderCell>
                    <Flex className="gap-2">
                      {config.locked ? (
                        <Tooltip content="Locked">
                          <Lock color='tomato' className="h-4 w-4"/>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Unlocked">
                          <Unlock color='green' className="h-4 w-4"/>
                        </Tooltip>
                      )
                      }
                      <Text weight="medium">{config.name}</Text>
                    </Flex>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Badge color="blue">{schemaMap.get(config.schemaId) || 'Unknown Schema'}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant="outline" size="1" radius="full">{config.version || '-'}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Code variant="outline" size="2">{config.documentId || '-'}</Code>
                  </Table.Cell>
                </Table.Row>
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Item onClick={() => navigate(`/configurations/maps/${config.id}/provider-view`)}>
                  <Eye size={16}/> <b>{t('mit_provider_view', 'Edit in Provider View')}</b>
                </ContextMenu.Item>
                <ContextMenu.Separator/>
                <ContextMenu.Item
                  disabled
                  onClick={() => navigate(`/configurations/maps/${config.id}`)}
                >
                  <Edit size={16}/> <b>{t('mit_edit_json', 'Edit JSON')}</b>
                </ContextMenu.Item>
                <ContextMenu.Item disabled={!canWrite} onClick={() => {
                  setCloneTarget(config);
                  setCloneName(`${config.name} (Copy)`);
                  setCloneDialogOpen(true);
                }}>
                  <Copy size={16}/> <b>{t('mit_clone', 'Clone')}</b>
                </ContextMenu.Item>
                <ContextMenu.Item onClick={() => handleExportSingle(config)}>
                  <Download size={16}/> <b>{t('mit_export', 'Export')}</b>
                </ContextMenu.Item>
                <ContextMenu.Separator/>
                <ContextMenu.Item onClick={() => loadVersions(config.documentId, config.name)}>
                  <Clock size={16}/> <b>{t('mit_history', 'Version History')}</b>
                </ContextMenu.Item>
                <ContextMenu.Separator/>
                <ContextMenu.Item color="ruby" disabled={!canWrite} onClick={() => {
                  setSelectedIds([config.documentId]);
                  setDeleteDialogOpen(true);
                }}>
                  <Trash2 size={16}/> <b>{t('mit_delete', 'Delete')}</b>
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          ))}
        </Table.Body>
      </Table.Root>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DraggableDialogContent maxWidth="450px" title={t('lbl_delete_configurations', 'Delete Configurations')}>
          <Text size="2"
                mb="4">{t('lbl_confirm_delete_configurations', `Are you sure you want to delete ${selectedIds.length} selected configuration(s)?`)}</Text>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close><Button variant="soft" color="gray">{t('btn_back', 'Back')}</Button></Dialog.Close>
            <Button variant="solid" color="red" onClick={confirmDelete} disabled={!canWrite}>{t('btn_delete', 'Delete')} lo</Button>
          </Flex>
        </DraggableDialogContent>
      </Dialog.Root>

      <CloneDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        name={cloneName}
        onNameChange={setCloneName}
        onConfirm={() => {
          if (cloneTarget && cloneName.trim()) {
            cloneMutation.mutate({id: cloneTarget.id, name: cloneName.trim()});
          }
        }}
        isPending={cloneMutation.isPending}
      />

      <NewConfigurationDialog
        open={newConfigDialogOpen}
        onOpenChange={setNewConfigDialogOpen}
      />

      <Dialog.Root open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <Dialog.Content style={{maxWidth: '90vw', height: '90vh', display: 'flex', flexDirection: 'column'}}>
          <Dialog.Title>{t('dlg_version_history_title', 'Version History')}{historyConfigName ? ` - ${historyConfigName}` : ''}</Dialog.Title>
          {historyLoading && <Progress className="mb-4"/>}

          {!historyLoading && versions && (
            <Flex direction="column" gap="3" style={{flex: 1, overflow: 'hidden'}}>
              <Box>
                <Text size="2" mb="1" weight="bold"
                      as="div">{t('lbl_select_version_to_compare', 'Select version to compare')}</Text>
                <Select.Root
                  value={selectedLeftVersionIndex !== null ? String(selectedLeftVersionIndex) : ''}
                  onValueChange={(val) => setSelectedLeftVersionIndex(val === '' ? null : parseInt(val))}
                >
                  <Select.Trigger placeholder={t('ph_select_version', 'Select a version...')} style={{width: 500}}/>
                  <Select.Content>
                    {versions.map((v, idx) => (
                      <Select.Item key={idx} value={String(idx)}>{formatVersionOption(v)}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>

              {versions.length === 0 && (
                <Flex align="center" justify="center" style={{flex: 1}}>
                  <Text color="gray">{t('lbl_no_versions_found', 'No versions found')}</Text>
                </Flex>
              )}

              {versions.length > 0 && (
                <Flex direction="column" gap="2" style={{
                  flex: 1,
                  border: '1px solid var(--gray-6)',
                  borderRadius: 'var(--radius-2)',
                  overflow: 'hidden'
                }}>
                  <Flex gap="3" p="2" wrap="wrap" align="center">
                    <Badge color="gray"
                           variant="soft">{t('lbl_left', 'Left')}: {selectedLeftVersionIndex !== null ? formatVersionOption(versions[selectedLeftVersionIndex]) : '-'}</Badge>
                    <Badge color="blue"
                           variant="soft">{t('lbl_right_latest', 'Right (Latest)')}: {formatVersionOption(versions[versions.length - 1])}</Badge>
                  </Flex>
                  <div style={{flex: 1}}>
                    <DiffEditor
                      original={selectedLeftVersionIndex !== null ? stringifyContent(versions[selectedLeftVersionIndex]) : ''}
                      modified={stringifyContent(versions[versions.length - 1])}
                      language="json"
                      theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        readOnly: true,
                        minimap: {enabled: false},
                        renderSideBySide: true,
                        fontFamily: codeFont,
                        fontLigatures: true
                      }}
                    />
                  </div>
                </Flex>
              )}

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    <DoorOpen className="w-5 h-5"/>
                    {t('btn_close', 'Close')}
                  </Button>
                </Dialog.Close>
              </Flex>
            </Flex>
          )}
        </Dialog.Content>
      </Dialog.Root>
      <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DraggableDialogContent title={t('dlg_help_title', 'Configurations Documentation')} maxWidth="1000px"
                                maxHeight="90vh">
          <Box px="4" pb="4">
            <ConfigurationsHelp/>
          </Box>
        </DraggableDialogContent>
      </Dialog.Root>
    </Card>
  );
};

export default Configurations;
