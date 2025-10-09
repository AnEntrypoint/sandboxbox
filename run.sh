#!/bin/bash

# Claudtainer - Simple Wrapper Script
# Usage: ./run.sh <command> [args]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the CLI
node "$SCRIPT_DIR/cli.js" "$@"