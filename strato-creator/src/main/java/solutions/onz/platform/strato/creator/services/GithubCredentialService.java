package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
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
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class GithubCredentialService {

    private final ResourceRepository resourceRepository;
    private RestTemplate restTemplate = new RestTemplate();

    void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public CredentialValidationResult testCredential(String id) {
        return resourceRepository.findById(id)
                .map(this::validateCredential)
                .orElse(CredentialValidationResult
                        .builder()
                        .valid(false)
                        .scopes(Collections.emptyList())
                        .build()
                );
    }

    private CredentialValidationResult validateCredential(ResourceClass resource) {
        if (resource.getType() != ResourceType.GITHUB_CREDENTIAL || resource.getTemplate() == null) {
            return CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build();
        }

        Map<String, Object> template = resource.getTemplate();
        String username = (String) template.get("username");
        String pat = (String) template.getOrDefault("token", template.get("pat"));

        if (pat == null) {
            log.warn("Missing PAT for GitHub Credential validation: resourceId={}", resource.getId());
            return CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(pat);
            headers.set("Accept", "application/vnd.github+json");
            headers.set("X-GitHub-Api-Version", "2022-11-28");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://api.github.com/user",
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("GitHub Credential validation successful for resource {}", resource.getId());
                
                // Extract scopes from X-OAuth-Scopes header if present
                List<String> scopes = Collections.emptyList();
                String scopesHeader = response.getHeaders().getFirst("X-OAuth-Scopes");
                if (scopesHeader != null && !scopesHeader.isBlank()) {
                    scopes = List.of(scopesHeader.split(",\\s*"));
                }

                return CredentialValidationResult.builder()
                        .valid(true)
                        .scopes(scopes)
                        .build();
            }
        } catch (Exception e) {
            log.info("GitHub Credential validation failed for resource {}: {}", resource.getId(), e.getMessage());
        }

        return CredentialValidationResult.builder().valid(false).scopes(Collections.emptyList()).build();
    }
}
