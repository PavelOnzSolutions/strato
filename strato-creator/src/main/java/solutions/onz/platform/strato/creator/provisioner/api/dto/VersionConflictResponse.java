package solutions.onz.platform.strato.creator.provisioner.api.dto;

import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;

/**
 * Body of HTTP 409 returned when a save lost an optimistic-concurrency check.
 * <p>
 * {@code latest} carries either a {@link Configuration}
 * or a {@link ConfigurationSchema} depending on which
 * exception triggered the response (see {@code VersionConflictControllerAdvice}). Typed as
 * {@code Object} so a single record serves both code paths; clients distinguish via the
 * {@code code} field.
 */
public record VersionConflictResponse(String code, int latestVersion, Object latest) {}
