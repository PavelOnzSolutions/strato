package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import solutions.onz.platform.strato.creator.services.UserConfigurationService;
import solutions.onz.platform.strato.creator.services.UserManagementService;
import solutions.onz.platform.strato.creator.services.dto.UserAccountView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/user-accounts", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "User Accounts", description = "User accounts management")
public class UserAccountController {
    public record UpdateRolesRequest(List<String> roles) { }
    public record CreateUserRequest(String username, String password, List<String> roles) { }
    public record ChangePasswordRequest(String oldPassword, String newPassword) { }
    public record UpdateUserRequest(Boolean enabled, String displayName, String email) { }

    private final UserManagementService managementService;
    private final UserConfigurationService configurationService;

    /**
     * List user accounts
     * @return
     */
    @GetMapping
    @Operation(summary = "List user accounts", description = "Returns all user accounts without password fields")
    public ResponseEntity<List<UserAccountView>> list() {
        return ResponseEntity.ok(managementService.listAll());
    }

    /**
     * Get user account by username
     * @param username
     * @return
     */
    @GetMapping(path = "/{username}")
    @Operation(summary = "Get user account by username", description = "Returns a user account by username without password fields")
    public ResponseEntity<UserAccountView> getByUsername(@PathVariable String username) {
        return managementService.getByUsername(username)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }


    /**
     * Create new user
     * @param body
     * @return
     */
    @PostMapping
    @Operation(summary = "Create new user", description = "Creates a new local user account")
    public ResponseEntity<UserAccountView> create(@RequestBody CreateUserRequest body) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(managementService.createUser(body.username(), body.password(), body.roles()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }


    /**
     * Update user roles
     * @param username
     * @param body
     * @return
     */
    @PatchMapping(path = "/{username}/roles")
    @Operation(summary = "Update user roles", description = "Updates the roles of an existing user account")
    public ResponseEntity<UserAccountView> updateRoles(@PathVariable("username") String username, @RequestBody UpdateRolesRequest body) {
        try {
            return ResponseEntity.ok(managementService.updateRoles(username, body.roles()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }



    @PatchMapping(path = "/{username}")
    @Operation(summary = "Update user fields", description = "Partial update: enabled, displayName, email. displayName/email only for LOCAL users.")
    public ResponseEntity<UserAccountView> updateUser(@PathVariable("username") String username,
                                                      @RequestBody UpdateUserRequest body) {
        try {
            return ResponseEntity.ok(managementService.updateUser(
                    username, body.enabled(), body.displayName(), body.email()));
        } catch (IllegalArgumentException e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            HttpStatus status = msg.toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND
                    : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, msg);
        }
    }


    /**
     * Change password for local account
     * @param username
     * @param body
     * @param auth
     * @return
     */
    @PostMapping(path = "/{username}/change-password", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Change password for local account", description = "Allows a user to change their password for local accounts. Admins can change without old password.", requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ChangePasswordRequest.class))), responses = {
            @ApiResponse(responseCode = "204", description = "Password changed"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<?> changePassword(@PathVariable("username") String username,
            @RequestBody ChangePasswordRequest body,
            Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("PERM_USER_WRITE"));
        String caller = SecurityUtils.getCurrentUserLogin();
        if (!isAdmin && !username.equalsIgnoreCase(caller)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can change only your own password");
        }
        try {
            if (isAdmin) {
                managementService.changePasswordAdmin(username, body.newPassword());
            } else {
                boolean ok = managementService.changePassword(username, body.oldPassword(), body.newPassword());
                if (!ok) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Old password does not match");
                }
            }
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * Get stored Client configuration for an user
     * @param username
     * @return
     */
    @Operation(summary = "Get stored Client configuration for an user", description = "Get stored Client configuration for an user.", requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ChangePasswordRequest.class))), responses = {
            @ApiResponse(responseCode = "200", description = "Configuration found and retrieved"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Configuration not found")
    })
    @PreAuthorize("hasAuthority(@permissions.USER_READ) or #username == authentication.name")
    @GetMapping(value = "/{username}/configuration", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserConfiguration> getUserConfiguration(@PathVariable String username) {
        return ResponseEntity
                .ok(
                        configurationService
                                .getConfigurationForUser(username)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User configuration not found"))
                );
    }

    /**
     * Set Client configuration for an user
     * @param username
     * @param configuration
     * @return
     */
    @Operation(summary = "Set Client configuration for an user", description = "Set Client configuration for an user.", responses = {
            @ApiResponse(responseCode = "200", description = "Configuration updated"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE) or #username == authentication.name")
    @PutMapping(value = "/{username}/configuration", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserConfiguration> setUserConfiguration(@PathVariable String username, @RequestBody UserConfiguration configuration) {
        try {
            return ResponseEntity.ok(configurationService.setUserConfiguration(username, configuration));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @Operation(summary = "Delete user", description = "Delete user.", responses = {
            @ApiResponse(responseCode = "204", description = "User deleted"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE) or hasRole('ADMIN')")
    @DeleteMapping(value = "/{username}")
    public ResponseEntity<Void> deleteUser(@PathVariable String username) {
        configurationService.deleteUserConfiguration(username);
        managementService.deleteUser(username);
        return ResponseEntity.noContent().build();
    }
}
