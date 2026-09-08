package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.core.io.Resource;
import org.springframework.context.ApplicationContext;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.*;

import static java.nio.charset.StandardCharsets.UTF_8;

@Service
public class JwtService {
    private final ApplicationProperties properties;
    private final ApplicationContext applicationContext;
    private final AuthorityRepository authorityRepository;

    private RSAKey rsaJwk;
    private NimbusJwtEncoder jwtEncoder;

    public JwtService(ApplicationProperties properties,
                      ApplicationContext applicationContext,
                      AuthorityRepository authorityRepository) {
        this.properties = properties;
        this.applicationContext = applicationContext;
        this.authorityRepository = authorityRepository;
    }

    /**
     * Resolves the flattened, hierarchy-expanded set of permissions for a list of role names.
     * Used to embed an {@code authorities} claim in issued JWTs so the frontend can compute
     * permission checks without an extra round-trip.
     */
    private List<String> resolveAuthoritiesFromRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) return List.of();
        Set<String> result = new LinkedHashSet<>();
        for (String role : roles) {
            authorityRepository.findById(role).ifPresent(auth -> {
                if (auth.getPermissions() != null) {
                    result.addAll(Permissions.expandAll(auth.getPermissions()));
                }
            });
        }
        return new ArrayList<>(result);
    }

    private synchronized void init() {
        if (this.jwtEncoder != null && this.rsaJwk != null) return;
        try {
            RSAPublicKey publicKey = loadPublicKey(properties.getSecurity().getJwt().getPublicKeyLocation());
            RSAPrivateKey privateKey = loadPrivateKey(properties.getSecurity().getJwt().getPrivateKeyLocation());
            String keyId = UUID.randomUUID().toString();
            this.rsaJwk = new RSAKey.Builder(publicKey)
                    .privateKey(privateKey)
                    .keyID(keyId)
                    .algorithm(com.nimbusds.jose.JWSAlgorithm.RS256)
                    .build();
            // Use a JWKSet that contains the private key so the encoder can sign JWTs
            JWKSet jwkSet = new JWKSet(rsaJwk);
            this.jwtEncoder = new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(jwkSet));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize JWT keys", e);
        }
    }

    public String generateToken(String userId, String username, String displayName, List<String> roles, String jtiOpt) {
        return generateTokenWithTtl(userId, username, displayName, roles, jtiOpt, properties.getSecurity().getJwt().getTtlSeconds(), 0, null);
    }

    public String generateToken(String userId, String username, String displayName, List<String> roles, String jtiOpt, int refreshCount, Instant absoluteExp) {
        return generateTokenWithTtl(userId, username, displayName, roles, jtiOpt, properties.getSecurity().getJwt().getTtlSeconds(), refreshCount, absoluteExp);
    }

    public String generateTokenWithTtl(String userId, String username, String displayName, List<String> roles, String jtiOpt, long ttlSeconds) {
        return generateTokenWithTtl(userId, username, displayName, roles, jtiOpt, ttlSeconds, 0, null);
    }

    public String generateTokenWithTtl(String userId, String username, String displayName, List<String> roles, String jtiOpt, long ttlSeconds, int refreshCount, Instant absoluteExp) {
        init();
        Instant now = Instant.now();
        long ttl = ttlSeconds > 0 ? ttlSeconds : properties.getSecurity().getJwt().getTtlSeconds();
        Instant exp = now.plusSeconds(ttl);
        String jti = StringUtils.hasText(jtiOpt) ? jtiOpt : UUID.randomUUID().toString();

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer(properties.getSecurity().getJwt().getIssuer())
                .issuedAt(now)
                .expiresAt(exp)
                .id(jti)
                .subject(userId)
                .claim("username", username)
                .claim("roles", roles)
                .claim("displayName", (null == displayName || displayName.isEmpty()) ? username : displayName);

        List<String> authorities = resolveAuthoritiesFromRoles(roles);
        if (!authorities.isEmpty()) {
            claimsBuilder.claim("authorities", authorities);
        }

        if (refreshCount > 0) {
            claimsBuilder.claim("refreshCount", refreshCount);
        }
        if (absoluteExp != null) {
            claimsBuilder.claim("absoluteExp", absoluteExp.getEpochSecond());
        }

        JwtClaimsSet claims = claimsBuilder.build();

        JwsHeader headers = JwsHeader.with(SignatureAlgorithm.RS256)
                .keyId(rsaJwk.getKeyID())
                .build();

        return this.jwtEncoder.encode(JwtEncoderParameters.from(headers, claims)).getTokenValue();
    }

    public Map<String, Object> jwks() {
        init();
        JWK publicJwk = rsaJwk.toPublicJWK();
        return new JWKSet(publicJwk).toJSONObject(true);
    }

    public JwtDecoder localJwtDecoder() {
        init();
        try {
            return NimbusJwtDecoder.withPublicKey(rsaJwk.toRSAPublicKey()).build();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create local JwtDecoder", e);
        }
    }

    private RSAPublicKey loadPublicKey(String location) throws Exception {
        Resource resource = applicationContext.getResource(location);
        try (InputStream is = resource.getInputStream()) {
            String pem = new String(is.readAllBytes(), UTF_8).trim();
            KeyFactory kf = KeyFactory.getInstance("RSA");

            if (pem.contains("-----BEGIN RSA PUBLIC KEY-----")) {
                // PKCS#1 RSAPublicKey -> wrap into SubjectPublicKeyInfo (X.509)
                String content = pem.replace("-----BEGIN RSA PUBLIC KEY-----", "")
                        .replace("-----END RSA PUBLIC KEY-----", "")
                        .replaceAll("\r?\n", "");
                byte[] pkcs1 = Base64.getDecoder().decode(content);
                byte[] spki = buildSubjectPublicKeyInfoFromPkcs1(pkcs1);
                X509EncodedKeySpec spec = new X509EncodedKeySpec(spki);
                PublicKey pk = kf.generatePublic(spec);
                return (RSAPublicKey) pk;
            } else {
                String content = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                        .replace("-----END PUBLIC KEY-----", "")
                        .replaceAll("\r?\n", "");
                byte[] der = Base64.getDecoder().decode(content);
                X509EncodedKeySpec spec = new X509EncodedKeySpec(der);
                PublicKey pk = kf.generatePublic(spec);
                return (RSAPublicKey) pk;
            }
        }
    }

    private static byte[] buildSubjectPublicKeyInfoFromPkcs1(byte[] pkcs1RsaPublicKey) {
        // AlgorithmIdentifier for rsaEncryption with NULL params
        byte[] rsaAlgoOid = new byte[]{0x06, 0x09,
                0x2A, (byte)0x86, 0x48, (byte)0x86, (byte)0xF7, 0x0D, 0x01, 0x01, 0x01};
        byte[] nullParams = new byte[]{0x05, 0x00};
        byte[] algoIdSeq = derSequence(concat(rsaAlgoOid, nullParams));
        byte[] bitString = derBitString(pkcs1RsaPublicKey);
        return derSequence(concat(algoIdSeq, bitString));
    }

    private static byte[] derBitString(byte[] content) {
        // BIT STRING with 0 unused bits -> prefix 0x00 before content
        byte[] payload = new byte[1 + content.length];
        payload[0] = 0x00; // 0 unused bits
        System.arraycopy(content, 0, payload, 1, content.length);
        byte[] len = derLength(payload.length);
        byte[] out = new byte[1 + len.length + payload.length];
        out[0] = 0x03; // BIT STRING
        System.arraycopy(len, 0, out, 1, len.length);
        System.arraycopy(payload, 0, out, 1 + len.length, payload.length);
        return out;
    }

    private static byte[] derInteger(int value) {
        if (value == 0) {
            return new byte[]{0x02, 0x01, 0x00};
        }
        // Encode positive integer in minimal two's-complement big-endian form
        int tmp = value;
        int numBytes = 0;
        while (tmp != 0) {
            numBytes++;
            tmp >>>= 8;
        }
        byte[] content = new byte[numBytes];
        for (int i = numBytes - 1; i >= 0; i--) {
            content[i] = (byte) (value & 0xFF);
            value >>>= 8;
        }
        // If highest bit set, prepend 0x00 to indicate positive
        if ((content[0] & 0x80) != 0) {
            byte[] extended = new byte[content.length + 1];
            extended[0] = 0x00;
            System.arraycopy(content, 0, extended, 1, content.length);
            content = extended;
        }
        byte[] len = derLength(content.length);
        byte[] out = new byte[1 + len.length + content.length];
        out[0] = 0x02; // INTEGER
        System.arraycopy(len, 0, out, 1, len.length);
        System.arraycopy(content, 0, out, 1 + len.length, content.length);
        return out;
    }

    private RSAPrivateKey loadPrivateKey(String location) throws Exception {
        Resource resource = applicationContext.getResource(location);
        try (InputStream is = resource.getInputStream()) {
            String pem = new String(is.readAllBytes(), UTF_8).trim();
            KeyFactory kf = KeyFactory.getInstance("RSA");

            if (pem.contains("-----BEGIN RSA PRIVATE KEY-----")) {
                // PKCS#1 format - convert to PKCS#8
                String content = pem.replace("-----BEGIN RSA PRIVATE KEY-----", "")
                        .replace("-----END RSA PRIVATE KEY-----", "")
                        .replaceAll("\r?\n", "");
                byte[] pkcs1 = Base64.getDecoder().decode(content);
                byte[] pkcs8 = convertPkcs1ToPkcs8(pkcs1);
                PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(pkcs8);
                PrivateKey pk = kf.generatePrivate(spec);
                return (RSAPrivateKey) pk;
            } else {
                // Assume PKCS#8 format
                String content = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                        .replace("-----END PRIVATE KEY-----", "")
                        .replaceAll("\r?\n", "");
                byte[] der = Base64.getDecoder().decode(content);
                PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
                PrivateKey pk = kf.generatePrivate(spec);
                return (RSAPrivateKey) pk;
            }
        }
    }

    // Minimal PKCS#1 (RSAPrivateKey) to PKCS#8 (PrivateKeyInfo) converter without external libs
    // Builds: PrivateKeyInfo ::= SEQUENCE { version INTEGER (0), algorithm AlgorithmIdentifier, privateKey OCTET STRING }
    // Where AlgorithmIdentifier for rsaEncryption is: 1.2.840.113549.1.1.1 with NULL params
    private static byte[] convertPkcs1ToPkcs8(byte[] pkcs1) {
        // ASN.1 DER helpers
        byte[] version = derInteger(0);
        byte[] rsaAlgoOid = new byte[]{0x06, 0x09, // OID tag, length 9
                0x2A, (byte)0x86, 0x48, (byte)0x86, (byte)0xF7, 0x0D, 0x01, 0x01, 0x01}; // 1.2.840.113549.1.1.1
        byte[] nullParams = new byte[]{0x05, 0x00}; // NULL
        byte[] algoIdSeq = derSequence(concat(rsaAlgoOid, nullParams));
        byte[] privateKeyOctetString = derOctetString(pkcs1);
        byte[] content = concat(version, concat(algoIdSeq, privateKeyOctetString));
        return derSequence(content);
    }

    private static byte[] derLength(int length) {
        if (length < 0x80) {
            return new byte[]{(byte) length};
        }
        int tmp = length;
        int numBytes = 0;
        while (tmp > 0) { numBytes++; tmp >>= 8; }
        byte[] out = new byte[1 + numBytes];
        out[0] = (byte) (0x80 | numBytes);
        for (int i = numBytes; i > 0; i--) {
            out[i] = (byte) (length & 0xFF);
            length >>= 8;
        }
        return out;
    }

    private static byte[] derSequence(byte[] content) {
        byte[] len = derLength(content.length);
        byte[] out = new byte[1 + len.length + content.length];
        out[0] = 0x30; // SEQUENCE
        System.arraycopy(len, 0, out, 1, len.length);
        System.arraycopy(content, 0, out, 1 + len.length, content.length);
        return out;
    }

    private static byte[] derOctetString(byte[] content) {
        byte[] len = derLength(content.length);
        byte[] out = new byte[1 + len.length + content.length];
        out[0] = 0x04; // OCTET STRING
        System.arraycopy(len, 0, out, 1, len.length);
        System.arraycopy(content, 0, out, 1 + len.length, content.length);
        return out;
    }

    private static byte[] concat(byte[] a, byte[] b) {
        byte[] out = new byte[a.length + b.length];
        System.arraycopy(a, 0, out, 0, a.length);
        System.arraycopy(b, 0, out, a.length, b.length);
        return out;
    }
}
