package solutions.onz.platform.strato.creator.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.actuate.logging.LogFileWebEndpoint;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemMonitoringPluginTest {

    @Mock
    private LogFileWebEndpoint logFileWebEndpoint;

    @InjectMocks
    private SystemMonitoringPlugin systemMonitoringPlugin;

    @Test
    void testGetSystemLog() throws IOException {
        String logContent = "line1\nline2\nline3";
        Resource resource = new ByteArrayResource(logContent.getBytes(StandardCharsets.UTF_8));
        when(logFileWebEndpoint.logFile()).thenReturn(resource);

        String result = systemMonitoringPlugin.getSystemLog(0, 5);
        assertEquals("line1", result);

        result = systemMonitoringPlugin.getSystemLog(6, 11);
        assertEquals("line2", result);
    }

    @Test
    void testGetSystemLogRecent() throws IOException {
        String logContent = "line1\nline2\nline3";
        Resource resource = new ByteArrayResource(logContent.getBytes(StandardCharsets.UTF_8));
        when(logFileWebEndpoint.logFile()).thenReturn(resource);

        String result = systemMonitoringPlugin.getSystemLogRecent(5);
        assertEquals("line3", result);

        result = systemMonitoringPlugin.getSystemLogRecent(100);
        assertEquals(logContent, result);
    }
}
