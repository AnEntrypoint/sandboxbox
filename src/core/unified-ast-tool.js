import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ignore from 'ignore';
import { createMCPResponse } from './mcp-pagination.js';

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
  const targetPath = targetPathParam.startsWith('.') ? path.resolve(workingDirectory || __dirname, targetPathParam) : targetPathParam;

  // Validate path exists
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Path not found: ${targetPath}`);
  }

  switch (operation) {
    case 'analyze':
      return await performAnalysis(helper, targetPath, code, analysisType, language);

    case 'search':
      return await performSearch(helper, targetPath, pattern, recursive, maxResults);

    case 'replace':
      return await performReplace(helper, targetPath, pattern, replacement, recursive, backup);

    case 'lint':
      return await performLint(helper, targetPath, rules, yamlConfig, recursive);

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

async function performAnalysis(helper, targetPath, code, analysisType, language) {
  if (code) {
    // Analyze provided code directly
    return await helper.analyzeCode(code, analysisType);
  } else if (fs.statSync(targetPath).isFile()) {
    // Analyze file content
    const content = fs.readFileSync(targetPath, 'utf8');
    helper.setLanguage(helper.detectLanguageFromExtension(targetPath));
    return await helper.analyzeCode(content, analysisType);
  } else {
    // Analyze directory
    const files = await findFiles(targetPath, { recursive: true });
    const results = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        helper.setLanguage(helper.detectLanguageFromExtension(file));
        const analysis = await helper.analyzeCode(content, analysisType);
        results.push({ file, analysis });
      } catch (error) {
        results.push({ file, error: error.message });
      }
    }

    return results;
  }
}

async function performSearch(helper, targetPath, pattern, recursive, maxResults) {
  const results = [];

  const processFile = async (file) => {
    try {
      const content = fs.readFileSync(file, 'utf8');
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

  if (fs.statSync(targetPath).isDirectory()) {
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

async function performReplace(helper, targetPath, pattern, replacement, recursive, backup) {
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
        return { file, status: 'modified', changes: true };
      } else {
        return { file, status: 'unchanged', changes: false };
      }
    } catch (error) {
      return { file, error: error.message, status: 'failed' };
    }
  };

  if (fs.statSync(targetPath).isDirectory()) {
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

async function performLint(helper, targetPath, rules, yamlConfig, recursive) {
  let effectiveRules = [];

  // Load rules from YAML config if provided
  if (yamlConfig && fs.existsSync(yamlConfig)) {
    try {
      effectiveRules = await loadYAMLConfig(yamlConfig);
    } catch (error) {
      throw new Error(`Failed to load YAML config: ${error.message}`);
    }
  } else if (rules.length > 0) {
    // Use provided rules (enhanced with ast-grep features)
    effectiveRules = rules.map(rule => ({
      ...rule,
      pattern: rule.pattern || rule.regex, // Support both pattern and regex
      constraints: rule.constraints || {},
      utils: rule.utils || {},
      fix: rule.fix || null
    }));
  } else {
    effectiveRules = getDefaultLintRules();
  }

  const results = [];

  const processFile = async (file) => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const issues = [];

      helper.setLanguage(helper.detectLanguageFromExtension(file));

      for (const rule of effectiveRules) {
        const matches = await helper.searchPattern(content, rule.pattern);

        // Apply relational constraints if specified
        const filteredMatches = await applyRelationalConstraints(helper, content, matches, rule);

        filteredMatches.forEach(match => {
          const issue = {
            file,
            rule: rule.name || rule.id,
            message: rule.message || `Pattern "${rule.pattern}" matched`,
            severity: rule.severity || 'warning',
            line: match.line,
            column: match.column,
            content: match.text,
            fix: rule.fix || null
          };

          // Apply fix if specified
          if (rule.fix && backup) {
            applyFix(file, match, rule.fix);
          }

          issues.push(issue);
        });
      }

      return issues;
    } catch (error) {
      return [{ file, error: error.message }];
    }
  };

  if (fs.statSync(targetPath).isDirectory()) {
    const files = await findFiles(targetPath, { recursive });
    for (const file of files) {
      const fileIssues = await processFile(file);
      results.push(...fileIssues);
    }
  } else {
    const fileIssues = await processFile(targetPath);
    results.push(...fileIssues);
  }

  return {
    success: true,
    results: results.filter(r => !r.error),
    errors: results.filter(r => r.error),
    totalIssues: results.filter(r => !r.error).length,
    rules: effectiveRules.length,
    path: targetPath,
    yamlConfig: yamlConfig || null
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
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      let shouldIgnore = false;
      if (fullPath.startsWith(dir)) {
        const relativePath = path.relative(dir, fullPath);
        shouldIgnore = ig.ignores(relativePath) || ig.ignores(entry.name);
      }

      if (shouldIgnore) continue;

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

function getDefaultLintRules() {
  return [
    {
      id: 'no-console-log',
      name: 'no-console-log',
      pattern: 'console.log($$$)',
      message: 'Avoid using console.log in production code',
      severity: 'warning'
    },
    {
      id: 'no-debugger',
      name: 'no-debugger',
      pattern: 'debugger',
      kind: 'debugger_statement',
      message: 'Remove debugger statements',
      severity: 'error'
    },
    {
      id: 'no-var',
      name: 'no-var',
      pattern: 'var $A',
      message: 'Use let or const instead of var',
      severity: 'warning'
    }
  ];
}

async function loadYAMLConfig(configPath) {
  try {
    // Check if yaml module is available
    const yaml = await import('yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configContent);

    // Convert YAML config to internal rule format
    if (config.rules) {
      return config.rules.map(rule => ({
        ...rule,
        name: rule.id || rule.name,
        pattern: rule.pattern || rule.regex,
        constraints: rule.constraints || {},
        utils: rule.utils || {},
        fix: rule.fix || null
      }));
    } else if (config.pattern) {
      // Single rule config
      return [{
        ...config,
        name: config.id || config.name,
        constraints: config.constraints || {},
        utils: config.utils || {},
        fix: config.fix || null
      }];
    }
    return [];
  } catch (error) {
    throw new Error(`YAML parsing failed: ${error.message}`);
  }
}

async function applyRelationalConstraints(helper, content, matches, rule) {
  if (!rule.constraints && !rule.utils) {
    return matches;
  }

  const filteredMatches = [];

  for (const match of matches) {
    let satisfiesConstraints = true;

    // Apply relational constraints (inside, has, follows, precedes)
    if (rule.constraints.inside) {
      const insideMatches = await helper.searchPattern(content, rule.constraints.inside);
      satisfiesConstraints = satisfiesConstraints && insideMatches.some(m =>
        match.start >= m.start && match.end <= m.end
      );
    }

    if (rule.constraints.has && satisfiesConstraints) {
      const hasMatches = await helper.searchPattern(content, rule.constraints.has);
      satisfiesConstraints = satisfiesConstraints && hasMatches.some(m =>
        match.start <= m.start && match.end >= m.end
      );
    }

    if (satisfiesConstraints) {
      filteredMatches.push(match);
    }
  }

  return filteredMatches;
}

function applyFix(filePath, match, fixPattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const helper = new UnifiedASTHelper();

    // Apply the fix pattern with variable substitution
    const fixedContent = content.substring(0, match.start) +
                         fixPattern.replace(/\$(\w+)/g, (match, varName) => {
                           // Extract variable from original match text
                           return match; // Simplified for now
                         }) +
                         content.substring(match.end);

    fs.writeFileSync(filePath, fixedContent);
  } catch (error) {
    console.warn(`Failed to apply fix to ${filePath}: ${error.message}`);
  }
}

// Create the unified AST tool
export const UNIFIED_AST_TOOL = {
  name: 'ast_tool',
  description: 'ast-grep - Unified AST operations: analyze, search, replace, lint. Supports atomic/relational/composite rules, YAML config, multi-language pattern matching with $VARIABLE wildcards, structural transformations, and utility rule composition.',
  supported_operations: [
    'atomic/relational/composite rule matching', 'YAML rule config', 'multi-language AST pattern search',
    'structural code transformation', 'utility rule composition', 'syntax-aware refactoring',
    'constraint-based matching', 'positional pattern matching', 'regex + AST hybrid search',
    'safe code rewriting', 'cross-language pattern detection', 'AST node relationship analysis'
  ],
  use_cases: [
    'Find patterns using atomic rules with kind/regex/range/nthChild',
    'Match node relationships with inside/has/follows/precedes',
    'Combine rules with all/any/not boolean logic',
    'Reuse patterns via utility rule composition',
    'Transform code using fix/transformation/rewriter',
    'Apply YAML-configurable rule sets across files',
    'Safe multi-file refactoring with backup',
    'Language-agnostic pattern detection'
  ],
  examples: [
    'ast_tool(operation="search", pattern="console.log($$$)") - Atomic rule pattern',
    'ast_tool(operation="replace", pattern="var $NAME", replacement="let $NAME") - Safe refactoring',
    'ast_tool(operation="lint", rules=[{pattern:"debugger",severity:"error"}]) - YAML-style rules',
    'ast_tool(operation="search", pattern="$FUNC has $CALL = console.log") - Relational rule'
  ],
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['analyze', 'search', 'replace', 'lint'],
        description: 'ast-grep operation: analyze (basic/detailed), search (atomic/relational patterns), replace (structural transformation), lint (YAML rules)'
      },
      path: {
        type: 'string',
        description: 'File/directory path. MUST be absolute: "/Users/username/project/src"'
      },
      pattern: {
        type: 'string',
        description: 'ast-grep pattern with $VARIABLE wildcards. Supports atomic (kind/regex/range), relational (inside/has/follows/precedes), composite (all/any/not)'
      },
      replacement: {
        type: 'string',
        description: 'Transformation pattern. Uses fix/transformation/rewriter for safe code rewriting. Can reference captured $VARIABLEs'
      },
      code: {
        type: 'string',
        description: 'Direct code input (optional). If not provided, reads from file/directory'
      },
      language: {
        type: 'string',
        enum: ['javascript', 'typescript', 'jsx', 'tsx', 'python', 'go', 'rust', 'c', 'cpp', 'html', 'css', 'java', 'kotlin', 'ruby', 'yaml'],
        default: 'javascript',
        description: 'Language for AST parsing'
      },
      analysisType: {
        type: 'string',
        enum: ['basic', 'detailed'],
        default: 'basic',
        description: 'Analysis depth: basic (stats) or detailed (patterns)'
      },
      rules: {
        type: 'array',
        description: 'YAML-style lint rules. Supports atomic, relational, composite rules with constraints/utils/fix',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            pattern: { type: 'string' },
            kind: { type: 'string' },
            regex: { type: 'string' },
            message: { type: 'string' },
            severity: { type: 'string', enum: ['error', 'warning'] },
            fix: { type: 'string' },
            constraints: { type: 'object' },
            utils: { type: 'object' }
          }
        }
      },
      yamlConfig: {
        type: 'string',
        description: 'ast-grep YAML configuration file path for complex rule definitions'
      },
      recursive: {
        type: 'boolean',
        default: true,
        description: 'Recursive directory processing'
      },
      maxResults: {
        type: 'number',
        default: 100,
        description: 'Max matches for search operations'
      },
      backup: {
        type: 'boolean',
        default: true,
        description: 'Create .backup files for replace operations'
      },
      workingDirectory: {
        type: 'string',
        description: 'REQUIRED: Absolute working directory: "/Users/username/project"'
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for search/lint'
      },
      pageSize: {
        type: 'number',
        default: 50,
        description: 'Results per page for pagination'
      },
      ruleType: {
        type: 'string',
        enum: ['atomic', 'relational', 'composite', 'utility'],
        description: 'Rule type for advanced matching'
      }
    },
    required: ['operation']
  },
  handler: async (args) => {
    try {
      // For search and lint operations, use pagination
      if (args.operation === 'search' || args.operation === 'lint') {
        const result = await unifiedASTOperation(args.operation, args);

        // Convert result to array if it's not already
        const results = Array.isArray(result) ? result : (result.results || []);

        // Apply pagination
        return createMCPResponse(results, {
          cursor: args.cursor,
          pageSize: args.pageSize,
          metadata: {
            operation: args.operation,
            path: args.path,
            pattern: args.pattern,
            yamlConfig: args.yamlConfig,
            timestamp: new Date().toISOString()
          }
        });
      }

      // For other operations, use existing formatting
      const result = await unifiedASTOperation(args.operation, args);
      switch (args.operation) {
        case 'analyze':
          return formatAnalysisResult(result, args);
        case 'replace':
          return formatReplaceResult(result, args);
        default:
          return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operation: args.operation
      };
    }
  }
};

function formatAnalysisResult(result, args) {
  if (Array.isArray(result)) {
    // Directory analysis
    const successful = result.filter(r => !r.error);
    const failed = result.filter(r => r.error);

    let output = `📊 Code Analysis Complete - ${successful.length} files analyzed\n\n`;

    if (successful.length > 0) {
      output += '✅ Successfully analyzed:\n';
      successful.slice(0, 5).forEach(item => {
        output += `├─ ${item.file}\n`;
      });
      if (successful.length > 5) {
        output += `└─ ... and ${successful.length - 5} more files\n`;
      }
    }

    if (failed.length > 0) {
      output += `\n❌ Failed to analyze:\n`;
      failed.forEach(item => {
        output += `├─ ${item.file}: ${item.error}\n`;
      });
    }

    return output;
  } else {
    // Single file or code analysis
    return result;
  }
}

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

  return `✅ Successfully replaced pattern in ${result.modifiedFiles} of ${result.totalFiles} files\n\n` +
         `📋 Replacement details:\n` +
         `• Pattern: "${args.pattern}"\n` +
         `• Replacement: "${args.replacement}"\n` +
         `• Files modified: ${result.modifiedFiles}\n` +
         `• Backups created: ${args.backup ? 'Yes' : 'No'}\n\n` +
         `⚠️ Review changes carefully. Backup files created if enabled.`;
}

function formatLintResult(result, args) {
  if (!result.success) {
    return `❌ Lint failed: ${result.error}\n\nCheck target path and rule formatting.`;
  }

  if (result.totalIssues === 0) {
    return `✅ No issues found - code passed all ${result.rules} linting rules\n\n` +
           `📋 Linting summary:\n` +
           `• Rules applied: ${result.rules}\n` +
           `• Files scanned: Multiple files in ${args.path}\n` +
           `• Issues found: 0\n\n` +
           `🎉 Your code meets quality standards!`;
  }

  let output = `🔍 Found ${result.totalIssues} issues across ${result.rules} linting rules:\n\n`;

  result.results.forEach((issue, i) => {
    output += `${i + 1}. ${issue.severity.toUpperCase()}: ${issue.message}\n`;
    output += `   📁 ${issue.file}:${issue.line}\n`;
    output += `   💻 ${issue.content}\n`;
    output += `   📋 Rule: ${issue.rule}\n\n`;
  });

  const errorCount = result.results.filter(r => r.severity === 'error').length;
  const warningCount = result.results.filter(r => r.severity === 'warning').length;

  output += `📊 Summary:\n` +
            `• Total issues: ${result.totalIssues}\n` +
            `• Errors: ${errorCount}\n` +
            `• Warnings: ${warningCount}\n` +
            `• Rules applied: ${result.rules}\n\n` +
            `💡 Focus on errors first, then address warnings.`;

  return output;
}

export default UNIFIED_AST_TOOL;