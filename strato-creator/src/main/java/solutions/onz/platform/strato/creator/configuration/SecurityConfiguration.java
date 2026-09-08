package solutions.onz.platform.strato.creator.configuration;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.services.AzureOidcUserService;
import solutions.onz.platform.strato.creator.services.JwtService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.*;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity()
public class SecurityConfiguration {

    private final ApplicationProperties applicationProperties;

    public SecurityConfiguration(ApplicationProperties applicationProperties) {
        this.applicationProperties = applicationProperties;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            ApplicationProperties props,
            JwtService jwtService,
            ObjectProvider<ClientRegistrationRepository> clientRegistrations,
            AzureOidcUserService azureOidcUserService,
            OAuth2AuthenticationSuccessHandler oauth2SuccessHandler,
            MobileOAuth2Filter mobileOAuth2Filter,
            AuthorityRepository authorityRepository) throws Exception {
        http.exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                .accessDeniedHandler(new AccessDeniedHandlerImpl()));

        // http.csrf(csrf ->
        // csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()));
        http.csrf(AbstractHttpConfigurer::disable);
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        http.headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::disable)
                .contentSecurityPolicy(
                        csp -> csp
                                .policyDirectives(props.getSecurity().getCsp().getPolicyDirectives()))
                .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)));

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/.well-known/jwks.json").permitAll()
                .requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/auth/refresh").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/management/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/management/health/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/locales").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/locales/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/auth/token").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/user-accounts/*/configuration").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/user-accounts/*/configuration").authenticated()
                .requestMatchers("/api/user-accounts/**").hasAnyAuthority(Permissions.USER_WRITE, Permissions.USER_READ)
                .requestMatchers("/api/management/logfile").hasAuthority("PERM_PLATFORM_READ")
                .requestMatchers("/api/management/**").authenticated()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll());

        // Register mobile OAuth2 filter to capture ?mobile=true before OAuth2 redirect
        http.addFilterBefore(mobileOAuth2Filter, OAuth2AuthorizationRequestRedirectFilter.class);

        if (clientRegistrations.getIfAvailable() != null) {
            http.oauth2Login(oauth2 -> oauth2
                    .userInfoEndpoint(userInfo -> userInfo.oidcUserService(azureOidcUserService))
                    .successHandler(oauth2SuccessHandler));
        }

        JwtDecoder localDecoder = jwtService.localJwtDecoder();
        String azureIssuer = props.getSecurity().getAzure().getIssuerUri();
        JwtDecoder azureDecoder = null;
        if (azureIssuer != null && !azureIssuer.isBlank()) {
            azureDecoder = JwtDecoders.fromIssuerLocation(azureIssuer);
        }
        JwtAuthenticationConverter converter = jwtAuthenticationConverter(authorityRepository);

        final JwtDecoder azure = azureDecoder;
        JwtDecoder delegating = token -> {
            if (azure != null) {
                try {
                    return azure.decode(token);
                } catch (Exception ignored) {
                }
            }
            return localDecoder.decode(token);
        };

        http.oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                        .decoder(delegating)
                        .jwtAuthenticationConverter(converter)));

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(
                Arrays.asList(applicationProperties.getFrontend().getBaseUrl(), "http://127.0.0.1:5173"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(Collections.singletonList("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter(AuthorityRepository authorityRepository) {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<String> roles = new ArrayList<>();
            Object claim = jwt.getClaim("roles");
            if (claim instanceof Collection<?>) {
                for (Object r : (Collection<?>) claim)
                    roles.add(String.valueOf(r));
            }
            if (roles.isEmpty() && jwt.hasClaim("scp")) {
                roles.add("USER");
            }
            
            Set<GrantedAuthority> authorities = new HashSet<>();
            for (String r : roles) {
                String roleWithPrefix = r.startsWith("ROLE_") ? r : "ROLE_" + r;
                authorities.add(new SimpleGrantedAuthority(roleWithPrefix));

                authorityRepository.findById(r).ifPresent(auth -> {
                    if (auth.getPermissions() != null) {
                        for (String perm : Permissions.expandAll(auth.getPermissions())) {
                            authorities.add(new SimpleGrantedAuthority(perm));
                        }
                    }
                });
            }
            return new ArrayList<>(authorities);
        });
        return converter;
    }
}
