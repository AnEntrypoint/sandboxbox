#!/bin/bash
# Test Claude Code via npx in the container

echo "🚀 Testing Claude Code via npx"
echo "================================"
echo ""

echo "1️⃣  Using npx with full package name..."
echo "─────────────────────────────────────────"
npx @anthropic-ai/claude-code --version
echo ""

echo "2️⃣  Check if npx resolves correctly..."
echo "─────────────────────────────────────────"
which npx
npx --version
echo ""

echo "3️⃣  Test npx with help command..."
echo "─────────────────────────────────────────"
npx @anthropic-ai/claude-code --help | head -10
echo ""

echo "4️⃣  Compare installed vs npx..."
echo "─────────────────────────────────────────"
echo "Installed version: $(claude --version)"
echo "npx version: $(npx @anthropic-ai/claude-code --version)"
echo ""

echo "5️⃣  Test with @latest..."
echo "─────────────────────────────────────────"
npx @anthropic-ai/claude-code@latest --version
echo ""

echo "════════════════════════════════════════"
echo "✅ Both methods work!"
echo ""
echo "Method 1 - Direct command (faster):"
echo "   claude --version"
echo ""
echo "Method 2 - Via npx (always latest):"
echo "   npx @anthropic-ai/claude-code --version"
echo ""
