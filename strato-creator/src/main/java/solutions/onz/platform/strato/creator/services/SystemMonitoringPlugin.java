package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.management.OperationalMetricsEndpoint;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.SystemHealth;
import org.springframework.boot.actuate.logging.LogFileWebEndpoint;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SystemMonitoringPlugin {

    private final HealthEndpoint healthEndpoint;
    private final OperationalMetricsEndpoint stratoMetricsEndpoint;
    private final LogFileWebEndpoint logFileWebEndpoint;

    @PreAuthorize("hasAuthority(@permissions.HEALTH_READ)")
    @DefineKernelFunction(name = "get_system_health", description = "Retrieves the overall system health status and details from Actuator health endpoint")
    public Map<String, HealthComponent> getSystemHealth() {
        log.debug("Retrieving system health via HealthEndpoint");
        SystemHealth health = (SystemHealth) healthEndpoint.health();
        return health.getComponents();
    }

    @PreAuthorize("hasAuthority(@permissions.HEALTH_READ)")
    @DefineKernelFunction(name = "get_system_metrics", description = "Retrieves internal system metrics including process, cache, and database metrics")
    public Map<String, Object> getSystemMetrics() {
        log.debug("Retrieving system metrics via OperationalMetricsEndpoint");
        return stratoMetricsEndpoint.allMetrics();
    }

    @PreAuthorize("hasAuthority(@permissions.PLATFORM_READ)")
    @DefineKernelFunction(name = "get_system_log", description = "Retrieves the application log file from given byte range")
    public String getSystemLog(int bytesFrom, int bytesTo) {
        log.debug("Retrieving system log from {} to {}", bytesFrom, bytesTo);
        if (logFileWebEndpoint == null) {
            return "Log file endpoint is not available";
        }
        Resource logFile = logFileWebEndpoint.logFile();
        if (logFile == null || !logFile.exists()) {
            return "Log file not found";
        }
        try (var inputStream = logFile.getInputStream()) {
            long skipped = inputStream.skip(bytesFrom);
            if (skipped < bytesFrom) {
                return "";
            }
            int length = bytesTo - bytesFrom;
            if (length <= 0) {
                return "";
            }
            byte[] bytes = inputStream.readNBytes(length);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to read log file", e);
            return "Error reading log file: " + e.getMessage();
        }
    }

    @PreAuthorize("hasAuthority(@permissions.PLATFORM_READ)")
    @DefineKernelFunction(name = "get_system_log_recent", description = "Retrieves the recent application log file")
    public String getSystemLogRecent(int bytes) {
        log.debug("Retrieving recent {} bytes of system log", bytes);
        if (logFileWebEndpoint == null) {
            return "Log file endpoint is not available";
        }
        Resource logFile = logFileWebEndpoint.logFile();
        if (logFile == null || !logFile.exists()) {
            return "Log file not found";
        }
        try {
            long size = logFile.contentLength();
            int bytesToRead = (int) Math.min(size, bytes);
            long start = Math.max(0, size - bytesToRead);
            try (var inputStream = logFile.getInputStream()) {
                long skipped = inputStream.skip(start);
                if (skipped < start) {
                    return "";
                }
                byte[] data = inputStream.readNBytes(bytesToRead);
                return new String(data, StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            log.error("Failed to read log file", e);
            return "Error reading log file: " + e.getMessage();
        }
    }
}
