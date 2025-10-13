#!/bin/bash
set -e

echo "=== Git Remote Check ==="
git remote -v

echo "=== File Creation ==="
echo "test content from container" > test-file.txt

echo "=== Git Status ==="
git status

echo "=== Git Add ==="
git add test-file.txt

echo "=== Git Commit ==="
git commit -m "Test commit from container"

echo "=== Git Push ==="
git push -u origin master

echo "=== Done ==="