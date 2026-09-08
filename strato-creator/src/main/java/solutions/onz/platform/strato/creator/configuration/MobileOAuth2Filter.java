package solutions.onz.platform.strato.creator.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Captures the "mobile=true" query parameter on OAuth2 authorization requests
 * and stores it in the session so that {@link OAuth2AuthenticationSuccessHandler}
 * can redirect to the mobile app's deep link instead of the api frontend.
 */
@Component
public class MobileOAuth2Filter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (request.getRequestURI().contains("/oauth2/authorization/")) {
            String mobile = request.getParameter("mobile");
            if ("true".equalsIgnoreCase(mobile)) {
                request.getSession().setAttribute("mobile", Boolean.TRUE);
            }
        }
        filterChain.doFilter(request, response);
    }
}
