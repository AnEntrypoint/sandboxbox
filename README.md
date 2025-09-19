# MCP Glootie v3.2.0

Complete MCP (Model Context Protocol) server for advanced development tools with full feature set restored.

## Features

### Multi-Language Support
**Supported Languages**: JavaScript, TypeScript, Go, Rust, Python, C, C++

### Core Analysis Tools
- **searchcode** - Semantic code search with AI-powered discovery across all supported languages
- **parse_ast** - Code parsing with intelligent file reading and ignore filtering for understanding code structure
- **astgrep_search** - Structural code pattern matching with AST analysis for multi-language codebases
- **astgrep_replace** - Safe code refactoring with pattern-based transformations across languages
- **astgrep_lint** - Code quality analysis with custom AST pattern rules and ignore filtering

### Advanced Tools
- **batch_execute** - Coordinate multiple tools in single operations for efficiency
- **authoriza** - Bootstrap the system
- **attention-optimization** - Optimize attention windows for better analysis
- **turn-reduction** - Reduce conversation turns through intelligent coordination

### Execution Tools
- **execute** - Multi-language code execution with automatic runtime detection
  - **JavaScript/TypeScript** - Execute with Node.js or Deno
  - **Go** - Execute with `go run` (when Go CLI available)
  - **Rust** - Compile and execute with `rustc` (when Rust CLI available)
  - **Python** - Execute with `python3` (when Python CLI available)
  - **C** - Compile and execute with `gcc` (when GCC available)
  - **C++** - Compile and execute with `g++` (when G++ available)
  - **Bash** - Run bash commands securely
- **retrieve_overflow** - Handle large content from previous operations

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
        "execute",
        "retrieve_overflow",
        "searchcode",
        "astgrep_search",
        "astgrep_replace",
        "astgrep_lint",
        "parse_ast",
        "batch_execute",
        "begin"
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
        "execute",
        "retrieve_overflow",
        "searchcode",
        "astgrep_search",
        "astgrep_replace",
        "astgrep_lint",
        "parse_ast",
        "batch_execute",
        "begin"
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

## Recent Improvements

### AST Tool Consolidation (v3.2.0)
- **Consolidated overlapping tools** - Merged duplicate AST tools into a single comprehensive set
- **Enhanced batch execution** - Fixed "Missing required parameters" errors with intelligent file reading
- **Improved documentation** - Added detailed examples, use cases, and pattern syntax
- **Better validation** - Flexible parameter handling (accepts either code or filePath)
- **Multi-language support** - Consistent AST parsing across JavaScript, TypeScript, Go, Rust, Python, C, and C++

### Batch Execution Enhancements
- **Smart file reading** - Automatically reads files when filePath is provided without code
- **Improved error handling** - Better validation and recovery for failed operations
- **Enhanced integration** - Seamless coordination between AST tools in batch operations

## Tools

### Core AST Tools

#### parse_ast
Parse AST from code with intelligent file reading and ignore filtering. Automatically reads files when filePath is provided without code. Perfect for understanding code structure and preparing for transformations.

**Key Features:**
- Intelligent file reading (accepts either code or filePath)
- Multi-language support (JavaScript, TypeScript, Go, Rust, Python, C, C++)
- Automatic ignore pattern filtering
- Code structure analysis and syntax validation

**Use Cases:**
- Code structure analysis
- Component analysis and pattern extraction
- Syntax validation
- Code transformation preparation

#### astgrep_search
Structural code pattern matching using AST-grep syntax. Finds code patterns across files, not just text. Use for finding specific code structures, functions, classes, or patterns.

**Key Features:**
- Structural pattern matching (not just text search)
- Multi-language AST analysis
- Advanced pattern syntax with wildcards ($VARIABLE)
- File and directory scanning with ignore filtering

**Common Patterns:**
```
function $NAME($ARGS) { $BODY }           # Find function declarations
const $NAME = () => { $BODY }            # Find React components
interface $NAME { $MEMBERS }              # Find TypeScript interfaces
console.log($ARGS)                       # Find all console.log calls
import {$IMPORTS} from '$MODULE'         # Find specific import patterns
```

#### astgrep_replace
Structural code replacement using AST-grep syntax. Safely transform code patterns across files while preserving structure. More reliable than text-based replacements.

**Key Features:**
- Safe AST-based transformations
- Pattern-based refactoring across files
- Automatic backup creation
- Multi-language support

**Common Transformations:**
```
console.log($ARGS) → logger.info($ARGS)     # Replace console.log
var $NAME = $VALUE → let $NAME = $VALUE      # Convert var to let/const
require('$MODULE') → import $MODULE          # Update CommonJS to ES modules
```

#### astgrep_lint
Code quality analysis using AST patterns and ignore filtering. Define custom linting rules and apply them across your codebase. Perfect for enforcing coding standards and detecting patterns.

**Key Features:**
- Custom AST pattern rules
- Built-in quality rules (no-console, no-var, etc.)
- Multi-file linting with ignore patterns
- Severity levels (error/warning)

**Built-in Rules:**
- `no-console-log` - Detect console.log statements
- `no-debugger` - Find debugger statements
- `no-var` - Identify var declarations that should be const/let

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
