package solutions.onz.platform.strato.creator.workflow.repositories;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowInstance;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkflowInstanceRepository extends MongoRepository<WorkflowInstance, String> {
}
