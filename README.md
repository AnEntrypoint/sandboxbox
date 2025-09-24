Complete MCP (Model Context Protocol) server for advanced development tools with full feature set restored.

The aim of the current version is to provide similar turn around times and more thoroughly investigated outputs than regular tooling, which will save you on rounds of physical interaction with the agent

## Features

### Multi-Language Support
**Supported Languages**: JavaScript, TypeScript, Go, Rust, Python, C, C++

### Built-in Auto-Hooks
- **Auto-linting**: Automatically lints files after editing operations (built into tools)
- **Context management**: Intelligent context awareness and session tracking
- **Zero configuration**: Works automatically without separate processes
- **Multi-language support**: ESLint and ast-grep integration for various languages

### Available Tools

#### Core Tools
- **begin** - Initialize the system and set working directory context
- **execute** - Multi-language code execution with automatic runtime detection
  - **JavaScript/TypeScript** - Execute with Node.js or Deno
  - **Go** - Execute with `go run` (when Go CLI available)
  - **Rust** - Compile and execute with `rustc` (when Rust CLI available)
  - **Python** - Execute with `python3` (when Python CLI available)
  - **C** - Compile and execute with `gcc` (when GCC available)
  - **C++** - Compile and execute with `g++` (when G++ available)
  - **Bash** - Run bash commands securely

#### Analysis Tools
- **searchcode** - Semantic code search with AI-powered discovery across all supported languages
- **ast_tool** - Unified AST operations combining code analysis, pattern search, safe replacement, and linting

#### Utility Tools
- **error_handling** - Enhanced error recovery and reporting
- **shared_hooks** - Shared functionality across tools
- **utilities** - Common utility functions and helpers
- **mcp_pagination** - MCP pagination utilities for handling large datasets

## Installation

### Local Development Setup

Since this is a development project, you'll need to set it up locally:

```bash
# Clone the repository
git clone https://github.com/AnEntrypoint/mcp-glootie.git
cd mcp-glootie

# Install dependencies
npm install
```

### Language Runtime Requirements

For full multi-language support, install the following CLI tools:

- **Go**: `go` - Install from https://golang.org/
- **Rust**: `rustc` and `cargo` - Install from https://rustup.rs/
- **Python**: `python3` - Usually pre-installed on Linux/macOS
- **C**: `gcc` - Install build-essential or Xcode Command Line Tools
- **C++**: `g++` - Included with gcc installation
- **Node.js**: `node` (≥16.0.0) - Install from https://nodejs.org/
- **Deno**: `deno` - Install from https://deno.land/

**Note**: The tools automatically detect which language runtimes are available and enable features accordingly.

## Client Configuration

### Claude Code
```bash
# Add the local server (replace /path/to with your actual path)
claude mcp add -s user glootie "node /path/to/mcp-glootie/src/index.js"
```

### Cursor
Add to your Cursor `mcpServers.json` configuration:
```json
{
  "mcpServers": {
    "glootie": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {},
      "disabled": false,
      "autoApprove": [
        "begin",
        "execute",
        "searchcode",
        "ast_tool"
      ]
    }
  }
}
```

### GitHub Copilot
Add to your GitHub Copilot `mcpServers.json` configuration:
```json
{
  "mcpServers": {
    "glootie": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {},
      "type": "local",
      "tools": [
        "begin",
        "execute",
        "searchcode",
        "ast_tool"
      ]
    }
  }
}
```

### VSCode
Add to your VSCode MCP configuration:
```json
{
    "servers": {
        "glootie": {
            "command": "npx",
            "args": ["-y", "mcp-glootie"],
            "env": {},
            "type": "stdio"
        }
    },
    "inputs": []
}
```

**Note**: For Claude Code, replace `/path/to/mcp-glootie` with the actual path to your cloned repository. For other clients using npx, the package will be downloaded automatically.

## Built-in Auto-Hooks

### Zero-Configuration Auto-Linting

Glootie now includes built-in auto-linting that works automatically without any setup:

- **Automatic Detection**: Tools automatically detect when files are modified
- **Smart Linting**: Uses ESLint when available, falls back to ast-grep patterns
- **Multi-Language**: Supports JavaScript, TypeScript, Python, and more
- **Zero Setup**: No separate processes or configuration required

### Auto-Linting Features

- **ESLint Integration**: Automatically uses project ESLint configuration when available
- **AST Grep Fallback**: Built-in linting patterns for projects without ESLint
- **Real-time Feedback**: Linting results displayed immediately after file operations
- **Non-blocking**: Linting errors don't prevent operations, just provide guidance
- **Multi-tool**: Works with ast_tool, execute, and other file-modifying operations

### Usage

Auto-linting works automatically - no configuration needed:

```bash
# Just use the tools normally - auto-linting happens automatically
ast_tool(operation="replace", pattern="var $NAME", replacement="let $NAME", path="./src")
```

The tools will automatically:
1. Detect file modifications
2. Run appropriate linters (ESLint or ast-grep)
3. Display results with actionable feedback
4. Continue operation even if linting fails

## Recent Improvements

### Built-in Hooks Integration (v3.2.15)
- **Eliminated separate hook startup** - Auto-linting now works automatically within tools
- **Zero configuration** - No separate processes or setup required for hooks
- **Smart linting** - Automatically uses ESLint when available, falls back to ast-grep patterns
- **Multi-language support** - Auto-linting works with JavaScript, TypeScript, Python, and more
- **Non-blocking operation** - Linting provides guidance without preventing operations

### AST Tool Consolidation (v3.2.2)
- **Unified AST tool** - Consolidated 4 separate AST tools into 1 unified interface
- **Enhanced ast-grep integration** - Comprehensive ast-grep capabilities with YAML configuration support
- **Improved working directory handling** - Fixed critical working directory mismatch issues
- **Code cleanup** - Removed redundant files and cleaned up exports for better maintainability
- **Better performance** - Optimized implementation with reduced context overhead

### Auto-Linting Enhancements
- **Real-time feedback** - Linting results displayed immediately after file operations
- **Smart fallback** - Uses ESLint when available, ast-grep patterns otherwise
- **Multi-tool integration** - Works with ast_tool, execute, and other file-modifying operations
- **Actionable results** - Provides specific guidance for fixing linting issues

## Tools

### Core AST Tools

#### ast_tool
Unified AST operations combining code analysis, pattern search, safe replacement, and linting in one powerful tool. This consolidates the previous 4 separate AST tools to reduce choice paralysis and provide a consistent interface.

**Operations:**
- **analyze** - Parse code structure, count functions/classes/imports, validate syntax
- **search** - Find structural code patterns using AST matching with wildcards
- **replace** - Safely transform code patterns while preserving syntax
- **lint** - Apply custom linting rules using AST patterns

**Key Features:**
- Single unified interface for all AST operations
- Intelligent file reading (accepts either code or filePath)
- Multi-language support (JavaScript, TypeScript, Go, Rust, Python, C, C++)
- Advanced ast-grep pattern matching with YAML configuration support
- Relational constraints and composite rule types
- Automatic ignore pattern filtering
- Advanced pattern syntax with wildcards ($VARIABLE)
- Safe AST-based transformations with automatic backups

**Examples:**
```javascript
// Analyze code structure
ast_tool(operation="analyze", path="./src", analysisType="detailed")

// Find React components
ast_tool(operation="search", pattern="const $NAME = ($PROPS) => { $BODY }")

// Replace console.log with logger
ast_tool(operation="replace", pattern="console.log($MSG)", replacement="logger.info($MSG)")

// Lint for code quality issues
ast_tool(operation="lint", path="./src", rules=[custom_rules])
```

**Common Patterns:**
```
function $NAME($ARGS) { $BODY }           # Find function declarations
const $NAME = ($PROPS) => { $BODY }        # Find React components
interface $NAME { $MEMBERS }              # Find TypeScript interfaces
console.log($ARGS)                       # Find console.log calls
var $NAME = $VALUE → let $NAME = $VALUE      # Convert var to let/const
```

### Execution Tools

#### execute
Execute code in multiple languages with automatic runtime detection and CLI tool integration.

#### batch_execute
Coordinate multiple tools in single operations for efficiency across different languages. Now supports intelligent file reading for AST operations.

**Key Improvements:**
- Automatic file reading when filePath provided without code
- Improved error handling and validation
- Better integration with AST tools

### Analysis Tools

#### searchcode
Search for code patterns across your multi-language codebase with semantic understanding.

#### sequentialthinking
Structure complex thoughts systematically for better analysis.

## Testing

The project includes a comprehensive performance testing suite (`test-runner.cjs`) that:

- **Parallel Testing**: Runs baseline vs MCP-optimized tests simultaneously
- **Real-time Monitoring**: Incremental file writing prevents stuck processes
- **Comprehensive Analysis**: Tracks tool usage, performance metrics, and MCP server status
- **Automatic Reporting**: Generates detailed analysis reports and suggestions

### Test Runner Features

- **Optimized Incremental File Writing**: Step data written every 25 operations for better performance
- **Process Monitoring**: Real-time updates during test execution
- **Working Directory Fixes**: Critical fix for analyzing correct codebase instead of parent directories
- **Error Recovery**: Graceful handling of failed tests with detailed error reporting
- **Performance Metrics**: Measures speed improvements and tool effectiveness
- **Status Tracking**: Proper MCP server status tracking for baseline vs MCP tests

Run tests with:
```bash
node test-runner.cjs
```

## Architecture

- Clean, simple implementation following KISS principles
- Minimal dependencies and straightforward code structure
- Future-proof design with clear separation of concerns
- Focus on essential functionality without unnecessary complexity
- Robust testing infrastructure with incremental progress tracking

## License

MIT
