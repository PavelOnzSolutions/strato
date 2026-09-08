# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `ConfigurationProviderController`: `GET /api/configuration-provider/config/{configName}` endpoint that returns the merged configuration using the env bound to the configuration (if any), or no env context otherwise. Delegates to the existing `ConfigurationProviderService.getConfigForPipeline(String)` overload.

### Fixed
- Configuration Provider preview returned "No static resource api/configuration-provider/config/{name}/env." because the controller only mapped `/config/{configName}/env/{envName}` and Spring fell through to static-resource handling when no `envName` was supplied. The new single-arg endpoint above resolves the route mismatch.

## [0.9.9-BETA] - 2026-02-25

### Added
- RBAC Permission Hierarchy: implemented `Permissions.expandAll()` and `getImpliedPermissions()` for hierarchical permission resolution; higher-level permissions now automatically imply lower-level ones (139b4ad).
- `RbacUpdate_5_PermissionHierarchyMigration`: backfills implied permissions on all existing Authority documents (139b4ad).
- `AsyncConfiguration`: security-context-aware async task executor using `DelegatingSecurityContextAsyncTaskExecutor` (139b4ad).
- `MobileOAuth2Filter`: captures `mobile=true` query parameter on OAuth2 authorization requests for mobile app deep-link redirects (4a7285d).
- Environment Import: automatic detection of cross-resource references during ARM import via recursive property scanning; new `DetectedReference` DTO in `EnvironmentImportDtos` (9ae17d2).
- `ResourceClass.help` field for resource class documentation (9ae17d2).

### Changed
- `SecurityConfiguration` and `DatabaseReactiveUserDetailsService`: permission expansion now uses `Permissions.expandAll()` during JWT/role resolution (139b4ad).
- `OAuth2AuthenticationSuccessHandler`: mobile OAuth2 logins redirect to `arborist://auth/callback` deep link instead of web frontend (4a7285d).
- Added `@PreAuthorize` annotations to Semantic Kernel plugins: `AzureResourceManagerService`, `AzureArchitecturePlugin`, `SystemMonitoringPlugin`, `MsGraphService` (4a7285d).
- LLM Service: injects user identity and permissions context into chat history; surfaces `AccessDeniedException` as user-friendly messages (4a7285d).
- `UserManagementService`: fixed user existence check to use `Optional`, inline default configuration for new users (9ae17d2).
- Renamed LLM system prompt persona to "Mr. Arborist Man" (4a7285d).

## [0.9.8-BETA] - 2026-02-23

### Added
- Automatic detection of cross-resource references during environment import from ARM. Resource properties are scanned for Azure resource IDs pointing to other discovered resources, and detected dependencies are returned as `detectedReferences` in the import result.
- New `DetectedReference` DTO in `EnvironmentImportDtos` carrying provider/consumer resource IDs, names, and the property path where the reference was found.

## [0.9.7-BETA] - 2026-02-16

### Added
- Added REST endpoint `GET /api/environments/latest/byName/{name}` to retrieve the latest environment version by its name.
- Implemented support for `{{name}}` and `{{environment}}` variable placeholders in `ConfigurationProviderService` during JSONPath queries.
- Introduced security checks with `@PreAuthorize` across `ConfigurationProviderService` methods.
- Added support for retrieving configuration without an environment context in `ConfigurationProviderService`.

### Changed
- Enhanced `EnvironmentsService.create` with a name uniqueness check to prevent duplicate environment names.
- Refactored `ConfigurationProviderService.getConfigForPipeline` to support optional environment name, defaulting to the environment associated with the configuration.
- Simplified `ConfigurationProviderController.getQueryResult` REST endpoint by removing the mandatory environment name from the path.

### Fixed
- Improved placeholder replacement logic in `ConfigurationProviderService` to support whitespace within placeholders (e.g., `{{ name }}`).
- Config schema should be immutable for existing Configurations.

## [0.9.6-BETA] - 2026-02-13

### Changed
- Updated `EnvironmentRepository.findByName` to return `List<Environment>` for proper multi-version handling.
- Improved Javadoc documentation in `ConfigurationProviderService`.

### Fixed
- Fixed `ConfigurationProviderService` query failure when a deleted environment with matching name exists by updating `EnvironmentsService.findByName` to filter deleted records and return the latest version.

## [0.9.5-BETA] - 2026-02-13

### Added
- Added `SYNCHRONIZED` user source type to track users that were originally local but later synchronized via SSO.
- Extended `UserConfigurationService` with methods to retrieve and update user-specific configuration.
- Added REST endpoints in `UserAccountController` for managing user configuration (GET/PUT `/api/user-accounts/{username}/configuration`).

### Changed
- Enhanced `AzureOidcUserService` with automatic user account creation during OAuth2 login, including default configuration assignment.
- Enhanced `AzureOidcUserService` to convert `LOCAL` users to `SYNCHRONIZED` when logging in via SSO, merging roles.
- Updated `SecurityConfiguration` to allow authenticated access to user configuration endpoints.

### Fixed
- Fixed health check endpoint security to allow access to liveness and readiness probe sub-paths (`/api/management/health/**`).

## [0.9.4-BETA] - 2026-02-12

### Added
- Implemented API token management in `ApiTokensController` with support for creation, revocation, and deletion.
- Added `CANCELED` status to `WorkflowStatus`.
- Introduced `AdminOriginMigration` to explicitly set `LOCAL` source for admin account.

### Changed
- Enhanced `UserManagementService` with improved user creation, including default configuration assignment.
- Updated `WorkflowEngine` to broadcast status updates via WebSocket and improved step execution logic.
- Refactored `WorkflowInstance` and `WorkflowStatus` to support more granular state tracking.

## [0.9.3-BETA] - 2026-02-12

### Added
- Implemented hard delete functionality for `Configuration` and `ConfigurationSchema`.
- Introduced `RbacUpdate_4_Migration` for advanced RBAC permissions.
- Added initial support for `KUBERNETES` resource type.

### Changed
- Enhanced `ConfigurationController` and `ConfigurationSchemaController` with explicit delete endpoints.
- Improved RBAC integration across configuration and environment services.

## [0.9.2-BETA] - 2026-02-10

### Added
- Expanded system monitoring with advanced metrics in `OperationalMetricsEndpoint`.
- Introduced `UserConfigurationService` for managing user-specific application settings.
- Added `SessionState` persistence for tracking user sessions.
- Implemented `DefaultUserConfigMigration` for initial user settings.

### Changed
- Refactored `UserManagementService` with improved user lookup and role management.
- Enhanced `UserAccountController` with profile and configuration management endpoints.

### Fixed
- Resolved permission issues in user management workflows.

## [0.9.1-BETA] - 2026-02-09

### Added
- Implemented JSONPath support for configuration queries in `ConfigurationProviderService`.
- Added Swagger UI OAuth2 support with custom index transformer and configuration.
- Extended GraphQL schema and controllers for configuration data retrieval.
- Introduced new granular permissions for configuration and resource management.
- Added comprehensive integration tests for `AuditLogController`.

### Changed
- Enhanced `ResourceService` with optimized resource class lookups and improved error handling.
- Refactored `ResourceClassesController` to use standardized pagination and response formats.
- Improved `AuditLogService` with better query parameter handling.

### Fixed
- Resolved pagination serialization issues in REST controllers (AuditLog, ResourceClasses).
- Fixed environment linkage in configuration repositories.

## [0.9.0-BETA] - 2026-02-08

### Added
- Implemented a custom Workflow Engine for orchestrating sequential processes.
- Introduced `WorkflowDefinition` and `WorkflowInstance` domain models with MongoDB persistence.
- Added `ActionHandler` ecosystem supporting `REST_CALL` and `JAVA_DELEGATE` step types.
- Supported asynchronous step execution and variable propagation across workflow steps.
- Integrated `WorkflowEngine` into the system for complex task automation.

## [0.8.7-BETA] - 2026-02-06

### Added
- Implemented `ConfigurationProviderService` and `ConfigurationProviderController` for serving merged environment configurations to CD pipelines.
- Introduced `ConfigProviderOutput` domain object for pipeline-consumable configuration data.
- Added GraphQL support for `ConfigProviderOutput` in `ConfigurationGraphQLController`.
- Added environment linkage to `Configuration` entity.

## [0.8.6-BETA] - 2026-02-01

### Added
- Implemented `ConfigurationService` and `ConfigurationSchemaService` for managing system configurations with JSON schema validation.
- Added `ConfigurationController` and `ConfigurationSchemaController` REST endpoints.
- Introduced `GithubCredentialService` for validating GitHub Personal Access Tokens.
- Added support for full conversation history in `LlmService`.

### Changed
- Relocated log file path for Azure deployments in `logback-spring.xml` and `application-prod.yaml`.
- Enhanced `DashboardService` with improved LLM integration.

### Fixed
- Resolved various unit test failures across `EnvironmentsService`, `LlmService`, and `GithubCredentialService`.
- Fixed Bitbucket credential verification logic.

## [0.8.5-BETA] - 2026-01-30

### Added
- Implemented `BitbucketCredentialService` for validating Bitbucket credentials and Personal Access Tokens (PAT).
- Added `BITBUCKET_CREDENTIAL` to `ResourceType` and introduced `CredentialResourceType`.
- Added new `test-credential/bitbucket` endpoint in `ExternalIdentityController`.
- Introduced `get_resource_class_no_decrypt` Semantic Kernel function in `ResourceService`.
- Added comprehensive unit tests for Bitbucket credential validation.

### Changed
- Enhanced security with `@PreAuthorize` annotations across `ResourceClassesController` and `EnvironmentsService`.
- Added encryption/decryption support for Bitbucket credentials in `ResourceService`.
- Integrated `azure-resourcemanager-resources-bicep` dependency.
- Improved code documentation with Javadoc across several service classes.

## [0.8.3-BETA] - 2026-01-26

### Changed
- Enhanced `AuditLogService` with improved security enforcement and query optimization:
    - Restricted non-admin users to viewing only their own logs unless granted `PERM_AUDIT_READ`.
    - Optimized MongoDB query construction and added early return for empty result sets.

## [0.8.2-BETA] - 2026-01-25

### Added
- Implemented asynchronous deployment support with `DeploymentStatus` tracking.
- Added credential validation results for Azure identity services.
- Introduced unit tests for `VersioningMongoEventListener` and `AzureIdentityService`.

### Changed
- Improved ARM template deployment logic and resource management.
- Enabled cache eviction for `environment_latest` when versions are updated.
- Updated `application.yaml` with dedicated log filename configuration.
- Refactored `DeploymentsService` to support async operations and better status reporting.

### Fixed
- Corrected user identification in deployment logs.
- Fixed ARM template parameter handling and resource repository lookups.

## [0.8.1-BETA] - 2026-01-23

### Added
- Introduced `EnvironmentSnapshot` domain and repository for tracking environment states.
- Added `EnvironmentSnapshotService` to handle snapshot operations.

### Changed
- Enhanced `DeploymentVersionMatrix` with new tracking fields: `commitId`, `executor`, and `author`.
- Updated `application.yaml`:
    - Disabled Spring AI MCP server by default.
    - Enabled property resolution and syntax highlighting in Swagger UI.
- Minor refactoring and comment cleanup in `EnvironmentsService`.

## [0.8.0-BETA] - 2026-01-21

### Added
- Integrated LLM support using Microsoft Semantic Kernel and Spring AI.
- Added `LlmService` for processing prompts and generating architecture-related responses.
- Implemented `WebUIControllerPlugin` to enhance UI capabilities.
- Added Microsoft Graph integration for resource deployment and management.
- Introduced `MsGraphService` to handle Azure AD and MS Graph API requests.
- Added System Summary generation in `DashboardService`.
- Added support for importing environment credentials.
- Implemented basic Backup/Restore functionality for system data.
- Added Role-Based Access Control (RBAC) with API token support and role assignment.

### Changed
- Enhanced environment import functionality with support for unmatched classes and persistent node connections.
- Improved JWT role assignment from OAuth2.
- Updated Spring Boot to version 3.5.7.
- Migrated to Java 25.
- Updated various Azure and Spring AI dependencies.
- Refactored `DeploymentsService` to support multiple resource types including MS Graph.
- Enhanced `DashboardController` with new diagnostic and summary endpoints.

### Fixed
- Fixed application properties configuration.
- Resolved issues with JWT role mapping in security configuration.
- Fixed resource class service tests and improved overall test coverage.
- Addressed various bugs in the import logic and catalog management.

## [0.1.0] - 2025-01-01
- Initial release of Arborist Service.
