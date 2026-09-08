package solutions.onz.platform.strato.creator.forge.api;

import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.forge.services.BicepLanguageService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentPlan;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.services.dto.EnvironmentImportDtos;
import com.azure.resourcemanager.resources.bicep.models.FileDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/environments", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Environments", description = "Environment planning and deployment")
public class EnvironmentsController {

        private final EnvironmentsService service;
        private final BicepLanguageService bicepLanguageService;

        public record EnvironmentCompact(
                String id,
                String name,
                String region,
                String resourceGroup,
                String subscription,
                Integer nodes) {
                public EnvironmentCompact(Environment env) {
                        this(env.getId(), env.getName(), env.getConfig().getRegion(), env.getConfig().getResourceGroup(), env.getConfig().getSubscriptionId(), 0);
                }
        }

        public record CloneRequest(String name, EnvironmentConfig config) {
        }

        @GetMapping
        @Operation(summary = "List environments", description = "Returns all environments in full format. Only latest versions are in the document", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<List<Environment>> listAll() {
                return ResponseEntity.ok(service.findAllLatestVersions());
        }

        @GetMapping(path = "/{id}")
        @Operation(summary = "Get environment by id", description = "Returns an environment by its unique identifier", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<Environment> get(@PathVariable String id) {
                return service.findById(id)
                                .map(ResponseEntity::ok)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment not found"));
        }

        @GetMapping("/{id}/compact")
        @Operation(summary = "Get compact environment by id", description = "Returns a compact representation of an environment by its unique identifier", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<EnvironmentCompact> getCompact(@PathVariable String id) {
                return service.findById(id)
                                .map(env -> ResponseEntity.ok(new EnvironmentCompact(env)))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment not found"));
        }

        @GetMapping("/versions/{documentId}")
        @Operation(summary = "List all versions of an environment", description = "Returns all versions of an environment", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<List<Environment>> getDocumentAllVersions(@PathVariable UUID documentId) {
                return ResponseEntity.ok(service.findAllVersions(documentId));
        }

        @GetMapping("/latest/{documentId}")
        @Operation(summary = "Get latest version of an environment", description = "Returns the latest version of an environment", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<Environment> getDocumentLatestVersion(@PathVariable UUID documentId) {
                return service.findByLatestVersion(documentId)
                                .map(ResponseEntity::ok)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment by documentId not found: " + documentId));
        }

        @GetMapping("/latest/byName/{name}")
        @Operation(summary = "Get environment by name and version", description = "Returns an environment by name and version", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<Environment> getLatestByName(@PathVariable String name) {
                return service.findLatestByName(name)
                                .map(ResponseEntity::ok)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment by name and version not found: " + name));
        }


        @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Create environment", description = "Creates a new environment", tags = { "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Environment> create(@RequestBody Environment env) {
                if (env.getId() != null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Environment ID must be null for creation");
                }

                return ResponseEntity.status(HttpStatus.CREATED).body(service.create(env));
        }

        @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Update environment", description = "Updates an existing environment", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Environment> update(@PathVariable String id, @RequestBody Environment env) {
                return service.update(id, env)
                                .map(ResponseEntity::ok)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment not found"));
        }

        @PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Patch environment", description = "Partially updates an existing environment by id", tags = {
                        "Environments" }, requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Environment.class))))
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Environment> patch(@PathVariable String id, @RequestBody Environment env) {
                return service.patch(id, env)
                                .map(ResponseEntity::ok)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment not found"));
        }

        @DeleteMapping(path = "/{id}")
        @Operation(summary = "Delete environment", description = "Deletes an single object in environments - Dangerous operation as it may break the version history consistency", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Void> deleteObject(@PathVariable String id) {
                service.delete(id);
                return ResponseEntity.noContent().build();
        }

        @DeleteMapping(path = "/mark/{documentId}")
        @Operation(summary = "Mark environment as deleted", description = "Deletes an environment - Marks the given documents last version as deleted", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Void> deleteDocument(@PathVariable UUID documentId) {
                Environment env = new Environment();
                env.setDeleted(true);
                service.update(
                                service.findByLatestVersion(documentId)
                                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                                "Environment not found"))
                                                .getId(),
                                env);

                return ResponseEntity.noContent().build();
        }

        @DeleteMapping(path = "/document/{documentId}")
        @Operation(summary = "Deletes whole document, including its previous versions", description = "Deletes whole document, including its previous versions")
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Void> deleteDocumentWithVersions(@PathVariable("documentId") UUID documentId) {
                service.hardDeleteDocument(documentId);
                return ResponseEntity.noContent().build();
        }

        @PostMapping(path = "/{id}/restore")
        @Operation(summary = "Restore environment version", description = "Restores a specific version of an environment as a new version", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Environment> restore(@PathVariable("id") String id) {
                return ResponseEntity.ok(service.restore(id));
        }

        @PostMapping(path = "/clone/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Clone environment", description = "Creates a new independent clone of the latest version of the given environment with version reset to 1", tags = { "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<Environment> clone(@PathVariable("id") String id, @RequestBody CloneRequest request) {
                Environment created = service.clone(id, request.name(), request.config());
                return ResponseEntity.status(HttpStatus.CREATED).body(created);
        }

        @PostMapping(path = "/plan", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Create deployment plan", description = "Builds a connected graph and returns a deployment order based on Environment references", tags = {
                        "Environments" }, requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Environment.class))))
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<DeploymentPlan> createPlan(@RequestBody Environment env) {
                DeploymentPlan plan = service.createPlan(env);
                return ResponseEntity.ok(plan);
        }

        @PostMapping(path = "/import", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Import environment from resource group", description = "Reads resources from Azure Resource Group and matches them to Resource Templates by ARM type/apiVersion. If source is not specified, the response suggests choosing ARM vs Graph API Resource Map.", tags = {"Environments"})
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
        public ResponseEntity<EnvironmentImportDtos.ImportResult> importFromRg(
                        @RequestBody EnvironmentImportDtos.ImportRequest request) {
                var res = service.importFromResourceGroup(request);
                return ResponseEntity.ok(res);
        }

        @GetMapping(path = "/{id}/export/bicep", produces = "application/zip")
        @Operation(summary = "Export environment as Bicep", description = "Converts the environment ARM template into Bicep language and returns a ZIP file. Only for Azure environments", tags = {
                        "Environments" })
        @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_READ')")
        public ResponseEntity<byte[]> exportToBicep(@PathVariable("id") String id) {
                Environment env = service.findById(id)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Environment not found"));

                List<FileDefinition> files = bicepLanguageService.exportToBicep(env);

                try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                ZipOutputStream zos = new ZipOutputStream(baos)) {

                        for (var file : files) {
                                ZipEntry entry = new ZipEntry(file.path());
                                zos.putNextEntry(entry);
                                zos.write(file.contents().getBytes(StandardCharsets.UTF_8));
                                zos.closeEntry();
                        }

                        zos.finish();
                        byte[] zipBytes = baos.toByteArray();

                        return ResponseEntity.ok()
                                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                                        "attachment; filename=\"environment_" + id + ".zip\"")
                                        .contentType(MediaType.valueOf("application/zip"))
                                        .body(zipBytes);

                } catch (IOException e) {
                        log.error("Failed to create ZIP for Bicep export", e);
                        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Failed to create ZIP for Bicep export");
                }
        }

}
