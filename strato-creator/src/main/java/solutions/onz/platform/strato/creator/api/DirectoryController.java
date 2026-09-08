package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.DirectoryConfig;
import solutions.onz.platform.strato.creator.services.DirectoryService;
import solutions.onz.platform.strato.creator.services.UserManagementService;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import solutions.onz.platform.strato.creator.api.dto.DirectoryDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/directory", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Directory", description = "Entra ID directory configuration and user import")
public class DirectoryController {

    private final DirectoryService directoryService;
    private final UserManagementService userManagementService;

    @GetMapping("/config")
    @PreAuthorize("hasAnyAuthority({@permissions.USER_WRITE, @permissions.USER_READ})")
    @Operation(summary = "Get directory configuration")
    public ResponseEntity<DirectoryDtos.DirectoryConfigDto> getConfig() {
        return directoryService.getConfig()
                .map(cfg -> ResponseEntity.ok(
                        new DirectoryDtos.DirectoryConfigDto(cfg.isEnabled(), cfg.getCredentialResourceId())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Directory not configured"));
    }

    public record SaveConfigRequest(String credentialResourceId) {}

    @PutMapping(path = "/config", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    @Operation(summary = "Save directory configuration")
    public ResponseEntity<DirectoryDtos.DirectoryConfigDto> saveConfig(@RequestBody SaveConfigRequest body) {
        if (body.credentialResourceId() == null || body.credentialResourceId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "credentialResourceId is required");
        }
        DirectoryConfig saved = directoryService.saveConfig(
                body.credentialResourceId(), SecurityUtils.getCurrentUserLogin());
        return ResponseEntity.ok(
                new DirectoryDtos.DirectoryConfigDto(saved.isEnabled(), saved.getCredentialResourceId()));
    }

    @PostMapping("/config/test")
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    @Operation(summary = "Test directory connection")
    public ResponseEntity<DirectoryDtos.EntraIdTestResponse> testConnection() {
        return ResponseEntity.ok(directoryService.testConnection());
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    @Operation(summary = "List or search directory users")
    public ResponseEntity<List<DirectoryDtos.DirectoryUserDto>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int top) {
        List<DirectoryDtos.DirectoryUserDto> users = (search == null || search.isBlank())
                ? directoryService.listUsers(top)
                : directoryService.searchUsers(search, top);
        return ResponseEntity.ok(users);
    }

    @PostMapping(path = "/import", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    @Operation(summary = "Import selected directory users")
    public ResponseEntity<List<DirectoryDtos.ImportUserResult>> importUsers(@Valid @RequestBody DirectoryDtos.ImportRequest request) {
        List<DirectoryDtos.ImportUserResult> results = request.users().stream()
                .map(userManagementService::importFromDirectory)
                .toList();
        return ResponseEntity.ok(results);
    }
}
