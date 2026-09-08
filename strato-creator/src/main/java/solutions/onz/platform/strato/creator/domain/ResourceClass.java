package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.annotations.Observable;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Map;
import java.util.HashMap;

@Setter
@Getter
@Accessors(chain = true)
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Auditable
@Backupable
@Observable
@Document(collection = "resources")
public class ResourceClass {
    @Id
    private String id;

    @Indexed(unique = true)
    private String name;
    private String abbreviation;
    private String icon;
    private String help;
    private Boolean isSystem;

    private ResourceType type;

    // Relation: each Resource has one ResourceType selected (via foreign key)
    @Field("resource_category")
    @DBRef()
    private ResourceCategory resourceCategory;

    private ResourceNamingRule namingRule;

    private CatalogDefinition catalogDefinition;

    private Map<String, Object> template;
    private Map<String, Object> defaults;
    private Map<String, String> outputs;

    private Map<String, String> inputMappings;
    private Map<String, String> outputMappings;

    // Convenience accessors for PROCESS resources to map template.workflowDefinition
    public String getWorkflowDefinitionId() {
        if (template == null) return null;
        Object v = template.get("workflowDefinition");
        return v != null ? String.valueOf(v) : null;
    }

    public ResourceClass setWorkflowDefinitionId(String workflowDefinitionId) {
        if (this.template == null) this.template = new HashMap<>();
        this.template.put("workflowDefinition", workflowDefinitionId);
        return this;
    }

}
