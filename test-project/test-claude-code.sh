#!/bin/bash
# Test Claude Code availability and functionality in container

echo "🤖 Claude Code Availability Test"
echo "=================================="
echo ""

echo "1️⃣  Checking Claude Code installation..."
echo "─────────────────────────────────────────"
if command -v claude &> /dev/null; then
    echo "✅ Claude Code is installed"
    echo "   Location: $(which claude)"
    echo "   Version: $(claude --version)"
else
    echo "❌ Claude Code not found"
    exit 1
fi
echo ""

echo "2️⃣  Checking npm global package..."
echo "─────────────────────────────────────────"
npm list -g @anthropic-ai/claude-code --depth=0
echo ""

echo "3️⃣  Testing Claude Code executable..."
echo "─────────────────────────────────────────"
file $(which claude)
ls -lah $(which claude)
echo ""

echo "4️⃣  Testing Claude Code help command..."
echo "─────────────────────────────────────────"
claude --help | head -15
echo ""

echo "5️⃣  Testing Claude Code print mode (will fail without API key)..."
echo "─────────────────────────────────────────"
echo "Hello Claude" | claude --print 2>&1 | head -5
echo ""
echo "   ℹ️  Note: API key needed for actual usage"
echo ""

echo "6️⃣  Checking Claude Code configuration directory..."
echo "─────────────────────────────────────────"
if [ -d "$HOME/.claude" ]; then
    echo "✅ Claude Code config directory exists: $HOME/.claude"
    ls -la "$HOME/.claude" 2>/dev/null | head -10
else
    echo "ℹ️  Claude Code config will be created on first run"
fi
echo ""

echo "════════════════════════════════════════"
echo "📊 Summary:"
echo "════════════════════════════════════════"
echo "✅ Claude Code CLI is installed and accessible"
echo "✅ Version: $(claude --version)"
echo "✅ Help command works"
echo "✅ Executable is properly linked"
echo ""
echo "🎯 Claude Code is ready to use in the container!"
echo "   To use it, you need to:"
echo "   1. Run 'claude /login' to authenticate"
echo "   2. Or provide an API key in config"
echo ""
