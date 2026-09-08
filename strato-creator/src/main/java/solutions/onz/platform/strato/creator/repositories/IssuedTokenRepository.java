package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.IssuedToken;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface IssuedTokenRepository extends MongoRepository<IssuedToken, String> {
}
