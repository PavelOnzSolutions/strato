package solutions.onz.platform.strato.creator.provisioner.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.io.Serial;

@ResponseStatus(HttpStatus.CONFLICT)
public class ConfigurationLockedException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ConfigurationLockedException(String documentId) {
        super("Configuration document '" + documentId + "' is locked");
    }
}
