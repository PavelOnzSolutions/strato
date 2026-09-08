package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialDirectoryRole {
    private String id;
    /** Resolved via Graph; null if lookup failed or not yet attempted. */
    private String displayName;
}
