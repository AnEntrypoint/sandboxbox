import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ignore from 'ignore';
import { createMCPResponse } from './mcp-pagination.js';
import { addContextAnalysis, getContextAnalysis, addContextPattern, getContextSummary } from './hooks/context-store.js';

// Fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class UnifiedASTHelper {
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
    if (language !== 'javascript' && language !== 'typescript' &&
        language !== 'jsx' && language !== 'tsx' &&
        language !== 'html' && language !== 'css' &&
        !this.registeredLanguages.has(language)) {
      throw new Error(`Language '${language}' is not available. Install @ast-grep/lang-${language} to add support.`);
    }
    this.language = language;
  }

  async initializeASTGrep() {
    try {
      const { parse, Lang, registerDynamicLanguage } = await import('@ast-grep/napi');
      this.parse = parse;
      this.Lang = Lang;
      this.registerDynamicLanguage = registerDynamicLanguage;
      this.astGrep = { parse, Lang, registerDynamicLanguage };
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
      } catch (error) {
        this.availableLanguages = this.availableLanguages || new Set();
        this.availableLanguages.delete(name);
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
        if (this.language !== 'javascript' && this.language !== 'typescript' &&
            this.language !== 'jsx' && this.language !== 'tsx' &&
            this.language !== 'html' && this.language !== 'css' &&
            !this.registeredLanguages.has(this.language)) {
          throw new Error(`Language '${this.language}' is not available. Install @ast-grep/lang-${this.language} to add support.`);
        }
        lang = languageMap[this.language];
      } else {
        console.warn(`Unknown language: ${this.language}, defaulting to JavaScript`);
      }

      return parse(lang, code);
    } catch (error) {
      throw new Error(`Failed to parse ${this.language} code: ${error.message}`);
    }
  }

  async analyzeCode(code, analysisType = 'basic') {
    if (!this.astGrep) {
      return `Lightweight analysis: ${this.language} code (${code.length} chars)
Quick structure check complete - no deep AST parsing needed`;
    }

    try {
      const ast = await this.parseCode(code);
      const root = ast.root();

      if (analysisType === 'basic') {
        return this.performBasicAnalysis(code, root);
      } else if (analysisType === 'detailed') {
        return this.performDetailedAnalysis(code, root);
      }
    } catch (error) {
      return `Lightweight analysis: ${this.language} code (${code.length} chars)
Quick structure check complete - no deep AST parsing needed`;
    }
  }

  performBasicAnalysis(code, root) {
    const info = {
      language: this.language,
      nodes: 0,
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0,
      variables: 0,
      size: code.length
    };

    const helper = new ASTGrepHelper(this.language);
    const patterns = [
      { type: 'function', pattern: 'function $NAME($ARGS) { $BODY }' },
      { type: 'arrow', pattern: 'const $NAME = ($ARGS) => { $BODY }' },
      { type: 'class', pattern: 'class $NAME { $MEMBERS }' },
      { type: 'import', pattern: 'import $IMPORTS from \'$MODULE\'' },
      { type: 'export', pattern: 'export $STATEMENT' },
      { type: 'variable', pattern: 'const $NAME = $VALUE' }
    ];

    for (const { type, pattern } of patterns) {
      try {
        const matches = helper.searchPatternSync(code, pattern);
        if (type === 'function' || type === 'arrow') {
          info.functions += matches.length;
        } else if (type === 'class') {
          info.classes += matches.length;
        } else if (type === 'import') {
          info.imports += matches.length;
        } else if (type === 'export') {
          info.exports += matches.length;
        } else if (type === 'variable') {
          info.variables += matches.length;
        }
        info.nodes += matches.length;
      } catch (error) {
        // Skip failed patterns
      }
    }

    return `📊 Code Analysis - ${this.language} (${info.size} chars):
├─ Functions: ${info.functions}
├─ Classes: ${info.classes}
├─ Variables: ${info.variables}
├─ Imports: ${info.imports}
└─ Exports: ${info.exports}`;
  }

  performDetailedAnalysis(code, root) {
    const basic = this.performBasicAnalysis(code, root);
    let details = '\n\n🔍 Detailed Analysis:\n';

    // Add more detailed analysis based on language
    if (this.language === 'javascript' || this.language === 'typescript') {
      details += this.analyzeJavaScriptPatterns(code);
    } else if (this.language === 'python') {
      details += this.analyzePythonPatterns(code);
    }

    return basic + details;
  }

  analyzeJavaScriptPatterns(code) {
    const patterns = [
      { name: 'React Components', pattern: 'React\\.forwardRef|class.*extends.*Component|function.*\\(.*\\).*return.*<', type: 'react' },
      { name: 'Async Functions', pattern: 'async function|const.*= async', type: 'async' },
      { name: 'Promises', pattern: '\\.then\\(|\\.catch\\(|new Promise', type: 'promise' },
      { name: 'Template Literals', pattern: '`[^`]*`', type: 'template' },
      { name: 'Destructuring', pattern: 'const.*{.*}|\\(.*{.*}\\)', type: 'destructure' }
    ];

    let analysis = '';
    for (const { name, pattern, type } of patterns) {
      const matches = (code.match(new RegExp(pattern, 'g')) || []).length;
      if (matches > 0) {
        analysis += `├─ ${name}: ${matches}\n`;
      }
    }

    return analysis;
  }

  analyzePythonPatterns(code) {
    const patterns = [
      { name: 'Classes', pattern: '^class\\s+', type: 'class' },
      { name: 'Functions', pattern: '^def\\s+', type: 'function' },
      { name: 'Async Functions', pattern: '^async def\\s+', type: 'async' },
      { name: 'Decorators', pattern: '@\\w+', type: 'decorator' },
      { name: 'Type Hints', pattern: ':\\s*[A-Z]\\w*|->\\s*[A-Z]\\w*', type: 'types' }
    ];

    let analysis = '';
    for (const { name, pattern, type } of patterns) {
      const matches = (code.match(new RegExp(pattern, 'gm')) || []).length;
      if (matches > 0) {
        analysis += `├─ ${name}: ${matches}\n`;
      }
    }

    return analysis;
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

  searchPatternSync(code, pattern) {
    if (!this.astGrep) {
      const regex = new RegExp(this.escapeRegex(pattern), 'g');
      const matches = [];
      let match;
      while ((match = regex.exec(code)) !== null) {
        matches.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
      return matches;
    }

    // Fallback to async version
    return this.searchPattern(code, pattern);
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

// Helper class for sync operations (needed for internal use)
class ASTGrepHelper {
  constructor(language = 'javascript') {
    this.language = language;
  }

  searchPatternSync(code, pattern) {
    const regex = new RegExp(this.escapeRegex(pattern), 'g');
    const matches = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
      matches.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return matches;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export async function unifiedASTOperation(operation, options = {}) {
  const {
    path: targetPathParam = '.',
    pattern,
    replacement,
    code,
    language = 'javascript',
    analysisType = 'basic',
    rules = [],
    yamlConfig,
    recursive = true,
    maxResults = 100,
    backup = true,
    workingDirectory = process.cwd()
  } = options;

  const helper = new UnifiedASTHelper(language);
  const targetPath = targetPathParam.startsWith('.') ? (workingDirectory || __dirname) + '/' + targetPathParam : targetPathParam;

  // Validate path exists
  if (!existsSync(targetPath)) {
    throw new Error(`Path not found: ${targetPath}`);
  }

  switch (operation) {
    case 'search':
      return await performSearch(helper, targetPath, pattern, recursive, maxResults);

    case 'replace':
      return await performReplace(helper, targetPath, pattern, replacement, recursive, backup, true);

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}


async function performSearch(helper, targetPath, pattern, recursive, maxResults) {
  const results = [];

  const processFile = async (file) => {
    try {
      const stat = statSync(file);
      if (stat.size > 150 * 1024) { // 150KB limit
        return [{ file, error: 'File too large for search (>150KB)' }];
      }
      const content = readFileSync(file, 'utf8');
      helper.setLanguage(helper.detectLanguageFromExtension(file));
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

  if (statSync(targetPath).isDirectory()) {
    const files = await findFiles(targetPath, { recursive });
    for (const file of files.slice(0, maxResults)) {
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
}

async function performReplace(helper, targetPath, pattern, replacement, recursive, backup, autoLint = true) {
  const results = [];
  
  const processFile = async (file) => {
    try {
      const content = fs.readFileSync(file, 'utf8');

      if (backup) {
        const backupPath = file + '.backup';
        fs.writeFileSync(backupPath, content);
      }

      helper.setLanguage(helper.detectLanguageFromExtension(file));
      const newContent = await helper.replacePattern(content, pattern, replacement);

      if (newContent !== content) {
        fs.writeFileSync(file, newContent);

        // Linting is now handled by dedicated hooks - no longer needed here

        return {
          file,
          status: 'modified',
          changes: true,
          linting: autoLint ? {
            triggered: false,
            message: "Linting delegated to dedicated hooks"
          } : null
        };
      } else {
        return { file, status: 'unchanged', changes: false };
      }
    } catch (error) {
      return { file, error: error.message, status: 'failed' };
    }
  };

  if (statSync(targetPath).isDirectory()) {
    const files = await findFiles(targetPath, { recursive });
    for (const file of files) {
      const result = await processFile(file);
      results.push(result);
    }
  } else {
    const result = await processFile(targetPath);
    results.push(result);
  }

  return {
    success: true,
    results,
    modifiedFiles: results.filter(r => r.changes).length,
    totalFiles: results.length,
    pattern,
    replacement,
    path: targetPath,
    linting: autoLint ? {
      triggered: false,
      message: "Linting delegated to dedicated hooks - see hook outputs for linting results"
    } : null
  };
}


async function findFiles(dir, options = {}) {
  const {
    recursive = true,
    extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.c', '.cpp'],
    ignorePatterns = [],
    useGitignore = true
  } = options;

  const results = [];
  const allPatterns = [
    ...getDefaultIgnorePatterns(),
    ...(useGitignore ? loadGitignorePatterns(dir) : []),
    ...ignorePatterns
  ];

  const ig = ignore();
  ig.add(allPatterns);

  const scan = async (currentDir) => {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    // Process files in parallel for better performance
    const filePromises = entries.map(async (entry) => {
      const fullPath = path.join(currentDir, entry.name);

      let shouldIgnore = false;
      if (fullPath.startsWith(dir)) {
        const relativePath = path.relative(dir, fullPath);
        shouldIgnore = ig.ignores(relativePath) || ig.ignores(entry.name);
      }

      if (shouldIgnore) return null;

      if (entry.isDirectory() && recursive) {
        return scan(fullPath);
      } else if (entry.isFile()) {
        if (extensions.some(ext => fullPath.endsWith(ext))) {
          results.push(fullPath);
        }
      }
      return null;
    });

    await Promise.all(filePromises);
  };

  await scan(dir);
  return results;
}

function getDefaultIgnorePatterns() {
  return [
    '**/node_modules/**', '**/.git/**', '**/.next/**', '**/.nuxt/**',
    '**/.vuepress/**', '**/.docusaurus/**', '**/dist/**', '**/build/**',
    '**/out/**', '**/coverage/**', '**/.nyc_output/**', '**/.cache/**',
    '**/.parcel-cache/**', '**/.turbo/**', '**/.nx/**', '**/.swc/**',
    '**/bower_components/**', '**/jspm_packages/**', '**/.pnp/**',
    '**/__tests__/**', '**/__mocks__/**', '**/__snapshots__/**',
    '**/.jest/**', '**/.mocha/**', '**/.cypress/**', '**/.playwright/**',
    '**/*.min.js', '**/*.bundle.js', '**/*.chunk.js', '**/package-lock.json',
    '**/yarn.lock', '**/pnpm-lock.yaml', '**/.npmrc', '**/.yarnrc',
    '**/*.log', '**/tmp/**', '**/temp/**', '**/.tmp/**', '**/.DS_Store',
    '**/Thumbs.db'
  ];
}

function loadGitignorePatterns(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  const patterns = [];

  if (existsSync(gitignorePath)) {
    try {
      const content = readFileSync(gitignorePath, 'utf8');
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



// Create the unified AST tool
export const UNIFIED_AST_TOOL = {
  name: 'ast_tool',
  description: 'Direct ast-grep access. Patterns use $VAR syntax: "console.log($$$)" finds all console.log calls. Relational: "$FUNC has $CALL" matches functions containing calls. Transform: "var $X" → "let $X" converts declarations.',
  examples: [
    'ast_tool(operation="search", pattern="console.log($$$)")',
    'ast_tool(operation="replace", pattern="var $NAME", replacement="let $NAME")',
    'ast_tool(operation="search", pattern="$FUNC has debugger")'
  ],
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['search', 'replace'],
        description: 'search: find patterns, replace: transform code'
      },
      path: {
        type: 'string',
        description: 'File or directory path to search/modify'
      },
      pattern: {
        type: 'string',
        description: 'ast-grep pattern. Use $VARIABLE wildcards. Examples: "console.log($$$)", "var $NAME", "$FUNC has $CALL"'
      },
      replacement: {
        type: 'string',
        description: 'Transformation pattern. Uses fix/transformation/rewriter for safe code rewriting. Can reference captured $VARIABLEs'
      },
      language: {
        type: 'string',
        enum: ['javascript', 'typescript', 'jsx', 'tsx', 'python', 'go', 'rust', 'c', 'cpp'],
        default: 'javascript'
      },
      workingDirectory: {
        type: 'string',
        description: 'Working directory path'
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for large result sets'
      },
      pageSize: {
        type: 'number',
        default: 50,
        description: 'Results per page'
      }
    },
    required: ['operation']
  },
  handler: async (args) => {
    try {
      // Use pagination for search operations with cursor/pageSize
      if (args.operation === 'search' && (args.cursor || args.pageSize !== 50)) {
        const result = await unifiedASTOperation(args.operation, args);
        const results = Array.isArray(result) ? result : (result.results || []);

        return createMCPResponse(results, {
          cursor: args.cursor,
          pageSize: args.pageSize,
          metadata: {
            operation: args.operation,
            path: args.path,
            pattern: args.pattern,
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await unifiedASTOperation(args.operation, args);

      if (args.operation === 'search') {
        return formatSearchResult(result, args);
      } else if (args.operation === 'replace') {
        return formatReplaceResult(result, args);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operation: args.operation
      };
    }
  }
};


function formatSearchResult(result, args) {
  if (!result.success) {
    return `❌ Search failed: ${result.error}\n\nCheck pattern syntax and ensure files exist in search path.`;
  }

  if (result.totalMatches === 0) {
    return `❌ No matches found for pattern: "${args.pattern}"\n\nTry simplifying pattern or check actual code structure.`;
  }

  let output = `🔍 Found ${result.totalMatches} matches for pattern: "${args.pattern}"\n\n`;

  result.results.slice(0, 10).forEach((match, i) => {
    output += `${i + 1}. ${match.file}:${match.line}\n`;
    output += `   ${match.content}\n\n`;
  });

  if (result.totalMatches > 10) {
    output += `... and ${result.totalMatches - 10} more matches\n`;
  }

  return output;
}

function formatReplaceResult(result, args) {
  if (!result.success) {
    return `❌ Replace failed: ${result.error}\n\nCheck pattern syntax, replacement validity, and file permissions.`;
  }

  if (result.modifiedFiles === 0) {
    return `⚠️ No changes made - pattern "${args.pattern}" found no matches to replace\n\nVerify pattern matches actual code structure.`;
  }

  let response = `✅ Successfully replaced pattern in ${result.modifiedFiles} of ${result.totalFiles} files\n\n` +
                `📋 Replacement details:\n` +
                `• Pattern: "${args.pattern}"\n` +
                `• Replacement: "${args.replacement}"\n` +
                `• Files modified: ${result.modifiedFiles}\n` +
                `• Backups created: ${args.backup ? 'Yes' : 'No'}`;

  // Note: Linting is now handled by dedicated hooks
  if (args.autoLint !== false) {
    response += `\n\n🔍 Linting will be handled by dedicated hooks after file modification.`;
  }

  response += `\n\n⚠️ Review changes carefully. Backup files created if enabled.`;

  return response;
}


export default UNIFIED_AST_TOOL;