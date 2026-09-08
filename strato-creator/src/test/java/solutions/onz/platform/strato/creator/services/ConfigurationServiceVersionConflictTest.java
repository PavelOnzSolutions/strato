package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationRepository;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationSchemaService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.provisioner.services.EffectiveSchemaMaterializer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationLockRepository;
import solutions.onz.platform.strato.creator.provisioner.api.exception.ConfigurationVersionConflictException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfigurationServiceVersionConflictTest {

    @Mock private ConfigurationRepository configurationRepository;
    @Mock private ConfigurationLockRepository configurationLockRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private ConfigurationSchemaService schemaService;
    @Mock private EncryptionService encryptionService;
    @Mock private EffectiveSchemaMaterializer materializer;
    @Mock private ConfigurationDataValidator validator;

    @InjectMocks
    private ConfigurationService service;

    @Test
    void save_throws_when_baseVersion_does_not_match_latest() {
        UUID docId = UUID.randomUUID();
        Configuration latest = Configuration.builder()
                .id("latest-id").name("c").build();
        latest.setDocumentId(docId);
        latest.setVersion(3);

        Configuration incoming = Configuration.builder().id("incoming-id").name("c").build();
        incoming.setDocumentId(docId);
        incoming.setBaseVersion(2);

        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of(latest));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.save(incoming))
                .isInstanceOf(ConfigurationVersionConflictException.class)
                .extracting("latestVersion").isEqualTo(3);
    }

    @Test
    void save_succeeds_when_baseVersion_matches_latest() {
        UUID docId = UUID.randomUUID();
        Configuration latest = Configuration.builder().id("latest-id").name("c").build();
        latest.setDocumentId(docId);
        latest.setVersion(3);

        Configuration incoming = Configuration.builder().id("incoming-id").name("c").build();
        incoming.setDocumentId(docId);
        incoming.setBaseVersion(3);

        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of(latest));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(java.util.Optional.empty());
        when(configurationRepository.save(incoming)).thenReturn(incoming);

        Configuration saved = service.save(incoming);
        org.assertj.core.api.Assertions.assertThat(saved).isSameAs(incoming);
    }

    @Test
    void save_rejects_missing_baseVersion_on_existing_document() {
        UUID docId = UUID.randomUUID();
        Configuration latest = Configuration.builder().id("latest-id").name("c").build();
        latest.setDocumentId(docId);
        latest.setVersion(3);

        Configuration incoming = Configuration.builder().id("incoming-id").name("c").build();
        incoming.setDocumentId(docId);
        // no baseVersion set

        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of(latest));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.save(incoming))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("baseVersion is required");
    }

    @Test
    void save_rejects_baseVersion_on_new_document() {
        UUID docId = UUID.randomUUID();
        Configuration incoming = Configuration.builder().id("incoming-id").name("c").build();
        incoming.setDocumentId(docId);
        incoming.setBaseVersion(1);

        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of());
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.save(incoming))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("baseVersion must be null");
    }

    @Test
    void save_with_null_documentId_skips_OCC_check() {
        Configuration incoming = Configuration.builder().id("new-id").name("c").build();
        // documentId intentionally null — create path
        incoming.setBaseVersion(null);

        when(configurationRepository.save(incoming)).thenReturn(incoming);

        Configuration saved = service.save(incoming);
        org.assertj.core.api.Assertions.assertThat(saved).isSameAs(incoming);
    }
}
