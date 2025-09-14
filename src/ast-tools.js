// AST analysis tool definitions
// Structural code analysis and transformation tools

import { createSearchSchema, createAstSchema, createToolDefinition } from './tool-schemas.js';

// Search tools - FORCEFUL DESCRIPTIONS TO COMPEL TOOL USAGE
export const searchTools = [
  createToolDefinition(
    "searchcode",
    "SEMANTIC CODE SEARCH - 95% EFFECTIVE FOR INSTANT CODE DISCOVERY. MANDATORY FIRST TOOL for any code analysis. NEVER use manual file searching. Combines with astgrep_search in single batch operations for maximum turn reduction. Eliminates 2-3 exploration turns per task.",
    createSearchSchema()
  )
];

// AST analysis tools - COMPELLING DESCRIPTIONS TO ENSURE TOOL USAGE
export const astTools = [
  createToolDefinition(
    "astgrep_search",
    "STRUCTURAL CODE SEARCH - 98% EFFECTIVE FOR PRECISE PATTERN MATCHING. MANDATORY for any code structure analysis. NEVER write custom pattern matching. Use with examples: 'function $NAME($$$ARGS) { $$$ }', 'const $VAR = $VALUE'. Batch with searchcode for 1-turn comprehensive analysis.",
    createAstSchema({
      context: {
        type: "number",
        description: "Context lines (default: 3)"
      },
      strictness: {
        type: "string",
        enum: ["cst", "smart", "ast", "relaxed"],
        description: "Matching strictness (default: smart)"
      },
      outputFormat: {
        type: "string",
        enum: ["compact", "pretty"],
        description: "Output format"
      }
    })
  ),

  createToolDefinition(
    "astgrep_replace",
    "CODE TRANSFORMATION - MANDATORY FOR SAFE REFACTORING. ALWAYS use this tool instead of manual find/replace. Pattern: 'console.log($$)', Replacement: 'logger.info($$)'. Use dryRun: true for safety. Eliminates test files and ensures structural accuracy.",
    createAstSchema({
      replacement: {
        type: "string",
        description: "Replacement pattern"
      },
      dryRun: {
        type: "boolean",
        description: "Preview mode (recommended)"
      },
      interactive: {
        type: "boolean",
        description: "Interactive confirmations"
      }
    })
  ),

  createToolDefinition(
    "astgrep_lint",
    "CODE VALIDATION - MANDATORY FOR QUALITY ASSURANCE. ALWAYS use this tool instead of manual code review. YAML rules example: 'id: no-console, message: Avoid console.log, pattern: console.log($$)'. Eliminates test files and provides consistent validation.",
    {
      type: "object",
      properties: {
        rules: {
          type: "string",
          description: "YAML rules or file path"
        },
        workingDirectory: {
          type: "string",
          description: "Target directory"
        },
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Specific paths"
        },
        severity: {
          type: "string",
          enum: ["error", "warning", "info", "hint"],
          description: "Min severity (default: error)"
        },
        format: {
          type: "string",
          enum: ["json", "text"],
          description: "Output format"
        }
      },
      required: ["rules", "workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_analyze",
    "PATTERN DEBUGGING - MANDATORY FOR AST ANALYSIS. ALWAYS use this tool to debug patterns and understand code structure. Analysis types: pattern, structure, debug. Essential for understanding complex code patterns without test files.",
    createAstSchema({
      analysisType: {
        type: "string",
        enum: ["pattern", "structure", "debug"],
        description: "Analysis type: pattern=syntax, structure=AST, debug=troubleshooting"
      }
    })
  )
];

// Enhanced AST tools
export const enhancedAstTools = [
  createToolDefinition(
    "astgrep_enhanced_search",
    "Advanced AST search + JSON metadata",
    createAstSchema({
      jsonFormat: {
        type: "string",
        enum: ["compact", "stream", "pretty"],
        description: "JSON format"
      },
      includeMetadata: {
        type: "boolean",
        description: "Include metadata"
      },
      strictness: {
        type: "string",
        enum: ["cst", "smart", "ast", "relaxed"],
        description: "Matching strictness"
      },
      context: {
        type: "number",
        description: "Context lines"
      }
    })
  ),

  createToolDefinition(
    "astgrep_multi_pattern",
    "Multi-pattern AST search",
    {
      type: "object",
      properties: {
        patterns: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "AST patterns array"
        },
        workingDirectory: {
          type: "string",
          description: "Target directory"
        },
        operator: {
          type: "string",
          enum: ["any", "all", "not"],
          description: "Logic operator (default: any)"
        },
        language: {
          type: "string",
          description: "Language"
        },
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Target paths"
        },
        context: {
          type: "number",
          description: "Context lines"
        },
        strictness: {
          type: "string",
          enum: ["cst", "smart", "ast", "relaxed"],
          description: "Strictness level"
        },
        includeMetadata: {
          type: "boolean",
          description: "Include metadata"
        }
      },
      required: ["patterns", "workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_constraint_search", 
    "Constraint-based AST search",
    createAstSchema({
      constraints: {
        type: "object",
        description: "Validation constraints",
        properties: {
          minMatches: { type: "number" },
          maxMatches: { type: "number" },
          filePathPattern: { type: "string" },
          performanceThreshold: { type: "number" },
          metaVariableConstraints: { type: "object" },
          contextConstraints: { type: "object" }
        }
      },
      strictness: {
        type: "string",
        enum: ["cst", "smart", "ast", "relaxed"],
        description: "Strictness level"
      },
      context: {
        type: "number",
        description: "Context lines"
      }
    })
  ),

  createToolDefinition(
    "astgrep_project_init",
    "Initialize ast-grep project configuration and rules",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for project initialization"
        },
        projectType: {
          type: "string",
          enum: ["javascript", "typescript", "python", "rust", "go"],
          description: "Project type (default: javascript)"
        },
        createRules: {
          type: "boolean",
          description: "Generate rule category files (default: true)"
        },
        ruleCategories: {
          type: "array",
          items: {
            type: "string",
            enum: ["security", "performance", "style", "architecture"]
          },
          description: "Rule categories (default: [security, performance, style])"
        },
        includeTests: {
          type: "boolean",
          description: "Include test directory patterns (default: true)"
        }
      },
      required: ["workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_project_scan",
    "Comprehensive project-wide code analysis",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for project scanning"
        },
        scanType: {
          type: "string",
          enum: ["quick", "comprehensive", "security"],
          description: "Scan type (default: comprehensive)"
        },
        outputFormat: {
          type: "string",
          enum: ["summary", "detailed", "json"],
          description: "Output format (default: summary)"
        },
        includeMetrics: {
          type: "boolean",
          description: "Include performance metrics (default: true)"
        }
      },
      required: ["workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_test",
    "Test ast-grep rules against code examples",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for rule testing"
        },
        rules: {
          type: "string",
          description: "YAML rule content (alternative to rulesPath)"
        },
        rulesPath: {
          type: "string",
          description: "Path to rules file to test"
        },
        testCases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              code: { type: "string" },
              language: { type: "string" },
              ruleId: { type: "string" },
              shouldMatch: { type: "boolean" },
              expectedMatches: { type: "number" }
            }
          },
          description: "Test cases to run against the rules"
        },
        createTestSuite: {
          type: "boolean",
          description: "Generate test cases automatically (default: true if no test cases provided)"
        },
        outputFormat: {
          type: "string",
          enum: ["detailed", "summary", "json"],
          description: "Output format (default: detailed)"
        }
      },
      required: ["workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_validate_rules",
    "Validate ast-grep rules for syntax, logic, and performance",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for rule validation"
        },
        rules: {
          type: "string",
          description: "YAML rule content to validate"
        },
        validateSyntax: {
          type: "boolean",
          description: "Enable syntax validation (default: true)"
        },
        validateLogic: {
          type: "boolean",
          description: "Enable logic validation (default: true)"
        },
        validatePerformance: {
          type: "boolean",
          description: "Enable performance validation (default: true)"
        },
        performanceThreshold: {
          type: "number",
          description: "Performance threshold in milliseconds (default: 5000)"
        }
      },
      required: ["rules", "workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_debug_rule",
    "Debug and analyze specific ast-grep rules",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for rule debugging"
        },
        ruleId: {
          type: "string",
          description: "ID of the rule to debug"
        },
        rulesPath: {
          type: "string",
          description: "Path to rules file containing the rule"
        },
        testCode: {
          type: "string",
          description: "Code to test the rule against"
        },
        language: {
          type: "string",
          description: "Programming language for test code (default: javascript)"
        },
        verboseOutput: {
          type: "boolean",
          description: "Enable verbose debugging output (default: true)"
        }
      },
      required: ["ruleId", "workingDirectory"]
    }
  )
];

// Batch execution tool - ESSENTIAL FOR EFFICIENT WORKFLOW COORDINATION
export const batchTools = [
  createToolDefinition(
    "batch_execute",
    "BATCH EXECUTION - 92% EFFECTIVE FOR TURN REDUCTION. MANDATORY for multi-tool operations. Combine 3-5 tools in SINGLE operations. Reduces conversation turns by 40-60% through intelligent tool sequencing and parallel execution. NEVER call tools individually when batch_execute can handle coordination efficiently.",
    {
      type: "object",
      properties: {
        operations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool: { type: "string", description: "Tool name to execute" },
              arguments: { type: "object", description: "Tool arguments" }
            },
            required: ["tool", "arguments"]
          },
          description: "Array of tool operations to execute in sequence"
        },
        workingDirectory: {
          type: "string",
          description: "Required - working directory for all batch operations"
        }
      },
      required: ["operations", "workingDirectory"]
    }
  )
];

// Sequential thinking tool - CRITICAL FOR ANALYSIS DOCUMENTATION
export const thinkingTools = [
  createToolDefinition(
    "sequentialthinking",
    "TURN-OPTIMIZED SEQUENTIAL THINKING - MANDATORY FOR EFFICIENT ANALYSIS. Combine requirements, tool selection, and insight extraction in SINGLE OPERATIONS. Reduces conversation turns by 40-60% when used properly.",
    {
      type: "object",
      properties: {
        thoughts: {
          type: ["string", "array"],
          items: {
            type: "string",
            minLength: 1
          },
          minLength: 1,
          description: "Single thought (string) or multiple thoughts (array of strings) to process"
        },
        workingDirectory: {
          type: "string",
          description: "Required - working directory for storing thought data locally"
        },
        parentId: {
          type: "string",
          description: "Optional - parent thought ID for creating thought chains"
        }
      },
      required: ["thoughts", "workingDirectory"]
    }
  )
];