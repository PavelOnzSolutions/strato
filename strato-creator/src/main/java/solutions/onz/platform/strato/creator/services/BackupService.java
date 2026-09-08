package solutions.onz.platform.strato.creator.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.services.dto.BackupMetadataDto;
import solutions.onz.platform.strato.creator.services.dto.BackupRequestDto;
import solutions.onz.platform.strato.creator.services.dto.RestoreRequestDto;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

// TODO: Prevent sensitive tables (Authority, UserAccounts) to be restored
@Service
@Slf4j
@RequiredArgsConstructor
public class BackupService {

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mappingContext;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final EncryptionService encryptionService;

    private static final String METADATA_FILENAME = "metadata.json";
    private static final String SIGNATURE_FILENAME = "signature.sig";
    private static final String APP_ID = "strato";
    private static final String BACKUP_VERSION = "1.0";
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ISO_INSTANT.withZone(ZoneId.of("UTC"));

    /**
     * Lists all collections that are eligible for backup based on the @Backupable annotation.
     * @return A sorted list of collection names that can be backed up.
     */
    @PreAuthorize("hasAuthority(@permissions.BACKUP_READ)")
    public List<String> listBackupableCollections() {
        List<String> collections = new ArrayList<>();
        for (MongoPersistentEntity<?> entity : mappingContext.getPersistentEntities()) {
            if (entity.getType().isAnnotationPresent(Backupable.class)) {
                collections.add(entity.getCollection());
            }
        }
        Collections.sort(collections);
        return collections;
    }

    /**
     * Creates a backup archive containing the specified collections.
     * @param request The backup request containing the list of collections to include in the backup.
     * @return A byte array representing the backup archive.
     * @throws IOException If an I/O error occurs during the backup process.
     */
    @PreAuthorize("hasAuthority(@permissions.BACKUP_READ)")
    public byte[] createBackup(BackupRequestDto request) throws IOException {
        String username = currentUsername();
        logAudit(AuditLogEntityOperation.BACKUP, AuditLogSeverity.INFO, "Backup started", "Started", request.getTables(), null);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            List<String> collectionsToBackup = request.getTables();
            if (collectionsToBackup == null || collectionsToBackup.isEmpty()) {
                collectionsToBackup = listBackupableCollections();
            } else {
                collectionsToBackup = new ArrayList<>(collectionsToBackup);
            }
            Collections.sort(collectionsToBackup);

            Map<String, String> collectionData = new TreeMap<>();
            for (String collectionName : collectionsToBackup) {
                List<Document> documents = mongoTemplate.findAll(Document.class, collectionName);
                String json = objectMapper.writeValueAsString(documents);
                collectionData.put(collectionName, json);

                ZipEntry entry = new ZipEntry(collectionName + ".json");
                zos.putNextEntry(entry);
                zos.write(json.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }

            String timestamp = TIMESTAMP_FORMATTER.format(Instant.now());

            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("app-id", APP_ID);
            metadata.put("version", BACKUP_VERSION);
            metadata.put("timestamp", timestamp);
            metadata.put("creator", username);
            metadata.put("collections", collectionsToBackup);

            String metadataJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(metadata);

            ZipEntry metaEntry = new ZipEntry(METADATA_FILENAME);
            zos.putNextEntry(metaEntry);
            zos.write(metadataJson.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // Signature calculation
            // signature over: collection names, document contents, metadata (timestamp, version, app-id)
            ByteArrayOutputStream signaturePayload = new ByteArrayOutputStream();
            for (Map.Entry<String, String> entry : collectionData.entrySet()) {
                signaturePayload.write(entry.getKey().getBytes(StandardCharsets.UTF_8));
                signaturePayload.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
            }
            signaturePayload.write(APP_ID.getBytes(StandardCharsets.UTF_8));
            signaturePayload.write(BACKUP_VERSION.getBytes(StandardCharsets.UTF_8));
            signaturePayload.write(timestamp.getBytes(StandardCharsets.UTF_8));

            String signature = encryptionService.hmacSha256(signaturePayload.toByteArray());

            ZipEntry sigEntry = new ZipEntry(SIGNATURE_FILENAME);
            zos.putNextEntry(sigEntry);
            zos.write(signature.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            zos.finish();
            byte[] zipBytes = baos.toByteArray();
            logAudit(AuditLogEntityOperation.BACKUP, AuditLogSeverity.SUCCESS, "Backup completed", "Finished", collectionsToBackup, null);
            return zipBytes;
        } catch (Exception e) {
            logAudit(AuditLogEntityOperation.BACKUP, AuditLogSeverity.ERROR, "Backup failed: " + e.getMessage(), "Error", request.getTables(), null);
            throw e;
        }
    }

    /**
     * Analyzes the specified backup archive and returns metadata about the backup.
     * @param zipInputStream The input stream containing the backup archive.
     * @return A BackupMetadataDto object containing metadata about the backup.
     * @throws IOException If an I/O error occurs during the analysis process.
     */
    @PreAuthorize("hasAuthority(@permissions.BACKUP_READ)")
    public BackupMetadataDto analyzeBackup(InputStream zipInputStream) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(zipInputStream)) {
            ZipEntry entry;
            BackupMetadataDto metadata = null;
            String signature = null;
            while ((entry = zis.getNextEntry()) != null) {
                if (METADATA_FILENAME.equals(entry.getName())) {
                    byte[] data = zis.readAllBytes();
                    metadata = objectMapper.readValue(data, BackupMetadataDto.class);
                } else if (SIGNATURE_FILENAME.equals(entry.getName())) {
                    signature = new String(zis.readAllBytes(), StandardCharsets.UTF_8);
                }
                zis.closeEntry();
            }
            if (metadata == null) {
                throw new IOException("Metadata file not found in backup ZIP");
            }
            metadata.setSignature(signature);
            return metadata;
        }
    }

    /**
     * Restores the specified backup archive into the database.
     * @param zipInputStream The input stream containing the backup archive.
     * @param request The restore request containing the list of collections to restore.
     * @throws IOException If an I/O error occurs during the restore process.
     */
    @PreAuthorize("hasAuthority(@permissions.BACKUP_WRITE)")
    public void restoreBackup(InputStream zipInputStream, RestoreRequestDto request) throws IOException {
        logAudit(AuditLogEntityOperation.RESTORE, AuditLogSeverity.INFO, "Restore started", "Started", request.getCollections(), null);
        try (ZipInputStream zis = new ZipInputStream(zipInputStream)) {
            ZipEntry entry;
            Map<String, byte[]> contents = new TreeMap<>();
            String signature = null;
            BackupMetadataDto metadata = null;

            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    byte[] data = zis.readAllBytes();
                    if (METADATA_FILENAME.equals(entry.getName())) {
                        metadata = objectMapper.readValue(data, BackupMetadataDto.class);
                    } else if (SIGNATURE_FILENAME.equals(entry.getName())) {
                        signature = new String(data, StandardCharsets.UTF_8);
                    } else {
                        contents.put(entry.getName(), data);
                    }
                }
                zis.closeEntry();
            }

            if (metadata == null || signature == null) {
                throw new SecurityException("Backup signature or metadata missing");
            }

            // Verify signature
            ByteArrayOutputStream signaturePayload = new ByteArrayOutputStream();
            for (Map.Entry<String, byte[]> contentEntry : contents.entrySet()) {
                String fileName = contentEntry.getKey();
                if (fileName.endsWith(".json")) {
                    String collectionName = fileName.substring(0, fileName.length() - 5);
                    signaturePayload.write(collectionName.getBytes(StandardCharsets.UTF_8));
                    signaturePayload.write(contentEntry.getValue());
                }
            }
            signaturePayload.write(metadata.getAppId().getBytes(StandardCharsets.UTF_8));
            signaturePayload.write(metadata.getVersion().getBytes(StandardCharsets.UTF_8));
            signaturePayload.write(metadata.getTimestamp().getBytes(StandardCharsets.UTF_8));

            String calculatedSignature = encryptionService.hmacSha256(signaturePayload.toByteArray());
            if (!calculatedSignature.equals(signature)) {
                logAudit(AuditLogEntityOperation.RESTORE, AuditLogSeverity.ERROR, "Restore failed: Invalid signature", "Error", request.getCollections(), null);
                throw new SecurityException("Backup signature verification failed");
            }

            List<String> collectionsToRestore = request.getCollections();
            for (String collectionName : collectionsToRestore) {
                String fileName = collectionName + ".json";
                if (contents.containsKey(fileName)) {
                    byte[] data = contents.get(fileName);
                    List<Document> documents = objectMapper.readValue(data, objectMapper.getTypeFactory().constructCollectionType(List.class, Document.class));
                    
                    mongoTemplate.dropCollection(collectionName);
                    for (Document doc : documents) {
                        mongoTemplate.save(doc, collectionName);
                    }
                } else {
                    log.warn("Collection {} not found in backup zip", collectionName);
                }
            }
            logAudit(AuditLogEntityOperation.RESTORE, AuditLogSeverity.INFO, "Restore completed", "Finished", collectionsToRestore, null);
        } catch (Exception e) {
            logAudit(AuditLogEntityOperation.RESTORE, AuditLogSeverity.ERROR, "Restore failed: " + e.getMessage(), "Error", request.getCollections(), null);
            throw e;
        }
    }


    /**
     * Retrieves the audit log entries related to backup operations.
     * @return A list of AuditLog objects representing backup history.
     */
    @PreAuthorize("hasAuthority(@permissions.BACKUP_READ)")
    public List<AuditLog> getBackupHistory() {
        return auditLogRepository.findAllByTypeInOrderByTimestampDesc(List.of(AuditLogType.BACKUP));
    }


    private void logAudit(AuditLogEntityOperation operation, AuditLogSeverity severity, String message, String collectionName, Object data, Object originalData) {
        AuditLog log = new AuditLog();
        log.setType(AuditLogType.BACKUP);
        log.setSeverity(severity);
        log.setOperation(operation);
        log.setCollectionName(collectionName);
        log.setEntityId("BACKUP_SERVICE");
        log.setEntityClass(BackupService.class.getName());
        log.setData(message + (data != null ? ": " + data : ""));
        log.setOriginalData(originalData);
        log.setTimestamp(Instant.now());
        log.setUserLogin(currentUsername());
        auditLogRepository.save(log);
    }

    private String currentUsername() {
        return SecurityUtils.getCurrentUserLogin();
    }

    private void deleteDirectory(File directory) {
        File[] allContents = directory.listFiles();
        if (allContents != null) {
            for (File file : allContents) {
                deleteDirectory(file);
            }
        }
        directory.delete();
    }
}
