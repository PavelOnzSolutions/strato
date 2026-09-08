package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.repositories.UserConfigurationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AzureOidcUserServiceTest {

    @Mock
    private UserAccountRepository userRepo;

    @Mock
    private AuthorityRepository authorityRepository;

    @Mock
    private UserConfigurationRepository userConfigurationRepo;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void populatesEmailAndDisplayNameFromOidcAttributes() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", "alice-sub");
        claims.put("preferred_username", "alice@example.com");
        claims.put("name", "Alice Liddell");
        claims.put("email", "alice@example.com");

        OidcIdToken idToken = new OidcIdToken(
                "token-value", Instant.now(), Instant.now().plusSeconds(300), claims);
        OidcUser stub = new DefaultOidcUser(
                List.of(new SimpleGrantedAuthority("OIDC_USER")),
                idToken,
                "preferred_username");

        AzureOidcUserService userService = new AzureOidcUserService(
                userRepo, authorityRepository, userConfigurationRepo) {
            @Override
            protected OidcUser loadFromDelegate(OidcUserRequest userRequest) {
                return stub;
            }
        };

        when(userRepo.findByUsername("alice@example.com")).thenReturn(Optional.empty());
        when(userConfigurationRepo.findByName("_default")).thenReturn(Optional.empty());
        when(userConfigurationRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepo.save(any(UserAccount.class)))
                .thenAnswer(inv -> inv.getArgument(0, UserAccount.class).setId("u-1"));

        OidcUser result = userService.loadUser(stubUserRequest());

        ArgumentCaptor<UserAccount> captor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepo).save(captor.capture());
        UserAccount saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("alice@example.com");
        assertThat(saved.getDisplayName()).isEqualTo("Alice Liddell");
        assertThat(result.<String>getAttribute("localUserId")).isEqualTo("u-1");
        assertThat(result.<String>getAttribute("spn")).isEqualTo("alice@example.com");
    }

    private OidcUserRequest stubUserRequest() {
        ClientRegistration clientRegistration = ClientRegistration
                .withRegistrationId("azure")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .clientId("client-id")
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize")
                .tokenUri("https://login.microsoftonline.com/tenant/oauth2/v2.0/token")
                .userInfoUri("https://graph.microsoft.com/oidc/userinfo")
                .userNameAttributeName("preferred_username")
                .build();

        OidcUserRequest req = mock(OidcUserRequest.class);
        when(req.getClientRegistration()).thenReturn(clientRegistration);
        return req;
    }
}
