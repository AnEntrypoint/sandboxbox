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
4. Clean up temporary directory on exit
5. Changes persist via git push to host repository

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
```bash
-v "$HOME/.gitconfig:/root/.gitconfig:ro"
-v "$HOME/.ssh:/root/.ssh:ro"
```

### Git Remote Setup
```bash
# Mount host repository as accessible remote
-v "/path/to/host/repo:/host-repo:rw"

# Configure remote in container
git remote add origin /host-repo
```

### Git Safe Directory Configuration
```bash
git config --global --add safe.directory /workspace
git config --global --add safe.directory /host-repo
git config --global --add safe.directory /host-repo/.git
```

### Git Push Configuration
```bash
# Host repository - allow pushes to checked-out branch
git config receive.denyCurrentBranch ignore

# Container - set git identity
git config --global user.email "user@example.com"
git config --global user.name "User Name"
```

### Windows Path Normalization
```javascript
const normalizedTempDir = tempProjectDir.replace(/\\/g, '/');
```

## Claude Code Integration

### Authentication
```bash
-v "$HOME/.claude:/root/.claude"
-e "ANTHROPIC_AUTH_TOKEN=..."
-e "CLAUDECODE=1"
```

### MCP Servers
```dockerfile
RUN claude mcp add glootie -- npx -y mcp-glootie@latest
RUN claude mcp add vexify -- npx -y mcp-vexify@latest
RUN claude mcp add playwright -- npx @playwright/mcp@latest
```

## Cleanup

### Container Cleanup
- Random names: `sandboxbox-run-${Math.random().toString(36).substr(2, 9)}`
- Force cleanup: `podman rm -f container-name`
- Automatic cleanup handlers for SIGINT, SIGTERM

### File Cleanup
- All temporary directories auto-cleanup on exit
- Error handling for cleanup failures (ignore errors)
- Signal handlers ensure cleanup on interrupts