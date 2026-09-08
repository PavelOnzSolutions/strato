package solutions.onz.platform.strato.creator.services;

import com.azure.core.credential.TokenCredential;
import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springaicommunity.mcp.annotation.McpTool;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MsGraphService {

    private static final String GRAPH_SCOPE = "https://graph.microsoft.com/.default";
    private static final String GRAPH_BASE = "https://graph.microsoft.com/v1.0";

    private final ApplicationProperties applicationProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate;

    private volatile ClientSecretCredential credential;
    private volatile AccessToken cachedToken;

    /**
     * Creates an application registration in Microsoft Entra ID using MS Graph API with the specified
     * display name
     * and optional api redirect URIs.
     *
     * @param displayName     the name of the application to be created. This must
     *                        not be null or blank.
     * @param webRedirectUris a list of api redirect URIs to be associated with the
     *                        application.
     *                        This can be null or empty if no URIs are provided.
     * @return a {@code JsonNode} containing the response from Microsoft Graph after
     *         the application
     *         registration is successfully created.
     * @throws IllegalArgumentException if the {@code displayName} is null or blank.
     * @throws IllegalStateException    if the application registration request
     *                                  fails or Microsoft Graph
     *                                  responds with a non-2xx status code.
     */
    @PreAuthorize("hasAuthority(@permissions.RESOURCE_WRITE)")
    @DefineKernelFunction(name = "create_ad_app_registration", description = "Create Azure AD app registration")
    @McpTool(name = "create_app_registration", description = "Create Azure AD app registration", title = "Azure AD")
    public JsonNode createAppRegistration(String displayName, List<String> webRedirectUris) {
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("displayName is required");
        }
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("displayName", displayName);
            if (webRedirectUris != null && !webRedirectUris.isEmpty()) {
                Map<String, Object> web = new LinkedHashMap<>();
                web.put("redirectUris", webRedirectUris);
                payload.put("web", web);
            }
            HttpEntity<Map<String, Object>> req = new HttpEntity<>(payload, authHeaders());
            ResponseEntity<String> resp = restTemplate.exchange(
                    GRAPH_BASE + "/applications",
                    HttpMethod.POST,
                    req,
                    String.class);
            if (!resp.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("Graph create application failed: " + resp.getStatusCode());
            }
            return objectMapper.readTree(resp.getBody());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to create app registration: " + ex.getMessage(), ex);
        }
    }

    /**
     * Retrieves the Azure application registration information based on the
     * provided ID or App ID.
     * Attempts to fetch application details directly using the given ID. If the
     * input is not
     * found as an application ID, it will be treated as an App ID, and a secondary
     * lookup will
     * be performed. The result, if found, is returned as an
     * {@code Optional<JsonNode>}.
     *
     * @param idOrAppId the ID or App ID of the application to retrieve. Must not be
     *                  null or blank.
     * @return an {@code Optional<JsonNode>} containing the application registration
     *         details if found,
     *         or {@code Optional.empty()} if the application is not found or the
     *         input is invalid.
     * @throws IllegalStateException if an unexpected error occurs during the
     *                               retrieval process.
     */
    @PreAuthorize("hasAnyAuthority(@permissions.RESOURCE_READ, @permissions.RESOURCE_WRITE)")
    @DefineKernelFunction(name = "get_ad_app_registration", description = "Get Azure AD app registration")
    public Optional<JsonNode> getAppRegistration(String idOrAppId) {
        if (idOrAppId == null || idOrAppId.isBlank())
            return Optional.empty();
        try {
            HttpEntity<Void> req = new HttpEntity<>(authHeaders());
            try {
                ResponseEntity<String> byId = restTemplate.exchange(
                        GRAPH_BASE + "/applications/" + idOrAppId,
                        HttpMethod.GET,
                        req,
                        String.class);
                if (byId.getStatusCode().is2xxSuccessful()) {
                    return Optional.of(objectMapper.readTree(byId.getBody()));
                }
            } catch (HttpClientErrorException.NotFound nf) {
                // ignore, we'll try by appId
            }
            String filter = "?$filter=" + urlEncode("appId eq '" + idOrAppId + "'");
            ResponseEntity<String> byAppId = restTemplate.exchange(
                    GRAPH_BASE + "/applications" + filter,
                    HttpMethod.GET,
                    req,
                    String.class);
            if (byAppId.getStatusCode().is2xxSuccessful()) {
                JsonNode node = objectMapper.readTree(byAppId.getBody());
                JsonNode arr = node.path("value");
                if (arr.isArray() && !arr.isEmpty()) {
                    return Optional.of(arr.get(0));
                }
            }
            return Optional.empty();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to get app registration: " + ex.getMessage(), ex);
        }
    }

    /**
     * Retrieves a list of users from the connected directory.
     * The response contains user details such as id, displayName, mail, and
     * userPrincipalName.
     * The method fetches up to 50 users per request.
     *
     * @return a JsonNode representing the list of users and their details
     * @throws IllegalStateException if the operation fails due to any exception
     */
    @PreAuthorize("hasAnyAuthority(@permissions.USER_READ, @permissions.USER_WRITE)")
    @DefineKernelFunction(name = "list_ad_users", description = "List Azure AD users")
    public JsonNode listUsers() {
        try {
            HttpEntity<Void> req = new HttpEntity<>(authHeaders());
            String q = "?$select=id,displayName,mail,userPrincipalName&$top=50";
            ResponseEntity<String> resp = restTemplate.exchange(
                    GRAPH_BASE + "/users" + q,
                    HttpMethod.GET,
                    req,
                    String.class);
            return objectMapper.readTree(resp.getBody());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to list users: " + ex.getMessage(), ex);
        }
    }

    /**
     * Retrieves a list of groups from the Microsoft Graph API.
     * Groups will include properties such as id, displayName, mail, mailEnabled,
     * and securityEnabled,
     * and return up to 50 groups per request.
     *
     * @return A JsonNode representing the list of groups retrieved from the API.
     * @throws IllegalStateException if there is an error while attempting to fetch
     *                               the groups.
     */
    @PreAuthorize("hasAnyAuthority(@permissions.USER_READ, @permissions.USER_WRITE)")
    @DefineKernelFunction(name = "list_ad_groups", description = "List Azure AD groups")
    public JsonNode listGroups() {
        try {
            HttpEntity<Void> req = new HttpEntity<>(authHeaders());
            String q = "?$select=id,displayName,mail,mailEnabled,securityEnabled&$top=50";
            ResponseEntity<String> resp = restTemplate.exchange(
                    GRAPH_BASE + "/groups" + q,
                    HttpMethod.GET,
                    req,
                    String.class);
            return objectMapper.readTree(resp.getBody());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to list groups: " + ex.getMessage(), ex);
        }
    }

    /**
     * Lists application registrations (service principals for apps) in the current
     * Azure AD tenant.
     * Returns basic fields and up to 50 items per request.
     */
    @PreAuthorize("hasAnyAuthority(@permissions.RESOURCE_READ, @permissions.RESOURCE_WRITE)")
    @DefineKernelFunction(name = "list_ad_app_registrations", description = "List Azure AD app registrations")
    public JsonNode listAppRegistrations() {
        try {
            HttpEntity<Void> req = new HttpEntity<>(authHeaders());
            String q = "?$select=id,appId,displayName,createdDateTime,signInAudience&$top=50";
            ResponseEntity<String> resp = restTemplate.exchange(
                    GRAPH_BASE + "/applications" + q,
                    HttpMethod.GET,
                    req,
                    String.class);
            return objectMapper.readTree(resp.getBody());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to list app registrations: " + ex.getMessage(), ex);
        }
    }

    /**
     * Executes a generic Microsoft Graph API request.
     *
     * @param url         The full URL
     * @param method      The HTTP method (GET, POST, PUT, PATCH, DELETE).
     * @param payload     The request body payload (can be null).
     * @param contentType The content type header value (e.g., application/json).
     * @return The response body as a JsonNode.
     */
    @PreAuthorize("hasAuthority(@permissions.PLATFORM_READ)")
    @DefineKernelFunction(name = "execute_graph_request", description = "Executes a generic Microsoft Graph API request")
    public JsonNode executeGraphRequest(String url, String method, Object payload, String contentType) {
        return executeGraphRequest(url, method, payload, contentType, null);
    }

    /**
     * Executes a generic Microsoft Graph API request using a specific credential.
     */
    public JsonNode executeGraphRequest(String url, String method, Object payload, String contentType, TokenCredential credential) {
        try {
            HttpHeaders headers = (credential != null) ? authHeaders(credential) : authHeaders();
            if (contentType != null && !contentType.isEmpty()) {
                headers.setContentType(MediaType.valueOf(contentType));
            }

            HttpEntity<Object> req = new HttpEntity<>(payload, headers);
            ResponseEntity<String> resp = restTemplate.exchange(
                    url,
                    HttpMethod.valueOf(method.toUpperCase()),
                    req,
                    String.class);

            if (resp.getBody() == null || resp.getBody().isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(resp.getBody());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to execute Graph request: " + ex.getMessage(), ex);
        }
    }

    private synchronized void ensureInitialized() {
        if (credential != null)
            return;
        ApplicationProperties.Security.Azure az = applicationProperties.getSecurity().getAzure();
        String tenantId = Optional.ofNullable(az.getTenantId()).orElse("").trim();
        String clientId = Optional.ofNullable(az.getClientId()).orElse("").trim();
        String clientSecret = Optional.ofNullable(az.getClientSecret()).orElse("").trim();
        if (tenantId.isEmpty() || clientId.isEmpty() || clientSecret.isEmpty()) {
            throw new IllegalStateException(
                    "Azure AD credentials for Graph are not configured: tenantId/clientId/clientSecret are required under strato.security.azure");
        }
        this.credential = new ClientSecretCredentialBuilder()
                .tenantId(tenantId)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .build();
    }

    private String getAccessToken() {
        ensureInitialized();
        try {
            if (cachedToken != null) {
                if (cachedToken.getExpiresAt().isAfter(OffsetDateTime.now().plusSeconds(60))) {
                    return cachedToken.getToken();
                }
            }
            TokenRequestContext ctx = new TokenRequestContext().addScopes(GRAPH_SCOPE);
            AccessToken token = credential.getToken(ctx).block();
            if (token == null)
                throw new IllegalStateException("Failed to acquire access token for Graph");
            this.cachedToken = token;
            return token.getToken();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to acquire access token for Graph: " + ex.getMessage(), ex);
        }
    }

    private String getAccessToken(TokenCredential cred) {
        try {
            TokenRequestContext ctx = new TokenRequestContext().addScopes(GRAPH_SCOPE);
            AccessToken token = cred.getToken(ctx).block();
            if (token == null)
                throw new IllegalStateException("Failed to acquire access token for Graph");
            return token.getToken();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to acquire access token for Graph: " + ex.getMessage(), ex);
        }
    }

    private HttpHeaders authHeaders() {
        return authHeaders(null);
    }

    private HttpHeaders authHeaders(TokenCredential cred) {
        HttpHeaders headers = new HttpHeaders();
        String token = (cred != null) ? getAccessToken(cred) : getAccessToken();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    private static String urlEncode(String s) {
        try {
            return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }
}
