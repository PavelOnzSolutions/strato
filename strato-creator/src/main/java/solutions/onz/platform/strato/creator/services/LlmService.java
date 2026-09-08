package solutions.onz.platform.strato.creator.services;

import com.azure.ai.openai.OpenAIClientBuilder;
import com.azure.core.credential.AzureKeyCredential;
import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import solutions.onz.platform.strato.creator.forge.services.AzureResourceManagerService;
import solutions.onz.platform.strato.creator.forge.services.DeploymentsService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationSchemaService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptRequest;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptResponse;
import solutions.onz.platform.strato.creator.services.dto.llm.ToolCall;
import com.microsoft.semantickernel.Kernel;
import com.microsoft.semantickernel.aiservices.openai.chatcompletion.OpenAIChatCompletion;
import com.microsoft.semantickernel.orchestration.InvocationContext;
import com.microsoft.semantickernel.orchestration.PromptExecutionSettings;
import com.microsoft.semantickernel.orchestration.ToolCallBehavior;
import com.microsoft.semantickernel.services.chatcompletion.ChatCompletionService;
import com.microsoft.semantickernel.services.chatcompletion.ChatHistory;
import com.microsoft.semantickernel.services.chatcompletion.ChatMessageContent;
import com.microsoft.semantickernel.plugin.KernelPluginFactory;
import com.microsoft.semantickernel.services.chatcompletion.AuthorRole;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import io.micrometer.context.ContextRegistry;
import reactor.core.publisher.Hooks;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The LlmService class provides core functionality for handling
 * interactions with a large language model (LLM). It is responsible for
 * processing prompts, managing deployments, executing actions, and
 * integrating with external services and plugins.
 *
 * This class relies on various services and plugins including
 * AzureService, EnvironmentsService, ConfigurationService,
 * ConfigurationSchemaService, DeploymentsService, ResourceService,
 * GraphService, and others for its operations. Additionally, it utilizes
 * an object mapper for JSON processing and a kernel for managing LLM-related
 * tasks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlmService {

    private final ApplicationProperties properties;
    private final AzureResourceManagerService azureService;
    private final EnvironmentsService environmentsService;
    private final ConfigurationService configurationService;
    private final ConfigurationSchemaService configurationSchemaService;
    private final DeploymentsService deploymentsService;
    private final ResourceService resourceService;
    private final MsGraphService graphService;
    private final AzureArchitecturePlugin architecturePlugin;
    private final SystemMonitoringPlugin monitoringPlugin;
    private final ObjectMapper objectMapper;

    private Kernel kernel;

    @PostConstruct
    public void init() {
        Hooks.enableAutomaticContextPropagation();
        ContextRegistry.getInstance().registerThreadLocalAccessor(
                "securityContext",
                SecurityContextHolder::getContext,
                SecurityContextHolder::setContext,
                SecurityContextHolder::clearContext
        );
        if (properties.getLlm().getApiKey() == null || properties.getLlm().getApiKey().isEmpty()) {
            log.warn("LLM API Key is missing. LlmService will not be functional.");
            return;
        }

        var openAIAsyncClient = new OpenAIClientBuilder()
                .endpoint(properties.getLlm().getEndpoint())
                .credential(new AzureKeyCredential(properties.getLlm().getApiKey()))
                .buildAsyncClient();

        ChatCompletionService chatCompletionService = OpenAIChatCompletion.builder()
                .withModelId(properties.getLlm().getDeploymentName())
                .withOpenAIAsyncClient(openAIAsyncClient)
                .build();

        this.kernel = Kernel.builder()
                .withAIService(ChatCompletionService.class, chatCompletionService)
                .withPlugin(KernelPluginFactory.createFromObject(AzureResourceManagerService.class, azureService,
                        "AzureRM"))
                .withPlugin(KernelPluginFactory.createFromObject(EnvironmentsService.class, environmentsService,
                        "Environments"))
                .withPlugin(KernelPluginFactory.createFromObject(ConfigurationService.class, configurationService, "Configurations"))
                .withPlugin(KernelPluginFactory.createFromObject(ConfigurationSchemaService.class, configurationSchemaService, "ConfigurationSchemas"))
                .withPlugin(KernelPluginFactory.createFromObject(ResourceService.class, resourceService, "Resources"))
                .withPlugin(KernelPluginFactory.createFromObject(DeploymentsService.class, deploymentsService,
                        "Deployments"))
                .withPlugin(KernelPluginFactory.createFromObject(MsGraphService.class, graphService, "MsGraph"))
                .withPlugin(KernelPluginFactory.createFromObject(AzureArchitecturePlugin.class, architecturePlugin,
                        "AzureArchitecture"))
                .withPlugin(KernelPluginFactory.createFromObject(SystemMonitoringPlugin.class, monitoringPlugin,
                        "SystemMonitoring"))
 //               .withPlugin(KernelPluginFactory.createFromObject(WebUIControllerPlugin.class,
 //                       new WebUIControllerPlugin(), "WebUI"))
                .build();
    }

    public PromptResponse processPrompt(PromptRequest request) {
        if (kernel == null) {
            return new PromptResponse("LLM Service is not configured. Please provide API Key and Endpoint.", List.of());
        }

        ChatHistory chatHistory = new ChatHistory(properties.getLlm().getSystemPrompt());

        // Inject user identity and permissions so the LLM knows who is calling
        String userContext = buildUserContextMessage();
        if (userContext != null) {
            chatHistory.addSystemMessage(userContext);
        }

        // Add conversation history if available
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            for (var message : request.getHistory()) {
                if ("user".equalsIgnoreCase(message.getRole())) {
                    chatHistory.addUserMessage(message.getContent());
                } else if ("assistant".equalsIgnoreCase(message.getRole())) {
                    chatHistory.addAssistantMessage(message.getContent());
                }
            }
        }

        chatHistory.addUserMessage(request.getPrompt() + " (If you need to use a tool to answer this, please do so.)");

        ChatCompletionService chatCompletion;
        try {
            chatCompletion = kernel.getService(ChatCompletionService.class);
        } catch (Exception e) {
            log.error("ChatCompletionService not found: {}", e.getMessage());
            return new PromptResponse("Error: ChatCompletionService not found.", List.of());
        }


        PromptExecutionSettings executionSettings = PromptExecutionSettings.builder()
                .withTemperature(0.0)
                .build();
        InvocationContext invocationContext = InvocationContext.builder()
                .withToolCallBehavior(ToolCallBehavior.allowAllKernelFunctions(true))
                .withPromptExecutionSettings(executionSettings)
                .build();

        log.debug("Sending prompt to LLM. History size: {}", chatHistory.getMessages().size());
        log.debug("System prompt: {}", properties.getLlm().getSystemPrompt());
        log.debug("User prompt: {}", request.getPrompt());

        if (kernel.getPlugins() != null) {
            log.debug("Registered plugins: {}",
                    kernel.getPlugins().stream().map(p -> p.getName()).collect(Collectors.joining(", ")));
            for (var plugin : kernel.getPlugins()) {
                log.debug("  Plugin {}: functions: {}", plugin.getName(), plugin.getFunctions().keySet());
            }
        }

        List<ChatMessageContent<?>> results;
        try {
            results = chatCompletion.getChatMessageContentsAsync(chatHistory, kernel, invocationContext)
                    .contextCapture()
                    .block();
            log.debug("Received results from LLM. Results size: {}", results != null ? results.size() : "null");
            if (results != null) {
                for (int i = 0; i < results.size(); i++) {
                    log.debug("Result[{}]: {}", i, results.get(i));
                }
            }
        } catch (Exception e) {
            if (containsAccessDeniedException(e)) {
                log.warn("Access denied during LLM function invocation: {}", e.getMessage());
                return new PromptResponse(
                        "You do not have the required permissions to perform the requested operation. "
                                + "Please contact your administrator to request the necessary access.",
                        List.of());
            }
            log.error("Error getting chat completion: {}", e.getMessage(), e);
            return new PromptResponse("Error: " + e.getMessage(), List.of());
        }

        if (results == null || results.isEmpty()) {
            log.warn("LLM returned null or empty results list for prompt: {}", request.getPrompt());
            return new PromptResponse("The LLM did not return any content. Please try again.", List.of());
        }

        ChatMessageContent<?> lastMessage = results.get(results.size() - 1);
        String lastContent = lastMessage.getContent();
        log.debug("Last message content: '{}'", lastContent);
        log.debug("Last message author: {}", lastMessage.getAuthorRole());
        log.debug("Last message items count: {}",
                lastMessage.getItems() != null ? lastMessage.getItems().size() : "null");
        if (lastMessage.getMetadata() != null) {
            log.debug("Last message metadata: {}", lastMessage.getMetadata());
        }

        if (lastMessage.getItems() != null) {
            for (Object item : lastMessage.getItems()) {
                log.debug("Item: {}. Class: {}", item, item.getClass().getName());
                for (var method : item.getClass().getMethods()) {
                    if (method.getName().startsWith("get") && method.getParameterCount() == 0) {
                        try {
                            log.debug("  {} = {}", method.getName(), method.invoke(item));
                        } catch (Exception ignore) {
                        }
                    }
                }
            }
        }

        List<ToolCall> actions = new java.util.ArrayList<>();
        for (ChatMessageContent<?> result : results) {
            log.debug("Processing result from {}: items size={}", result.getAuthorRole(),
                    result.getItems() != null ? result.getItems().size() : "null");
            if (result.getAuthorRole() == AuthorRole.ASSISTANT && result.getItems() != null) {
                for (Object item : result.getItems()) {
                    String className = item.getClass().getSimpleName();
                    if (className.contains("ToolCall") || className.contains("FunctionCall")) {
                        try {
                            String pluginName = (String) item.getClass().getMethod("getPluginName").invoke(item);
                            String functionName = (String) item.getClass().getMethod("getFunctionName").invoke(item);
                            @SuppressWarnings("unchecked")
                            Map<String, Object> arguments = (Map<String, Object>) item.getClass()
                                    .getMethod("getArguments").invoke(item);
                            log.debug("Detected tool call: {}.{} with arguments: {}", pluginName, functionName,
                                    arguments);
                            actions.add(new ToolCall(pluginName, functionName, arguments));
                        } catch (Exception e) {
                            log.warn("Failed to extract tool call from {}: {}", className, e.getMessage());
                        }
                    }
                }
            }
        }

        String answer = lastContent;
        if (answer == null || answer.isBlank()) {
            if (!actions.isEmpty()) {
                answer = "I need to perform some actions to answer your request. Do you want me to proceed?";
            } else {
                answer = "The LLM returned an empty response. Please try rephrasing your request.";
            }
        }

        return new PromptResponse(answer, actions);
    }

    public String executeConfirmedActions(List<ToolCall> actions) {
        if (kernel == null) {
            return "LLM Service is not configured.";
        }

        StringBuilder results = new StringBuilder();
        for (ToolCall action : actions) {
            log.debug("Executing confirmed action: {}.{} with arguments: {}", action.getPluginName(),
                    action.getFunctionName(), action.getArguments());
            try {
                var function = kernel.getFunction(action.getPluginName(), action.getFunctionName());
                com.microsoft.semantickernel.semanticfunctions.KernelFunctionArguments arguments = null;
                if (action.getArguments() != null) {
                    var builder = com.microsoft.semantickernel.semanticfunctions.KernelFunctionArguments.builder();
                    for (var entry : action.getArguments().entrySet()) {
                        try {
                            builder.getClass().getMethod("withVariable", String.class, Object.class).invoke(builder,
                                    entry.getKey(), entry.getValue());
                        } catch (Exception ex) {
                            try {
                                builder.getClass().getMethod("withInput", Object.class).invoke(builder,
                                        entry.getValue());
                            } catch (Exception ex2) {
                                log.warn("Failed to set argument {}: {}", entry.getKey(), ex2.getMessage());
                            }
                        }
                    }
                    arguments = builder.build();
                }
                var result = kernel.invokeAsync(function)
                        .withArguments(arguments)
                        .contextCapture()
                        .block();
                Object resultValue = result.getResult();
                String formattedResult = String.valueOf(resultValue);
                log.debug("Action {}.{} execution result: {}", action.getPluginName(), action.getFunctionName(),
                        formattedResult);
                results.append(action.getFunctionName()).append(": ").append(formattedResult).append("\n");
            } catch (Exception e) {
                if (containsAccessDeniedException(e)) {
                    log.warn("Access denied for action {}.{}: {}", action.getPluginName(), action.getFunctionName(), e.getMessage());
                    results.append(action.getFunctionName()).append(": Access Denied - You do not have the required permissions for this operation.\n");
                } else {
                    log.error("Failed to execute action {}: {}", action.getFunctionName(), e.getMessage());
                    results.append(action.getFunctionName()).append(": Failed - ").append(e.getMessage()).append("\n");
                }
            }
        }

        return results.toString();
    }

    private String buildUserContextMessage() {
        try {
            String username = SecurityUtils.getCurrentUserLogin();
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return null;
            }
            List<String> permissions = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(a -> a.startsWith("PERM_"))
                    .collect(Collectors.toList());

            return String.format(
                    "Current user: %s. Granted permissions: %s. "
                            + "Only invoke functions that the user has permissions for. "
                            + "If the user lacks a required permission, explain what permission is needed instead of calling the function.",
                    username,
                    permissions.isEmpty() ? "none" : String.join(", ", permissions));
        } catch (Exception e) {
            log.debug("Could not build user context message: {}", e.getMessage());
            return null;
        }
    }

    private boolean containsAccessDeniedException(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof AccessDeniedException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
