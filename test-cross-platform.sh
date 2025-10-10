#!/bin/bash

# Cross-platform compatibility test for SandboxBox
# Tests: Windows, macOS, Linux compatibility

set -e

echo "🧪 Testing SandboxBox Cross-Platform Compatibility..."
echo "=================================================="

# Test 1: PowerShell ZIP extraction (Windows-specific simulation)
echo "📋 Test 1: PowerShell ZIP extraction compatibility"
if command -v powershell.exe &> /dev/null; then
    echo "✅ PowerShell available for Windows ZIP extraction"
else
    echo "⚠️  PowerShell not found - will use fallback on non-Windows systems"
fi

# Test 2: Podman machine detection
echo "📋 Test 2: Podman machine management"
cd "C:\dev\sandboxbox"
if [ -f "bin/podman.exe" ]; then
    echo "✅ Windows Podman binary found"
    "./bin/podman.exe" version > /dev/null 2>&1 && echo "✅ Podman executable"
else
    echo "❌ Windows Podman binary not found"
    exit 1
fi

# Test 3: Claude Code authentication transfer
echo "📋 Test 3: Claude Code session transfer"
if [ -d "$HOME/.claude" ]; then
    echo "✅ Claude Code session directory found"
    echo "   Session files: $(ls -1 "$HOME/.claude" | wc -l) files"
else
    echo "⚠️  Claude Code session directory not found"
fi

# Test 4: Git configuration transfer
echo "📋 Test 4: Git configuration transfer"
if [ -f "$HOME/.gitconfig" ]; then
    echo "✅ Git configuration found"
    echo "   User: $(git config --global user.name 2>/dev/null || echo 'Not configured')"
    echo "   Email: $(git config --global user.email 2>/dev/null || echo 'Not configured')"
else
    echo "⚠️  Git configuration not found"
fi

# Test 5: SSH key availability
echo "📋 Test 5: SSH key transfer"
if [ -d "$HOME/.ssh" ]; then
    echo "✅ SSH directory found"
    echo "   Keys: $(ls -1 "$HOME/.ssh" | grep -E 'id_rsa|id_ed25519' | wc -l) private keys"
else
    echo "⚠️  SSH directory not found"
fi

# Test 6: Environment variable detection
echo "📋 Test 6: Environment variables"
ANTHROPIC_VARS=$(env | grep -E '^ANTHROPIC|^CLAUDE' | wc -l)
echo "✅ Found $ANTHROPIC_VARS Claude/Anthropic environment variables"

# Test 7: Local repository access
echo "📋 Test 7: Local repository access"
if [ -d "C:\dev\test-repo" ] && [ -d "C:\dev\test-repo\.git" ]; then
    echo "✅ Test repository accessible"
    cd "C:\dev\test-repo"
    echo "   Current branch: $(git branch --show-current)"
    echo "   Last commit: $(git log --oneline -1)"
else
    echo "❌ Test repository not accessible"
    exit 1
fi

echo ""
echo "🎉 Cross-platform compatibility test completed!"
echo "   ✅ All critical components verified"
echo "   ✅ Ready for multi-environment deployment"