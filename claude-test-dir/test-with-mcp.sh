#!/bin/bash

# Test Claude -p WITH MCP REPL tools
echo "=== CLAUDE -p TESTING WITH MCP REPL TOOLS ==="
echo "Test start time: $(date)"
echo "Working directory: $(pwd)"
echo ""

# Create results directory
mkdir -p results-with-mcp

# Setup MCP REPL configuration
export MCP_CONFIG="$(cat << 'EOF'
{
  "mcpServers": {
    "mcp-glootie": {
      "command": "npx",
      "args": ["-y", "mcp-glootie"],
      "env": {
        "WORKING_DIRECTORY": "$(pwd)"
      }
    }
  }
}
EOF
)"

# Test Task 1: Code Analysis and Security Audit
echo "🧪 TEST 1: Code Analysis and Security Audit"
echo "Prompt: Use MCP REPL tools to analyze security vulnerabilities and performance issues..."
start_time=$(date +%s%N)

timeout 300s claude -p --mcp-config "$MCP_CONFIG" "
I need you to perform a comprehensive security audit and performance analysis of this Node.js application using MCP REPL tools.

Tasks:
1. **Security Analysis**: Use searchcode and AST tools to find security vulnerabilities including authentication issues, input validation problems, and potential injection attacks
2. **Performance Optimization**: Use MCP tools to identify performance bottlenecks, inefficient database queries, and memory leaks
3. **Code Quality Assessment**: Use AST analysis tools to identify code quality issues, architectural problems, and best practices violations
4. **Error Handling Review**: Use code search to analyze error handling patterns and suggest improvements
5. **Scalability Assessment**: Use project analysis tools to evaluate the application's scalability and suggest improvements

The application is in the current directory. Please use MCP REPL tools for:
- Semantic code search with searchcode
- AST pattern matching with astgrep_search
- Code analysis with astgrep_analyze
- Performance profiling and benchmarking
- Project-wide analysis and validation

Provide:
- Specific vulnerabilities found with file paths and line numbers
- Performance bottlenecks with optimization recommendations
- Code quality issues with before/after examples
- Security remediation strategies
- Architectural improvement suggestions

Focus on actionable recommendations and use MCP tools to validate your findings." > results-with-mcp/test1-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 1 completed in ${duration}ms"
echo "Output saved to: results-with-mcp/test1-output.txt"
echo ""

# Test Task 2: Performance Optimization Implementation
echo "🧪 TEST 2: Performance Optimization Implementation"
echo "Prompt: Use MCP REPL tools to implement performance optimizations..."
start_time=$(date +%s%N)

timeout 300s claude -p --mcp-config "$MCP_CONFIG" "
Based on your previous analysis, I need you to implement performance optimizations for this Node.js application using MCP REPL tools.

Tasks:
1. **Database Optimization**: Use AST tools to find and fix N+1 query problems, implement proper indexing
2. **Caching Strategy**: Use code search and analysis to implement efficient caching with proper cache invalidation
3. **Memory Management**: Use AST analysis to find memory leaks and optimize memory usage
4. **Asynchronous Operations**: Use AST tools to convert blocking operations to non-blocking
5. **Algorithm Optimization**: Use performance profiling to improve inefficient algorithms and data structures

Please use MCP REPL tools for:
- Code transformation with astgrep_replace
- Performance benchmarking with execution tools
- AST pattern matching for optimization opportunities
- Batch execution for coordinated optimization tasks
- Validation of improvements with testing tools

Provide:
- Specific code changes with file paths and line numbers
- Before/after performance comparisons
- Implementation details for each optimization
- Testing strategies to validate improvements
- Rollback plans in case of issues

Use batch execution to coordinate multiple optimization tasks and validate results." > results-with-mcp/test2-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 2 completed in ${duration}ms"
echo "Output saved to: results-with-mcp/test2-output.txt"
echo ""

# Test Task 3: Security Hardening
echo "🧪 TEST 3: Security Hardening Implementation"
echo "Prompt: Use MCP REPL tools to implement security fixes..."
start_time=$(date +%s%N)

timeout 300s claude -p --mcp-config "$MCP_CONFIG" "
Now I need you to implement security hardening for this Node.js application using MCP REPL tools.

Tasks:
1. **Authentication Security**: Use AST tools to fix JWT verification, password hashing, and session management
2. **Input Validation**: Use code search and AST analysis to implement proper input sanitization and validation
3. **Injection Prevention**: Use AST pattern matching to fix NoSQL injection and other injection vulnerabilities
4. **Data Protection**: Use AST tools to implement proper data encryption and secure storage
5. **Access Control**: Use code analysis to implement proper authorization and access controls

Please use MCP REPL tools for:
- Security pattern detection with astgrep_lint
- Code transformation with astgrep_replace
- Security validation with rule testing tools
- Batch execution for coordinated security fixes
- Code analysis to verify security improvements

Provide:
- Specific security fixes with file paths and line numbers
- Code examples showing before/after implementations
- Security testing procedures
- Configuration recommendations
- Monitoring and logging improvements

Use AST tools to systematically identify and fix security vulnerabilities." > results-with-mcp/test3-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 3 completed in ${duration}ms"
echo "Output saved to: results-with-mcp/test3-output.txt"
echo ""

# Test Task 4: Architecture Refactoring
echo "🧪 TEST 4: Architecture Refactoring"
echo "Prompt: Use MCP REPL tools to refactor application architecture..."
start_time=$(date +%s%N)

timeout 300s claude -p --mcp-config "$MCP_CONFIG" "
I need you to refactor this Node.js application architecture for better scalability and maintainability using MCP REPL tools.

Tasks:
1. **Service Separation**: Use project analysis tools to break down the monolithic structure into separate services
2. **Database Optimization**: Use AST analysis to implement proper database design and indexing strategies
3. **API Design**: Use code analysis to improve API design with proper REST principles and documentation
4. **Error Handling**: Use AST tools to implement comprehensive error handling and recovery strategies
5. **Monitoring**: Use code analysis to add observability and monitoring capabilities

Please use MCP REPL tools for:
- Project-wide analysis with astgrep_project_scan
- Architecture pattern detection with enhanced search tools
- Code transformation for refactoring tasks
- Batch execution for coordinated architectural changes
- Validation and testing of architectural improvements

Provide:
- Architectural recommendations with clear separation of concerns
- Database schema improvements and indexing strategies
- API design improvements with proper endpoint structure
- Implementation details for each architectural change
- Testing and deployment strategies
- Performance and scalability projections

Use project analysis tools to understand the current architecture and plan improvements." > results-with-mcp/test4-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 4 completed in ${duration}ms"
echo "Output saved to: results-with-mcp/test4-output.txt"
echo ""

# Test Task 5: Testing and Quality Assurance
echo "🧪 TEST 5: Testing and Quality Assurance"
echo "Prompt: Use MCP REPL tools to create comprehensive testing strategy..."
start_time=$(date +%s%N)

timeout 300s claude -p --mcp-config "$MCP_CONFIG" "
I need you to create a comprehensive testing strategy and implementation for this Node.js application using MCP REPL tools.

Tasks:
1. **Unit Testing**: Use code analysis to create unit tests for core functionality and business logic
2. **Integration Testing**: Use AST tools to implement integration tests for API endpoints and database operations
3. **Security Testing**: Use security validation tools to create tests for authentication, authorization, and input validation
4. **Performance Testing**: Use execution tools to implement performance benchmarks and load testing
5. **E2E Testing**: Use batch execution to create end-to-end tests for critical user workflows

Please use MCP REPL tools for:
- Code analysis to identify testable components
- AST pattern matching to find testing opportunities
- Execution tools for running and validating tests
- Batch execution for coordinated testing workflows
- Code transformation to implement testing infrastructure

Provide:
- Test suite structure and organization
- Specific test cases for each testing category
- Test implementation examples using Jest and other testing tools
- Mock and stub strategies for external dependencies
- CI/CD integration recommendations
- Test coverage goals and reporting

Use MCP tools to automate test generation and validation where possible." > results-with-mcp/test5-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 5 completed in ${duration}ms"
echo "Output saved to: results-with-mcp/test5-output.txt"
echo ""

# Generate summary
echo ""
echo "=== CLAUDE -p TESTING WITH MCP REPL - SUMMARY ==="
echo "Test end time: $(date)"
echo ""

echo "Results saved to: results-with-mcp/"
echo ""

# Count lines in output files to estimate complexity
total_lines=0
for file in results-with-mcp/test*-output.txt; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    total_lines=$((total_lines + lines))
    echo "$(basename "$file"): $lines lines"
  fi
done

echo ""
echo "Total output lines: $total_lines"
echo "Estimated complexity: High (complex tasks with specialized MCP tools)"

cat << EOF > results-with-mcp/summary.txt
Claude -p Testing With MCP REPL Tools
Date: $(date)
Test Environment: $(pwd)
Node Version: $(node --version)
MCP Tools: mcp-glootie v2.10.0

Test Results:
1. Security & Performance Analysis: ~$(wc -l < results-with-mcp/test1-output.txt 2>/dev/null || echo "0") lines
2. Performance Optimization: ~$(wc -l < results-with-mcp/test2-output.txt 2>/dev/null || echo "0") lines
3. Security Hardening: ~$(wc -l < results-with-mcp/test3-output.txt 2>/dev/null || echo "0") lines
4. Architecture Refactoring: ~$(wc -l < results-with-mcp/test4-output.txt 2>/dev/null || echo "0") lines
5. Testing Strategy: ~$(wc -l < results-with-mcp/test5-output.txt 2>/dev/null || echo "0") lines

Total Output: ~$total_lines lines
Estimated Duration: 10-20 minutes total
Tools Used: MCP REPL tools (searchcode, astgrep_*, executenodejs, batch_execute, etc.)

Key Observations:
- Specialized tools enable systematic code analysis and transformation
- AST pattern matching provides precise code modification capabilities
- Batch execution allows coordinated multi-tool workflows
- Semantic search enables intelligent code discovery
- Performance profiling and validation tools provide measurable improvements
- Context optimization reduces overhead and improves efficiency

Next Steps: Compare performance and output quality with baseline
EOF

echo "Summary generated: results-with-mcp/summary.txt"