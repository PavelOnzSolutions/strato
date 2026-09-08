import React, {useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Box, Button, Card, Dialog, Flex, Progress, Text} from '@radix-ui/themes';
import {ArrowLeft, Columns2, Image, LayoutGrid, Maximize2, RefreshCw, Table} from 'lucide-react';
import {mergeConfigWithEnvironment} from '../../utils/config-provider-utils';
import {D3ConfigTreeView} from './components/D3ConfigTreeView';
import {HierarchicalTableView} from './components/HierarchicalTableView';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useTranslation} from 'react-i18next';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {fetchConfigurationById} from "./api.ts";
import {fetchEnvironmentById} from "../environments/api.ts";

export const ConfigurationTreeVisualization: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'graph' | 'table' | 'split'>('graph');
  const [selectedNodePath, setSelectedNodePath] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch configuration
  const { data: config, isLoading: isConfigLoading, refetch } = useQuery({
    queryKey: ['configuration', id, refreshKey],
    queryFn: () => fetchConfigurationById(id!),
    enabled: !!id,
  });

  // Fetch environment
  const { data: environment, isLoading: isEnvLoading } = useQuery({
    queryKey: ['environment', config?.environmentId],
    queryFn: () => fetchEnvironmentById(config!.environmentId!),
    enabled: !!config?.environmentId,
  });

  const mergedData = useMemo(() =>
    mergeConfigWithEnvironment(config?.data, environment),
    [config?.data, environment]
  );

  usePageTitle(`${t('ptitle_config_tree_viz', 'Configuration Tree Visualization')}: ${config?.name || ''}`);

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handleExportSVG = () => {
    // This will be called from D3ConfigTreeView
    const event = new CustomEvent('export-svg');
    window.dispatchEvent(event);
  };

  const handleBack = () => {
    navigate(`/configurations/maps/${id}/provider-view`);
  };

  useToolbar([
    { id: 'back', label: t('btn_back', 'Back to Editor'), icon: ArrowLeft, onClick: handleBack },
    { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: handleRefresh },
    { id: 'export', label: t('btn_export_svg', 'Export as SVG'), icon: Image, onClick: handleExportSVG },
  ]);

  if (isConfigLoading || (config?.environmentId && isEnvLoading)) {
    return (
      <Card size="4" className="w-full">
        <Flex direction="column" gap="4" align="center" justify="center" style={{ height: '300px' }}>
          <Progress />
          <Text color="gray">{t('lbl_loading', 'Loading...')}</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="4" className="w-full shadow-lg" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Selector */}
      <Flex gap="3" align="center" p="3" style={{ borderBottom: '1px solid var(--gray-6)' }}>
        <Text weight="bold" size="4">{config?.name}</Text>
        <Box ml="auto">
          <ToggleGroup.Root
            type="single"
            value={viewMode}
            onValueChange={(val) => { if (val) setViewMode(val as 'graph' | 'table' | 'split') }}
            className="flex bg-[var(--gray-3)] p-1 rounded-[var(--radius-2)]"
          >
            <ToggleGroup.Item
              value="graph"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-(--radius-1) data-[state=on]:bg-(--accent-9) data-[state=on]:text-white text-(--gray-11) transition-all cursor-pointer"
              title={t('lbl_graph_view', 'Graph View')}
            >
              <LayoutGrid size={14} />
              {t('lbl_graph', 'Graph')}
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="table"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-(--radius-1) data-[state=on]:bg-(--accent-9) data-[state=on]:text-white text-(--gray-11) transition-all cursor-pointer"
              title={t('lbl_table_view', 'Table View')}
            >
              <Table size={14} />
              {t('lbl_table', 'Table')}
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="split"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-(--radius-1) data-[state=on]:bg-(--accent-9) data-[state=on]:text-white text-(--gray-11) transition-all cursor-pointer"
              title={t('lbl_split_view', 'Split View')}
            >
              <Columns2 size={14} />
              {t('lbl_split', 'Split')}
            </ToggleGroup.Item>
          </ToggleGroup.Root>

          {['graph', 'split'].includes(viewMode) && (
            <Button variant="ghost" size="1" onClick={() => setIsFullscreen(true)}>
              <Maximize2 size={14} />
            </Button>
          )}
        </Box>
      </Flex>

      {/* Content Area */}
      <Box style={{ flex: 1, overflow: 'hidden', padding: 'var(--space-3)' }}>
        {viewMode === 'graph' && (
          <D3ConfigTreeView 
            data={mergedData} 
            onNodeSelect={setSelectedNodePath}
            selectedNodePath={selectedNodePath}
          />
        )}
        {viewMode === 'table' && (
          <HierarchicalTableView 
            data={mergedData}
            selectedPath={selectedNodePath}
            onPathSelect={setSelectedNodePath}
          />
        )}
        {viewMode === 'split' && (
          <Flex gap="3" style={{ height: '100%' }}>
            <Box style={{ flex: 1, overflow: 'hidden' }}>
              <D3ConfigTreeView 
                data={mergedData}
                onNodeSelect={setSelectedNodePath}
                selectedNodePath={selectedNodePath}
              />
            </Box>
            <Box style={{ flex: 1, overflow: 'auto', borderLeft: '1px solid var(--gray-6)', paddingLeft: 'var(--space-3)' }}>
              <HierarchicalTableView 
                data={mergedData}
                selectedPath={selectedNodePath}
                onPathSelect={setSelectedNodePath}
              />
            </Box>
          </Flex>
        )}
      </Box>

      <Dialog.Root open={isFullscreen} onOpenChange={setIsFullscreen}>
        <Dialog.Content maxWidth="90vw" maxHeight="90vh" height="90vh">
          <Box style={{ height: '100%', width: '100%', backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-3)', overflow: 'hidden', padding: 'var(--space-3)' }}>
            <D3ConfigTreeView 
              data={mergedData}
              onNodeSelect={setSelectedNodePath}
              selectedNodePath={selectedNodePath}
            />
          </Box>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
};

export default ConfigurationTreeVisualization;
