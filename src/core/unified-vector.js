#!/usr/bin/env node

import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import os from 'os';
import ignore from 'ignore';

const platform = {
  arch: os.arch(),
  platform: os.platform(),
  isARM64: os.arch() === 'arm64',
  isX64: os.arch() === 'x64',
  isMacOS: os.platform() === 'darwin',
  isLinux: os.platform() === 'linux',
  isWindows: os.platform() === 'win32'
};

const INDEX_DIR = './code_search_index';
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';
const DEFAULT_DIM = 384; // Dimension size for the chosen model
const DEFAULT_EXTS = [
  // JavaScript/TypeScript
  'js', 'ts', 'jsx', 'tsx',
  // Go
  'go',
  // Rust
  'rs',
  // Python
  'py', 'pyx', 'pyi',
  // C/C++
  'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hh', 'hxx',
  // Additional useful formats
  'json', 'yaml', 'yml', 'toml', 'md', 'txt'
];
const DEFAULT_IGNORES = [
  '**/node_modules/**', '**/.git/**', '**/.node_modules/**',
  '**/dist/**', '**/build/**', '**/coverage/**', '**/.nyc_output/**',
  '**/tmp/**', '**/temp/**', '**/.tmp/**', '**/.cache/**', '**/.parcel-cache/**',
  '**/.next/**', '**/.nuxt/**', '**/.vuepress/**', '**/.docusaurus/**',
  '**/public/**', '**/static/**', '**/assets/**', '**/images/**', '**/img/**',
  '**/.vscode/**', '**/.idea/**', '**/.DS_Store/**', '**/Thumbs.db/**',
  '**/out/**', '**/output/**', '**/generated/**', '**/gen/**',
  '**/.angular/**', '**/.react/**', '**/.svelte-kit/**',
  '**/storybook-static/**', '**/docs-build/**', '**/build-docs/**',
  '**/.vite/**', '**/.turbo/**', '**/.nx/**', '**/.swc/**',
  '**/bower_components/**', '**/jspm_packages/**', '**/.pnp/**',
  '**/__tests__/**', '**/__mocks__/**', '**/__snapshots__/**',
  '**/.jest/**', '**/.mocha/**', '**/.cypress/**', '**/.playwright/**',
  '**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml',
  '**/.npmrc', '**/.yarnrc', '**/.pnpmrc',
  '**/test-*.js', '**/test-*.ts', '**/*.test.js', '**/*.test.ts',
    '**/optimized-test-*/**',
  '**/*.spec.js', '**/*.spec.ts', '**/temp-*.js', '**/ab-test-*.js',
  '**/*.min.js', '**/*.bundle.js', '**/*.chunk.js',
  // Language-specific ignores
  '**/target/**', '**/Cargo.lock', // Rust
  '**/go.sum', '**/vendor/**', // Go
  '**/__pycache__/**', '**/*.pyc', '**/venv/**', '**/env/**', '**/.env/**', // Python
  '**/CMakeCache.txt', '**/CMakeFiles/**', '**/*.o', '**/*.a', '**/*.so', // C/C++
  '**/*.log', '**/*.xml', '**/*.csv',
  '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.ico',
  '**/*.pdf', '**/*.zip', '**/*.tar', '**/*.gz', '**/*.7z', '**/*.dmg',
  '**/*.exe', '**/*.dll', '**/*.so', '**/*.dylib',
  '**/coverage/**', '**/reports/**', '**/docs/**', '**/documentation/**'
];

const MAX_FILE_SIZE = 150 * 1024; // 150KB file size cap for performance
const MAX_LINES_PER_CHUNK = 500; // Maximum lines per code chunk
const MAX_CACHE_SIZE = 1000; // Maximum number of cached embeddings

const INDEX_FILE = 'code_index.json';
const VECTOR_INDEX_FILE = 'vector_index.json';

const platformConfig = {
  memoryLimit: platform.isARM64 ? 1024 * 1024 * 1024 : 512 * 1024 * 1024, // 1GB for ARM64, 512MB for others
  batchSize: platform.isARM64 ? 64 : 32, // Increased batch size for better performance
  maxConcurrency: platform.isARM64 ? 6 : 3, // Higher concurrency for ARM64
  timeout: platform.isARM64 ? 45000 : 25000 // Reduced timeout due to optimizations
};

let codeChunks = [];
let embeddingExtractor = null;
let isInitialized = false;
let embeddingCache = new Map(); // Cache for embeddings to avoid recomputation
let indexTimestamp = 0; // Track when index was last updated

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

const embeddingLRUCache = new LRUCache(MAX_CACHE_SIZE);

async function initializeEmbeddingProvider() {
  try {
    const { pipeline } = await import('@xenova/transformers');
    embeddingExtractor = await pipeline('feature-extraction', DEFAULT_MODEL);
    return true;
  } catch (error) {
    throw new Error(`Transformers.js initialization failed: ${error.message}`);
  }
}

export function getDefaultIgnorePatterns(workingDirectory) {
  const defaultPatterns = {
    files: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '**/.nyc_output/**',
      '**/.git/**',
      '**/.vscode/**',
      '**/.idea/**',
      '**/*.log',
      '**/*.tmp',
      '**/temp/**',
      '**/tmp/**',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.map',
      '**/*.min.js',
      '**/*.min.css',
      '**/package-lock.json',
      '**/yarn.lock'
    ],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
    directories: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'out',
      'coverage',
      '.nyc_output',
      '.git',
      '.vscode',
      '.idea',
      'temp',
      'tmp'
    ]
  };

  // Try to read custom ignore patterns from the working directory
  try {
    // Check for custom search defaults
    const searchDefaultsPath = path.join(workingDirectory, '.search-defaults.json');
    if (existsSync(searchDefaultsPath)) {
      const customDefaults = JSON.parse(readFileSync(searchDefaultsPath, 'utf8'));
      return { ...defaultPatterns, ...customDefaults };
    }

    // Check for .gitignore
    const gitignorePath = path.join(workingDirectory, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignoreContent = readFileSync(gitignorePath, 'utf8');
      const gitignorePatterns = gitignoreContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());

      return {
        ...defaultPatterns,
        customGitignore: gitignorePatterns
      };
    }
  } catch (error) {
    // If we can't read files, just return defaults
    console.warn('Warning: Could not read ignore patterns, using defaults:', error.message);
  }

  return defaultPatterns;
}


function createIgnoreFilter(rootDir) {
  const ig = ignore();
  ig.add(DEFAULT_IGNORES);

  // Get default patterns
  const defaultPatterns = getDefaultIgnorePatterns(rootDir);

  // Add any custom patterns from defaults
  if (defaultPatterns.customGitignore) {
    ig.add(defaultPatterns.customGitignore);
  }

  // Add file patterns from defaults
  if (defaultPatterns.files) {
    ig.add(defaultPatterns.files);
  }

  // Find and add all .gitignore files in the directory tree
  const addGitignoreFiles = (dir) => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isFile() && entry.name === '.gitignore') {
          try {
            const content = readFileSync(fullPath, 'utf8');
            ig.add(content);
          } catch (error) {
            // Silently handle .gitignore read errors
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && !DEFAULT_IGNORES.includes(entry.name)) {
          // Recursively add .gitignore files from subdirectories
          addGitignoreFiles(fullPath);
        }
      }
    } catch (error) {
      // Silently handle directory read errors
    }
  };

  addGitignoreFiles(rootDir);
  return { ig, rootDir };
}

function shouldIndexFile(filePath, allowedExtensions) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return false;
  }

  const filename = path.basename(filePath);
  const excludedPatterns = [
    /\.min\.js$/, /\.bundle\.js$/, /\.pack\.js$/,
    /\.d\.ts$/, /\.d\.tsx$/,
    /\.map$/, /\.css\.map$/,
    /^package\.json$/, /^package-lock\.json$/, /^yarn\.lock$/, /^pnpm-lock\.yaml$/,
    /^tsconfig\.json$/, /^jsconfig\.json$/,
    /\.eslintrc\..*$/, /\.prettierrc\..*$/,
    /^LICENSE.*$/, /^README.*$/, /^.*\.md$/, /^CHANGELOG.*$/,
    /^Dockerfile.*$/, /^docker-compose.*\.yml$/
  ];

  return !excludedPatterns.some(pattern => pattern.test(filename));
}

function detectLanguageFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.go': 'go',
    '.rs': 'rust',
    '.py': 'python',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp'
  };
  return languageMap[ext] || 'text';
}

function getLanguagePatterns(language) {
  const patterns = {
    javascript: /^(function|class|const|let|var|export|import)\s+\w/,
    typescript: /^(function|class|const|let|var|export|import|interface|type|enum)\s+\w/,
    go: /^(func|type|var|const|import|package)\s+\w/,
    rust: /^(fn|struct|enum|impl|trait|use|mod|pub)\s+\w/,
    python: /^(def|class|import|from)\s+\w/,
    c: /^(int|void|char|float|double|struct|enum|typedef|#include|#define)\s+\w/,
    cpp: /^(int|void|char|float|double|class|struct|namespace|template|#include|#define)\s+\w/
  };
  return patterns[language] || /^[a-zA-Z_]\w*\s*[({]/;
}

function processCodeIntoChunks(content, filePath) {
  const chunks = [];
  const lines = content.split('\n');
  const language = detectLanguageFromPath(filePath);
  const languagePattern = getLanguagePatterns(language);

  let currentChunk = '';
  let inFunction = false;
  let inClass = false;
  let braceCount = 0;
  let chunkLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.match(languagePattern)) {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          file: filePath,
          language: language,
          startLine: Math.max(0, i - currentChunk.split('\n').length),
          endLine: i
        });
      }
      currentChunk = line;
      braceCount = (line.match(/{/g) || []).length;
      inFunction = trimmedLine.startsWith('function');
      inClass = trimmedLine.startsWith('class');
      chunkLineCount = 1;
    } else {
      currentChunk += '\n' + line;
      chunkLineCount++;

      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if ((braceCount === 0 && (inFunction || inClass)) || chunkLineCount >= MAX_LINES_PER_CHUNK) {
        chunks.push({
          content: currentChunk.trim(),
          file: filePath,
          startLine: Math.max(0, i - currentChunk.split('\n').length),
          endLine: i
        });
        currentChunk = '';
        inFunction = false;
        inClass = false;
        chunkLineCount = 0;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      file: filePath,
      language: language,
      startLine: Math.max(0, lines.length - currentChunk.split('\n').length),
      endLine: lines.length - 1
    });
  }

  return chunks;
}

async function loadIndex(indexDir) {
  try {
    const indexPath = path.join(indexDir, INDEX_FILE);
    if (existsSync(indexPath)) {
      const indexData = JSON.parse(readFileSync(indexPath, 'utf8'));
      codeChunks = indexData.chunks || [];
      indexTimestamp = indexData.timestamp || 0;
    }
  } catch (error) {
    // If loading fails, start fresh
    codeChunks = [];
    indexTimestamp = 0;
  }
}

async function scanDirectory(dir, ignoreFilter, files, exts) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Process files in parallel for better performance
    const filePromises = entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(ignoreFilter.rootDir, fullPath);

      if (ignoreFilter.ig.ignores(relativePath)) {
        return null;
      }

      if (entry.isDirectory()) {
        return scanDirectory(fullPath, ignoreFilter, files, exts);
      } else if (entry.isFile()) {
        if (shouldIndexFile(fullPath, exts)) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size <= MAX_FILE_SIZE) { // 150KB limit
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files we can't stat
          }
        }
      }
      return null;
    });

    await Promise.all(filePromises);
  } catch (error) {
    // Skip directories we can't read
  }
}

async function getLastModifiedTime(folders) {
  let lastModified = 0;

  for (const folder of folders) {
    try {
      const files = await fs.readdir(folder, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile()) {
          const fullPath = path.join(folder, file.name);
          const stats = await fs.stat(fullPath);
          lastModified = Math.max(lastModified, stats.mtimeMs);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  return lastModified;
}

async function getEmbedding(text) {
  const cacheKey = text; // Use text as cache key

  const cached = embeddingLRUCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Optimize embedding extraction with reduced model size and better settings
  const embedding = await embeddingExtractor(text, {
    pooling: 'mean',
    normalize: true,
    truncation: true // Enable truncation for long texts
  });

  embeddingLRUCache.set(cacheKey, embedding);

  return embedding;
}

function calculateCosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export async function initializeVectorSystem(indexDir = INDEX_DIR) {
  if (isInitialized) return true;

  try {
    if (!existsSync(indexDir)) {
      mkdirSync(indexDir, { recursive: true });
    }

    if (!embeddingExtractor) {
      await initializeEmbeddingProvider();
    }

    await loadIndex(indexDir);

    isInitialized = true;
    return true;
  } catch (error) {
    throw new Error(`Vector system initialization failed: ${error.message}`);
  }
}

// Process files into chunks
export function processFile(file, codeChunks) {
  const newChunks = [];

  try {
    const stats = fs.statSync(file);
    if (stats.size > MAX_FILE_SIZE) {
      console.log(`File ${file} is large (${stats.size} bytes), truncating`);
      let content = fs.readFileSync(file, 'utf8');

      if (content.length > MAX_FILE_SIZE) {
        content = content.substring(0, MAX_FILE_SIZE);
      }

      const chunks = [{
        content,
        file,
        type: 'code',
        metadata: { truncated: true, originalSize: stats.size }
      }];
      newChunks.push(...chunks);
    }
  } catch (error) {
    console.error(`Error reading file ${file}:`, error);
  }

  const updatedChunks = newChunks.length > 0 ? newChunks : codeChunks;

  const indexData = {
    chunks: updatedChunks,
    timestamp: Date.now(),
    version: '1.0'
  };

  return indexData;
}

export async function syncVectorIndex(folders, exts = DEFAULT_EXTS, ignores = DEFAULT_IGNORES) {
  if (!isInitialized) {
    await initializeVectorSystem();
  }

  const files = [];
  const startTime = Date.now();

  const lastModified = await getLastModifiedTime(folders);
  if (lastModified <= indexTimestamp && codeChunks.length > 0) {
    return codeChunks.length; // Index is up to date
  }

  for (const folder of folders) {
    const ignoreFilter = createIgnoreFilter(folder);
    await scanDirectory(folder, ignoreFilter, files, exts);
  }

  const newChunks = [];
  let skippedFiles = 0;

  for (const file of files) {
    try {
      const stats = await fs.stat(file);

      if (stats.size > MAX_LARGE_FILE_SIZE) {
        skippedFiles++;
        continue;
      }

      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib'].includes(ext)) {
        skippedFiles++;
        continue;
      }

      let content = await fs.readFile(file, 'utf8');
      if (stats.size > MAX_FILE_SIZE) {
        content = content.substring(0, MAX_FILE_SIZE);
      }

      const chunks = processCodeIntoChunks(content, file);
      newChunks.push(...chunks);
    } catch (error) {
      // Skip files that can't be processed
    }
  }

  if (newChunks.length > codeChunks.length * 1.5 || newChunks.length < codeChunks.length * 0.5) {
    embeddingLRUCache.clear();
  }

  codeChunks = newChunks;
  indexTimestamp = startTime;

  const indexData = {
    timestamp: indexTimestamp,
    chunks: codeChunks.map(c => ({
      file: c.file,
      content: c.content,
      startLine: c.startLine,
      endLine: c.endLine
    }))
  };

  writeFileSync(path.join(INDEX_DIR, INDEX_FILE), JSON.stringify(indexData, null, 2));

  return codeChunks.length;
}

export async function queryVectorIndex(query, topK = 8) {
  if (!isInitialized) {
    await initializeVectorSystem();
  }

  if (codeChunks.length === 0) {
    return [];
  }

  const queryEmbedding = await getEmbedding(query);

  const results = [];
  // Increased batch size for better performance
  const batchSize = platformConfig.batchSize * 2;

  for (let i = 0; i < codeChunks.length; i += batchSize) {
    const batch = codeChunks.slice(i, i + batchSize);
    const batchPromises = batch.map(async (chunk) => {
      const chunkEmbedding = await getEmbedding(chunk.content);
      const similarity = calculateCosineSimilarity(queryEmbedding.data, chunkEmbedding.data);

      return {
        file: chunk.file,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        similarity: similarity
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map(r => ({
      file: r.file,
      content: r.content,
      startLine: r.startLine,
      endLine: r.endLine,
      score: r.similarity
    }));
}

export async function searchCode(query, workingDirectory, folders = ['.'], extensions = DEFAULT_EXTS, topK = 6) {
  try {
    if (!existsSync(workingDirectory)) {
      return [];
    }

    const initPromise = isInitialized ? Promise.resolve() : initializeVectorSystem();
    await Promise.race([
      initPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 10000))
    ]);

    const absFolders = folders.map(f => path.resolve(workingDirectory, f));

    await syncVectorIndex(absFolders, extensions);
    return await queryVectorIndex(query, topK);

  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

export async function searchSemantic(query, options = {}) {
  const { workingDirectory, folders = ['.'], extensions = DEFAULT_EXTS, topK = 6 } = options;
  return await searchCode(query, workingDirectory, folders, extensions, topK);
}

export async function initialize(indexDir = INDEX_DIR) {
  return await initializeVectorSystem(indexDir);
}

export async function syncIndex(folders, exts = DEFAULT_EXTS, ignores = DEFAULT_IGNORES) {
  return await syncVectorIndex(folders, exts, ignores);
}

export async function queryIndex(query, topK = 8) {
  return await queryVectorIndex(query, topK);
}

export {
  MAX_FILE_SIZE,
  MAX_LINES_PER_CHUNK,
  DEFAULT_EXTS,
  DEFAULT_IGNORES,
  INDEX_DIR,
  INDEX_FILE,
  VECTOR_INDEX_FILE,
  platformConfig,
  embeddingLRUCache,
  codeChunks,
  isInitialized,
  embeddingExtractor
};

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

function formatSearchResults(results, query, path) {
  if (results.length === 0) {
    return `No results found for "${query}" in ${path}`;
  }

  return `Found ${results.length} results for "${query}" in ${path}:\n\n${results.map(r => `${r.file}:${r.startLine}-${r.endLine}\n${r.content.substring(0, 200)}...\nScore: ${r.score.toFixed(3)}`).join('\n\n')}`;
}

function createTimeoutToolHandler(handler, toolName = 'Unknown Tool', timeoutMs = 30000) {
  return async (args) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([
        handler(args),
        timeoutPromise
      ]);
    } catch (error) {
      if (error.message.includes('timed out')) {
        return createErrorResponse(`Tool ${toolName} timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  };
}

import { createMCPResponse, withPagination } from './mcp-pagination.js';

export const searchTools = [
  {
    name: "searchcode",
    description: "Semantic code search optimized for technical code discovery. Supports pagination for large result sets. Use precise terms: 'useState hooks' not 'manage state', 'API authentication' not 'login system'",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query. Use specific technical terms: 'React hooks', 'error handling', 'database connections'" },
        path: { type: "string", description: "Directory to search in (default: current directory). MUST be absolute path like '/Users/username/project/src' not relative like './src'" },
        workingDirectory: { type: "string", description: "Optional: Absolute path to working directory base path. If not provided, defaults to current directory. Use full paths like '/Users/username/project' not relative paths like './project'." },
        cursor: { type: "string", description: "Pagination cursor from previous search results" },
        pageSize: { type: "number", description: "Number of results per page (default: 6)" },
        topK: { type: "number", description: "Maximum total results to consider (default: 20)" }
      },
      required: ["query"]
    },
    handler: createTimeoutToolHandler(withPagination(async ({ query, path = ".", workingDirectory, cursor, pageSize = 6, topK = 20 }) => {
      const effectiveWorkingDirectory = workingDirectory || process.cwd();
      validateRequiredParams({ query, workingDirectory: effectiveWorkingDirectory }, ['query']);
      const results = await searchCode(query, effectiveWorkingDirectory, [path], undefined, topK);

      return results.map(r => ({
        file: r.file,
        line: `${r.startLine}-${r.endLine}`,
        content: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
        score: r.score.toFixed(3)
      }));
    }, 'search-results'), 'searchcode', 45000)
  }
];