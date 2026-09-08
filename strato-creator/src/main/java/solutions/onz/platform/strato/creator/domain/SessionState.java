package solutions.onz.platform.strato.creator.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

// TODO: Candidate to be moved to Redis
@Setter
@Getter
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "session_state")
public class SessionState {
    @Id
    private String id;
    private String userId;
    @Indexed(unique = true)
    private String sessionId;
    private String lastAccessed;
}
