package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import solutions.onz.platform.strato.creator.services.ResourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/resource-categories", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Resource Categories", description = "CRUD operations for Resource Categories")
public class ResourceCategoriesController {

    private final ResourceService service;

    @GetMapping
    @Operation(
            summary = "List resource categories",
            description = "Returns all resource categories",
            tags = {"Resource Categories"}
    )
    @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
    public ResponseEntity<List<ResourceCategory>> list() {
        return ResponseEntity.ok(service.findAllResourceCategories());
    }

    @GetMapping(path = "/{id}")
    @Operation(
            summary = "Get resource category by id",
            description = "Returns a resource category by its unique identifier",
            tags = {"Resource Categories"}
    )
    @PreAuthorize("hasAuthority('PERM_RESOURCE_READ')")
    public ResponseEntity<ResourceCategory> get(@PathVariable("id") String id) {
        return service.findResourceCategoryById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource category not found"));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Create resource category",
            description = "Creates a new resource category",
            tags = {"Resource Categories"},
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ResourceCategory.class))
            )
    )
    @PreAuthorize("hasAuthority('PERM_RESOURCE_WRITE')")
    public ResponseEntity<ResourceCategory> create(@RequestBody ResourceCategory body) throws URISyntaxException {
        ResourceCategory saved = service.createResourceCategory(body);
        return ResponseEntity.created(new URI("/api/resource-categories/" + saved.getId())).body(saved);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Update resource category",
            description = "Updates an existing resource category by id",
            tags = {"Resource Categories"},
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ResourceCategory.class))
            )
    )
    @PreAuthorize("hasAuthority('PERM_RESOURCE_WRITE')")
    public ResponseEntity<ResourceCategory> update(@PathVariable("id") String id, @RequestBody ResourceCategory body) {
        ResourceCategory updated = service.updateResourceCategory(id, body)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource category not found"));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping(path = "/{id}")
    @Operation(
            summary = "Delete resource category",
            description = "Deletes a resource category by id",
            tags = {"Resource Categories"}
    )
    @PreAuthorize("hasAuthority('PERM_RESOURCE_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        try {
            service.deleteResourceCategory(id);
        } catch (Exception e) {
            log.error("Error deleting resource category: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return ResponseEntity.noContent().build();
    }
}
