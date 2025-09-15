// AST analysis tool definitions
// Structural code analysis and transformation tools

import { createSearchSchema, createAstSchema, createToolDefinition } from './tool-schemas.js';

// Search tools - Improved descriptions to reduce friction
export const searchTools = [
  createToolDefinition(
    "searchcode",
    "Semantic code search tool that can reduce code discovery time by up to 85%. Recommended for initial code exploration and complex analysis tasks. Works well with astgrep_search for comprehensive analysis.",
    createSearchSchema()
  )
];

// AST analysis tools - Improved descriptions for better usability
export const astTools = [
  createToolDefinition(
    "astgrep_search",
    "Structural code search tool for precise pattern matching. Ideal for code structure analysis and finding specific patterns. Examples: 'function $NAME($$$ARGS) { $$$ }', 'const $VAR = $VALUE'. Can be combined with searchcode for comprehensive analysis.",
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
    "Code transformation tool for safe refactoring. Use for pattern-based replacements across your codebase. Pattern: 'console.log($$)', Replacement: 'logger.info($$)'. Use dryRun: true for safety preview.",
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
    "Code validation tool for quality assurance. Use YAML rules to check code patterns and enforce standards. Example: 'id: no-console, message: Avoid console.log, pattern: console.log($$)'. Provides consistent validation across your codebase.",
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
    "Pattern debugging tool for AST analysis. Use to debug patterns and understand code structure. Analysis types: pattern=syntax, structure=AST, debug=troubleshooting. Helpful for understanding complex code patterns.",
    createAstSchema({
      analysisType: {
        type: "string",
        enum: ["pattern", "structure", "debug"],
        description: "Analysis type: pattern=syntax, structure=AST, debug=troubleshooting"
      }
    })
  )
];

// Consolidated Advanced AST tools - Reduced from 8 to 3 essential tools
export const enhancedAstTools = [
  createToolDefinition(
    "astgrep_advanced_search",
    "Advanced AST search tool for complex analysis. Supports JSON metadata, multiple patterns, constraints, and advanced filtering in one unified tool.",
    {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "AST pattern with meta-vars (e.g., 'function $NAME($$$ARGS) { $$$ }')"
        },
        patterns: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "AST patterns array for multi-pattern search"
        },
        workingDirectory: {
          type: "string",
          description: "Required - working directory for search"
        },
        language: {
          type: "string",
          description: "Target language"
        },
        constraints: {
          type: "object",
          description: "Validation constraints",
          properties: {
            minMatches: { type: "number" },
            maxMatches: { type: "number" },
            filePathPattern: { type: "string" },
            performanceThreshold: { type: "number" }
          }
        },
        operator: {
          type: "string",
          enum: ["any", "all", "not"],
          description: "Logic operator for multi-pattern (default: any)"
        },
        jsonFormat: {
          type: "string",
          enum: ["compact", "stream", "pretty"],
          description: "JSON output format"
        },
        includeMetadata: {
          type: "boolean",
          description: "Include JSON metadata"
        },
        strictness: {
          type: "string",
          enum: ["cst", "smart", "ast", "relaxed"],
          description: "Matching strictness (default: smart)"
        },
        context: {
          type: "number",
          description: "Context lines (default: 3)"
        }
      },
      required: ["workingDirectory"],
      anyOf: [
        { required: ["pattern"] },
        { required: ["patterns"] }
      ]
    }
  ),

  createToolDefinition(
    "astgrep_project",
    "Project-wide AST analysis tool. Initialize configuration and run comprehensive analysis in one tool. Useful for large-scale codebase analysis.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for project operations"
        },
        action: {
          type: "string",
          enum: ["init", "scan", "both"],
          description: "Action to perform (default: both)"
        },
        projectType: {
          type: "string",
          enum: ["javascript", "typescript", "python", "rust", "go"],
          description: "Project type for initialization (default: javascript)"
        },
        scanType: {
          type: "string",
          enum: ["quick", "comprehensive", "security"],
          description: "Scan type (default: comprehensive)"
        },
        createRules: {
          type: "boolean",
          description: "Generate rule files during init (default: true)"
        },
        includeMetrics: {
          type: "boolean",
          description: "Include performance metrics in scan (default: true)"
        }
      },
      required: ["workingDirectory"]
    }
  ),

  createToolDefinition(
    "astgrep_rules",
    "Rule management tool. Test rules, validate syntax/logic/performance, and debug issues in one comprehensive tool.",
    {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Required - working directory for rule operations"
        },
        action: {
          type: "string",
          enum: ["test", "validate", "debug"],
          description: "Rule management action"
        },
        rules: {
          type: "string",
          description: "YAML rule content"
        },
        rulesPath: {
          type: "string",
          description: "Path to rules file"
        },
        ruleId: {
          type: "string",
          description: "Specific rule ID for debugging"
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
          description: "Test cases for testing action"
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
        },
        testCode: {
          type: "string",
          description: "Code for debugging specific rule"
        }
      },
      required: ["workingDirectory", "action"],
      anyOf: [
        { required: ["rules"] },
        { required: ["rulesPath"] }
      ]
    }
  )
];

// Batch execution tool - Enhanced with natural language support
export const batchTools = [
  createToolDefinition(
    "batch_execute",
    "Enhanced batch execution tool that supports both structured operations and natural language descriptions. Use to coordinate multiple tools efficiently or describe what you want to accomplish in plain English.",
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
          description: "Array of tool operations to execute in sequence (optional if using natural language)"
        },
        description: {
          type: "string",
          description: "Natural language description of what you want to accomplish (optional if using operations array)"
        },
        task: {
          type: "string",
          description: "Alternative natural language task description (optional if using operations array)"
        },
        workingDirectory: {
          type: "string",
          description: "Required - working directory for all batch operations"
        }
      },
      required: ["workingDirectory"],
      anyOf: [
        { required: ["operations"] },
        { required: ["description"] },
        { required: ["task"] }
      ]
    }
  )
];

// Sequential thinking tool - Improved for better usability
export const thinkingTools = [
  createToolDefinition(
    "sequentialthinking",
    "Sequential thinking tool for complex task analysis. Use to organize requirements, tool selection, and insights. Helpful for structured planning of complex tasks.",
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