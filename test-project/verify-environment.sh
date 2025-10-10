#!/bin/bash
# Comprehensive environment verification script

echo "🔍 SandboxBox Environment Verification"
echo "========================================"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_tool() {
    local tool=$1
    local test_command=$2

    echo -n "Testing $tool... "
    if eval "$test_command" > /dev/null 2>&1; then
        echo "✅ PASS"
        ((TESTS_PASSED++))
    else
        echo "❌ FAIL"
        ((TESTS_FAILED++))
    fi
}

# Test basic user environment
echo "📋 User Environment:"
echo "   User: $(whoami)"
echo "   Home: $HOME"
echo "   PWD: $(pwd)"
echo ""

# Test development tools
echo "🛠️  Development Tools:"
test_tool "Node.js" "node --version"
test_tool "npm" "npm --version"
test_tool "Git" "git --version"
test_tool "Claude Code" "claude --version"
test_tool "Zsh" "zsh --version"
test_tool "Vim" "vim --version"
test_tool "jq" "jq --version"
echo ""

# Test directories
echo "📁 Directories:"
test_tool "/workspace" "[ -d /workspace ] && [ -w /workspace ]"
test_tool "/commandhistory" "[ -d /commandhistory ] && [ -w /commandhistory ]"
test_tool "Oh-My-Zsh" "[ -d ~/.oh-my-zsh ]"
echo ""

# Test npm global packages
echo "📦 npm Global Packages:"
test_tool "@anthropic-ai/claude-code" "npm list -g @anthropic-ai/claude-code --depth=0"
test_tool "@playwright/mcp" "npm list -g @playwright/mcp --depth=0"
echo ""

# Test network access
echo "🌐 Network Access:"
test_tool "DNS Resolution" "ping -c 1 google.com"
test_tool "HTTPS" "curl -s -I https://www.google.com"
echo ""

# Summary
echo "========================================"
echo "📊 Test Summary:"
echo "   ✅ Passed: $TESTS_PASSED"
echo "   ❌ Failed: $TESTS_FAILED"
echo "   📈 Total: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 All tests passed! Environment is fully functional."
    exit 0
else
    echo "⚠️  Some tests failed. Environment may have issues."
    exit 1
fi
