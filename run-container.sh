#!/bin/bash
# Run a project in the built SandboxBox container environment

set -e

PROJECT_DIR="${1:-.}"
COMMAND="${2:-bash test.sh}"

echo "🚀 Running project in SandboxBox container environment"
echo "================================================"
echo ""
echo "📁 Project directory: $PROJECT_DIR"
echo "⚙️  Command: $COMMAND"
echo "👤 User: node"
echo "🏠 Workspace: /workspace"
echo ""

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Clean workspace
echo "🧹 Preparing workspace..."
sudo rm -rf /workspace/*

# Copy project to workspace with git setup
echo "📦 Setting up project clone..."
PROJECT_ABS_PATH=$(realpath "$PROJECT_DIR")

# Copy all files including hidden ones (except .git initially)
sudo -u node bash -c "shopt -s dotglob && cp -r '$PROJECT_DIR'/* /workspace/ 2>/dev/null || true"
sudo -u node bash -c "shopt -s dotglob && cp -r '$PROJECT_DIR'/.[!.]* /workspace/ 2>/dev/null || true"

# Set up git if original has .git
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "🔗 Setting up git repository with origin..."
    sudo -u node bash -c "
        cd /workspace
        # Initialize fresh git repo
        rm -rf .git
        git init -q
        git config user.name 'Container User'
        git config user.email 'container@sandboxbox.local'

        # Allow access to the original repo directory
        git config --global --add safe.directory '$PROJECT_ABS_PATH'
        git config --global --add safe.directory '$PROJECT_ABS_PATH/.git'

        # Add all files
        git add -A
        git commit -m 'Initial container workspace' -q || true

        # Add original directory as remote origin
        git remote add origin 'file://$PROJECT_ABS_PATH'

        # Fetch from origin to get branches
        git fetch origin -q 2>/dev/null || echo '  (origin fetch will work after safe.directory is configured)'

        echo '✅ Git configured - origin: $PROJECT_ABS_PATH'
        echo '   You can now: git pull origin main, git push origin master, etc.'
    "
else
    echo "ℹ️  No git repository in source (skipping git setup)"
fi

# Run command in workspace as node user
echo ""
echo "─────────────────────────────────────────────────"
echo "🎯 Executing in container environment:"
echo "─────────────────────────────────────────────────"
echo ""

sudo -u node bash -c "cd /workspace && $COMMAND"

EXIT_CODE=$?

echo ""
echo "─────────────────────────────────────────────────"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Container execution completed successfully!"
else
    echo "❌ Container execution failed with exit code: $EXIT_CODE"
fi
echo ""

exit $EXIT_CODE
