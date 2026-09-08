package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialPermissionsInfo {
    /** Delegated scopes (`scp` claim, split on whitespace). Populated for USER credentials. */
    private List<String> scopes;
    /** App roles (`roles` claim). Populated for SERVICE_PRINCIPAL credentials. */
    private List<String> appRoles;
    /** Directory roles from `wids` claim, resolved via Graph where possible. */
    private List<CredentialDirectoryRole> directoryRoles;
}
