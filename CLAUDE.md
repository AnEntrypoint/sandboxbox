# SandboxBox Technical Documentation

## Architecture Overview
SandboxBox provides portable containerized development environments using Podman with automatic WSL machine management and Claude Code integration.

## Core Components

### CLI (cli.js)
- Main entry point with automatic Podman machine management
- Commands: build, run, shell, version, help
- Auto-detects and starts Podman machine when needed
- Shell execution with Windows compatibility (`shell: process.platform === 'win32'`)

### Podman Downloader (scripts/download-podman.js)
- Cross-platform binary downloads from GitHub releases
- PowerShell ZIP extraction on Windows (no external dependencies)
- Automatic version detection and binary path resolution

### Container Images
- **sandboxbox-auth**: Full development environment with Claude Code
- **sandboxbox-local**: Local repository workspace (symlink approach)

## Windows Compatibility Fixes

### Critical PowerShell ZIP Extraction
```javascript
// scripts/download-podman.js:81
execSync(`powershell -Command "${psCommand}"`, {
  stdio: 'pipe',
  cwd: __dirname,
  shell: true  // REQUIRED for PowerShell commands
});
```

### Shell Execution Pattern
All `execSync()` calls must include:
```javascript
{
  stdio: 'pipe',
  shell: process.platform === 'win32'  // Windows compatibility
}
```

### Auto Podman Machine Management
```javascript
// cli.js checkPodman() function
if (process.platform === 'win32' && isBundled) {
  try {
    execSync(`"${podmanPath}" info`, { ...execOptions, stdio: 'pipe' });
  } catch (infoError) {
    if (infoError.message.includes('Cannot connect to Podman')) {
      // Auto-start existing machine
      execSync(`"${podmanPath}" machine start`, { stdio: 'inherit' });
    }
  }
}
```

## Claude Code Integration

### Authentication Transfer
Mount complete Claude session data:
```bash
-v "$HOME/.claude:/root/.claude"
```

### Environment Variables
Key variables to transfer:
```bash
ANTHROPIC_AUTH_TOKEN
CLAUDECODE=1
ANTHROPIC_BASE_URL
```

### Git Identity Transfer
```bash
-v "$HOME/.gitconfig:/root/.gitconfig:ro"
-v "$HOME/.ssh:/root/.ssh:ro"
```

## Local Repository Workflow

### Architecture
- Container mounts local repo as `/project:rw`
- Creates symlink `/workspace/project` → `/project`
- Works directly with local repository (no cloning needed)
- Changes persist to host folder automatically

### Container Command
```bash
podman run --rm \
  -v "/path/to/repo:/project:rw" \
  -v "$HOME/.claude:/root/.claude" \
  -v "$HOME/.gitconfig:/root/.gitconfig:ro" \
  -v "$HOME/.ssh:/root/.ssh" \
  -e "ANTHROPIC_AUTH_TOKEN=..." \
  -e "CLAUDECODE=1" \
  sandboxbox-local:latest
```

### Dockerfile.local-workspace
```dockerfile
# Creates symlink to mounted repository
ln -sf "$REPO_PATH" "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"
exec claude  # Changes save directly to local repo
```

## Complete Workflow Example

1. **Setup**: Build sandboxbox-local image
2. **Mount**: Local repository as `/project:rw`
3. **Auth Transfer**: Mount `.claude`, `.gitconfig`, `.ssh`
4. **Edit**: Claude Code modifies files in `/workspace/project` (symlink to `/project`)
5. **Commit**: Changes made directly to local repository
6. **Persist**: No additional push/pull needed - changes already in host folder

## Troubleshooting

### "unzip command not found"
**Solution**: Use PowerShell ZIP extraction with `shell: true`

### "Cannot connect to Podman"
**Solution**: Automatic machine start in checkPodman() function

### Build context issues
**Solution**: Use direct Podman build, then tag for SandboxBox

### Git identity errors
**Solution**: Mount `.gitconfig:ro` for user identity transfer

### Path resolution issues
**Solution**: Use explicit REPO_PATH environment variable

## Command Isolation Principles

### Critical Architecture Distinction
- **`run` command**: Creates isolated temporary environment - changes DO NOT affect host
- **`claude` command**: Mounts local repository directly - changes DO affect host
- **`shell` command**: Creates isolated temporary environment - changes DO NOT affect host

### Isolation Implementation (run/shell commands)
```javascript
// Creates temporary directory with copied project
const tempDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
const tempProjectDir = join(tempDir, projectName);

// Cross-platform file copying with hidden files (.git, etc.)
if (process.platform === 'win32') {
  execSync(`powershell -Command "Copy-Item -Path '${projectDir}\\*' -Destination '${tempProjectDir}' -Recurse -Force"`, {
    stdio: 'pipe',
    shell: true
  });
  // Copy hidden files separately
  execSync(`powershell -Command "Get-ChildItem -Path '${projectDir}' -Force -Name | Where-Object { $_ -like '.*' } | ForEach-Object { Copy-Item -Path (Join-Path '${projectDir}' $_) -Destination '${tempProjectDir}' -Recurse -Force }"`, {
    stdio: 'pipe',
    shell: true
  });
} else {
  execSync(`cp -r "${projectDir}"/.* "${tempProjectDir}/" 2>/dev/null || true`, {
    stdio: 'pipe',
    shell: true
  });
  execSync(`cp -r "${projectDir}"/* "${tempProjectDir}/"`, {
    stdio: 'pipe',
    shell: true
  });
}

// Automatic cleanup on exit
const cleanup = () => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch (cleanupError) {
    // Ignore cleanup errors
  }
};

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });
```

### Container Naming and Cleanup
- Use random short names: `sandboxbox-run-${Math.random().toString(36).substr(2, 9)}`
- Force cleanup: `podman rm -f container-name`
- Automatic cleanup handlers for all exit scenarios
- Cross-platform signal handling (SIGINT, SIGTERM)

### Cross-Platform Path Handling
```javascript
// Normalize Windows paths for podman cp command
const normalizedProjectDir = projectDir.replace(/\\/g, '/');
```

## Version Management
- Publish new version when fixing critical Windows issues
- Clear npm cache: `npm cache clean --force`
- Use specific version: `npx sandboxbox@latest`

## File Cleanup Requirements
- All temporary containers auto-cleanup on exit
- All temporary directories auto-cleanup on exit
- Error handling for cleanup failures (ignore errors)
- Signal handlers ensure cleanup on interrupts