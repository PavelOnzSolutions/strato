# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Fixed
- Configuration Provider view: switching to "JSON Preview" failed with a backend 404 ("No static resource api/configuration-provider/config/{name}/env.") and showed an empty editor. `fetchProviderOutput` now calls the no-env preview endpoint `/configuration-provider/config/{name}` (URL-encoded), which delegates to the configuration's bound environment server-side.

## [0.9.9] - 2026-02-25
### Added
- RBAC Permission Hierarchy: introduced scoped permission definitions with implied permission levels, hierarchy enforcement utilities, and human-readable labels (244cd47).
- Environment Import: automatic cross-resource reference detection from ARM properties, wiring discovered dependencies as graph edges on import (9317496).
- `IDetectedReference` model for carrying detected cross-resource link metadata from import results.

### Changed
- Role Management and API Tokens pages refactored to use the new permission hierarchy system (244cd47).
- Environment Import review step now displays detected references and auto-creates node connections (9317496).
- MSGraph Editor: minor endpoint configuration improvements (9317496).
- Role Management Help documentation updated to reflect hierarchical permissions (244cd47).

## [0.9.8] - 2026-02-23
### Changed
- Configuration Provider: replaced folder/file icons with data type icons for fields, with color mapping (32b0851).

### Fixed
- Configuration Provider: panel state sync and breadcrumbs behavior (e2f0a72).

## [0.9.7] - 2026-02-16
### Added
- Configuration Provider documentation: added "Placeholder Variables" section explaining `{{name}}` and `{{environment}}` usage.
- Navbar UI: added vertical separators between title, page title, and contextual toolbar for better visual hierarchy.

### Changed
- UI Polish: enhanced Navbar branding with updated "Arborist" title styling and smoother plasma-text animations.
- UI Polish: increased page title visibility in Navbar (font-bold, text-xl).
- UI Polish: refined plasma-text animation parameters for smoother color transitions.
- Typography: optimized Google Fonts loading in `index.html` by splitting font-family requests.
- Resource Classes: renamed "Resources" page title to "Resource Classes" for better clarity.
- Layout: improved `MainLayout` content container height management.
- Configuration Provider Help pages update/refresh.

## [0.9.6] - 2026-02-13
### Added
- Admin pages layout unification: introduced header icons, titles, and descriptions across all administrative interfaces (5bd21f4).
- User Profile layout unification: updated profile page to match the new administrative layout style (5bd21f4).
- Page titles for Settings and Profile pages (aa9ebb7, 5bd21f4).

### Changed
- UI Polish: unified layout, spacing, and component usage across Admin and User Profile pages (aa9ebb7, 5bd21f4).
- Typography Improvements: refined font families and weights for better readability (aa9ebb7, a1c66b6).
- Sidebar Enhancements: updated navigation icons for better visual clarity (5bd21f4).

## [0.9.5] - 2026-02-13
### Added
- User Settings page: introduced a new dedicated settings interface for user-specific configurations (f36780a).

### Changed
- UI Improvements: various tweaks and refinements to the user interface (f36780a).

## [0.9.4] - 2026-02-12
### Fixed
- Configuration Schema: added JSON schema standard autocomplete in JSON editor (13e94ce).
- Configuration Visual Editor: fixed editing of empty string values (c0b76b9).

## [0.9.3] - 2026-02-12
### Added
- Workflow Editor: initial implementation with React Flow, supporting step configuration and visualization (563fc4a, 978f352).
- User Management: display User Origin (Local vs OAuth2) with visual badges.
- Configuration Schema: new import and generation features.
- Running Tasks: added Workflow Instances monitoring tab.
- Configuration comparator feature (4dfea82).
- Config schema permissions (7074e21).

### Changed
- Improved Sidebar with new navigation icons and FolderTree support.
- Refactored Workflow models for better backend alignment.
- i18next debug mode disabled (d6cf96e).
- Soft-delete disabled for configurations and schemas (7074e21).

### Fixed
- Workflow Editor: fixed step saving and layout issues.
- Configuration Provider View: support for nested objects and tree deletion (b5026a3, e752599).
- Extensive UI style unification and fixes (b5026a3, e752599).

## [0.9.2] - 2026-02-10
### Added
- Dashboard log timeline (8344218, 5f71291).
- New Dashboard updates and visualizations (eaf77c9, 99a8cc5).
- Automatic version reading from package.json (388b64d, 45cc633).

### Changed
- Extracted MiniChart as a standalone component (5fa7f3e).

### Fixed
- Toolbar button layout and UI style unification (27acd47, 97c5000).
- API tokens session filter hotfix (628bb2b).

## [0.9.1] - 2026-02-09
### Added
- Configuration Provider Overview documentation (fa6b370).
- Pagination for Resources and Audit Log (dcd1b27).

### Changed
- Enhanced Configuration Provider UI components: Header, MainPanel, Sidebar, VisualEditor (fa6b370).
- Updated general documentation and help sections (5415239, bb37ebe).

### Fixed
- Various UI tweaks and improvements across the application (dcd1b27, fa6b370).

## [0.9.0] - 2026-02-08
### Added
- Workflow Editor implementation for Resource Classes (cb9290b).
- Token refresh mechanism and improved AuthContext (cf50b17).
- Workflow Editor documentation page (cb9290b).
- New icons for JavaScript, Paint, and Process Gears (cb9290b).
- New i18n flags for cs-CZ, en-UK, en-US, and sk-SK (cb9290b).
- JSON/Visual split mode in Configuration Schema Editor

### Changed
- Improved Navbar with better layout and nested navigation support (cb9290b).
- ThemeContext and layout refinements (cb9290b).
- Modernized CSS variable usage in UI components (43e832d).

### Fixed
- CSS and UI fixes across the application (7a03d7e, 98346c5).
- Versioning and minor UI tweaks (43e832d).

## [0.8.7] - 2026-02-06
### Added
- Clone functionality for Configurations and Configuration Schemas.
- Bicep export functionality for environments.
- Configuration Provider full implementation with linked Environment support.
- Configuration Provider View with recursive search and version selection.
- Configuration Schema node graph navigation to source code lines.
- Unified configurations documentation page with integrated TOC and help sections for Schemas and Providers.
- Mandatory field validation and GUID format verification for Azure, GitHub, and Bitbucket credentials.
- GraphQL documentation (d7ad9d5).

### Changed
- Improved UI and miscellaneous fixes (306a341, 4901559).
- Refactored documentation components (Configurations, Schemas, Provider) to support embedded views.

### Fixed
- Critical stale closure bug in Configuration Editor "Save" button.
- React "uncontrolled to controlled" warning in Configuration Editor.
- Schema selection error in Configuration creation.
- Resource icon category path mapping (496ffcb).
- Environment editor: regex and type issues (5da343c).
- Environment settings: Azure credential ID and patch behavior (305eab2).
- MSGraph resource issues (db9898e).
- Graph node position persistence (19ef540).
- Help dialog and node edge labels (31c6cb5).
- Environment editor: node connection deletion sync and UI improvements (15538fb).

## [0.8.6] - 2026-02-01
### Added
- Assistant full chat interface (d832c14).
- GitHub credential resource class (724eca1).
- Configuration provider stub (08f54be).

### Changed
- UI tweaks and improvements (4901559, 8f9a0b8).
- Component refactoring and splitting (724eca1).

### Fixed
- Environment graph linking issue after node rename (1048c92).

## [0.8.5] - 2026-01-29
### Changed
- Updated MSGRAPH icon to Graph Explorer.
- Updated Catalog abbreviation documentation in Resources Help.

### Fixed
- Cleaned up unused imports in Cache Help documentation.

## [0.8.4] - 2026-01-27
### Added
- Coming soon page (b84dbc5).

### Fixed
- Resource icons (b84ddf2).
- Import result icons (b84dbc5).
- Copyright fix (a8368d2).

## [0.8.3] - 2026-01-26
### Added
- Audit Log pagination (4af8c44).
- Class icon categories in Class Editor (00d2d00).

### Changed
- Class Editor refactors and optimizations (3f681fb, d38023b).
- Various UI tweaks across the app (91e20d5, 5bf39af).

### Fixed
- Resource node icon path (01e4576).
- Navbar behavior (fd0f4f1).
- Miscellaneous fixes (cc9863b).

## [0.8.2] - 2026-01-25
### Added
- Running Tasks page and WebSocket notifications for deployments (1375f69).

### Changed
- Deployment flow: moved API calls and made deployments async (75d913a, 1375f69).
- UI tweaks (102a05b).

### Fixed
- Assistant and Deployment Plan modal credentials (e1ad918).

## [0.8.1] - 2026-01-21
### Added
- Metrics page and dashboard status summary; added `PERM_PLATFORM_READ` (bfb55ef, 7d8bc18).
- Select Credential in Deployment and Environment Settings (45fd5c4).
- Import environment credentials (a780855).
- Import phase 2: import unmatched classes; persist node connection handle (7c67872).
- Basic LLM assistant (7ee0531, 1798387, f667630).

### Changed
- Assistant UI: scroll behavior, layout, loading skeleton; Version Matrix documentation (65566e6, 1c69322, 9032882).
- API fetch async optimizations (0ab5bcd).
- Moved markdown to System Status (28b01bf).

### Security
- RBAC for API tokens, basic RBAC (66778d8, abcb1bb); RBAC documentation (5d7fba4, 9012f4b).

### Fixed
- `isSystem` flag (363001f).
- AuthContext (bab894a).
- Resource Class Definitions (d8dc85e).
- Catalog syntax, CSS fixes, Deploy Plan (842e9d2, e8a05ef, 1a95577, 8cee38b, caad461).
- General UI fixes (db37a39, 93da208, f089c59, df13610).

## [0.8.0] - 2026-01-16
### Added
- Full Catalog implementation (4a7a2b6, 9edef74).

### Changed
- Dashboard updates and visual polish (f394264).

### Fixed
- Various fixes and temporary workarounds (fa62321, 1145c63).

### Notes
- See `package.json` for the current application version.

<!--
Guidelines for maintainers:
- Group entries under one of: Added, Changed, Deprecated, Removed, Fixed, Security.
- Keep entries short, imperative, and user-facing (what changed, not how).
- Add links to issues/PRs where helpful.
-->
