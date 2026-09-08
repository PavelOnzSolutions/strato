package solutions.onz.platform.strato.creator.services.identity;

import solutions.onz.platform.strato.creator.services.dto.CredentialDirectoryRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GraphLookupResult {
    private String tenantDisplayName;
    private String identityDisplayName;
    private String userPrincipalName;
    @Builder.Default
    private List<CredentialDirectoryRole> directoryRoles = new ArrayList<>();
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}
