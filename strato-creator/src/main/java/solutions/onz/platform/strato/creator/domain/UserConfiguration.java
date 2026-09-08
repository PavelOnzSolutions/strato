package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Backupable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Setter
@Getter
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@Backupable
@Document(collection = "user_configurations")
public class UserConfiguration {
    @Id
    private String id;
    @Indexed(unique = true)
    private String name;
    private String language; // key
    private String theme; // dark/light/auto
    private String color; // accent
    private String backgroundType;
    private String radiusType; // Element edge radius amount
    private String defaultFont;
    private String codeFont;
}
