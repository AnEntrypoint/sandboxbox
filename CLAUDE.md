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

## Version Management
- Publish new version when fixing critical Windows issues
- Clear npm cache: `npm cache clean --force`
- Use specific version: `npx sandboxbox@latest`