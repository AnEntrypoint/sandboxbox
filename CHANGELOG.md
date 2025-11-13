# Changelog

## [3.0.74] - 2025-11-13

### Added
- MCP server mode: Run sandboxbox as an MCP server with `npx sandboxbox mcp`
- `sandboxbox_run` MCP tool: Execute prompts in isolated sandboxbox environments via MCP protocol
- `.mcp.json` configuration file for easy Claude Code integration
- Fetch polyfill in container: undici package installed globally with automatic polyfill via NODE_OPTIONS
- Build command implementation: `npx sandboxbox build` to rebuild container images
- Plugin registry files: installed_plugins.json and known_marketplaces.json in .claude-sandbox/
- Automatic path rewriting for all plugin configuration files during sandbox creation

### Changed
- Container claude wrapper uses NODE_OPTIONS to inject fetch polyfill automatically
- Removed enabledPlugins from .claude-sandbox/settings.json (controlled by config.json)
- Updated cli.js to support 'mcp' command
- Added @modelcontextprotocol/sdk and undici dependencies
- Dockerfile creates fetch-init.mjs for global fetch availability

### Fixed
- Fetch API not available in container: Added undici polyfill loaded via NODE_OPTIONS
- Plugin paths now correctly rewritten in installed_plugins.json and known_marketplaces.json
- Build command now functional with proper podman integration

### Removed
- Manual MCP server configurations from settings.json (delegated to plugin's .mcp.json)
- Firewall script from Dockerfile (not essential for core functionality)

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
