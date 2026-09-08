package solutions.onz.platform.strato.creator.services.identity;

import com.azure.core.credential.TokenCredential;
import com.fasterxml.jackson.databind.JsonNode;
import solutions.onz.platform.strato.creator.services.dto.CredentialDirectoryRole;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class EntraGraphLookupService {

    private final GraphApiClient graph;

    public EntraGraphLookupService(GraphApiClient graph) {
        this.graph = graph;
    }

    public GraphLookupResult lookup(TokenCredential credential,
                                    CredentialIdentityType identityType,
                                    String appId,
                                    List<String> wids) {
        GraphLookupResult.GraphLookupResultBuilder result = GraphLookupResult.builder();
        List<String> warnings = new ArrayList<>();
        List<CredentialDirectoryRole> roles = new ArrayList<>();

        // 1. Tenant display name
        try {
            JsonNode org = graph.get(credential, "organization");
            JsonNode first = org.path("value").path(0);
            String name = first.path("displayName").asText(null);
            result.tenantDisplayName(name);
        } catch (Exception e) {
            warnings.add("organization lookup failed: " + e.getMessage());
        }

        // 2. Identity display name (+ UPN for users)
        if (identityType == CredentialIdentityType.SERVICE_PRINCIPAL && appId != null) {
            String path = "servicePrincipals(appId='" + appId + "')";
            try {
                JsonNode sp = graph.get(credential, path);
                result.identityDisplayName(sp.path("displayName").asText(null));
            } catch (Exception e) {
                warnings.add(path + " lookup failed: " + e.getMessage());
            }
        } else if (identityType == CredentialIdentityType.USER) {
            try {
                JsonNode me = graph.get(credential, "me");
                result.identityDisplayName(me.path("displayName").asText(null));
                result.userPrincipalName(me.path("userPrincipalName").asText(null));
            } catch (Exception e) {
                warnings.add("me lookup failed: " + e.getMessage());
            }
        }

        // 3. Directory roles
        for (String wid : wids) {
            String path = "directoryRoleTemplates/" + wid;
            try {
                JsonNode role = graph.get(credential, path);
                roles.add(CredentialDirectoryRole.builder()
                        .id(wid)
                        .displayName(role.path("displayName").asText(null))
                        .build());
            } catch (Exception e) {
                roles.add(CredentialDirectoryRole.builder().id(wid).build());
                warnings.add(path + " lookup failed: " + e.getMessage());
            }
        }

        return result.directoryRoles(roles).warnings(warnings).build();
    }
}
