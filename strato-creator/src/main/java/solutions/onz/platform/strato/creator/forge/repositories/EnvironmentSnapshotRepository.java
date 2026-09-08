package solutions.onz.platform.strato.creator.forge.repositories;

import solutions.onz.platform.strato.creator.forge.domain.EnvironmentSnapshot;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EnvironmentSnapshotRepository extends MongoRepository<EnvironmentSnapshot, String> {
    EnvironmentSnapshot findByEnvironmentDocumentId(String environmentDocumentId);
}
