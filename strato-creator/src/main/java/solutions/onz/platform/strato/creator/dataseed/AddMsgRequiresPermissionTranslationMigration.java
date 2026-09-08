package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.Translation;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "add-msg-requires-permission-translation", order = "021", author = "dataseed")
public class AddMsgRequiresPermissionTranslationMigration {

    private static final String KEY = "msg_requires_permission";

    private final MongoTemplate mongoTemplate;

    @Execution
    public void changeSet() {
        Map<String, String> texts = Map.of(
                "en-US", "Requires permission: {{permission}}",
                "cs-CZ", "Vyžaduje oprávnění: {{permission}}"
        );
        for (Map.Entry<String, String> e : texts.entrySet()) {
            Query q = new Query(Criteria.where("key").is(e.getKey()));
            Update u = new Update().set("translations." + KEY, e.getValue());
            mongoTemplate.upsert(q, u, Translation.class);
            log.info("[ Dataseed ]: Patched translation {} for {}", KEY, e.getKey());
        }
    }

    @RollbackExecution
    public void rollback() {
        for (String lang : new String[]{"en-US", "cs-CZ"}) {
            Query q = new Query(Criteria.where("key").is(lang));
            Update u = new Update().unset("translations." + KEY);
            mongoTemplate.updateFirst(q, u, Translation.class);
        }
    }
}
