package solutions.onz.platform.strato.creator.annotations;

import java.lang.annotation.*;

/**
 * Marker annotation indicating that changes of the annotated DTO/entity
 * should be propagated to frontend clients via WebSocket notifications.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Observable {
}
