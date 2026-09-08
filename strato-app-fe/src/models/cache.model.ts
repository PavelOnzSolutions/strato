export interface CacheMetricValues {
    'cache.gets.miss': number;
    'cache.puts': number;
    'cache.gets.hit': number;
    'cache.removals': number;
    'cache.evictions': number;
    [key: string]: number;
}

export interface CacheMetrics {
    [cacheName: string]: CacheMetricValues;
}

export interface ProcessMetrics {
    'system.cpu.usage'?: number;
    'system.cpu.count'?: number;
    'process.start.time'?: number;
    'process.cpu.usage'?: number;
    'jvm.memory.used'?: number;
    'jvm.memory.committed'?: number;
    'process.uptime'?: number;
    [key: string]: number | undefined;
}

export interface MongoDbMetrics {
    [key: string]: {
        "find.commands.mean"?: number;
        "find.commands.count"?: number;
        "find.commands.totalTime"?: number;
        "find.commands.max"?: number;
        "getMore.commands.mean"?: number;
        "getMore.commands.count"?: number;
        "getMore.commands.totalTime"?: number;
        "getMore.commands.max"?: number;
        "aggregate.commands.mean"?: number;
        "aggregate.commands.count"?: number;
        "aggregate.commands.totalTime"?: number;
        "aggregate.commands.max"?: number;
        [key: string]: number | undefined;
    };
}

export interface HttpMetrics {
    cumulative: {
        "total.count": number;
        "total.mean": number;
        "total.time": number;
        "total.max": number;
        [key: string]: number;
    };
}

export interface OperationalMetricsResponse {
    cacheMetrics: CacheMetrics;
    databaseMetrics: {
        mongodb: MongoDbMetrics;
    };
    processMetrics: ProcessMetrics;
    httpMetrics?: HttpMetrics;
}

export interface FlatCacheMetric {
    name: string;
    metrics: CacheMetricValues;
}
