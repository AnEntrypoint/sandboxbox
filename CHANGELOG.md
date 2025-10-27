# Changelog

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
