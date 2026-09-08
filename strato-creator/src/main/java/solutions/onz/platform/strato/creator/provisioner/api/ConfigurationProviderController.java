package solutions.onz.platform.strato.creator.provisioner.api;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigProviderOutput;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationProviderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping(path = "/api/configuration-provider", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Configuration Provider", description = "Provides a structured configuration to the pipeline or to be consumed by application")
@RequiredArgsConstructor
public class ConfigurationProviderController {

    private final ConfigurationProviderService service;

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    /**
     * Primary pipeline endpoint - by name (most common)
     */
    @Operation(summary = "Get merged configuration by name for pipeline consumption")
    @GetMapping("/config/{configName}/env/{envName}")
    public ResponseEntity<ConfigProviderOutput> getConfig(
            @PathVariable String configName,
            @PathVariable String envName) {
        log.info("Pipeline request for config: {}, env: {}", configName, envName);
        return ResponseEntity.ok(service.getConfigForPipeline(configName, envName));
    }

    /**
     * Preview endpoint - resolves env from the configuration's bound environment (if any).
     */
    @Operation(summary = "Get merged configuration by name, using the bound environment if present")
    @GetMapping("/config/{configName}")
    public ResponseEntity<ConfigProviderOutput> getConfig(@PathVariable String configName) {
        log.info("Preview request for config: {}", configName);
        return ResponseEntity.ok(service.getConfigForPipeline(configName));
    }

    /**
     * Alternative: by IDs
     */
    @Operation(summary = "Get merged configuration by ID for pipeline consumption")
    @GetMapping("/by-id/{configId}/{envId}")
    public ResponseEntity<ConfigProviderOutput> getConfigById(
            @PathVariable String configId,
            @PathVariable String envId) {
        log.info("Pipeline request for configId: {}, envId: {}", configId, envId);
        return ResponseEntity.ok(service.getConfigForPipelineById(configId, envId));
    }

    @Operation(summary = "Get a portion of the configuration JSON based on JSONPath query")
    @GetMapping("/config/{configName}/query")
    public ResponseEntity<Object> getQueryResult(
            @PathVariable String configName,
            @RequestParam String query) {
        log.info("Query request for config: {}, query: {}", configName, query);
        return ResponseEntity.ok(service.getQueryResult(configName, query));
    }
}
