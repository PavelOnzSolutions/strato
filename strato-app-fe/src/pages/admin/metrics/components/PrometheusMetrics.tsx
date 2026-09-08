import {PrometheusMetric} from "../Metrics.tsx";
import {Badge, Card, Code, Flex, Grid, Table, Text} from "@radix-ui/themes";
import {useTranslation} from "react-i18next";
import React, {Fragment} from "react";
import {formatDoublePrecisionWithSuffix, lowerKebabCaseToLabel} from "../../../../utils/utils.ts";
import {AccentColor, accentColors} from "../../../../context/ThemeContext.tsx";
import MiniChart from "../../../../components/graphs/MiniChart.tsx";

const getCategoryColor = (name: string) => {
    const category = name.split('_')[0];
    const colors: Record<string, AccentColor> = {
        'jvm': 'red',
        'disk': 'pink',
        'process': 'cyan',
        'system': 'yellow',
        'http': 'orange',
        'logback': 'purple',
        'tomcat': 'teal',
        'strato': 'indigo',
        'executor': 'lime',
        'application': 'plum',
        'spring': 'green'
    };

    if (colors[category]) return colors[category];

    // Fallback: Generate a color based on the category string hash
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const accentIndex = Math.abs(hash) % accentColors.length;
    return accentColors[accentIndex];
};

interface PrometheusMetricsProps {
    viewMode: 'table' | 'grid' | 'raw';
    filteredMetrics: PrometheusMetric[];
    searchTerm: string;
    rawData?: string;
    history: Record<string, number[]>;
    showRate: boolean;
}

export const PrometheusMetrics: React.FC<PrometheusMetricsProps> = (
    {
        viewMode,
        filteredMetrics,
        searchTerm,
        rawData,
        history,
        showRate
    }) => {
    const { t } = useTranslation();

    if (viewMode === 'raw') {
        return (
            <Code variant="ghost" style={{ whiteSpace: 'pre-wrap', display: 'block', padding: '10px' }}>
                {searchTerm ? rawData?.split('\n').filter(l => l.toLowerCase().includes(searchTerm.toLowerCase())).join('\n') : rawData}
            </Code>
        );
    }

    if (viewMode === 'table') {
        return (
            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>{t('lbl_metric_name', 'Metric Name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('lbl_labels', 'Labels')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell align="right">{t('lbl_value', 'Value')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('lbl_history', 'History')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {filteredMetrics.map((m, idx) => (
                        <Table.Row key={`${m.name}-${JSON.stringify(m.labels)}-${idx}`}>
                            <Table.RowHeaderCell>
                                <Flex direction="column" gap="1">
                                    <Text weight="bold" size="2">{m.name}</Text>
                                    {m.help && <Text size="1" color="gray">{m.help}</Text>}
                                </Flex>
                            </Table.RowHeaderCell>
                            <Table.Cell>
                                <Flex wrap="wrap" gap="1">
                                    {Object.entries(m.labels).map(([k, v]) => (
                                        <Badge key={k} size="1" variant="outline" color={getCategoryColor(m.name) as any}>{k}={v}</Badge>
                                    ))}
                                </Flex>
                            </Table.Cell>
                            <Table.Cell align="right">
                                <Text weight="bold" style={{ color: getCategoryColor(m.name) }}>{formatDoublePrecisionWithSuffix(m.value)}</Text>
                            </Table.Cell>
                            <Table.Cell>
                                <MiniChart 
                                    data={history[`${m.name}${JSON.stringify(m.labels)}`] || []} 
                                    color={getCategoryColor(m.name)} 
                                />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        );
    }

    if (viewMode === 'grid') {
        return (
            <Grid columns={{ initial: '1', sm: '1', md: '2', lg: '3' }} gap="4" p="2">
                {filteredMetrics.filter(m => !isNaN(m.value)).map((m, idx) => {
                    const historyKey = `${m.name}${JSON.stringify(m.labels)}`;
                    const metricHistory = history[historyKey] || [];
                    
                    const rateHistory = [];
                    if (showRate && m.type?.toLowerCase() === 'counter' && metricHistory.length >= 2) {
                        for (let i = 1; i < metricHistory.length; i++) {
                            rateHistory.push(Math.max(0, metricHistory[i] - metricHistory[i - 1]));
                        }
                    }

                    return (
                        <Fragment key={`${m.name}-${JSON.stringify(m.labels)}-${idx}`}>
                            <Card>
                                <Flex direction="column" gap="2">
                                    <Text size="1" weight="bold" style={{ wordBreak: 'break-all' }}>{lowerKebabCaseToLabel(m.name)}{' '}
                                        <Badge variant="soft" color="gray">{m.name}</Badge>
                                    </Text>
                                    <Flex wrap="wrap" gap="1">
                                        {Object.entries(m.labels).map(([k, v]) => (
                                            <Badge key={k} size="1" variant="outline" color={getCategoryColor(m.name) as any}>{k}={v}</Badge>
                                        ))}
                                    </Flex>
                                    <Flex justify="between" align="end" mt="2">
                                        <Text size="5" weight="bold" style={{ color: getCategoryColor(m.name) }}>{formatDoublePrecisionWithSuffix(m.value)}</Text>
                                        <MiniChart 
                                            data={metricHistory} 
                                            color={getCategoryColor(m.name)} 
                                        />
                                    </Flex>
                                </Flex>
                            </Card>
                            {rateHistory.length > 0 && (
                                <Card>
                                    <Flex direction="column" gap="2">
                                        <Text size="1" weight="bold" style={{ wordBreak: 'break-all' }}>{lowerKebabCaseToLabel(m.name)} Rate{' '}
                                            <Badge variant="soft" color="gray">{m.name}_rate</Badge>
                                        </Text>
                                        <Flex wrap="wrap" gap="1">
                                            {Object.entries(m.labels).map(([k, v]) => (
                                                <Badge key={k} size="1" variant="outline" color={getCategoryColor(m.name) as any}>{k}={v}</Badge>
                                            ))}
                                            <Badge size="1" variant="soft" color="orange">RATE</Badge>
                                        </Flex>
                                        <Flex justify="between" align="end" mt="2">
                                            <Text size="5" weight="bold" style={{ color: getCategoryColor(m.name) }}>
                                                {formatDoublePrecisionWithSuffix(rateHistory[rateHistory.length - 1])}/s
                                            </Text>
                                            <MiniChart 
                                                data={rateHistory} 
                                                color={getCategoryColor(m.name)} 
                                            />
                                        </Flex>
                                    </Flex>
                                </Card>
                            )}
                        </Fragment>
                    );
                })}
            </Grid>
        );
    }

    return null;
};
