#!/bin/bash

# SandboxBox Launcher with Claude Auth Transfer
# Usage: ./launch-sandboxbox.sh <repository-path> [command]

set -e

REPO_PATH="${1:-.}"
COMMAND="${2:-claude}"

echo "🚀 Launching SandboxBox with Claude Code..."
echo "📁 Repository: $REPO_PATH"
echo "🔧 Command: $COMMAND"

# Get absolute path of repository
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    REPO_ABS_PATH=$(realpath "$REPO_PATH")
else
    REPO_ABS_PATH=$(realpath "$REPO_PATH")
fi

echo "📍 Absolute path: $REPO_ABS_PATH"

# Check if it's a git repository
if [ ! -d "$REPO_ABS_PATH/.git" ]; then
    echo "❌ Error: $REPO_ABS_PATH is not a git repository"
    echo "Please ensure the directory contains a .git folder"
    exit 1
fi

# Collect all Anthropic and Claude environment variables
ENV_ARGS=""
for var in $(env | grep -E "^(ANTHROPIC|CLAUDE)" | cut -d= -f1); do
    ENV_ARGS="$ENV_ARGS -e $var=${!var}"
done

# Add common development environment variables
for var in HOME USER SHELL PWD OLDPWD; do
    if [ -n "${!var}" ]; then
        ENV_ARGS="$ENV_ARGS -e $var=${!var}"
    fi
done

echo "🔑 Environment variables transferred: $(echo $ENV_ARGS | wc -w)"

# Find SandboxBox podman binary
PODMAN_PATH=""
if [ -f "bin/podman.exe" ]; then
    PODMAN_PATH="bin/podman.exe"
elif [ -f "bin/podman" ]; then
    PODMAN_PATH="bin/podman"
else
    # Try to find system podman
    PODMAN_PATH=$(which podman 2>/dev/null || echo "")
fi

if [ -z "$PODMAN_PATH" ]; then
    echo "❌ Error: Podman binary not found"
    echo "Please ensure SandboxBox is properly installed"
    exit 1
fi

echo "🐳 Using Podman: $PODMAN_PATH"

# Build the command with complete Claude session transfer
PODMAN_CMD="$PODMAN_PATH run --rm -it"
PODMAN_CMD="$PODMAN_CMD -v \"$REPO_ABS_PATH:/project\""
PODMAN_CMD="$PODMAN_CMD -v \"$HOME/.ssh:/root/.ssh:ro\""
PODMAN_CMD="$PODMAN_CMD -v \"$HOME/.gitconfig:/root/.gitconfig:ro\""
PODMAN_CMD="$PODMAN_CMD -v \"$HOME/.claude:/root/.claude\""
PODMAN_CMD="$PODMAN_CMD $ENV_ARGS"
PODMAN_CMD="$PODMAN_CMD --env REPO_PATH=/project"
PODMAN_CMD="$PODMAN_CMD --env HOME=/root"
PODMAN_CMD="$PODMAN_CMD sandboxbox-auth:latest"
PODMAN_CMD="$PODMAN_CMD $COMMAND"

echo "🎯 Running: $PODMAN_CMD"
echo ""

# Execute the command
eval $PODMAN_CMD