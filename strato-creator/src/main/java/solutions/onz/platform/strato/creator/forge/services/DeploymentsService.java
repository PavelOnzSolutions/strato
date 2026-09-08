package solutions.onz.platform.strato.creator.forge.services;

import com.azure.resourcemanager.resources.models.Deployment;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.*;
import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.ResourceNamingRule;
import solutions.onz.platform.strato.creator.domain.enums.CatalogItemType;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentNode;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentReference;
import solutions.onz.platform.strato.creator.services.AzureIdentityService;
import solutions.onz.platform.strato.creator.services.MsGraphService;
import solutions.onz.platform.strato.creator.services.ResourceService;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentPlan;
import solutions.onz.platform.strato.creator.services.dto.ResourceTemplate;
import com.azure.core.credential.TokenCredential;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentReferenceRepository;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentStatus;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
// TODO: Extract template processing into separate TemplateParserService, which produces a valid ARM template based on Environment object (use node config + defaults)
// TODO: This class became disgusting and requires heavy refactoring
@Service
@RequiredArgsConstructor
@Slf4j
public class DeploymentsService {

    private final MsGraphService msGraphService;
    private final AzureResourceManagerService azureResourceManagerService;
    private final AzureIdentityService azureIdentityService;
    private final ResourceService resourceService; // Assuming ResourceService exists to fetch ResourceClass by ID?
    private final AuditLogRepository auditLogLogRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EnvironmentReferenceRepository environmentReferenceRepository;
    private final ObjectMapper objectMapper;

    private final Map<String, DeploymentStatus> taskStatuses = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Deploys the given environment according to the plan.
     */
    @PreAuthorize("hasAuthority(@permissions.DEPLOYMENT_EXECUTE)")
    @Async
    @DefineKernelFunction(name = "deployEnvironment", description = "Deploys an environment based on the provided deployment plan")
    public void deploy(Environment env, DeploymentPlan plan, String taskId, String operatorLogin) {
        log.info("Starting deployment for environment: {} with {} steps, taskId: {}, operator: {}", env.getName(), plan.getOrder().size(), taskId, operatorLogin);

        updateStatus(taskId, env.getId(), "START", null);

        // Audit Start
        saveAuditLog(env, "START", AuditLogSeverity.INFO, null, taskId, operatorLogin);

        try {
            // Resolve context values early to have region etc. available for resource group creation
            Map<String, Object> contextValues = buildContextValues(null, null, env);

            // Check and create resource group if needed
            if (env.getConfig() != null && env.getConfig().getResourceGroup() != null) {
                EnvironmentConfig config = env.getConfig();
                // Ensure the context values (like resolved regionId) are available to the config
                if (contextValues.containsKey("regionId")) {
                    Map<String, Object> values = new HashMap<>(config.getValues() != null ? config.getValues() : Collections.emptyMap());
                    values.put("regionId", contextValues.get("regionId"));
                    config.setValues(values);
                }

                Map<String, String> tags = new HashMap<>();
                tags.put("stratoCare", "true");
                tags.put("stratoOperator", operatorLogin);
                tags.put("stratoEnvId", env.getId());
                tags.put("stratoEnvDocId", env.getDocumentId() != null ? env.getDocumentId().toString() : "");
                tags.put("stratoEnvVersion", env.getVersion() != null ? env.getVersion().toString() : "");
                tags.put("stratoLastModified", Instant.now().toString());

                log.debug("Ensuring resource group {} exists with tags: {}", config.getResourceGroup(), tags);
                azureResourceManagerService.createOrUpdateResourceGroup(config, tags);
            }

            // Map nodes for quick lookup
            Map<String, EnvironmentNode> nodeMap = new java.util.HashMap<>();
            if (env.getNodes() != null) {
                env.getNodes().forEach(n -> {
                    if (n.getId() != null) {
                        nodeMap.put(n.getId(), n);
                    }
                    if (n.getKey() != null) {
                        nodeMap.put(n.getKey(), n);
                    }
                });
            }

            // Map to store resolved outputs: NodeKey -> AttributeName -> Value
            Map<String, Map<String, Object>> resolvedOutputs = new HashMap<>();

            for (String nodeKey : plan.getOrder()) {
                EnvironmentNode node = nodeMap.get(nodeKey);
                if (node == null) {
                    log.warn("Node {} not found in environment, skipping.", nodeKey);
                    continue;
                }

                // Apply references from other nodes to this node's values
                if (env.getReferences() != null) {
                    for (EnvironmentReference ref : env.getReferences()) {
                        if (nodeKey.equals(ref.getToNode())) {
                            Map<String, Object> providerOutputs = resolvedOutputs.get(ref.getFromNode());
                            if (providerOutputs != null && providerOutputs.containsKey(ref.getFromAttribute())) {
                                Object value = providerOutputs.get(ref.getFromAttribute());
                                Map<String, Object> nodeValues = node.getValues();
                                if (nodeValues == null) {
                                    nodeValues = new HashMap<>();
                                    node.setValues(nodeValues);
                                }
                                // Inject into nested path if toAttribute contains dots
                                if (ref.getToAttribute().contains(".")) {
                                    injectNestedValue(nodeValues, ref.getToAttribute(), value);
                                } else {
                                    nodeValues.put(ref.getToAttribute(), value);
                                }
                                log.debug("Linked reference: node {} attribute {} = {}", nodeKey, ref.getToAttribute(), value);
                            }
                        }
                    }
                }

                deployNode(node, env, resolvedOutputs);
            }
            log.info("Deployment completed for environment: {}", env.getName());

            updateStatus(taskId, env.getId(), "SUCCESS", "Deployment completed successfully");

            // Audit Success
            saveAuditLog(env, "SUCCESS", AuditLogSeverity.SUCCESS, "Deployment completed successfully", taskId, operatorLogin);

            // WebSocket Notification
            messagingTemplate.convertAndSend("/topic/deployments", Map.of(
                    "environmentId", env.getId(),
                    "taskId", taskId,
                    "status", "SUCCESS",
                    "message", "Deployment completed successfully"
            ));
        } catch (Exception e) {
            updateStatus(taskId, env.getId(), "FAILURE", "Deployment failed: " + e.getMessage());

            // Audit Failure
            saveAuditLog(env, "FAILURE", AuditLogSeverity.ERROR, "Deployment failed: " + e.getMessage(), taskId, operatorLogin);

            // WebSocket Notification
            messagingTemplate.convertAndSend("/topic/deployments", Map.of(
                    "environmentId", env.getId(),
                    "taskId", taskId,
                    "status", "FAILURE",
                    "message", "Deployment failed: " + e.getMessage()
            ));
            throw e;
        }
    }

    /**
     * Retrieves the status of a deployment task by its ID.
     *
     * @param taskId
     * @return
     */
    public DeploymentStatus getStatus(String taskId) {
        return taskStatuses.get(taskId);
    }

    /**
     * Retrieves all deployment tasks sorted by timestamp in descending order.
     *
     * @return
     */
    public List<DeploymentStatus> getAllTasks() {
        return taskStatuses.values().stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .toList();
    }

    private void updateStatus(String taskId, String environmentId, String status, String message) {
        taskStatuses.put(taskId, DeploymentStatus.builder()
                .taskId(taskId)
                .environmentId(environmentId)
                .status(status)
                .message(message)
                .timestamp(Instant.now())
                .build());
    }

    private void saveAuditLog(Environment env, String status, AuditLogSeverity severity, String message, String taskId, String operatorLogin) {
        try {
            AuditLog log = new AuditLog();
            log.setType(AuditLogType.DEPLOYMENT);
            log.setSeverity(severity);
            log.setCollectionName("environments");
            log.setOperation(AuditLogEntityOperation.EXECUTE);
            log.setEntityId(env.getId());
            log.setEntityClass(Environment.class.getName());
            log.setTimestamp(Instant.now());
            log.setUserLogin(operatorLogin);

            Map<String, Object> details = new java.util.HashMap<>();
            details.put("status", status);
            details.put("environmentName", env.getName());
            details.put("taskId", taskId);
            if (message != null)
                details.put("message", message);
            log.setData(details);

            auditLogLogRepository.save(log);
        } catch (Exception e) {
            DeploymentsService.log.error("Failed to save audit log for deployment: {}", e.getMessage());
        }
    }

    private String currentUsername() {
        return SecurityUtils.getCurrentUserLogin();
    }

    private void deployNode(EnvironmentNode node, Environment env, Map<String, Map<String, Object>> resolvedOutputs) {
        log.debug("Deploying node: {}", node.getKey());

        String resourceId = node.getResourceClassId();
        if (resourceId == null) {
            log.error("Node {} has no resource class ID, skipping.", node.getKey());
            return;
        }

        Optional<ResourceClass> resourceOpt = resourceService.findResourceById(resourceId);
        if (resourceOpt.isEmpty()) {
            log.error("Resource definition (ID: {}) missing for node {}, skipping.", resourceId, node.getKey());
            return;
        }
        ResourceClass resource = resourceOpt.get();

        Map<String, Object> template = resource.getTemplate();
        if (template == null) {
            log.info("No template found for resource {}, skipping.", resource.getName());
            return;
        }

        ResourceType type = resource.getType();
        if (type == ResourceType.AZURE_RESOURCE) {
            deployAzureResource(node, resource, env, resolvedOutputs);
        } else if (type == ResourceType.MSGRAPH || type == ResourceType.AZURE_DEVOPS
                || type == ResourceType.KUBERNETES_RESOURCE || type == ResourceType.KUBERNETES_CLUSTER) {
            deployRestResource(node, resource, env, type, resolvedOutputs);
        } else {
            log.info("Unsupported resource type {} for node {}, skipping.", type, node.getKey());
        }
    }

    private void deployAzureResource(EnvironmentNode node, ResourceClass resource, Environment env, Map<String, Map<String, Object>> resolvedOutputs) {
        log.info("Starting Azure resource deployment for node: {}", node.getKey());
        try {
            Map<String, Object> values = buildContextValues(node, resource, env);
            log.debug("Context values built: {}", values.keySet());

            // Resolve variables in the template structure
            @SuppressWarnings("unchecked")
            Map<String, Object> resolvedTemplate = (Map<String, Object>) resolveObject(resource.getTemplate(), values);

            log.debug("Resolved template: {}", resolvedTemplate);

            // Inject "name" if present in values and not already in template
            if (values.containsKey("name") && !resolvedTemplate.containsKey("name")) {
                resolvedTemplate = new HashMap<>(resolvedTemplate);
                resolvedTemplate.put("name", values.get("name"));
            }

            // Inject "location" if present in values and not already in template
            if (values.containsKey("location") && !resolvedTemplate.containsKey("location")) {
                resolvedTemplate = new HashMap<>(resolvedTemplate);
                resolvedTemplate.put("location", values.get("location"));
            }

            ResourceTemplate tpl = ResourceTemplate.builder()
                    .name(values.containsKey("name") ? String.valueOf(values.get("name")) : node.getLabel())
                    .template(resolvedTemplate)
                    .defaults(resource.getDefaults() != null ? resource.getDefaults() : Collections.emptyMap())
                    .build();

            // "Environment Config" has global overrides.
            // EnvironmentNode might have specific params.
            // For now, using env config + defaults.

            Deployment deployment = azureResourceManagerService.deployTemplate(tpl, env.getConfig());
            if (deployment != null && deployment.outputResources() != null) {
                deployment.outputResources().forEach(output -> {
                    try {
                        log.info("Output resource: {}", output.toJsonString());
                    } catch (IOException e) {
                        log.error("Failed to convert output resource to JSON string", e);
                    }

                });
            }
            // Capture outputs and store them
            if (deployment != null && deployment.outputs() != null && resource.getOutputs() != null) {
                Map<String, Object> nodeOutputs = new HashMap<>();
                Map<String, Object> armOutputs = (Map<String, Object>) deployment.outputs();
                
                final JsonNode outputsJson = objectMapper.valueToTree(armOutputs);
                
                resource.getOutputs().forEach((symbolicName, path) -> {
                    JsonNode valueNode = outputsJson.at(path.startsWith("/") ? path : "/" + path.replace(".", "/"));
                    if (!valueNode.isMissingNode() && !valueNode.isNull()) {
                        if (valueNode.isObject() && valueNode.has("value")) {
                            valueNode = valueNode.get("value");
                        }
                        
                        if (valueNode.isTextual()) {
                            nodeOutputs.put(symbolicName, valueNode.asText());
                        } else if (valueNode.isNumber()) {
                            nodeOutputs.put(symbolicName, valueNode.numberValue());
                        } else if (valueNode.isBoolean()) {
                            nodeOutputs.put(symbolicName, valueNode.asBoolean());
                        } else {
                            nodeOutputs.put(symbolicName, valueNode);
                        }
                    }
                });
                
                if (!nodeOutputs.isEmpty()) {
                    resolvedOutputs.put(node.getKey(), nodeOutputs);
                    log.debug("Captured outputs for node {}: {}", node.getKey(), nodeOutputs.keySet());
                }
            }

            log.info("Successfully deployed Azure resource: {}", node.getKey());
        } catch (Exception e) {
            log.error("Failed to deploy Azure resource {}: {}", node.getKey(), e.getMessage());
            throw new RuntimeException("Deployment failed for " + node.getKey(), e);
        }
    }

    private void deployRestResource(EnvironmentNode node, ResourceClass resource, Environment env, ResourceType type, Map<String, Map<String, Object>> resolvedOutputs) {
        try {
            Map<String, Object> template = resource.getTemplate();

            String url = (String) template.get("url");
            String method = (String) template.get("method");
            String contentType = (String) template.get("contentType");
            Object payload = template.get("payload");

            if (url == null || method == null) {
                throw new IllegalArgumentException(type + " resource missing url or method in template");
            }

            Map<String, Object> values = buildContextValues(node, resource, env);

            // Substitute in URL and Payload
            String resolvedUrl = resolveString(url, values);
            Object resolvedPayload = resolveObject(payload, values);

            TokenCredential credential = null;
            if (env.getConfig() != null && env.getConfig().getAzureCredentialId() != null) {
                try {
                    credential = azureIdentityService.getTokenCredential(env.getConfig().getAzureCredentialId());
                } catch (Exception e) {
                    log.warn("Failed to fetch credential {} for environment {}, falling back to default: {}",
                            env.getConfig().getAzureCredentialId(), env.getName(), e.getMessage());
                }
            }

            JsonNode response = null;
            if (type == ResourceType.MSGRAPH) {
                response = msGraphService.executeGraphRequest(resolvedUrl, method, resolvedPayload, contentType, credential);
            } else {
                // For Azure DevOps and Kubernetes, we use a generic REST call for now.
                // In a production app, we would use specialized services/SDKs.
                // Reusing msGraphService as a generic REST client if it supports it,
                // or ideally calling a generic restService.
                response = msGraphService.executeGraphRequest(resolvedUrl, method, resolvedPayload, contentType, credential);
            }

            // Capture outputs if mapping is defined and response is not null
            if (response != null && resource.getOutputs() != null) {
                Map<String, Object> nodeOutputs = new HashMap<>();
                final JsonNode finalResponse = response;
                resource.getOutputs().forEach((symbolicName, jsonPath) -> {
                    JsonNode valueNode = finalResponse.at(jsonPath.startsWith("/") ? jsonPath : "/" + jsonPath.replace(".", "/"));
                    if (!valueNode.isMissingNode() && !valueNode.isNull()) {
                        if (valueNode.isTextual()) {
                            nodeOutputs.put(symbolicName, valueNode.asText());
                        } else if (valueNode.isNumber()) {
                            nodeOutputs.put(symbolicName, valueNode.numberValue());
                        } else if (valueNode.isBoolean()) {
                            nodeOutputs.put(symbolicName, valueNode.asBoolean());
                        } else {
                            nodeOutputs.put(symbolicName, valueNode.toString());
                        }
                    }
                });
                if (!nodeOutputs.isEmpty()) {
                    resolvedOutputs.put(node.getKey(), nodeOutputs);
                    log.debug("Captured outputs for REST node {}: {}", node.getKey(), nodeOutputs.keySet());
                }
            }

            log.debug("Successfully deployed {} resource: {}", type, node.getKey());
        } catch (Exception e) {
            log.error("Failed to deploy {} resource {}: {}", type, node.getKey(), e.getMessage());
            throw new RuntimeException("Deployment failed for " + node.getKey(), e);
        }
    }

    private Object resolveObject(Object obj, Map<String, Object> values) {
        if (obj == null)
            return null;
        if (obj instanceof String) {
            return resolveTemplateValue((String) obj, values);
        }
        if (obj instanceof Map) {
            Map<String, Object> newMap = new HashMap<>();
            ((Map<?, ?>) obj).forEach((k, v) -> {
                newMap.put(String.valueOf(k), resolveObject(v, values));
            });
            return newMap;
        }
        if (obj instanceof List) {
            return ((List<?>) obj).stream().map(v -> resolveObject(v, values)).toList();
        }
        return obj;
    }

    private Object resolveTemplateValue(String text, Map<String, Object> values) {
        if (text == null || !text.contains("{{")) {
            return text;
        }

        log.debug("Resolving template value: {}", text);

        // Regex for strict full-value substitution like "{{ var:type }}"
        // Groups: 1=key, 2=full type section (optional), 3=type, 4=secure!, 5=subtype
        // section, 6=subtype
        // Examples:
        // "{{ var }}" -> key="var", type=null
        // "{{ var:boolean }}" -> key="var", type="boolean"
        // "{{ var:string! }}" -> key="var, type="string", secure="!"
        // "{{ var:array:number }}" -> key="var", type="array", subtype="number"
        // "{{ catalog:cat-name:key }}" -> catalog replacement

        // Simplified approach: Extract content, then split manually. Regex is hard to
        // make perfect for all cases efficiently.
        if (text.matches("^\\s*\\{\\{\s*.+\\s*\\}\\}\\s*$")) {
            String content = text.trim();
            // remove {{ and }}
            content = content.substring(2, content.length() - 2).trim();

            String[] parts = content.split(":");

            if (parts.length >= 2 && "catalog".equalsIgnoreCase(parts[0].trim())) {
                String catalogName = parts[1].trim();
                String key = parts.length > 2 ? parts[2].trim() : null;

                return resolveCatalogValue(catalogName, key, parts, text, values);
            }

            String key = parts[0].trim();

            if (parts.length >= 3 && "catalog".equalsIgnoreCase(parts[1].trim())) {
                String catalogName = parts[2].trim();
                log.debug("Detected new catalog format: key={}, catalog={}", key, catalogName);
                Object val = values.get(key);
                if (val instanceof String && ((String) val).contains("{{")) {
                    return resolveTemplateValue((String) val, values);
                }
                return val != null ? val : text;
            }

            String paramType = "string";
            String paramSubtype = null;

            if (parts.length > 1) {
                String rawType = parts[1].trim();
                // Handle secure suffix '!'
                if (rawType.endsWith("!")) {
                    rawType = rawType.substring(0, rawType.length() - 1);
                }
                paramType = rawType.toLowerCase();

                if (parts.length > 2) {
                    paramSubtype = parts[2].trim();
                }
            }

            Object val = values.get(key);
            if (val == null && key.contains(".")) {
                val = resolveNestedProperty(key, values);
            }

            if (val == null && !values.containsKey(key)) {
                return text;
            }

            return convertValue(val, paramType, paramSubtype);
        }

        return resolveString(text, values);
    }

    private Object resolveCatalogValue(String catalogName, String key, String[] parts, String originalText, Map<String, Object> values) {
        log.debug("Attempting to resolve catalog variable: name={}, key={}", catalogName, key);

        Optional<ResourceClass> catalogOpt = resourceService.findResourceByName(catalogName);
        if (catalogOpt.isPresent()) {
            ResourceClass catalog = catalogOpt.get();
            if (catalog.getType() != ResourceType.CATALOG) {
                log.warn("Resource '{}' found but is not a CATALOG (type: {})", catalogName, catalog.getType());
                return originalText;
            }

            if (key == null) {
                return originalText;
            }

            Object val = values.get(key);

            if (val == null && catalog.getDefaults() != null) {
                // Check for dash-separated defaults
                val = catalog.getDefaults().get(key);
                if (val == null) {
                    // Support nested object defaults: someObject-name -> { someObject: { name: value } }
                    val = resolveNestedDefault(key, catalog.getDefaults());
                }
            }

            if (val == null && catalog.getTemplate() != null) {
                // Fallback to template values if not found in defaults or overrides
                val = catalog.getTemplate().get(key);
                if (val == null) {
                    val = resolveNestedDefault(key, catalog.getTemplate());
                }
            }

            if (val != null) {
                String paramType = "string";
                if (catalog.getCatalogDefinition() != null && catalog.getCatalogDefinition().getItemType() != null) {
                    CatalogItemType itemType = catalog.getCatalogDefinition().getItemType();
                    paramType = itemType.name().toLowerCase();
                    // Map ARRAY_STRING/ARRAY_OBJECT to array
                    if (itemType == CatalogItemType.ARRAY_STRING || itemType == CatalogItemType.ARRAY_OBJECT) {
                        paramType = "array";
                    } else if (itemType == CatalogItemType.RESOURCE_CLASS) {
                        paramType = "resource_class";
                    }
                }

                String paramSubtype = null;
                if (parts.length > 3) {
                    paramType = parts[3].trim().toLowerCase();
                    if (parts.length > 4) {
                        paramSubtype = parts[4].trim();
                    }
                }
                log.debug("Resolved catalog variable: {} -> {}", originalText, val);
                return convertValue(val, paramType, paramSubtype);
            } else {
                log.warn("Value for key '{}' not found in catalog '{}' (defaults or template)", key, catalogName);
            }
        } else {
            log.warn("Catalog resource '{}' not found", catalogName);
        }
        return originalText; // Fallback if catalog or key not found
    }

    private Object resolveNestedDefault(String key, Map<String, Object> defaults) {
        if (!key.contains("-")) {
            return defaults.get(key);
        }

        // Try exact match first
        if (defaults.containsKey(key)) {
            return defaults.get(key);
        }

        // Handle nested structure: someObject-name
        String[] path = key.split("-");
        Object current = defaults;
        for (String part : path) {
            if (current instanceof Map) {
                current = ((Map<?, ?>) current).get(part);
            } else {
                return null;
            }
        }
        return current;
    }

    private Object resolveNestedProperty(String key, Map<String, Object> values) {
        if (values == null || key == null)
            return null;
        String[] parts = key.split("\\.");
        Object current = values;
        for (String part : parts) {
            if (current instanceof Map) {
                current = ((Map<?, ?>) current).get(part);
            } else {
                return null;
            }
        }
        return current;
    }

    private void injectNestedValue(Map<String, Object> values, String path, Object value) {
        String[] parts = path.split("\\.");
        Map<String, Object> current = values;
        for (int i = 0; i < parts.length - 1; i++) {
            String part = parts[i];
            Object next = current.get(part);
            if (!(next instanceof Map)) {
                Map<String, Object> newMap = new HashMap<>();
                current.put(part, newMap);
                current = newMap;
            } else {
                @SuppressWarnings("unchecked")
                Map<String, Object> casted = (Map<String, Object>) next;
                current = casted;
            }
        }
        current.put(parts[parts.length - 1], value);
    }

    private Object convertValue(Object val, String type, String subtype) {
        if (val == null)
            return null;

        switch (type) {
            case "boolean":
                if (val instanceof Boolean)
                    return val;
                return Boolean.parseBoolean(String.valueOf(val));

            case "number":
                if (val instanceof Number)
                    return val;
                try {
                    String s = String.valueOf(val);
                    if (s.contains("."))
                        return Double.parseDouble(s);
                    return Integer.parseInt(s); // or Long? Defaulting to Integer/Double for JSON
                } catch (NumberFormatException e) {
                    return val; // Fallback
                }

            case "object":
                if (val instanceof Map)
                    return val;
                return val;

            case "array":
                if (val instanceof List)
                    return val;
                return val;

            case "resource_class":
                // If the value is already a Map (the whole resource) or something else, return as is
                // but usually it's an ID. If we want to be smart, we could fetch it.
                // For now, treat it similarly to object/string - return as is.
                return val;

            case "string":
            default:
                return String.valueOf(val);
        }
    }

    private String resolveString(String text, Map<String, Object> values) {
        if (text == null || !text.contains("{{"))
            return text;

        log.info("Resolving string: {}", text);

        // Pattern for simple variables: {{ varName }} or {{ varName:default }}
        Pattern varPattern = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.-]+)(?::([^}]+))?\\s*}}");
        Matcher varMatcher = varPattern.matcher(text);

        StringBuilder sb = new StringBuilder();
        while (varMatcher.find()) {
            String key = varMatcher.group(1); // capture key only
            Object value = values.get(key);
            
            // Support nested property access like {{ properties.serverFarmId }}
            if (value == null && key.contains(".")) {
                value = resolveNestedProperty(key, values);
            }

            String replacement = value != null ? String.valueOf(value) : (varMatcher.group(2) != null ? varMatcher.group(2).trim() : varMatcher.group(0));
            varMatcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        varMatcher.appendTail(sb);
        String intermediate = sb.toString();

        if (!intermediate.contains("{{ catalog:")) {
            return intermediate;
        }

        // Pattern for catalog variables: {{ catalog:catalogName:key }}
        Pattern catPattern = Pattern.compile("\\{\\{\\s*catalog:([^:!\\s}]+):([^:!\\s}]+)((?::[^:!\\s}]+)*)\\s*}}", Pattern.CASE_INSENSITIVE);
        Matcher catMatcher = catPattern.matcher(intermediate);

        if (catMatcher.find()) {
            catMatcher.reset();
            log.info("[resolveString] Catalog placeholders detected in: {}", intermediate);
        }

        sb = new StringBuilder();
        while (catMatcher.find()) {
            String catalogName = catMatcher.group(1).trim();
            String key = catMatcher.group(2).trim();
            String typeInfo = catMatcher.group(3); // will be like ":string:subtype" or empty

            String fullPlaceholder = catMatcher.group(0);
            // Strip {{ and }} then split by :
            String content = fullPlaceholder.substring(2, fullPlaceholder.length() - 2).trim();
            String[] parts = content.split(":");

            Object result = resolveCatalogValue(catalogName, key, parts, fullPlaceholder, values);
            String replacement = String.valueOf(result);

            catMatcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        catMatcher.appendTail(sb);

        // Pattern for new catalog format: {{ key:catalog:catalogName }}
        Pattern newCatPattern = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_-]+):catalog:([^:!\\s}]+)(?::[^}]+)?\\s*}}", Pattern.CASE_INSENSITIVE);
        Matcher newCatMatcher = newCatPattern.matcher(sb.toString());
        
        StringBuilder finalSb = new StringBuilder();
        while (newCatMatcher.find()) {
            String key = newCatMatcher.group(1).trim();
            String catalogName = newCatMatcher.group(2).trim();
            
            log.info("[resolveString] Detected new catalog format: key={}, catalog={}", key, catalogName);
            Object val = values.get(key);
            String replacement;
            if (val instanceof String && ((String) val).contains("{{")) {
                replacement = String.valueOf(resolveTemplateValue((String) val, values));
            } else {
                replacement = val != null ? String.valueOf(val) : newCatMatcher.group(0);
            }
            newCatMatcher.appendReplacement(finalSb, Matcher.quoteReplacement(replacement));
        }
        newCatMatcher.appendTail(finalSb);

        return finalSb.toString();
    }

    private Map<String, Object> buildContextValues(EnvironmentNode node, ResourceClass resource, Environment env) {
        Map<String, Object> values = new java.util.HashMap<>();
        // 1. Defaults
        if (resource != null && resource.getDefaults() != null)
            values.putAll(resource.getDefaults());
        // 2. Environment config overrides
        if (env.getConfig() != null && env.getConfig().getValues() != null) {
            values.putAll(env.getConfig().getValues());
        }
        // 3. Node specific overrides
        if (node != null && node.getValues() != null)
            values.putAll(node.getValues());

        // Add system variables
        values.put("_envName", env.getName());
        if (env.getId() != null)
            values.put("_envId", env.getId());

        String regionShort = null;
        String regionIdResolved = null;

        if (env.getConfig() != null) {
            if (env.getConfig().getRegion() != null) {
                regionIdResolved = env.getConfig().getRegion();
                regionShort = regionIdResolved;
                // Try to resolve short name from ResourceClass
                Optional<ResourceClass> regionResource = resourceService.findResourceById(regionIdResolved);
                if (regionResource.isPresent()) {
                    ResourceClass rc = regionResource.get();
                    Object shortName = null;
                    if (rc.getTemplate() != null) {
                        shortName = rc.getTemplate().get("short");
                    }
                    if (shortName == null && rc.getDefaults() != null) {
                        shortName = rc.getDefaults().get("short");
                    }
                    if (shortName != null) {
                        regionShort = String.valueOf(shortName);
                    }

                    // Also try to resolve the full name for ARM (e.g. westeurope)
                    Object fullName = null;
                    if (rc.getTemplate() != null) {
                        fullName = rc.getTemplate().get("key");
                    }
                    if (fullName == null && rc.getDefaults() != null) {
                        fullName = rc.getDefaults().get("key");
                    }
                    if (fullName != null) {
                        regionIdResolved = String.valueOf(fullName);
                    }
                }
                values.put("location", regionShort);
                values.put("region", regionShort);
                values.put("regionId", regionIdResolved);
            }
            if (env.getConfig().getResourceGroup() != null)
                values.put("resourceGroup", env.getConfig().getResourceGroup());
        }

        // Apply naming rule if applicable
        if (node != null) {
            String name = null;
            String baseName = null;

            // Get base name: EnvironmentNode.values.name, fallback to EnvironmentNode.label
            if (node.getValues() != null && node.getValues().get("name") != null) {
                baseName = String.valueOf(node.getValues().get("name"));
            } else {
                baseName = node.getLabel() != null ? node.getLabel() : (node.getKey() != null ? node.getKey() : "");
            }

            if (!node.isDisableNamingRule() && resource != null && resource.getNamingRule() != null) {
                ResourceNamingRule rule = resource.getNamingRule();
                if (rule.getFormat() != null) {
                    name = rule.getFormat();
                    name = name.replace("{abbrv}", resource.getAbbreviation() != null ? resource.getAbbreviation() : "");
                    name = name.replace("{env}", env.getName() != null ? env.getName().toLowerCase() : "");
                    name = name.replace("{name}", baseName);
                    name = name.replace("{region-abbrv}", regionShort != null ? regionShort : "");

                    // Clean up forbidden chars
                    if (rule.getForbiddenChars() != null) {
                        for (String fc : rule.getForbiddenChars()) {
                            name = name.replace(fc, "");
                        }
                    }

                    // Apply length constraints
                    if (rule.getMaxLength() != null && name.length() > rule.getMaxLength()) {
                        name = name.substring(0, rule.getMaxLength());
                    }
                }
            } else {
                // Naming rule disabled or missing
                name = baseName;
            }

            values.put("name", name);
        }

        return values;
    }
}
