# MCP REPL Configuration Guide for Claude Code

## Quick Setup

### Method 1: Using Claude CLI (Recommended)

```bash
# Add MCP REPL server to your Claude configuration
claude mcp add-json mcp-repl '{"command": "npx", "args": ["-y", "mcp-glootie"], "env": {"WORKING_DIRECTORY": "/path/to/your/project"}}'

# Verify the server was added
claude mcp list
```

### Method 2: Manual Configuration

1. **Create MCP configuration file** (e.g., `mcp-config.json`):
```json
{
  "mcpServers": {
    "mcp-repl": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {
        "WORKING_DIRECTORY": "/path/to/your/project"
      }
    }
  }
}
```

2. **Run Claude with MCP config**:
```bash
claude -p --mcp-config mcp-config.json "Your prompt here"
```

## Working Directory Configuration

### Static Working Directory
```json
{
  "mcpServers": {
    "mcp-repl": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {
        "WORKING_DIRECTORY": "/absolute/path/to/project"
      }
    }
  }
}
```

### Dynamic Working Directory (Using Environment Variable)
```json
{
  "mcpServers": {
    "mcp-repl": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {
        "WORKING_DIRECTORY": "$(pwd)"
      }
    }
  }
}
```

## Testing Your Setup

### Basic Test
```bash
claude -p "Use MCP REPL tools to analyze the current directory structure"
```

### Security Analysis Test
```bash
claude -p "Use searchcode and astgrep_search to find security vulnerabilities in JavaScript files"
```

### Performance Analysis Test
```bash
claude -p "Use astgrep_analyze to identify performance bottlenecks in the codebase"
```

## Common Issues and Solutions

### Issue: "Invalid MCP configuration"
**Solution**: Use `claude mcp add-json` instead of `--mcp-config` with inline JSON

### Issue: Tools not available
**Solution**:
1. Verify server is added: `claude mcp list`
2. Check server details: `claude mcp get mcp-repl`
3. Remove and re-add if needed: `claude mcp remove mcp-repl`

### Issue: Permission errors
**Solution**: Use `--dangerously-skip-permissions` if you trust the directory:
```bash
claude --dangerously-skip-permissions -p "Your prompt"
```

### Issue: Working directory not found
**Solution**: Ensure the WORKING_DIRECTORY path exists and is accessible

## Best Practices

### 1. **Project-Specific Configuration**
- Set up MCP configuration per project
- Use absolute paths for working directories
- Test configuration before complex tasks

### 2. **Tool Selection Guidelines**
- Use `searchcode` for semantic code discovery
- Use `astgrep_search` for pattern-based structural analysis
- Use `astgrep_analyze` for AST structure debugging
- Use `executenodejs` for JavaScript testing and validation

### 3. **Performance Optimization**
- MCP REPL v2.10.0 includes 89% context optimization
- Tools automatically prefer semantic search first
- Batch operations available for coordinated workflows

### 4. **Error Handling**
- Check tool outputs for specific error messages
- Verify working directory permissions
- Ensure MCP server is properly registered

## Example Prompts

### Security Audit
```bash
claude -p "Use MCP REPL tools to perform a comprehensive security audit. Focus on:
1. Authentication vulnerabilities using astgrep_search
2. Input validation issues with searchcode
3. Performance bottlenecks using astgrep_analyze
Provide specific file paths and line numbers."
```

### Code Refactoring
```bash
claude -p "Use MCP REPL tools to analyze and refactor this codebase:
1. Search for code duplication patterns
2. Identify architectural issues
3. Suggest specific refactoring improvements
Use astgrep_replace for safe code transformations."
```

### Performance Analysis
```bash
claude -p "Use MCP REPL tools to analyze performance:
1. Find N+1 query problems with astgrep_search
2. Identify memory leaks with searchcode
3. Suggest optimization strategies
Provide measurable improvement recommendations."
```

## Advanced Configuration

### Multiple Working Directories
```bash
# Different working directory per operation
claude -p "Use searchcode with workingDirectory '/project/src' to find security issues"
```

### Environment Variables
```json
{
  "mcpServers": {
    "mcp-repl": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {
        "WORKING_DIRECTORY": "/path/to/project",
        "NODE_ENV": "development",
        "DEBUG": "mcp-repl:*"
      }
    }
  }
}
```

This guide should help users properly configure and use MCP REPL tools with Claude Code for optimal performance and analysis capabilities.