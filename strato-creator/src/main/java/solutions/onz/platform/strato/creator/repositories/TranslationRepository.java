package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.Translation;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TranslationRepository extends MongoRepository<Translation, String> {
    Translation findByKey(String key);
}
