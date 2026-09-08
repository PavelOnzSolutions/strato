package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptRequest;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptResponse;
import com.microsoft.semantickernel.services.chatcompletion.AuthorRole;
import com.microsoft.semantickernel.services.chatcompletion.ChatCompletionService;
import com.microsoft.semantickernel.services.chatcompletion.ChatMessageContent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.microsoft.semantickernel.Kernel;

import com.microsoft.semantickernel.services.chatcompletion.ChatHistory;
import com.microsoft.semantickernel.orchestration.InvocationContext;
import reactor.core.publisher.Mono;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LlmServiceTest {

    @Mock
    private ApplicationProperties properties;
    @Mock
    private Kernel kernel;
    @Mock
    private ChatCompletionService chatCompletionService;

    @Mock
    private SystemMonitoringPlugin monitoringPlugin;
    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private LlmService llmService;

    @Test
    void testProcessPromptWithNullItemsInResult() throws Exception {
        // Arrange
        String prompt = "test prompt";
        ApplicationProperties.Llm llmProps = new ApplicationProperties.Llm();
        llmProps.setSystemPrompt("You are a helpful assistant.");
        when(properties.getLlm()).thenReturn(llmProps);

        // Inject the mocked kernel into the service since it's private and initialized in @PostConstruct
        java.lang.reflect.Field kernelField = LlmService.class.getDeclaredField("kernel");
        kernelField.setAccessible(true);
        kernelField.set(llmService, kernel);

        when(kernel.getService(ChatCompletionService.class)).thenReturn(chatCompletionService);

        ChatMessageContent<?> messageContent = mock(ChatMessageContent.class);
        when(messageContent.getAuthorRole()).thenReturn(AuthorRole.ASSISTANT);
        when(messageContent.getContent()).thenReturn("Response content");
        // This is what caused the NPE
        when(messageContent.getItems()).thenReturn(null);

        when(chatCompletionService.getChatMessageContentsAsync(any(ChatHistory.class), any(Kernel.class), any(InvocationContext.class)))
                .thenReturn(Mono.just(Collections.singletonList(messageContent)));

        // Act & Assert
        assertDoesNotThrow(() -> {
            PromptRequest request = new PromptRequest();
            request.setPrompt(prompt);
            PromptResponse response = llmService.processPrompt(request);
            assertNotNull(response);
            assertEquals("Response content", response.getAnswer());
            assertTrue(response.getActions().isEmpty());
        });
    }
}
