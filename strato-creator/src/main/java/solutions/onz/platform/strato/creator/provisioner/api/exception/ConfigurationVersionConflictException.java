package solutions.onz.platform.strato.creator.provisioner.api.exception;

import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import lombok.Getter;

import java.io.Serial;

@Getter
public class ConfigurationVersionConflictException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final int latestVersion;
    private final Configuration latest;

    public ConfigurationVersionConflictException(int latestVersion, Configuration latest) {
        super("Configuration version conflict: latest=" + latestVersion);
        this.latestVersion = latestVersion;
        this.latest = latest;
    }
}
