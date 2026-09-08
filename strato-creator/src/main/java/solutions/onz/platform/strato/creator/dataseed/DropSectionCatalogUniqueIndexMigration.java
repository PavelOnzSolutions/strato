package solutions.onz.platform.strato.creator.dataseed;

import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;

/**
 * Drops the legacy unique compound index {@code flavor_sectionKey_idx} on
 * {@code section_catalog_entries}. The unique constraint is incompatible with
 * {@code AbstractVersioningEntity} semantics, where every save inserts a new
 * version document sharing the same {@code (flavor, sectionKey)}. Uniqueness of
 * the logical key is enforced at the service layer instead. A non-unique replacement
 * index {@code flavor_sectionKey_version_idx} is auto-created by Spring from the
 * entity annotation.
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "drop-section-catalog-unique-index", order = "018b", author = "dataseed")
public class DropSectionCatalogUniqueIndexMigration {

    private static final String COLLECTION = "section_catalog_entries";
    private static final String INDEX_NAME = "flavor_sectionKey_idx";

    private final MongoTemplate mongoTemplate;

    @Execution
    public void changeSet() {
        boolean exists = mongoTemplate.indexOps(COLLECTION).getIndexInfo().stream()
                .anyMatch(info -> INDEX_NAME.equals(info.getName()));
        if (exists) {
            mongoTemplate.indexOps(COLLECTION).dropIndex(INDEX_NAME);
            log.info("[ Dataseed ]: Dropped legacy unique index {} on {}", INDEX_NAME, COLLECTION);
        } else {
            log.info("[ Dataseed ]: Index {} not present on {}, nothing to drop", INDEX_NAME, COLLECTION);
        }
    }

    @RollbackExecution
    public void rollback() {
        // No rollback — recreating the unique index would fail if duplicate versions exist.
    }
}
