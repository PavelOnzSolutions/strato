package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.services.BackupService;
import solutions.onz.platform.strato.creator.services.dto.BackupMetadataDto;
import solutions.onz.platform.strato.creator.services.dto.BackupRequestDto;
import solutions.onz.platform.strato.creator.services.dto.RestoreRequestDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@Tag(name = "Backup & Restore", description = "Backup and Restore Data operations")
public class BackupController {

    private final BackupService backupService;

    @GetMapping("/collections")
    @PreAuthorize("hasAuthority('PERM_BACKUP_READ')")
    public List<String> listCollections() {
        return backupService.listBackupableCollections();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_BACKUP_READ')")
    public ResponseEntity<byte[]> backup(@RequestBody BackupRequestDto request) throws IOException {
        byte[] zipBytes = backupService.createBackup(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"strato-backup.zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zipBytes);
    }

    @GetMapping("/history")
    @PreAuthorize("hasAuthority('PERM_BACKUP_READ')")
    public List<AuditLog> backupHistory() {
        return backupService.getBackupHistory();
    }

    @PostMapping("/restore/analyze")
    @PreAuthorize("hasAuthority('PERM_BACKUP_WRITE')")
    public BackupMetadataDto analyze(@RequestParam("file") MultipartFile file) throws IOException {
        return backupService.analyzeBackup(file.getInputStream());
    }

    @PutMapping("/restore")
    @PreAuthorize("hasAuthority('PERM_BACKUP_WRITE')")
    public ResponseEntity<Void> restore(@RequestParam("file") MultipartFile file, @RequestPart("request") RestoreRequestDto request) throws IOException {
        backupService.restoreBackup(file.getInputStream(), request);
        return ResponseEntity.noContent().build();
    }
}
