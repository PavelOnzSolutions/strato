package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.io.Serial;
import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

/** An Authority. */
@NoArgsConstructor
@AllArgsConstructor
@Setter
@Getter
@Accessors(chain = true)
@Builder
@ToString
@EqualsAndHashCode
@Auditable
@Document(collection = "strato_authority")
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Authority implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull @Size(max = 50)
    @Id
    private String name;

    @Field("is_system")
    private boolean isSystem;

    @Field("permissions")
    private Set<String> permissions = new HashSet<>();

    public Authority addPermission(String permission) {
        permissions.add(permission);
        return this;
    }

    public Authority removePermission(String permission) {
        permissions.remove(permission);
        return this;
    }
}
