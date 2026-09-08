package solutions.onz.platform.strato.creator.workflow.repositories;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkflowDefinitionRepository extends MongoRepository<WorkflowDefinition, String> {
}
