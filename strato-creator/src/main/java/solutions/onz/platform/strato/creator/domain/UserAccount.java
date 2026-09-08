package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.enums.UserSource;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.io.Serializable;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Setter
@Getter
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@Auditable
@Backupable
@Document(collection = "user_accounts")
public class UserAccount extends AbstractAuditingEntity<String> implements Serializable {

    @Id
    private String id;

    @Field("username")
    @Indexed(unique = true)
    private String username;

    @Field("display_name")
    private String displayName;

    @Field("email")
    @Indexed
    private String email;

    @Field("password_hash")
    private String passwordHash;

    // Persist as CSV for simplicity
    @Field("roles")
    private String rolesCsv;

    @Size(max = 256)
    @Field("image_url")
    private String imageUrl;

    @Field("enabled")
    private boolean enabled = true;

    @Field("source")
    private UserSource source;

    @Field("preferences")
    @DBRef
    private UserConfiguration preferences;

    public List<String> getRoles() {
        if (rolesCsv == null || rolesCsv.isBlank())
            return List.of();
        return Arrays.stream(rolesCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public UserAccount setRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            this.rolesCsv = "";
        } else {
            this.rolesCsv = String.join(",", roles);
        }

        return this;
    }

}
