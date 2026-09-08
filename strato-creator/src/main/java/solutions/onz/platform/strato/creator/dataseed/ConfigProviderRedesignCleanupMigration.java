package solutions.onz.platform.strato.creator.dataseed;

import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.List;

/**
 * Drops legacy Config Provider collections (free-form schema/data + locks) on first run,
 * to make way for the section/item redesign defined in
 * {@code docs/superpowers/specs/2026-05-13-config-provider-redesign-design.md} §8.
 * One-shot, pre-production cleanup. Rollback is intentionally a no-op.
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "config-provider-redesign-cleanup", order = "016", author = "dataseed")
public class ConfigProviderRedesignCleanupMigration {

    private final MongoTemplate mongoTemplate;

    @Execution
    public void changeSet() {
        for (String collectionName : List.of("configurations", "configuration_schemas", "configuration_locks")) {
            if (mongoTemplate.collectionExists(collectionName)) {
                mongoTemplate.dropCollection(collectionName);
                log.warn("[ Dataseed ]: Dropped legacy collection: {}", collectionName);
            }
        }
    }

    @RollbackExecution
    public void rollback() {
        log.warn("[ Dataseed Rollback ]: config-provider-redesign-cleanup rollback is a no-op; dropped collections cannot be restored");
    }
}
