import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createMCPResponse } from '../core/mcp-pagination.js';
import { workingDirectoryContext, createToolContext } from '../core/working-directory-context.js';
import { createIgnoreFilter } from '../core/ignore-manager.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';
import { addExecutionStatusToResponse } from '../core/execution-state.js';
import { parse } from '@ast-grep/napi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ASTHelper {
  constructor(language = 'javascript') {
    this.language = language;
  }

  detectLanguageFromExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const extensionMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.mjs': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp'
    };
    return extensionMap[ext] || 'javascript';
  }

  setLanguage(language) {
    this.language = language;
  }

  parseCode(code) {
    try {
      return parse(this.language, code);
    } catch (error) {
      return null;
    }
  }

  searchPattern(code, pattern) {
    try {
      // Validate pattern before passing to ast-grep
      if (this.isInvalidPattern(pattern)) {
        return [{
          error: true,
          message: `Invalid AST pattern: "${pattern}". Pattern must be a valid ast-grep syntax.`,
          pattern: pattern,
          text: `AST Pattern Error: Invalid pattern syntax`
        }];
      }

      const root = this.parseCode(code);
      if (!root) return [];

      const rootNode = root.root();
      const matches = rootNode.findAll(pattern);

      return matches.map(match => ({
        text: match.text(),
        start: match.range().start.index,
        end: match.range().end.index,
        line: match.range().start.line,
        column: match.range().start.column
      }));
    } catch (error) {
      // Return error information instead of empty array
      return [{
        error: true,
        message: error.message,
        pattern: pattern,
        text: `AST Pattern Error: ${error.message}`
      }];
    }
  }

  isInvalidPattern(pattern) {
    // Check for patterns that cause ast-grep to crash
    const invalidPatterns = [
      /^:\s*\w+$/,  // Matches ": any", ": string", etc.
      /^\w+:\s*$/,  // Matches "var:", "let:", etc.
      /^\s*:\s*$/,   // Matches ":" alone
      /^\w+\s*:\s*\w+\s*$/,  // Matches incomplete type annotations
    ];

    return invalidPatterns.some(regex => regex.test(pattern.trim()));
  }

  replacePattern(code, pattern, replacement) {
    try {
      const root = this.parseCode(code);
      if (!root) return code;

      const rootNode = root.root();
      const matches = rootNode.findAll(pattern);

      let modifiedCode = code;
      let offset = 0;

      matches.forEach(match => {
        const range = match.range();
        const before = modifiedCode.substring(0, range.start.index + offset);
        const after = modifiedCode.substring(range.end.index + offset);
        modifiedCode = before + replacement + after;
        offset += replacement.length - (range.end.index - range.start.index);
      });

      return modifiedCode;
    } catch (error) {
      return code;
    }
  }

  searchPatternSync(code, pattern) {
    return this.searchPattern(code, pattern);
  }
}

async function unifiedASTOperation(operation, options = {}) {
  const {
    path: targetPathParam = '.',
    pattern,
    replacement,
    language = 'javascript',
    recursive = true,
    maxResults = 100,
    workingDirectory = process.cwd()
  } = options;

  const helper = new ASTHelper(language);

  let targetPath;
  if (path.isAbsolute(targetPathParam)) {
    targetPath = targetPathParam;
  } else {
    const basePath = workingDirectory || process.cwd();
    targetPath = path.resolve(basePath, targetPathParam);
  }

  if (!existsSync(targetPath)) {
    throw new Error(`Path not found: ${targetPath}`);
  }

  switch (operation) {
    case 'search':
      return await performSearch(helper, targetPath, pattern, recursive, maxResults);
    case 'replace':
      return await performReplace(helper, targetPath, pattern, replacement, recursive, true);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

async function performSearch(helper, targetPath, pattern, recursive, maxResults) {
  const results = [];

  const processFile = async (file) => {
    try {
      const stat = statSync(file);
      if (stat.size > 150 * 1024) {
        return [{ file, error: 'File too large for search (>150KB)' }];
      }
      const content = readFileSync(file, 'utf8');
      helper.setLanguage(helper.detectLanguageFromExtension(file));
      const matches = await helper.searchPattern(content, pattern);

      return matches.map(match => {
        if (match.error) {
          return {
            file,
            error: match.message,
            pattern: match.pattern,
            isPatternError: true
          };
        }
        return {
          file,
          content: match.text,
          line: match.line,
          column: match.column,
          start: match.start,
          end: match.end
        };
      });
    } catch (error) {
      return [{ file, error: error.message, isGeneralError: true }];
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

  const validResults = results.filter(r => !r.error);
  const errorResults = results.filter(r => r.error);
  const patternErrors = errorResults.filter(r => r.isPatternError);
  const generalErrors = errorResults.filter(r => r.isGeneralError);
  const otherErrors = errorResults.filter(r => !r.isPatternError && !r.isGeneralError);

  return {
    success: patternErrors.length === 0 && generalErrors.length === 0,
    results: validResults,
    errors: errorResults,
    patternErrors: patternErrors,
    generalErrors: generalErrors,
    otherErrors: otherErrors,
    totalMatches: validResults.length,
    totalErrors: errorResults.length,
    pattern,
    path: targetPath,
    warning: patternErrors.length > 0 ? `Pattern errors found: ${patternErrors.length} files had invalid AST patterns` : undefined
  };
}

async function performReplace(helper, targetPath, pattern, replacement, recursive, autoLint = true) {
  const results = [];

  const processFile = async (file) => {
    try {
      const content = readFileSync(file, 'utf8');
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
  const customPatterns = [...ignorePatterns];
  const ignoreFilter = createIgnoreFilter(dir, customPatterns, {
    useGitignore,
    useDefaults: true,
    caseSensitive: false
  });

  const scan = async (currentDir) => {
    const entries = readdirSync(currentDir, { withFileTypes: true });

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
}

function generateASTInsights(results, operation, pattern, workingDirectory, result = null) {
  const insights = [];

  if (operation === 'search') {
    insights.push(`AST search found ${results.length} matches for pattern: "${pattern}"`);

    const uniqueFiles = new Set(results.map(r => r.file));
    if (uniqueFiles.size > 1) {
      insights.push(`Pattern found in ${uniqueFiles.size} different files`);
    }

    if (pattern.includes('$') || pattern.includes('has')) {
      insights.push('Complex pattern search - results show structural code relationships');
    }

    const fileTypes = new Set(results.map(r => r.file.split('.').pop()));
    if (fileTypes.size > 1) {
      insights.push(`Pattern spans ${fileTypes.size} file types: ${Array.from(fileTypes).join(', ')}`);
    }

  } else if (operation === 'replace') {
    if (result && result.modifiedFiles > 0) {
      insights.push(`Pattern replacement completed: ${result.modifiedFiles} files modified`);
      insights.push(`Replaced "${pattern}" with "${result.replacement}"`);

      if (result.modifiedFiles > 5) {
        insights.push('Large-scale change - consider testing and verification');
      }
    } else {
      insights.push(`No changes made - pattern "${pattern}" not found`);
    }
  }

  if (pattern.includes('console.')) {
    insights.push('Console operation detected - consider removing for production');
  }

  if (pattern.includes('debugger')) {
    insights.push('Debugger statement found - should be removed for production');
  }

  if (pattern.includes('var ')) {
    insights.push('Var declaration found - consider using const/let');
  }

  if (pattern.includes('TODO') || pattern.includes('FIXME')) {
    insights.push('Task comment found - track for resolution');
  }

  if (results.length === 0) {
    insights.push('No matches found - pattern may be too specific or not present');
  } else if (results.length > 50) {
    insights.push('Many matches found - consider more specific pattern or review scope');
  }

  if (operation === 'replace' && result && result.modifiedFiles > 0) {
    insights.push('Verification recommended - run tests to ensure changes work correctly');
  }

  return insights;
}

export const UNIFIED_AST_TOOL = {
  name: 'ast_tool',
  description: `Pattern-based code search and replace tool using ast-grep for proper AST analysis. Supports JavaScript, TypeScript, Python, Go, Rust, C, C++. Use SPECIFIC AST patterns for best results.

**AST CHEAT SHEET - Common Patterns:**
• Variables: "const $NAME = $$$", "let $VAR = $VALUE", "var $X = $$$"
• Functions: "function $FUNC($$$) { $$$ }", "$FUNC has debugger", "async function $FUNC($$$)"
• React: "useState($$$)", "useEffect($$$)", "const [$STATE, $SETTER] = useState($$$)"
• Console/Debug: "console.log($$$)", "console.error($ARG)", "debugger"
• Conditions: "if ($COND) { $$$ }", "$COND has binary_operator"
• Objects: "{$$$}", "{$KEY: $VALUE}", "const $OBJ = {$$$}"
• Arrays: "[$$$]", "[$ITEM, $$$]", "$ARR has array_element"

**AST-GREP SYNTAX:**
• Metavariables: $VAR (single node), $$$ (multiple nodes), $ARG (named capture)
• Relations: "has", "inside", "precedes", "follows", "matches"
• Kinds: "kind: function_declaration", "kind: string_literal"
• Composite: "all: [pattern1, pattern2]", "any: [pattern1, pattern2]", "not: pattern"

**Examples:**
• Find all console logs: "console.log($$$)"
• Find const declarations: "const $NAME = $$$"
• Find functions with debugger: "$FUNC has debugger"
• Find try-catch blocks: "try { $$$ } catch ($ERROR) { $$$ }"
• Find React hooks: "useState($$$)", "useEffect($$$)"
• Find empty blocks: "{ }"
• Find string literals: "kind: string_literal"`,
  examples: [
    'operation="search", pattern="console.log($$$)"',
    'operation="replace", pattern="var $NAME", replacement="let $NAME"',
    'operation="search", pattern="$FUNC has debugger"'
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
        description: 'AST pattern to search for using ast-grep syntax'
      },
      replacement: {
        type: 'string',
        description: 'Replacement text for AST patterns'
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
    const consoleRestore = suppressConsoleOutput();
    const workingDirectory = args.path || process.cwd();
    const query = args.pattern || args.operation || '';

    try {
      const context = await workingDirectoryContext.getToolContext(workingDirectory, 'ast_tool', query);

      if (args.operation === 'search' && (args.cursor || args.pageSize !== 50)) {
        const result = await unifiedASTOperation(args.operation, args);
        const results = Array.isArray(result) ? result : (result.results || []);

        const insights = generateASTInsights(results, args.operation, args.pattern, workingDirectory);

        const toolContext = createToolContext('ast_tool', workingDirectory, query, {
          filesAccessed: results.map(r => r.file),
          patterns: [args.pattern],
          insights: insights
        });

        await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', toolContext);

        const response = createMCPResponse(results, {
          cursor: args.cursor,
          pageSize: args.pageSize,
          metadata: {
            operation: args.operation,
            path: args.path,
            pattern: args.pattern,
            timestamp: new Date().toISOString()
          }
        });
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

      let result;
      try {
        result = await unifiedASTOperation(args.operation, args);
      } catch (error) {
        // Handle catastrophic errors gracefully
        const response = {
          content: [{ type: "text", text: `AST Operation Error: ${error.message}\n\nOperation: ${args.operation}\nPattern: ${args.pattern || 'N/A'}\nPath: ${args.path || 'N/A'}` }],
          isError: true
        };
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

      let finalResult;
      if (args.operation === 'search') {
        finalResult = formatSearchResult(result, args);
      } else if (args.operation === 'replace') {
        finalResult = formatReplaceResult(result, args);
      } else {
        finalResult = result;
      }

      const insights = generateASTInsights(result.results || [], args.operation, args.pattern, workingDirectory, result);

      const toolContext = createToolContext('ast_tool', workingDirectory, query, {
        filesAccessed: result.filesAccessed || result.modifiedFiles || [],
        patterns: [args.pattern],
        insights: insights
      });

      await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', toolContext);

      // Check for pattern errors and include them in the response
      if (result.patternErrors && result.patternErrors.length > 0) {
        const patternErrorOutput = finalResult.content && finalResult.content[0] && finalResult.content[0].type === 'text'
          ? finalResult.content[0].text
          : '';

        const errorMessages = result.patternErrors.map(err =>
          `Pattern Error: ${err.message} in file ${err.file}`
        ).join('\n');

        const response = {
          content: [{ type: "text", text: patternErrorOutput + '\n\n' + errorMessages }],
          isError: true
        };
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

      return addExecutionStatusToResponse(finalResult, 'ast_tool');
    } catch (error) {
      const errorContext = createToolContext('ast_tool', workingDirectory, query, {
        error: error.message
      });
      await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', errorContext);

      const response = {
        success: false,
        error: error.message,
        operation: args.operation
      };
      return addExecutionStatusToResponse(response, 'ast_tool');
    } finally {
      consoleRestore.restore();
    }
  }
};

function formatSearchResult(result, args) {
  if (!result.success) {
    const response = {
      content: [{ type: "text", text: `Search failed: ${result.error}` }],
      isError: true
    };
    return addExecutionStatusToResponse(response, 'ast_tool');
  }

  if (result.totalMatches === 0) {
    const response = {
      content: [{ type: "text", text: `No matches found for pattern: "${args.pattern}"` }]
    };
    return addExecutionStatusToResponse(response, 'ast_tool');
  }

  let output = `${result.totalMatches} matches for "${args.pattern}":\n\n`;

  result.results.slice(0, 15).forEach((match, i) => {
    output += `${match.file}:${match.line}\n${match.content.trim()}\n\n`;
  });

  if (result.totalMatches > 15) {
    output += `... ${result.totalMatches - 15} more matches\n`;
  }

  const response = {
    content: [{ type: "text", text: output.trim() }]
  };
  return addExecutionStatusToResponse(response, 'ast_tool');
}

function formatReplaceResult(result, args) {
  if (!result.success) {
    const response = {
      content: [{ type: "text", text: `Replace failed: ${result.error}` }],
      isError: true
    };
    return addExecutionStatusToResponse(response, 'ast_tool');
  }

  if (result.modifiedFiles === 0) {
    const response = {
      content: [{ type: "text", text: `No changes made - pattern "${args.pattern}" found no matches` }]
    };
    return addExecutionStatusToResponse(response, 'ast_tool');
  }

  let response = `Replaced pattern in ${result.modifiedFiles} files\n`;
  response += `Pattern: "${args.pattern}"\n`;
  response += `Replacement: "${args.replacement}"\n`;
  response += `Files modified: ${result.modifiedFiles}/${result.totalFiles}\n`;

  const responseObj = {
    content: [{ type: "text", text: response.trim() }]
  };
  return addExecutionStatusToResponse(responseObj, 'ast_tool');
}

export { unifiedASTOperation };
export default UNIFIED_AST_TOOL;