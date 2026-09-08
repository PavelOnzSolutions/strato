package solutions.onz.platform.strato.creator.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Setter
@Getter
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "issued_tokens")
public class IssuedToken {
    @Id
    private String id;

    @Field("user_id")
    private String userId;

    @Field("issued_at")
    @CreatedDate
    private Instant issuedAt;

    @Field("expires_at")
    private Instant expiresAt;

    @Field("description")
    private String description;

    @Field("jti")
    private String jti;

    @Field("revoked")
    private boolean revoked;
}
