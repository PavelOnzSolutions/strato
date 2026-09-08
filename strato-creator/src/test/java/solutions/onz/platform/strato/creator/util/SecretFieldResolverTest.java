package solutions.onz.platform.strato.creator.util;

import solutions.onz.platform.strato.creator.services.EncryptionService;
import solutions.onz.platform.strato.creator.utils.SecretFieldResolver;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SecretFieldResolverTest {

    @Test
    void findSecretPaths_nullSchema_returnsEmpty() {
        assertTrue(SecretFieldResolver.findSecretPaths(null).isEmpty());
    }

    @Test
    void findSecretPaths_noProperties_returnsEmpty() {
        assertTrue(SecretFieldResolver.findSecretPaths(Map.of("type", "object")).isEmpty());
    }

    @Test
    void findSecretPaths_flatSecretField() {
        Map<String, Object> schema = Map.of(
                "properties", Map.of(
                        "apiKey", Map.of("type", "secret"),
                        "baseUrl", Map.of("type", "string")
                )
        );
        Set<String> paths = SecretFieldResolver.findSecretPaths(schema);
        assertEquals(Set.of("apiKey"), paths);
    }

    @Test
    void findSecretPaths_nestedSecretField() {
        Map<String, Object> nested = Map.of(
                "type", "object",
                "properties", Map.of(
                        "password", Map.of("type", "secret"),
                        "host", Map.of("type", "string")
                )
        );
        Map<String, Object> schema = Map.of(
                "properties", Map.of(
                        "database", nested,
                        "apiKey", Map.of("type", "secret")
                )
        );
        Set<String> paths = SecretFieldResolver.findSecretPaths(schema);
        assertEquals(Set.of("apiKey", "database.password"), paths);
    }

    @Test
    void findSecretPaths_noSecretFields_returnsEmpty() {
        Map<String, Object> schema = Map.of(
                "properties", Map.of(
                        "name", Map.of("type", "string"),
                        "count", Map.of("type", "number")
                )
        );
        assertTrue(SecretFieldResolver.findSecretPaths(schema).isEmpty());
    }

    @Test
    void maskValue_nullValue_returnsTripleAsterisk() {
        assertEquals("***", SecretFieldResolver.maskValue(null));
    }

    @Test
    void maskValue_shortValue_returnsTripleAsterisk() {
        assertEquals("***", SecretFieldResolver.maskValue("ab"));
        assertEquals("***", SecretFieldResolver.maskValue("abc"));
    }

    @Test
    void maskValue_longValue_returnsAsterisksAndLast3() {
        assertEquals("***ken", SecretFieldResolver.maskValue("my-secret-token"));
        assertEquals("***xyz", SecretFieldResolver.maskValue("abcxyz"));
    }

    @Test
    void maskData_masksSecretFieldsOnly() {
        Map<String, Object> data = new HashMap<>(Map.of(
                "apiKey", "gcm.v1:someEncryptedValue",
                "baseUrl", "https://example.com"
        ));
        Map<String, Object> result = SecretFieldResolver.maskData(data, Set.of("apiKey"));
        assertEquals("***lue", result.get("apiKey"));
        assertEquals("https://example.com", result.get("baseUrl"));
    }

    @Test
    void maskData_doesNotMutateOriginal() {
        Map<String, Object> data = new HashMap<>(Map.of("apiKey", "gcm.v1:secret"));
        SecretFieldResolver.maskData(data, Set.of("apiKey"));
        assertEquals("gcm.v1:secret", data.get("apiKey"));
    }

    @Test
    void maskData_nestedPath() {
        Map<String, Object> inner = new HashMap<>(Map.of("password", "gcm.v1:encrypted"));
        Map<String, Object> data = new HashMap<>(Map.of("database", inner, "name", "app"));
        Map<String, Object> result = SecretFieldResolver.maskData(data, Set.of("database.password"));
        @SuppressWarnings("unchecked")
        Map<String, Object> resultInner = (Map<String, Object>) result.get("database");
        assertEquals("***ted", resultInner.get("password"));
        assertEquals("app", result.get("name"));
    }

    @Test
    void encryptData_plaintextIsEncrypted() {
        EncryptionService enc = mock(EncryptionService.class);
        when(enc.encrypt("realSecret")).thenReturn("gcm.v1:encryptedResult");

        Map<String, Object> incoming = new HashMap<>(Map.of("apiKey", "realSecret"));
        Map<String, Object> result = SecretFieldResolver.encryptData(incoming, null, Set.of("apiKey"), enc);

        assertEquals("gcm.v1:encryptedResult", result.get("apiKey"));
    }

    @Test
    void encryptData_alreadyEncryptedIsLeftAlone() {
        EncryptionService enc = mock(EncryptionService.class);

        Map<String, Object> incoming = new HashMap<>(Map.of("apiKey", "gcm.v1:already"));
        Map<String, Object> result = SecretFieldResolver.encryptData(incoming, null, Set.of("apiKey"), enc);

        assertEquals("gcm.v1:already", result.get("apiKey"));
    }

    @Test
    void encryptData_maskedValuePreservesExisting() {
        EncryptionService enc = mock(EncryptionService.class);

        Map<String, Object> incoming = new HashMap<>(Map.of("apiKey", "***lue"));
        Map<String, Object> existing = Map.of("apiKey", "gcm.v1:original");
        Map<String, Object> result = SecretFieldResolver.encryptData(incoming, existing, Set.of("apiKey"), enc);

        assertEquals("gcm.v1:original", result.get("apiKey"));
    }

    @Test
    void decryptData_decryptsSecretFields() {
        EncryptionService enc = mock(EncryptionService.class);
        when(enc.decrypt("gcm.v1:encrypted")).thenReturn("realSecret");

        Map<String, Object> data = new HashMap<>(Map.of("apiKey", "gcm.v1:encrypted", "name", "app"));
        Map<String, Object> result = SecretFieldResolver.decryptData(data, Set.of("apiKey"), enc);

        assertEquals("realSecret", result.get("apiKey"));
        assertEquals("app", result.get("name"));
    }

    @Test
    void encryptData_maskedValueWithLegacyPlaintextExisting_encrypts() {
        EncryptionService enc = mock(EncryptionService.class);
        when(enc.encrypt("legacyPlaintext")).thenReturn("gcm.v1:freshlyEncrypted");

        Map<String, Object> incoming = new HashMap<>(Map.of("apiKey", "***ext"));
        Map<String, Object> existing = Map.of("apiKey", "legacyPlaintext");
        Map<String, Object> result = SecretFieldResolver.encryptData(incoming, existing, Set.of("apiKey"), enc);

        assertEquals("gcm.v1:freshlyEncrypted", result.get("apiKey"));
    }

    @Test
    void encryptData_maskedValueWithNoExisting_throws() {
        EncryptionService enc = mock(EncryptionService.class);
        Map<String, Object> incoming = new HashMap<>(Map.of("apiKey", "***lue"));
        assertThrows(IllegalArgumentException.class,
            () -> SecretFieldResolver.encryptData(incoming, null, Set.of("apiKey"), enc));
    }

    @Test
    void decryptData_doesNotMutateOriginal() {
        EncryptionService enc = mock(EncryptionService.class);
        when(enc.decrypt("gcm.v1:secret")).thenReturn("realValue");
        Map<String, Object> data = new HashMap<>(Map.of("apiKey", "gcm.v1:secret"));
        SecretFieldResolver.decryptData(data, Set.of("apiKey"), enc);
        assertEquals("gcm.v1:secret", data.get("apiKey"));
    }

    @Test
    void encryptData_doesNotMutateOriginal() {
        EncryptionService enc = mock(EncryptionService.class);
        when(enc.encrypt("plain")).thenReturn("gcm.v1:encrypted");
        Map<String, Object> incoming = new HashMap<>(Map.of("apiKey", "plain"));
        SecretFieldResolver.encryptData(incoming, null, Set.of("apiKey"), enc);
        assertEquals("plain", incoming.get("apiKey"));
    }
}
