package solutions.onz.platform.strato.creator.provisioner.api;

import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationLock;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/configurations", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Configurations", description = "Management of configurations")
public class ConfigurationController {
    public record CloneRequest(String name) {
    }

    public record LockRequest(boolean locked) {
    }

    private final ConfigurationService configurationService;

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    /**
     * Retrieves a list of all configurations in their full format, restricted to the latest versions.
     * If a search query is provided, configurations are filtered accordingly.
     *
     * @param search an optional search string to filter configurations by name, description, or other attributes
     * @return a ResponseEntity containing a list of the latest version of configurations, optionally filtered by the search query
     */
    @GetMapping
    @Operation(
            summary = "List all configurations (latest versions)",
            description = "Returns all configurations in full format. Only latest versions are in the document"
    )
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_READ')")
    public ResponseEntity<List<Configuration>> listAll(
            @RequestParam(value = "search", required = false) String search) {
        List<Configuration> result = (search != null && !search.isBlank())
                ? configurationService.search(search)
                : configurationService.findAllLatestVersions();
        configurationService.maskSecretFields(result);
        return ResponseEntity.ok(result);
    }

    /**
     * Retrieves a configuration by its unique identifier
     *
     * @param id the unique identifier of the configuration
     * @return a ResponseEntity containing the configuration
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get configuration by id", description = "Returns a configuration by its unique identifier")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_READ')")
    public ResponseEntity<Configuration> get(@PathVariable String id) {
        return configurationService.findById(id)
                .map(config -> {
                    configurationService.maskSecretFields(config);
                    return ResponseEntity.ok(config);
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Configuration not found"));
    }

    /**
     * Retrieves all versions of a configuration by its document ID
     *
     * @param documentId the unique identifier of the configuration document
     * @return a ResponseEntity containing a list of configuration versions
     */
    @GetMapping("/versions/{documentId}")
    @Operation(summary = "List all versions of a configuration", description = "Returns all versions of a configuration by its document ID")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_READ')")
    public ResponseEntity<List<Configuration>> getDocumentAllVersions(@PathVariable("documentId") UUID documentId) {
        List<Configuration> versions = configurationService.findAllVersions(documentId);
        configurationService.maskSecretFields(versions);
        return ResponseEntity.ok(versions);
    }

    /**
     * Creates a new configuration version
     *
     * @param config the configuration to be created
     * @return a ResponseEntity containing the created configuration
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Create configuration", description = "Creates a new configuration version")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_WRITE')")
    public ResponseEntity<Configuration> create(@RequestBody Configuration config) {
        if (config.getId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Configuration ID must be null for creation");
        }
        Configuration saved = configurationService.save(config);
        configurationService.maskSecretFields(saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Updates an existing configuration version. The Schema reference is immutable and is not allowed to be updated.
     *
     * @param config the updated configuration
     * @return a ResponseEntity containing the updated configuration
     */
    @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Update configuration")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_WRITE')")
    public ResponseEntity<Configuration> update(@RequestBody Configuration config) {
        if (config.getSchemaId() == null
                || !configurationService.findById(config.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Configuration not found. Update can be done only against existing entity"))
                        .getSchemaId()
                        .equals(config.getSchemaId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Schema ID cannot be changed");
        }
        Configuration saved = configurationService.save(config);
        configurationService.maskSecretFields(saved);
        return ResponseEntity.ok(saved);
    }

    @PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Update configuration version", description = "Updates a configuration version in the database")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_WRITE')")
    public ResponseEntity<Configuration> patch(@RequestBody Configuration config, @PathVariable String id) {
        Configuration existingConfig = configurationService.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Configuration not found. Update can be done only against existing entity"));
        if (!existingConfig.getSchemaId()
                        .equals(config.getSchemaId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Schema ID cannot be changed");
        }
        Configuration saved = configurationService.save(config);
        configurationService.maskSecretFields(saved);
        return ResponseEntity.ok(saved);
    }


    /**
     * Deletes a configuration version from the database
     *
     * @param id the unique identifier of the configuration version
     * @return a ResponseEntity indicating the success of the operation
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Soft Delete configuration version", description = "Marks a configuration version as deleted, but does not delete it from the database")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        configurationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Deletes a configuration version from the database
     *
     * @param documentId the unique identifier of the configuration document
     * @return a ResponseEntity indicating the success of the operation
     */
    @DeleteMapping("/document/{documentId}")
    @Operation(summary = "Hard Delete configuration version", description = "Deletes a configuration version from the database")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_WRITE')")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID documentId) {
        configurationService.hardDeleteDocument(documentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Clones a configuration version
     *
     * @param id the unique identifier of the configuration version to be cloned
     * @param request the clone request containing the new name for the cloned configuration
     * @return a ResponseEntity containing the cloned configuration
     */
    @PostMapping(path = "/clone/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Clone configuration", description = "Creates a new independent clone of the latest version of the given configuration with version reset to 1")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_WRITE')")
    public ResponseEntity<Configuration> clone(@PathVariable String id, @RequestBody CloneRequest request) {
        Configuration cloned = configurationService.clone(id, request.name());
        configurationService.maskSecretFields(cloned);
        return ResponseEntity.status(HttpStatus.CREATED).body(cloned);
    }

    /**
     * Exports a single configuration by its unique identifier.
     *
     * @param id the unique identifier of the configuration to export
     * @return a ResponseEntity containing the configuration if found and successfully exported,
     *         or a ResponseEntity with a not found status if the configuration does not exist
     */
    @GetMapping("/export/{id}")
    @Operation(summary = "Export a single configuration by id")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_READ')")
    public ResponseEntity<Configuration> export(@PathVariable String id) {
        return configurationService.findById(id)
                .map(config -> {
                    configurationService.maskSecretFields(config);
                    return ResponseEntity.ok(config);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(path = "/export-batch", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Export multiple configurations as a single payload")
    @PreAuthorize("hasAuthority('PERM_CONFIG_PROVIDER_READ')")
    public ResponseEntity<Map<String, List<Configuration>>> exportBatch(@RequestBody List<String> ids) {
        List<Configuration> all = ids.stream()
                .map(configurationService::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
        configurationService.maskSecretFields(all);
        return ResponseEntity.ok(Map.of("configurations", all));
    }

    @PatchMapping("/{documentId}/lock")
    @PreAuthorize("hasAuthority(@permissions.CONFIG_LOCK_SET)")
    @Operation(summary = "Lock or unlock a configuration", description = "Sets the lock state for a configuration document. Requires PERM_SET_CONFIG_LOCK.")
    public ResponseEntity<ConfigurationLock> setLock(
            @PathVariable UUID documentId,
            @RequestBody LockRequest request) {
        String currentUser = SecurityUtils.getCurrentUserLogin();
        ConfigurationLock result = configurationService.lockConfiguration(documentId, request.locked(), currentUser);
        return ResponseEntity.ok(result);
    }
}
