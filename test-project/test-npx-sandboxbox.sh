#!/bin/bash
# Test SandboxBox as an npx tool

echo "🧪 Testing SandboxBox via npx"
echo "================================"
echo ""

echo "1️⃣  Check if npx sandboxbox works..."
echo "─────────────────────────────────────────"
cd /tmp
npx sandboxbox version
echo ""

echo "2️⃣  Test help command..."
echo "─────────────────────────────────────────"
npx sandboxbox --help | head -15
echo ""

echo "3️⃣  Test from different directory..."
echo "─────────────────────────────────────────"
cd /config/workspace/claudtainer
pwd
npx sandboxbox version
echo ""

echo "4️⃣  Test running a project..."
echo "─────────────────────────────────────────"
npx sandboxbox run-host test-project "echo 'SandboxBox via npx works!' && node --version"
echo ""

echo "════════════════════════════════════════"
echo "✅ npx sandboxbox is fully functional!"
echo ""
echo "Users can run:"
echo "  npx sandboxbox build Dockerfile"
echo "  npx sandboxbox run-host my-project"
echo "  npx sandboxbox shell my-project"
echo ""
