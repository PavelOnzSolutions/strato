package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.annotations.Observable;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Setter
@Getter
@Accessors(chain = true)
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Auditable
@Backupable
@Observable
@Document(collection = "translations")
public class Translation {
    @Id
    private String id;
    @Indexed(unique = true)
    private String label;
    @Indexed(unique = true)
    private String key;
    private Map<String, String> translations;
}
