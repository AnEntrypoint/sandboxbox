# SandboxBox

Zero-privilege container runner with Claude Code and Playwright support. Run your projects in an isolated environment with a single command.

## Installation

No installation required! Use with `npx`:

```bash
npx sandboxbox run-host ./my-project
```

## Quick Start

### 1. Build the Container Environment (One-time Setup)

```bash
npx sandboxbox build Dockerfile
```

This builds the container with:
- Node.js v22
- Claude Code CLI
- Playwright with browser dependencies
- Git, npm, and common build tools

### 2. Run Your Project

```bash
# Run with default command
npx sandboxbox run-host ./my-project

# Run with custom command
npx sandboxbox run-host ./my-project "npm test"

# Run Claude Code
npx sandboxbox run-host ./my-project "claude --help"

# Run Playwright tests
npx sandboxbox run-host ./my-project "npx playwright test"
```

### 3. Interactive Development

```bash
# Enter interactive shell
./enter-shell.sh

# Work in /workspace
cd /workspace
vim lib/code.js
npm test
git commit -am "Fix bug"
git push origin master
exit
```

## Features

### 🔒 Isolation
- Container runs with zero privileges
- Your original files are never directly modified
- Workspace is isolated in `/workspace`

### 🔄 Git Integration
- Original project automatically set as git remote `origin`
- Use regular git commands: `git push`, `git pull`, `git fetch`
- Full git workflow support

### 🚀 Claude Code + Playwright
- Claude Code CLI pre-installed
- Playwright with all browser dependencies
- 300+ system packages for complete environment

### 📦 NPX-First Design
- No global installation needed
- Single command execution: `npx sandboxbox run-host <dir>`
- Works with any project directory

## Commands

```bash
# Build container environment (one-time)
npx sandboxbox build Dockerfile

# Run project in container
npx sandboxbox run-host <project-dir> [command]

# Examples
npx sandboxbox run-host ./my-app
npx sandboxbox run-host ./my-app "npm test"
npx sandboxbox run-host ./my-app "claude code --help"
```

## How It Works

1. **Copies** your project files to `/workspace` in the container
2. **Sets up git** with your original directory as remote `origin`
3. **Runs** your command in the isolated environment
4. **Git operations** (push/pull) work directly with your original project

```
Your Project              Container
./my-project    ←───→     /workspace
(git origin)              (isolated copy)
```

## Git Workflow

The container automatically configures git:

```bash
# In container, your original project is the git origin
git remote -v
# origin  file:///path/to/your/project (fetch/push)

# Make changes and commit
git add -A
git commit -m "Add feature"

# Push directly to your original project
git push origin master

# Pull latest changes
git pull origin main
```

See [GIT-WORKFLOW.md](GIT-WORKFLOW.md) for detailed examples.

## Use Cases

### Run Claude Code in Isolation
```bash
npx sandboxbox run-host ./my-app "claude code review lib/"
```

### Run Playwright Tests
```bash
npx sandboxbox run-host ./my-app "npx playwright test"
```

### Development Workflow
```bash
# Enter interactive mode
./enter-shell.sh

cd /workspace
npm install
npm test
git commit -am "Update tests"
git push origin master
exit
```

### Run npm Scripts
```bash
npx sandboxbox run-host ./my-app "npm run build"
npx sandboxbox run-host ./my-app "npm run lint"
```

## Requirements

- Linux system (uses bubblewrap for sandboxing)
- Node.js 16+ (for running npx)
- Git (for git workflow features)

## Project Structure

```
sandboxbox/
├── cli.js              # Main CLI entry point
├── container.js        # Container logic
├── Dockerfile          # Container build definition
├── package.json        # NPM package config
├── bin/bwrap          # Bubblewrap binary
├── lib/               # Core modules
├── scripts/           # Install/build scripts
├── enter-shell.sh     # Interactive shell helper
└── GIT-WORKFLOW.md    # Git workflow guide
```

## License

MIT

## Contributing

Contributions welcome! This project is focused on npx-first usage with Claude Code and Playwright support.
