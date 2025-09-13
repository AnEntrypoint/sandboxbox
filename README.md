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

## Example Agent Prompts

These prompts demonstrate how agents can leverage MCP REPL's full capabilities:

### Code Analysis & Refactoring
```
Use MCP REPL to:
1. Search for all functions that handle user authentication in this codebase
2. Analyze the current implementation patterns using semantic search
3. Execute test cases to understand current behavior
4. Propose and test refactored implementations
5. Use batch execution to validate all changes work together
```

### Feature Development Workflow
```
Develop a new caching system using MCP REPL:
1. Use searchcode to find existing caching patterns in the codebase
2. Execute prototype implementations with executenodejs to test concepts
3. Use astgrep_search to find integration points
4. Implement and test the feature using batch execution
5. Use sequentialthinking to track design decisions and trade-offs
```

### Performance Optimization
```
Optimize database queries using MCP REPL:
1. Search for all database query functions with semantic search
2. Execute performance benchmarks using executenodejs
3. Use astgrep_analyze to understand query patterns
4. Test optimized implementations
5. Use batch_execute to run comparative performance tests
6. Document improvements using sequentialthinking
```

## Performance Analysis Results

Based on comprehensive testing comparing Claude Code with and without MCP REPL tools:

### Key Metrics
- **Context Optimization**: 89% reduction in redundant text (3,240 → 360 characters)
- **Token Efficiency**: 810 tokens saved per context window
- **Tool Performance**: <1ms load time (exceeds 50ms industry target)
- **Memory Usage**: 4.46MB (exceeds 100MB target)

### Analysis Style Comparison
- **With MCP REPL**: Concise, focused analysis with exact file paths and line numbers
- **Standard Claude**: Comprehensive coverage with structured documentation and roadmaps
- **Both Approaches**: Complementary - serve different analysis needs

### Real-World Test Results
Security audit task on complex Node.js application:
- **Standard Claude**: 246 lines of comprehensive analysis with implementation roadmap
- **MCP REPL**: 58 lines of focused technical analysis with precise code locations
- **Value**: Each approach serves different use cases effectively

For detailed performance analysis, see [claude-test-dir/performance-analysis.md](claude-test-dir/performance-analysis.md)

### Code Quality & Security
```
Conduct a security audit using MCP REPL:
1. Search for potential security vulnerabilities with semantic search
2. Use astgrep_lint to validate against security rules
3. Execute penetration test scripts
4. Use batch_execute to run comprehensive security scans
5. Generate remediation reports with structured findings
```

### Multi-Repository Analysis
```
Analyze architecture across multiple repositories:
1. Use searchcode to understand component relationships
2. Execute cross-repo dependency analysis
3. Use sequentialthinking to track architectural decisions
4. Generate integration documentation
5. Test deployment scenarios across repos
```

### Learning & Documentation
```
Generate comprehensive code documentation:
1. Use semantic search to find all public APIs
2. Execute code to understand behavior and edge cases
3. Use astgrep_analyze to extract function signatures and types
4. Batch execute usage examples
5. Structure findings into documentation using sequentialthinking
```

### Migration & Modernization
```
Modernize legacy code using MCP REPL:
1. Search for legacy patterns and dependencies
2. Execute compatibility tests
3. Use astgrep_replace for safe transformations
4. Batch test modernized implementations
5. Track migration progress with sequentialthinking
```

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