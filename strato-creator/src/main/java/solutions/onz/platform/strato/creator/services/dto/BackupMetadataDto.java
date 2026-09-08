package solutions.onz.platform.strato.creator.services.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for backup metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupMetadataDto {
    private String creator;
    private String timestamp;
    private String checksum;
    @JsonProperty("app-id")
    private String appId;
    private String version;
    private String signature;
    private List<String> collections;
}
