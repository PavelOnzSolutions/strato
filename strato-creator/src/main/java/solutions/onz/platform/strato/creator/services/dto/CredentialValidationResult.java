package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialValidationResult {
    private boolean valid;
    /**
     * Legacy field retained for GitHub/Bitbucket consumers of the shared DTO.
     * For Azure: contains `scp` split for users, `roles` for service principals — exactly today's behavior.
     * For new Azure consumers, prefer {@link CredentialPermissionsInfo#getScopes()} / {@code getAppRoles()}.
     */
    private List<String> scopes;

    /** Azure-only fields below. All may be null for non-Azure callers. */
    private Long durationMs;
    private CredentialIdentityInfo identity;
    private CredentialTenantInfo tenant;
    private CredentialTokenInfo token;
    private CredentialPermissionsInfo permissions;
    private Map<String, Object> rawClaims;
    private CredentialErrorInfo error;
    private List<String> graphWarnings;
}
