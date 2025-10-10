# FlowState Project Running in SandboxBox Container

## Overview

The FlowState project is successfully running in the SandboxBox container with full access to Claude Code, Playwright, and all development tools.

## Project Details

**Name:** flowstate-execution
**Version:** 3.1.0
**Description:** Production-grade JavaScript execution library with automatic pause/resume on fetch calls and custom database storage

## Container Environment

### ✅ Tools Available

| Tool | Version | Status |
|------|---------|--------|
| Claude Code | 2.0.13 | ✅ Ready |
| Node.js | v22.19.0 | ✅ Ready |
| npm | 10.9.3 | ✅ Ready |
| Git | 2.43.0 | ✅ Ready |
| Playwright | 1.56.0 | ✅ Ready |
| @playwright/mcp | 0.0.41 | ✅ Ready |
| Zsh + Oh-My-Zsh | Latest | ✅ Ready |

### ✅ Project Structure in Container

```
/workspace/
├── lib/
│   ├── edge-functions.cjs  (8.5KB)
│   └── storage.cjs         (8.1KB)
├── examples/
├── node_modules/
├── package.json
├── deno.json
├── README.md
└── EDGE_FUNCTIONS.md
```

### ✅ Dependencies Installed

```
✓ fetchflow (latest)
✓ 7 packages total
✓ 0 vulnerabilities
```

## Usage Examples

### Run Commands in Container

```bash
# Check project status
npx sandboxbox run-host ../flowstate "npm list"

# Run git commands
npx sandboxbox run-host ../flowstate "git status"

# View files
npx sandboxbox run-host ../flowstate "cat package.json"

# Use Claude Code
npx sandboxbox run-host ../flowstate "claude --version"
```

### Interactive Development

```bash
# Enter the container shell
./enter-shell.sh

# Once inside, flowstate files are in /workspace
cd /workspace
ls -la
cat lib/edge-functions.cjs
```

### Use Claude Code with FlowState

```bash
# Get help from Claude Code
npx sandboxbox run-host ../flowstate "claude --help"

# Via npx
npx sandboxbox run-host ../flowstate "npx @anthropic-ai/claude-code --version"

# Interactive session (from shell)
./enter-shell.sh
# Then: claude
```

### Git Operations

```bash
# Check status
npx sandboxbox run-host ../flowstate "git status"

# View branches
npx sandboxbox run-host ../flowstate "git branch -a"

# View commit history
npx sandboxbox run-host ../flowstate "git log --oneline -10"
```

### Code Exploration

```bash
# View edge functions code
npx sandboxbox run-host ../flowstate "head -50 lib/edge-functions.cjs"

# View storage implementation
npx sandboxbox run-host ../flowstate "head -50 lib/storage.cjs"

# Check examples
npx sandboxbox run-host ../flowstate "ls -la examples/"
```

## Development Workflow

### 1. Make Changes Locally
Edit files in `../flowstate/` on your host system

### 2. Run in Container
```bash
npx sandboxbox run-host ../flowstate "npm install"
npx sandboxbox run-host ../flowstate "npm run build:examples"
```

### 3. Use Claude Code for Help
```bash
npx sandboxbox run-host ../flowstate "
  echo 'Explain the FlowStateEdge.execute method' |
  claude --print --dangerously-skip-permissions
"
```

### 4. Test with Playwright
```bash
# If you add Playwright tests
npx sandboxbox run-host ../flowstate "npx playwright test"
```

## Key Features Available

### Claude Code Integration
- ✅ Full CLI access
- ✅ Interactive sessions
- ✅ Print mode for automation
- ✅ All MCP servers available
- ✅ File operations (Read, Edit, Write)

### Playwright Support
- ✅ System dependencies installed (300+ packages)
- ✅ @playwright/mcp for integration
- ✅ Browser automation ready
- ✅ Full test suite support

### Development Tools
- ✅ Git for version control
- ✅ Vim/Nano for editing
- ✅ Zsh with Oh-My-Zsh
- ✅ jq for JSON processing
- ✅ gh for GitHub operations

## Quick Reference

### Most Common Commands

```bash
# Run npm scripts
npx sandboxbox run-host ../flowstate "npm run type-check"
npx sandboxbox run-host ../flowstate "npm run build:examples"

# Git operations
npx sandboxbox run-host ../flowstate "git status"
npx sandboxbox run-host ../flowstate "git diff"

# Code analysis with Claude
npx sandboxbox run-host ../flowstate "
  cat lib/edge-functions.cjs |
  claude --print 'Summarize this code'
"

# Interactive development
./enter-shell.sh
# Inside: cd /workspace && claude
```

### File Locations

| Path | Description |
|------|-------------|
| `/workspace/` | FlowState project root |
| `/workspace/lib/` | Library source files |
| `/workspace/examples/` | Example implementations |
| `/workspace/node_modules/` | npm dependencies |
| `/home/node/.claude/` | Claude Code config |

## Project Architecture

FlowState is a JavaScript execution library that:
1. Executes JavaScript code with QuickJS VM
2. Automatically pauses on `fetch()` calls
3. Supports custom database storage
4. Works in edge functions (Supabase, Firebase, etc.)
5. Provides full state management

The container provides the perfect environment for:
- 📝 Development with Claude Code assistance
- 🧪 Testing with Playwright
- 🔧 Building and deploying
- 📦 Package management

## Integration Benefits

### Why FlowState + SandboxBox?

1. **Isolated Environment**: Run FlowState in a clean container
2. **All Tools Available**: Claude Code + Playwright + Node.js
3. **No Conflicts**: Separate from host dependencies
4. **Reproducible**: Same environment every time
5. **Fast**: Native speed, no Docker overhead

### Development Cycle

```
Edit locally → Run in container → Test → Commit → Repeat
     ↓              ↓              ↓        ↓
  VS Code      SandboxBox      Playwright  Git
                   ↓
              Claude Code
```

## Next Steps

1. **Explore the code**:
   ```bash
   npx sandboxbox run-host ../flowstate "cat lib/edge-functions.cjs | head -100"
   ```

2. **Ask Claude for help**:
   ```bash
   npx sandboxbox run-host ../flowstate "
     echo 'How does FlowState handle async execution?' |
     claude --print
   "
   ```

3. **Run type checking**:
   ```bash
   npx sandboxbox run-host ../flowstate "npm run type-check"
   ```

4. **Interactive development**:
   ```bash
   ./enter-shell.sh
   # Then work with FlowState files in /workspace
   ```

## Summary

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  ✅ FlowState Running in SandboxBox Container                ║
║                                                              ║
║  📁 Project: flowstate-execution v3.1.0                      ║
║  🏠 Location: /workspace                                     ║
║  👤 User: node                                               ║
║                                                              ║
║  🤖 Claude Code: Ready                                       ║
║  🎭 Playwright: Ready                                        ║
║  📦 Dependencies: Installed                                  ║
║  🔧 Dev Tools: All available                                 ║
║                                                              ║
║  🚀 Ready for development!                                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

🎉 **FlowState is fully operational in the SandboxBox container!**
