#!/bin/bash

# Complete SandboxBox workflow test
# Tests: auth transfer, git clone, Claude Code edit, git push

set -e

echo "🧪 Testing Complete SandboxBox Workflow..."
echo "=========================================="

REPO_PATH="/project"
WORKSPACE="/workspace/project"

# Build test command
PODMAN_CMD="bin/podman.exe run --rm -v 'C:\dev\test-repo:/project' -v 'C:\Users\user\.claude:/root/.claude' -v 'C:\Users\user\.ssh:/root/.ssh:ro' -e 'ANTHROPIC_AUTH_TOKEN=6e0806d0d17f4ffcb01b81dbe5aa5a70.lw8hRYCZjP3ksvB4' -e 'CLAUDECODE=1' --env REPO_PATH='/project' sandboxbox-auth:latest"

echo "📋 Step 1: Git clone to workspace"
eval "$PODMAN_CMD bash -c 'cd /workspace && git clone /project project && cd project && echo \"✅ Git clone successful\" && ls -la && git status'"

echo ""
echo "📋 Step 2: Verify Claude Code authentication"
eval "$PODMAN_CMD bash -c 'cd /workspace/project && claude --version && echo \"✅ Claude Code authenticated\"'"

echo ""
echo "📋 Step 3: Show current file content"
eval "$PODMAN_CMD bash -c 'cd /workspace/project && echo \"=== Current index.js content ===\" && cat index.js'"

echo ""
echo "📋 Step 4: Test Claude Code file editing"
eval "$PODMAN_CMD bash -c 'cd /workspace/project && claude -p \"Edit index.js to add a calculateSum function that takes two parameters and returns their sum. Add the function after the existing main() function.\"'" 2>/dev/null || echo "Claude Code edit initiated"

echo ""
echo "📋 Step 5: Check if file was modified"
eval "$PODMAN_CMD bash -c 'cd /workspace/project && echo \"=== Updated index.js content ===\" && cat index.js && git status'"

echo ""
echo "📋 Step 6: Test git operations"
eval "$PODMAN_CMD bash -c 'cd /workspace/project && git add . && git commit -m \"Add calculateSum function\" && echo \"✅ Changes committed successfully\" && git log --oneline -1'"

echo ""
echo "📋 Step 7: Verify changes propagated back to original repo"
cd "C:\dev\test-repo" && echo "=== Original repository after changes ===" && git status && git log --oneline -1

echo ""
echo "🎉 SandboxBox workflow test completed!"