package solutions.onz.platform.strato.creator.services;

import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenCredential;
import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.azure.identity.UsernamePasswordCredentialBuilder;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.services.dto.CredentialErrorInfo;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityInfo;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityType;
import solutions.onz.platform.strato.creator.services.dto.CredentialPermissionsInfo;
import solutions.onz.platform.strato.creator.services.dto.CredentialTenantInfo;
import solutions.onz.platform.strato.creator.services.dto.CredentialTokenInfo;
import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import solutions.onz.platform.strato.creator.services.identity.EntraGraphLookupService;
import solutions.onz.platform.strato.creator.services.identity.GraphLookupResult;
import solutions.onz.platform.strato.creator.services.identity.JwtClaims;
import com.microsoft.aad.msal4j.MsalServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Service for managing Azure identity credentials and validating them.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AzureIdentityService {

    private final ResourceService resourceService;
    private final EntraGraphLookupService graphLookup;

    /**
     * Validates Azure identity credential by checking its scopes and validity.
     * Returns a CredentialValidationResult indicating the validation status.
     */
    @PreAuthorize("hasAuthority(@permissions.RESOURCE_WRITE)")
    public CredentialValidationResult testCredential(String id) {
        return resourceService.findResourceById(id)
                .map(this::validateCredential)
                .orElse(CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build());
    }

    /**
     * Creates a TokenCredential for the given Azure identity credential resource.
     */
    @PreAuthorize("hasAuthority(@permissions.RESOURCE_WRITE)")
    public TokenCredential getTokenCredential(String resourceId) {
        return resourceService.findResourceById(resourceId)
                .map(this::createCredential)
                .orElseThrow(() -> new IllegalArgumentException("Azure Credential resource not found: " + resourceId));
    }

    private TokenCredential createCredential(ResourceClass resource) {
        if (resource.getType() != ResourceType.AZURE_CREDENTIAL || resource.getTemplate() == null) {
            throw new IllegalArgumentException("Resource is not an Azure Credential: " + resource.getId());
        }

        Map<String, Object> template = resource.getTemplate();
        String type = (String) template.get("type");
        String tenantId = (String) template.get("tenantId");
        String identifier = (String) template.get("identifier");
        String secret = (String) template.get("secret");

        if (tenantId == null || identifier == null || secret == null) {
            throw new IllegalArgumentException("Missing required fields for Azure Credential: " + resource.getId());
        }

        if ("SERVICE_PRINCIPAL".equals(type)) {
            return new ClientSecretCredentialBuilder()
                    .clientId(identifier)
                    .clientSecret(secret)
                    .tenantId(tenantId)
                    .build();
        } else if ("USER".equals(type)) {
            return new UsernamePasswordCredentialBuilder()
                    .username(identifier)
                    .password(secret)
                    .tenantId(tenantId)
                    .clientId("1950a258-227b-4e31-a9cf-717495945fc2") // Well-known Azure PowerShell client ID
                    .build();
        }
        throw new IllegalArgumentException("Unsupported Azure Credential type: " + type);
    }

    public CredentialValidationResult validateCredential(ResourceClass resourceClass) {
        long startNanos = System.nanoTime();
        TokenCredential credential;
        try {
            credential = createCredential(resourceClass);
        } catch (Exception e) {
            return CredentialValidationResult.builder()
                    .valid(false)
                    .scopes(List.of())
                    .durationMs(Duration.ofNanos(System.nanoTime() - startNanos).toMillis())
                    .error(toErrorInfo(e))
                    .graphWarnings(List.of())
                    .build();
        }

        AccessToken token;
        try {
            token = credential.getTokenSync(
                    new TokenRequestContext().addScopes("https://management.azure.com/.default"));
        } catch (Exception e) {
            return CredentialValidationResult.builder()
                    .valid(false)
                    .scopes(List.of())
                    .durationMs(Duration.ofNanos(System.nanoTime() - startNanos).toMillis())
                    .error(toErrorInfo(e))
                    .graphWarnings(List.of())
                    .build();
        }

        // Captures token-acquisition time only; subsequent best-effort Graph lookups are excluded by design.
        long durationMs = Duration.ofNanos(System.nanoTime() - startNanos).toMillis();
        JwtClaims claims = JwtClaims.parse(token.getToken());

        GraphLookupResult graph = graphLookup.lookup(
                credential, claims.identityType(), claims.appId(), claims.wids());

        CredentialIdentityInfo identity = CredentialIdentityInfo.builder()
                .type(claims.identityType())
                .objectId(claims.objectId())
                .appId(claims.appId())
                .userPrincipalName(
                        claims.userPrincipalName() != null ? claims.userPrincipalName() : graph.getUserPrincipalName())
                .displayName(graph.getIdentityDisplayName())
                .build();

        CredentialTenantInfo tenant = CredentialTenantInfo.builder()
                .id(claims.tenantId())
                .displayName(graph.getTenantDisplayName())
                .build();

        CredentialTokenInfo tokenInfo = CredentialTokenInfo.builder()
                .audience(claims.audience())
                .issuer(claims.issuer())
                .issuedAt(claims.issuedAt())
                .notBefore(claims.notBefore())
                .expiresAt(claims.expiresAt())
                .authenticationMethods(claims.authenticationMethods())
                .build();

        CredentialPermissionsInfo permissions = CredentialPermissionsInfo.builder()
                .scopes(claims.scopes())
                .appRoles(claims.appRoles())
                .directoryRoles(graph.getDirectoryRoles())
                .build();

        // Legacy `scopes` field — preserve today's behavior for non-Azure consumers of the shared DTO.
        List<String> legacyScopes = claims.identityType() == CredentialIdentityType.USER
                ? claims.scopes()
                : claims.appRoles();

        return CredentialValidationResult.builder()
                .valid(true)
                .scopes(legacyScopes)
                .durationMs(durationMs)
                .identity(identity)
                .tenant(tenant)
                .token(tokenInfo)
                .permissions(permissions)
                .rawClaims(claims.body())
                .graphWarnings(graph.getWarnings())
                .build();
    }

    private static CredentialErrorInfo toErrorInfo(Throwable t) {
        CredentialErrorInfo.CredentialErrorInfoBuilder b = CredentialErrorInfo.builder()
                .message(t.getMessage())
                .exceptionClass(t.getClass().getName());

        Throwable cur = t;
        while (cur != null) {
            if (cur instanceof MsalServiceException msal) {
                b.code(msal.errorCode());
                b.correlationId(msal.correlationId());
                // Prefer the MSAL message when we have it — it carries the AADSTS detail
                // that the outer wrapping exception ("Authentication failed", etc.) hides.
                if (msal.getMessage() != null && !msal.getMessage().isBlank()) {
                    b.message(msal.getMessage());
                }
                return b.build();
            }
            cur = cur.getCause();
        }
        return b.build();
    }
}
