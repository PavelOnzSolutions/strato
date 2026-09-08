package solutions.onz.platform.strato.creator.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Map;
import java.util.Optional;

/**
 * Utility class for Security.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /**
     * Get the login of the current user.
     *
     * @return the login of the current user.
     */
    public static String getCurrentUserLogin() {
        return getCurrentUsername().orElse("system");
    }

    /**
     * Get the login of the current user.
     *
     * @return the login of the current user.
     */
    public static Optional<String> getCurrentUsername() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                try {
                    if (auth instanceof JwtAuthenticationToken jwtAuth) {
                        Map<String, Object> attrs = jwtAuth.getTokenAttributes();
                        String username = firstNonBlank(
                                asString(attrs.get("username")),
                                asString(attrs.get("preferred_username")),
                                asString(attrs.get("upn")),
                                asString(attrs.get("email"))
                        );
                        if (username != null) return Optional.of(username);
                    } else if (auth instanceof OAuth2AuthenticationToken oauth2Auth) {
                        var principal = oauth2Auth.getPrincipal();
                        String username = firstNonBlank(
                                asString(principal.getAttribute("preferred_username")),
                                asString(principal.getAttribute("name")),
                                asString(principal.getAttribute("email"))
                        );
                        if (username != null) return Optional.of(username);
                    }
                } catch (Exception ignoredInner) {
                }
                return Optional.ofNullable(auth.getName());
            }
        } catch (Exception ignored) {
        }
        return Optional.empty();
    }

    private static String asString(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
