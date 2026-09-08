package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.services.AuthorityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/authorities")
@RequiredArgsConstructor
@Tag(name = "Authorities", description = "Authority/Role management")
public class AuthorityController {

    private final AuthorityService authorityService;

    @GetMapping
    @Operation(summary = "List all authorities")
    @PreAuthorize("hasAuthority('PERM_ROLE_READ')")
    public ResponseEntity<List<Authority>> findAll() {
        return ResponseEntity.ok(authorityService.findAll());
    }

    @PostMapping
    @Operation(summary = "Create or update authority")
    @PreAuthorize("hasAuthority('PERM_ROLE_WRITE')")
    public ResponseEntity<Authority> save(@RequestBody Authority authority) {
        try {
            return ResponseEntity.ok(authorityService.save(authority));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{name}")
    @Operation(summary = "Delete authority")
    @PreAuthorize("hasAuthority('PERM_ROLE_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable String name) {
        try {
            authorityService.delete(name);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
}
