package solutions.onz.platform.strato.creator.services;

import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.security.keyvault.secrets.SecretClient;
import com.azure.security.keyvault.secrets.SecretClientBuilder;
import com.azure.security.keyvault.secrets.models.KeyVaultSecret;
import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class EncryptionService {

    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128; // 16 bytes tag
    private static final int IV_LENGTH_BYTES = 12; // 96-bit IV recommended for GCM
    private static final String FORMAT_PREFIX = "gcm.v1:"; // versioned marker

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ApplicationProperties properties;

    /**
     * Builds a SecretClient for the configured Key Vault.
     */
    private SecretClient buildSecretClient() {
        String keyVaultName = properties.getSecurity().getAzure().getKeyVaultName();
        if (StringUtils.isBlank(keyVaultName)) {
            throw new IllegalStateException(
                    "Azure Key Vault name is not configured (strato.security.azure.key-vault-name)");
        }
        String vaultUrl = String.format("https://%s.vault.azure.net", keyVaultName);
        return new SecretClientBuilder()
                .vaultUrl(vaultUrl)
                .credential(new DefaultAzureCredentialBuilder().build())
                .buildClient();
    }

    /**
     * Generic helper to fetch any secret by name from the configured Key Vault.
     */
    public String getSecret(String secretName) {
        if (StringUtils.isBlank(secretName)) {
            throw new IllegalArgumentException("Secret name must not be blank");
        }
        SecretClient client = buildSecretClient();
        return client.getSecret(secretName).getValue();
    }

    /**
     * Encrypts the given plaintext using AES-GCM with a 256-bit key derived from
     * the master key stored in Key Vault.
     * The result format is: gcm.v1:<base64url(iv || ciphertext_and_tag)>
     * - Uses 12-byte random IV and 128-bit authentication tag.
     * - Returns null if plaintext is null.
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.startsWith(FORMAT_PREFIX)) {
            return plaintext;
        }
        try {
            byte[] keyBytes = loadAes256KeyBytes();
            byte[] iv = new byte[IV_LENGTH_BYTES];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), gcmSpec);
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            ByteBuffer bb = ByteBuffer.allocate(iv.length + ciphertext.length);
            bb.put(iv);
            bb.put(ciphertext);
            String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(bb.array());
            return FORMAT_PREFIX + encoded;
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /**
     * Decrypts a value produced by encrypt(). If the value does not start with the
     * expected prefix,
     * the original string is returned unchanged for backward compatibility.
     * Returns null if input is null.
     */
    public String decrypt(String value) {
        if (value == null) {
            return null;
        }
        if (!value.startsWith(FORMAT_PREFIX)) {
            // Not an encrypted value in our format — return as-is.
            return value;
        }
        try {
            String payload = value.substring(FORMAT_PREFIX.length());
            byte[] combined = Base64.getUrlDecoder().decode(payload);
            if (combined.length < IV_LENGTH_BYTES + 16) { // at least IV + tag
                throw new IllegalArgumentException("Encrypted payload too short");
            }
            byte[] iv = new byte[IV_LENGTH_BYTES];
            byte[] ciphertext = new byte[combined.length - IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH_BYTES);
            System.arraycopy(combined, IV_LENGTH_BYTES, ciphertext, 0, ciphertext.length);

            byte[] keyBytes = loadAes256KeyBytes();
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), gcmSpec);
            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }

    private byte[] loadAes256KeyBytes() throws Exception {
        String master = getMasterKey();
        if (StringUtils.isBlank(master)) {
            throw new IllegalStateException("Master key from Key Vault is empty");
        }
        // Try Base64 (both standard and URL-safe)
        byte[] decoded = tryBase64(master);
        if (decoded == null) {
            // Try hex
            decoded = tryHex(master);
        }
        byte[] raw;
        if (decoded != null) {
            raw = decoded;
        } else {
            raw = master.getBytes(StandardCharsets.UTF_8);
        }
        // Normalize to 32 bytes (256-bit) using SHA-256 if necessary
        if (raw.length == 32) {
            return raw;
        }
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        return sha256.digest(raw);
    }

    /**
     * Attempts to decode the provided string using Base64 decoding. Tries both
     * standard
     * and URL-safe Base64 decoders, returning the decoded byte array if successful.
     * Returns null if decoding fails or the resulting byte array is empty.
     *
     * @param s the string to decode, which may be encoded in standard Base64 or
     *          URL-safe Base64
     * @return the decoded byte array if decoding is successful and the result is
     *         not empty,
     *         or null if decoding fails or the result is an empty byte array
     */
    private byte[] tryBase64(String s) {
        try {
            // Accept both standard and URL encodings; choose the one that succeeds and
            // yields plausible length
            byte[] v;
            try {
                v = Base64.getDecoder().decode(s);
            } catch (IllegalArgumentException e) {
                v = Base64.getUrlDecoder().decode(s);
            }
            return v.length == 0 ? null : v;
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Attempts to convert a hexadecimal string into a byte array. The input string
     * must have an even length and contain valid hexadecimal characters. If the
     * string does not meet these requirements, the method returns null.
     *
     * @param s the hexadecimal string to be converted. Must contain only valid
     *          hexadecimal characters (0-9, A-F, a-f) and have an even length.
     * @return a byte array representation of the hexadecimal string if successful.
     *         Returns null if the input string has an odd length or contains
     *         invalid characters.
     */
    private byte[] tryHex(String s) {
        String hex = s.trim();
        if (hex.length() % 2 != 0) {
            return null;
        }
        int len = hex.length();
        byte[] out = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            int hi = Character.digit(hex.charAt(i), 16);
            int lo = Character.digit(hex.charAt(i + 1), 16);
            if (hi == -1 || lo == -1) {
                return null;
            }
            out[i / 2] = (byte) ((hi << 4) + lo);
        }
        return out;
    }

    /**
     * Retrieves the master encryption key from Azure Key Vault using the configured
     * secret name.
     * 
     * @return the master key value as plain text.
     */
    private String getMasterKey() {
        // Priority 1: Check property strato.security.encryption.master-key
        String directKey = properties.getSecurity().getEncryption().getMasterKeyConfig();
        if (StringUtils.isNotBlank(directKey)) {
            return directKey;
        }

        // Priority 2: Fallback to Key Vault
        String secretName = properties.getSecurity().getAzure().getMasterKeySecretName();
        if (StringUtils.isBlank(secretName)) {
            throw new IllegalStateException(
                    "Master key not configured directly and Key Vault secret name is also missing.");
        }
        SecretClient client = buildSecretClient();
        KeyVaultSecret secret = client.getSecret(secretName);
        return secret.getValue();
    }

    /**
     * Retrieves the backup master key from configuration or Azure Key Vault.
     */
    private String getBackupMasterKey() {
        // Priority 1: Check property strato.security.encryption.master-key-backup
        String directKey = properties.getSecurity().getEncryption().getMasterKeyBackup();
        if (StringUtils.isNotBlank(directKey)) {
            return directKey;
        }

        // Priority 2: Fallback to Key Vault
        String secretName = properties.getSecurity().getAzure().getMasterKeyBackupSecretName();
        if (StringUtils.isBlank(secretName)) {
            return getMasterKey();
        }

        try {
            SecretClient client = buildSecretClient();
            KeyVaultSecret secret = client.getSecret(secretName);
            return secret.getValue();
        } catch (Exception e) {
            log.warn("Failed to fetch backup master key from Key Vault (secret: {}), falling back to primary master key", secretName);
            return getMasterKey();
        }
    }

    public String hmacSha256(byte[] data) {
        try {
            byte[] keyBytes = loadBackupKeyBytes();
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keyBytes, "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(data));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256", e);
        }
    }

    private byte[] loadBackupKeyBytes() throws Exception {
        String master = getBackupMasterKey();
        if (StringUtils.isBlank(master)) {
            throw new IllegalStateException("Backup master key is empty");
        }
        byte[] decoded = tryBase64(master);
        if (decoded == null) {
            decoded = tryHex(master);
        }
        byte[] raw = (decoded != null) ? decoded : master.getBytes(StandardCharsets.UTF_8);
        if (raw.length == 32) return raw;
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        return sha256.digest(raw);
    }
}
