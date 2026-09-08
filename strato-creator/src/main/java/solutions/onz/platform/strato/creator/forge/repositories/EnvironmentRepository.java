package solutions.onz.platform.strato.creator.forge.repositories;

import solutions.onz.platform.strato.creator.forge.domain.Environment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnvironmentRepository extends MongoRepository<Environment, String> {
    List<Environment> findAllByDocumentId(UUID documentId);

    List<Environment> findByName(String name);

    Optional<Environment> findTopByDocumentIdOrderByVersionDesc(UUID documentId);
    Optional<Environment> findTopByNameOrderByVersionDesc(String name);

    boolean existsByName(String name);
}
