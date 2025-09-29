import ignore from 'ignore';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
const ignoreFilterCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; 
export const CORE_IGNORE_PATTERNS = [
  // Version control and build artifacts
  '**/.git',
  '**/.svn',
  '**/.hg',
  '**/node_modules',
  '**/build',
  '**/dist',
  '**/target',
  '**/out',
  '**/public/build',
  '**/.next',
  '**/.nuxt',
  '**/.out',
  '**/.turbo',
  '**/.vercel',
  '**/.netlify',

  // Dependencies and package managers
  '**/vendor',
  '**/bower_components',
  '**/jspm_packages',

  // Testing and coverage
  '**/coverage',
  '**/.coverage',
  '**/.nyc_output',
  '**/.pytest_cache',
  '**/__pycache__',
  '**/*.pyc',
  '**/*.pyo',
  '**/*.pyd',
  '**/.mypy_cache',
  '**/venv',
  '**/env',
  '**/.env',
  '**/.venv',
  '**/conda',

  // IDE and editor files
  '**/.vscode',
  '**/.idea',
  '**/.vs',
  '**/.swp',
  '**/.swo',
  '**/.DS_Store',
  '**/Thumbs.db',

  // OS generated files
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/.Spotlight-V100',
  '**/.Trashes',
  '**/ehthumbs.db',
  '**/Desktop.ini',

  // Logs and temporary files
  '**/.log',
  '**/.tmp',
  '**/.temp',
  '**/tmp',
  '**/temp',
  '**/.cache',
  '**/.parcel-cache',

  // Documentation and generated files
  '**/*.log',
  '**/.env.local',
  '**/.env.*.local',
  '**/docs/build',
  '**/site/public',

  // Modern development and build artifacts
  '**/.pnp',
  '**/.pnp.js',
  '**/.yarn',
  '**/.yarnrc.yml',
  '**/.pnpm-debug.log',
  '**/.eslintcache',
  '**/.stylelintcache',
  '**/.rts2_cache_cjs',
  '**/.rts2_cache_esm',
  '**/.rts2_cache_umd',
  '**/.parcel-cache',

  // Testing and coverage
  '**/junit.xml',
  '**/coverage.xml',
  '**/test-results',
  '**/playwright-report',
  '**/nyc_report',
  '**/.test-output',

  // TypeScript and build outputs
  '**/*.d.ts.map',
  '**/*.js.map',
  '**/*.tsbuildinfo',
  '**/.angular',
  '**/.nx',
  '**/.amplify',

  // Package manager lock files (large and not source code)
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lockb',

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

  // Minified and bundled files
  '**/*.min.*',
  '**/*.map',
  '**/*.bundle.*',
  '**/bundle.*',

  // Database files
  '**/*.sqlite',
  '**/*.db',
  '**/*.sql',

  // Test files and fixtures
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__',
  '**/__mocks__',
  '**/fixtures',
  '**/test_data',

  // Claude and AI related
  '.claude**',
  '**/.claude',
  'debug-**.*',

  // Package lock files
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lockb',

  // Build and CI cache
  '**/.cache',
  '**/.angular',
  '**/.svelte-kit',

  // Results and glootie generated files
  '**/results',
  '**/glootie',

  // Miscellaneous
  '**/.npmrc',
  '**/.yarnrc',
  '**/.node-version',
  '**/.nvmrc',
  '**/todo.md',
  '**/readme.md',
  '**/license',
  '**/changelog.md',
  '**/contributing.md'
];

export const SOURCE_CODE_EXTENSIONS = [
  // Core web development
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',

  // Systems programming
  '.go', '.rs', '.py', '.pyx',
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',

  // JVM languages
  '.java', '.kt', '.scala', '.groovy',

  // Mobile and Swift
  '.swift', '.m', '.mm', '.dart',

  // Shell and scripting
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.pl', '.pm', '.t', '.pod', '.lua',

  // Data and configuration
  '.r', '.R', '.Rmd', '.sql',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.conf',

  // Web markup and styling (processed selectively)
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.vue', '.svelte', '.astro',

  // Documentation (limited processing)
  '.md', '.markdown', '.txt'

  // Removed redundant extensions and non-essential formats
  // for better performance and focus on source code
];

export function createIgnoreFilter(rootDir, customPatterns = [], options = {}) {
  const {
    useGitignore = true,
    useDefaults = true,
    caseSensitive = false,
    useCache = true
  } = options;
  
  const cacheKey = JSON.stringify({
    rootDir: path.resolve(rootDir),
    customPatterns: customPatterns.sort(),
    useGitignore,
    useDefaults,
    caseSensitive
  });
  
  if (useCache) {
    const cached = ignoreFilterCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.filter;
    }
  }
  const ig = ignore({ caseSensitive });
  
  if (useDefaults) {
    ig.add(CORE_IGNORE_PATTERNS);
  }
  
  if (customPatterns.length > 0) {
    ig.add(customPatterns);
  }
  
  if (useGitignore) {
    addGitignoreFiles(ig, rootDir);
  }
  const filter = {
    ig,
    rootDir,
    ignores: (filePath) => {
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      return ig.ignores(relativePath);
    },
    add: (patterns) => ig.add(patterns),
    createSubFilter: (subDir) => createIgnoreFilter(subDir, customPatterns, options)
  };
  
  if (useCache) {
    ignoreFilterCache.set(cacheKey, {
      filter,
      timestamp: Date.now()
    });
  }
  return filter;
}
function addGitignoreFiles(ig, rootDir) {
  const scannedDirs = new Set();
  const MAX_DEPTH = 10;
  const MAX_DIRS = 1000;
  const scanGitignoreFiles = (dir, depth = 0) => {
    
    if (depth > MAX_DEPTH) return;
    if (scannedDirs.size > MAX_DIRS) return;
    const dirKey = path.resolve(dir);
    if (scannedDirs.has(dirKey)) return;
    scannedDirs.add(dirKey);
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      
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
          
          console.warn(`Warning: Could not read .gitignore at ${gitignorePath}: ${error.message}`);
        }
      }
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.name.startsWith('.') ||
              entry.name === 'node_modules' ||
              entry.name === 'dist' ||
              entry.name === 'build' ||
              entry.name === 'target' ||
              entry.name === 'vendor' ||
              entry.name === 'coverage' ||
              entry.name === '.git') {
            continue;
          }
          scanGitignoreFiles(fullPath, depth + 1);
        }
      }
    } catch (error) {
      
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
      }
    }
  };
  scanGitignoreFiles(rootDir);
}
export function createExtensionFilter(extensions = SOURCE_CODE_EXTENSIONS) {
  return (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return extensions.includes(ext);
  };
}
export function createFileFilter(rootDir, customPatterns = [], options = {}) {
  const {
    extensions = SOURCE_CODE_EXTENSIONS,
    ...ignoreOptions
  } = options;
  const ignoreFilter = createIgnoreFilter(rootDir, customPatterns, ignoreOptions);
  const extensionFilter = createExtensionFilter(extensions);
  const fileFilter = {
    ...ignoreFilter,
    shouldProcess: (filePath) => {
      return !ignoreFilter.ignores(filePath) && extensionFilter(filePath);
    },
    filterFiles: (files) => files.filter(file => fileFilter.shouldProcess(file))
  };
  return fileFilter;
}
export function getDefaultIgnorePatterns() {
  return CORE_IGNORE_PATTERNS;
}
export function shouldIgnoreFile(filePath, ignorePatterns = null) {
  const patterns = ignorePatterns || CORE_IGNORE_PATTERNS;
  const ignoreFilter = createIgnoreFilter(path.dirname(filePath), patterns);
  return ignoreFilter.ignores(filePath);
}
export function loadCustomIgnorePatterns(workingDirectory) {
  const patterns = [];
  try {
    
    const searchignorePath = path.join(workingDirectory, '.searchignore');
    if (existsSync(searchignorePath)) {
      const content = readFileSync(searchignorePath, 'utf8');
      patterns.push(...content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim())
      );
    }
    
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
export function clearIgnoreCache() {
  ignoreFilterCache.clear();
}
export function getCacheStats() {
  return {
    size: ignoreFilterCache.size,
    entries: Array.from(ignoreFilterCache.entries())
  };
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