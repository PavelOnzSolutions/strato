/*
 * YAKOAI
 * Copyright (c) 2025 Pavel Onz @ Nekorporát s.r.o.
 * All rights reserved.
 */
package solutions.onz.platform.strato.creator.management;

import io.micrometer.core.instrument.*;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.distribution.ValueAtPercentile;
import io.micrometer.core.instrument.search.Search;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.actuate.endpoint.web.annotation.WebEndpoint;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@WebEndpoint(id = "strato-metrics")
public class OperationalMetricsEndpoint {
    private final MeterRegistry meterRegistry;

    public static final String MISSING_NAME_TAG_MESSAGE = "Missing name tag for metric {}";

    public OperationalMetricsEndpoint(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @ReadOperation
    public Map<String, Object> allMetrics() {
        Map<String, Object> results = new HashMap<>();
        results.put("processMetrics", processMetrics());
        results.put("cacheMetrics", cacheMetrics());
        results.put("databaseMetrics", databaseMetrics());
        results.put("httpMetrics", httpMetrics());
        return results;
    }

    private Map<String, Number> processMetrics() {
        Map<String, Number> resultsProcess = new HashMap<>();

        Collection<Gauge> gauges = Search.in(meterRegistry)
                .name(s -> s.contains("cpu") || s.contains("system") || s.contains("process") || s.contains("memory") || s.contains("heap"))
                .gauges();
        gauges.forEach(gauge -> resultsProcess.put(gauge.getId().getName(), gauge.value()));

        Collection<TimeGauge> timeGauges =
                Search.in(meterRegistry).name(s -> s.contains("process")).timeGauges();
        timeGauges.forEach(gauge -> resultsProcess.put(gauge.getId().getName(), gauge.value(TimeUnit.MILLISECONDS)));

        return resultsProcess;
    }

    private Map<String, Map<String, Number>> cacheMetrics() {
        Map<String, Map<String, Number>> resultsCache = new HashMap<>();

        Collection<FunctionCounter> counters = Search.in(meterRegistry)
                .name(s -> s.contains("cache") && !s.contains("hibernate"))
                .functionCounters();
        counters.forEach(counter -> {
            String key = counter.getId().getName();
            String name = counter.getId().getTag("name");
            if (name != null) {
                resultsCache.putIfAbsent(name, new HashMap<>());
                if (counter.getId().getTag("result") != null) {
                    key += "." + counter.getId().getTag("result");
                }
                resultsCache.get(name).put(key, counter.count());
            } else {
                log.warn(MISSING_NAME_TAG_MESSAGE, key);
            }
        });

        Collection<Gauge> gauges =
                Search.in(meterRegistry).name(s -> s.contains("cache")).gauges();
        gauges.forEach(gauge -> {
            String key = gauge.getId().getName();
            String name = gauge.getId().getTag("name");
            if (name != null) {
                resultsCache.putIfAbsent(name, new HashMap<>());
                resultsCache.get(name).put(key, gauge.value());
            } else {
                log.warn(MISSING_NAME_TAG_MESSAGE, key);
            }
        });
        return resultsCache;
    }

    private Map<String, Map<String, Number>> httpMetrics() {
        Map<String, Map<String, Number>> resultsHttp = new HashMap<>();
        Map<String, Number> cumulative = new HashMap<>();
        resultsHttp.put("cumulative", cumulative);

        Search.in(meterRegistry).name(s -> s.contains("http.server.requests")).timers().forEach(timer -> {
            String status = timer.getId().getTag("status");
            String outcome = timer.getId().getTag("outcome");

            String suffix = "";
            if (status != null) suffix = "." + status;

            long count = timer.count();
            double totalTime = timer.totalTime(TimeUnit.MILLISECONDS);
            double max = timer.max(TimeUnit.MILLISECONDS);

            // Cumulative (global) aggregations
            cumulative.put("count" + suffix, cumulative.getOrDefault("count" + suffix, 0).longValue() + count);
            cumulative.put("max" + suffix, Math.max(cumulative.getOrDefault("max" + suffix, 0).doubleValue(), max));
            cumulative.put("totalTime" + suffix, cumulative.getOrDefault("totalTime" + suffix, 0).doubleValue() + totalTime);

            cumulative.put("total.count", cumulative.getOrDefault("total.count", 0).longValue() + count);
            cumulative.put("total.max", Math.max(cumulative.getOrDefault("total.max", 0).doubleValue(), max));
            cumulative.put("total.time", cumulative.getOrDefault("total.time", 0).doubleValue() + totalTime);

            if (outcome != null && outcome.equals("SERVER_ERROR")) {
                cumulative.put("errors.server", cumulative.getOrDefault("errors.server", 0).longValue() + count);
            }
            if (outcome != null && outcome.equals("CLIENT_ERROR")) {
                cumulative.put("errors.client", cumulative.getOrDefault("errors.client", 0).longValue() + count);
            }
        });

        // Final mean calculations for cumulative
        for (String key : new ArrayList<>(cumulative.keySet())) {
            if (key.startsWith("count.")) {
                String suffix = key.substring("count".length());
                long cCount = cumulative.get(key).longValue();
                if (cCount > 0) {
                    cumulative.put("mean" + suffix, cumulative.get("totalTime" + suffix).doubleValue() / cCount);
                }
            }
        }
        if (cumulative.getOrDefault("total.count", 0).longValue() > 0) {
            cumulative.put("total.mean", cumulative.get("total.time").doubleValue() / cumulative.get("total.count").longValue());
        }

        return resultsHttp;
    }

    private Map<String, Object> databaseMetrics() {
        Map<String, Object> resultsDatabase = new HashMap<>();

        // HikariCP metrics
        Map<String, Map<String, Number>> hikariMetrics = new HashMap<>();
        Search.in(meterRegistry).name(s -> s.contains("hikari")).meters().forEach(meter -> {
            String poolName = meter.getId().getTag("pool");
            if (poolName == null) poolName = "default";

            hikariMetrics.putIfAbsent(poolName, new HashMap<>());
            Map<String, Number> poolMetrics = hikariMetrics.get(poolName);
            String metricName = meter.getId().getName();
            String shortName = metricName.substring(metricName.lastIndexOf('.') + 1);

            if (meter instanceof Timer timer) {
                poolMetrics.put(shortName + ".count", timer.count());
                poolMetrics.put(shortName + ".max", timer.max(TimeUnit.MILLISECONDS));
                poolMetrics.put(shortName + ".totalTime", timer.totalTime(TimeUnit.MILLISECONDS));
                poolMetrics.put(shortName + ".mean", timer.mean(TimeUnit.MILLISECONDS));

                ValueAtPercentile[] percentiles = timer.takeSnapshot().percentileValues();
                for (ValueAtPercentile percentile : percentiles) {
                    poolMetrics.put(shortName + "." + percentile.percentile(), percentile.value(TimeUnit.MILLISECONDS));
                }
            } else if (meter instanceof Gauge gauge) {
                poolMetrics.put(shortName, gauge.value());
            } else if (meter instanceof Counter counter) {
                poolMetrics.put(shortName, counter.count());
            } else if (meter instanceof FunctionCounter counter) {
                poolMetrics.put(shortName, counter.count());
            }
        });
        if (!hikariMetrics.isEmpty()) {
            resultsDatabase.put("hikari", hikariMetrics);
        }

        // MongoDB metrics
        Map<String, Map<String, Number>> mongoMetrics = new HashMap<>();
        Search.in(meterRegistry).name(s -> s.contains("mongodb")).meters().forEach(meter -> {
            String clusterId = meter.getId().getTag("cluster.id");
            if (clusterId == null) clusterId = "default";

            mongoMetrics.putIfAbsent(clusterId, new HashMap<>());
            Map<String, Number> clusterMetrics = mongoMetrics.get(clusterId);
            String metricName = meter.getId().getName();
            String shortName = metricName.substring(metricName.lastIndexOf('.') + 1);

            // Add command or server address if available to make it even more detailed
            String command = meter.getId().getTag("command");
            String serverAddress = meter.getId().getTag("server.address");
            String prefix = shortName;
            if (command != null) {
                prefix = command + "." + shortName;
            } else if (serverAddress != null) {
                prefix = serverAddress + "." + shortName;
            }

            if (meter instanceof Timer timer) {
                clusterMetrics.put(prefix + ".count", timer.count());
                clusterMetrics.put(prefix + ".max", timer.max(TimeUnit.MILLISECONDS));
                clusterMetrics.put(prefix + ".totalTime", timer.totalTime(TimeUnit.MILLISECONDS));
                clusterMetrics.put(prefix + ".mean", timer.mean(TimeUnit.MILLISECONDS));
            } else if (meter instanceof Gauge gauge) {
                clusterMetrics.put(prefix, gauge.value());
            } else if (meter instanceof Counter counter) {
                clusterMetrics.put(prefix, counter.count());
            }
        });

        // Also check for "mongo" (legacy or different versions might use it)
        Search.in(meterRegistry).name(s -> s.contains("mongo") && !s.contains("mongodb")).meters().forEach(meter -> {
            mongoMetrics.putIfAbsent("legacy", new HashMap<>());
            Map<String, Number> legacyMetrics = mongoMetrics.get("legacy");
            String metricName = meter.getId().getName();
            String shortName = metricName.substring(metricName.lastIndexOf('.') + 1);

            if (meter instanceof Gauge gauge) {
                legacyMetrics.put(shortName, gauge.value());
            } else if (meter instanceof Timer timer) {
                legacyMetrics.put(shortName + ".count", timer.count());
            }
        });

        if (!mongoMetrics.isEmpty()) {
            resultsDatabase.put("mongodb", mongoMetrics);
        }

        return resultsDatabase;
    }
}
