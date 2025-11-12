# Changelog

## [Unreleased]

### Added
- `.claude-sandbox/` directory structure for bundled Claude settings and plugins
- Automatic plugin path rewriting during sandbox creation to point to sandbox locations
- Bundled glootie-cc MCP plugin in `.claude-sandbox/plugins/marketplaces/`

### Changed
- Sandbox creation now uses `.claude-sandbox/` configuration instead of `sandboxbox-settings.json`
- Plugin paths in `config.json` are automatically updated to sandbox-relative paths
- Simplified Claude settings management with repository-based configuration

## [3.0.64] - 2025-10-27

### Fixed
- Console output now properly displays on new lines instead of appending to the same line
- Claude Code conversational text output now ensures trailing newlines for proper formatting

## [3.0.63] - 2025-10-27

### Removed
- Explicit MCP server configurations from sandboxbox-settings.json (now handled by Claude Code plugin)
- Explicit hooks from sandboxbox-settings.json (now handled by Claude Code plugin)
- Curl commands fetching external Git workflow guidelines from utils/commands/claude.js
- MULTI_CONTAINER_TESTING_RESULTS.md (report file)
- playwright.config.js (test configuration file)

### Changed
- Simplified prompt modification in claude command to remove external dependencies
- Updated CLAUDE.md documentation to reflect architecture changes
- Cleaned permissions in sandboxbox-settings.json to core operations only

### Summary
Cleaned up codebase by removing explicit hooks and MCP server configurations, delegating these to the Claude Code plugin for better separation of concerns and maintainability.
