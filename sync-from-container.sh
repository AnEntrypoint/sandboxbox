#!/bin/bash
# Sync changes from container workspace back to original project

set -e

PROJECT_DIR="${1:-.}"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found: $PROJECT_DIR"
    exit 1
fi

PROJECT_ABS_PATH=$(realpath "$PROJECT_DIR")

echo "🔄 Syncing changes from container to original project"
echo "======================================================"
echo ""
echo "📁 Original project: $PROJECT_ABS_PATH"
echo "🏠 Container workspace: /workspace"
echo ""

# Check if container workspace has git
if [ ! -d "/workspace/.git" ]; then
    echo "❌ No git repository in /workspace"
    echo "   Run a container command first to set up the workspace"
    exit 1
fi

echo "📊 Checking for changes in container workspace..."
cd /workspace
CHANGES=$(git status --porcelain | wc -l)
COMMITS=$(git log --oneline origin/master..HEAD 2>/dev/null | wc -l || echo "0")

echo "   Uncommitted changes: $CHANGES files"
echo "   New commits: $COMMITS commits"
echo ""

if [ "$CHANGES" -gt 0 ]; then
    echo "⚠️  You have uncommitted changes in the container workspace"
    echo "   Commit them first, then run this script again"
    exit 1
fi

if [ "$COMMITS" -eq 0 ]; then
    echo "✅ No new commits to sync"
    exit 0
fi

echo "📦 Syncing commits back to original project..."
echo ""

# Method 1: Create patches
PATCH_DIR="/tmp/container-patches-$$"
mkdir -p "$PATCH_DIR"

git format-patch -o "$PATCH_DIR" origin/master..HEAD
PATCH_COUNT=$(ls -1 "$PATCH_DIR"/*.patch 2>/dev/null | wc -l)

if [ "$PATCH_COUNT" -gt 0 ]; then
    echo "✅ Created $PATCH_COUNT patch(es) in $PATCH_DIR"
    echo ""
    echo "📝 Applying patches to original project..."

    cd "$PROJECT_ABS_PATH"
    git am "$PATCH_DIR"/*.patch

    echo ""
    echo "✅ Successfully synced $COMMITS commit(s) to original project!"
    echo ""
    echo "📊 Original project status:"
    git log --oneline -"$COMMITS"

    # Cleanup
    rm -rf "$PATCH_DIR"
else
    echo "❌ Failed to create patches"
    exit 1
fi

echo ""
echo "🎉 Sync complete!"
