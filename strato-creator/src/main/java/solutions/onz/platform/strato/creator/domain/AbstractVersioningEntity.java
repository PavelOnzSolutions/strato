package solutions.onz.platform.strato.creator.domain;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Field;
import solutions.onz.platform.strato.creator.annotations.Auditable;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * AbstractVersioningEntity provides a base class for entities that require
 * versioning and auditing
 * capabilities, including fields for tracking creation metadata, versioning,
 * and soft deletion.
 * <p>
 * NOTE: It is not recommended to combine this with
 * {@link Auditable} due to DB write
 * overhead
 *
 * @param <T> The type of the unique identifier for the entity.
 */
@Getter
@Accessors(chain = true)
@Setter
@EqualsAndHashCode
@ToString
@CompoundIndexes({
        @CompoundIndex(name = "document_version_idx", def = "{'documentId': 1, 'version': -1}", unique = false)
})
public abstract class AbstractVersioningEntity<T> implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    public abstract T getId();

    @CreatedBy
    @Field("created_by")
    private String createdBy;

    @CreatedDate
    @Field("created_date")
    private Instant createdDate = Instant.now();
    @Indexed
    private UUID documentId;
    @Indexed
    private Integer version;
    private Boolean deleted;

}
