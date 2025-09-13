#!/bin/bash

# Test Claude -p WITHOUT MCP REPL tools
echo "=== CLAUDE -p TESTING WITHOUT MCP REPL TOOLS ==="
echo "Test start time: $(date)"
echo "Working directory: $(pwd)"
echo ""

# Create results directory
mkdir -p results-without-mcp

# Test Task 1: Code Analysis and Security Audit
echo "🧪 TEST 1: Code Analysis and Security Audit"
echo "Prompt: Analyze this Node.js application for security vulnerabilities and performance issues..."
start_time=$(date +%s%N)

timeout 300s claude -p "
I need you to perform a comprehensive security audit and performance analysis of this Node.js application.

Tasks:
1. **Security Analysis**: Identify all security vulnerabilities including authentication issues, input validation problems, and potential injection attacks
2. **Performance Optimization**: Find performance bottlenecks, inefficient database queries, and memory leaks
3. **Code Quality Assessment**: Identify code quality issues, architectural problems, and best practices violations
4. **Error Handling Review**: Analyze error handling patterns and suggest improvements
5. **Scalability Assessment**: Evaluate the application's scalability and suggest improvements

The application is in the current directory. Please provide:
- Specific vulnerabilities found with file paths and line numbers
- Performance bottlenecks with optimization recommendations
- Code quality issues with before/after examples
- Security remediation strategies
- Architectural improvement suggestions

Focus on actionable recommendations with clear implementation steps." > results-without-mcp/test1-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 1 completed in ${duration}ms"
echo "Output saved to: results-without-mcp/test1-output.txt"
echo ""

# Test Task 2: Performance Optimization Implementation
echo "🧪 TEST 2: Performance Optimization Implementation"
echo "Prompt: Fix the performance issues identified in the analysis..."
start_time=$(date +%s%N)

timeout 300s claude -p "
Based on your previous analysis, I need you to implement performance optimizations for this Node.js application.

Tasks:
1. **Database Optimization**: Fix N+1 query problems and implement proper indexing
2. **Caching Strategy**: Implement efficient caching with proper cache invalidation
3. **Memory Management**: Fix memory leaks and optimize memory usage
4. **Asynchronous Operations**: Convert blocking operations to non-blocking
5. **Algorithm Optimization**: Improve inefficient algorithms and data structures

Please provide:
- Specific code changes with file paths and line numbers
- Before/after performance comparisons
- Implementation details for each optimization
- Testing strategies to validate improvements
- Rollback plans in case of issues

Focus on the most impactful optimizations first and provide clear implementation guidance." > results-without-mcp/test2-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 2 completed in ${duration}ms"
echo "Output saved to: results-without-mcp/test2-output.txt"
echo ""

# Test Task 3: Security Hardening
echo "🧪 TEST 3: Security Hardening Implementation"
echo "Prompt: Implement security fixes for the vulnerabilities identified..."
start_time=$(date +%s%N)

timeout 300s claude -p "
Now I need you to implement security hardening for this Node.js application.

Tasks:
1. **Authentication Security**: Fix JWT verification, password hashing, and session management
2. **Input Validation**: Implement proper input sanitization and validation
3. **Injection Prevention**: Fix NoSQL injection and other injection vulnerabilities
4. **Data Protection**: Implement proper data encryption and secure storage
5. **Access Control**: Implement proper authorization and access controls

Please provide:
- Specific security fixes with file paths and line numbers
- Code examples showing before/after implementations
- Security testing procedures
- Configuration recommendations
- Monitoring and logging improvements

Focus on critical security issues first and provide defense-in-depth strategies." > results-without-mcp/test3-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 3 completed in ${duration}ms"
echo "Output saved to: results-without-mcp/test3-output.txt"
echo ""

# Test Task 4: Architecture Refactoring
echo "🧪 TEST 4: Architecture Refactoring"
echo "Prompt: Refactor the application architecture for better scalability..."
start_time=$(date +%s%N)

timeout 300s claude -p "
I need you to refactor this Node.js application architecture for better scalability and maintainability.

Tasks:
1. **Service Separation**: Break down the monolithic structure into separate services
2. **Database Optimization**: Implement proper database design and indexing strategies
3. **API Design**: Improve API design with proper REST principles and documentation
4. **Error Handling**: Implement comprehensive error handling and recovery strategies
5. **Monitoring**: Add observability and monitoring capabilities

Please provide:
- Architectural recommendations with clear separation of concerns
- Database schema improvements and indexing strategies
- API design improvements with proper endpoint structure
- Implementation details for each architectural change
- Testing and deployment strategies
- Performance and scalability projections

Focus on practical improvements that can be implemented incrementally." > results-without-mcp/test4-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 4 completed in ${duration}ms"
echo "Output saved to: results-without-mcp/test4-output.txt"
echo ""

# Test Task 5: Testing and Quality Assurance
echo "🧪 TEST 5: Testing and Quality Assurance"
echo "Prompt: Create a comprehensive testing strategy for this application..."
start_time=$(date +%s%N)

timeout 300s claude -p "
I need you to create a comprehensive testing strategy and implementation for this Node.js application.

Tasks:
1. **Unit Testing**: Create unit tests for core functionality and business logic
2. **Integration Testing**: Implement integration tests for API endpoints and database operations
3. **Security Testing**: Create security tests for authentication, authorization, and input validation
4. **Performance Testing**: Implement performance benchmarks and load testing
5. **E2E Testing**: Create end-to-end tests for critical user workflows

Please provide:
- Test suite structure and organization
- Specific test cases for each testing category
- Test implementation examples using Jest and other testing tools
- Mock and stub strategies for external dependencies
- CI/CD integration recommendations
- Test coverage goals and reporting

Focus on practical testing that can be implemented quickly and provides good coverage." > results-without-mcp/test5-output.txt 2>&1

end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))
echo "Test 5 completed in ${duration}ms"
echo "Output saved to: results-without-mcp/test5-output.txt"
echo ""

# Generate summary
echo ""
echo "=== CLAUDE -p TESTING WITHOUT MCP REPL - SUMMARY ==="
echo "Test end time: $(date)"
echo ""

echo "Results saved to: results-without-mcp/"
echo ""

# Count lines in output files to estimate complexity
total_lines=0
for file in results-without-mcp/test*-output.txt; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    total_lines=$((total_lines + lines))
    echo "$(basename "$file"): $lines lines"
  fi
done

echo ""
echo "Total output lines: $total_lines"
echo "Estimated complexity: High (complex tasks without specialized tools)"

cat << EOF > results-without-mcp/summary.txt
Claude -p Testing Without MCP REPL Tools
Date: $(date)
Test Environment: $(pwd)
Node Version: $(node --version)

Test Results:
1. Security & Performance Analysis: ~$(wc -l < results-without-mcp/test1-output.txt 2>/dev/null || echo "0") lines
2. Performance Optimization: ~$(wc -l < results-without-mcp/test2-output.txt 2>/dev/null || echo "0") lines
3. Security Hardening: ~$(wc -l < results-without-mcp/test3-output.txt 2>/dev/null || echo "0") lines
4. Architecture Refactoring: ~$(wc -l < results-without-mcp/test4-output.txt 2>/dev/null || echo "0") lines
5. Testing Strategy: ~$(wc -l < results-without-mcp/test5-output.txt 2>/dev/null || echo "0") lines

Total Output: ~$total_lines lines
Estimated Duration: 15-25 minutes total
Tools Used: Standard Claude Code capabilities only

Key Observations:
- Complex tasks require manual code analysis and implementation
- No specialized tools for code search, AST analysis, or performance profiling
- Implementation details must be manually specified
- Testing and validation require manual setup
- No automated code transformation or refactoring capabilities

Next Steps: Compare with MCP REPL tools performance
EOF

echo "Summary generated: results-without-mcp/summary.txt"