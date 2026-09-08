package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.IssuedToken;
import solutions.onz.platform.strato.creator.repositories.IssuedTokenRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class TokenAuditService {
    private final IssuedTokenRepository repo;

    public TokenAuditService(IssuedTokenRepository repo) { this.repo = repo; }

    public IssuedToken record(String userId, Instant issuedAt, Instant expiresAt, String description, String jti) {
        IssuedToken t = new IssuedToken().setId(UUID.randomUUID().toString())
                .setUserId(userId)
                .setIssuedAt(issuedAt)
                .setExpiresAt(expiresAt)
                .setDescription(description)
                .setJti(jti);
        return repo.save(t);
    }
}
