package solutions.onz.platform.strato.creator.services;

import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenRequestContext;
import com.azure.core.exception.ClientAuthenticationException;
import com.azure.identity.ClientSecretCredential;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityType;
import solutions.onz.platform.strato.creator.services.dto.CredentialValidationResult;
import solutions.onz.platform.strato.creator.services.identity.EntraGraphLookupService;
import solutions.onz.platform.strato.creator.services.identity.GraphLookupResult;
import com.microsoft.aad.msal4j.MsalServiceException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AzureIdentityServiceTest {

    @Mock
    private ResourceService resourceService;

    @Mock
    private EntraGraphLookupService graphLookup;

    @InjectMocks
    private AzureIdentityService azureIdentityService;

    private String createMockToken(JWTClaimsSet claimsSet) throws Exception {
        JWSSigner signer = new MACSigner("a".repeat(32)); // 256-bit key
        SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claimsSet);
        signedJWT.sign(signer);
        return signedJWT.serialize();
    }

    private static GraphLookupResult emptyGraphLookup() {
        return GraphLookupResult.builder()
                .directoryRoles(List.of())
                .warnings(List.of())
                .build();
    }

    private static ResourceClass sampleServicePrincipal() {
        ResourceClass resource = new ResourceClass();
        resource.setId("azure-sp");
        resource.setType(ResourceType.AZURE_CREDENTIAL);
        resource.setTemplate(Map.of(
                "type", "SERVICE_PRINCIPAL",
                "tenantId", "tenant-1",
                "identifier", "client-1",
                "secret", "secret-1"
        ));
        return resource;
    }

    @Test
    void testTestCredential_NotFound() {
        when(resourceService.findResourceById("nonexistent")).thenReturn(Optional.empty());

        CredentialValidationResult result = azureIdentityService.testCredential("nonexistent");

        assertFalse(result.isValid());
        assertTrue(result.getScopes().isEmpty());
    }

    @Test
    void testTestCredential_ServicePrincipal_WithRoles() throws Exception {
        String resourceId = "azure-sp";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_CREDENTIAL);
        resource.setTemplate(Map.of(
                "type", "SERVICE_PRINCIPAL",
                "tenantId", "tenant-id",
                "identifier", "client-id",
                "secret", "client-secret"
        ));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(graphLookup.lookup(any(), any(), any(), any())).thenReturn(emptyGraphLookup());

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .claim("roles", List.of("Role1", "Role2"))
                .build();
        String mockTokenString = createMockToken(claimsSet);

        try (MockedConstruction<com.azure.identity.ClientSecretCredentialBuilder> ignored = mockConstruction(com.azure.identity.ClientSecretCredentialBuilder.class,
                (mockBuilder, context) -> {
                    ClientSecretCredential mockCredential = mock(ClientSecretCredential.class);
                    when(mockBuilder.clientId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.clientSecret(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.tenantId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.build()).thenReturn(mockCredential);

                    AccessToken mockToken = new AccessToken(mockTokenString, OffsetDateTime.now().plusHours(1));
                    when(mockCredential.getTokenSync(any())).thenReturn(mockToken);
                })) {

            CredentialValidationResult result = azureIdentityService.testCredential(resourceId);

            assertTrue(result.isValid());
            assertEquals(List.of("Role1", "Role2"), result.getScopes());
        }
    }

    @Test
    void testTestCredential_User_WithScp() throws Exception {
        String resourceId = "azure-user";
        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_CREDENTIAL);
        resource.setTemplate(Map.of(
                "type", "USER",
                "tenantId", "tenant-id",
                "identifier", "user@example.com",
                "secret", "password"
        ));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(graphLookup.lookup(any(), any(), any(), any())).thenReturn(emptyGraphLookup());

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .claim("idtyp", "user")
                .claim("scp", "User.Read Mail.Read")
                .build();
        String mockTokenString = createMockToken(claimsSet);

        try (MockedConstruction<com.azure.identity.UsernamePasswordCredentialBuilder> ignored = mockConstruction(com.azure.identity.UsernamePasswordCredentialBuilder.class,
                (mockBuilder, context) -> {
                    com.azure.identity.UsernamePasswordCredential mockCredential = mock(com.azure.identity.UsernamePasswordCredential.class);
                    when(mockBuilder.username(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.password(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.tenantId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.clientId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.build()).thenReturn(mockCredential);

                    AccessToken mockToken = new AccessToken(mockTokenString, OffsetDateTime.now().plusHours(1));
                    when(mockCredential.getTokenSync(any())).thenReturn(mockToken);
                })) {

            CredentialValidationResult result = azureIdentityService.testCredential(resourceId);

            assertTrue(result.isValid());
            assertEquals(List.of("User.Read", "Mail.Read"), result.getScopes());
        }
    }

    @Test
    void failedTokenAcquisitionPopulatesErrorWithAadstsCode() {
        MsalServiceException msal = mock(MsalServiceException.class);
        when(msal.errorCode()).thenReturn("AADSTS7000215");
        when(msal.correlationId()).thenReturn("corr-123");
        when(msal.getMessage()).thenReturn("Invalid client secret provided.");

        ClientAuthenticationException wrapped =
                new ClientAuthenticationException("Authentication failed", null, msal);

        try (MockedConstruction<com.azure.identity.ClientSecretCredentialBuilder> ignored = mockConstruction(com.azure.identity.ClientSecretCredentialBuilder.class,
                (mockBuilder, context) -> {
                    ClientSecretCredential mockCredential = mock(ClientSecretCredential.class);
                    when(mockBuilder.clientId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.clientSecret(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.tenantId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.build()).thenReturn(mockCredential);
                    when(mockCredential.getTokenSync(any(TokenRequestContext.class))).thenThrow(wrapped);
                })) {

            ResourceClass rc = sampleServicePrincipal();
            when(resourceService.findResourceById(rc.getId())).thenReturn(Optional.of(rc));

            CredentialValidationResult result = azureIdentityService.testCredential(rc.getId());

            assertFalse(result.isValid());
            assertNotNull(result.getError());
            assertEquals("AADSTS7000215", result.getError().getCode());
            assertEquals("corr-123", result.getError().getCorrelationId());
            assertTrue(result.getError().getMessage().contains("Invalid client secret"));
            assertEquals(ClientAuthenticationException.class.getName(), result.getError().getExceptionClass());
        }
    }

    @Test
    void successfulTokenPopulatesIdentityAndPermissions() {
        String jwt = synthJwt(Map.of(
                "tid", "tenant-1",
                "oid", "obj-1",
                "appid", "client-1",
                "aud", "https://management.azure.com/",
                "iss", "https://sts.windows.net/tenant-1/",
                "iat", 1747400000L,
                "exp", 1747403600L,
                "idtyp", "app",
                "roles", List.of("Reader")));

        AccessToken tok = new AccessToken(jwt, OffsetDateTime.now().plusHours(1));

        when(graphLookup.lookup(any(), eq(CredentialIdentityType.SERVICE_PRINCIPAL), eq("client-1"), eq(List.of())))
                .thenReturn(GraphLookupResult.builder()
                        .tenantDisplayName("Contoso")
                        .identityDisplayName("my-sp")
                        .directoryRoles(List.of())
                        .warnings(List.of())
                        .build());

        try (MockedConstruction<com.azure.identity.ClientSecretCredentialBuilder> ignored = mockConstruction(com.azure.identity.ClientSecretCredentialBuilder.class,
                (mockBuilder, context) -> {
                    ClientSecretCredential mockCredential = mock(ClientSecretCredential.class);
                    when(mockBuilder.clientId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.clientSecret(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.tenantId(anyString())).thenReturn(mockBuilder);
                    when(mockBuilder.build()).thenReturn(mockCredential);
                    when(mockCredential.getTokenSync(any(TokenRequestContext.class))).thenReturn(tok);
                })) {

            ResourceClass rc = sampleServicePrincipal();
            when(resourceService.findResourceById(rc.getId())).thenReturn(Optional.of(rc));

            CredentialValidationResult result = azureIdentityService.testCredential(rc.getId());

            assertTrue(result.isValid());
            assertEquals("Contoso", result.getTenant().getDisplayName());
            assertEquals("my-sp", result.getIdentity().getDisplayName());
            assertEquals(CredentialIdentityType.SERVICE_PRINCIPAL, result.getIdentity().getType());
            assertEquals(List.of("Reader"), result.getPermissions().getAppRoles());
            assertEquals(List.of("Reader"), result.getScopes());
            assertNotNull(result.getRawClaims());
        }
    }

    private static String synthJwt(Map<String, Object> body) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper m = new com.fasterxml.jackson.databind.ObjectMapper();
            String header = java.util.Base64.getUrlEncoder().withoutPadding()
                    .encodeToString("{\"alg\":\"none\"}".getBytes());
            String payload = java.util.Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(m.writeValueAsBytes(body));
            String sig = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("sig".getBytes());
            return header + "." + payload + "." + sig;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
