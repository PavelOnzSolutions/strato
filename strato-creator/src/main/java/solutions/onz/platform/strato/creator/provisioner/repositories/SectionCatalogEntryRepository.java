package solutions.onz.platform.strato.creator.provisioner.repositories;

import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SectionCatalogEntryRepository extends MongoRepository<SectionCatalogEntry, String> {
    List<SectionCatalogEntry> findAllByFlavor(Flavor flavor);
    Optional<SectionCatalogEntry> findFirstByFlavorAndSectionKeyOrderByVersionDesc(Flavor flavor, String sectionKey);
    Optional<SectionCatalogEntry> findTopByDocumentIdOrderByVersionDesc(UUID documentId);
    List<SectionCatalogEntry> findAllByDocumentId(UUID documentId);
}
