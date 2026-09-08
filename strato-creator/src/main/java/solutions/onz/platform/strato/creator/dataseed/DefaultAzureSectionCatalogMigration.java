package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionItemField;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.SectionItemFieldType;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "default-azure-section-catalog", order = "017", author = "dataseed")
public class DefaultAzureSectionCatalogMigration {

    private final SectionCatalogEntryRepository repo;

    @Execution
    public void changeSet() {
        upsert(buildFunctions());
        upsert(buildEventGridTopics());
        upsert(buildApiManagement());
        upsert(buildCosmosDb());
        upsert(buildStorageAccounts());
    }

    private void upsert(SectionCatalogEntry desired) {
        repo.findFirstByFlavorAndSectionKeyOrderByVersionDesc(desired.getFlavor(), desired.getSectionKey())
                .filter(e -> e.getDeleted() == null || !e.getDeleted())
                .ifPresentOrElse(existing -> {
                    existing.setDisplayName(desired.getDisplayName());
                    existing.setDescription(desired.getDescription());
                    existing.setIcon(desired.getIcon());
                    existing.setItemFields(desired.getItemFields());
                    existing.setSystem(true);
                    repo.save(existing);
                }, () -> {
                    desired.setDocumentId(UUID.randomUUID());
                    desired.setVersion(1);
                    repo.save(desired);
                });
    }

    private SectionCatalogEntry buildFunctions() {
        return SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE)
                .sectionKey("functions")
                .displayName("Azure Functions")
                .description("Azure Functions deployments with pipeline, APIM, and Event Grid integration.")
                .icon("azure/Function-Apps.svg")
                .system(true)
                .itemFields(List.of(
                        scalarField("appHealthCheck", "App Health Check", SectionItemFieldType.OBJECT, null,
                                List.of(boolField("deployToMonitor", "Deploy to Monitor", false))),
                        scalarField("deployRepository", "Deploy Repository", SectionItemFieldType.ARRAY_OF_STRING, List.of(), null),
                        scalarField("pipelineConfig", "Pipeline Config", SectionItemFieldType.OBJECT, null,
                                List.of(stringField("nodeVersion", "Node Version", ""))),
                        scalarField("properties", "Properties", SectionItemFieldType.ARRAY_OF_OBJECT, List.of(),
                                List.of(stringField("name", "Name", ""), stringField("value", "Value", ""))),
                        scalarField("swagger", "Swagger", SectionItemFieldType.OBJECT, null,
                                List.of(boolField("deploySwaggerDoc", "Deploy Swagger Doc", false))),
                        scalarField("dataSeed", "Data Seed", SectionItemFieldType.OBJECT, null,
                                List.of(
                                        boolField("enabled", "Enabled", false),
                                        boolField("truncate", "Truncate", false),
                                        stringField("collectionName", "Collection Name", "")
                                )),
                        scalarField("databaseContainers", "Database Containers", SectionItemFieldType.ARRAY_OF_OBJECT, List.of(),
                                List.of(stringField("name", "Name", ""), stringField("partitionKey", "Partition Key", ""))),
                        scalarField("apiManagement", "API Management", SectionItemFieldType.OBJECT, null,
                                List.of(
                                        boolField("deployToAPIM", "Deploy to APIM", false),
                                        scalarField("apiDefinitions", "API Definitions", SectionItemFieldType.ARRAY_OF_OBJECT, List.of(),
                                                List.of(
                                                        boolField("deployToAPIM", "Deploy to APIM", false),
                                                        stringField("apiSufix", "API Sufix", ""),
                                                        scalarField("excludeOperations", "Exclude Operations", SectionItemFieldType.ARRAY_OF_STRING, List.of(), null),
                                                        stringField("policyName", "Policy Name", ""),
                                                        boolField("subscriptionRequired", "Subscription Required", false)
                                                ))
                                )),
                        scalarField("eventGrid", "Event Grid", SectionItemFieldType.ARRAY_OF_OBJECT, List.of(),
                                List.of(stringField("type", "Type", ""), stringField("topicName", "Topic Name", "")))
                ))
                .build();
    }

    private SectionCatalogEntry buildEventGridTopics() {
        return SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE)
                .sectionKey("eventGridTopics")
                .displayName("Event Grid Topics")
                .description("Azure Event Grid topic instances.")
                .icon("azure/Event-Grid-Topics.svg")
                .system(true)
                .itemFields(List.of(
                        stringField("topicName", "Topic Name", ""),
                        stringField("schemaVersion", "Schema Version", ""),
                        stringField("inputSchema", "Input Schema", "")))
                .build();
    }

    private SectionCatalogEntry buildApiManagement() {
        return SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE)
                .sectionKey("apiManagement")
                .displayName("API Management")
                .description("Azure API Management instance configuration.")
                .icon("azure/API-Management-Services.svg")
                .system(true)
                .itemFields(List.of(
                        stringField("apimInstanceName", "APIM Instance Name", ""),
                        stringField("subscriptionTier", "Subscription Tier", ""),
                        stringField("gatewayUrl", "Gateway URL", "")))
                .build();
    }

    private SectionCatalogEntry buildCosmosDb() {
        return SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE)
                .sectionKey("cosmosDb")
                .displayName("Cosmos DB")
                .description("Azure Cosmos DB account and database configuration.")
                .icon("azure/Azure-Cosmos-DB.svg")
                .system(true)
                .itemFields(List.of(
                        stringField("accountName", "Account Name", ""),
                        stringField("databaseName", "Database Name", ""),
                        stringField("consistencyLevel", "Consistency Level", ""),
                        scalarField("containers", "Containers", SectionItemFieldType.ARRAY_OF_OBJECT, List.of(),
                                List.of(
                                        stringField("name", "Name", ""),
                                        stringField("partitionKey", "Partition Key", ""),
                                        numberField("throughput", "Throughput", 400)))))
                .build();
    }

    private SectionCatalogEntry buildStorageAccounts() {
        return SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE)
                .sectionKey("storageAccounts")
                .displayName("Storage Accounts")
                .description("Azure Storage account configuration.")
                .icon("azure/Storage-Accounts.svg")
                .system(true)
                .itemFields(List.of(
                        stringField("accountName", "Account Name", ""),
                        stringField("sku", "SKU", ""),
                        stringField("kind", "Kind", ""),
                        scalarField("containers", "Containers", SectionItemFieldType.ARRAY_OF_STRING, List.of(), null),
                        scalarField("queues", "Queues", SectionItemFieldType.ARRAY_OF_STRING, List.of(), null)))
                .build();
    }

    private SectionItemField stringField(String name, String display, String def) {
        return SectionItemField.builder().name(name).displayName(display)
                .type(SectionItemFieldType.STRING).defaultValue(def).build();
    }
    private SectionItemField boolField(String name, String display, boolean def) {
        return SectionItemField.builder().name(name).displayName(display)
                .type(SectionItemFieldType.BOOLEAN).defaultValue(def).build();
    }
    private SectionItemField numberField(String name, String display, Number def) {
        return SectionItemField.builder().name(name).displayName(display)
                .type(SectionItemFieldType.NUMBER).defaultValue(def).build();
    }
    private SectionItemField scalarField(String name, String display, SectionItemFieldType type,
                                         Object def, List<SectionItemField> nested) {
        return SectionItemField.builder().name(name).displayName(display).type(type)
                .defaultValue(def).nestedFields(nested).build();
    }

    @RollbackExecution
    public void rollback() {
        for (String sectionKey : List.of("functions", "eventGridTopics", "apiManagement", "cosmosDb", "storageAccounts")) {
            repo.findFirstByFlavorAndSectionKeyOrderByVersionDesc(Flavor.AZURE, sectionKey).ifPresent(e -> {
                if (e.isSystem()) repo.deleteById(e.getId());
            });
        }
    }
}
