package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BitbucketCredentialServiceTest {

    @Mock
    private ResourceService resourceService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private BitbucketCredentialService bitbucketCredentialService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        bitbucketCredentialService.setRestTemplate(restTemplate);
    }

    @Test
    void testTestCredential_NotFound() {
        when(resourceService.findResourceById("nonexistent")).thenReturn(Optional.empty());

        CredentialValidationResult result = bitbucketCredentialService.testCredential("nonexistent");

        assertFalse(result.isValid());
        assertTrue(result.getScopes().isEmpty());
    }

    @Test
    void testTestCredential_Success() {
        String resourceId = "bitbucket-cred";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.BITBUCKET_CREDENTIAL);
        resource.setTemplate(Map.of(
                "username", "testuser",
                "pat", "test-pat"
        ));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        ResponseEntity<Map> responseEntity = ResponseEntity.ok().body(Map.of("display_name", "Test User"));

        when(restTemplate.exchange(
                eq("https://api.bitbucket.org/2.0/repositories"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(responseEntity);

        CredentialValidationResult result = bitbucketCredentialService.testCredential(resourceId);

        assertTrue(result.isValid());
        assertTrue(result.getScopes().isEmpty());
    }

    @Test
    void testTestCredential_Failure() {
        String resourceId = "bitbucket-cred";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.BITBUCKET_CREDENTIAL);
        resource.setTemplate(Map.of(
                "username", "testuser",
                "pat", "invalid-pat"
        ));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        when(restTemplate.exchange(
                eq("https://api.bitbucket.org/2.0/repositories"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenThrow(new RuntimeException("Unauthorized"));

        CredentialValidationResult result = bitbucketCredentialService.testCredential(resourceId);

        assertFalse(result.isValid());
        assertTrue(result.getScopes().isEmpty());
    }
    @Test
    void testTestCredential_AppPassword_Success() {
        String resourceId = "bitbucket-app-password";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.BITBUCKET_CREDENTIAL);
        resource.setTemplate(Map.of(
                "type", "APP_PASSWORD",
                "username", "testuser",
                "token", "test-password"
        ));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        ResponseEntity<Map> responseEntity = ResponseEntity.ok().body(Map.of("display_name", "Test User"));

        when(restTemplate.exchange(
                eq("https://api.bitbucket.org/2.0/repositories"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(responseEntity);

        CredentialValidationResult result = bitbucketCredentialService.testCredential(resourceId);

        assertTrue(result.isValid());
    }

    @Test
    void testTestCredential_AccessToken_Success() {
        String resourceId = "bitbucket-access-token";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.BITBUCKET_CREDENTIAL);
        resource.setTemplate(Map.of(
                "type", "ACCESS_TOKEN",
                "token", "test-token"
        ));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        ResponseEntity<Map> responseEntity = ResponseEntity.ok().body(Map.of("display_name", "Test User"));

        when(restTemplate.exchange(
                eq("https://api.bitbucket.org/2.0/repositories"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(responseEntity);

        CredentialValidationResult result = bitbucketCredentialService.testCredential(resourceId);

        assertTrue(result.isValid());
    }
}
