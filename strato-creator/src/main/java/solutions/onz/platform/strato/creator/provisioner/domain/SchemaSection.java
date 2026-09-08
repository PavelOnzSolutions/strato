package solutions.onz.platform.strato.creator.provisioner.domain;

import solutions.onz.platform.strato.creator.annotations.Observable;
import lombok.*;
import lombok.experimental.Accessors;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Accessors(chain = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Observable
@EqualsAndHashCode
@ToString
public class SchemaSection {
    /** Reference to SectionCatalogEntry.documentId. */
    private UUID catalogEntryDocumentId;
    /** Dot-paths of catalog default fields hidden in this schema. */
    private Set<String> disabledFieldPaths;
    /** Dot-path → override default value. */
    private Map<String, Object> fieldDefaults;
    /** Schema-author-added fields. */
    private List<SectionItemField> customFields;
}
