package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.SessionState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionStateRepository extends MongoRepository<SessionState, String> {
}
