package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import solutions.onz.platform.strato.creator.domain.enums.UserSource;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.repositories.UserConfigurationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class AzureOidcUserService extends OidcUserService {

    private final UserAccountRepository userRepo;
    private final AuthorityRepository authorityRepository;
    private final UserConfigurationRepository userConfigurationRepo;

    public AzureOidcUserService(UserAccountRepository userRepo, AuthorityRepository authorityRepository, UserConfigurationRepository userConfigurationRepo) {
        this.userRepo = userRepo;
        this.authorityRepository = authorityRepository;
        this.userConfigurationRepo = userConfigurationRepo;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) {
        log.info("Loading user from OAuth2 request: clientRegistrationId={}",
                userRequest.getClientRegistration().getRegistrationId());
        OidcUser oauthUser = loadFromDelegate(userRequest);
        log.debug("Received OidcUser attributes: {}", oauthUser.getAttributes());
        String username =
                Optional
                        .ofNullable((String) oauthUser.getAttribute("preferred_username"))
                        .orElseGet(() -> Optional.ofNullable((String) oauthUser.getAttribute("unique_name")).orElse("user"));

        // SPN is typically unique_name or upn in Entra ID. preferred_username is also often the UPN.
        String spn = Optional.ofNullable((String) oauthUser.getAttribute("unique_name"))
                .orElseGet(() -> Optional.ofNullable((String) oauthUser.getAttribute("upn"))
                        .orElseGet(() -> Optional.ofNullable((String) oauthUser.getAttribute("preferred_username"))
                                .orElseGet(() -> Optional.ofNullable((String) oauthUser.getAttribute("sub"))
                                        .orElse(username))));

        List<String> roles = new ArrayList<>();
        Object rolesClaim = oauthUser.getAttributes().get("roles");
        if (rolesClaim == null) {
            rolesClaim = oauthUser.getAttributes().get("groups");
        }
        if (rolesClaim instanceof Collection<?>) {
            for (Object r : (Collection<?>) rolesClaim) {
                String roleStr = String.valueOf(r);
                if (roleStr.startsWith("ROLE_")) {
                    roles.add(roleStr.substring(5));
                } else {
                    roles.add(roleStr);
                }
            }
        }
        if (roles.isEmpty())
            roles = List.of("USER");
        List<String> finalRoles = roles;

        String imageUrl = Optional.ofNullable((String) oauthUser.getAttribute("picture")).orElse("");

        String email = Optional.ofNullable((String) oauthUser.getAttribute("email"))
                .orElseGet(() -> Optional.ofNullable((String) oauthUser.getAttribute("upn"))
                        .orElse(null));
        String displayName = (String) oauthUser.getAttribute("name");

        UserAccount existing = userRepo.findByUsername(username).orElse(null);
        UserAccount saved;
        if (existing != null) {
            // If existing user is LOCAL, change to SYNCHRONIZED and merge roles
            if (existing.getSource() == UserSource.LOCAL) {
                existing.setSource(UserSource.SYNCHRONIZED);
                // Merge SSO roles with existing local roles
                Set<String> mergedRoles = new HashSet<>(existing.getRoles());
                mergedRoles.addAll(finalRoles);
                finalRoles = new ArrayList<>(mergedRoles);
                log.info("User {} source changed from LOCAL to SYNCHRONIZED, roles merged", username);
            }
            existing.setRoles(finalRoles);
            existing.setImageUrl(imageUrl);
            if (email != null) existing.setEmail(email);
            if (displayName != null) existing.setDisplayName(displayName);
            saved = userRepo.save(existing);
        } else {
            // Create new OAuth2 user with default configuration
            UserConfiguration defaultConfig = userConfigurationRepo
                    .findByName("_default")
                    .orElse(new UserConfiguration());
            defaultConfig.setId(null); // Ensure a new config is created
            defaultConfig.setName(username);
            UserConfiguration savedConfig = userConfigurationRepo.save(defaultConfig);

            saved = userRepo.save(new UserAccount()
                    .setUsername(username)
                    .setRoles(finalRoles)
                    .setImageUrl(imageUrl)
                    .setDisplayName(displayName)
                    .setEmail(email)
                    .setSource(UserSource.OAUTH2)
                    .setEnabled(true)
                    .setPreferences(savedConfig));
            log.info("Created new OAuth2 user account: {}", username);
        }
        // Deduplicate authorities
        Set<String> authorityNames = new HashSet<>();
        List<GrantedAuthority> authorities = new ArrayList<>();

        for (GrantedAuthority ga : oauthUser.getAuthorities()) {
            if (authorityNames.add(ga.getAuthority())) {
                authorities.add(ga);
            }
        }

        for (String r : finalRoles) {
            String roleWithPrefix = r.startsWith("ROLE_") ? r : "ROLE_" + r;
            if (authorityNames.add(roleWithPrefix)) {
                authorities.add(new SimpleGrantedAuthority(roleWithPrefix));
            }

            // Load permissions for this role
            authorityRepository.findById(r).ifPresent(auth -> {
                if (auth.getPermissions() != null) {
                    for (String perm : auth.getPermissions()) {
                        if (authorityNames.add(perm)) {
                            authorities.add(new SimpleGrantedAuthority(perm));
                        }
                    }
                }
            });
        }

        // Merge our processed values into the userinfo claims so DefaultOidcUser.getAttributes()
        // exposes localUserId / spn / processed roles to the success handler.
        Map<String, Object> mergedUserInfoClaims = new HashMap<>();
        if (oauthUser.getUserInfo() != null) {
            mergedUserInfoClaims.putAll(oauthUser.getUserInfo().getClaims());
        }
        mergedUserInfoClaims.put("localUserId", saved.getId());
        mergedUserInfoClaims.put("spn", spn);
        mergedUserInfoClaims.put("roles", finalRoles);
        OidcUserInfo augmentedUserInfo = new OidcUserInfo(mergedUserInfoClaims);

        String nameAttributeKey = oauthUser.getAttributes().containsKey("preferred_username")
                ? "preferred_username"
                : "sub";
        return new DefaultOidcUser(authorities, oauthUser.getIdToken(), augmentedUserInfo, nameAttributeKey);
    }

    // Seam for tests: lets a subclass stub out the call to Spring's default OidcUserService.
    protected OidcUser loadFromDelegate(OidcUserRequest userRequest) {
        return super.loadUser(userRequest);
    }
}
