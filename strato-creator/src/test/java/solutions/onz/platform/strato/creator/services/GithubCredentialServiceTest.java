package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GithubCredentialServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private GithubCredentialService githubCredentialService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        githubCredentialService.setRestTemplate(restTemplate);
    }

    @Test
    void testTestCredential_NotFound() {
        when(resourceRepository.findById("nonexistent")).thenReturn(Optional.empty());

        CredentialValidationResult result = githubCredentialService.testCredential("nonexistent");

        assertFalse(result.isValid());
        assertTrue(result.getScopes().isEmpty());
    }

    @Test
    void testTestCredential_Success() {
        String resourceId = "github-cred";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.GITHUB_CREDENTIAL);
        resource.setTemplate(Map.of(
                "username", "testuser",
                "pat", "test-pat"
        ));

        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-OAuth-Scopes", "repo, user");
        ResponseEntity<Map> responseEntity = ResponseEntity.ok().headers(headers).body(Map.of("login", "testuser"));

        when(restTemplate.exchange(
                eq("https://api.github.com/user"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(responseEntity);

        CredentialValidationResult result = githubCredentialService.testCredential(resourceId);

        assertTrue(result.isValid());
        assertEquals(List.of("repo", "user"), result.getScopes());
    }

    @Test
    void testTestCredential_Failure() {
        String resourceId = "github-cred";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.GITHUB_CREDENTIAL);
        resource.setTemplate(Map.of(
                "username", "testuser",
                "pat", "invalid-pat"
        ));

        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));

        when(restTemplate.exchange(
                eq("https://api.github.com/user"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenThrow(new RuntimeException("Unauthorized"));

        CredentialValidationResult result = githubCredentialService.testCredential(resourceId);

        assertFalse(result.isValid());
        assertTrue(result.getScopes().isEmpty());
    }
}
