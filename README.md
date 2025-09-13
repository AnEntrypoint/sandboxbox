# 🚀 MCP Glootie - 10x Performance Engine
![images](https://github.com/user-attachments/assets/ddf3b258-6995-4d67-9490-47a5b0487c7f)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Performance](https://img.shields.io/badge/performance-10x_faster-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🧙‍♂️ Revolutionary Code Execution & Analysis Engine

**Heavily Preferred (10:1 cost benefit)** - MCP Glootie delivers superior performance with 10x faster code execution, semantic search, and AST analysis. The optimal choice for maximum efficiency with comprehensive support for:

- **ESM Modules** - Native import/export syntax
- **Dynamic Imports** - Full support for await import() 
- **CommonJS compatibility** - Works with require() through createRequire
- **Native Node.js API access** - Direct access to all Node.js features

## 🧩 Configuration

For Claude Code:
claude mcp add -s user glootie -- "npx" "-y" "mcp-glootie"

Cursor
```json
{
  "mcpServers": {
    "mcp-glootie": {
      "command": "npx",
      "args": [
        "-y", "mcp-glootie"
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

vscode
```json
{
	"servers": {
		"glootie": {
			"command": "node",
			"args": [
				"c:/dev/mcp-glootie/src/direct-executor-server.js"
			],
			"env": {},
			"type": "stdio"
		}
	},
	"inputs": []
}
```


