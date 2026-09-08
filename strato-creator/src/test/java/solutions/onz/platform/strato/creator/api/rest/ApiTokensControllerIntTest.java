package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.api.ApiTokensController;
import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.repositories.IssuedTokenRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ApiTokensControllerIntTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private AuthorityRepository authorityRepository;

    @Autowired
    private IssuedTokenRepository issuedTokenRepository;

    @Test
    @WithMockUser
    void shouldCreateApiTokenWithCustomPermissions() {
        ApiTokensController.CreateTokenRequest req = new ApiTokensController.CreateTokenRequest(
            "Test Token", 30, List.of("PERM_TEST_1", "PERM_TEST_2")
        );

        ApiTokensController.CreateTokenResponse response = webTestClient.post()
            .uri("/api/tokens")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(req)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(ApiTokensController.CreateTokenResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(response).isNotNull();
        
        // Find the user created for this token (we don't know the exact username but it starts with apitoken-)
        // Actually, we can check the UserAccount collection for the latest created user or search by prefix
        List<UserAccount> users = userAccountRepository.findAll().stream()
            .filter(u -> u.getUsername().startsWith("apitoken-"))
            .toList();
        
        UserAccount user = users.get(users.size() - 1); // Assuming it's the last one
        String username = user.getUsername();

        assertThat(user.getRoles()).containsExactly(username);
        assertThat(user.getRoles()).doesNotContain("API_TOKEN");

        // Verify Authority
        Optional<Authority> authority = authorityRepository.findById(username);
        assertThat(authority).isPresent();
        assertThat(authority.get().getName()).isEqualTo(username);
        assertThat(authority.get().getPermissions()).containsExactlyInAnyOrder("PERM_TEST_1", "PERM_TEST_2");

        // Now test deletion
        String tokenId = response.id();
        webTestClient.delete()
            .uri(uriBuilder -> uriBuilder.path("/api/tokens").queryParam("id", tokenId).build())
            .exchange()
            .expectStatus().isNoContent();

        // Verify everything is deleted
        assertThat(userAccountRepository.findById(user.getId())).isEmpty();
        assertThat(authorityRepository.findById(username)).isEmpty();
        assertThat(issuedTokenRepository.findById(tokenId)).isEmpty();
    }
}
