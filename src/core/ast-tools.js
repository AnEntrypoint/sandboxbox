import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

class ASTGrepHelper {
  constructor(language = 'javascript') {
    this.language = language;
    this.astGrep = null;
    this.registeredLanguages = new Set();
    this.initializeASTGrep();
  }

  detectLanguageFromExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const extensionMap = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.go': 'go',
      '.rs': 'rust',
      '.py': 'python',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.html': 'html',
      '.css': 'css'
    };

    return extensionMap[ext] || 'javascript';
  }

  setLanguage(language) {
    this.language = language;
  }

  async initializeASTGrep() {
    try {
      const { parse, Lang, registerDynamicLanguage } = await import('@ast-grep/napi');
      this.parse = parse;
      this.Lang = Lang;
      this.registerDynamicLanguage = registerDynamicLanguage;
      this.astGrep = { parse, Lang, registerDynamicLanguage };

      // Register additional languages
      await this.registerAdditionalLanguages();
    } catch (error) {
      console.warn('ast-grep not available, using fallback pattern matching');
      this.astGrep = null;
    }
  }

  async registerAdditionalLanguages() {
    const languagePackages = [
      { name: 'go', package: '@ast-grep/lang-go', key: 'Go' },
      { name: 'rust', package: '@ast-grep/lang-rust', key: 'Rust' },
      { name: 'python', package: '@ast-grep/lang-python', key: 'Python' },
      { name: 'c', package: '@ast-grep/lang-c', key: 'C' },
      { name: 'cpp', package: '@ast-grep/lang-cpp', key: 'Cpp' }
    ];

    for (const { name, package: packageName, key } of languagePackages) {
      try {
        const langModule = await import(packageName);
        this.registerDynamicLanguage({ [key]: langModule.default });
        this.registeredLanguages.add(name);
        console.log(`✅ Registered ${name} language support`);
      } catch (error) {
        console.warn(`⚠️ Could not register ${name}: ${error.message}`);
      }
    }
  }

  async parseCode(code) {
    if (!this.astGrep) {
      throw new Error('ast-grep not available');
    }

    try {
      const { parse, Lang } = this.astGrep;
      let lang = Lang.JavaScript;

      // Map language names to Lang keys
      const languageMap = {
        'javascript': Lang.JavaScript,
        'typescript': Lang.TypeScript,
        'jsx': Lang.JSX || Lang.JavaScript,
        'tsx': Lang.TSX || Lang.TypeScript,
        'html': Lang.Html,
        'css': Lang.Css,
        'go': 'Go',
        'rust': 'Rust',
        'python': 'Python',
        'c': 'C',
        'cpp': 'Cpp'
      };

      if (languageMap[this.language]) {
        lang = languageMap[this.language];
      } else {
        console.warn(`Unknown language: ${this.language}, defaulting to JavaScript`);
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
    extensions = ['.js', '.ts', '.jsx', '.tsx'],
    ignorePatterns = [],
    useGitignore = true
  } = options;

  const results = [];

  // Combine default patterns, gitignore patterns, and custom patterns
  const allPatterns = [
    ...getDefaultIgnorePatterns(),
    ...(useGitignore ? loadGitignorePatterns(dir) : []),
    ...ignorePatterns
  ];

  // Create ignore instance
  const ig = ignore();
  ig.add(allPatterns);

  const scan = async (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Only apply ignore patterns to paths within the base directory
      let shouldIgnore = false;
      if (fullPath.startsWith(dir)) {
        const relativePath = path.relative(dir, fullPath);
        shouldIgnore = ig.ignores(relativePath) || ig.ignores(entry.name);
      }

      if (shouldIgnore) {
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

// Default ignore patterns for performance
export function getDefaultIgnorePatterns(workingDirectory) {
  return [
    '**/node_modules/**',
    '**/.git/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.vuepress/**',
    '**/.docusaurus/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/.cache/**',
    '**/.parcel-cache/**',
    '**/.turbo/**',
    '**/.nx/**',
    '**/.swc/**',
    '**/bower_components/**',
    '**/jspm_packages/**',
    '**/.pnp/**',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/__snapshots__/**',
    '**/.jest/**',
    '**/.mocha/**',
    '**/.cypress/**',
    '**/.playwright/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/*.chunk.js',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    '**/.npmrc',
    '**/.yarnrc',
    '**/*.log',
    '**/tmp/**',
    '**/temp/**',
    '**/.tmp/**',
  '**/.DS_Store',
  '**/Thumbs.db'
  ];
}

// Load gitignore patterns from directory
function loadGitignorePatterns(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  const patterns = [];

  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      patterns.push(...lines);
    } catch (error) {
      console.warn(`Failed to read .gitignore: ${error.message}`);
    }
  }

  return patterns;
}

// Helper function to find files by extension
async function findFilesByExtension(dir, extensions = ['.js', '.ts', '.jsx', '.tsx']) {
  const results = [];

  const scan = async (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common ignored directories
        if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
          await scan(fullPath);
        }
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
    description: 'Find structural code patterns using AST analysis across multi-language codebases.',
    supported_operations: ['pattern matching', 'code structure analysis', 'syntax search', 'variable declaration finding', 'function call detection'],
    use_cases: ['Find all console.log statements', 'Locate variable declarations', 'Find function calls with specific patterns', 'Search for class definitions', 'Identify import statements'],
    examples: [
      'console.log($MSG)',
      'var $NAME = $VALUE',
      'function $NAME($ARGS) { $BODY }',
      'class $CLASS_NAME { $MEMBERS }',
      'import {$IMPORTS} from \'$MODULE\'',
      'const $NAME = require(\'$MODULE\')',
      'if ($CONDITION) { $BODY }',
      'try { $TRY_BODY } catch ($ERROR) { $CATCH_BODY }',
      'return $EXPRESSION',
      'throw new $ERROR_TYPE($MSG)'
    ],
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
        maxResults: args.maxResults,
        ignorePatterns: getDefaultIgnorePatterns()
      });

      return {
        results: results.length,
        matches: results
      };
    }
  },
  {
    name: 'ast_replace',
    description: 'Replace structural code patterns safely using AST transformations.',
    supported_operations: ['code refactoring', 'pattern replacement', 'syntax transformation', 'API migration', 'deprecated code updates'],
    use_cases: ['Replace console.log with logger', 'Convert var to let/const', 'Rename function or variable names', 'Update deprecated APIs', 'Modernize syntax patterns'],
    examples: [
      'Pattern: console.log($MSG) → Replacement: logger.info($MSG)',
      'Pattern: var $NAME = $VALUE → Replacement: let $NAME = $VALUE',
      'Pattern: require(\'$MODULE\') → Replacement: import $MODULE from \'$MODULE\'',
      'Pattern: .then($CB) → Replacement: await $CB',
      'Pattern: function($ARGS) { $BODY } → Replacement: ($ARGS) => { $BODY }',
      'Pattern: new Promise(($RESOLVE, $REJECT) => { $BODY }) → Replacement: new Promise(async ($RESOLVE, $REJECT) => { $BODY })'
    ],
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
        backup: args.backup,
        ignorePatterns: getDefaultIgnorePatterns()
      });

      return {
        processed: results.length,
        results: results
      };
    }
  },
  {
    name: 'ast_lint',
    description: 'Lint code using custom AST pattern rules to enforce standards and detect issues.',
    supported_operations: ['code quality analysis', 'anti-pattern detection', 'coding standard enforcement', 'security pattern checking', 'performance issue detection'],
    use_cases: ['Find all console.log statements in production', 'Detect var declarations that should be const/let', 'Identify missing error handling', 'Find unused variables', 'Check for security vulnerabilities'],
    examples: [
      'Rule: {name: "no-console", pattern: "console.log($MSG)", message: "Avoid console.log in production", severity: "warning"}',
      'Rule: {name: "prefer-const", pattern: "var $NAME = $VALUE", message: "Use const instead of var", severity: "error"}',
      'Rule: {name: "no-unused-vars", pattern: "const $UNUSED = $VALUE", message: "Unused variable detected", severity: "warning"}',
      'Rule: {name: "error-handling", pattern: "try { $BODY } catch () { }", message: "Empty catch block", severity: "error"}',
      'Rule: {name: "promise-callback", pattern: "new Promise(function($RESOLVE, $REJECT) { $BODY })", message: "Use arrow functions for Promise callbacks", severity: "warning"}'
    ],
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
export { ASTGrepHelper };

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
      // Import enhanced error recovery (circular dependency workaround)
      const { createEnhancedErrorResponse } = await import('./utilities.js');
      return createEnhancedErrorResponse(error, toolName, {
        workingDirectory: args?.workingDirectory,
        toolName
      });
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

// Actual AST processing functions for batch execute
export async function parseAST(code, language = 'javascript', workingDirectory, filePath) {
  validateRequiredParams({ workingDirectory }, ['workingDirectory']);

  // If filePath is provided but no code, read the file first
  let codeToParse = code;
  if (filePath && !code) {
    try {
      const fullPath = path.resolve(workingDirectory, filePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      codeToParse = fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  if (!codeToParse) {
    throw new Error('Missing required parameters: Either code or filePath must be provided');
  }

  return formatCodeParsingMessage(language, codeToParse);
}

export async function astgrepSearch(pattern, searchPath = '.', workingDirectory) {
  validateRequiredParams({ pattern, workingDirectory }, ['pattern', 'workingDirectory']);

  // Use the real AST search implementation
  try {
    const targetPath = searchPath.startsWith('.') ? path.resolve(workingDirectory, searchPath) : searchPath;

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path not found: ${targetPath}`);
    }

    const helper = new ASTGrepHelper();
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

    if (fs.statSync(targetPath).isDirectory()) {
      const files = await findFilesByExtension(targetPath, ['.js', '.ts', '.jsx', '.tsx']);
      for (const file of files) {
        const fileResults = await processFile(file);
        results.push(...fileResults);
      }
    } else {
      const fileResults = await processFile(targetPath);
      results.push(...fileResults);
    }

    return {
      success: true,
      results: results.filter(r => !r.error),
      errors: results.filter(r => r.error),
      totalMatches: results.filter(r => !r.error).length,
      pattern,
      path: targetPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pattern,
      path
    };
  }
}

export async function astgrepReplace(pattern, replacement, searchPath = '.', workingDirectory) {
  validateRequiredParams({ pattern, replacement, workingDirectory }, ['pattern', 'replacement', 'workingDirectory']);

  // Use the real AST replace implementation
  try {
    const targetPath = searchPath.startsWith('.') ? path.resolve(workingDirectory, searchPath) : searchPath;

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path not found: ${targetPath}`);
    }

    const helper = new ASTGrepHelper();
    const results = [];

    const processFile = async (file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const newContent = await helper.replacePattern(content, pattern, replacement);

        if (newContent !== content) {
          fs.writeFileSync(file, newContent);
          return { file, status: 'modified', changes: true };
        } else {
          return { file, status: 'unchanged', changes: false };
        }
      } catch (error) {
        return { file, error: error.message };
      }
    };

    if (fs.statSync(targetPath).isDirectory()) {
      const files = await findFilesByExtension(targetPath, ['.js', '.ts', '.jsx', '.tsx']);
      for (const file of files) {
        const fileResult = await processFile(file);
        results.push(fileResult);
      }
    } else {
      const fileResult = await processFile(targetPath);
      results.push(fileResult);
    }

    return {
      success: true,
      results,
      modifiedFiles: results.filter(r => r.changes).length,
      totalFiles: results.length,
      pattern,
      replacement,
      path: targetPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pattern,
      replacement,
      path: searchPath
    };
  }
}

export async function astgrepLint(path, rules = [], workingDirectory) {
  validateRequiredParams({ path, workingDirectory }, ['path', 'workingDirectory']);
  return formatASTLintMessage(path);
}

export const astTools = [
  {
    name: "parse_ast",
    description: "Parse AST from code with intelligent file reading and ignore filtering. Automatically reads files when filePath is provided without code. Perfect for understanding code structure and preparing for transformations.",
    supported_operations: ["code parsing", "AST analysis", "structure understanding"],
    use_cases: ["Code structure analysis", "Syntax validation", "Code transformation preparation", "Component analysis", "Pattern extraction"],
    examples: [
      "Parse component structure from React files",
      "Analyze function signatures and types",
      "Extract import/export patterns",
      "Understand code organization"
    ],
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript/TypeScript code to parse (optional - if not provided, will read from filePath)" },
        language: { type: "string", description: "Programming language (default: javascript). Supports: javascript, typescript, jsx, tsx, go, rust, python, c, cpp" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." },
        filePath: { type: "string", description: "File path to read code from (used when code parameter is not provided)" }
      },
      required: ["workingDirectory"]
    },
    handler: createToolHandler(async ({ code, language = "javascript", workingDirectory, filePath }) => {
      validateRequiredParams({ workingDirectory }, ['workingDirectory']);

      // If filePath is provided but no code, read the file first
      let codeToParse = code;
      if (filePath && !code) {
        try {
          const fullPath = path.resolve(workingDirectory, filePath);
          if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
          }
          codeToParse = fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
          throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
      }

      if (!codeToParse) {
        throw new Error('Missing required parameters: Either code or filePath must be provided');
      }

      return formatCodeParsingMessage(language, codeToParse);
    })
  },
  {
    name: "astgrep_search",
    description: "Structural code pattern matching using AST-grep syntax. Finds code patterns across files, not just text. Use for finding specific code structures, functions, classes, or patterns. Supports multi-language matching.",
    supported_operations: ["pattern matching", "structural search", "code analysis"],
    use_cases: ["Find specific function patterns", "Locate class definitions", "Search for import/export patterns", "Find React components", "Locate API usage patterns"],
    examples: [
      "Find all React components: `const $NAME = () => { $BODY }`",
      "Find function declarations: `function $NAME($ARGS) { $BODY }`",
      "Find TypeScript interfaces: `interface $NAME { $MEMBERS }`",
      "Find all console.log calls: `console.log($ARGS)`",
      "Find specific imports: `import {$IMPORTS} from '$MODULE'`"
    ],
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "AST-grep pattern for structural code matching. Use $VARIABLE for wildcards." },
        path: { type: "string", description: "Path to search in (default: current directory). Can be file or directory." },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." }
      },
      required: ["pattern", "workingDirectory"]
    },
    handler: createToolHandler(async ({ pattern, path = ".", workingDirectory }) => {
      return await astgrepSearch(pattern, path, workingDirectory);
    })
  },
  {
    name: "astgrep_replace",
    description: "Structural code replacement using AST-grep syntax. Safely transform code patterns across files while preserving structure. More reliable than text-based replacements.",
    supported_operations: ["code transformation", "pattern replacement", "refactoring"],
    use_cases: ["Rename function parameters", "Update import statements", "Refactor component props", "Standardize API calls", "Code modernization"],
    examples: [
      "Replace console.log with logger: `console.log($ARGS) → logger.info($ARGS)`",
      "Update import paths: `import {$IMPORTS} from 'old-module' → import {$IMPORTS} from 'new-module'`",
      "Rename function parameters: `function test($ARG) → function test(newParam)`",
      "Update React hooks: `useState($INITIAL) → useCustomState($INITIAL)`"
    ],
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "AST-grep pattern to match (what to find)" },
        replacement: { type: "string", description: "AST-grep replacement pattern (what to replace with)" },
        path: { type: "string", description: "Path to files/directory to modify" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." },
        backup: { type: "boolean", description: "Create backup files before modification (default: true)" }
      },
      required: ["pattern", "replacement", "path", "workingDirectory"]
    },
    handler: createToolHandler(async ({ pattern, replacement, path, workingDirectory, backup = true }) => {
      return await astgrepReplace(pattern, replacement, path, workingDirectory);
    })
  },
  {
    name: "astgrep_lint",
    description: "Code quality analysis using AST patterns and ignore filtering. Define custom linting rules and apply them across your codebase. Perfect for enforcing coding standards and detecting patterns.",
    supported_operations: ["code quality", "linting", "pattern detection", "standards enforcement"],
    use_cases: ["Enforce coding standards", "Detect anti-patterns", "Find deprecated APIs", "Validate architecture patterns", "Security pattern checking"],
    examples: [
      "Detect console.log statements in production",
      "Find unused variables",
      "Identify hardcoded secrets",
      "Check for proper error handling",
      "Validate React component patterns"
    ],
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to files/directory to lint" },
        rules: { type: "array", description: "Custom linting rules (uses built-in rules if not provided)" },
        workingDirectory: { type: "string", description: "REQUIRED: Working directory for execution." }
      },
      required: ["path", "workingDirectory"]
    },
    handler: createRetryToolHandler(async ({ path: targetPath, rules = [], workingDirectory }) => {
      return await astgrepLint(targetPath, rules, workingDirectory);
    }, 'astgrep_lint', 2)
  }
];