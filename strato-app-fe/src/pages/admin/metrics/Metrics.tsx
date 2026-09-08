import {
    Activity,
    Calendar,
    CircleHelp, Cpu,
    Download,
    FileText,
    Filter,
    Grid3X3,
    List,
    RefreshCw,
    Search
} from "lucide-react";
import {usePageTitle} from "../../../context/PageTitleContext.tsx";
import {useToolbar} from "../../../context/ToolbarContext.tsx";
import {Box, Button, Card, Dialog, Flex, Popover, ScrollArea, Select, Tabs, Text, TextField} from "@radix-ui/themes";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import {useEffect, useMemo, useState} from "react";
import {fetchWithAuth} from "../../../utils/api.ts";
import {useToast} from "../../../context/ToastContext.tsx";
import {LogDetailDialog, SystemLogs} from "./components/SystemLogs.tsx";
import {PrometheusMetrics} from "./components/PrometheusMetrics.tsx";

const fetchPrometheusMetrics = (): Promise<string> => {
    return fetchWithAuth('/management/prometheus')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch Prometheus metrics');
            }
            return response.text();
        });
};

const fetchLogFile = (): Promise<string> => {
    return fetchWithAuth('/management/logfile')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch log file');
            }
            return response.text();
        });
};

export interface PrometheusMetric {
    name: string;
    labels: Record<string, string>;
    value: number;
    help?: string;
    type?: string;
}

export interface LogEntry {
    timestamp: string;
    severity: string;
    pid: string;
    thread: string;
    class: string;
    method: string;
    message: string;
}

const parseLogFile = (text: string): Promise<LogEntry[]> => {
    return new Promise((resolve) => {
        const lines = text.split('\n');
        const entries: LogEntry[] = [];
        const CHUNK_SIZE = 500;
        const logRegex = /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[.,]\d{3}.*?)\s+([A-Z]+)\s+(\d+)\s+---\s+\[\s*([\s\S]*?)\s*\]\s+(.*?)\s+:\s+([\s\S]*)$/;

        const processChunk = (startIndex: number) => {
            const endIndex = Math.min(startIndex + CHUNK_SIZE, lines.length);

            for (let i = startIndex; i < endIndex; i++) {
                const line = lines[i];
                if (!line.trim()) continue;

                const match = line.match(logRegex);
                if (match) {
                    const [_, timestamp, severity, pid, thread, rawLogger, message] = match;
                    const logger = rawLogger.replace(/^\[.*?]\s+/, '');
                    let className = logger;
                    let methodName = '-';

                    const lastDotIndex = logger.lastIndexOf('.');
                    if (lastDotIndex !== -1) {
                        const potentialMethod = logger.substring(lastDotIndex + 1);
                        if (potentialMethod && potentialMethod[0] === potentialMethod[0].toLowerCase()) {
                            className = logger.substring(0, lastDotIndex);
                            methodName = potentialMethod;
                        }
                    }

                    entries.push({
                        timestamp,
                        severity,
                        pid,
                        thread,
                        class: className,
                        method: methodName,
                        message
                    });
                } else if (entries.length > 0) {
                    entries[entries.length - 1].message += '\n' + line;
                }
            }

            if (endIndex < lines.length) {
                setTimeout(() => processChunk(endIndex), 0);
            } else {
                resolve(entries.reverse());
            }
        };

        processChunk(0);
    });
};

const parsePrometheusText = (text: string): Promise<PrometheusMetric[]> => {
    return new Promise((resolve) => {
        const lines = text.split('\n');
        const metrics: PrometheusMetric[] = [];
        const helpMap = new Map<string, string>();
        const typeMap = new Map<string, string>();
        const CHUNK_SIZE = 500;

        const processChunk = (startIndex: number) => {
            const endIndex = Math.min(startIndex + CHUNK_SIZE, lines.length);

            for (let i = startIndex; i < endIndex; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith('# HELP ')) {
                    const parts = trimmed.split(' ');
                    if (parts.length >= 4) {
                        const name = parts[2];
                        const help = parts.slice(3).join(' ');
                        helpMap.set(name, help);
                    }
                    continue;
                }

                if (trimmed.startsWith('# TYPE ')) {
                    const parts = trimmed.split(' ');
                    if (parts.length >= 4) {
                        const name = parts[2];
                        const type = parts[3];
                        typeMap.set(name, type);
                    }
                    continue;
                }

                if (trimmed.startsWith('#')) continue;

                const braceIndex = trimmed.indexOf('{');
                const spaceIndex = trimmed.lastIndexOf(' ');

                let name = '';
                let labels: Record<string, string> = {};
                let valueStr = '';

                if (braceIndex !== -1 && braceIndex < spaceIndex) {
                    name = trimmed.substring(0, braceIndex);
                    const labelsStr = trimmed.substring(braceIndex + 1, trimmed.lastIndexOf('}'));
                    valueStr = trimmed.substring(trimmed.lastIndexOf('}') + 1).trim();

                    const labelPairs = labelsStr.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
                    labelPairs.forEach(pair => {
                        const [key, val] = pair.split('=');
                        if (key && val) {
                            labels[key.trim()] = val.trim().replace(/^"|"$/g, '');
                        }
                    });
                } else {
                    const firstSpace = trimmed.indexOf(' ');
                    if (firstSpace !== -1) {
                        name = trimmed.substring(0, firstSpace);
                        valueStr = trimmed.substring(firstSpace + 1).trim();
                    } else {
                        continue;
                    }
                }

                const value = parseFloat(valueStr);
                if (!isNaN(value)) {
                    metrics.push({
                        name,
                        labels,
                        value,
                        help: helpMap.get(name),
                        type: typeMap.get(name)
                    });
                }
            }

            if (endIndex < lines.length) {
                setTimeout(() => processChunk(endIndex), 0);
            } else {
                resolve(metrics);
            }
        };

        processChunk(0);
    });
};

export const Metrics = () => {
    const {t} = useTranslation();
    const {showToast} = useToast();
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid' | 'raw' | 'logs'>('grid');
    const [history, setHistory] = useState<Record<string, number[]>>({});
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showRate, setShowRate] = useState(false);
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [logDetailOpen, setLogDetailOpen] = useState(false);

    // Log filters
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data: rawData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['prometheus-metrics'],
        queryFn: fetchPrometheusMetrics,
        refetchInterval: autoRefresh && viewMode !== 'logs' ? 10000 : false,
        enabled: viewMode !== 'logs'
    });

    const { data: rawLogs, isLoading: isLoadingLogs, refetch: refetchLogs, isRefetching: isRefetchingLogs } = useQuery({
        queryKey: ['system-logs'],
        queryFn: fetchLogFile,
        refetchInterval: autoRefresh && viewMode === 'logs' ? 5000 : false,
        enabled: viewMode === 'logs'
    });

    const [parsedMetrics, setParsedMetrics] = useState<PrometheusMetric[]>([]);
    const [parsedLogs, setParsedLogs] = useState<LogEntry[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    useEffect(() => {
        if (!rawData) {
            setParsedMetrics([]);
            return;
        }
        
        let isCancelled = false;
        const parse = () => {
            setIsParsing(true);
            parsePrometheusText(rawData)
                .then(result => {
                    if (!isCancelled) {
                        setParsedMetrics(result);
                    }
                })
                .finally(() => {
                    if (!isCancelled) {
                        setIsParsing(false);
                    }
                });
        };
        // Use requestAnimationFrame or setTimeout to ensure we aren't blocking immediately
        const timeoutId = setTimeout(parse, 0);
        return () => { 
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [rawData]);

    useEffect(() => {
        if (!rawLogs) {
            setParsedLogs([]);
            return;
        }
        
        let isCancelled = false;
        const parse = () => {
            setIsParsing(true);
            parseLogFile(rawLogs)
                .then(result => {
                    if (!isCancelled) {
                        setParsedLogs(result);
                    }
                })
                .finally(() => {
                    if (!isCancelled) {
                        setIsParsing(false);
                    }
                });
        };
        const timeoutId = setTimeout(parse, 0);
        return () => { 
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [rawLogs]);

    // Update history
    useEffect(() => {
        if (parsedMetrics.length > 0) {
            setHistory(prev => {
                const newHistory = { ...prev };
                parsedMetrics.forEach(m => {
                    const key = `${m.name}${JSON.stringify(m.labels)}`;
                    const current = newHistory[key] || [];
                    newHistory[key] = [...current.slice(-19), m.value];
                });
                return newHistory;
            });
        }
    }, [parsedMetrics]);

    const filteredMetrics = useMemo(() => {
        if (!searchTerm) return parsedMetrics;
        const lowerSearch = searchTerm.toLowerCase();
        return parsedMetrics.filter(m => 
            m.name.toLowerCase().includes(lowerSearch) || 
            Object.values(m.labels).some(v => v.toLowerCase().includes(lowerSearch)) ||
            (m.help && m.help.toLowerCase().includes(lowerSearch))
        );
    }, [parsedMetrics, searchTerm]);

    const filteredLogs = useMemo(() => {
        let logs = parsedLogs;

        // Search term filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            logs = logs.filter(log =>
                log.message.toLowerCase().includes(lowerSearch) ||
                log.class.toLowerCase().includes(lowerSearch) ||
                log.method.toLowerCase().includes(lowerSearch) ||
                log.severity.toLowerCase().includes(lowerSearch)
            );
        }

        // Severity filter
        if (severityFilter !== 'all') {
            logs = logs.filter(log => log.severity === severityFilter);
        }

        // Class filter
        if (classFilter) {
            const lowerClass = classFilter.toLowerCase();
            logs = logs.filter(log => log.class.toLowerCase().includes(lowerClass));
        }

        // Date range filter
        if (dateFrom) {
            const from = new Date(dateFrom);
            logs = logs.filter(log => new Date(log.timestamp) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            logs = logs.filter(log => new Date(log.timestamp) <= to);
        }

        return logs;
    }, [parsedLogs, searchTerm, severityFilter, classFilter, dateFrom, dateTo]);

    const handleExportYAML = () => {
        if (!rawData) return;

        const lines = rawData.split('\n');
        let yamlContent = 'prometheus_metrics:\n';
        lines.forEach(line => {
            if (line && !line.startsWith('#')) {
                const braceIndex = line.indexOf('{');
                const spaceIndex = line.lastIndexOf(' ');
                if (braceIndex !== -1 && braceIndex < spaceIndex) {
                    const name = line.substring(0, braceIndex);
                    const labels = line.substring(braceIndex, line.lastIndexOf('}') + 1);
                    const value = line.substring(line.lastIndexOf('}') + 1).trim();
                    yamlContent += `  - name: ${name}\n    labels: ${labels}\n    value: ${value}\n`;
                } else {
                    const parts = line.split(' ');
                    const key = parts[0];
                    const value = parts.slice(1).join(' ');
                    if (key && value) {
                        yamlContent += `  - name: ${key}\n    value: ${value}\n`;
                    }
                }
            } else if (line.startsWith('#')) {
                yamlContent += `  # ${line.replace(/^#\s*/, '')}\n`;
            }
        });

        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnostics-${new Date().toISOString().split('T')[0]}.yaml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast(t('msg_exported_successfully', 'Exported successfully'), 'success');
    };

    usePageTitle(t('ptitle_diagnostics', 'System Metrics'));

    const prometheusActions = useMemo(() => [
        {
            id: 'refresh',
            label: t('btn_refresh', 'Refresh'),
            icon: RefreshCw,
            onClick: () => setTimeout(refetch, 0),
            isLoading: isRefetching
        },
        {
            id: 'export',
            label: t('btn_export_yaml', 'Export YAML Snapshot'),
            variant: 'soft' as const,
            icon: Download,
            onClick: handleExportYAML,
            disabled: !rawData
        },
        {
            id: 'auto-refresh',
            label: t('lbl_auto_refresh', 'Auto-refresh'),
            isSwitch: true,
            checked: autoRefresh,
            onCheckedChange: setAutoRefresh
        },
        {
            id: 'show-rate',
            label: t('lbl_show_rates', 'Show Rate Graphs'),
            isSwitch: true,
            checked: showRate,
            onCheckedChange: setShowRate
        },
        {
            id: 'help',
            label: t('btn_help', 'Help'),
            icon: CircleHelp,
            onClick: () => setHelpDialogOpen(true),
            variant: 'soft' as const,
            color: 'sky' as const
        },
    ], [t, refetch, isRefetching, handleExportYAML, rawData, autoRefresh, showRate]);

    const logActions = useMemo(() => [
        {
            id: 'refresh',
            label: t('btn_refresh', 'Refresh'),
            icon: RefreshCw,
            onClick: () => setTimeout(refetchLogs, 0),
            isLoading: isRefetchingLogs
        },
        {
            id: 'auto-refresh',
            label: t('lbl_auto_refresh', 'Auto-refresh'),
            isSwitch: true,
            checked: autoRefresh,
            onCheckedChange: setAutoRefresh
        },
        {
            id: 'severity-filter',
            label: t('lbl_severity', 'Severity'),
            customComponent: (
                <Select.Root value={severityFilter} onValueChange={setSeverityFilter}>
                    <Select.Trigger placeholder={t('lbl_severity', 'Severity')} variant="soft" />
                    <Select.Content>
                        <Select.Item value="all">{t('lbl_all_severities', 'All Severities')}</Select.Item>
                        <Select.Item value="DEBUG">DEBUG</Select.Item>
                        <Select.Item value="INFO">INFO</Select.Item>
                        <Select.Item value="WARN">WARN</Select.Item>
                        <Select.Item value="ERROR">ERROR</Select.Item>
                    </Select.Content>
                </Select.Root>
            )
        },
        {
            id: 'class-filter',
            label: t('lbl_class', 'Class'),
            customComponent: (
                <TextField.Root
                    placeholder={t('placeholder_filter_class', 'Filter by class...')}
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    size="2"
                >
                    <TextField.Slot>
                        <Filter size={14} />
                    </TextField.Slot>
                </TextField.Root>
            )
        },
        {
            id: 'date-range',
            label: t('lbl_date_range', 'Date Range'),
            customComponent: (
                <Popover.Root>
                    <Popover.Trigger>
                        <Button variant="soft" color="gray">
                            <Calendar size={14} />
                            {dateFrom || dateTo ? t('lbl_date_filtered', 'Date Filtered') : t('lbl_date_range', 'Date Range')}
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content style={{ width: 300 }}>
                        <Flex direction="column" gap="3">
                            <Box>
                                <Text as="div" size="2" mb="1" weight="bold">
                                    {t('lbl_from', 'From')}
                                </Text>
                                <TextField.Root
                                    type="datetime-local"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </Box>
                            <Box>
                                <Text as="div" size="2" mb="1" weight="bold">
                                    {t('lbl_to', 'To')}
                                </Text>
                                <TextField.Root
                                    type="datetime-local"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </Box>
                            <Flex gap="2" justify="end">
                                <Button size="1" variant="soft" color="gray" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                                    {t('btn_reset', 'Reset')}
                                </Button>
                            </Flex>
                        </Flex>
                    </Popover.Content>
                </Popover.Root>
            )
        },
        {
            id: 'help',
            label: t('btn_help', 'Help'),
            icon: CircleHelp,
            onClick: () => setHelpDialogOpen(true),
            variant: 'soft' as const,
            color: 'sky' as const
        },
    ], [t, refetchLogs, isRefetchingLogs, autoRefresh, severityFilter, classFilter, dateFrom, dateTo]);

    useToolbar(viewMode === 'logs' ? logActions : prometheusActions);

    // @ts-ignore
    return (
        <Flex direction="column" gap="4">
            <Card size="3">
                <Flex direction="column" gap="3">
                    <Flex justify="between" align="center">
                        <Flex direction="column">
                            <Flex direction="row" gap="2">
                                <Cpu size={32} color="var(--accent-11)"/>
                                <Text size="5" weight="bold">
                                    <span className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                                        {t('lbl_diagnostics', 'System Metrics & Diagnostics')}
                                    </span>
                                </Text>
                            </Flex>
                            <Text size="2" color="gray">{t('lbl_diagnostics_desc', 'Prometheus metrics and system health information and logs')}</Text>
                        </Flex>
                        
                        <Flex gap="3" align="center">
                             <TextField.Root 
                                placeholder={viewMode === 'logs' ? t('placeholder_search_logs', 'Search logs...') : t('placeholder_search_metrics', 'Search metrics...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="2"
                                style={{ width: 300 }}
                            >
                                <TextField.Slot>
                                    <Search size={14} />
                                </TextField.Slot>
                            </TextField.Root>

                            <Tabs.Root value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                                <Tabs.List size="2">
                                    <Tabs.Trigger value="grid">
                                        <Flex gap="1" align="center">
                                            <Grid3X3 size={14} />
                                            {t('lbl_view_grid', 'Graph Grid')}
                                        </Flex>
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="table">
                                        <Flex gap="1" align="center">
                                            <List size={14} />
                                            {t('lbl_view_table', 'Stat Table')}
                                        </Flex>
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="raw">
                                        <Flex gap="1" align="center">
                                            <Activity size={14} />
                                            {t('lbl_view_raw', 'Raw Prometheus')}
                                        </Flex>
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="logs">
                                        <Flex gap="1" align="center">
                                            <FileText size={14} />
                                            {t('lbl_view_logs', 'System Logs')}
                                        </Flex>
                                    </Tabs.Trigger>
                                </Tabs.List>
                            </Tabs.Root>
                        </Flex>
                    </Flex>

                    <Box style={{ height: 'calc(100vh - 300px)', overflow: 'hidden', position: 'relative' }}>
                        {(isLoading || (viewMode === 'logs' && isLoadingLogs)) ? (
                            <Flex align="center" justify="center" style={{ height: '100%' }}>
                                <Flex direction="column" align="center" gap="3">
                                    <RefreshCw size={32} className="animate-spin text-[var(--accent-9)]" />
                                    <Text>{viewMode === 'logs' ? t('lbl_loading_logs', 'Loading logs...') : t('lbl_loading', 'Loading metrics...')}</Text>
                                </Flex>
                            </Flex>
                        ) : (
                            <>
                                {isParsing && (
                                    <Box style={{ 
                                        position: 'absolute', 
                                        top: 10, 
                                        right: 10, 
                                        zIndex: 10,
                                        backgroundColor: 'var(--color-panel-solid)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        border: '1px solid var(--gray-5)'
                                    }}>
                                        <Flex align="center" gap="2">
                                            <RefreshCw size={12} className="animate-spin" />
                                            <Text size="1">{t('lbl_parsing', 'Parsing...')}</Text>
                                        </Flex>
                                    </Box>
                                )}
                                <ScrollArea scrollbars="vertical" style={{ height: '100%' }}>
                                    {viewMode === 'logs' ? (
                                        <SystemLogs
                                            logs={filteredLogs}
                                            onLogClick={(log) => {
                                                setSelectedLog(log);
                                                setLogDetailOpen(true);
                                            }}
                                        />
                                    ) : (
                                        <PrometheusMetrics
                                            viewMode={viewMode as any}
                                            filteredMetrics={filteredMetrics}
                                            searchTerm={searchTerm}
                                            rawData={rawData}
                                            history={history}
                                            showRate={showRate}
                                        />
                                    )}
                                </ScrollArea>
                        </>
                    )}
                    </Box>
                </Flex>
            </Card>

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{ maxWidth: 500 }}>
                    <Dialog.Title>{t('lbl_diagnostics_help', 'Metrics Help')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_diagnostics_help_desc', 'This page displays Prometheus metrics from the application backend in several views.')}
                    </Dialog.Description>
                    
                    <Flex direction="column" gap="2">
                        <Text size="2">
                            <strong>{t('lbl_help_table_view', 'Table View')}:</strong> {t('lbl_help_table_view_desc', 'Shows metrics in a tabular format with pivot-like label columns and sparklines.')}
                        </Text>
                        <Text size="2">
                            <strong>{t('lbl_help_grid_view', 'Grid View')}:</strong> {t('lbl_help_grid_view_desc', 'Displays numeric metrics as a grid of cards with charts.')}
                        </Text>
                        <Text size="2">
                            <strong>{t('lbl_help_raw_view', 'Raw View')}:</strong> {t('lbl_help_raw_view_desc', 'Shows the original Prometheus text format.')}
                        </Text>
                        <Text size="2">
                            <strong>{t('lbl_help_logs_view', 'Logs View')}:</strong> {t('lbl_help_logs_view_desc', 'Displays the system log file in a structured table.')}
                        </Text>
                        <Text size="2">
                            <strong>{t('lbl_help_refresh', 'Refresh')}:</strong> {t('lbl_help_refresh_desc', 'Fetches the latest metrics. Auto-refresh can be toggled in the toolbar.')}
                        </Text>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                {t('btn_close', 'Close')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <LogDetailDialog
                log={selectedLog}
                open={logDetailOpen}
                onOpenChange={setLogDetailOpen}
            />
        </Flex>
    );
};

export default Metrics;
