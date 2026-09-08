package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

/**
 * Updates the icons of the five system-seeded Azure catalog entries from lucide-react names
 * to the Azure SVG icon set (under {@code /assets/azure/}). Runs once after the original seed
 * (order "017") and the RBAC update (order "018"). Targets the entries by (flavor, sectionKey)
 * and only updates entries that still carry their original lucide name, so a manual override
 * by an admin won't be clobbered.
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "update-azure-section-catalog-icons", order = "019", author = "dataseed")
public class UpdateAzureSectionCatalogIconsMigration {

    private final SectionCatalogEntryRepository repo;

    private static final Map<String, IconUpdate> UPDATES = Map.of(
            "functions",        new IconUpdate("Zap",       "azure/Function-Apps.svg"),
            "eventGridTopics",  new IconUpdate("Radio",     "azure/Event-Grid-Topics.svg"),
            "apiManagement",    new IconUpdate("Globe",     "azure/API-Management-Services.svg"),
            "cosmosDb",         new IconUpdate("Database",  "azure/Azure-Cosmos-DB.svg"),
            "storageAccounts",  new IconUpdate("HardDrive", "azure/Storage-Accounts.svg")
    );

    @Execution
    public void changeSet() {
        UPDATES.forEach((sectionKey, upd) -> repo.findFirstByFlavorAndSectionKeyOrderByVersionDesc(Flavor.AZURE, sectionKey)
                .ifPresent(entry -> {
                    String current = entry.getIcon();
                    if (current == null || current.isBlank() || upd.from.equalsIgnoreCase(current)) {
                        entry.setIcon(upd.to);
                        repo.save(entry);
                        log.info("[ Dataseed ]: Updated Azure catalog icon for {}: {} -> {}",
                                sectionKey, current, upd.to);
                    } else {
                        log.info("[ Dataseed ]: Skipping {} icon update — current value '{}' is not a known default",
                                sectionKey, current);
                    }
                }));
    }

    @RollbackExecution
    public void rollback() {
        UPDATES.forEach((sectionKey, upd) -> repo.findFirstByFlavorAndSectionKeyOrderByVersionDesc(Flavor.AZURE, sectionKey)
                .ifPresent(entry -> {
                    if (upd.to.equals(entry.getIcon())) {
                        entry.setIcon(upd.from);
                        repo.save(entry);
                    }
                }));
    }

    private record IconUpdate(String from, String to) {}
}
