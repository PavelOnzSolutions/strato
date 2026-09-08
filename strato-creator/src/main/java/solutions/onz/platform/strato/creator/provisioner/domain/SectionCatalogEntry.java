package solutions.onz.platform.strato.creator.provisioner.domain;

import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.AbstractVersioningEntity;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Builder
@Getter
@Accessors(chain = true)
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Backupable
@Document(collection = "section_catalog_entries")
@CompoundIndexes({
        @CompoundIndex(name = "flavor_sectionKey_version_idx",
                       def = "{'flavor': 1, 'sectionKey': 1, 'version': -1}")
})
public class SectionCatalogEntry extends AbstractVersioningEntity<String> {
    @Id
    private String id;

    @Indexed
    private Flavor flavor;

    /** Stable identifier used as the JSON key in provider output. Validated against [a-z][a-zA-Z0-9]*. */
    private String sectionKey;

    private String displayName;
    private String description;
    private String icon;

    /** true = code-seeded, immutable from UI; false = admin extension entry. */
    private boolean system;

    /** Default item shape — the catalog's opinion. Ordered. */
    private List<SectionItemField> itemFields;

    /** Optional perm key required to read this section's data in provider output. */
    private String requiredReadPermission;
    /** Optional perm key required to write items in this section. */
    private String requiredWritePermission;
}
