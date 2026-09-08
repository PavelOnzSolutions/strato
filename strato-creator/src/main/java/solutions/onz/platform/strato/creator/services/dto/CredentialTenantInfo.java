package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialTenantInfo {
    private String id;
    /** Resolved via Microsoft Graph; null if Graph lookup failed. */
    private String displayName;
}
