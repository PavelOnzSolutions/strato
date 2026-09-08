package solutions.onz.platform.strato.creator.services.identity;

import com.azure.core.credential.TokenCredential;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EntraGraphLookupServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private TokenCredential credential;
    private RecordingGraphClient graph;
    private EntraGraphLookupService service;

    @BeforeEach
    void setUp() {
        credential = Mockito.mock(TokenCredential.class);
        graph = new RecordingGraphClient();
        service = new EntraGraphLookupService(graph);
    }

    @Test
    void resolvesServicePrincipalIdentity() throws Exception {
        graph.responses.put("organization",
                MAPPER.readTree("{\"value\":[{\"displayName\":\"Contoso\"}]}"));
        graph.responses.put("servicePrincipals(appId='client-1')",
                MAPPER.readTree("{\"displayName\":\"my-strato-sp\"}"));

        GraphLookupResult r = service.lookup(credential, CredentialIdentityType.SERVICE_PRINCIPAL, "client-1", List.of());

        assertThat(r.getTenantDisplayName()).isEqualTo("Contoso");
        assertThat(r.getIdentityDisplayName()).isEqualTo("my-strato-sp");
        assertThat(r.getUserPrincipalName()).isNull();
        assertThat(r.getWarnings()).isEmpty();
    }

    @Test
    void resolvesUserIdentity() throws Exception {
        graph.responses.put("organization",
                MAPPER.readTree("{\"value\":[{\"displayName\":\"Contoso\"}]}"));
        graph.responses.put("me",
                MAPPER.readTree("{\"displayName\":\"Alice Liddell\",\"userPrincipalName\":\"alice@example.com\"}"));

        GraphLookupResult r = service.lookup(credential, CredentialIdentityType.USER, null, List.of());

        assertThat(r.getIdentityDisplayName()).isEqualTo("Alice Liddell");
        assertThat(r.getUserPrincipalName()).isEqualTo("alice@example.com");
    }

    @Test
    void resolvesDirectoryRoles() throws Exception {
        graph.responses.put("organization",
                MAPPER.readTree("{\"value\":[{\"displayName\":\"Contoso\"}]}"));
        graph.responses.put("directoryRoleTemplates/wid-1",
                MAPPER.readTree("{\"displayName\":\"Global Reader\"}"));
        graph.responses.put("directoryRoleTemplates/wid-2",
                MAPPER.readTree("{\"displayName\":\"Application Administrator\"}"));

        GraphLookupResult r = service.lookup(credential, CredentialIdentityType.USER, null, List.of("wid-1", "wid-2"));

        assertThat(r.getDirectoryRoles()).hasSize(2);
        assertThat(r.getDirectoryRoles().get(0).getDisplayName()).isEqualTo("Global Reader");
        assertThat(r.getDirectoryRoles().get(1).getDisplayName()).isEqualTo("Application Administrator");
    }

    @Test
    void recordsWarningWhenOrganizationLookupFails() {
        graph.failures.put("organization", new RuntimeException("403 Forbidden"));
        graph.responses.put("servicePrincipals(appId='client-1')",
                tryParse("{\"displayName\":\"my-sp\"}"));

        GraphLookupResult r = service.lookup(credential, CredentialIdentityType.SERVICE_PRINCIPAL, "client-1", List.of());

        assertThat(r.getTenantDisplayName()).isNull();
        assertThat(r.getIdentityDisplayName()).isEqualTo("my-sp");
        assertThat(r.getWarnings()).anyMatch(w -> w.contains("organization") && w.contains("403"));
    }

    @Test
    void recordsWarningPerFailedDirectoryRoleButKeepsOthers() {
        graph.responses.put("organization", tryParse("{\"value\":[{\"displayName\":\"Contoso\"}]}"));
        graph.responses.put("directoryRoleTemplates/wid-1", tryParse("{\"displayName\":\"Global Reader\"}"));
        graph.failures.put("directoryRoleTemplates/wid-2", new RuntimeException("404 Not Found"));

        GraphLookupResult r = service.lookup(credential, CredentialIdentityType.USER, null, List.of("wid-1", "wid-2"));

        assertThat(r.getDirectoryRoles()).hasSize(2);
        assertThat(r.getDirectoryRoles())
                .anySatisfy(role -> {
                    assertThat(role.getId()).isEqualTo("wid-1");
                    assertThat(role.getDisplayName()).isEqualTo("Global Reader");
                })
                .anySatisfy(role -> {
                    assertThat(role.getId()).isEqualTo("wid-2");
                    assertThat(role.getDisplayName()).isNull();
                });
        assertThat(r.getWarnings()).anyMatch(w -> w.contains("wid-2"));
    }

    /** Deterministic stand-in for the HTTP-backed Graph client. */
    static class RecordingGraphClient implements GraphApiClient {
        final Map<String, JsonNode> responses = new HashMap<>();
        final Map<String, RuntimeException> failures = new HashMap<>();

        @Override
        public JsonNode get(TokenCredential credential, String path) {
            if (failures.containsKey(path)) {
                throw failures.get(path);
            }
            if (!responses.containsKey(path)) {
                throw new IllegalStateException("unexpected Graph path: " + path);
            }
            return responses.get(path);
        }
    }

    private static JsonNode tryParse(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
