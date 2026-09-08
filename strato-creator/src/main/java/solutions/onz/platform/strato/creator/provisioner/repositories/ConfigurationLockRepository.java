package solutions.onz.platform.strato.creator.provisioner.repositories;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationLock;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConfigurationLockRepository extends MongoRepository<ConfigurationLock, String> {
    Optional<ConfigurationLock> findByDocumentId(UUID documentId);
    List<ConfigurationLock> findAllByDocumentIdIn(List<UUID> documentIds);
}
