import {useEffect, useMemo, useState} from 'react';
import {
    Badge,
    Box,
    Button,
    Card,
    Code,
    Dialog,
    Flex,
    Heading,
    IconButton,
    ScrollArea,
    Separator,
    Table,
    Text,
    TextField,
    Tooltip,
    Spinner
} from '@radix-ui/themes';
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    Filter,
    GitCommit,
    Grid3X3,
    HelpCircle,
    Layers,
    RefreshCw,
    Search,
    Server,
    User
} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {fetchWithAuth} from '../../utils/api.ts';
import {IDeploymentVersionMatrix} from '../../models/version-matrix.model.ts';
import {IEnvironment} from '../../models/environment.model.ts';
import {usePageTitle} from '../../context/PageTitleContext.tsx';
import {useTranslation} from 'react-i18next';
import GlobalVersionMatrixHelp from '../documentation/GlobalVersionMatrixHelp.tsx';
import {useToolbar} from "../../context/ToolbarContext.tsx";
import DeploymentTimelineD3, {TimelineEntry} from '../../components/graphs/DeploymentTimelineD3.tsx';

type VersionStatus = 'latest' | 'drift' | 'stale';

const STATUS_COLORS: Record<VersionStatus, string> = {
    latest: 'green',
    drift: 'amber',
    stale: 'crimson'
};

const getVersionStatus = (
    version: string,
    latestVersion: string,
    allVersionsSorted: string[]
): VersionStatus => {
    if (version === latestVersion) return 'latest';
    const latestIdx = allVersionsSorted.indexOf(latestVersion);
    const currentIdx = allVersionsSorted.indexOf(version);
    if (latestIdx === -1 || currentIdx === -1) return 'stale';
    const drift = latestIdx - currentIdx;
    return drift <= 1 ? 'drift' : 'stale';
};

const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

interface MatrixData {
    components: string[];
    dataMap: Record<string, Record<string, IDeploymentVersionMatrix>>;
    latestVersions: Record<string, string>;
    allVersionsSorted: Record<string, string[]>;
}

const GlobalVersionMatrix = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
    const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    usePageTitle(t('mit_version_matrix', 'Version Matrix'));

    const {data: environments, isLoading: envsLoading} = useQuery<IEnvironment[]>({
        queryKey: ['environments'],
        queryFn: () => fetchWithAuth('/environments').then(response => {
            if (!response.ok) throw new Error('Failed to fetch environments');
            return response.json();
        })
    });

    const {data: allVersions, isLoading: versionsLoading, refetch} = useQuery<IDeploymentVersionMatrix[]>({
        queryKey: ['version-matrix-all'],
        queryFn: () => fetchWithAuth('/version-matrix').then(response => {
            if (!response.ok) throw new Error('Failed to fetch version matrix');
            return response.json();
        })
    });
    useMemo(() => {
        const map: Record<string, string> = {};
        environments?.forEach(env => {
            if (env.id && env.name) map[env.id] = env.name;
        });
        return map;
    }, [environments]);

    useEffect(() => {
        if (!allVersions || !environments) {
            setMatrixData(null);
            return;
        }

        let isCancelled = false;

        const processData = () => {
            setIsProcessing(true);

            const componentsSet = new Set<string>();
            const dataMap: Record<string, Record<string, IDeploymentVersionMatrix>> = {};
            const versionSets: Record<string, Set<string>> = {};

            const CHUNK_SIZE = 200;

            const processPhase1 = (startIndex: number) => {
                if (isCancelled) return;

                const endIndex = Math.min(startIndex + CHUNK_SIZE, allVersions.length);

                for (let i = startIndex; i < endIndex; i++) {
                    const v = allVersions[i];
                    componentsSet.add(v.componentName);
                    if (!dataMap[v.componentName]) {
                        dataMap[v.componentName] = {};
                    }
                    dataMap[v.componentName][v.environmentId] = v;

                    if (!versionSets[v.componentName]) {
                        versionSets[v.componentName] = new Set();
                    }
                    versionSets[v.componentName].add(v.version);
                }

                if (endIndex < allVersions.length) {
                    setTimeout(() => processPhase1(endIndex), 0);
                } else {
                    finalize();
                }
            };

            const finalize = () => {
                if (isCancelled) return;

                const latestVersions: Record<string, string> = {};
                const allVersionsSorted: Record<string, string[]> = {};

                for (const comp of componentsSet) {
                    const sorted = Array.from(versionSets[comp]).sort();
                    allVersionsSorted[comp] = sorted;
                    latestVersions[comp] = sorted[sorted.length - 1];
                }

                const components = Array.from(componentsSet).sort().filter(c =>
                    c.toLowerCase().includes(search.toLowerCase())
                );

                setMatrixData({components, dataMap, latestVersions, allVersionsSorted});
                setIsProcessing(false);
            };

            processPhase1(0);
        };

        const timeoutId = setTimeout(processData, 0);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [allVersions, environments, search]);

    const isLoading = envsLoading || versionsLoading;

    const stats = useMemo(() => {
        if (!matrixData || !environments) return null;
        const totalComponents = matrixData.components.length;
        const totalEnvs = environments.length;
        let driftCount = 0;
        for (const comp of matrixData.components) {
            for (const env of environments) {
                const entry = matrixData.dataMap[comp]?.[env.id!];
                if (entry && entry.version !== matrixData.latestVersions[comp]) {
                    driftCount++;
                }
            }
        }
        return {totalComponents, totalEnvs, driftCount};
    }, [matrixData, environments]);

    const toggleExpanded = (comp: string) => {
        setExpandedComponents(prev => {
            const next = new Set(prev);
            if (next.has(comp)) {
                next.delete(comp);
            } else {
                next.add(comp);
            }
            return next;
        });
    };

    const buildTimelineEntries = (comp: string): TimelineEntry[] => {
        if (!matrixData || !environments) return [];
        return environments
            .filter(env => matrixData.dataMap[comp]?.[env.id!])
            .map(env => {
                const entry = matrixData.dataMap[comp][env.id!];
                return {
                    environmentName: env.name || env.id,
                    version: entry.version,
                    deployedAt: entry.deployedAt,
                    commitId: entry.commitId,
                    author: entry.author
                };
            });
    };

    const buildPromotionCards = (comp: string) => {
        if (!matrixData || !environments) return [];
        const latest = matrixData.latestVersions[comp];
        return environments.map(env => {
            const entry = matrixData.dataMap[comp]?.[env.id!];
            const status = entry
                ? getVersionStatus(entry.version, latest, matrixData.allVersionsSorted[comp])
                : null;
            return {env, entry, status};
        });
    };

    useToolbar([
        {
            id: "help",
            label: t('btn_help', 'Help'),
            color: "sky",
            icon: HelpCircle,
            onClick: () => setHelpDialogOpen(true)
        }
    ]);

    return (
        <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
                <Heading size="6" className="flex items-center gap-2">
                    <Grid3X3 size={24} className="text-[var(--accent-9)]"/>
                    {t('mit_version_matrix', 'Global Version Matrix')}
                </Heading>
                <Flex gap="3" align="center">
                    {(isLoading || isProcessing) && (
                        <Flex align="center" gap="2" mr="2">
                            <Flex align="center" justify="center" className="h-64">
                                <Spinner size="3" />
                            </Flex>
                            <Text size="1"
                                  color="gray">{isProcessing && !isLoading ? t('msg_processing', 'Processing...') : ''}</Text>
                        </Flex>
                    )}
                    <TextField.Root
                        placeholder={t('lbl_search_components', 'Search components...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{width: 300}}
                    >
                        <TextField.Slot>
                            <Search size={16}/>
                        </TextField.Slot>
                    </TextField.Root>
                    <IconButton variant="soft" onClick={() => setTimeout(refetch, 0)} loading={isLoading}>
                        <RefreshCw size={16}/>
                    </IconButton>
                </Flex>
            </Flex>

            {/* Summary Stats Bar */}
            {stats && !isLoading && (
                <Flex gap="4">
                    <Card size="1" style={{flex: 1}}>
                        <Flex align="center" gap="3" p="1">
                            <Box className="p-2 rounded-lg bg-[var(--accent-3)]">
                                <Layers size={18} className="text-[var(--accent-11)]"/>
                            </Box>
                            <Box>
                                <Text size="1" color="gray">{t('lbl_components', 'Components')}</Text>
                                <Text as="div" size="5" weight="bold">{stats.totalComponents}</Text>
                            </Box>
                        </Flex>
                    </Card>
                    <Card size="1" style={{flex: 1}}>
                        <Flex align="center" gap="3" p="1">
                            <Box className="p-2 rounded-lg bg-[var(--accent-3)]">
                                <Server size={18} className="text-[var(--accent-11)]"/>
                            </Box>
                            <Box>
                                <Text size="1" color="gray">{t('lbl_environments', 'Environments')}</Text>
                                <Text as="div" size="5" weight="bold">{stats.totalEnvs}</Text>
                            </Box>
                        </Flex>
                    </Card>
                    <Card size="1" style={{flex: 1}}>
                        <Flex align="center" gap="3" p="1">
                            <Box className="p-2 rounded-lg"
                                 style={{backgroundColor: stats.driftCount > 0 ? 'var(--amber-3)' : 'var(--green-3)'}}>
                                <AlertTriangle size={18}
                                               style={{color: stats.driftCount > 0 ? 'var(--amber-11)' : 'var(--green-11)'}}/>
                            </Box>
                            <Box>
                                <Text size="1" color="gray">{t('lbl_version_drift', 'Version Drift')}</Text>
                                <Text as="div" size="5" weight="bold"
                                      color={stats.driftCount > 0 ? 'amber' : 'green'}>{stats.driftCount}</Text>
                            </Box>
                        </Flex>
                    </Card>
                </Flex>
            )}

            <Card size="2" className="shadow-md overflow-hidden p-0">
                <ScrollArea scrollbars="both" style={{height: 'calc(100vh - 16rem)'}}>
                    {isLoading ? (
                        <Flex justify="center" p="8" align="center" gap="3">
                            <RefreshCw size={24} className="animate-spin text-gray-400"/>
                            <Text color="gray">{t('msg_loading_data', 'Loading version data...')}</Text>
                        </Flex>
                    ) : !matrixData || matrixData.components.length === 0 ? (
                        <Flex direction="column" align="center" py="8" gap="4" justify="center"
                              style={{height: '300px'}}>
                            <Filter size={48} color="var(--gray-7)"/>
                            <Text color="gray">{t('msg_no_data_found', 'No version data found.')}</Text>
                        </Flex>
                    ) : (
                        <Table.Root variant="surface">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell
                                        className="sticky left-0 bg-[var(--color-panel-solid)] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r">
                                        <Flex align="center" gap="2" p="2">
                                            <Server size={14}/>
                                            <Text size="2">{t('thead_component', 'Component')}</Text>
                                        </Flex>
                                    </Table.ColumnHeaderCell>
                                    {environments?.map(env => (
                                        <Table.ColumnHeaderCell key={env.id}
                                                                style={{minWidth: 160, textAlign: 'center'}}>
                                            <Flex direction="column" align="center" gap="1" p="1">
                                                <Badge variant="surface" color="indigo" size="1">
                                                    {env.name}
                                                </Badge>
                                                <Flex gap="2" align="center">
                                                    <Text size="1" color="gray" weight="regular">
                                                        {env.config?.region || 'Global'}
                                                    </Text>
                                                    <IconButton
                                                        size="1"
                                                        variant="ghost"
                                                        color="gray"
                                                        onClick={() => navigate(`/environments/version-matrix/${env.id}`)}
                                                    >
                                                        <ExternalLink size={10}/>
                                                    </IconButton>
                                                </Flex>
                                            </Flex>
                                        </Table.ColumnHeaderCell>
                                    ))}
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {matrixData.components.map(comp => {
                                    const isExpanded = expandedComponents.has(comp);
                                    const envCount = environments?.length ?? 0;

                                    return (
                                        <>{/* Fragment with key on first row */}
                                            <Table.Row key={comp} style={{cursor: 'pointer'}}
                                                       onClick={() => toggleExpanded(comp)}>
                                                <Table.RowHeaderCell
                                                    className="sticky left-0 bg-[var(--color-panel-solid)] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r">
                                                    <Flex align="center" gap="2" px="2" py="1">
                                                        {isExpanded
                                                            ? <ChevronDown size={14}
                                                                           className="text-[var(--accent-9)]"/>
                                                            : <ChevronRight size={14} className="text-[var(--gray-8)]"/>
                                                        }
                                                        <Text size="2" weight="bold">{comp}</Text>
                                                    </Flex>
                                                </Table.RowHeaderCell>
                                                {environments?.map(env => {
                                                    const entry = matrixData.dataMap[comp]?.[env.id!];
                                                    if (!entry) {
                                                        return (
                                                            <Table.Cell key={env.id} align="center">
                                                                <Box style={{opacity: 0.15}}>
                                                                    <Text size="1" color="gray">—</Text>
                                                                </Box>
                                                            </Table.Cell>
                                                        );
                                                    }
                                                    const status = getVersionStatus(
                                                        entry.version,
                                                        matrixData.latestVersions[comp],
                                                        matrixData.allVersionsSorted[comp]
                                                    );
                                                    const color = STATUS_COLORS[status] as 'green' | 'amber' | 'crimson';

                                                    return (
                                                        <Table.Cell key={env.id} align="center">
                                                            <Tooltip content={
                                                                `${entry.version} — ${new Date(entry.deployedAt).toLocaleString()}` +
                                                                (entry.author ? ` — ${entry.author}` : '')
                                                            }>
                                                                <Flex direction="column" align="center" gap="1">
                                                                    <Badge
                                                                        variant="soft"
                                                                        color={color}
                                                                        size="2"
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            minWidth: '70px',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                    >
                                                                        <div
                                                                            className="w-1.5 h-1.5 rounded-full mr-1"
                                                                            style={{backgroundColor: `var(--${color}-9)`}}
                                                                        />
                                                                        {entry.version}
                                                                    </Badge>
                                                                    <Text size="1" color="gray">
                                                                        {formatRelativeTime(entry.deployedAt)}
                                                                    </Text>
                                                                </Flex>
                                                            </Tooltip>
                                                        </Table.Cell>
                                                    );
                                                })}
                                            </Table.Row>
                                            {/* Expandable detail panel */}
                                            {isExpanded && (
                                                <Table.Row key={`${comp}-detail`}>
                                                    <Table.Cell
                                                        colSpan={envCount + 1}
                                                        style={{padding: 0, background: 'var(--gray-2)'}}
                                                    >
                                                        <Box p="4">
                                                            <Flex gap="5" wrap="wrap">
                                                                {/* Left: D3 Timeline */}
                                                                <Box style={{flex: '2 1 500px', minWidth: 400}}>
                                                                    <Text size="2" weight="bold" mb="2"
                                                                          className="block">
                                                                        <Clock size={14}
                                                                               className="inline-block mr-1 align-text-bottom"/>
                                                                        {t('lbl_deployment_timeline', 'Deployment Timeline')}
                                                                    </Text>
                                                                    <Card size="1" mt="2">
                                                                        <DeploymentTimelineD3
                                                                            entries={buildTimelineEntries(comp)}
                                                                            latestVersion={matrixData.latestVersions[comp]}
                                                                            allVersions={matrixData.allVersionsSorted[comp]}
                                                                        />
                                                                    </Card>
                                                                </Box>

                                                                {/* Right: Promotion status cards */}
                                                                <Box style={{flex: '1 1 280px', minWidth: 250}}>
                                                                    <Text size="2" weight="bold" mb="2"
                                                                          className="block">
                                                                        <GitCommit size={14}
                                                                                   className="inline-block mr-1 align-text-bottom"/>
                                                                        {t('lbl_promotion_status', 'Promotion Status')}
                                                                    </Text>
                                                                    <Flex direction="column" gap="2" mt="2">
                                                                        {buildPromotionCards(comp).map(({
                                                                                                            env,
                                                                                                            entry,
                                                                                                            status
                                                                                                        }) => (
                                                                            <Card key={env.id} size="1"
                                                                                  style={{
                                                                                      borderLeft: `3px solid var(--${status ? STATUS_COLORS[status] : 'gray'}-9)`
                                                                                  }}>
                                                                                <Flex justify="between"
                                                                                      align="center">
                                                                                    <Box>
                                                                                        <Text size="2"
                                                                                              weight="bold">{env.name}</Text>
                                                                                        {entry ? (
                                                                                            <Flex direction="column"
                                                                                                  gap="1" mt="1">
                                                                                                <Flex align="center"
                                                                                                      gap="1">
                                                                                                    <Badge
                                                                                                        variant="soft"
                                                                                                        color={STATUS_COLORS[status!] as 'green' | 'amber' | 'crimson'}
                                                                                                        size="1">
                                                                                                        {entry.version}
                                                                                                    </Badge>
                                                                                                    <Text size="1"
                                                                                                          color="gray">
                                                                                                        {formatRelativeTime(entry.deployedAt)}
                                                                                                    </Text>
                                                                                                </Flex>
                                                                                                {entry.commitId && (
                                                                                                    <Flex
                                                                                                        align="center"
                                                                                                        gap="1">
                                                                                                        <GitCommit
                                                                                                            size={10}
                                                                                                            className="text-[var(--gray-8)]"/>
                                                                                                        <Code
                                                                                                            size="1">{entry.commitId.substring(0, 7)}</Code>
                                                                                                    </Flex>
                                                                                                )}
                                                                                                {entry.author && (
                                                                                                    <Flex
                                                                                                        align="center"
                                                                                                        gap="1">
                                                                                                        <User
                                                                                                            size={10}
                                                                                                            className="text-[var(--gray-8)]"/>
                                                                                                        <Text
                                                                                                            size="1"
                                                                                                            color="gray">{entry.author}</Text>
                                                                                                    </Flex>
                                                                                                )}
                                                                                            </Flex>
                                                                                        ) : (
                                                                                            <Text size="1"
                                                                                                  color="gray">{t('lbl_not_deployed', 'Not deployed')}</Text>
                                                                                        )}
                                                                                    </Box>
                                                                                    {status && (
                                                                                        <Badge variant="outline"
                                                                                               color={STATUS_COLORS[status] as 'green' | 'amber' | 'crimson'}
                                                                                               size="1">
                                                                                            {status === 'latest' ? t('lbl_latest', 'Latest') :
                                                                                                status === 'drift' ? t('lbl_drift', 'Drift') :
                                                                                                    t('lbl_stale', 'Stale')}
                                                                                        </Badge>
                                                                                    )}
                                                                                </Flex>
                                                                            </Card>
                                                                        ))}
                                                                    </Flex>
                                                                </Box>
                                                            </Flex>
                                                        </Box>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
                    )}
                </ScrollArea>
            </Card>

            <Flex gap="4" mt="1" align="center">
                <Text size="1" color="gray" weight="bold">{t('lbl_legend', 'Legend')}:</Text>
                <Flex align="center" gap="2">
                    <Badge color="green" variant="soft" size="1"/>
                    <Text size="1" color="gray">{t('lbl_latest_version', 'Latest')}</Text>
                </Flex>
                <Flex align="center" gap="2">
                    <Badge color="amber" variant="soft" size="1"/>
                    <Text size="1" color="gray">{t('lbl_drifted_version', 'Drift (1 behind)')}</Text>
                </Flex>
                <Flex align="center" gap="2">
                    <Badge color="crimson" variant="soft" size="1"/>
                    <Text size="1" color="gray">{t('lbl_stale_version', 'Stale (2+ behind)')}</Text>
                </Flex>
                <Separator orientation="vertical"/>
                <Text size="1" color="gray">{t('lbl_click_row_hint', 'Click a row to expand deployment details')}</Text>
            </Flex>

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
                    <Dialog.Title>{t('btn_help', 'Help')}</Dialog.Title>
                    <ScrollArea style={{flex: 1, minHeight: 0}} type="auto">
                        <Box p="4">
                            <GlobalVersionMatrixHelp hideTitle/>
                        </Box>
                    </ScrollArea>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                {t('btn_close', 'Close')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Flex>
    );
};

export default GlobalVersionMatrix;
