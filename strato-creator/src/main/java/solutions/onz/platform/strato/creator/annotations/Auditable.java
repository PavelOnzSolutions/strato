package solutions.onz.platform.strato.creator.annotations;

import solutions.onz.platform.strato.creator.domain.AbstractVersioningEntity;

import java.lang.annotation.*;

/**
 * Marker annotation indicating that CRUD operations for the annotated Mongo entity
 * should be captured into AuditLog entries.
 * NOTE: It is not recommended to combine this with {@link AbstractVersioningEntity} due to DB write overhead
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {
}
