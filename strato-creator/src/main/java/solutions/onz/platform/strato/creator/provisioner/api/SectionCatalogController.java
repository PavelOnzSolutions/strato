package solutions.onz.platform.strato.creator.provisioner.api;

import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.services.SectionCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping(path = "/api/section-catalog", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Section Catalog")
@RequiredArgsConstructor
public class SectionCatalogController {

    private final SectionCatalogService service;

    public record CloneRequest(String displayName, String sectionKey) {}

    @Operation(summary = "List catalog entries for a flavor")
    @GetMapping
    @PreAuthorize("hasAuthority('PERM_CONFIG_SECTIONS_READ')")
    public ResponseEntity<List<SectionCatalogEntry>> list(@RequestParam(defaultValue = "AZURE") Flavor flavor) {
        return ResponseEntity.ok(service.findAllLatest(flavor));
    }

    @Operation(summary = "Get a catalog entry by id")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SECTIONS_READ')")
    public ResponseEntity<SectionCatalogEntry> getById(@PathVariable String id) {
        return service.findById(id).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Create an extension catalog entry")
    @PostMapping
    @PreAuthorize("hasAuthority('PERM_CONFIG_SECTIONS_WRITE')")
    public ResponseEntity<SectionCatalogEntry> create(@RequestBody SectionCatalogEntry entry) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(entry));
    }

    @Operation(summary = "Update an extension catalog entry")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SECTIONS_WRITE')")
    public ResponseEntity<SectionCatalogEntry> update(@PathVariable String id, @RequestBody SectionCatalogEntry entry) {
        return ResponseEntity.ok(service.update(id, entry));
    }

    @Operation(summary = "Clone a catalog entry under a new key")
    @PostMapping(path = "/clone/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('PERM_CONFIG_SECTIONS_WRITE')")
    public ResponseEntity<SectionCatalogEntry> clone(@PathVariable String id, @RequestBody CloneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.clone(id, request.displayName(), request.sectionKey()));
    }

    @Operation(summary = "Soft-delete an extension catalog entry")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_CONFIG_SECTIONS_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArg(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
    }
}
