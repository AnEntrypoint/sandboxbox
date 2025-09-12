// AST analysis tool definitions
// Structural code analysis and transformation tools

import { createSearchSchema, createAstSchema, createToolDefinition } from './tool-schemas.js';

// Search tools
export const searchTools = [
  createToolDefinition(
    "searchcode",
    "Semantic code search - USE FIRST",
    createSearchSchema()
  )
];

// AST analysis tools
export const astTools = [
  createToolDefinition(
    "astgrep_search",
    "AST pattern matching",
    createAstSchema({
      context: {
        type: "number",
        description: "Context lines (default: 3)"
      },
      strictness: {
        type: "string",
        enum: ["cst", "smart", "ast", "relaxed"],
        description: "Strictness: 'smart' (recommended)"
      },
      outputFormat: {
        type: "string", 
        enum: ["compact", "pretty"],
        description: "Format: 'compact' or 'pretty'"
      }
    })
  ),

  createToolDefinition(
    "astgrep_replace",
    "AST code rewriting",
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
    "YAML rule validation",
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
    "AST analysis/debugging",
    createAstSchema({
      analysisType: {
        type: "string",
        enum: ["pattern", "structure", "debug"],
        description: "Analysis type"
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
    "**PROJECT CONFIGURATION SETUP** - Initialize ast-grep configuration and rules for a project.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "**REQUIRED** - Working directory for project initialization operations."
        },
        projectType: {
          type: "string",
          enum: ["javascript", "typescript", "python", "rust", "go"],
          description: "Project type for configuration generation (default: javascript)"
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
          description: "Rule categories to generate (default: [security, performance, style])"
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
    "**PROJECT-WIDE CODE SCANNING** - Comprehensive analysis of entire projects using ast-grep rules.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "**REQUIRED** - Working directory for project scanning operations."
        },
        scanType: {
          type: "string",
          enum: ["quick", "comprehensive", "security"],
          description: "Type of scan to perform (default: comprehensive)"
        },
        outputFormat: {
          type: "string",
          enum: ["summary", "detailed", "json"],
          description: "Output format preference (default: summary)"
        },
        includeMetrics: {
          type: "boolean",
          description: "Include performance and coverage metrics (default: true)"
        }
      },
      required: ["workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_test",
    "**RULE TESTING AND VALIDATION** - Test ast-grep rules against code examples to ensure correctness.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "**REQUIRED** - Working directory for rule testing operations."
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
          description: "Output format for test results (default: detailed)"
        }
      },
      required: ["workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_validate_rules",
    "**RULE VALIDATION ENGINE** - Comprehensive validation of ast-grep rules for syntax, logic, and performance.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "**REQUIRED** - Working directory for rule validation operations."
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
    "**RULE DEBUGGING TOOLKIT** - Debug and analyze specific ast-grep rules with detailed output.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "**REQUIRED** - Working directory for rule debugging operations."
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
          description: "Programming language for the test code (default: javascript)"
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

// Batch execution tool
export const batchTools = [
  createToolDefinition(
    "batch_execute",
    "**COMPREHENSIVE BATCH OPERATIONS** - Execute multiple MCP tools in coordinated workflows.",
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
          description: "**REQUIRED** - Working directory for all batch operations"
        }
      },
      required: ["operations", "workingDirectory"]
    }
  )
];

// Sequential thinking tool
export const thinkingTools = [
  createToolDefinition(
    "sequentialthinking",
    "**SEQUENTIAL THINKING ENGINE** - Always use this tool, no exceptions. Process and store sequential thoughts with mandatory local data persistence.",
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
          description: "Required: Working directory for storing thought data locally"
        },
        parentId: {
          type: "string",
          description: "Optional: Parent thought ID for creating thought chains"
        }
      },
      required: ["thoughts", "workingDirectory"]
    }
  )
];