# MCP Glootie v3.1.0

Complete MCP (Model Context Protocol) server for advanced development tools with full feature set restored.

## Features

### Core Analysis Tools
- **searchcode** - Semantic code search with AI-powered discovery
- **astgrep_search** - Structural code pattern matching with AST analysis
- **astgrep_replace** - Safe code refactoring with pattern-based transformations
- **astgrep_lint** - Code validation with custom rules and quality checks

### Advanced Tools
- **batch_execute** - Coordinate multiple tools in single operations for efficiency
- **sequentialthinking** - Structure and analyze complex thoughts systematically
- **attention-optimization** - Optimize attention windows for better analysis
- **turn-reduction** - Reduce conversation turns through intelligent coordination

### Execution Tools
- **executenodejs** - Execute JavaScript code with Node.js
- **executedeno** - Execute TypeScript/JavaScript with Deno
- **executebash** - Run bash commands securely
- **retrieve_overflow** - Handle large content from previous operations

## Installation

```bash
npm install -g mcp-glootie
```

## 🚀 Installation

### Claude Code
```bash
claude mcp add -s user glootie "npx" "-y" "mcp-glootie"
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
Search for code patterns across your codebase.

### astgrep_search
Find structural code patterns using AST matching.

### astgrep_replace
Safely transform code patterns with AST-based replacement.

### batch_execute
Coordinate multiple tools in single operations for efficiency.

### sequentialthinking
Structure complex thoughts systematically for better analysis.

## Architecture

- Clean, simple implementation following KISS principles
- Minimal dependencies and straightforward code structure
- Future-proof design with clear separation of concerns
- Focus on essential functionality without unnecessary complexity

## License

MIT
