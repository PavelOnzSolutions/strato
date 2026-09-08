package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.Translation;
import solutions.onz.platform.strato.creator.repositories.TranslationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TranslationService {
    private final TranslationRepository translationRepository;

    @Cacheable(value = "translations")
    public List<Translation> findAll() {
        log.debug("Fetching all translations from database");
        return translationRepository.findAll();
    }

    @Cacheable(value = "translations", key = "#key")
    public Translation findByKey(String key) {
        log.debug("Fetching translation for key: {} from database", key);
        return translationRepository.findByKey(key);
    }

    @Cacheable(value = "translations", key = "#id")
    public Optional<Translation> findById(String id) {
        log.debug("Fetching translation by id: {} from database", id);
        return translationRepository.findById(id);
    }

    @CacheEvict(value = "translations", allEntries = true)
    public Translation save(Translation translation) {
        log.debug("Saving translation and evicting cache");
        return translationRepository.save(translation);
    }

    @CacheEvict(value = "translations", allEntries = true)
    public void deleteByIds(List<String> ids) {
        log.debug("Deleting translations by ids: {} and evicting cache", ids);
        translationRepository.deleteAllById(ids);
    }
}
