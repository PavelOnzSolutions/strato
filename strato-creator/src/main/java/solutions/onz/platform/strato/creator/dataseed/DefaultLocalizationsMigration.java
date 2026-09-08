package solutions.onz.platform.strato.creator.dataseed;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.Translation;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "default-localizations-migration", order = "001", author = "dataseed")
public class DefaultLocalizationsMigration {
    private final MongoTemplate mongoTemplate;

    private List<Translation> loadTranslationsFromResources() throws IOException {
        List<Translation> result = new ArrayList<>();
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:dataseed/locales_*.json");
        ObjectMapper mapper = new ObjectMapper();
        for (Resource resource : resources) {
            try (InputStream is = resource.getInputStream()) {
                Translation t = mapper.readValue(is, Translation.class);
                if (t != null) {
                    log.info("[ Dataseed ]: Loaded translation: {}", t.getKey());
                    result.add(t);
                }
            }
        }
        return result;
    }

    @Execution
    public void changeSet() throws IOException {
        List<Translation> translations = loadTranslationsFromResources();
        for (Translation translation : translations) {
            if (translation == null) continue;
            Query query = new Query(Criteria.where("key").is(translation.getKey()));
            Boolean exists = mongoTemplate.exists(query, Translation.class);
            if (exists == null || !exists) {
                mongoTemplate.save(translation);
            }
        }
    }

    @RollbackExecution
    public void rollback() throws IOException {
        List<Translation> translations = loadTranslationsFromResources();
        for (Translation translation : translations) {
            if (translation == null) continue;
            Query query = new Query(Criteria.where("key").is(translation.getKey()));
            mongoTemplate.remove(query, Translation.class);
        }
    }
}
