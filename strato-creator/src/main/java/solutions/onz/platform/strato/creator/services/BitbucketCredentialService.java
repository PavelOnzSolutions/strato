package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class BitbucketCredentialService {

    private final ResourceService resourceService;
    private RestTemplate restTemplate = new RestTemplate();

    void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public CredentialValidationResult testCredential(String id) {
        return resourceService.findResourceById(id)
                .map(this::validateCredential)
                .orElse(CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build());
    }

    private CredentialValidationResult validateCredential(ResourceClass resource) {
        if (resource.getType() != ResourceType.BITBUCKET_CREDENTIAL || resource.getTemplate() == null) {
            return CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build();
        }

        Map<String, Object> template = resource.getTemplate();
        String type = (String) template.getOrDefault("type", "ACCESS_TOKEN");
        String username = (String) template.get("username");
        String token = (String) template.get("token");

        if (token == null) {
            token = (String) template.get("pat");
        }

        if (token == null) {
            log.warn("Missing token for Bitbucket Credential validation: resourceId={}", resource.getId());
            return CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            if ("APP_PASSWORD".equalsIgnoreCase(type)) {
                headers.setBasicAuth(username, token);
            } else {
                headers.setBearerAuth(token);
            }
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://api.bitbucket.org/2.0/repositories",
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Bitbucket Credential validation successful for resource {}", resource.getId());
                
                // Bitbucket doesn't provide scopes in headers like GitHub.
                // We could potentially extract more info from the response if needed.
                return CredentialValidationResult.builder()
                        .valid(true)
                        .scopes(Collections.emptyList())
                        .build();
            }
        } catch (Exception e) {
            log.info("Bitbucket Credential validation failed for resource {}: {}", resource.getId(), e.getMessage());
        }

        return CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build();
    }
}
