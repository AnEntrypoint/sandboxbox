import ignore from 'ignore';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
const ignoreFilterCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; 
export const CORE_IGNORE_PATTERNS = [
  
  '.gittest*.test.*',
  '**/*.spec.*',
  
  '.vscode*.md',
  '**/*.txt',
  'docs*.sqlite',
  '**/*.db',
  '**/*.sql',
  
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
  
  '**/*.min.*',
  '**/*.map',
  '**/*.bundle.*',
  
  '.claude**',
  'debug-**.mp4',
  '**/*.avi',
  '**/*.mov',
  '**/*.wmv',
  '**/*.flv',
  '**/*.mkv',
  '**/*.mp3',
  '**/*.wav',
  '**/*.flac',
  '**/*.aac',
  
  '**/node_modules',
  '**/.git',
  '**/build',
  '**/dist',
  '**/target',
  '**/coverage',
  '**/.next',
  '**/.nuxt',
  '**/.out',
  '**/.turbo',
  '**/.vercel',
  '**/.netlify',
  '**/venv',
  '**/env',
  '**/.pytest_cache',
  '**/__pycache__',
  '**/*.pyc',
  '**/*.pyo',
  '**/*.pyd',
  '**/.cache',
  '**/temp',
  '**/tmp'
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
  return {
    ...ignoreFilter,
    shouldProcess: (filePath) => {
      return !ignoreFilter.ignores(filePath) && extensionFilter(filePath);
    },
    filterFiles: (files) => files.filter(file => ignoreFilter.shouldProcess(file))
  };
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