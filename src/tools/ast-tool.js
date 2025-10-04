import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createMCPResponse } from '../core/mcp-pagination.js';
import { workingDirectoryContext, createToolContext } from '../core/working-directory-context.js';
import { createIgnoreFilter } from '../core/ignore-manager.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';
import { addExecutionStatusToResponse } from '../core/execution-state.js';
import { ToolError, ToolErrorHandler } from '../core/error-handling.js';
import { withConnectionManagement, getGlobalConnectionManager } from '../core/connection-manager.js';
import { withCrossToolAwareness, addToolMetadata } from '../core/cross-tool-context.js';
import { parse, ensureAstGrepAvailable, isAstGrepAvailable } from './ast-grep-wrapper.js';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generatePatternGuidance(issues) {
  let guidance = '💡 Pattern Optimization Tips:\n\n';

  issues.forEach((issue, index) => {
    guidance += `${index + 1}. ${issue.message}\n`;
    if (issue.examples && issue.examples.length > 0) {
      guidance += '\n   Examples:\n';
      issue.examples.forEach(example => {
        guidance += `   ${example}\n`;
      });
    }
    guidance += '\n';
  });

  return guidance;
}

export class ASTPatternValidator {
  static validateAndFixPattern(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      throw new ToolError(
        'Pattern must be a non-empty string',
        'INVALID_PATTERN',
        'ast-tool',
        false,
        ['Provide a valid AST pattern string', 'Check pattern syntax documentation']
      );
    }

    // Validate pattern length
    if (pattern.length > 1000) {
      throw new ToolError(
        'Pattern is too long (max 1000 characters)',
        'PATTERN_TOO_LONG',
        'ast-tool',
        false,
        ['Shorten the pattern', 'Break into multiple smaller patterns']
      );
    }

    // Provide helpful guidance for effective patterns instead of auto-fixing
    const patternIssues = [];
    let suggestedPattern = pattern;

    // Check for "has" patterns and provide guidance
    if (pattern.includes(' has ')) {
      patternIssues.push({
        type: 'HAS_PATTERN',
        message: 'Pattern uses "has" syntax - for better results, search for the specific element directly',
        examples: [
          `Instead of: "$VAR has useEffect"`,
          `Try: "useEffect($$$)" or "useEffect"`,
          '',
          `Instead of: "$COMPONENT has props"`,
          `Try: "const $PROP = props.$PROP" or "$COMPONENT($$$)"`
        ]
      });
      // Extract the variable part as a better pattern suggestion
      const parts = pattern.split(' has ');
      if (parts[0].startsWith('$')) {
        suggestedPattern = parts[0];
      }
    }

    // Check for overly complex patterns
    const complexPatternCount = (pattern.match(/\$\$\$/g) || []).length;
    if (complexPatternCount > 2) {
      patternIssues.push({
        type: 'COMPLEX_PATTERN',
        message: 'Pattern contains multiple complex placeholders - simplify for better results',
        examples: [
          `Instead of: "function $FUNC($$$) { $$$ }"`,
          `Try: "function $FUNC(" or just "$FUNC"`,
          '',
          `Break complex searches into multiple specific patterns`
        ]
      });
    }

    // Check for overly broad patterns
    const overlyBroadPatterns = [
      /^\w+$/, // Single words
      /^[A-Z][a-zA-Z0-9]*$/, // Just class/function names
      /^\$\w+$/ // Just metavariables
    ];

    if (overlyBroadPatterns.some(regex => regex.test(pattern))) {
      patternIssues.push({
        type: 'BROAD_PATTERN',
        message: 'Pattern is very broad - add more context for better results',
        examples: [
          `Instead of: "Component"`,
          `Try: "class Component" or "function Component("`,
          '',
          `Instead of: "$VAR"`,
          `Try: "const $VAR =" or "let $VAR ="`
        ]
      });
    }

    // Only validate for truly invalid patterns
    const invalidPatterns = [
      // Empty patterns
      /^\s*$/,
      // Patterns with clearly invalid characters
      /[<>\\|]/g
    ];

    for (const invalidRegex of invalidPatterns) {
      if (invalidRegex.test(pattern)) {
        throw new ToolError(
          `Pattern "${pattern}" contains invalid syntax`,
          'INVALID_PATTERN',
          'ast-tool',
          false,
          [
            'Use valid AST pattern syntax',
            'Avoid special characters like < > \\ |',
            'See tool description for effective examples'
          ]
        );
      }
    }

    return {
      isValid: true,
      originalPattern: pattern,
      suggestedPattern,
      patternIssues,
      hasSuggestions: patternIssues.length > 0,
      guidance: patternIssues.length > 0 ? generatePatternGuidance(patternIssues) : null
    };
}


  // getSafePattern now returns the original pattern with validation info
  static getSafePattern(pattern) {
    const validation = ASTPatternValidator.validateAndFixPattern(pattern);
    return validation.originalPattern;
  }
}

class ASTHelper {
  constructor(language = 'javascript') {
    this.language = language;
    this.errorHandler = new ToolErrorHandler('ast-tool');
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
    return this.safeASTOperation(() => {
      try {
        ensureAstGrepAvailable();
        return parse(this.language, code);
      } catch (error) {
        return null;
      }
    }, {
      code,
      language: this.language,
      operation: 'parseCode'
    });
  }

  safeASTOperation(operation, context = {}) {
    try {
      return operation();
    } catch (error) {
      // Handle synchronous errors gracefully
      console.error(`AST Operation Error (${context.operation}):`, error.message);
      return this.createErrorResponse(error, context);
    }
  }

  createErrorResponse(error, context = {}) {
    const errorInfo = {
      error: true,
      message: error.message,
      operation: context.operation,
      text: `AST Operation Error: ${context.operation} failed - ${error.message}`,
      timestamp: new Date().toISOString()
    };

    if (context.pattern) {
      errorInfo.pattern = context.pattern;
      errorInfo.text += ` (Pattern: ${context.pattern})`;
    }

    if (context.operation === 'searchPattern') {
      return [errorInfo];
    }

    return errorInfo;
  }

  searchPattern(code, pattern) {
    return this.safeASTOperation(() => {
      // Try to fix the pattern first
      const originalPattern = pattern;
      const fixedPattern = this.fixPattern(pattern);

      if (fixedPattern === null) {
        return [{
          error: true,
          message: `AST Pattern Error: Pattern "${originalPattern}" is too complex to automatically fix and cannot be processed.`,
          pattern: originalPattern,
          text: `AST Pattern Error: Pattern "${originalPattern}" contains multiple complex $$$ metavariables that cannot be safely converted. Please use simpler patterns with single metavariables ($VAR, $ARG) instead.`
        }];
      }

      if (this.isInvalidPattern(fixedPattern)) {
        return [{
          error: true,
          message: `AST Pattern Error: Pattern "${originalPattern}" is invalid and cannot be processed.`,
          pattern: originalPattern,
          text: `AST Pattern Error: Pattern "${originalPattern}" is invalid. Please use valid AST patterns.`
        }];
      }

      const root = this.parseCode(code);
      if (!root) return [];

      const rootNode = root.root();

      // Use ast-grep natively with additional safety
      try {
        const matches = rootNode.findAll(fixedPattern);
        const results = matches.map(match => ({
          text: match.text(),
          start: match.range().start.index,
          end: match.range().end.index,
          line: match.range().start.line,
          column: match.range().start.column
        }));

        // If pattern was auto-fixed, include a warning
        if (fixedPattern !== originalPattern) {
          return [{
            error: true,
            message: `Pattern automatically fixed: "${originalPattern}" → "${fixedPattern}"`,
            pattern: originalPattern,
            text: `⚠️ Pattern Warning: The original pattern "${originalPattern}" was automatically converted to "${fixedPattern}" to prevent server crashes. Results shown are for the fixed pattern.`,
            isWarning: true,
            results: results
          }];
        }

        return results;
      } catch (astError) {
        // Report ast-grep errors to the agent
        return [{
          error: true,
          message: astError.message,
          pattern: fixedPattern,
          text: `AST Pattern Error: ast-grep failed to process pattern "${fixedPattern}": ${astError.message}`
        }];
      }
    }, {
      code,
      pattern,
      operation: 'searchPattern'
    });
  }

  isInvalidPattern(pattern) {
    // Check for truly invalid patterns (empty, wrong type)
    if (!pattern || typeof pattern !== 'string' || pattern.trim().length === 0) {
      return true;
    }

    // Only block patterns that cannot be automatically fixed
    const trulyUnsafePatterns = [
      '',  // Empty pattern
      undefined,
      null
    ];

    return trulyUnsafePatterns.includes(pattern);
  }

  fixPattern(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      return pattern;
    }

    let fixedPattern = pattern;

    // Simple string replacements for common problematic $$$ patterns
    const patternFixes = [
      // Function patterns
      {
        match: 'function $FUNC($$$) { $$$ }',
        replacement: 'function $FUNC($PARAM) { $STMT }'
      },
      {
        match: 'function $FUNC($$$)',
        replacement: 'function $FUNC($PARAM)'
      },
      {
        match: 'async function $FUNC($$$)',
        replacement: 'async function $FUNC($PARAM)'
      },

      // Arrow function patterns - convert to safe simple patterns
      {
        match: 'onClick={() => $$$}',
        replacement: 'onClick={$_}'
      },
      {
        match: '($$$) => { $$$ }',
        replacement: '$A => $B'
      },
      {
        match: '() => { $$$ }',
        replacement: '() => $B'
      },
      {
        match: '$HANDLER = () => { $$$ }',
        replacement: '$A = () => $B'
      },

      // Object patterns - convert to empty object for safety
      {
        match: '{$$$}',
        replacement: '{}'
      },
      {
        match: 'const $OBJ = {$$$}',
        replacement: 'const $OBJ = {}'
      },
      {
        match: '{$KEY: $$$}',
        replacement: '{}'
      },

      // Array patterns
      {
        match: '[$$$]',
        replacement: '[]'
      },
      {
        match: 'const $ARR = [$$$]',
        replacement: 'const $ARR = []'
      },

      // React hooks patterns
      {
        match: 'const [$STATE, $SETTER] = useState($$$)',
        replacement: 'const [$STATE, $SETTER] = useState($INITIAL)'
      },
      {
        match: 'useState($$$)',
        replacement: 'useState($PROP)'
      },
      {
        match: 'useEffect($$$)',
        replacement: 'useEffect($DEPENDENCY)'
      },

      // Console and other patterns
      {
        match: 'console.log($$$)',
        replacement: 'console.log($ARG)'
      },
      {
        match: 'console.error($$$)',
        replacement: 'console.error($ARG)'
      },
      {
        match: 'console.warn($$$)',
        replacement: 'console.warn($ARG)'
      },
      {
        match: 'console.info($$$)',
        replacement: 'console.info($ARG)'
      },
      {
        match: 'const $VAR = $$$',
        replacement: 'const $VAR = $VALUE'
      },
      {
        match: 'let $VAR = $$$',
        replacement: 'let $VAR = $VALUE'
      },
      {
        match: 'var $VAR = $$$',
        replacement: 'var $VAR = $VALUE'
      },

      // Multiple $$$ in function calls (fallback)
      {
        match: '$FUNC($$$)',
        replacement: '$FUNC($ARG)'
      }
    ];

    // Apply all fixes using simple string matching
    for (const fix of patternFixes) {
      if (fix.match && fixedPattern.includes(fix.match)) {
        fixedPattern = fixedPattern.replace(fix.match, fix.replacement);
      }
    }

    // If there are still $$$ patterns that couldn't be automatically fixed,
    // try a more generic approach
    if (fixedPattern.includes('$$$')) {
      // Replace isolated $$$ with single metavariables based on context
      fixedPattern = fixedPattern
        .replace(/\b\s*\$\$\$\s*\b/g, '$CONTENT')  // Isolated $$$
        .replace(/\{\s*\$\$\$\s*\}/g, '{}')         // Object with $$$
        .replace(/\[\s*\$\$\$\s*\]/g, '[]')         // Array with $$$
        .replace(/\(\s*\$\$\$\s*\)/g, '($ARG)')      // Function params with $$$
        .replace(/=\s*\$\$\$\s*;/g, '= $VALUE;')     // Assignments with $$$
        .replace(/return\s+\$\$\$/g, 'return $VALUE'); // Return statements
    }

    // If the pattern is still unsafe after all fixes, return null to indicate it should be blocked
    if (this.isTrulyUnsafe(fixedPattern)) {
      return null;
    }

    return fixedPattern !== pattern ? fixedPattern : pattern;
  }

  isTrulyUnsafe(pattern) {
    // Patterns that are fundamentally unsafe and cannot be automatically fixed
    const tripleDollarCount = (pattern.match(/\$\$\$/g) || []).length;
    if (tripleDollarCount > 3) {
      return true; // Too many $$$ to safely fix
    }

    // Check for complex nested patterns that would be hard to fix automatically
    const complexPatterns = [
      /\$\$\$.*\$\$\$/,           // Multiple $$$ in complex arrangements
      /\{\s*\$\w+\s*:\s*\$\$\$\s*.*\$\$\$\s*\}/,  // Objects with multiple $$$
      /\[\s*\$\w+\s*,\s*\$\$\$\s*,.*\$\$\$\s*\]/, // Arrays with multiple $$$
    ];

    for (const complexRegex of complexPatterns) {
      if (complexRegex.test(pattern)) {
        return true;
      }
    }

    return false;
  }

  replacePattern(code, pattern, replacement) {
    try {
      if (this.isInvalidPattern(pattern)) {
        return code; // Return original code for invalid patterns
      }

      const rootNode = this.parseCodeWithPatternSafety(code, pattern);

      try {
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
      } catch (astError) {
        // ast-grep failed to parse the pattern - return original code
        return code;
      }
    } catch (error) {
      // Return original code for any errors
      return code;
    }
  }

  searchPatternSync(code, pattern) {
    return this.searchPattern(code, pattern);
  }
}

function detectLanguageFromPattern(pattern, targetPath) {
  // Detect JSON files/patterns
  if (pattern.includes('.json') ||
      pattern.includes('package.json') ||
      targetPath.includes('.json') ||
      pattern.includes('"') && pattern.includes(':') && pattern.includes('{')) {
    return 'json';
  }

  // Detect YAML files
  if (pattern.includes('.yaml') || pattern.includes('.yml')) {
    return 'yaml';
  }

  // Detect config files
  if (pattern.includes('toml') || pattern.includes('config')) {
    return 'toml';
  }

  return null; // fallback to default
}

async function unifiedASTOperation(operation, options = {}) {
  // Extract options first to avoid destructuring scope issues
  const targetPathParam = options.path || '.';
  const patternParam = options.pattern;
  const replacementParam = options.replacement;
  const language = options.language || 'javascript';
  const recursive = options.recursive !== false;
  const maxResults = options.maxResults || 100;
  const workingDirectory = options.workingDirectory || process.cwd();

  // Auto-detect language based on pattern if not specified
  const detectedLanguage = detectLanguageFromPattern(patternParam, targetPathParam);
  const finalLanguage = options.language || detectedLanguage || 'javascript';

  return safeASTOperationWrapper(async () => {

    const helper = new ASTHelper(finalLanguage);

    // Check for invalid patterns before processing files
    if (operation === 'search' || operation === 'replace') {
      if (helper.isInvalidPattern(patternParam)) {
        return {
          success: false,
          results: [],
          errors: [{
            message: `AST Pattern Error: Pattern "${patternParam}" is invalid and cannot be processed.`,
            pattern: patternParam,
            isPatternError: true
          }],
          patternErrors: [{
            message: `AST Pattern Error: Pattern "${patternParam}" is invalid. Please use valid AST patterns.`,
            pattern: patternParam,
            isPatternError: true
          }],
          generalErrors: [],
          otherErrors: [],
          totalMatches: 0,
          totalErrors: 1,
          pattern: patternParam,
          error: `Pattern "${patternParam}" is invalid and cannot be processed`
        };
      }
    }

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
        return await performSearch(helper, targetPath, patternParam, recursive, maxResults);
      case 'replace':
        return await performReplace(helper, targetPath, patternParam, replacementParam, recursive, true);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }, {
    operation,
    pattern: patternParam,
    workingDirectory
  });
}

async function safeASTOperationWrapper(operation, context = {}) {
  const connectionManager = getGlobalConnectionManager();
  const errorHandler = new ToolErrorHandler('ast-tool');

  return connectionManager.executeWithRetry(async () => {
    try {
      // Provide pattern guidance instead of auto-fixing
      const originalPattern = context.pattern;
      let patternGuidance = null;

      if (context.pattern) {
        const validation = ASTPatternValidator.validateAndFixPattern(context.pattern);

        // Store validation info for guidance
        if (validation.hasSuggestions) {
          patternGuidance = validation.guidance;
          context.pattern = validation.suggestedPattern;
          context.originalPattern = originalPattern;
          context.hasGuidance = true;
        }
      }

      const result = await operation();

      // Add pattern guidance if suggestions were provided
      if (patternGuidance && result.results) {
        result.patternGuidance = {
          originalPattern,
          guidance: patternGuidance,
          message: 'Pattern optimization suggestions available'
        };
      }

      return result;
    } catch (error) {
      console.error(`AST Operation Wrapper Error (${context.operation || 'unknown'}):`, error.message);

      // Handle different types of errors gracefully
      let errorResponse;
      if (connectionManager.isConnectionError(error)) {
        errorResponse = {
          success: false,
          results: [],
          errors: [{
            message: `Connection Error: ${error.message}`,
            operation: context.operation || 'unknown',
            isConnectionError: true
          }],
          patternErrors: [],
          generalErrors: [{
            message: `Connection failed: ${error.message}`,
            operation: context.operation || 'unknown'
          }],
          otherErrors: [],
          totalMatches: 0,
          totalErrors: 1,
          pattern: context.pattern || undefined,
          error: `Connection error: ${error.message}`,
          isConnectionError: true
        };
      } else {
        errorResponse = {
          success: false,
          results: [],
          errors: [{
            message: `AST Operation Error: ${context.operation || 'unknown'} failed - ${error.message}`,
            operation: context.operation || 'unknown',
            isWrapperError: true
          }],
          patternErrors: [],
          generalErrors: [{
            message: error.message,
            operation: context.operation || 'unknown'
          }],
          otherErrors: [],
          totalMatches: 0,
          totalErrors: 1,
          pattern: context.pattern || undefined,
          error: `AST operation failed: ${error.message}`,
          isGracefulError: true
        };
      }

      return errorResponse;
    }
  }, {
    toolName: 'ast-tool',
    maxRetries: 2,
    retryDelay: 1000
  });
}

async function performSearch(helper, targetPath, pattern, recursive, maxResults) {
  const results = [];
  const maxFileSize = 100 * 1024; // Reduced from 150KB for better performance
  const maxConcurrency = 8; // Process files in parallel

  const processFile = async (file) => {
    try {
      const stat = statSync(file);
      if (stat.size > maxFileSize) {
        return [{ file, error: `File too large for search (>${Math.round(maxFileSize/1024)}KB)` }];
      }
      const content = readFileSync(file, 'utf8');
      helper.setLanguage(helper.detectLanguageFromExtension(file));
      const matches = await helper.searchPattern(content, pattern);

      return matches.map(match => {
        if (match.error) {
          if (match.isWarning && match.results) {
            // Pattern was auto-fixed, include both warning and results
            return {
              file,
              warning: match.message,
              pattern: match.pattern,
              isPatternWarning: true,
              content: match.text,
              line: match.line,
              column: match.column,
              start: match.start,
              end: match.end
            };
          }
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
    const limitedFiles = files.slice(0, maxResults);

    // Process files in batches for better performance
    for (let i = 0; i < limitedFiles.length; i += maxConcurrency) {
      const batch = limitedFiles.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(file => processFile(file));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // Early termination if we have enough results
      if (results.length >= maxResults * 2) break;
    }
  } else {
    const fileResults = await processFile(targetPath);
    results.push(...fileResults);
  }

  const validResults = results.filter(r => !r.error && !r.warning);
  const errorResults = results.filter(r => r.error);
  const warningResults = results.filter(r => r.warning);
  const patternErrors = errorResults.filter(r => r.isPatternError);
  const generalErrors = errorResults.filter(r => r.isGeneralError);
  const patternWarnings = warningResults.filter(r => r.isPatternWarning);
  const otherErrors = errorResults.filter(r => !r.isPatternError && !r.isGeneralError);

  return {
    success: patternErrors.length === 0 && generalErrors.length === 0,
    results: validResults,
    errors: errorResults,
    patternErrors: patternErrors,
    generalErrors: generalErrors,
    patternWarnings: patternWarnings,
    otherErrors: otherErrors,
    totalMatches: validResults.length,
    totalErrors: errorResults.length,
    totalWarnings: warningResults.length,
    pattern: pattern,
    path: targetPath,
    warning: patternErrors.length > 0 ? `Pattern errors found: ${patternErrors.length} files had invalid AST patterns` :
             patternWarnings.length > 0 ? `Pattern auto-fixed: ${patternWarnings.length} files had patterns automatically converted` : undefined
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
    extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.c', '.cpp', '.json'],
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
  description: "AST pattern matching for precise code structure searches. Patterns: $VAR (variables), $FUNC (functions), $$$ (any code). Examples: 'useState($INIT)', 'function $F($P)', 'console.log($A)', 'try {$$$} catch($E) {$$$}'. Relations: '$F has debugger' (contains), '$V inside function_declaration' (context), 'kind: function_declaration' (node type). Composites: 'all:[p1,p2]', 'any:[p1,p2]', 'not:p'. Use concrete syntax patterns, not abstract concepts. Auto-simplifies complex patterns.",
  examples: [
    'operation="search", pattern="console.log($ARG)"',
    'operation="replace", pattern="var $NAME", replacement="let $NAME"',
    'operation="search", pattern="$FUNC debugger"',
    'operation="search", pattern="kind: function_declaration"',
    'operation="search", pattern="$OBJ"'
  ],
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['search', 'replace'],
        description: 'search: find patterns, replace: transform code'
      },
            pattern: {
        type: 'string',
        description: 'AST pattern: $VAR (variable), $FUNC (function), $$$ (any code). Ex: "useState($INIT)", "function $F($P)", "$F has debugger", "kind: function_declaration"'
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
        description: 'Absolute path to existing directory (no relative paths). Ex: "/home/user/project"'
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
    required: ['operation', 'workingDirectory', 'pattern']
  },
  handler: withCrossToolAwareness(withConnectionManagement(async (args) => {
    const consoleRestore = suppressConsoleOutput();
    const workingDirectory = args.workingDirectory;
    const query = args.pattern || args.operation || '';

    try {
      const context = await workingDirectoryContext.getToolContext(workingDirectory, 'ast_tool', query);

      // Validate input parameters
      if (!args.operation) {
        throw new ToolError(
          'Operation parameter is required',
          'MISSING_PARAMETER',
          'ast-tool',
          false,
          ['Provide "operation" parameter (search or replace)', 'Check tool documentation']
        );
      }

      if (!args.workingDirectory) {
        throw new ToolError(
          'Working directory parameter is required',
          'MISSING_PARAMETER',
          'ast-tool',
          false,
          ['Provide "workingDirectory" parameter', 'Use absolute path like "/Users/username/project"']
        );
      }

      if (args.operation === 'search' && (args.cursor || args.pageSize !== 50)) {
        const result = await unifiedASTOperation(args.operation, args);

        // Handle validation errors
        if (result.isValidationError) {
          const response = {
            content: [{ type: "text", text: result.error }],
            isError: true
          };
          return addExecutionStatusToResponse(response, 'ast_tool');
        }

        // Handle connection errors
        if (result.isConnectionError) {
          const response = {
            content: [{ type: "text", text: `Connection Error: ${result.error}` }],
            isError: true
          };
          return addExecutionStatusToResponse(response, 'ast_tool');
        }

        // Add pattern guidance if available
      if (result.patternGuidance) {
        const response = {
          content: [{ type: "text", text: result.patternGuidance.guidance + '\n\nSearching with suggested pattern...' }]
        };
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

        // Check for pattern errors and return error response instead of pagination
        if (result.patternErrors && result.patternErrors.length > 0) {
          let output = `Pattern Error${result.patternErrors.length > 1 ? 's' : ''} encountered:\n\n`;
          result.patternErrors.forEach(err => {
            output += `• ${err.message}\n`;
          });

          if (result.totalMatches > 0) {
            output += `\n${result.totalMatches} matches found for pattern: "${args.pattern}":\n\n`;
            const results = Array.isArray(result) ? result : (result.results || []);
            results.slice(0, 15).forEach((match, i) => {
              output += `${match.file}:${match.line}\n${match.content.trim()}\n\n`;
            });
          }

          const response = {
            content: [{ type: "text", text: output.trim() }],
            isError: true
          };
          return addExecutionStatusToResponse(response, 'ast_tool');
        }

        const results = Array.isArray(result) ? result : (result.results || []);

        const insights = generateASTInsights(results, args.operation, args.pattern, workingDirectory);

        const toolContext = createToolContext('ast_tool', workingDirectory, query, {
          filesAccessed: Array.isArray(results) ? results.map(r => r?.file || r.path || 'unknown').filter(Boolean) : [],
          patterns: [args.pattern],
          insights: insights
        });

        await workingDirectoryContext.updateContext(workingDirectory, 'ast_tool', toolContext);

        const response = createMCPResponse(results, {
          cursor: args.cursor,
          pageSize: args.pageSize,
          metadata: {
            operation: args.operation,
            path: workingDirectory,
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
          content: [{ type: "text", text: `AST Operation Error: ${error.message}\n\nOperation: ${args.operation}\nPattern: ${args.pattern || 'N/A'}\nPath: ${workingDirectory || 'N/A'}\n\nThe operation encountered an unexpected error but the connection remains stable.` }],
          isError: true
        };
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

      // Handle validation and connection errors
      if (result.isValidationError) {
        const response = {
          content: [{ type: "text", text: result.error }],
          isError: true
        };
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

      if (result.isConnectionError) {
        const response = {
          content: [{ type: "text", text: `Connection Error: ${result.error}` }],
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
  }, 'ast-tool', {
    maxRetries: 2,
    retryDelay: 1000
  }), 'ast_tool')
};

function formatSearchResult(result, args) {
  if (!result.success) {
    let errorMessage = `Search failed: ${result.error}`;

    // Add pattern errors if they exist
    if (result.patternErrors && result.patternErrors.length > 0) {
      errorMessage += '\n\nPattern Errors:\n';
      result.patternErrors.forEach(err => {
        errorMessage += `• ${err.message}\n`;
      });
    }

    const response = {
      content: [{ type: "text", text: errorMessage }],
      isError: true
    };
    return addExecutionStatusToResponse(response, 'ast_tool');
  }

  // Add pattern guidance if available
      if (result.patternGuidance) {
        const response = {
          content: [{ type: "text", text: result.patternGuidance.guidance + '\n\nSearching with suggested pattern...' }]
        };
        return addExecutionStatusToResponse(response, 'ast_tool');
      }

  // Check for pattern errors even if search was successful
  if (result.patternErrors && result.patternErrors.length > 0) {
    let output = `Pattern Error${result.patternErrors.length > 1 ? 's' : ''} encountered:\n\n`;
    result.patternErrors.forEach(err => {
      output += `• ${err.message}\n`;
    });

    if (result.totalMatches > 0) {
      output += `\n${result.totalMatches} matches found for pattern: "${args.pattern}":\n\n`;
      result.results.slice(0, 15).forEach((match, i) => {
        output += `${match.file}:${match.line}\n${match.content.trim()}\n\n`;
      });
    }

    const response = {
      content: [{ type: "text", text: output.trim() }],
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

export { ASTHelper, unifiedASTOperation };
export default UNIFIED_AST_TOOL;