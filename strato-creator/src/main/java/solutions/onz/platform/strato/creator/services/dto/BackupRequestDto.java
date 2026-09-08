package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for backup request.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupRequestDto {
    private List<String> tables;
}
