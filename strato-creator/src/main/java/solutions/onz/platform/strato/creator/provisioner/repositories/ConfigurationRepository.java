package solutions.onz.platform.strato.creator.provisioner.repositories;

import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConfigurationRepository extends MongoRepository<Configuration, String> {
    List<Configuration> findAllByDocumentId(UUID documentId);

    List<Configuration> findByName(String name);

    List<Configuration> findAllByNameContainingIgnoreCase(String name);

    @Query(value = "{}", fields = "{ 'data': 0 }")
    List<Configuration> findAllExcludingData();

    void deleteAllByDocumentId(UUID documentId);
}
