# SandboxBox

**Cross-platform container runner with Claude Code and Playwright support**

Run your projects in isolated containers using Podman. Works on **Windows, macOS, and Linux**.

## Installation

No installation required! **Podman binaries auto-download** on first use:

```bash
npx sandboxbox build
npx sandboxbox run ./my-project
```

### Auto-Download Feature

SandboxBox automatically downloads portable Podman binaries when you run it:
- ✅ **Windows** - Downloads podman.exe (v4.9.3)
- ✅ **macOS** - Downloads podman remote client
- ✅ **Linux** - Downloads static podman binary

Just like sqlite or Playwright, no manual installation needed!

### Manual Installation (Optional)

If you prefer to install Podman system-wide:

**Windows:**
```powershell
winget install RedHat.Podman
```

**macOS:**
```bash
brew install podman
podman machine init
podman machine start
```

**Linux:**
```bash
sudo apt-get install podman     # Ubuntu/Debian
sudo dnf install podman          # Fedora
sudo apk add podman              # Alpine
```

## Quick Start

### 1. Build Container

```bash
npx sandboxbox build
```

This builds a container with:
- Node.js v22
- Claude Code CLI
- Playwright with all browser dependencies
- Git, npm, and essential build tools

### 2. Run Your Project

```bash
# Run with default shell
npx sandboxbox run ./my-project

# Run custom command
npx sandboxbox run ./my-project "npm test"

# Run Claude Code
npx sandboxbox run ./my-project "claude --help"

# Run Playwright tests
npx sandboxbox run ./my-project "npx playwright test"
```

### 3. Interactive Shell

```bash
npx sandboxbox shell ./my-project
```

## Features

### 🌍 Cross-Platform
- **Windows** - Full support with Podman Desktop
- **macOS** - Works with Podman machine
- **Linux** - Native Podman support

### 🔒 Isolation
- Complete container isolation
- Your host system stays clean
- Workspace mounted at `/workspace`

### 🚀 Pre-installed Tools
- **Node.js v22**
- **Claude Code CLI** - AI-powered development
- **Playwright** - Browser automation with all dependencies
- **Git** - Version control
- **npm** - Package management

### 📦 NPX-First Design
- No global installation needed
- Single command execution
- Works with any project directory

## Commands

```bash
# Build container from Dockerfile
npx sandboxbox build
npx sandboxbox build ./Dockerfile.custom

# Run project in container
npx sandboxbox run <project-dir> [command]

# Interactive shell
npx sandboxbox shell <project-dir>

# Show version
npx sandboxbox version
```

## How It Works

1. **Builds** a container image from the Dockerfile using Podman
2. **Mounts** your project directory to `/workspace` in the container
3. **Runs** your command in the isolated container environment
4. **Removes** the container automatically when done

```
Your Project              Container
./my-project    ━━━━━>    /workspace
(host)                    (isolated)
```

## Use Cases

### Run Claude Code
```bash
npx sandboxbox run ./my-app "claude --version"
npx sandboxbox run ./my-app "claude code review lib/"
```

### Run Playwright Tests
```bash
npx sandboxbox run ./my-app "npx playwright test"
npx sandboxbox run ./my-app "npx playwright test --headed"
```

### Development Workflow
```bash
# Build once
npx sandboxbox build

# Interactive development
npx sandboxbox shell ./my-app

# Inside container:
npm install
npm test
git commit -am "Update"
exit
```

### Run npm Scripts
```bash
npx sandboxbox run ./my-app "npm run build"
npx sandboxbox run ./my-app "npm run lint"
npx sandboxbox run ./my-app "npm run test:e2e"
```

## Custom Dockerfile

Create your own `Dockerfile`:

```dockerfile
FROM node:22-alpine

# Install system dependencies
RUN apk add --no-cache git bash curl

# Install global packages
RUN npm install -g @anthropic-ai/claude-code @playwright/test

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

WORKDIR /workspace

CMD ["/bin/bash"]
```

Then build:
```bash
npx sandboxbox build ./Dockerfile
```

## Requirements

- **Podman** (https://podman.io/getting-started/installation)
- **Node.js 16+** (for running npx)

## Project Structure

```
sandboxbox/
├── cli.js              # Main CLI - Podman integration
├── Dockerfile          # Container definition
├── package.json        # NPM package config
└── README.md           # This file
```

## Why Podman?

- ✅ **Cross-platform** - Works on Windows, macOS, Linux
- ✅ **Rootless** - No daemon, runs as regular user
- ✅ **Docker-compatible** - Uses OCI standard containers
- ✅ **Secure** - Better security model than Docker
- ✅ **Fast** - Lightweight and efficient

## Differences from v1.x

**v1.x (bubblewrap):**
- Linux-only
- Required bubblewrap installation
- Direct process isolation

**v2.x (Podman):**
- Cross-platform (Windows/macOS/Linux)
- Uses Podman containers
- OCI-standard container images
- More portable and widely supported

## License

MIT

## Contributing

Contributions welcome! This project focuses on cross-platform container execution with Claude Code and Playwright support using Podman.
