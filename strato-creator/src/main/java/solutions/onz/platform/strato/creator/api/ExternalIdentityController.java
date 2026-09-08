package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.services.AzureIdentityService;
import solutions.onz.platform.strato.creator.services.GithubCredentialService;
import solutions.onz.platform.strato.creator.services.BitbucketCredentialService;

import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/external-identity")
@RequiredArgsConstructor
@Tag(name = "External Identity", description = "External Tokens and Credentials API")
public class ExternalIdentityController {

    private final AzureIdentityService azureIdentityService;
    private final GithubCredentialService githubCredentialService;
    private final BitbucketCredentialService bitbucketCredentialService;

    @PostMapping("/test-credential/azure/{id}")
    public ResponseEntity<CredentialValidationResult> testAzureCredential(@PathVariable String id) {
        CredentialValidationResult result = azureIdentityService.testCredential(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/test-credential/github/{id}")
    public ResponseEntity<CredentialValidationResult> testGithubCredential(@PathVariable String id) {
        CredentialValidationResult result = githubCredentialService.testCredential(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/test-credential/bitbucket/{id}")
    public ResponseEntity<CredentialValidationResult> testBitbucketCredential(@PathVariable String id) {
        CredentialValidationResult result = bitbucketCredentialService.testCredential(id);
        return ResponseEntity.ok(result);
    }
}
