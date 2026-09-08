package solutions.onz.platform.strato.creator.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.services.dto.BackupMetadataDto;
import solutions.onz.platform.strato.creator.services.dto.BackupRequestDto;
import solutions.onz.platform.strato.creator.services.dto.RestoreRequestDto;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BackupServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private MongoMappingContext mappingContext;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private EncryptionService encryptionService;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private BackupService backupService;

    @Backupable
    private static class TestEntity {}

    @BeforeEach
    void setUp() {
    }

    @Test
    void testListBackupableCollections() {
        MongoPersistentEntity entity = mock(MongoPersistentEntity.class);
        when(entity.getType()).thenReturn((Class) TestEntity.class);
        when(entity.getCollection()).thenReturn("test_collection");
        
        when(mappingContext.getPersistentEntities()).thenReturn(Collections.singletonList(entity));

        List<String> collections = backupService.listBackupableCollections();

        assertEquals(1, collections.size());
        assertEquals("test_collection", collections.get(0));
    }

    @Test
    void testCreateBackup() throws IOException {
        BackupRequestDto request = new BackupRequestDto();
        request.setTables(List.of("test_collection"));

        Document doc = new Document("key", "value");
        when(mongoTemplate.findAll(Document.class, "test_collection")).thenReturn(List.of(doc));
        when(encryptionService.hmacSha256(any())).thenReturn("mocked_signature");

        byte[] zipBytes = backupService.createBackup(request);

        assertNotNull(zipBytes);
        
        // Verify zip content
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            boolean foundJson = false;
            boolean foundMeta = false;
            boolean foundSig = false;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().equals("test_collection.json")) {
                    foundJson = true;
                } else if (entry.getName().equals("metadata.json")) {
                    foundMeta = true;
                } else if (entry.getName().equals("signature.sig")) {
                    foundSig = true;
                }
            }
            assertTrue(foundJson);
            assertTrue(foundMeta);
            assertTrue(foundSig);
        }
        
        verify(auditLogRepository, atLeastOnce()).save(any(AuditLog.class));
    }

    @Test
    void testAnalyzeBackup() throws IOException {
        // Create a fake zip in memory
        BackupRequestDto request = new BackupRequestDto();
        request.setTables(List.of("test_collection"));
        when(mongoTemplate.findAll(Document.class, "test_collection")).thenReturn(List.of(new Document("a", "b")));
        when(encryptionService.hmacSha256(any())).thenReturn("mocked_signature");
        
        byte[] zipBytes = backupService.createBackup(request);

        BackupMetadataDto metadata = backupService.analyzeBackup(new ByteArrayInputStream(zipBytes));

        assertNotNull(metadata);
        assertTrue(metadata.getCollections().contains("test_collection"));
        assertEquals("mocked_signature", metadata.getSignature());
    }

    @Test
    void testRestoreBackup() throws IOException {
        BackupRequestDto requestBackup = new BackupRequestDto();
        requestBackup.setTables(List.of("test_collection"));
        when(mongoTemplate.findAll(Document.class, "test_collection")).thenReturn(List.of(new Document("a", "b")));
        when(encryptionService.hmacSha256(any())).thenReturn("mocked_signature");

        byte[] zipBytes = backupService.createBackup(requestBackup);

        RestoreRequestDto requestRestore = new RestoreRequestDto();
        requestRestore.setCollections(List.of("test_collection"));

        backupService.restoreBackup(new ByteArrayInputStream(zipBytes), requestRestore);

        verify(mongoTemplate).dropCollection("test_collection");
        verify(mongoTemplate).save(any(Document.class), eq("test_collection"));
        verify(auditLogRepository, atLeastOnce()).save(any(AuditLog.class));
    }

    @Test
    void testRestoreBackupInvalidSignature() throws IOException {
        BackupRequestDto requestBackup = new BackupRequestDto();
        requestBackup.setTables(List.of("test_collection"));
        when(mongoTemplate.findAll(Document.class, "test_collection")).thenReturn(List.of(new Document("a", "b")));
        when(encryptionService.hmacSha256(any())).thenReturn("correct_signature", "wrong_signature");

        byte[] zipBytes = backupService.createBackup(requestBackup);

        RestoreRequestDto requestRestore = new RestoreRequestDto();
        requestRestore.setCollections(List.of("test_collection"));

        assertThrows(SecurityException.class, () -> {
            backupService.restoreBackup(new ByteArrayInputStream(zipBytes), requestRestore);
        });

        verify(mongoTemplate, never()).dropCollection("test_collection");
    }
}
