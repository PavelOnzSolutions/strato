import {BrushCleaning, CircleHelp, DatabaseZap, RefreshCw, Trash2} from "lucide-react";
import {usePageTitle} from "../../context/PageTitleContext";
import {useToolbar} from "../../context/ToolbarContext";
import {Badge, Button, Card, Dialog, Flex, Progress, Table, Text} from "@radix-ui/themes";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {fetchWithAuth} from "../../utils/api";
import {OperationalMetricsResponse, FlatCacheMetric} from "../../models/cache.model";
import {useToast} from "../../context/ToastContext";
import CacheHelp from "../documentation/CacheHelp";

const fetchMetrics = async (): Promise<OperationalMetricsResponse> => {
  const response = await fetchWithAuth('/management/strato-metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch metrics');
  }
  return response.json();
};

const purgeCache = async (cacheName: string) => {
  const response = await fetchWithAuth(`/management/caches/${cacheName}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to purge cache ${cacheName}`);
  }
  return response;
};

const purgeAllCaches = async (cacheNames: string[]) => {
  await Promise.all(cacheNames.map(name => purgeCache(name)));
};

export const Cache = () => {
  const {t} = useTranslation();
  const {showToast} = useToast();
  const queryClient = useQueryClient();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['strato-metrics'],
    queryFn: fetchMetrics,
  });

  const purgeMutation = useMutation({
    mutationFn: purgeCache,
    onSuccess: (_, cacheName) => {
      showToast(t('msg_cache_purged', 'Cache {{name}} purged successfully', {name: cacheName}), 'success');
      queryClient.invalidateQueries(['strato-metrics']);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    }
  });

  const purgeAllMutation = useMutation({
    mutationFn: purgeAllCaches,
    onSuccess: () => {
      showToast(t('msg_all_caches_purged', 'All caches purged successfully'), 'success');
      queryClient.invalidateQueries(['strato-metrics']);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    }
  });

  const cacheList: FlatCacheMetric[] = data ? Object.entries(data.cacheMetrics).map(([name, metrics]) => ({
    name,
    metrics
  })) : [];

  usePageTitle(t('ptitle_cache', 'Cache'));
  useToolbar([
    {
      id: 'refresh',
      label: t('btn_refresh', 'Refresh'),
      icon: RefreshCw,
      onClick: () => refetch(),
      isLoading: isLoading
    },
    {
      id: 'purge',
      label: t('btn_purge_all', 'Purge All'),
      icon: BrushCleaning,
      onClick: () => {
        if (cacheList.length > 0) {
          purgeAllMutation.mutate(cacheList.map(c => c.name));
        }
      },
      variant: 'solid',
      color: 'red'
    },
    {id: 'help', label: t('btn_help', 'Help'), icon: CircleHelp, color: 'sky', onClick: () => setHelpDialogOpen(true)},
  ]);

  return (
    <Flex direction="column" gap="4">
      <Card size="3">
        <Flex direction="column" gap="3">

          <Flex direction="column" mb="2">
            <Flex direction="row" gap="2">
              <DatabaseZap size={32} color="var(--accent-11)"/>
              <Text size="5" weight="bold">
                  <span
                    className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('lbl_cache_stats', 'Cache Statistics')}
                  </span>
              </Text>
            </Flex>
            <Text size="2"
                  color="gray">{t('lbl_cache_mgmt_desc', 'Monitor and manage application caches')}</Text>
          </Flex>

          {isLoading && <Progress/>}

          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t('lbl_cache_name', 'Cache Name')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">{t('lbl_cache_hits', 'Hits')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">{t('lbl_cache_misses', 'Misses')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">{t('lbl_cache_puts', 'Puts')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">{t('lbl_cache_removals', 'Removals')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">{t('lbl_cache_evictions', 'Evictions')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="center">{t('lbl_actions', 'Actions')}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {cacheList.map((cache) => (
                <Table.Row key={cache.name}>
                  <Table.RowHeaderCell>
                    <Badge variant="soft" size="2">
                      {cache.name}
                    </Badge>
                  </Table.RowHeaderCell>
                  <Table.Cell align="right">
                    <Text size="2" weight="bold" color="green">{cache.metrics['cache.gets.hit'] || 0}</Text>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <Text size="2" color="ruby">{cache.metrics['cache.gets.miss'] || 0}</Text>
                  </Table.Cell>
                  <Table.Cell align="right">{cache.metrics['cache.puts'] || 0}</Table.Cell>
                  <Table.Cell align="right">{cache.metrics['cache.removals'] || 0}</Table.Cell>
                  <Table.Cell align="right">{cache.metrics['cache.evictions'] || 0}</Table.Cell>
                  <Table.Cell align="center">
                    <Button
                      size="1"
                      variant="ghost"
                      color="tomato"
                      onClick={() => purgeMutation.mutate(cache.name)}
                      loading={purgeMutation.isLoading && purgeMutation.variables === cache.name}
                    >
                      <Trash2 size={14}/>
                      {t('btn_purge', 'Purge')}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
              {cacheList.length === 0 && !isLoading && (
                <Table.Row>
                  <Table.Cell colSpan={7} align="center">
                    <Text size="2" color="gray"
                          style={{fontStyle: 'italic'}}>{t('msg_no_caches_found', 'No caches found')}</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>

      {data?.processMetrics && (
        <Card size="2">
          <Flex direction="column" gap="2">
            <Text size="3" weight="bold">{t('lbl_system_info', 'Backend System Info')}</Text>
            <Flex gap="4" wrap="wrap">
              <Flex direction="column">
                <Text size="1" color="gray">{t('lbl_cpu_usage', 'CPU Usage')}</Text>
                <Text size="2" weight="bold">
                  {(data.processMetrics['process.cpu.usage'] ? (data.processMetrics['process.cpu.usage'] * 100).toFixed(2) : 0)}%
                </Text>
              </Flex>
              <Flex direction="column">
                <Text size="1" color="gray">{t('lbl_jvm_memory_used', 'JVM Memory Used')}</Text>
                <Text size="2" weight="bold">
                  {(data.processMetrics['jvm.memory.used'] ? (data.processMetrics['jvm.memory.used'] / 1024 / 1024).toFixed(2) : 0)} MB
                </Text>
              </Flex>
              <Flex direction="column">
                <Text size="1" color="gray">{t('lbl_jvm_memory_committed', 'JVM Memory Committed')}</Text>
                <Text size="2" weight="bold">
                  {(data.processMetrics['jvm.memory.committed'] ? (data.processMetrics['jvm.memory.committed'] / 1024 / 1024).toFixed(2) : 0)} MB
                </Text>
              </Flex>
              <Flex direction="column">
                <Text size="1" color="gray">{t('lbl_uptime', 'Uptime')}</Text>
                <Text size="2" weight="bold">
                  {data.processMetrics['process.uptime'] ? (data.processMetrics['process.uptime'] / 1000 / 3600).toFixed(2) : 0} h
                </Text>
              </Flex>
              <Flex direction="column">
                <Text size="1" color="gray">{t('lbl_cpu_count', 'System CPU Count')}</Text>
                <Text size="2" weight="bold">
                  {data.processMetrics['system.cpu.count'] ? (data.processMetrics['system.cpu.count']) : 'n/a'}
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      )}

      <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <Dialog.Content style={{maxWidth: 800}}>
          <CacheHelp hideTitle/>
          <Flex gap="3" mt="4" justify="end">
            <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
              {t('btn_close', 'Close')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};

export default Cache;
