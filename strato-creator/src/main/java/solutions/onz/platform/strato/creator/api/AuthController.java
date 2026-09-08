package solutions.onz.platform.strato.creator.api;

import com.fasterxml.jackson.annotation.JsonAlias;
import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.services.JwtService;
import solutions.onz.platform.strato.creator.utils.PasswordUtils;
import solutions.onz.platform.strato.creator.services.TokenAuditService;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

import static solutions.onz.platform.strato.creator.utils.PasswordUtils.secureRandomString;

@RestController
@Tag(name = "Auth", description = "Authentication and token endpoints")
public class AuthController {

    private final UserAccountRepository userRepo;
    private final JwtService jwtService;
    private final TokenAuditService auditService;
    private final ApplicationProperties props;

    public AuthController(UserAccountRepository userRepo, JwtService jwtService, TokenAuditService auditService, ApplicationProperties props) {
        this.userRepo = userRepo;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.props = props;
    }

    public record LoginRequest(
            @JsonAlias({"user", "login"}) String username,
            @JsonAlias({"pass", "pwd", "password"}) String password
    ) {}
    public record TokenResponse(String token, String userId, String username, String imageUrl, Instant expiresAt) {}

    @PostMapping(path = "/auth/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Login with username and password",
            description = "Authenticates a user with local credentials and returns a JWT token",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = LoginRequest.class))
            ),
            responses = {
                    @ApiResponse(responseCode = "200", description = "Authenticated", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Invalid credentials")
            }
    )
    public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest req) {
        String username = Optional.ofNullable(req.username()).map(String::trim).orElse("");
        String password = Optional.ofNullable(req.password()).orElse("");
        if (username.isBlank() || password.isBlank()) {
            throw new BadCredentialsException("Invalid credentials");
        }
        UserAccount user = userRepo.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!PasswordUtils.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        long ttl = props.getSecurity().getJwt().getTtlSeconds();
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(ttl);
        
        // Initial absolute expiration
        Instant absoluteExp = now.plusSeconds(props.getSecurity().getJwt().getAbsoluteExpirationSeconds());
        
        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.getDisplayName(), user.getRoles(), null, 0, absoluteExp);
        auditService.record(user.getId(), now, exp, "local-login", null);
        return ResponseEntity.ok(new TokenResponse(token, user.getId(), user.getUsername(), user.getImageUrl(), exp));
    }

    @PostMapping(path = "/auth/refresh", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Refresh JWT token",
            description = "Issues a new JWT token for an authenticated user",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Token refreshed", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            }
    )
    public ResponseEntity<TokenResponse> refreshToken(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Extract user info from current JWT
        String userId = authentication.getName(); // subject from JWT
        String username = SecurityUtils.getCurrentUsername().orElse("unknown");

        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth.startsWith("ROLE_"))
                .map(role -> role.substring(5)) // Remove ROLE_ prefix
                .toList();

        int refreshCount = 0;
        Instant absoluteExp = null;

        String displayName = "Unknown User";

        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            Long count = jwtAuth.getToken().getClaim("refreshCount");
            if (count != null) {
                refreshCount = count.intValue();
            }

            Object absExpClaim = jwtAuth.getToken().getClaim("absoluteExp");
            if (absExpClaim instanceof Long absExpSec) {
                absoluteExp = Instant.ofEpochSecond(absExpSec);
            } else if (absExpClaim instanceof Instant absExpInst) {
                absoluteExp = absExpInst;
            }

            displayName = jwtAuth.getToken().getClaimAsString("displayName");
        }

        // Validate refresh limits
        if (refreshCount >= props.getSecurity().getJwt().getMaxRefreshCount()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Instant now = Instant.now();
        if (absoluteExp != null && now.isAfter(absoluteExp)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // If absoluteExp is missing (e.g. from an old token), we could either fail or initialize it.
        // For compatibility during migration, we initialize it if missing.
        if (absoluteExp == null) {
            absoluteExp = now.plusSeconds(props.getSecurity().getJwt().getAbsoluteExpirationSeconds());
        }

        // Generate new token with same TTL and incremented refresh count
        long ttl = props.getSecurity().getJwt().getTtlSeconds();
        Instant exp = now.plusSeconds(ttl);
        
        // Don't let normal expiration exceed absolute expiration
        if (exp.isAfter(absoluteExp)) {
            exp = absoluteExp;
        }

        String newToken = jwtService.generateToken(userId, username, displayName, roles, null, refreshCount + 1, absoluteExp);

        // Record the refresh
        auditService.record(userId, now, exp, "token-refresh", null);

        return ResponseEntity.ok(new TokenResponse(newToken, userId, username, null, exp));
    }

    @PostMapping(path = "/auth/token", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Issue API token",
            description = "Creates a short-lived API token (JWT). Requires authentication.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Token issued", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            tags = {"Auth"}
    )
    public ResponseEntity<TokenResponse> issueApiToken() {
        // Requires the caller to be authenticated (configured in SecurityConfig)
        String username = "apitoken-" + shortUuid();
        String rawPassword = secureRandomString(24);
        List<String> roles = List.of("API_TOKEN");
        String hash = PasswordUtils.hash(rawPassword);
        UserAccount saved = userRepo.save(new UserAccount().setPasswordHash(hash).setUsername(username).setRoles(roles));
        long ttl = props.getSecurity().getJwt().getApiTokenTtlSeconds();
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(ttl);
        String jti = UUID.randomUUID().toString();
        String token = jwtService.generateTokenWithTtl(saved.getId(), saved.getUsername(), saved.getDisplayName(), roles, jti, ttl);
        auditService.record(saved.getId(), now, exp, "api-token-issue", jti);
        return ResponseEntity.status(HttpStatus.CREATED).body(new TokenResponse(token, saved.getId(), saved.getUsername(), saved.getImageUrl(), exp));
    }

    @GetMapping(path = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Get JWKS",
            description = "Returns the JSON Web Key Set (JWKS) for verifying issued JWTs.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "JWKS returned",
                            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(type = "object")))
            },
            tags = {"Auth"}
    )
    public ResponseEntity<Map<String, Object>> jwks() {
        return ResponseEntity.ok(jwtService.jwks());
    }

    private static String shortUuid() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

}
