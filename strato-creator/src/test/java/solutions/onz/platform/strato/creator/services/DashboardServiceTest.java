package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptRequest;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private EnvironmentsService environmentsService;
    @Mock
    private ResourceRepository resourceRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private LlmService llmService;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void testGetSystemSummary() {
        // Arrange
        String prompt = "Provide a concise system summary based on the current system health and metrics. Use the SystemMonitoring plugin to gather data.";
        PromptResponse response = new PromptResponse("System is healthy.", List.of());
        
        when(llmService.processPrompt(any(PromptRequest.class))).thenReturn(response);

        // Act
        String summary = dashboardService.getSystemSummary();

        // Assert
        assertEquals("System is healthy.", summary);
        verify(llmService, times(1)).processPrompt(any(PromptRequest.class));
    }
}
