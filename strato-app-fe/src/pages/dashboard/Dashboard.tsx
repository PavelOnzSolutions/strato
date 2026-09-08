import {Blockquote, Box, Button, Card, Flex, Grid, Heading, Separator, Skeleton, Tabs, Text} from '@radix-ui/themes';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  HeartPulse,
  LayoutList,
  MemoryStick,
  RefreshCw,
  Sigma,
  Tally4,
  Waypoints,
  Zap
} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useQuery} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useEffect, useState} from 'react';
import ReactMarkdown from "react-markdown";
import DeploymentTimeline from './components/DeploymentTimeline';
import DeploymentTable from './components/DeploymentTable';
import MiniChart from '../../components/graphs/MiniChart.tsx';
import {fetchMetrics, fetchRecentDeployments, fetchStats, fetchStatusSummary} from "./api.ts";

const Dashboard = () => {
    usePageTitle('Dashboard');
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: fetchStats,
    });

    const { data: deployments, isLoading: deploymentsLoading, refetch: refetchDeployments } = useQuery({
        queryKey: ['dashboard-deployments'],
        queryFn: fetchRecentDeployments,
    });

    const { data: metrics, refetch: refetchMetrics } = useQuery({
        queryKey: ['strato-metrics'],
        queryFn: fetchMetrics,
        refetchInterval: 5000,
    });

    const { data: summary, isLoading: systemSummaryLoading, refetch: refetchStatusSummary } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: fetchStatusSummary,
    });

    const [history, setHistory] = useState<{ cpu: any[], memory: any[], systemCpu: any[], mongoFind: any[], mongoAgg: any[], httpMean: any[] }>({
        cpu: [],
        memory: [],
        systemCpu: [],
        mongoFind: [],
        mongoAgg: [],
        httpMean: []
    });


    useEffect(() => {
        if (metrics) {
            const now = new Date().toLocaleTimeString();
            const cpuUsage = (metrics.processMetrics['process.cpu.usage'] || 0) * 100;
            const memoryUsed = (metrics.processMetrics['jvm.memory.used'] || 0) / 1024 / 1024;
            const systemCpu = (metrics.processMetrics['system.cpu.usage'] || 0) * 100;

            // Extract MongoDB metrics from the first available instance
            const mongoInstances = metrics.databaseMetrics?.mongodb ? Object.values(metrics.databaseMetrics.mongodb) : [];
            const mongoStats = mongoInstances.length > 0 ? mongoInstances[0] : null;

            const findMean = mongoStats?.['find.commands.mean'] || 0;
            const aggMean = mongoStats?.['aggregate.commands.mean'] || 0;
            const httpMean = metrics.httpMetrics?.cumulative['total.mean'] || 0;

            // Use requestAnimationFrame to ensure an update happens after the current render
            const raf = requestAnimationFrame(() => {
                setHistory(prev => {
                    const newCpu = [...(prev.cpu || []), { time: now, value: cpuUsage }].slice(-20);
                    const newSystemCpu = [...(prev.systemCpu || []), { time: now, value: systemCpu }].slice(-20);
                    const newMemory = [...(prev.memory || []), { time: now, value: memoryUsed }].slice(-20);
                    const newMongoFind = [...(prev.mongoFind || []), { time: now, value: findMean }].slice(-20);
                    const newMongoAgg = [...(prev.mongoAgg || []), { time: now, value: aggMean }].slice(-20);
                    const newHttpMean = [...(prev.httpMean || []), { time: now, value: httpMean }].slice(-20);
                    return { cpu: newCpu, systemCpu: newSystemCpu, memory: newMemory, mongoFind: newMongoFind, mongoAgg: newMongoAgg, httpMean: newHttpMean };
                });
            });
            return () => cancelAnimationFrame(raf);
        }
    }, [metrics]);

    const handleRefresh = () => {
        refetchStats();
        refetchDeployments();
        refetchMetrics();
        refetchStatusSummary();
    };

    useToolbar([
        { id: 'refresh', label: 'Refresh', icon: RefreshCw, onClick: handleRefresh, isLoading: statsLoading || deploymentsLoading },
    ]);

    const StatCard = ({ title, value, icon: Icon, loading, index = 0 }: any) => (
        <Card
            size="2"
            className="glass-card hover-lift"
            style={{
                animationDelay: `${index * 0.1}s`,
                background: 'var(--glass-bg)',
            }}
        >
            <Flex direction="column" gap="2">
                <Flex align="center" justify="between">
                    <Text size="2" color="gray" weight="medium">{title}</Text>
                    <div className="p-2 rounded-lg bg-(--accent-a3) float">
                        <Icon size={18} className={`text-(--accent-9) dash-icon`} />
                    </div>
                </Flex>
                {loading ? (
                    <Skeleton height="32px" width="100px" />
                ) : (
                    <Heading size="7" className="bg-linear-to-r from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent">
                        {value}
                    </Heading>
                )}
            </Flex>
        </Card>
    );


    const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

    return (
        <Flex direction="column" gap="4">
            <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4">
                <StatCard
                    title="Environments"
                    value={stats?.totalEnvironments}
                    icon={Waypoints}
                    color="blue"
                    loading={statsLoading}
                    index={0}
                />
                <StatCard
                    title="Resource Classes"
                    value={stats?.totalResources}
                    icon={Boxes}
                    color="purple"
                    loading={statsLoading}
                    index={1}
                />
                <StatCard
                    title="Active Runs"
                    index={2}
                    value={stats?.activeDeployments}
                    icon={Activity}
                    color="orange"
                    loading={statsLoading}
                />
                <StatCard
                    title="Success Rate"
                    value={`${stats?.successRate?.toFixed(1)}%`}
                    icon={CheckCircle2}
                    color="green"
                    loading={statsLoading}
                    index={3}
                />
            </Grid>

            <Grid columns={{ initial: '1', lg: '3' }} gap="4">
                <Box className="lg:col-span-2">
                    <Card size="3" className="glass-card" style={{ background: 'var(--glass-bg)', height: '100%' }}>
                        <Flex direction="column" gap="3">
                            <Flex align="center" justify="between">
                                <Heading size="4" className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">Recent Deployment Activity</Heading>
                                <Flex align="center" gap="3">
                                    <Tabs.Root value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                                        <Tabs.List size="1">
                                            <Tabs.Trigger value="table">
                                                <Flex align="center" gap="1">
                                                    <LayoutList size={14} /> Table
                                                </Flex>
                                            </Tabs.Trigger>
                                            <Tabs.Trigger value="timeline">
                                                <Flex align="center" gap="1">
                                                    <Tally4 size={14} className="rotate-90" /> Timeline
                                                </Flex>
                                            </Tabs.Trigger>
                                        </Tabs.List>
                                    </Tabs.Root>
                                    <Button variant="ghost" size="1" onClick={() => navigate('/environments/definitions')}>
                                        View All <ArrowUpRight size={14} />
                                    </Button>
                                </Flex>
                            </Flex>
                            <Separator size="4" />
                            {deploymentsLoading ? (
                                <Flex direction="column" gap="2">
                                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                                </Flex>
                            ) : (
                                viewMode === 'table' ? (
                                    <DeploymentTable deployments={deployments} onNavigate={navigate} />
                                ) : (
                                    <DeploymentTimeline deployments={deployments || []} />
                                )
                            )}
                        </Flex>
                    </Card>
                </Box>

                <Box>
                    <Card size="3" className="h-full glass-card" style={{ background: 'var(--glass-bg)' }}>
                        <Flex direction="column" gap="3">
                            <Heading size="4" className="bg-linear-to-r from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent">Quick Actions</Heading>
                            <Separator size="4" />
                            <Flex direction="column" gap="2">
                                <Button
                                    variant="soft"
                                    highContrast
                                    onClick={() => navigate('/environments/definitions')}
                                    style={{ justifyContent: 'start' }}
                                >
                                    <Waypoints size={16}/> Manage Environments
                                </Button>
                                <Button
                                    variant="soft"
                                    highContrast
                                    onClick={() => navigate('/resources/definitions')}
                                    style={{ justifyContent: 'start' }}
                                >
                                    <Boxes size={16} /> Configure Resources
                                </Button>
                            </Flex>

                            <Box mt="4">
                                <Heading size="2" mb="2" className="bg-linear-to-r from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent flex items-center gap-2">
                                    <Boxes size={16} className="text-(--accent-9) transition-all duration-1000 ease-linear" /> Resource Distribution
                                </Heading>
                                <Separator size="2" mb="2" />
                                <Flex direction="column" gap="2">
                                    {stats?.distribution && Object.entries(stats.distribution).map(([category, count], idx) => (
                                        <Flex key={category} direction="column" gap="1" className="stagger-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                                            <Flex justify="between">
                                                <Text size="1" weight="medium">{category}</Text>
                                                <Text size="1" color="gray">{count}</Text>
                                            </Flex>
                                            <Box
                                                style={{
                                                    height: '6px',
                                                    background: 'var(--gray-a3)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <Box
                                                    className="shimmer"
                                                    style={{
                                                        height: '100%',
                                                        width: `${(count / (stats.totalResources || 1)) * 100}%`,
                                                        background: 'linear-gradient(90deg, var(--accent-9), var(--accent-7))',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                />
                                            </Box>
                                        </Flex>
                                    ))}
                                    {(!stats?.distribution || Object.keys(stats.distribution).length === 0) && (
                                        <Text size="1" color="gray">No resources defined.</Text>
                                    )}
                                </Flex>
                            </Box>
                        </Flex>
                    </Card>
                </Box>
            </Grid>

            <Grid columns={{ initial: '1', lg: '2' }} gap="4" className="lg:col-span-2">
                <Card size="3" className="glass-card" style={{ background: 'var(--glass-bg)', height: '100%' }}>
                    <Flex direction="column" gap="3">
                        <Box>
                            <Heading size="4" mb="2" className="bg-linear-to-r from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent flex items-center gap-2">
                                <Sigma size={20} className="text-(--accent-9) transition-all duration-1000 ease-linear" /> Platform Status Summary
                            </Heading>
                            <Separator size="4" mb="3" />
                            <Blockquote size="2" color="gray">
                                { systemSummaryLoading
                                    ? <Skeleton height="20px" />
                                    :
                                    <>
                                        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                                    code: ({ children }) => <code className="bg-[var(--gray-4)] px-1 rounded text-[12px]">{children}</code>,
                                                    pre: ({ children }) => <pre className="bg-[var(--gray-4)] p-2 rounded my-2 overflow-x-auto text-[12px]">{children}</pre>,
                                                    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-9)] underline">{children}</a>,
                                                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                }}
                                            >
                                                {summary}
                                            </ReactMarkdown>
                                        </div>
                                    </>
                                }
                            </Blockquote>
                        </Box>
                    </Flex>
                </Card>

                {metrics?.processMetrics && (
                    <Card size="3" className="glass-card" style={{ background: 'var(--glass-bg)', height: '100%' }}>
                        <Flex direction="column" gap="3" height="100%">
                            <Box>
                                <Heading size="4" mb="2" className="bg-linear-to-r from-(--gray-12) to-(--accent-11) bg-clip-text text-transparent flex items-center gap-2">
                                    <HeartPulse size={20} className="text-(--accent-9) transition-all duration-1000 ease-linear" /> Backend System Info
                                </Heading>
                                <Separator size="4" mb="3" />
                                <Grid columns={{ initial: '1', md: '2' }} gap="4">
                                    <Box>
                                        <Flex justify="between" align="center" mb="1">
                                            <Flex align="center" gap="1">
                                                <Cpu size={14} color="gray" />
                                                <Text size="2" color="gray">Process CPU Usage</Text>
                                            </Flex>
                                            <Text size="2" weight="bold">
                                                {(metrics.processMetrics['process.cpu.usage'] ? (metrics.processMetrics['process.cpu.usage'] * 100).toFixed(2) : 0)}%
                                            </Text>
                                        </Flex>
                                        <MiniChart data={history.cpu.map(d => d.value)} color="var(--accent-9)" width={200} height={30} />
                                    </Box>

                                    <Box>
                                        <Flex justify="between" align="center" mb="1">
                                            <Flex align="center" gap="1">
                                                <Cpu size={14} color="gray" />
                                                <Text size="2" color="gray">System CPU Usage</Text>
                                            </Flex>
                                            <Text size="2" weight="bold">
                                                {(metrics.processMetrics['system.cpu.usage'] ? (metrics.processMetrics['system.cpu.usage'] * 100).toFixed(2) : 0)}%
                                            </Text>
                                        </Flex>
                                        <MiniChart data={history.systemCpu.map(d => d.value)} color="var(--accent-9)" width={200} height={30} />
                                    </Box>

                                    <Box>
                                        <Flex justify="between" align="center" mb="1">
                                            <Flex align="center" gap="1">
                                                <Database size={14} color="gray" />
                                                <Text size="2" color="gray">Mongo Find (avg)</Text>
                                            </Flex>
                                            <Text size="2" weight="bold">
                                                {history.mongoFind.length > 0 ? history.mongoFind[history.mongoFind.length - 1].value.toFixed(2) : 0} ms
                                            </Text>
                                        </Flex>
                                        <MiniChart data={history.mongoFind.map(d => d.value)} color="var(--blue-9)" width={200} height={30} />
                                    </Box>

                                    <Box>
                                        <Flex justify="between" align="center" mb="1">
                                            <Flex align="center" gap="1">
                                                <Zap size={14} color="gray" />
                                                <Text size="2" color="gray">Mongo Agg (avg)</Text>
                                            </Flex>
                                            <Text size="2" weight="bold">
                                                {history.mongoAgg.length > 0 ? history.mongoAgg[history.mongoAgg.length - 1].value.toFixed(2) : 0} ms
                                            </Text>
                                        </Flex>
                                        <MiniChart data={history.mongoAgg.map(d => d.value)} color="var(--orange-9)" width={200} height={30} />
                                    </Box>

                                    <Box>
                                        <Flex justify="between" align="center" mb="1">
                                            <Flex align="center" gap="1">
                                                <Globe size={14} color="gray" />
                                                <Text size="2" color="gray">HTTP Response (avg)</Text>
                                            </Flex>
                                            <Text size="2" weight="bold">
                                                {history.httpMean.length > 0 ? history.httpMean[history.httpMean.length - 1].value.toFixed(2) : 0} ms
                                            </Text>
                                        </Flex>
                                        <MiniChart data={history.httpMean.map(d => d.value)} color="var(--teal-9)" width={200} height={30} />
                                    </Box>

                                    <Box>
                                        <Flex justify="between" align="center" mb="1">
                                            <Flex align="center" gap="1">
                                                <MemoryStick size={14} color="gray" />
                                                <Text size="2" color="gray">JVM Memory</Text>
                                            </Flex>
                                            <Text size="2" weight="bold">
                                                {(metrics.processMetrics['jvm.memory.used'] ? (metrics.processMetrics['jvm.memory.used'] / 1024 / 1024).toFixed(2) : 0)} MB
                                            </Text>
                                        </Flex>
                                        <MiniChart data={history.memory.map(d => d.value)} color="var(--purple-9)" width={200} height={30} />
                                    </Box>
                                </Grid>

                                <Box mt="4">
                                    <Flex align="center" gap="2" mb="2">
                                        <BarChart3 size={16} color="gray" />
                                        <Text size="2" color="gray">HTTP Response Statuses</Text>
                                    </Flex>
                                    <Flex gap="1" style={{ height: '24px', width: '100%', borderRadius: '4px', overflow: 'hidden', background: 'var(--gray-a3)' }}>
                                        {metrics.httpMetrics && Object.entries(metrics.httpMetrics.cumulative)
                                            .filter(([key]) => key.startsWith('count.'))
                                            .map(([key, value]) => {
                                                const status = key.split('.')[1];
                                                const total = metrics.httpMetrics?.cumulative['total.count'] || 1;
                                                const percentage = (value / total) * 100;
                                                const getColor = (s: string) => {
                                                    if (s.startsWith('2')) return 'var(--green-9)';
                                                    if (s.startsWith('3')) return 'var(--cyan-9)';
                                                    if (s.startsWith('4')) return 'var(--orange-9)';
                                                    if (s.startsWith('5')) return 'var(--red-9)';
                                                    return 'var(--gray-9)';
                                                };
                                                if (percentage === 0) return null;
                                                return (
                                                    <Box 
                                                        key={status} 
                                                        style={{ 
                                                            width: `${percentage}%`, 
                                                            height: '100%', 
                                                            background: getColor(status),
                                                            transition: 'width 0.5s ease-in-out'
                                                        }} 
                                                        title={`${status}: ${value} (${percentage.toFixed(1)}%)`}
                                                    />
                                                );
                                            })
                                        }
                                    </Flex>
                                    <Flex wrap="wrap" gap="3" mt="2">
                                        {metrics.httpMetrics && Object.entries(metrics.httpMetrics.cumulative)
                                            .filter(([key, value]) => key.startsWith('count.') && value > 0)
                                            .map(([key, value]) => {
                                                const status = key.split('.')[1];
                                                const getColor = (s: string) => {
                                                    if (s.startsWith('2')) return 'var(--green-9)';
                                                    if (s.startsWith('3')) return 'var(--cyan-9)';
                                                    if (s.startsWith('4')) return 'var(--orange-9)';
                                                    if (s.startsWith('5')) return 'var(--red-9)';
                                                    return 'var(--gray-9)';
                                                };
                                                return (
                                                    <Flex key={status} align="center" gap="1">
                                                        <Box style={{ width: '8px', height: '8px', borderRadius: '2px', background: getColor(status) }} />
                                                        <Text size="1" color="gray">{status}: <Text weight="bold" color="gray">{value}</Text></Text>
                                                    </Flex>
                                                );
                                            })
                                        }
                                    </Flex>
                                </Box>

                                <Grid columns="2" gap="4" mt="4">
                                    <Flex direction="column">
                                        <Text size="1" color="gray">Uptime</Text>
                                        <Text size="2" weight="medium">
                                            {metrics.processMetrics['process.uptime'] ? (metrics.processMetrics['process.uptime'] / 1000 / 3600).toFixed(2) : 0} h
                                        </Text>
                                    </Flex>
                                    <Flex direction="column">
                                        <Text size="1" color="gray">CPU Count</Text>
                                        <Text size="2" weight="medium">
                                            {metrics.processMetrics['system.cpu.count'] || 'n/a'}
                                        </Text>
                                    </Flex>
                                </Grid>
                            </Box>
                        </Flex>
                    </Card>
                )}
            </Grid>
        </Flex>
    );
};

export default Dashboard;
