# Using Claude Code via npx in Container

## Overview

Claude Code works via npx in your built container! Both the direct `claude` command and `npx @anthropic-ai/claude-code` are fully functional.

## Installation Status

✅ **Installed globally**: @anthropic-ai/claude-code@2.0.13
✅ **npx support**: Full npx functionality available
✅ **Both methods work**: Direct command and npx

## Usage Methods

### Method 1: Direct Command (Faster)

Since Claude Code is installed globally in the container, you can use it directly:

```bash
# From outside container
npx sandboxbox run-host <project> "claude --version"
npx sandboxbox run-host <project> "claude --help"

# From inside container shell
./enter-shell.sh
claude
```

**Pros:**
- ✅ Faster (no npx overhead)
- ✅ Simpler syntax
- ✅ Pre-installed in container

### Method 2: Via npx (Always Latest)

Use npx to run Claude Code:

```bash
# From outside container
npx sandboxbox run-host <project> "npx @anthropic-ai/claude-code --version"
npx sandboxbox run-host <project> "npx @anthropic-ai/claude-code --help"

# From inside container shell
./enter-shell.sh
npx @anthropic-ai/claude-code
```

**Pros:**
- ✅ Can specify exact version
- ✅ Standard npx workflow
- ✅ Always uses latest by default

## Practical Examples

### Example 1: Run from Outside Container

```bash
# Using direct command
npx sandboxbox run-host my-project "claude --version"

# Using npx
npx sandboxbox run-host my-project "npx @anthropic-ai/claude-code --version"
```

### Example 2: Interactive Session

```bash
# Enter shell
./enter-shell.sh

# Inside shell - either works:
claude
# or
npx @anthropic-ai/claude-code
```

### Example 3: Print Mode (Non-Interactive)

```bash
# Direct command
npx sandboxbox run-host my-project "echo 'Create a hello world' | claude --print"

# Via npx
npx sandboxbox run-host my-project "echo 'Create a hello world' | npx @anthropic-ai/claude-code --print"
```

### Example 4: With Options

```bash
# Using direct command with options
npx sandboxbox run-host my-project "claude --model sonnet --verbose"

# Using npx with options
npx sandboxbox run-host my-project "npx @anthropic-ai/claude-code --model sonnet --verbose"
```

### Example 5: Specific Version via npx

```bash
# Use specific version
npx sandboxbox run-host my-project "npx @anthropic-ai/claude-code@2.0.13 --version"

# Use latest version
npx sandboxbox run-host my-project "npx @anthropic-ai/claude-code@latest --version"
```

### Example 6: Print Mode with JSON Output

```bash
# Get JSON response
npx sandboxbox run-host my-project "
  echo 'What is 2+2?' | \
  npx @anthropic-ai/claude-code --print --output-format json
"
```

### Example 7: With Permissions Bypass (for sandboxes)

```bash
# Bypass permissions for automated scripts
npx sandboxbox run-host my-project "
  echo 'Generate a README' | \
  npx @anthropic-ai/claude-code --print --dangerously-skip-permissions
"
```

### Example 8: Streaming JSON Output

```bash
# Stream JSON responses
npx sandboxbox run-host my-project "
  echo 'Explain async/await' | \
  npx @anthropic-ai/claude-code --print --output-format stream-json
"
```

## Full Workflow Examples

### Workflow 1: One-Shot Code Generation

```bash
# Generate code and save to file
npx sandboxbox run-host my-app "
  echo 'Create a simple Express server on port 3000' | \
  npx @anthropic-ai/claude-code --print --dangerously-skip-permissions > server.js
"
```

### Workflow 2: Interactive Development Session

```bash
# Enter persistent shell
./enter-shell.sh

# Inside the shell:
cd /workspace
npx @anthropic-ai/claude-code

# Now you have an interactive session
# You can ask Claude to help with coding
```

### Workflow 3: Automated Script with Claude

```bash
#!/bin/bash
# build-with-claude.sh

# Use Claude Code to generate build script
npx sandboxbox run-host my-project "
  cat <<'PROMPT' | npx @anthropic-ai/claude-code --print
Create a bash script that:
1. Installs dependencies
2. Runs tests
3. Builds the project
PROMPT
" > build.sh

chmod +x build.sh
```

### Workflow 4: Code Review with Claude

```bash
# Send code for review
npx sandboxbox run-host my-project "
  cat src/index.js | \
  npx @anthropic-ai/claude-code --print --dangerously-skip-permissions \
  'Review this code and suggest improvements'
"
```

## npx vs Direct Command Comparison

| Feature | Direct `claude` | npx `@anthropic-ai/claude-code` |
|---------|----------------|----------------------------------|
| Speed | ⚡ Faster | Slightly slower |
| Version Control | Uses installed (2.0.13) | Can specify any version |
| Syntax | Shorter | Longer |
| Availability | Pre-installed in container | Always available via npm |
| Use Case | Day-to-day work | Version-specific needs |

## When to Use Each Method

### Use Direct Command (`claude`) When:
- ✅ Working interactively
- ✅ Speed matters
- ✅ You're inside the container shell
- ✅ You want simpler syntax

### Use npx When:
- ✅ You need a specific version
- ✅ You want to ensure latest version
- ✅ Writing portable scripts
- ✅ Following standard npx workflows

## Environment Configuration

Both methods have access to:
- ✅ Full /workspace directory
- ✅ All installed tools (Node.js, Git, npm, etc.)
- ✅ Claude Code configuration at /home/node/.claude
- ✅ Network access for API calls
- ✅ All npm packages

## Authentication

Authentication works the same for both methods:

```bash
# Using direct command
claude /login

# Using npx
npx @anthropic-ai/claude-code /login
```

Once authenticated, the credentials are saved in `/home/node/.claude` and work for both methods.

## Complete Usage Example

Here's a complete example showing both methods:

```bash
#!/bin/bash
# Complete Claude Code usage example

# 1. Enter the container shell
./enter-shell.sh

# Inside the shell, both work:

# Method 1: Direct command
echo "Using direct command:"
claude --version

# Method 2: Via npx
echo "Using npx:"
npx @anthropic-ai/claude-code --version

# Interactive session (either works)
# claude
# or
# npx @anthropic-ai/claude-code

# Print mode example
echo "Create a package.json for a Node.js project" | \
  claude --print --dangerously-skip-permissions

# Same with npx
echo "Create a package.json for a Node.js project" | \
  npx @anthropic-ai/claude-code --print --dangerously-skip-permissions
```

## Troubleshooting

### "Command not found: npx"

Shouldn't happen - npx is installed. Verify:
```bash
npx sandboxbox run-host test-project "which npx && npx --version"
```

### "Invalid API key"

Authenticate first:
```bash
./enter-shell.sh
# Then:
claude /login
# or
npx @anthropic-ai/claude-code /login
```

### Version Mismatch

To ensure specific version:
```bash
npx @anthropic-ai/claude-code@2.0.13 --version
```

## Quick Reference

```bash
# Check versions
claude --version                                    # Direct
npx @anthropic-ai/claude-code --version            # npx

# Interactive
claude                                              # Direct
npx @anthropic-ai/claude-code                      # npx

# Print mode
echo "prompt" | claude --print                     # Direct
echo "prompt" | npx @anthropic-ai/claude-code --print  # npx

# With options
claude --model sonnet                               # Direct
npx @anthropic-ai/claude-code --model sonnet       # npx

# Specific version (npx only)
npx @anthropic-ai/claude-code@2.0.13               # Specific
npx @anthropic-ai/claude-code@latest               # Latest
```

## Summary

✅ **Both methods work perfectly in the container**
✅ **Direct command (`claude`) is faster and simpler**
✅ **npx allows version control and standard workflows**
✅ **Choose based on your needs - both are fully supported**

🎉 **Use whichever method fits your workflow!**
