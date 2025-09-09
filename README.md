# 🚀 MCP REPL Executor

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🧙‍♂️ Simplified JavaScript Execution Environment

A streamlined direct Node.js execution environment that enables seamless code execution with full support for:

- **ESM Modules** - Native import/export syntax
- **Dynamic Imports** - Full support for await import() 
- **CommonJS compatibility** - Works with require() through createRequire
- **Native Node.js API access** - Direct access to all Node.js features

## 🧩 Configuration

For Claude Code:
claude mcp add -s uer repl -- "npx" "-y" "-s" "user" "mcp-repl"

Cursor
```json
{
  "mcpServers": {
    "mcp-repl": {
      "command": "npx",
      "args": [
        "-y", "mcp-repl"
      ],
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
        "astgrep_analyze",
        "astgrep_enhanced_search",
        "astgrep_multi_pattern",
        "astgrep_constraint_search",
        "astgrep_project_init",
        "astgrep_project_scan",
        "astgrep_test",
        "astgrep_validate_rules",
        "astgrep_debug_rule",
        "batch_execute",
        "sequentialthinking"]
    }
  }
}
```

github copilot
```json
{
  "mcpServers": {
    "repl": {
      "command": "npx",
      "args": ["-y", "@anentrypoint/mcp-repl"],
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
        "astgrep_analyze",
        "astgrep_enhanced_search",
        "astgrep_multi_pattern",
        "astgrep_constraint_search",
        "astgrep_project_init",
        "astgrep_project_scan",
        "astgrep_test",
        "astgrep_validate_rules",
        "astgrep_debug_rule",
        "batch_execute",
        "sequentialthinking"
      ]
    }
  }
}
```


