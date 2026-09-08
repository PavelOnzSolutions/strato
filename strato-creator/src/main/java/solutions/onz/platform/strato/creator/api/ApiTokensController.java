package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.domain.IssuedToken;
import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.domain.enums.UserSource;
import solutions.onz.platform.strato.creator.repositories.IssuedTokenRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.services.AuthorityService;
import solutions.onz.platform.strato.creator.services.JwtService;
import solutions.onz.platform.strato.creator.services.TokenAuditService;
import solutions.onz.platform.strato.creator.utils.PasswordUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static solutions.onz.platform.strato.creator.utils.PasswordUtils.secureRandomString;

@Slf4j
@RestController
@RequestMapping(path = "/api/tokens", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "API Tokens", description = "Manage issued API tokens")
@RequiredArgsConstructor
public class ApiTokensController {

    private final IssuedTokenRepository issuedTokenRepository;
    private final UserAccountRepository userAccountRepository;
    private final JwtService jwtService;
    private final TokenAuditService tokenAuditService;
    private final AuthorityService authorityService;

    // DTO records
    public record TokenListItem(
            String id,
            String userId,
            String description,
            Instant issuedAt,
            Instant expiresAt,
            boolean revoked) {
        public static TokenListItem from(IssuedToken token) {
            return new TokenListItem(
                    token.getId(),
                    token.getUserId(),
                    token.getDescription(),
                    token.getIssuedAt(),
                    token.getExpiresAt(),
                    token.isRevoked());
        }
    }

    public record CreateTokenRequest(
            @Schema(description = "Token name/description", example = "CI/CD Pipeline Token") String name,
            @Schema(description = "Number of days until token expires (default: 30)", example = "30") Integer expirationDays,
            @Schema(description = "List of permissions for this token", example = "[\"PERM_READ\", \"PERM_WRITE\"]") List<String> permissions) {
    }

    public record CreateTokenResponse(
            @Schema(description = "Token record ID") String id,
            @Schema(description = "The JWT token (only shown once)") String token,
            @Schema(description = "Token name/description") String name,
            @Schema(description = "Token expiration timestamp") Instant expiresAt) {
    }

    @GetMapping
    @Operation(summary = "List issued API tokens", description = "Returns all issued API tokens with their metadata (excludes the actual JWT)", responses = {
            @ApiResponse(responseCode = "200", description = "List of tokens", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = TokenListItem.class))))
    })
    public ResponseEntity<List<TokenListItem>> list() {
        List<TokenListItem> tokens = issuedTokenRepository.findAll().stream()
                .map(TokenListItem::from)
                .toList();
        return ResponseEntity.ok(tokens);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create new API token", description = "Creates a new API token with the specified name and expiration. The actual JWT is only returned in this response.", requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CreateTokenRequest.class))), responses = {
            @ApiResponse(responseCode = "201", description = "Token created", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CreateTokenResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<CreateTokenResponse> create(@RequestBody CreateTokenRequest request) {
        String tokenName = Optional.ofNullable(request.name())
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .orElse("API Token");

        int expirationDays = Optional.ofNullable(request.expirationDays())
                .filter(d -> d > 0 && d <= 365)
                .orElse(30);

        // Create service user account for the token
        String shortUuid = shortUuid();
        String username = "apitoken-" + tokenName.toLowerCase().replaceAll(" ", "-") + "-" + shortUuid;
        String rawPassword = secureRandomString(24);
        String hash = PasswordUtils.hash(rawPassword);

        // Create a new role with same name as user and specified permissions
        Authority authority = new Authority()
                .setName(username)
                .setPermissions(new HashSet<>(request.permissions() != null ? request.permissions() : List.of()));
        authorityService.save(authority);

        List<String> roles = List.of(authority.getName());

        UserAccount savedUser = userAccountRepository.save(
                new UserAccount()
                        .setPasswordHash(hash)
                        .setUsername(username)
                        .setSource(UserSource.LOCAL)
                        .setRoles(roles));

        // Calculate expiration
        Instant now = Instant.now();
        long ttlSeconds = (long) expirationDays * 24 * 60 * 60;
        Instant expiresAt = now.plus(expirationDays, ChronoUnit.DAYS);
        String jti = UUID.randomUUID().toString();

        // Generate JWT
        String jwt = jwtService.generateTokenWithTtl(savedUser.getId(), savedUser.getUsername(), savedUser.getDisplayName(), roles, jti,
                ttlSeconds);

        // Record token in audit
        IssuedToken issuedToken = tokenAuditService.record(savedUser.getId(), now, expiresAt, tokenName, jti);

        log.info("Created API token '{}' for user {} expiring at {}", tokenName, savedUser.getId(), expiresAt);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateTokenResponse(issuedToken.getId(), jwt, tokenName, expiresAt));
    }

    @PostMapping(path = "/{id}/revoke")
    @Operation(summary = "Revoke API token", description = "Marks the token as revoked and disables its underlying user account.", responses = {
            @ApiResponse(responseCode = "200", description = "Token revoked", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = TokenListItem.class))),
            @ApiResponse(responseCode = "404", description = "Token not found")
    })
    public ResponseEntity<TokenListItem> revoke(
            @Parameter(description = "Token ID") @PathVariable("id") String id) {
        Optional<IssuedToken> opt = issuedTokenRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        IssuedToken token = opt.get();
        if (!token.isRevoked()) {
            token.setRevoked(true);
            issuedTokenRepository.save(token);
        }
        // Disable associated user account if present
        if (token.getUserId() != null) {
            userAccountRepository.findById(token.getUserId()).ifPresent(user -> {
                if (user.isEnabled()) {
                    user.setEnabled(false);
                    userAccountRepository.save(user);
                }
            });
        }
        log.info("Revoked API token {}", id);
        return ResponseEntity.ok(TokenListItem.from(token));
    }

    @DeleteMapping
    @Operation(summary = "Delete API token(s)", description = "Deletes the specified token(s) and their associated user accounts.", responses = {
            @ApiResponse(responseCode = "204", description = "Token(s) deleted"),
            @ApiResponse(responseCode = "400", description = "No token IDs provided")
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "Token ID(s) to delete") @RequestParam("id") List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        for (String id : ids) {
            issuedTokenRepository.findById(id).ifPresent(token -> {
                // Delete associated user account and authority, if not session token
                if (!"local-login oauth2-login".contains(token.getDescription()) && token.getUserId() != null) {
                    userAccountRepository.findById(token.getUserId()).ifPresent(user -> {
                        String username = user.getUsername();
                        userAccountRepository.deleteById(user.getId());
                        // Delete the custom authority/role associated with this token
                        try {
                            authorityService.delete(username);
                        } catch (Exception e) {
                            log.warn("Failed to delete authority {} for token {}: {}", username, id, e.getMessage());
                        }
                    });
                }
                issuedTokenRepository.deleteById(id);
                log.info("Deleted API token {}", id);
            });
        }

        return ResponseEntity.noContent().build();
    }

    private static String shortUuid() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

}
