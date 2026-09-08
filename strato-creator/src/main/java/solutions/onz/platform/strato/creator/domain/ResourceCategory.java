package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Getter
@Setter
@Accessors(chain = true)
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Auditable
@Backupable
@Document(collection = "resource_categories")
public class ResourceCategory {
    @Id
    private String id;
    @Indexed(unique = true)
    private String name;
    @Indexed(unique = true)
    private String key;
    private String color;
    private Boolean isSystem;
    private Map<String, Object> defaultProperties;
}
