package solutions.onz.platform.strato.creator.services.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.services.dto.CredentialIdentityType;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

public record JwtClaims(Map<String, Object> body) {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static JwtClaims parse(String jwt) {
        if (jwt == null) {
            throw new IllegalArgumentException("JWT is null");
        }
        String[] parts = jwt.split("\\.");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Not a JWT: missing body segment");
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            @SuppressWarnings("unchecked")
            Map<String, Object> body = MAPPER.readValue(decoded, Map.class);
            return new JwtClaims(body);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid JWT base64 body", e);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JWT body JSON", e);
        }
    }

    public String tenantId()           { return str("tid"); }
    public String objectId()           { return str("oid"); }
    public String userPrincipalName()  { return str("upn"); }
    public String audience()           { return str("aud"); }
    public String issuer()             { return str("iss"); }
    public Instant issuedAt()          { return epoch("iat"); }
    public Instant notBefore()         { return epoch("nbf"); }
    public Instant expiresAt()         { return epoch("exp"); }

    public String appId() {
        String app = str("appid");
        return app != null ? app : str("azp");
    }

    public CredentialIdentityType identityType() {
        Object idtyp = body.get("idtyp");
        if ("app".equals(idtyp)) return CredentialIdentityType.SERVICE_PRINCIPAL;
        if ("user".equals(idtyp)) return CredentialIdentityType.USER;
        if (body.containsKey("upn") || body.containsKey("unique_name")) return CredentialIdentityType.USER;
        return CredentialIdentityType.SERVICE_PRINCIPAL;
    }

    public List<String> scopes() {
        String scp = str("scp");
        if (scp == null || scp.isBlank()) return List.of();
        return List.of(scp.trim().split("\\s+"));
    }

    public List<String> appRoles()              { return stringList("roles"); }
    public List<String> wids()                  { return stringList("wids"); }
    public List<String> authenticationMethods() { return stringList("amr"); }

    private String str(String key) {
        Object v = body.get(key);
        return v instanceof String s ? s : null;
    }

    private Instant epoch(String key) {
        Object v = body.get(key);
        if (v instanceof Number n) return Instant.ofEpochSecond(n.longValue());
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> stringList(String key) {
        Object v = body.get(key);
        return v instanceof List<?> ? List.copyOf((List<String>) v) : List.of();
    }
}
