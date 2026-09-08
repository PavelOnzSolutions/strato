package solutions.onz.platform.strato.creator.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class DirectoryConfigTest {

    @Test
    void defaultsToDisabledWithNoCredential() {
        DirectoryConfig cfg = new DirectoryConfig();

        assertThat(cfg.isEnabled()).isFalse();
        assertThat(cfg.getCredentialResourceId()).isNull();
    }

    @Test
    void exposesEnabledAndCredentialResourceId() {
        DirectoryConfig cfg = new DirectoryConfig()
                .setId("default")
                .setEnabled(true)
                .setCredentialResourceId("cred-1")
                .setUpdatedAt(Instant.parse("2026-05-19T10:00:00Z"))
                .setUpdatedBy("admin");

        assertThat(cfg.getId()).isEqualTo("default");
        assertThat(cfg.isEnabled()).isTrue();
        assertThat(cfg.getCredentialResourceId()).isEqualTo("cred-1");
        assertThat(cfg.getUpdatedBy()).isEqualTo("admin");
    }
}
