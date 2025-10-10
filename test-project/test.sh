#!/bin/bash
echo "=== Container Test ==="
echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la
echo ""
echo "Node version:"
node --version
echo ""
echo "Running Node script:"
node index.js
