package solutions.onz.platform.strato.creator.provisioner.api;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationSchemaService;
import solutions.onz.platform.strato.creator.provisioner.services.EffectiveSchemaMaterializer;
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
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/configuration-schemas", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Configuration Schemas", description = "Management of configuration schemas")
public class ConfigurationSchemaController {
    public record CloneRequest(String name) {
    }

    private final ConfigurationSchemaService schemaService;
    private final EffectiveSchemaMaterializer materializer;

    @GetMapping
    @Operation(summary = "List all schemas")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_READ')")
    public ResponseEntity<List<ConfigurationSchema>> listAll() {
        return ResponseEntity.ok(schemaService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get schema by id")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_READ')")
    public ResponseEntity<ConfigurationSchema> get(@PathVariable("id") String id) {
        return schemaService.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Create schema")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_WRITE')")
    public ResponseEntity<ConfigurationSchema> create(@RequestBody ConfigurationSchema schema) {
        if (schema.getId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Schema ID must be null for creation");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(schemaService.save(schema));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Update schema")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_WRITE')")
    public ResponseEntity<ConfigurationSchema> update(@PathVariable("id") String id,
            @RequestBody ConfigurationSchema schema) {
        schema.setId(id);
        return ResponseEntity.ok(schemaService.save(schema));
    }

    @GetMapping("/{id}/materialized")
    @Operation(summary = "Get materialized JSON Schema for a configuration schema")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_READ')")
    public ResponseEntity<Map<String, Object>> getMaterialized(@PathVariable String id) {
        return schemaService.findById(id)
                .map(schema -> ResponseEntity.ok(materializer.materialize(schema)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete schema")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        schemaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(path = "/clone/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Clone configuration schema")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_WRITE')")
    public ResponseEntity<ConfigurationSchema> clone(@PathVariable("id") String id, @RequestBody CloneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(schemaService.clone(id, request.name()));
    }

    @GetMapping("/export/{id}")
    @Operation(summary = "Export a single schema by id")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_READ')")
    public ResponseEntity<ConfigurationSchema> export(@PathVariable("id") String id) {
        return schemaService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(path = "/export-batch", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Export multiple schemas as a single payload")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SCHEMA_READ')")
    public ResponseEntity<Map<String, List<ConfigurationSchema>>> exportBatch(@RequestBody List<String> ids) {
        List<ConfigurationSchema> all = ids.stream()
                .map(schemaService::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("schemas", all));
    }
}
