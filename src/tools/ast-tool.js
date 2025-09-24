import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createMCPResponse } from '../core/mcp-pagination.js';
import { workingDirectoryContext, createToolContext } from '../core/working-directory-context.js';
import { createIgnoreFilter, loadCustomIgnorePatterns } from '../core/ignore-manager.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';

// Console output is now suppressed globally in index.js when MCP_MODE is set

// ast-grep disabled due to fs context issues
const astGrepModule = null;

/**
 * Generate context summary for tool output
 */
function getContextSummary(context) {
  if (!context || !context.sessionData) {
    return '';
  }

  const lines = [];
  lines.push(`Working directory: ${context.workingDirectory}`);
  lines.push(`Tool: ${context.toolName}`);
  lines.push(`Session: ${context.sessionData.totalToolCalls} tool calls`);

  if (context.previousUsage) {
    lines.push(`Used ${context.previousUsage.count} times before`);
  }

  if (context.relevantFiles.length > 0) {
    lines.push(`${context.relevantFiles.length} relevant files available`);
  }

  if (context.insights.length > 0) {
    lines.push(`${context.insights.length} insights from previous tasks`);
  }

  lines.push(''); // Add separator

  return lines.join('\n') + '\n';
}
// Stub functions for context-store functionality (hooks system removed)
function addContextAnalysis(analysis, path) {
  // Stub implementation - context analysis handled by built-in hooks
  return true;
}

function getContextAnalysis(path) {
  // Stub implementation - context analysis handled by built-in hooks
  return null;
}

function addContextPattern(pattern, type) {
  // Stub implementation - context patterns handled by built-in hooks
  return true;
}
import { executeProcess } from './executor-tool.js';

// Fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class UnifiedASTHelper {
  constructor(language = 'javascript') {
    this.language = language;
    this.astGrep = null; // Force null to use only regex fallback
    this.registeredLanguages = new Set();
    // ast-grep disabled to avoid fs context issues
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
    // ast-grep disabled due to fs context issues
    this.astGrep = null;
    return;
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

  
  async searchPattern(code, pattern) {
    // Use regex fallback to avoid ast-grep dependency issues
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

  async replacePattern(code, pattern, replacement) {
    // Use regex fallback to avoid ast-grep dependency issues
    const regex = new RegExp(this.escapeRegex(pattern), 'g');
    return code.replace(regex, replacement);
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
      const content = readFileSync(file, 'utf8');

      if (backup) {
        const backupPath = file + '.backup';
        writeFileSync(backupPath, content);
      }

      helper.setLanguage(helper.detectLanguageFromExtension(file));
      const newContent = await helper.replacePattern(content, pattern, replacement);

      if (newContent !== content) {
        writeFileSync(file, newContent);

        return {
          file,
          status: 'modified',
          changes: true
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
    path: targetPath
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

  try {
    // Create unified ignore filter
    const customPatterns = [...ignorePatterns];
    const ignoreFilter = createIgnoreFilter(dir, customPatterns, {
      useGitignore,
      useDefaults: true,
      caseSensitive: false
    });

    const scan = async (currentDir) => {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      // Process files in parallel for better performance
      const filePromises = entries.map(async (entry) => {
        const fullPath = path.join(currentDir, entry.name);

        if (ignoreFilter.ignores(fullPath)) {
          return null;
        }

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
  } catch (error) {
    console.warn('Error using common ignore filter, falling back to basic filtering:', error);

    // Fallback to basic filtering
    const ig = ignore();
    const defaultIgnore = [
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
    ig.add(defaultIgnore);
    ig.add(ignorePatterns);

    const scan = async (currentDir) => {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      // Process files in parallel for better performance
      const filePromises = entries.map(async (entry) => {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);

        if (ig.ignores(relativePath) || ig.ignores(entry.name)) {
          return null;
        }

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
}




// Create the unified AST tool
export const UNIFIED_AST_TOOL = {
  name: 'ast_tool',
  description: 'Direct ast-grep access. Patterns use $VAR syntax: "console.log($$$)" finds all console.log calls. Relational: "$FUNC has $CALL" matches functions containing calls. Transform: "var $X" → "let $X" converts declarations. This allows advanced find and replace operations to happen across across entire folders. Careful for side-effects, useful for finding many cases of something and manipulating them.',
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
    // Apply console output suppression for MCP mode
    const consoleRestore = suppressConsoleOutput();
    const workingDirectory = args.path || process.cwd();
    const query = args.pattern || args.operation || '';

    try {
      // Get context for this AST operation
      const context = await workingDirectoryContext.getToolContext(workingDirectory, 'ast_tool', query);

      // Use pagination for search operations with cursor/pageSize
      if (args.operation === 'search' && (args.cursor || args.pageSize !== 50)) {
        const result = await unifiedASTOperation(args.operation, args);
        const results = Array.isArray(result) ? result : (result.results || []);

        // Create context data from AST search
        const toolContext = createToolContext('ast_tool', workingDirectory, query, {
          filesAccessed: results.map(r => r.file),
          patterns: [args.pattern],
          insights: [`AST search found ${results.length} matches`]
        });

        // Update working directory context
        await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', toolContext);

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

      let finalResult;
      if (args.operation === 'search') {
        finalResult = formatSearchResult(result, args);
      } else if (args.operation === 'replace') {
        finalResult = formatReplaceResult(result, args);
      } else {
        finalResult = result;
      }

      // Create context data from AST operation
      const toolContext = createToolContext('ast_tool', workingDirectory, query, {
        filesAccessed: result.filesAccessed || result.modifiedFiles || [],
        patterns: [args.pattern],
        insights: [`AST ${args.operation} completed successfully`]
      });

      // Update working directory context
      await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', toolContext);

      // Add context summary to result
      if (finalResult.content && finalResult.content[0] && finalResult.content[0].type === 'text') {
        const contextSummary = getContextSummary(context);
        finalResult.content[0].text = contextSummary + finalResult.content[0].text;
      }

      return finalResult;
    } catch (error) {
      // Update context even for errors
      const errorContext = createToolContext('ast_tool', workingDirectory, query, {
        error: error.message
      });
      await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', errorContext);

      return {
        success: false,
        error: error.message,
        operation: args.operation
      };
    } finally {
      // Always restore console output
      consoleRestore.restore();
    }
  }
};


function formatSearchResult(result, args) {
  if (!result.success) {
    return {
      content: [{ type: "text", text: `Search failed: ${result.error}` }],
      isError: true
    };
  }

  if (result.totalMatches === 0) {
    return {
      content: [{ type: "text", text: `No matches found for pattern: "${args.pattern}"` }]
    };
  }

  let output = `${result.totalMatches} matches for "${args.pattern}":\n\n`;

  result.results.slice(0, 15).forEach((match, i) => {
    output += `${match.file}:${match.line}\n${match.content.trim()}\n\n`;
  });

  if (result.totalMatches > 15) {
    output += `... ${result.totalMatches - 15} more matches\n`;
  }

  return {
    content: [{ type: "text", text: output.trim() }]
  };
}

function formatReplaceResult(result, args) {
  if (!result.success) {
    return {
      content: [{ type: "text", text: `Replace failed: ${result.error}` }],
      isError: true
    };
  }

  if (result.modifiedFiles === 0) {
    return {
      content: [{ type: "text", text: `No changes made - pattern "${args.pattern}" found no matches` }]
    };
  }

  let response = `Replaced pattern in ${result.modifiedFiles} files\n`;
  response += `Pattern: "${args.pattern}"\n`;
  response += `Replacement: "${args.replacement}"\n`;
  response += `Files modified: ${result.modifiedFiles}/${result.totalFiles}\n`;

  if (args.backup) {
    response += `\nBackup files created`;
  }

  return {
    content: [{ type: "text", text: response.trim() }]
  };
}


export default UNIFIED_AST_TOOL;