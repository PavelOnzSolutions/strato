package solutions.onz.platform.strato.creator.annotations;

import java.lang.annotation.*;

/**
 * Annotation to mark a class as eligible for backup.
 * Can be applied to domain classes (annotated with @Document).
 */
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Backupable {
}
