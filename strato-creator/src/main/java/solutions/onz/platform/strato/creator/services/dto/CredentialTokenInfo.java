package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialTokenInfo {
    private String audience;
    private String issuer;
    private Instant issuedAt;
    private Instant notBefore;
    private Instant expiresAt;
    /** Maps to the `amr` claim (Authentication Method References). */
    private List<String> authenticationMethods;
}
