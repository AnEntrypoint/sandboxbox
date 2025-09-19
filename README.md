# MCP Glootie v3.2.0

Complete MCP (Model Context Protocol) server for advanced development tools with full feature set restored.

## Features

### Multi-Language Support
**Supported Languages**: JavaScript, TypeScript, Go, Rust, Python, C, C++

### Core Analysis Tools
- **searchcode** - Semantic code search with AI-powered discovery across all supported languages
- **astgrep_search** - Structural code pattern matching with AST analysis for multi-language codebases
- **astgrep_replace** - Safe code refactoring with pattern-based transformations across languages
- **astgrep_lint** - Code validation with custom rules and quality checks for all languages

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

```bash
npm install -g mcp-glootie
```

### Language Runtime Requirements

For full multi-language support, install the following CLI tools:

- **Go**: `go` - Install from https://golang.org/
- **Rust**: `rustc` and `cargo` - Install from https://rustup.rs/
- **Python**: `python3` - Usually pre-installed on Linux/macOS
- **C**: `gcc` - Install build-essential or Xcode Command Line Tools
- **C++**: `g++` - Included with gcc installation
- **Node.js**: `node` - Install from https://nodejs.org/
- **Deno**: `deno` - Install from https://deno.land/

**Note**: The tools automatically detect which language runtimes are available and enable features accordingly.

## 🚀 Installation

### Claude Code
```bash
claude mcp add -s user glootie "npx -y mcp-glootie"
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
        "executenodejs",
        "executedeno",
        "executebash",
        "retrieve_overflow",
        "searchcode",
        "astgrep_search",
        "astgrep_replace",
        "astgrep_lint",
        "batch_execute",
        "sequentialthinking"
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
        "executenodejs",
        "executedeno",
        "executebash",
        "retrieve_overflow",
        "searchcode",
        "astgrep_search",
        "astgrep_replace",
        "astgrep_lint",
        "batch_execute",
        "sequentialthinking"
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

## Tools

### searchcode
Search for code patterns across your multi-language codebase with semantic understanding.

### astgrep_search
Find structural code patterns using AST matching across JavaScript, TypeScript, Go, Rust, Python, C, and C++.

### astgrep_replace
Safely transform code patterns with AST-based replacement for all supported languages.

### execute
Execute code in multiple languages with automatic runtime detection and CLI tool integration.

### batch_execute
Coordinate multiple tools in single operations for efficiency across different languages.

### sequentialthinking
Structure complex thoughts systematically for better analysis.

## Testing

The project includes a comprehensive performance testing suite (`test-runner.cjs`) that:

- **Parallel Testing**: Runs baseline vs MCP-optimized tests simultaneously
- **Real-time Monitoring**: Incremental file writing prevents stuck processes
- **Comprehensive Analysis**: Tracks tool usage, performance metrics, and MCP server status
- **Automatic Reporting**: Generates detailed analysis reports and suggestions

### Test Runner Features

- **Incremental File Writing**: Step data written every 10 operations to prevent hanging
- **Process Monitoring**: Real-time updates during test execution
- **Error Recovery**: Graceful handling of failed tests with detailed error reporting
- **Performance Metrics**: Measures speed improvements and tool effectiveness

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
