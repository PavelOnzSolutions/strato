package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.DeploymentVersionMatrix;
import solutions.onz.platform.strato.creator.repositories.DeploymentVersionMatrixRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/version-matrix")
@RequiredArgsConstructor
@Tag(name = "Version Matrix", description = "Management of component versions deployed in environments")
public class DeploymentVersionMatrixController {

    private final DeploymentVersionMatrixRepository versionMatrixRepository;

    public record DeploymentMatrixUpdateRequest(
            String id,
            String environmentName,
            String componentName,
            String version,
            String commitId,
            String executor,
            String author
    ) { }

    //@DefineKernelFunction(name = "get_version_matrix", description = "Gets the version matrix for an environment", returnType = "solutions.onz.platform.strato.creator.domain.DeploymentVersionMatrix")
    @GetMapping("/{environmentId}")
    @Operation(summary = "Get version matrix for an environment")
    public List<DeploymentVersionMatrix> getByEnvironment(@PathVariable String environmentId) {
        return versionMatrixRepository.findAllByEnvironmentId(environmentId);
    }

    @GetMapping
    @Operation(summary = "Get all version matrix entries")
    public List<DeploymentVersionMatrix> getAll() {
        return versionMatrixRepository.findAll();
    }

    @PostMapping
    @Operation(summary = "Add or update version matrix entry")
    public ResponseEntity<DeploymentVersionMatrix> updateVersion(@RequestBody DeploymentVersionMatrix entry) {
        if (entry.getDeployedAt() == null) {
            entry.setDeployedAt(Instant.now());
        }

        return ResponseEntity.ok(versionMatrixRepository.save(entry));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete version matrix entry")
    public ResponseEntity<Void> deleteEntry(@PathVariable String id) {
        versionMatrixRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
