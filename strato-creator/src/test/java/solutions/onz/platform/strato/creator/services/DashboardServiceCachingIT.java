package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptRequest;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("local")
class DashboardServiceCachingIT {

    @Autowired
    private DashboardService dashboardService;

    @MockBean
    private LlmService llmService;

    @MockBean
    private EnvironmentsService environmentsService;

    @MockBean
    private ResourceRepository resourceRepository;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @Autowired
    private CacheManager cacheManager;

    @Test
    void testGetSystemSummaryIsCached() {
        // Arrange
        PromptResponse response = new PromptResponse("System is healthy.", List.of());
        when(llmService.processPrompt(any(PromptRequest.class))).thenReturn(response);

        // Act
        String firstCall = dashboardService.getSystemSummary();
        String secondCall = dashboardService.getSystemSummary();

        // Assert
        assertEquals("System is healthy.", firstCall);
        assertEquals("System is healthy.", secondCall);

        // Verify that llmService.processPrompt was called only once due to caching
        verify(llmService, times(1)).processPrompt(any(PromptRequest.class));
        
        // Verify cache contains the value
        assertNotNull(cacheManager.getCache("systemSummary"));
        assertEquals("System is healthy.", cacheManager.getCache("systemSummary").get(org.springframework.cache.interceptor.SimpleKey.EMPTY).get());
    }
}
