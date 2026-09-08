package solutions.onz.platform.strato.creator.services.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtClaimsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void parsesServicePrincipalClaims() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tid", "54f9e2c1-1234-4abc-8888-aaaaaaaaaaaa");
        body.put("oid", "9b7c2e1a-aaaa-bbbb-cccc-dddddddddddd");
        body.put("appid", "1f2e3d4c-aaaa-bbbb-cccc-eeeeeeeeeeee");
        body.put("aud", "https://management.azure.com/");
        body.put("iss", "https://sts.windows.net/54f9e2c1-1234-4abc-8888-aaaaaaaaaaaa/");
        body.put("iat", 1747400000L);
        body.put("nbf", 1747400000L);
        body.put("exp", 1747403600L);
        body.put("idtyp", "app");
        body.put("roles", List.of("Reader", "Writer"));
        body.put("wids", List.of("11111111-2222-3333-4444-555555555555"));

        String jwt = synthJwt(body);
        JwtClaims claims = JwtClaims.parse(jwt);

        assertThat(claims.tenantId()).isEqualTo("54f9e2c1-1234-4abc-8888-aaaaaaaaaaaa");
        assertThat(claims.objectId()).isEqualTo("9b7c2e1a-aaaa-bbbb-cccc-dddddddddddd");
        assertThat(claims.appId()).isEqualTo("1f2e3d4c-aaaa-bbbb-cccc-eeeeeeeeeeee");
        assertThat(claims.audience()).isEqualTo("https://management.azure.com/");
        assertThat(claims.issuer()).startsWith("https://sts.windows.net/");
        assertThat(claims.issuedAt()).isEqualTo(Instant.ofEpochSecond(1747400000L));
        assertThat(claims.expiresAt()).isEqualTo(Instant.ofEpochSecond(1747403600L));
        assertThat(claims.identityType()).isEqualTo(CredentialIdentityType.SERVICE_PRINCIPAL);
        assertThat(claims.appRoles()).containsExactly("Reader", "Writer");
        assertThat(claims.scopes()).isEmpty();
        assertThat(claims.userPrincipalName()).isNull();
        assertThat(claims.wids()).containsExactly("11111111-2222-3333-4444-555555555555");
        assertThat(claims.body()).containsKey("appid");
    }

    @Test
    void parsesUserClaims() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tid", "tenant-id");
        body.put("oid", "object-id");
        body.put("upn", "alice@example.com");
        body.put("aud", "https://management.azure.com/");
        body.put("iss", "https://login.microsoftonline.com/tenant-id/v2.0");
        body.put("iat", 1747400000L);
        body.put("exp", 1747403600L);
        body.put("idtyp", "user");
        body.put("scp", "user_impersonation profile openid");
        body.put("amr", List.of("pwd", "mfa"));

        JwtClaims claims = JwtClaims.parse(synthJwt(body));

        assertThat(claims.identityType()).isEqualTo(CredentialIdentityType.USER);
        assertThat(claims.userPrincipalName()).isEqualTo("alice@example.com");
        assertThat(claims.scopes()).containsExactly("user_impersonation", "profile", "openid");
        assertThat(claims.appRoles()).isEmpty();
        assertThat(claims.authenticationMethods()).containsExactly("pwd", "mfa");
    }

    @Test
    void fallsBackToAzpWhenAppidMissing() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("azp", "azp-client-id");
        JwtClaims claims = JwtClaims.parse(synthJwt(body));
        assertThat(claims.appId()).isEqualTo("azp-client-id");
    }

    @Test
    void inferUserWhenIdtypAbsentButUpnPresent() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("upn", "bob@example.com");
        JwtClaims claims = JwtClaims.parse(synthJwt(body));
        assertThat(claims.identityType()).isEqualTo(CredentialIdentityType.USER);
    }

    @Test
    void inferServicePrincipalWhenIdtypAndUpnAbsent() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("appid", "app-id-only");
        JwtClaims claims = JwtClaims.parse(synthJwt(body));
        assertThat(claims.identityType()).isEqualTo(CredentialIdentityType.SERVICE_PRINCIPAL);
    }

    @Test
    void rejectsMalformedJwt() {
        assertThatThrownBy(() -> JwtClaims.parse("not-a-jwt"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsInvalidBodyJson() {
        String header = base64Url("{}".getBytes());
        String badBody = base64Url("not json".getBytes());
        String sig = base64Url("sig".getBytes());
        assertThatThrownBy(() -> JwtClaims.parse(header + "." + badBody + "." + sig))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static String synthJwt(Map<String, Object> body) throws Exception {
        String header = base64Url("{\"alg\":\"none\"}".getBytes());
        String payload = base64Url(MAPPER.writeValueAsBytes(body));
        String sig = base64Url("sig".getBytes());
        return header + "." + payload + "." + sig;
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
