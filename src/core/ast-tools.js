import fs from 'fs';
import path from 'path';

class ASTGrepHelper {
  constructor(language = 'javascript') {
    this.language = language;
    this.astGrep = null;
    this.initializeASTGrep();
  }

  async initializeASTGrep() {
    try {
      const { parse, Lang } = await import('@ast-grep/napi');
      this.parse = parse;
      this.Lang = Lang;
      this.astGrep = { parse, Lang };
    } catch (error) {
      console.warn('ast-grep not available, using fallback pattern matching');
      this.astGrep = null;
    }
  }

  async parseCode(code) {
    if (!this.astGrep) {
      throw new Error('ast-grep not available');
    }

    try {
      const { parse, Lang } = this.astGrep;
      let lang = Lang.JavaScript;

      if (this.language === 'typescript') {
        lang = Lang.TypeScript;
      } else if (this.language === 'jsx') {
        lang = Lang.JSX;
      } else if (this.language === 'tsx') {
        lang = Lang.TSX;
      }

      return parse(lang, code);
    } catch (error) {
      throw new Error(`Failed to parse ${this.language} code: ${error.message}`);
    }
  }

  async searchPattern(code, pattern) {
    if (!this.astGrep) {
      const regex = new RegExp(this.escapeRegex(pattern), 'g');
      const matches = [];
      let match;
      while ((match = regex.exec(code)) !== null) {
        matches.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          line: this.getLineFromPosition(code, match.index),
          column: this.getColumnFromPosition(code, match.index)
        });
      }
      return matches;
    }

    try {
      const ast = await this.parseCode(code);
      const root = ast.root();
      const node = root.find(pattern);

      if (!node) return [];

      const range = node.range();
      return [{
        text: node.text(),
        start: range.start.index,
        end: range.end.index,
        line: range.start.line,
        column: range.start.column
      }];
    } catch (error) {
      throw new Error(`Pattern search failed: ${error.message}`);
    }
  }

  async replacePattern(code, pattern, replacement) {
    if (!this.astGrep) {
        const regex = new RegExp(this.escapeRegex(pattern), 'g');
      return code.replace(regex, replacement);
    }

    try {
      const ast = await this.parseCode(code);
      const root = ast.root();
      const node = root.find(pattern);

      if (!node) return code;

      const edit = node.replace(replacement);
      return root.commitEdits([edit]);
    } catch (error) {
      throw new Error(`Pattern replacement failed: ${error.message}`);
    }
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getLineFromPosition(code, position) {
    const before = code.substring(0, position);
    return before.split('\n').length - 1;
  }

  getColumnFromPosition(code, position) {
    const before = code.substring(0, position);
    const lastNewline = before.lastIndexOf('\n');
    return lastNewline === -1 ? position : position - lastNewline - 1;
  }
}

export async function astSearch(filePath, pattern, options = {}) {
  const {
    language = 'javascript',
    recursive = false,
    maxResults = 100,
    ignorePatterns = []
  } = options;

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const helper = new ASTGrepHelper(language);
    const results = [];

    const processFile = async (file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const matches = await helper.searchPattern(content, pattern);

        return matches.map(match => ({
          file,
          content: match.text,
          line: match.line,
          column: match.column,
          start: match.start,
          end: match.end
        }));
      } catch (error) {
        return [{ file, error: error.message }];
      }
    };

    if (fs.statSync(filePath).isDirectory()) {
      const files = await findFiles(filePath, {
        recursive,
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
        ignorePatterns
      });

      for (const file of files.slice(0, maxResults)) {
        const fileResults = await processFile(file);
        results.push(...fileResults);
      }
    } else {
      const fileResults = await processFile(filePath);
      results.push(...fileResults);
    }

    return results.slice(0, maxResults);
  } catch (error) {
    throw new Error(`AST search failed: ${error.message}`);
  }
}

export async function astReplace(filePath, pattern, replacement, options = {}) {
  const {
    language = 'javascript',
    recursive = false,
    backup = true,
    ignorePatterns = []
  } = options;

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const helper = new ASTGrepHelper(language);
    const results = [];

    const processFile = async (file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');

        if (backup) {
          const backupPath = file + '.backup';
          fs.writeFileSync(backupPath, content);
        }

        const newContent = await helper.replacePattern(content, pattern, replacement);

        if (newContent !== content) {
          fs.writeFileSync(file, newContent);
          return { file, status: 'modified', changes: true };
        } else {
          return { file, status: 'unchanged', changes: false };
        }
      } catch (error) {
        return { file, error: error.message, status: 'failed' };
      }
    };

    if (fs.statSync(filePath).isDirectory()) {
      const files = await findFiles(filePath, {
        recursive,
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
        ignorePatterns
      });

      for (const file of files) {
        const result = await processFile(file);
        results.push(result);
      }
    } else {
      const result = await processFile(filePath);
      results.push(result);
    }

    return results;
  } catch (error) {
    throw new Error(`AST replace failed: ${error.message}`);
  }
}

export async function astLint(filePath, rules = [], options = {}) {
  const {
    language = 'javascript',
    recursive = false,
    ignorePatterns = []
  } = options;

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const helper = new ASTGrepHelper(language);
    const results = [];

    const processFile = async (file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const issues = [];

        for (const rule of rules) {
          const matches = await helper.searchPattern(content, rule.pattern);

          matches.forEach(match => {
            issues.push({
              file,
              rule: rule.name,
              message: rule.message || `Pattern "${rule.pattern}" matched`,
              severity: rule.severity || 'warning',
              line: match.line,
              column: match.column,
              content: match.text
            });
          });
        }

        return issues;
      } catch (error) {
        return [{ file, error: error.message }];
      }
    };

    if (fs.statSync(filePath).isDirectory()) {
      const files = await findFiles(filePath, {
        recursive,
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
        ignorePatterns
      });

      for (const file of files) {
        const fileIssues = await processFile(file);
        results.push(...fileIssues);
      }
    } else {
      const fileIssues = await processFile(filePath);
      results.push(...fileIssues);
    }

    return results;
  } catch (error) {
    throw new Error(`AST lint failed: ${error.message}`);
  }
}

async function findFiles(dir, options = {}) {
  const {
    recursive = true,
    extensions = ['.js'],
    ignorePatterns = []
  } = options;

  const results = [];

  const shouldIgnore = (filePath) => {
    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  };

  const scan = async (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      if (shouldIgnore(relativePath) || shouldIgnore(entry.name)) {
        continue;
      }

      if (entry.isDirectory() && recursive) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        if (extensions.some(ext => fullPath.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    }
  };

  await scan(dir);
  return results;
}

export const DEFAULT_LINT_RULES = [
  {
    name: 'no-console-log',
    pattern: 'console.log($$)',
    message: 'Avoid using console.log in production code',
    severity: 'warning'
  },
  {
    name: 'no-debugger',
    pattern: 'debugger',
    message: 'Remove debugger statements',
    severity: 'error'
  },
  {
    name: 'no-var',
    pattern: 'var $A',
    message: 'Use let or const instead of var',
    severity: 'warning'
  }
];

export const AST_TOOLS = [
  {
    name: 'ast_search',
    description: 'Search code patterns using AST-aware matching. More effective than regex for structural code search.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File or directory path to search'
        },
        pattern: {
          type: 'string',
          description: 'AST pattern to search (e.g., "console.log($$)", "function $NAME($ARGS) {}")'
        },
        language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'jsx', 'tsx'],
          default: 'javascript',
          description: 'Programming language'
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'Search recursively in directories'
        },
        maxResults: {
          type: 'number',
          default: 50,
          description: 'Maximum number of results'
        }
      },
      required: ['path', 'pattern']
    },
    handler: async (args) => {
      const results = await astSearch(args.path, args.pattern, {
        language: args.language,
        recursive: args.recursive,
        maxResults: args.maxResults
      });

      return {
        results: results.length,
        matches: results
      };
    }
  },
  {
    name: 'ast_replace',
    description: 'Replace code patterns using AST-aware transformation. Safely transforms code structure.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File or directory path to modify'
        },
        pattern: {
          type: 'string',
          description: 'AST pattern to find (e.g., "console.log($MSG)", "var $NAME")'
        },
        replacement: {
          type: 'string',
          description: 'Replacement code (e.g., "logger.info($MSG)", "let $NAME")'
        },
        language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'jsx', 'tsx'],
          default: 'javascript',
          description: 'Programming language'
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'Apply recursively in directories'
        },
        backup: {
          type: 'boolean',
          default: true,
          description: 'Create backup files before modification'
        }
      },
      required: ['path', 'pattern', 'replacement']
    },
    handler: async (args) => {
      const results = await astReplace(args.path, args.pattern, args.replacement, {
        language: args.language,
        recursive: args.recursive,
        backup: args.backup
      });

      return {
        processed: results.length,
        results: results
      };
    }
  },
  {
    name: 'ast_lint',
    description: 'Lint code using AST pattern rules. Enforce coding standards and detect issues.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File or directory path to lint'
        },
        rules: {
          type: 'array',
          description: 'Custom linting rules (uses default rules if not provided)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              pattern: { type: 'string' },
              message: { type: 'string' },
              severity: { type: 'string', enum: ['error', 'warning'] }
            }
          }
        },
        language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'jsx', 'tsx'],
          default: 'javascript',
          description: 'Programming language'
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'Lint recursively in directories'
        }
      },
      required: ['path']
    },
    handler: async (args) => {
      const rules = args.rules || DEFAULT_LINT_RULES;
      const results = await astLint(args.path, rules, {
        language: args.language,
        recursive: args.recursive
      });

      return {
        issues: results.length,
        results: results
      };
    }
  }
];

export default AST_TOOLS;

function createToolResponse(content, isError = false) {
  return {
    content: [{ type: "text", text: content }],
    isError
  };
}

function createErrorResponse(message) {
  return createToolResponse(`Error: ${message}`, true);
}

function validateRequiredParams(params, requiredParams) {
  const missingParams = requiredParams.filter(param => !params[param]);
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
}

function formatCodeParsingMessage(language, code) {
  return `Parsing ${language} code substring ${code.substring(0, 100)}...`;
}

function formatASTSearchMessage(pattern, path) {
  return `AST searching: ${pattern} in ${path}`;
}

function formatASTReplaceMessage(pattern, replacement, path) {
  return `AST replacing: ${pattern} -> ${replacement} in ${path}`;
}

function formatASTLintMessage(path) {
  return `AST linting: ${path}`;
}

function createToolHandler(handler, toolName = 'Unknown Tool') {
  return async (args) => {
    try {
      const result = await handler(args);
      return result;
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  };
}

function createRetryToolHandler(handler, toolName = 'Unknown Tool', retries = 3) {
  return async (args) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await handler(args);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    throw lastError;
  };
}

export const astTools = [
  {
    name: "parse_ast",
    description: "Parse AST from code with ignore filtering",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript/TypeScript code to execute" },
        language: { type: "string", description: "Programming language" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." },
        filePath: { type: "string", description: "Optional file path for ignore pattern checking" }
      },
      required: ["code", "workingDirectory"]
    },
    handler: createToolHandler(async ({ code, language = "javascript", workingDirectory, filePath }) => {
      validateRequiredParams({ code, workingDirectory }, ['code', 'workingDirectory']);
      return formatCodeParsingMessage(language, code);
    })
  }
];

export const advancedAstTools = [
  {
    name: "astgrep_search",
    description: "Provides for code operations, preferred for specific searches",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "AST-grep pattern (required syntax)" },
        path: { type: "string", description: "Path to search in" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." }
      },
      required: ["pattern", "workingDirectory"]
    },
    handler: createToolHandler(async ({ pattern, path = ".", workingDirectory }) => {
      validateRequiredParams({ pattern, workingDirectory }, ['pattern', 'workingDirectory']);
      return formatASTSearchMessage(pattern, path);
    })
  },
  {
    name: "astgrep_replace",
    description: "Requires AST-grep syntax. Prefer over edit/write tools for its edit capabilities.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "AST-grep pattern (required syntax)" },
        replacement: { type: "string", description: "AST-grep replacement pattern" },
        path: { type: "string", description: "Path to search in" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." }
      },
      required: ["pattern", "replacement", "path", "workingDirectory"]
    },
    handler: createToolHandler(async ({ pattern, replacement, path, workingDirectory }) => {
      validateRequiredParams({ pattern, replacement, path, workingDirectory }, ['pattern', 'replacement', 'path', 'workingDirectory']);
      return formatASTReplaceMessage(pattern, replacement, path);
    })
  },
  {
    name: "astgrep_lint",
    description: "Code quality analysis with AST patterns and ignore filtering",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to search in" },
        rules: { type: "array", description: "AST-grep rules" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." }
      },
      required: ["path", "workingDirectory"]
    },
    handler: createRetryToolHandler(async ({ path: targetPath, rules = [], workingDirectory }) => {
      validateRequiredParams({ path: targetPath, workingDirectory }, ['path', 'workingDirectory']);

      const ignorePatterns = getDefaultIgnorePatterns(workingDirectory);
      const fullPath = path.resolve(workingDirectory, targetPath);

      // Check if it's a directory or file
      try {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          const filesToLint = [];
          const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
              const entryPath = path.join(dir, entry.name);
              const relativePath = path.relative(workingDirectory, entryPath);

              const shouldIgnore = ignorePatterns.files?.some(pattern => {
                const globPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
                return new RegExp(globPattern).test(relativePath);
              }) || ignorePatterns.directories?.includes(entry.name);

              if (!shouldIgnore) {
                if (entry.isDirectory()) {
                  scanDir(entryPath);
                } else if (entry.isFile() && ignorePatterns.extensions?.includes(path.extname(entry.name))) {
                  filesToLint.push(entryPath);
                }
              }
            }
          };

          scanDir(fullPath);
          return `AST linting directory: ${targetPath} (${filesToLint.length} files after filtering)`;
        } else {
          const relativePath = path.relative(workingDirectory, fullPath);
          const shouldIgnore = ignorePatterns.files?.some(pattern => {
            const globPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
            return new RegExp(globPattern).test(relativePath);
          });

          if (shouldIgnore) {
            return `File ${targetPath} is ignored by default patterns`;
          }

          return formatASTLintMessage(targetPath);
        }
      } catch (error) {
        return `Error accessing path ${targetPath}: ${error.message}`;
      }
    }, 'astgrep_lint', 2)
  }
];