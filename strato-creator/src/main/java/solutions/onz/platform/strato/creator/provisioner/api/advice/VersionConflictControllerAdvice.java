package solutions.onz.platform.strato.creator.provisioner.api.advice;

import solutions.onz.platform.strato.creator.provisioner.api.exception.ConfigurationVersionConflictException;
import solutions.onz.platform.strato.creator.provisioner.api.dto.VersionConflictResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(0)
public class VersionConflictControllerAdvice {

    @ExceptionHandler(ConfigurationVersionConflictException.class)
    public ResponseEntity<VersionConflictResponse> handleConfigConflict(ConfigurationVersionConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                new VersionConflictResponse("CONFIG_VERSION_CONFLICT", ex.getLatestVersion(), ex.getLatest()));
    }
}
