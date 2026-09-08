package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialErrorInfo {
    /** AADSTS error code where available, e.g., "AADSTS50126". */
    private String code;
    private String message;
    private String correlationId;
    /**
     * Timestamp as reported by Entra in the error response. Kept as a free-form String because
     * the upstream format is not guaranteed to be parseable as an Instant.
     */
    private String timestamp;
    /** Fully-qualified class name of the caught exception. */
    private String exceptionClass;
}
