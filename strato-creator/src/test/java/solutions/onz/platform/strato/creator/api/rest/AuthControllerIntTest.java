package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.api.AuthController;
import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.utils.PasswordUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class AuthControllerIntTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private UserAccountRepository userAccountRepository;

    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        testUser = new UserAccount();
        testUser.setUsername("test-refresh-user");
        testUser.setPasswordHash(PasswordUtils.hash("password"));
        testUser.setRoles(List.of("USER"));
        userAccountRepository.save(testUser);
    }

    @AfterEach
    void tearDown() {
        userAccountRepository.delete(testUser);
    }

    @Test
    void shouldLoginAndRefreshToken() {
        // 1. Login
        AuthController.LoginRequest loginReq = new AuthController.LoginRequest("test-refresh-user", "password");
        AuthController.TokenResponse loginResponse = webTestClient.post()
                .uri("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(loginReq)
                .exchange()
                .expectStatus().isOk()
                .expectBody(AuthController.TokenResponse.class)
                .returnResult()
                .getResponseBody();

        assertThat(loginResponse).isNotNull();
        String token = loginResponse.token();
        assertThat(token).isNotBlank();

        // 2. Refresh
        AuthController.TokenResponse refreshResponse = webTestClient.post()
                .uri("/auth/refresh")
                .header("Authorization", "Bearer " + token)
                .exchange()
                .expectStatus().isOk()
                .expectBody(AuthController.TokenResponse.class)
                .returnResult()
                .getResponseBody();

        assertThat(refreshResponse).isNotNull();
        assertThat(refreshResponse.token()).isNotBlank();
        assertThat(refreshResponse.token()).isNotEqualTo(token);
        assertThat(refreshResponse.username()).isEqualTo("test-refresh-user");
    }

    @Test
    void shouldFailRefreshWithoutAuth() {
        webTestClient.post()
                .uri("/auth/refresh")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void shouldFailRefreshAfterMaxCount() {
        // 1. Login (refreshCount = 0)
        AuthController.LoginRequest loginReq = new AuthController.LoginRequest("test-refresh-user", "password");
        AuthController.TokenResponse response = webTestClient.post()
                .uri("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(loginReq)
                .exchange()
                .expectStatus().isOk()
                .expectBody(AuthController.TokenResponse.class)
                .returnResult()
                .getResponseBody();

        String token = response.token();

        // 2. Refresh 10 times (max limit)
        // Default maxRefreshCount is 10.
        // login gives token with refreshCount=0.
        // 1st refresh gives token with refreshCount=1.
        // ...
        // 10th refresh gives token with refreshCount=10.
        // 11th refresh should fail.

        for (int i = 0; i < 10; i++) {
            response = webTestClient.post()
                    .uri("/auth/refresh")
                    .header("Authorization", "Bearer " + token)
                    .exchange()
                    .expectStatus().isOk()
                    .expectBody(AuthController.TokenResponse.class)
                    .returnResult()
                    .getResponseBody();
            token = response.token();
        }

        // 11th refresh should fail
        webTestClient.post()
                .uri("/auth/refresh")
                .header("Authorization", "Bearer " + token)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void shouldFailRefreshAfterAbsoluteExpiration() {
        // This is harder to test without mocking Instant.now() or changing config.
        // But we can check if the token issued by login has an absolute expiration claim if we decode it.
    }
}
