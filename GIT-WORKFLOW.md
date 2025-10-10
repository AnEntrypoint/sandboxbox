# Git Workflow

## Overview

When you run a project in the container, it automatically sets up git with your **original project directory as the remote origin**. This means you can use regular git commands to work with your repository.

## How It Works

```
Original Project          Container Workspace
../myproject     ←───→    /workspace
(git origin)              (working copy)
```

The container:
1. Copies your project files to `/workspace`
2. Initializes a git repository
3. **Sets your original directory as remote `origin`**
4. You can use normal git commands: `git pull`, `git push`, `git fetch`

## Basic Workflow

### 1. Run Container

```bash
npx sandboxbox run-host ../myproject
```

The container automatically sets up git with origin pointing to `../myproject`.

### 2. Work in Container

```bash
# Enter interactive shell
./enter-shell.sh

# Make changes
cd /workspace
vim lib/myfile.js

# Commit changes
git add -A
git commit -m "Add new feature"
```

### 3. Push to Original

```bash
# Push directly to origin (your original project)
git push origin master
```

That's it! No sync scripts needed - just use regular git commands.

## Common Commands

### Check Git Status
```bash
npx sandboxbox run-host ../myproject "git status"
```

### View Remote
```bash
npx sandboxbox run-host ../myproject "git remote -v"
# Output: origin  file:///path/to/original/project (fetch/push)
```

### Pull Latest Changes
```bash
npx sandboxbox run-host ../myproject "git pull origin main"
```

### Push Changes
```bash
npx sandboxbox run-host ../myproject "git push origin master"
```

### View Commit History
```bash
npx sandboxbox run-host ../myproject "git log --oneline -10"
```

## Interactive Development

```bash
# Enter interactive shell
./enter-shell.sh

# Work in workspace
cd /workspace

# Make changes
vim lib/feature.js
npm test

# Commit
git add -A
git commit -m "Implement feature"

# Push to original
git push origin master

# Exit
exit
```

## Benefits

✅ **Simple** - Just use regular git commands
✅ **Direct** - No sync scripts or patches needed
✅ **Familiar** - Works like any git repository
✅ **Safe** - Container isolation protects your original files

## Notes

- The original directory is set up as `origin` using the `file://` protocol
- You can push/pull like a normal git remote
- The container has a fresh git repo that treats your project as origin
- Original files are never directly modified - only through git operations
