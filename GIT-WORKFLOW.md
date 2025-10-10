# Git Workflow in SandboxBox Container

## Overview

When you run a project in the SandboxBox container, it creates an isolated clone with the original project directory set as the git remote origin. This allows you to:

1. ✅ Work in isolation (container doesn't edit original files directly)
2. ✅ Commit changes in the container
3. ✅ Sync changes back to the original project
4. ✅ Maintain git history

## How It Works

### Container Setup

When you run: `npx sandboxbox run-host ../myproject`

The container automatically:
1. Copies all files to `/workspace` (including hidden files)
2. Initializes a fresh git repository
3. Commits all files as "Initial container workspace"
4. Adds the original directory as remote `origin`
5. Configures git safe.directory for access

```
Original Project          Container Workspace
../myproject     ←───→    /workspace
(origin)                  (working copy)
```

### Git Configuration

The container workspace has:
```bash
User: Container User <container@sandboxbox.local>
Remote origin: file:///path/to/original/project
Branch: master
```

## Basic Workflow

### 1. Make Changes in Container

```bash
# Run container
npx sandboxbox run-host ../flowstate

# Or interactive
./enter-shell.sh
cd /workspace

# Make changes
vim lib/myfile.js
```

### 2. Commit in Container

```bash
npx sandboxbox run-host ../flowstate "
  git add -A
  git commit -m 'Add new feature'
"
```

### 3. Sync Back to Original

**Option A: Using sync script** (Recommended)
```bash
# From host, pull changes from container workspace
./sync-from-container.sh ../flowstate
```

**Option B: Manual with patches**
```bash
# In container, create patches
npx sandboxbox run-host ../flowstate "
  git format-patch -o /workspace/patches origin/master..HEAD
"

# In original project, apply patches
cd ../flowstate
git am /workspace/patches/*.patch
```

**Option C: Fetch from workspace**
```bash
# In original project
cd ../flowstate
git fetch file:///workspace master:container-work
git merge container-work
```

## Common Scenarios

### Scenario 1: Quick Changes

```bash
# 1. Run container and make changes
npx sandboxbox run-host ../myproject "
  echo '// New feature' >> lib/new-feature.js
  git add lib/new-feature.js
  git commit -m 'Add new feature'
"

# 2. Sync back
./sync-from-container.sh ../myproject
```

### Scenario 2: Interactive Development

```bash
# 1. Enter container
./enter-shell.sh

# 2. Work in /workspace
cd /workspace
vim lib/code.js
npm test
git add -A
git commit -m 'Fix bug'
exit

# 3. Sync changes back
./sync-from-container.sh ../myproject
```

### Scenario 3: Multiple Commits

```bash
# Work in container, make multiple commits
npx sandboxbox run-host ../myproject "
  # First change
  echo 'change 1' >> file1.js
  git add file1.js
  git commit -m 'Change 1'

  # Second change
  echo 'change 2' >> file2.js
  git add file2.js
  git commit -m 'Change 2'
"

# Sync all commits back at once
./sync-from-container.sh ../myproject
```

### Scenario 4: Review Before Sync

```bash
# See what changed in container
npx sandboxbox run-host ../myproject "
  git log --oneline origin/master..HEAD
  git diff origin/master..HEAD
"

# Create patches for manual review
npx sandboxbox run-host ../myproject "
  git format-patch -o /workspace/patches origin/master..HEAD
"

# Review patches
cat /workspace/patches/*.patch

# Apply if good
cd ../myproject
git am /workspace/patches/*.patch
```

## Sync Script Usage

### sync-from-container.sh

```bash
# Sync changes from container workspace to original
./sync-from-container.sh <project-directory>

# Example
./sync-from-container.sh ../flowstate
```

**What it does:**
1. Checks for uncommitted changes (requires clean workspace)
2. Counts commits ahead of origin
3. Creates patches for each commit
4. Applies patches to original project
5. Cleans up temporary files

**Output:**
```
🔄 Syncing changes from container to original project
📁 Original project: /path/to/flowstate
🏠 Container workspace: /workspace
📊 Checking for changes...
   Uncommitted changes: 0 files
   New commits: 2 commits
📦 Syncing commits back to original project...
✅ Created 2 patch(es)
📝 Applying patches to original project...
✅ Successfully synced 2 commit(s)!
```

## Why This Approach?

### Advantages

1. **Isolation**: Container never modifies original files directly
2. **Safety**: All changes are committed before syncing
3. **History**: Full git history preserved
4. **Reversible**: Can discard container changes without affecting original
5. **Clean**: Original project stays clean during experiments

### How It Prevents Direct Edits

```
❌ Without isolation:
./myproject/code.js  ←  Direct edits (risky)

✅ With SandboxBox:
./myproject/code.js  (unchanged)
/workspace/code.js   ←  Edit here (isolated)
                     ↓
                  git commit
                     ↓
              sync script applies
                     ↓
./myproject/code.js  (updated safely)
```

## Git Commands in Container

### Check Status
```bash
npx sandboxbox run-host ../myproject "git status"
```

### View History
```bash
npx sandboxbox run-host ../myproject "git log --oneline -10"
```

### See Changes
```bash
npx sandboxbox run-host ../myproject "git diff"
```

### View Commits Not in Origin
```bash
npx sandboxbox run-host ../myproject "
  git log --oneline origin/master..HEAD
"
```

### Create Branch
```bash
npx sandboxbox run-host ../myproject "
  git checkout -b feature-branch
  echo 'new feature' >> feature.js
  git add feature.js
  git commit -m 'Add feature'
"
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────┐
│ 1. Start Container                                  │
│    npx sandboxbox run-host ../myproject             │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│ 2. Container Setup (Automatic)                      │
│    • Copy files to /workspace                       │
│    • Init git with origin = original project        │
│    • Configure safe.directory                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│ 3. Work in Container                                │
│    • Edit files                                     │
│    • Run tests                                      │
│    • Commit changes                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│ 4. Sync Back to Original                            │
│    ./sync-from-container.sh ../myproject            │
│    • Creates patches from commits                   │
│    • Applies to original project                    │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### "Uncommitted changes" Error

```bash
# Commit or stash changes first
npx sandboxbox run-host ../myproject "
  git add -A
  git commit -m 'Work in progress'
"
```

### Check What Would Be Synced

```bash
npx sandboxbox run-host ../myproject "
  git log --oneline --stat origin/master..HEAD
"
```

### Discard Container Changes

Just don't run the sync script. Container changes stay isolated in `/workspace`.

### Sync Specific Commits Only

```bash
# Create patches for specific range
npx sandboxbox run-host ../myproject "
  git format-patch -o /workspace/patches abc123..def456
"

# Apply manually
cd ../myproject
git am /workspace/patches/*.patch
```

## Best Practices

1. **Commit Often**: Make small, focused commits in container
2. **Review Before Sync**: Check `git log` before syncing
3. **Test First**: Run tests in container before syncing back
4. **Clean Workspace**: Ensure no uncommitted changes before sync
5. **Descriptive Messages**: Use clear commit messages

## Integration with Claude Code

Use Claude Code to help with git workflow:

```bash
# Ask Claude to review changes
npx sandboxbox run-host ../myproject "
  git diff | claude --print 'Review this diff for issues'
"

# Generate commit message
npx sandboxbox run-host ../myproject "
  git diff --cached | claude --print 'Suggest a commit message'
"
```

## Summary

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  Git Workflow: Container Isolation + Safe Sync              ║
║                                                              ║
║  1. Container creates isolated workspace                    ║
║  2. Original project = git remote origin                    ║
║  3. Work and commit in container                            ║
║  4. Sync back with sync-from-container.sh                   ║
║                                                              ║
║  ✅ Original files never edited directly                     ║
║  ✅ Full git history preserved                               ║
║  ✅ Safe and reversible workflow                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```
