import ignore from 'ignore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// Console output is now suppressed globally in index.js when MCP_MODE is set

/**
 * Common Ignore Patterns Module
 * Provides unified ignore pattern handling for all tools and hooks
 */

// Core default ignore patterns used across all tools
export const CORE_IGNORE_PATTERNS = [
  // Version control
  '.git/**',
  '.svn/**',
  '.hg/**',

  // Dependencies and packages
  'node_modules/**',
  'vendor/**',
  'bower_components/**',

  // Build outputs
  'dist/**',
  'build/**',
  'out/**',
  'output/**',
  'generated/**',
  '.next/**',
  '.nuxt/**',
  '.out/**',
  '.public/**',
  '.turbo/**',
  '.vercel/**',
  '.netlify/**',

  // Cache and temporary files
  '.cache/**',
  '.temp/**',
  'cache/**',
  'temp/**',
  'tmp/**',
  '*.tmp',
  '*.temp',
  '*.log',
  '*.bak',
  '*.swp',
  '*.swo',

  // Environment and config files
  '.env*',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',

  // Coverage and testing
  'coverage/**',
  '.nyc_output/**',
  'reports/**',
  '**/test/**',
  '**/*.test.*',
  '**/*.spec.*',

  // Development tools
  '.vscode/**',
  '.idea/**',
  '.swp/**',
  '.swo/**',
  '.DS_Store',
  'Thumbs.db',

  // Package and config files
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.*.json',
  'jest.config.*',
  'webpack.config.*',
  'vite.config.*',
  'tailwind.config.*',

  // Documentation and notes
  '**/*.md',
  '**/*.txt',
  'docs/**',
  'README*',
  'LICENSE*',
  'CHANGELOG*',

  // Data and storage
  'data/**',
  'logs/**',
  'storage/**',
  'database/**',
  '**/*.sqlite',
  '**/*.db',
  '**/*.sql',

  // Binary and media files
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.svg',
  '**/*.ico',
  '**/*.pdf',
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
  '**/*.rar',
  '**/*.7z',

  // Generated files and maps
  '**/*.min.*',
  '**/*.map',
  '**/*.bundle.*',

  // Claude-specific directories
  '.claude/**',
  '.thoughts/**',
  'code_search_index/**',
  '.claude-cache/**',
  'results/**',
  'optimized-test*/**',
  'debug-*/**',

  // Monorepo patterns
  'packages/**',
  'apps/**',

  // Language-specific
  'target/**',        // Rust/Java
  '__pycache__/**',   // Python
  '*.pyc',           // Python
  '*.pyo',           // Python
  '*.pyd',           // Python
  '.pytest_cache/**', // Python
  'venv/**',         // Python
  'env/**',          // Python

  // Large file types
  '**/*.mp4',
  '**/*.avi',
  '**/*.mov',
  '**/*.wmv',
  '**/*.flv',
  '**/*.mkv',
  '**/*.mp3',
  '**/*.wav',
  '**/*.flac',
  '**/*.aac',
];

// Extension-based ignore patterns for source code filtering
export const SOURCE_CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
  '.java', '.kt', '.scala', '.swift', '.objc', '.m',
  '.rb', '.php', '.pl', '.pm', '.lua',
  '.sh', '.bash', '.zsh', '.fish',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml', '.xml', 'csv',
  '.sql', '.graphql', '.gql',
  '.dockerfile', 'docker-compose.yml', 'docker-compose.yaml'
];

/**
 * Creates a unified ignore filter with recursive .gitignore support
 */
export function createIgnoreFilter(rootDir, customPatterns = [], options = {}) {
  const {
    useGitignore = true,
    useDefaults = true,
    caseSensitive = false
  } = options;

  const ig = ignore({ caseSensitive });

  // Add core patterns
  if (useDefaults) {
    ig.add(CORE_IGNORE_PATTERNS);
  }

  // Add custom patterns
  if (customPatterns.length > 0) {
    ig.add(customPatterns);
  }

  // Add .gitignore files recursively
  if (useGitignore) {
    addGitignoreFiles(ig, rootDir);
  }

  return {
    ig,
    rootDir,
    ignores: (filePath) => {
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      return ig.ignores(relativePath);
    },
    add: (patterns) => ig.add(patterns),
    createSubFilter: (subDir) => createIgnoreFilter(subDir, customPatterns, options)
  };
}

/**
 * Recursively adds all .gitignore files in the directory tree
 */
function addGitignoreFiles(ig, rootDir) {
  const scanGitignoreFiles = (dir) => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      // Check for .gitignore in current directory
      const gitignorePath = path.join(dir, '.gitignore');
      if (existsSync(gitignorePath)) {
        try {
          const content = readFileSync(gitignorePath, 'utf8');
          const patterns = content
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => line.trim());

          if (patterns.length > 0) {
            ig.add(patterns);
          }
        } catch (error) {
          // Silently handle .gitignore read errors
          console.warn(`Warning: Could not read .gitignore at ${gitignorePath}: ${error.message}`);
        }
      }

      // Recursively scan subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          // Skip .git directory and other ignored directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanGitignoreFiles(fullPath);
          }
        }
      }
    } catch (error) {
      // Silently handle directory access errors
      console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
    }
  };

  scanGitignoreFiles(rootDir);
}

/**
 * Creates a file filter function for specific extensions
 */
export function createExtensionFilter(extensions = SOURCE_CODE_EXTENSIONS) {
  return (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return extensions.includes(ext);
  };
}

/**
 * Combines ignore filter with extension filter
 */
export function createFileFilter(rootDir, customPatterns = [], options = {}) {
  const {
    extensions = SOURCE_CODE_EXTENSIONS,
    ...ignoreOptions
  } = options;

  const ignoreFilter = createIgnoreFilter(rootDir, customPatterns, ignoreOptions);
  const extensionFilter = createExtensionFilter(extensions);

  return {
    ...ignoreFilter,
    shouldProcess: (filePath) => {
      return !ignoreFilter.ignores(filePath) && extensionFilter(filePath);
    },
    filterFiles: (files) => files.filter(file => ignoreFilter.shouldProcess(file))
  };
}

/**
 * Legacy compatibility function
 */
export function getDefaultIgnorePatterns() {
  return CORE_IGNORE_PATTERNS;
}

/**
 * Legacy compatibility function
 */
export function shouldIgnoreFile(filePath, ignorePatterns = null) {
  const patterns = ignorePatterns || CORE_IGNORE_PATTERNS;
  const ignoreFilter = createIgnoreFilter(path.dirname(filePath), patterns);
  return ignoreFilter.ignores(filePath);
}

/**
 * Loads custom ignore patterns from various sources
 */
export function loadCustomIgnorePatterns(workingDirectory) {
  const patterns = [];

  try {
    // Check for .searchignore file
    const searchignorePath = path.join(workingDirectory, '.searchignore');
    if (existsSync(searchignorePath)) {
      const content = readFileSync(searchignorePath, 'utf8');
      patterns.push(...content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim())
      );
    }

    // Check for .search-defaults.json
    const searchDefaultsPath = path.join(workingDirectory, '.search-defaults.json');
    if (existsSync(searchDefaultsPath)) {
      const customDefaults = JSON.parse(readFileSync(searchDefaultsPath, 'utf8'));
      if (customDefaults.ignorePatterns) {
        patterns.push(...customDefaults.ignorePatterns);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load custom ignore patterns: ${error.message}`);
  }

  return patterns;
}

export default {
  CORE_IGNORE_PATTERNS,
  SOURCE_CODE_EXTENSIONS,
  createIgnoreFilter,
  createExtensionFilter,
  createFileFilter,
  getDefaultIgnorePatterns,
  shouldIgnoreFile,
  loadCustomIgnorePatterns
};