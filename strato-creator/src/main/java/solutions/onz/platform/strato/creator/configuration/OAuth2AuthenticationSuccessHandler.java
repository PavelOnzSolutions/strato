package solutions.onz.platform.strato.creator.configuration;

import solutions.onz.platform.strato.creator.services.JwtService;
import solutions.onz.platform.strato.creator.services.TokenAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Custom success handler for OAuth2 login that generates a JWT token
 * and redirects to the frontend with the token and user info as URL parameters.
 */
@Slf4j
@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final TokenAuditService auditService;
    private final ApplicationProperties props;

    public OAuth2AuthenticationSuccessHandler(JwtService jwtService,
            TokenAuditService auditService,
            ApplicationProperties props) {
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.props = props;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        log.debug("SuccessHandler principal attributes: {}", oauth2User.getAttributes());
        log.debug("SuccessHandler principal authorities: {}", oauth2User.getAuthorities());

        // Extract user info from OAuth2User attributes
        String localUserId = Optional.ofNullable((String) oauth2User.getAttribute("localUserId"))
                .orElse("unknown");
        String spn = Optional.ofNullable((String) oauth2User.getAttribute("spn"))
                .filter(s -> !s.equals("unknown"))
                .orElseGet(() -> Optional.ofNullable((String) oauth2User.getAttribute("preferred_username"))
                        .orElseGet(() -> Optional.ofNullable((String) oauth2User.getAttribute("unique_name"))
                                .orElse("unknown")));
        String username = Optional.ofNullable((String) oauth2User.getAttribute("preferred_username"))
                .orElseGet(() -> Optional.ofNullable((String) oauth2User.getAttribute("unique_name"))
                        .orElse("user"));
        String displayName = Optional.ofNullable((String) oauth2User.getAttribute("name"))
                .orElseGet(() -> Optional.ofNullable((String) oauth2User.getAttribute("display_name"))
                        .orElseGet(() -> Optional.ofNullable((String) oauth2User.getAttribute("full_name"))
                                .orElseGet(() -> Optional.of(oauth2User.getAttribute("first_name") + " " + oauth2User.getAttribute("last_name"))
                                        .orElse("Unknown User"))));

        String imageUrl = Optional.ofNullable((String) oauth2User.getAttribute("picture"))
                .orElse("");

        // Extract roles from OAuth2User attributes and strip ROLE_ prefix if present
        @SuppressWarnings("unchecked")
        List<String> roles = Optional.ofNullable((List<String>) oauth2User.getAttribute("roles"))
                .orElse(List.of())
                .stream()
                .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                .toList();
        log.debug("Extracted roles from attributes for JWT (stripped): {}", roles);

        // Generate JWT token
        long ttl = props.getSecurity().getJwt().getTtlSeconds();
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(ttl);
        String token = jwtService.generateToken(spn, username, displayName, roles, null);

        // Record the token issuance
        auditService.record(localUserId, now, exp, "oauth2-login", null);

        // Check if this is a mobile app login (stored in session by MobileOAuth2Filter)
        Boolean isMobile = request.getSession(false) != null
                ? (Boolean) request.getSession().getAttribute("mobile")
                : null;

        String redirectUrl;
        if (Boolean.TRUE.equals(isMobile)) {
            // Mobile app: redirect to deep link
            log.debug("Mobile OAuth2 login detected, redirecting to deep link");
            redirectUrl = UriComponentsBuilder.fromUriString("strato://auth/callback")
                    .queryParam("token", token)
                    .queryParam("userId", encode(localUserId))
                    .queryParam("username", encode(username))
                    .queryParam("imageUrl", encode(imageUrl))
                    .build()
                    .toUriString();
            // Clean up session attribute
            request.getSession().removeAttribute("mobile");
        } else {
            // Web frontend: redirect to frontend URL
            String frontendBaseUrl = props.getFrontend().getBaseUrl();
            redirectUrl = UriComponentsBuilder.fromUriString(frontendBaseUrl)
                    .queryParam("token", token)
                    .queryParam("userId", encode(localUserId))
                    .queryParam("username", encode(username))
                    .queryParam("imageUrl", encode(imageUrl))
                    .build()
                    .toUriString();
        }

        response.sendRedirect(redirectUrl);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
