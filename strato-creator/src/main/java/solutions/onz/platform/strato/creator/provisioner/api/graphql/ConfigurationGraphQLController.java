package solutions.onz.platform.strato.creator.provisioner.api.graphql;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigProviderOutput;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationProviderService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ConfigurationGraphQLController {

    private final ConfigurationService configurationService;
    private final EnvironmentsService environmentsService;
    private final ConfigurationProviderService configurationProviderService;

    @QueryMapping
    public List<Configuration> configurations(@Argument String search) {
        List<Configuration> result = (search != null && !search.isBlank())
                ? configurationService.search(search)
                : configurationService.findAllLatestVersions();
        configurationService.maskSecretFields(result);
        return result;
    }

    @QueryMapping
    public Configuration configurationById(@Argument String id) {
        return configurationService.findById(id)
                .map(config -> {
                    configurationService.maskSecretFields(config);
                    return config;
                })
                .orElse(null);
    }

    @QueryMapping
    public List<Configuration> configurationVersions(@Argument UUID documentId) {
        List<Configuration> versions = configurationService.findAllVersions(documentId);
        configurationService.maskSecretFields(versions);
        return versions;
    }

    @QueryMapping
    public Map<String, Object> configurationQuery(@Argument String id, @Argument String query) {
        return configurationService.executeQuery(query);
    }

    @QueryMapping
    public List<Environment> environments() {
        return environmentsService.findAllLatestVersions();
    }

    @QueryMapping
    public Environment environmentById(@Argument String id) {
        return environmentsService.findById(id).orElse(null);
    }

    @QueryMapping
    public ConfigProviderOutput configProviderOutput(@Argument String configurationId, @Argument String environmentId) {
        if (environmentId == null) {
            // If environmentId is not provided in query, try to get it from the configuration itself
            Configuration config = configurationService.findById(configurationId).orElse(null);
            if (config != null && config.getEnvironmentId() != null) {
                environmentId = config.getEnvironmentId();
            }
        }

        if (environmentId == null) {
            return null;
        }

        try {
            return configurationProviderService.getConfigForPipelineById(configurationId, environmentId);
        } catch (Exception e) {
            log.error("Error fetching config provider output", e);
            return null;
        }
    }

    @QueryMapping
    public Object configProviderQuery(@Argument String configName, @Argument String envName, @Argument String query) {
        try {
            return configurationProviderService.getQueryResult(configName, query);
        } catch (IllegalArgumentException e) {
            // In GraphQL, we can let the exception propagate or return null/error.
            // Returning null here as a simple way to handle it, though a DataFetcherException might be better for detailed errors.
            log.error("Invalid JSONPath query: {}", query, e);
            return null;
        } catch (Exception e) {
            log.error("Error executing config provider query", e);
            return null;
        }
    }

    @SchemaMapping
    public Environment environment(Configuration configuration) {
        if (configuration.getEnvironmentId() != null) {
            return environmentsService.findById(configuration.getEnvironmentId()).orElse(null);
        }
        return null;
    }
}
