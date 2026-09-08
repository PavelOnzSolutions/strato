package solutions.onz.platform.strato.creator.provisioner.services;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigProviderOutput;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import solutions.onz.platform.strato.creator.services.EncryptionService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.utils.SecretFieldResolver;
import com.jayway.jsonpath.InvalidPathException;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Provider-side service that exposes a configuration for pipeline consumption.
 *
 * <p>For the new section/item data model, the output {@code data} map has the shape:
 * <pre>
 * {
 *   "&lt;sectionKey&gt;": {
 *     "&lt;itemName&gt;": { ...itemFields... }
 *   },
 *   "_environment": { "name": ..., "id": ..., "subscriptionId": ..., "region": ..., "resourceGroup": ... }
 * }
 * </pre>
 *
 * <p>Item-level secret fields are decrypted into plaintext before being returned. Sections whose
 * catalog entry declares a {@code requiredReadPermission} are filtered out if the calling
 * identity does not hold that authority.
 *
 * <p>Variable substitution ({@code {{name}}} / {@code {{environment}}}) still applies to string
 * values anywhere in the tree as part of {@link #getQueryResult(String, String)}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigurationProviderService {

    private final ConfigurationService configurationService;
    private final EnvironmentsService environmentsService;
    private final ConfigurationSchemaService schemaService;
    private final EncryptionService encryptionService;
    private final EffectiveSchemaMaterializer materializer;
    private final SectionCatalogEntryRepository catalogRepository;

    /** Pattern for variable placeholders: {{name}} or {{environment}}. */
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{\\s*(name|environment)\\s*}}");

    /**
     * Retrieves the configuration for a pipeline based on the provided configuration name and
     * environment name. If {@code envName} is null/empty, falls back to the environment bound to
     * the configuration (if any), or returns the configuration without environment context.
     */
    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public ConfigProviderOutput getConfigForPipeline(String configName, String envName) {
        Configuration config = configurationService.findLatestByName(configName)
                .orElseThrow(() -> new RuntimeException("Configuration not found: " + configName));

        if (envName == null || envName.isEmpty()) {
            if (config.getEnvironmentId() == null || config.getEnvironmentId().isEmpty()) {
                log.info("Configuration {} has no environment assigned", configName);
                return buildOutput(config, null);
            }
            Environment env = environmentsService.findById(config.getEnvironmentId())
                    .orElseThrow(() -> new RuntimeException("Environment not found: " + config.getEnvironmentId()));
            return buildOutput(config, env);
        }
        Environment env = environmentsService.findLatestByName(envName)
                .orElseThrow(() -> new RuntimeException("Environment not found: " + envName));
        return buildOutput(config, env);
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public ConfigProviderOutput getConfigForPipeline(String configName) {
        return getConfigForPipeline(configName, null);
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public ConfigProviderOutput getConfigForPipelineById(String configId, String envId) {
        Configuration config = configurationService.findByIdRaw(configId)
                .orElseThrow(() -> new RuntimeException("Configuration not found: " + configId));
        Environment env = environmentsService.findById(envId)
                .orElseThrow(() -> new RuntimeException("Environment not found: " + envId));
        return buildOutput(config, env);
    }

    /**
     * Executes a JSONPath query on the configuration provider output. Variable placeholders
     * ({@code {{name}}}, {@code {{environment}}}) in string values are substituted before the query
     * is evaluated.
     */
    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public Object getQueryResult(String configName, String query) {
        ConfigProviderOutput output = getConfigForPipeline(configName);

        Map<String, Object> processedData = processVariables(output.getData(),
                output.getConfigurationName(), output.getEnvironmentName());

        try {
            return JsonPath.read(processedData, query);
        } catch (PathNotFoundException e) {
            log.debug("JSONPath not found: {}", query);
            return Collections.emptyMap();
        } catch (InvalidPathException e) {
            log.error("Invalid JSONPath: {}", query);
            throw new IllegalArgumentException("Invalid JSONPath: " + query, e);
        }
    }

    // --- internal helpers --------------------------------------------------

    private ConfigProviderOutput buildOutput(Configuration config, Environment env) {
        Map<String, Object> outData = new LinkedHashMap<>();

        Map<String, Object> materialized = null;
        if (config.getSchemaId() != null) {
            materialized = schemaService.findById(config.getSchemaId())
                    .map(materializer::materialize)
                    .orElse(null);
        }

        if (config.getData() != null) {
            // Deep-copy item maps so decryption mutations do not disturb the cached entity.
            Map<String, Map<String, Map<String, Object>>> dataCopy = new LinkedHashMap<>();
            for (Map.Entry<String, Map<String, Map<String, Object>>> sectionEntry : config.getData().entrySet()) {
                Map<String, Map<String, Object>> itemMapCopy = new LinkedHashMap<>();
                if (sectionEntry.getValue() != null) {
                    for (Map.Entry<String, Map<String, Object>> itemEntry : sectionEntry.getValue().entrySet()) {
                        itemMapCopy.put(itemEntry.getKey(),
                                itemEntry.getValue() == null
                                        ? new LinkedHashMap<>()
                                        : new LinkedHashMap<>(itemEntry.getValue()));
                    }
                }
                dataCopy.put(sectionEntry.getKey(), itemMapCopy);
            }
            if (materialized != null) {
                decryptSectionsInPlace(dataCopy, materialized);
            }
            dataCopy.forEach(outData::put);
        }

        if (env != null) {
            Map<String, Object> envMeta = new LinkedHashMap<>();
            envMeta.put("name", env.getName());
            envMeta.put("id", env.getId());
            if (env.getConfig() != null) {
                envMeta.put("subscriptionId", env.getConfig().getSubscriptionId());
                envMeta.put("region", env.getConfig().getRegion());
                envMeta.put("resourceGroup", env.getConfig().getResourceGroup());
            }
            outData.put("_environment", envMeta);
        }

        filterByReadPermissions(outData, config);

        return ConfigProviderOutput.builder()
                .configurationName(config.getName())
                .environmentName(env != null ? env.getName() : null)
                .version(config.getVersion())
                .data(outData)
                .build();
    }

    @SuppressWarnings("unchecked")
    private void decryptSectionsInPlace(
            Map<String, Map<String, Map<String, Object>>> data,
            Map<String, Object> materialized) {
        Map<String, Object> sectionProps = (Map<String, Object>) materialized.get("properties");
        if (sectionProps == null) return;
        for (Map.Entry<String, Map<String, Map<String, Object>>> sectionEntry : data.entrySet()) {
            Map<String, Object> sectionSchema = (Map<String, Object>) sectionProps.get(sectionEntry.getKey());
            if (sectionSchema == null) continue;
            Map<String, Object> itemSchema = (Map<String, Object>) sectionSchema.get("additionalProperties");
            if (itemSchema == null) continue;
            Set<String> secretPaths = SecretFieldResolver.findSecretPaths(itemSchema);
            if (secretPaths.isEmpty()) continue;
            for (Map.Entry<String, Map<String, Object>> itemEntry : sectionEntry.getValue().entrySet()) {
                Map<String, Object> decrypted = SecretFieldResolver.decryptData(
                        itemEntry.getValue(), secretPaths, encryptionService);
                sectionEntry.getValue().put(itemEntry.getKey(), decrypted);
            }
        }
    }

    private void filterByReadPermissions(Map<String, Object> out, Configuration config) {
        if (config.getSchemaId() == null) return;
        ConfigurationSchema schema = schemaService.findById(config.getSchemaId()).orElse(null);
        if (schema == null || schema.getSections() == null) return;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Set<String> userPerms = auth == null
                ? Set.of()
                : auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toSet());

        for (SchemaSection sec : schema.getSections()) {
            if (sec.getCatalogEntryDocumentId() == null) continue;
            catalogRepository.findTopByDocumentIdOrderByVersionDesc(sec.getCatalogEntryDocumentId())
                    .ifPresent(cat -> {
                        String reqRead = cat.getRequiredReadPermission();
                        if (reqRead != null && !reqRead.isEmpty() && !userPerms.contains(reqRead)) {
                            out.remove(cat.getSectionKey());
                        }
                    });
        }
    }

    // --- {{name}} / {{environment}} substitution (preserved from previous implementation) ---

    @SuppressWarnings("unchecked")
    private Map<String, Object> processVariables(Map<String, Object> data, String configName, String envName) {
        if (data == null) return new HashMap<>();
        return (Map<String, Object>) processValue(data, configName, envName);
    }

    @SuppressWarnings("unchecked")
    private Object processValue(Object value, String configName, String envName) {
        if (value == null) return null;
        if (value instanceof String s) return processString(s, configName, envName);
        if (value instanceof Map<?, ?> m) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : m.entrySet()) {
                result.put(String.valueOf(entry.getKey()), processValue(entry.getValue(), configName, envName));
            }
            return result;
        }
        if (value instanceof List<?> list) {
            return list.stream()
                    .map(item -> processValue(item, configName, envName))
                    .collect(Collectors.toList());
        }
        return value;
    }

    private String processString(String text, String configName, String envName) {
        if (text == null || !text.contains("{{")) return text;
        Matcher matcher = VARIABLE_PATTERN.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String variable = matcher.group(1);
            String replacement = switch (variable) {
                case "name" -> configName != null ? configName : "";
                case "environment" -> envName != null ? envName : "";
                default -> matcher.group(0);
            };
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
