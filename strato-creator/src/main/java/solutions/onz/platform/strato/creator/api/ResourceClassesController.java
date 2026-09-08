package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.services.ResourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/resources", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Resource Classes", description = "CRUD operations for Resource Classes")
public class ResourceClassesController {
        private final ResourceService service;

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }

        public record ResourceCategoryCompact(String id, String name, String key, String color) {
        }

        public record ResourceClassCompact(
                        String id, String name,
                        String abbreviation,
                        Boolean isSystem,
                        String icon,
                        ResourceType type,
                        ResourceCategoryCompact resourceCategory) {
        }

        /**
         * Retrieves a compact, paged list of all resources.
         *
         * @return a ResponseEntity containing a page of ResourceClassCompact objects.
         */
        @GetMapping("/list")
        @Operation(summary = "Compact list resources Paged", description = "Returns all resources in a compact, paged list format, suitable for UIs", tags = {
                        "Resources" })
        @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
        public ResponseEntity<Page<ResourceClassCompact>> listCompactPaged(
                        @ParameterObject Pageable pageable,
                        @RequestParam(name = "type", required = false) ResourceType type,
                        @RequestParam(name = "categoryId", required = false) String categoryId) {
                return ResponseEntity.ok(
                                service
                                                .findAllResourcesCompactPaged(pageable, type, categoryId)
                                                .map(this::toCompact));
        }

        /**
         * Retrieves a full, compact list of all resources.
         *
         * @return a ResponseEntity containing a list of ResourceClassCompact objects.
         */
        @GetMapping("/listFull")
        @Operation(summary = "Compact list resources", description = "Returns all resources in a compact list format, suitable for UIs", tags = {
                        "Resources" })
        @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
        public ResponseEntity<List<ResourceClassCompact>> listCompactFull() {
                return ResponseEntity.ok(
                                service
                                                .findAllResources()
                                                .stream()
                                                .map(this::toCompact)
                                                .toList());
        }

        /**
         * Retrieves a full list of all resources.
         *
         * @return a ResponseEntity containing a list of ResourceClassC objects.
         */
        @GetMapping
        @Operation(summary = "Full list resources", description = "Returns all resources in a full list format", tags = {
                        "Resources" })
        @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
        public ResponseEntity<List<ResourceClass>> listFull() {
                return ResponseEntity.ok(service.maskCredentialFields(service.findAllResources()));
        }

        /**
         * Retrieves a resource by its unique identifier.
         *
         * @param id the unique identifier of the resource to retrieve.
         * @return a ResponseEntity containing the requested ResourceClass object if
         *         found.
         * @throws ResponseStatusException if the resource is not found.
         */
        @GetMapping(path = "/{id}")
        @Operation(summary = "Get resource by id", description = "Returns a resource by its unique identifier", tags = {
                        "Resources" })
        @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
        public ResponseEntity<ResourceClass> get(@PathVariable("id") String id) {
                return service.findResourceById(id)
                                .map(rc -> ResponseEntity.ok(service.maskCredentialFields(rc)))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Resource not found"));
        }

        /**
         * Retrieves a list of resources filtered by their type.
         *
         * @param type the type of resources to retrieve, corresponding to the
         *             {@code ResourceType} enum.
         * @return a ResponseEntity containing a list of {@code ResourceClass} objects
         *         matching the specified type.
         *         If no resources match the given type, an empty list is returned.
         */
        @GetMapping(path = "/type/{type}")
        @Operation(summary = "Get all resources of given type", description = "Returns a list of resources by their type", tags = {
                        "Resources" })
        @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
        public ResponseEntity<List<ResourceClass>> listByType(@PathVariable("type") String type) {
                return ResponseEntity.ok(service.maskCredentialFields(
                        service.findAllResourcesByType(ResourceType.valueOf(type.toUpperCase()))));
        }

        /**
         * Creates a new resource.
         *
         * @param body The resource object to be created. It must be provided in the
         *             request body
         *             and adhere to the structure defined by {@code ResourceClass}.
         * @return A {@code ResponseEntity} containing the created resource and an HTTP
         *         status of 201 (Created).
         */
        @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Create resource", description = "Creates a new resource", tags = {
                        "Resources" }, requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ResourceClass.class))))
        @PreAuthorize("hasAuthority('PERM_RESOURCE_WRITE')")
        public ResponseEntity<ResourceClass> create(@RequestBody ResourceClass body) {
                ResourceClass saved = service.createResource(body);
                return ResponseEntity.status(HttpStatus.CREATED).body(service.maskCredentialFields(saved));
        }

        /**
         * Updates an existing resource identified by its unique identifier.
         *
         * @param id   the unique identifier of the resource to be updated.
         * @param body the new data for the resource, encapsulated in a
         *             {@code ResourceClass} object.
         * @return a {@code ResponseEntity} containing the updated {@code ResourceClass}
         *         object if the update is successful.
         * @throws ResponseStatusException if the resource with the specified id is not
         *                                 found.
         */
        @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Update resource", description = "Updates an existing resource by id", tags = {
                        "Resources" }, requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ResourceClass.class))))
        @PreAuthorize("hasAuthority('PERM_RESOURCE_WRITE')")
        public ResponseEntity<ResourceClass> update(@PathVariable("id") String id, @RequestBody ResourceClass body) {
                ResourceClass updated = service.updateResource(id, body)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Resource not found"));
                return ResponseEntity.ok(service.maskCredentialFields(updated));
        }

        /**
         * Deletes a resource by its unique identifier.
         *
         * @param id
         * @return
         */
        @DeleteMapping(path = "/{id}")
        @Operation(summary = "Delete resource", description = "Deletes a resource by id", tags = { "Resources" })
        @PreAuthorize("hasAuthority('PERM_RESOURCE_WRITE')")
        public ResponseEntity<Void> delete(@PathVariable("id") String id) {
                service.deleteResource(id);
                return ResponseEntity.noContent().build();
        }

        private ResourceClassCompact toCompact(ResourceClass resource) {
                return new ResourceClassCompact(
                                resource.getId(),
                                resource.getName(),
                                resource.getAbbreviation(),
                                resource.getIsSystem(),
                                resource.getIcon(),
                                resource.getType(),
                                resource.getResourceCategory() != null
                                                ? toCategoryCompact(resource.getResourceCategory())
                                                : null);
        }

        private ResourceCategoryCompact toCategoryCompact(ResourceCategory category) {
                return new ResourceCategoryCompact(category.getId(), category.getName(), category.getKey(),
                                category.getColor());
        }
}
