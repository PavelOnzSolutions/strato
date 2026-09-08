package solutions.onz.platform.strato.creator.utils.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.WebRequest;

public interface ExceptionTranslation {
    ResponseEntity<Object> handleAnyException(Throwable var1, WebRequest var2);
}
