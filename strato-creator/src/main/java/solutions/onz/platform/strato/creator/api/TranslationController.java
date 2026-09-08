package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.Translation;
import solutions.onz.platform.strato.creator.services.TranslationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/locales", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Localization", description = "Localization and Translation Management API")
public class TranslationController {
    private final TranslationService service;

    public record LanguageMetadata(String id, String key, String label, Integer items) {
    }

    public record LanguageItem(String key, String value) {
    }

    @GetMapping
    @Operation(summary = "List Translations", description = "Returns List of all translations without")
    public ResponseEntity<List<LanguageMetadata>> list() {
        List<LanguageMetadata> body = service.findAll().stream()
                .map(t -> new LanguageMetadata(t.getId(), t.getKey(), t.getLabel(),
                        t.getTranslations() != null ? t.getTranslations().size() : 0))
                .toList();
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{key}/translation")
    @Operation(summary = "Returns a translation table by language key", description = "Returns a translation table by language key")
    public ResponseEntity<Map<String, String>> getTranslations(@PathVariable String key) {
        Translation t = service.findByKey(key);
        Map<String, String> body = t != null && t.getTranslations() != null ? t.getTranslations() : Map.of();
        return ResponseEntity.ok(body);
    }

    @GetMapping("/id/{id}")
    @Operation(summary = "Find Translation by ID", description = "Find Translation by ID")
    public ResponseEntity<Translation> getTranslation(@PathVariable String id) {
        Optional<Translation> t = service.findById(id);
        return ResponseEntity.ok(t.orElse(null));
    }

    @PutMapping("/{key}")
    @Operation(summary = "Inserts a new translation item", description = "Inserts a new translation key-value pair into the specified language translation table")
    public ResponseEntity<Void> addTranslationItem(@PathVariable String key, @RequestBody LanguageItem item) {
        Translation t = service.findByKey(key);
        if (t != null) {
            if (t.getTranslations() == null)
                t.setTranslations(new HashMap<>());
            t.getTranslations().put(item.key(), item.value());
            service.save(t);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create Translation", description = "Creates a new Translation object", requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Translation.class))))
    public ResponseEntity<Translation> create(@RequestBody Translation body) {
        if (body.getId() != null && !body.getId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New translation must not have an id");
        }

        if (body.getKey() == null || body.getKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Translation key is required");
        }

        Translation existing = service.findByKey(body.getKey());

        if (existing != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Translation with the same key already exists");
        }
        if (body.getTranslations() == null)
            body.setTranslations(new HashMap<>());
        Translation saved = service.save(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Patch Translation", description = "Partially updates an existing Translation by id", requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Translation.class))))
    public ResponseEntity<Translation> patch(@PathVariable("id") String id, @RequestBody Translation body) {
        Translation existing = service.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Translation not found"));

        if (body.getLabel() != null)
            existing.setLabel(body.getLabel());
        if (body.getKey() != null && !body.getKey().isBlank()) {
            Translation withKey = service.findByKey(body.getKey());
            if (withKey != null && !withKey.getId().equals(existing.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Another translation with the same key already exists");
            }
            existing.setKey(body.getKey());
        }
        if (body.getTranslations() != null) {
            // Replace the translations map to support deletions (omitted keys should be
            // removed)
            existing.setTranslations(new HashMap<>(body.getTranslations()));
        }
        Translation saved = service.save(existing);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("")
    @Operation(summary = "Delete Translations", description = "Deletes multiple translations by ids")
    public ResponseEntity<Void> deleteMulti(@RequestParam("id") final List<String> id) {
        service.deleteByIds(id);
        return ResponseEntity.noContent().build();
    }
}
