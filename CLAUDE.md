# SandboxBox Technical Documentation

## Architecture
Portable containerized environments using Podman with automatic WSL management and Claude Code integration.

## Core Components

### CLI Architecture
- **Entry**: cli.js (main entry point)
- **Commands**: utils/commands/container.js (build, run, shell), utils/commands/claude.js (claude), utils/commands/index.js (version + exports)
- **Pattern**: Modular command structure, each file <100 lines
- **Shell execution**: `shell: process.platform === 'win32'` for all execSync calls

### Podman Downloader (scripts/download-podman.js)
- Cross-platform binary downloads from GitHub releases
- Architecture auto-detection: `process.arch === 'arm64' ? 'arm64' : 'amd64'`
- Platform support: Windows (amd64/arm64), macOS (amd64/arm64), Linux (amd64/arm64)
- PowerShell ZIP extraction on Windows
- Auto-detects existing installations
- Auto-triggers on first use if Podman not found
- Verifies binary existence post-download

### Container Images
- **sandboxbox:latest**: Full development environment
- **sandboxbox-local:latest**: Claude Code with local repository

## Windows Compatibility

### Shell Execution Pattern
```javascript
execSync(command, {
  stdio: 'pipe',
  shell: process.platform === 'win32'
});
```

### PowerShell ZIP Extraction
```javascript
execSync(`powershell -Command "${psCommand}"`, {
  stdio: 'pipe',
  shell: true  // REQUIRED
});
```

### Command Interpretation
- Avoid Unix syntax: `|| true` fails on Windows
- Use platform-specific error handling:
```javascript
if (process.platform === 'win32') {
  try {
    execSync(`git remote remove origin`, { stdio: 'pipe', shell: true });
  } catch (e) { /* ignore */ }
} else {
  execSync(`git remote remove origin 2>/dev/null || true`, { stdio: 'pipe', shell: true });
}
```

### Automatic Backend Setup
**Implementation**: `ensureBackend(podmanPath)` in utils/podman.js
- Linux: Returns immediately (native execution, no backend needed)
- Windows/macOS: Checks `podman info` connectivity
- Auto-initializes on first run: `podman machine init --rootful=false` (Windows) or `podman machine init` (macOS)
- Auto-starts machine: `podman machine start`
- Shows progress: "Initializing Podman backend (first run, takes 2-3 minutes)"
- Detects existing machines via `podman machine list --format json`
- Called before all container operations (build, run, shell, claude)

### Portable Architecture
- **Binary Auto-Download**: Platform-specific Podman binary (amd64/arm64) from GitHub releases
- **Rootless Mode**: Windows uses `--rootful=false` for portability
- **Backend Automation**: Fully automatic backend initialization on first container operation
- **NPX Compatible**: Works via npx without global installation
- **Cross-Platform**: Windows (amd64/arm64), macOS (amd64/arm64), Linux (amd64/arm64)

## Isolation Architecture

### Workflow
1. Copy project to temporary directory (including .git)
2. Mount temporary directory as /workspace in container
3. Run commands in isolated environment
4. Agent commits and pushes changes via explicit git commands
5. Clean up temporary directory on exit

### Agent-Controlled Git Workflow
- Git remote `origin` points to host repository
- Host configured with `receive.denyCurrentBranch=updateInstead`
- Git identity (name, email, color) transferred from host
- Agent decides when to commit and push via standard git commands
- Example: Agent runs `git add .`, `git commit -m "message"`, `git push origin master`
- Changes persist when agent explicitly pushes to host

### Pattern
```javascript
import { createIsolatedEnvironment, setupCleanupHandlers, buildContainerMounts } from './utils/isolation.js';

const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
setupCleanupHandlers(cleanup);
const mounts = buildContainerMounts(tempProjectDir, projectDir);

execSync(`podman run --rm -it ${mounts.join(' ')} -w /workspace sandboxbox:latest ${cmd}`, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

cleanup();
```

## Git Integration

### Git Identity Transfer
Automatically transfers host git identity to sandbox after cloning:
```javascript
const userName = execSync('git config --global user.name', { encoding: 'utf8' }).trim();
const userEmail = execSync('git config --global user.email', { encoding: 'utf8' }).trim();
const colorUi = execSync('git config --global color.ui', { encoding: 'utf8' }).trim();

execSync(`git config user.name "${userName}"`, { cwd: workspaceDir });
execSync(`git config user.email "${userEmail}"`, { cwd: workspaceDir });
execSync(`git config color.ui "${colorUi}"`, { cwd: workspaceDir });
```

Git identity and color config auto-inherit from ~/.gitconfig (user.name, user.email, color.ui). For sandbox-to-host workflows, host repo needs `receive.denyCurrentBranch=updateInstead` and clean working directory.

### Git Safe Directory Configuration
```javascript
execSync(`git config --global --add safe.directory "${projectDir}"`);
execSync(`git config --global --add safe.directory "${projectDir}/.git"`);
```

### Windows Path Normalization
```javascript
const normalizedTempDir = tempProjectDir.replace(/\\/g, '/');
```

### Environment Variable Transfer
Host bash session environment variables automatically carry through to sandboxes:
```javascript
// Terminal
TERM: process.env.TERM || 'xterm-256color',
LS_COLORS: process.env.LS_COLORS,

// Locale
LANG: process.env.LANG,
LC_ALL: process.env.LC_ALL,

// User
SHELL: process.env.SHELL,
USER: process.env.USER,
LOGNAME: process.env.LOGNAME,

// Tools
EDITOR: process.env.EDITOR,
VISUAL: process.env.VISUAL,
PAGER: process.env.PAGER,
LESS: process.env.LESS,
LESSOPEN: process.env.LESSOPEN,
LESSCLOSE: process.env.LESSCLOSE,

// Display
DISPLAY: process.env.DISPLAY,
WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,

// Authentication
SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK,
SSH_AGENT_PID: process.env.SSH_AGENT_PID,
GPG_AGENT_INFO: process.env.GPG_AGENT_INFO
```

## Claude Code Integration

### Authentication
Uses host HOME directory for Claude Code authentication. Workspace is isolated in sandbox but credentials remain on host.

### Claude Settings Configuration (.claude-sandbox)
Sandboxes use bundled Claude settings from `.claude-sandbox/` directory in the repository:
- **settings.json**: Claude Code settings including environment variables, hooks, and enabled plugins
- **plugins/config.json**: Plugin repository configuration with paths to marketplace plugins
- **plugins/marketplaces/**: Contains installed MCP plugins (e.g., glootie-cc, playwright)

Settings are copied to `~/.claude/` in sandbox with automatic path rewriting:
```javascript
// Plugin paths are automatically updated to point to sandbox locations
config.repositories[repo].path = join(sandboxClaudeDir, 'plugins', 'marketplaces', repoName);
```

To update sandbox Claude settings:
1. Copy from host: `cp ~/.claude/set.json .claude-sandbox/settings.json`
2. Copy plugins: `cp -r ~/.claude/plugins .claude-sandbox/`
3. Plugins and paths are automatically synced to sandbox on each run

### Tool Allow List
Automatically configured with core tools via command line flags:
- Core: Task, Bash, Glob, Grep, Read, Edit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, BashOutput, KillShell, SlashCommand, ExitPlanMode
- MCP tools configured via Claude Code plugin (glootie, playwright, vexify) are available when plugin is installed

### Streaming Output
Uses `--verbose -p --output-format stream-json` for real-time JSON streaming. Output parser extracts text content, tool usage, session info, and cost metrics from JSON stream.

### Playwright MCP Profile Transfer
Automatically copies persistent MCP profiles from host to sandbox:
```javascript
const playwrightCacheDir = platform() === 'darwin'
  ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
  : platform() === 'win32'
  ? join(homedir(), 'AppData', 'Local', 'ms-playwright')
  : join(homedir(), '.cache', 'ms-playwright');

// Copies mcp-chrome-profile, mcp-chromium-profile, mcp-firefox-profile, mcp-webkit-profile
cpSync(hostProfile, join(sandboxDir, '.cache', 'ms-playwright', profileName), { recursive: true });
```

Environment variable `XDG_CACHE_HOME` set to `${sandboxDir}/.cache` for Playwright profile access.

## Cleanup

### Container Cleanup
- Random names: `sandboxbox-run-${Math.random().toString(36).substr(2, 9)}`
- Force cleanup: `podman rm -f container-name`
- Automatic cleanup handlers for SIGINT, SIGTERM

### File Cleanup
- All temporary directories auto-cleanup on exit
- Error handling for cleanup failures (ignore errors)
- Signal handlers ensure cleanup on interrupts

## Settings Configuration

### sandboxbox-settings.json
Bundled Claude Code settings for sandbox environments:
- Plugin timeout: 5000ms
- Permissions: Git operations (add, commit, push, status, log), file operations (Write, Read, Edit, Glob, Grep)
- No explicit MCP server configurations (handled by Claude Code plugin)
- No explicit hooks (handled by Claude Code plugin)