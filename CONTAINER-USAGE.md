# SandboxBox Built Container Usage Guide

## Overview

The `build` command creates a **host-based development environment** from your Dockerfile. This environment includes all the tools and dependencies specified in your Dockerfile, running directly on the host system (similar to a devcontainer).

## Build Status

✅ **Build Complete** - All 10 Dockerfile commands executed successfully

### What Was Built

- **Base Image**: node:20
- **User**: node (non-root user with proper permissions)
- **Workspace**: `/workspace` (writable by node user)
- **Command History**: `/commandhistory` (persistent bash history)

### Installed Tools

- ✅ Node.js v22.19.0
- ✅ npm 10.9.3
- ✅ Git 2.43.0
- ✅ Claude Code CLI 2.0.13
- ✅ Zsh with Oh-My-Zsh (powerlevel10k theme)
- ✅ Vim, Nano, less, jq, gh
- ✅ Playwright system dependencies (300+ packages)
- ✅ @playwright/mcp 0.0.41
- ✅ git-delta (enhanced git diff viewer)
- ✅ iptables and firewall scripts

## Running Your Container

### Option 1: CLI Command (Recommended)

```bash
# Run with default test command
npx sandboxbox run-host <project-dir>

# Run with custom command
npx sandboxbox run-host <project-dir> "npm test"
npx sandboxbox run-host <project-dir> "node app.js"
npx sandboxbox run-host test-project "bash verify-environment.sh"
```

### Option 2: Direct Script

```bash
# Run project with default command
./run-container.sh <project-dir>

# Run project with custom command
./run-container.sh <project-dir> "your-command"
```

### Option 3: Manual Execution

```bash
# Run as node user in /workspace
sudo -u node bash -c 'cd /workspace && your-command'
```

## How It Works

1. **Copies Project**: Your project files are copied to `/workspace`
2. **Runs as Node User**: Commands execute as the `node` user (not root)
3. **Full Environment**: All tools from the build are available
4. **Clean State**: Workspace is cleaned before each run

## Environment Verification

Test your environment with:

```bash
npx sandboxbox run-host test-project "bash verify-environment.sh"
```

This verifies:
- ✅ User environment (node user, proper $HOME)
- ✅ Development tools (Node.js, npm, Git, Claude Code, etc.)
- ✅ Directories (/workspace, /commandhistory, Oh-My-Zsh)
- ✅ npm global packages
- ✅ Network access

## Example Usage

### Running Tests

```bash
npx sandboxbox run-host ./my-app "npm test"
```

### Running Application

```bash
npx sandboxbox run-host ./my-app "node server.js"
```

### Interactive Shell

```bash
bash start-container.sh
# Launches zsh as node user in /workspace
```

### Quick Command

```bash
./run-in-sandbox.sh 'node app.js'
```

## Differences from Isolated Containers

This build creates a **host-based environment**, not an isolated Alpine container:

- **Host Environment**: Runs on your host system (not in bubblewrap isolation)
- **Full Integration**: Direct access to host resources
- **No Overhead**: Zero container startup time
- **Development Focus**: Perfect for development and testing

For **isolated execution** with Alpine Linux + bubblewrap:
1. Run `npx sandboxbox setup` to create Alpine rootfs
2. Use `npx sandboxbox run` for isolated Playwright tests
3. Use `npx sandboxbox shell` for interactive isolated shell

## Rebuilding

The build is fully **idempotent** - you can rebuild anytime:

```bash
npm run build Dockerfile
# or
npx sandboxbox build Dockerfile
```

Previous build artifacts are automatically cleaned up before each build.

## Troubleshooting

### Environment Not Found

If you get "❌ Host environment not built yet":

```bash
npm run build Dockerfile
```

### Permission Issues

Commands run as the `node` user. For system-level operations, they may need sudo (configured in the Dockerfile).

### Workspace Access

The `/workspace` directory is owned by the node user and is the default working directory for all commands.

## Architecture

```
┌─────────────────────────────────────────┐
│ Your Project (any directory)            │
└─────────────────┬───────────────────────┘
                  │ copied to
                  ↓
┌─────────────────────────────────────────┐
│ /workspace (owned by node user)         │
│  - Full tool access                     │
│  - Node.js, npm, Git, Claude Code, etc. │
│  - Oh-My-Zsh configured                 │
│  - Playwright dependencies              │
└─────────────────────────────────────────┘
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run build Dockerfile` | Build/rebuild the environment |
| `npx sandboxbox run-host <dir>` | Run project with default command |
| `npx sandboxbox run-host <dir> "cmd"` | Run project with custom command |
| `./run-container.sh <dir>` | Direct script access |
| `bash start-container.sh` | Interactive shell session |
| `./run-in-sandbox.sh 'cmd'` | Quick single command |

## What's Next?

Your built container environment is ready to use! Try:

1. Run the test project: `npx sandboxbox run-host test-project`
2. Verify the environment: `npx sandboxbox run-host test-project "bash verify-environment.sh"`
3. Copy your own project and run it
4. Use the interactive shell for development

🎉 **Your SandboxBox container is fully operational!**
