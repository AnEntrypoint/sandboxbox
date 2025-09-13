# MCP Glootie - Agentic Coding Optimizer

An MCP tool that improves the output and wall clock problem solving performance of your programming agent.

Glootie extrapolates on a senior developer's preferred workflows and diagnostic processes, making that functionality available to agents. The thinking is if 50% of a senior developer's coding effort is spent on this tool, then many best practices get captured in a way that other developers can pick up on and hopefully improve.

## What Glootie DOES Do

**Execute code first before editing** - You won't believe the advantage you get from just this. It encourages agents to hypothesize and test code before editing files, grounding edits in truth. Execute in the repo with available libraries for Node, Deno, and Bash.

**Semantic code searching** - Fast, compatible semantic search embedded in Glootie. No need for third-party code searches.

**Surgical code updates with AST-grep** - AST functionality is native to AI these days. Huge performance boost from access to it.

**Internal batch capabilities** - Trade multi-turn latency for bundling, drastically reducing turnaround speed where providers impose delays.

**Built-in step by step reasoning** - Optimized for daily use and token reduction. Agents can assign reasoning processes to project folders, enabling intelligent cross-repo work.

## What Glootie DOESN'T Do

Glootie is not a product - it's an in-house programming tool for an independent developer. You can receive the same benefits without making the same tools, but there's no company and there's no service.

## Tools (15 Total)

**Execution**: `executenodejs`, `executedeno`, `executebash`

**Search & Analysis**: `searchcode`, `astgrep_search`, `astgrep_replace`, `astgrep_lint`

**Project Intelligence**: `project_analyze`, `file_navigator`, `dependency_analyzer`, `performance_profiler`, `quality_analyzer`

**Utilities**: `retrieve_overflow`, `batch_execute`, `sequentialthinking`

## Installation

### Claude Code
```bash
claude mcp add -s user repl "npx" "-y" "mcp-repl"
```

### Cursor
Add to your Cursor `mcpServers.json` configuration:
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

### VSCode
Add to your VSCode MCP configuration:
```json
{
    "servers": {
        "repl": {
            "command": "node",
            "args": [
                "c:/dev/mcp-repl/src/direct-executor-server.js"
            ],
            "env": {},
            "type": "stdio"
        }
    },
    "inputs": []
}
```

## Dependencies

- `@modelcontextprotocol/sdk` (^1.11.0) - MCP SDK
- `@xenova/transformers` (^2.17.2) - Semantic search
- `@ast-grep/napi` (^0.28.0) - AST analysis
- `ignore` (^7.0.5) - .gitignore handling

**Requirements**: Node.js ≥16.0.0, 50MB+ memory, 100MB+ disk



## Contributing

1. Performance first: Maintain efficiency standards
2. Token efficiency: Tool descriptions <500 chars
3. MCP compliance: Follow protocol best practices
4. Testing: Full coverage with benchmarks

## License

MIT License

---

MCP Glootie - The most undervalued MCP tool. Let me know what you think of Glootie's performance.