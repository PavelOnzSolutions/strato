package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.DeploymentVersionMatrix;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeploymentVersionMatrixRepository extends MongoRepository<DeploymentVersionMatrix, String> {
    List<DeploymentVersionMatrix> findAllByEnvironmentId(String environmentId);

    void deleteAllByEnvironmentId(String environmentId);
}
