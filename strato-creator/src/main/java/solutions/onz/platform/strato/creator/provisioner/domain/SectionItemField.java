package solutions.onz.platform.strato.creator.provisioner.domain;

import solutions.onz.platform.strato.creator.provisioner.domain.enums.SectionItemFieldType;
import lombok.*;
import lombok.experimental.Accessors;

import java.util.List;

@Getter
@Setter
@Accessors(chain = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class SectionItemField {
    private String name;
    private String displayName;
    private SectionItemFieldType type;
    private String description;
    private Object defaultValue;
    private boolean secret;
    /** For OBJECT and ARRAY_OF_OBJECT. Null/empty for scalars. */
    private List<SectionItemField> nestedFields;
}
