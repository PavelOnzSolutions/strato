package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.DirectoryConfig;
import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.DirectoryConfigRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import solutions.onz.platform.strato.creator.services.identity.GraphApiClient;
import solutions.onz.platform.strato.creator.api.dto.DirectoryDtos;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DirectoryServiceTest {

    private DirectoryConfigRepository configRepo;
    private UserAccountRepository userRepo;
    private AzureIdentityService identityService;
    private GraphApiClient graphClient;
    private DirectoryService service;

    @BeforeEach
    void setUp() {
        configRepo = mock(DirectoryConfigRepository.class);
        userRepo = mock(UserAccountRepository.class);
        identityService = mock(AzureIdentityService.class);
        graphClient = mock(GraphApiClient.class);
        service = new DirectoryService(configRepo, userRepo, identityService, graphClient);
    }

    @Test
    void getConfigReturnsEmptyWhenSingletonAbsent() {
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.empty());

        assertThat(service.getConfig()).isEmpty();
    }

    @Test
    void getConfigReturnsExistingDoc() {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(true).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));

        assertThat(service.getConfig()).contains(stored);
    }

    @Test
    void saveConfigUpsertsSingletonAndEnablesIt() {
        when(configRepo.save(any(DirectoryConfig.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectoryConfig saved = service.saveConfig("cred-1", "admin");

        ArgumentCaptor<DirectoryConfig> captor = ArgumentCaptor.forClass(DirectoryConfig.class);
        org.mockito.Mockito.verify(configRepo).save(captor.capture());
        DirectoryConfig persisted = captor.getValue();
        assertThat(persisted.getId()).isEqualTo(DirectoryConfig.SINGLETON_ID);
        assertThat(persisted.isEnabled()).isTrue();
        assertThat(persisted.getCredentialResourceId()).isEqualTo("cred-1");
        assertThat(persisted.getUpdatedBy()).isEqualTo("admin");
        assertThat(persisted.getUpdatedAt()).isNotNull();
        assertThat(saved).isSameAs(persisted);
    }

    @Test
    void testConnectionReturnsFailureWhenNotConfigured() {
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.empty());

        DirectoryDtos.EntraIdTestResponse resp = service.testConnection();

        assertThat(resp.success()).isFalse();
        assertThat(resp.message()).contains("not configured");
    }

    @Test
    void testConnectionReturnsFailureWhenDisabled() {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(false).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));

        DirectoryDtos.EntraIdTestResponse resp = service.testConnection();

        assertThat(resp.success()).isFalse();
        assertThat(resp.message()).contains("disabled");
    }

    @Test
    void testConnectionReturnsSuccessWithUserCount() throws Exception {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(true).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));
        when(identityService.testCredential("cred-1"))
                .thenReturn(CredentialValidationResult.builder().valid(true).build());
        com.azure.core.credential.TokenCredential cred = mock(com.azure.core.credential.TokenCredential.class);
        when(identityService.getTokenCredential("cred-1")).thenReturn(cred);
        com.fasterxml.jackson.databind.node.IntNode count = com.fasterxml.jackson.databind.node.IntNode.valueOf(42);
        when(graphClient.get(eq(cred), eq("users/$count"))).thenReturn(count);

        DirectoryDtos.EntraIdTestResponse resp = service.testConnection();

        assertThat(resp.success()).isTrue();
        assertThat(resp.userCount()).isEqualTo(42L);
    }

    @Test
    void testConnectionSwallowsCredentialFailure() {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(true).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));
        when(identityService.testCredential("cred-1"))
                .thenReturn(CredentialValidationResult.builder()
                        .valid(false)
                        .build());

        DirectoryDtos.EntraIdTestResponse resp = service.testConnection();

        assertThat(resp.success()).isFalse();
    }

    @Test
    void listUsersThrows503WhenNotConfigured() {
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listUsers(25))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void listUsersThrows503WhenDisabled() {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(false).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> service.listUsers(25))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void listUsersMapsGraphResponseAndMarksAlreadyExisting() throws Exception {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(true).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));
        com.azure.core.credential.TokenCredential cred = mock(com.azure.core.credential.TokenCredential.class);
        when(identityService.getTokenCredential("cred-1")).thenReturn(cred);

        String body = """
            { "value": [
              { "id": "u1", "displayName": "Alice", "mail": "alice@example.com",
                "userPrincipalName": "alice@example.com", "department": "Eng" },
              { "id": "u2", "displayName": "Bob",   "mail": "bob@example.com",
                "userPrincipalName": "bob@example.com",   "department": null }
            ] }
            """;
        JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body);
        when(graphClient.get(eq(cred), org.mockito.ArgumentMatchers.startsWith("users?")))
                .thenReturn(node);
        when(userRepo.findByUsername("alice@example.com"))
                .thenReturn(Optional.of(new UserAccount().setUsername("alice@example.com")));
        when(userRepo.findByUsername("bob@example.com")).thenReturn(Optional.empty());

        var users = service.listUsers(25);

        assertThat(users).hasSize(2);
        assertThat(users.get(0).upn()).isEqualTo("alice@example.com");
        assertThat(users.get(0).alreadyExists()).isTrue();
        assertThat(users.get(1).upn()).isEqualTo("bob@example.com");
        assertThat(users.get(1).alreadyExists()).isFalse();
        assertThat(users.get(1).department()).isNull();
    }

    @Test
    void searchUsersEncodesQuery() throws Exception {
        DirectoryConfig stored = new DirectoryConfig().setEnabled(true).setCredentialResourceId("cred-1");
        when(configRepo.findById(DirectoryConfig.SINGLETON_ID)).thenReturn(Optional.of(stored));
        com.azure.core.credential.TokenCredential cred = mock(com.azure.core.credential.TokenCredential.class);
        when(identityService.getTokenCredential("cred-1")).thenReturn(cred);
        JsonNode emptyValue = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree("{ \"value\": [] }");

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        when(graphClient.get(eq(cred), pathCaptor.capture())).thenReturn(emptyValue);

        service.searchUsers("smith", 25);

        String path = pathCaptor.getValue();
        assertThat(path).startsWith("users?$search=");
        assertThat(path).contains("$count=true");
        assertThat(path).contains("displayName");
        assertThat(path).contains("smith");
    }
}
