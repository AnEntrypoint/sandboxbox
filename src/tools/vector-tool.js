#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import os from 'os';
import { createIgnoreFilter, loadCustomIgnorePatterns } from '../core/ignore-manager.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';
function isAbsolute(p) {
  return p.startsWith('/');
}
function pathResolve(...paths) {
  return path.resolve(...paths);
}
function pathJoin(...paths) {
  return path.join(...paths);
}
function pathExtname(p) {
  return path.extname(p);
}
function pathBasename(p) {
  return path.basename(p);
}
function pathRelative(from, to) {
  return path.relative(from, to);
}
import { workingDirectoryContext, createToolContext, getContextSummary } from '../core/working-directory-context.js';
import { addExecutionStatusToResponse } from '../core/execution-state.js';
import { createEnhancedErrorHandler } from '../core/enhanced-error-handler.js';
import { withConnectionManagement, getGlobalConnectionManager } from '../core/connection-manager.js';
import { withCrossToolAwareness, addToolMetadata } from '../core/cross-tool-context.js';
function cacheSearchResult(query, results, path) {
  
  return true;
}
function getSearchResult(query, path) {
  
  return null;
}
function addContextPattern(query, type) {
  
  return true;
}
const platform = {
  arch: os.arch(),
  platform: os.platform(),
  isARM64: os.arch() === 'arm64',
  isX64: os.arch() === 'x64',
  isMacOS: os.platform() === 'darwin',
  isLinux: os.platform() === 'linux',
  isWindows: os.platform() === 'win32'
};
// Index directory - use absolute path for cross-directory access
// Path resolution class to handle cross-directory access properly
class PathResolver {
  constructor(baseWorkingDir = null) {
    this.baseWorkingDir = baseWorkingDir || process.cwd();
    this.sharedIndexDir = '/config/workspace/mcp-repl/glootie/code_search_index';
  }

  // Get the appropriate index directory based on context
  getIndexDirectory() {
    // If we're in the main MCP directory, use local index
    if (this.baseWorkingDir.includes('mcp-repl')) {
      return this.sharedIndexDir;
    }

    // For other directories, create/use local index but fall back to shared
    const localIndexDir = pathJoin(this.baseWorkingDir, 'glootie', 'code_search_index');
    return localIndexDir;
  }

  // Get shared index path for fallback
  getSharedIndexPath() {
    return pathJoin(this.sharedIndexDir, INDEX_FILE);
  }

  // Check if path is within working directory
  isWithinWorkingDirectory(filePath) {
    return filePath.startsWith(this.baseWorkingDir);
  }
}

// Global path resolver instance
let globalPathResolver = null;

function getPathResolver() {
  if (!globalPathResolver) {
    globalPathResolver = new PathResolver();
  }
  return globalPathResolver;
}
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';
const DEFAULT_DIM = 384;
const DEFAULT_EXTS = [

  'js', 'ts', 'jsx', 'tsx',
  'go',
  'rs',
  'py', 'pyx',
  'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',

  'json', 'yaml', 'yml'

];
const MAX_FILE_SIZE = 200 * 1024;
const MAX_LINES_PER_CHUNK = 150;
const MAX_CACHE_SIZE = 3000;
const INDEX_FILE = 'code_index.json';
const VECTOR_INDEX_FILE = 'vector_index.json';
const INDEX_DIR = 'code_search_index';
const platformConfig = {
  memoryLimit: 1024 * 1024 * 1024,
  batchSize: 32, // Reduced batch size for better memory usage and faster processing
  maxConcurrency: 8, // Increased concurrency for better parallelization
  timeout: 45000
};
let codeChunks = [];
let embeddingExtractor = null;
let isInitialized = false;
let initializationPromise = null;
let indexTimestamp = 0;
function generateSearchInsights(results, query, workingDirectory) {
  // Only provide essential insights for programming agents
  const insights = [];

  if (results.length === 0) {
    insights.push('No results found');
  } else {
    insights.push(`${results.length} results`);

    // Only mention file count if it's substantial
    const uniqueFiles = new Set(results.map(r => r.file));
    if (uniqueFiles.size > 5) {
      insights.push(`${uniqueFiles.size} files`);
    }
  }

  return insights;
} 
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
    console.log('Initializing transformers.js embedding provider...');
    const { pipeline, env } = await import('@xenova/transformers');

    // Configure transformers.js environment for better performance
    const cachePath = pathResolve(process.cwd(), '.transformers-cache');
    console.log(`Using cache path: ${cachePath}`);

    // Ensure cache directory exists
    if (!existsSync(cachePath)) {
      mkdirSync(cachePath, { recursive: true });
      console.log(`Created cache directory: ${cachePath}`);
    }

    env.localModelPath = cachePath;
    env.allowLocalModels = true;
    env.remoteModelPath = null;
    env.forceDownload = false;
    env.cacheDir = cachePath;

    console.log(`Loading model: ${DEFAULT_MODEL}`);

    // Create pipeline with timeout to prevent hanging
    const pipelinePromise = pipeline('feature-extraction', DEFAULT_MODEL, {
      quantized: true,
      device: 'cpu'
    });

    // Race between pipeline initialization and timeout (40 seconds max for very large codebases)
    embeddingExtractor = await Promise.race([
      pipelinePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Embedding provider initialization timeout after 40 seconds')), 40000)
      )
    ]);
    console.log('Embedding provider initialized successfully');
    return true;
  } catch (error) {
    console.error('Embedding provider initialization failed:', error);
    throw new Error(`Transformers.js initialization failed: ${error.message}`);
  }
}
function shouldIndexFile(filePath, allowedExtensions) {
  const ext = pathExtname(filePath).slice(1).toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return false;
  }
  const filename = pathBasename(filePath);
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
  const ext = pathExtname(filePath).toLowerCase();
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
async function findCodeFiles(dir) {
  const files = [];
  const allowedExtensions = ['js', 'jsx', 'ts', 'tsx', 'go', 'rs', 'py', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp'];

  try {
    // Use the proper sand ignore manager instead of hardcoded patterns
    const customPatterns = loadCustomIgnorePatterns(dir);
    const ignoreFilter = createIgnoreFilter(dir, customPatterns, {
      useGitignore: true,
      useDefaults: true,
      caseSensitive: false
    });

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = pathJoin(dir, entry.name);

      if (entry.isDirectory()) {
        // Check if directory should be ignored using the proper ignore filter
        if (ignoreFilter.ignores(fullPath)) {
          continue;
        }

        const subFiles = await findCodeFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Check if file should be ignored using the proper ignore filter
        if (ignoreFilter.ignores(fullPath)) {
          continue;
        }

        const ext = pathExtname(entry.name).slice(1).toLowerCase();
        if (allowedExtensions.includes(ext) && shouldIndexFile(fullPath, allowedExtensions)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  return files;
}
function createCodeChunks(content, filePath, language) {
  return processCodeIntoChunks(content, filePath);
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

    if (trimmedLine.match(languagePattern) ||
        trimmedLine.match(/^(export|import|interface|type|enum|trait|impl|use|mod)\s/) ||
        trimmedLine.match(/^(component|directive|service|controller|middleware)\s/)) {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          file: filePath,
          language: language,
          startLine: Math.max(0, i - currentChunk.split('\n').length),
          endLine: i,
          type: getCodeChunkType(currentChunk, language)
        });
      }
      currentChunk = line;
      braceCount = (line.match(/{/g) || []).length;
      inFunction = trimmedLine.startsWith('function') || trimmedLine.includes('=>');
      inClass = trimmedLine.startsWith('class') || trimmedLine.startsWith('interface');
      chunkLineCount = 1;
    } else {
      currentChunk += '\n' + line;
      chunkLineCount++;
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if ((braceCount === 0 && (inFunction || inClass)) ||
          chunkLineCount >= MAX_LINES_PER_CHUNK ||
          (trimmedLine === '' && currentChunk.length > 50)) {
        chunks.push({
          content: currentChunk.trim(),
          file: filePath,
          startLine: Math.max(0, i - currentChunk.split('\n').length),
          endLine: i,
          type: getCodeChunkType(currentChunk, language)
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
      endLine: lines.length - 1,
      type: getCodeChunkType(currentChunk, language)
    });
  }
  return chunks;
}
function getCodeChunkType(content, language) {
  const trimmed = content.trim();
  if (trimmed.startsWith('function') || trimmed.includes('=>')) return 'function';
  if (trimmed.startsWith('class') || trimmed.startsWith('interface')) return 'class';
  if (trimmed.startsWith('import') || trimmed.startsWith('export')) return 'import';
  if (trimmed.startsWith('const') || trimmed.startsWith('let') || trimmed.startsWith('var')) return 'variable';
  if (trimmed.match(/^(if|for|while|switch|try|catch)\s/)) return 'control';
  return 'code';
}
async function loadIndex(indexDir) {
  const pathResolver = getPathResolver();

  try {
    const indexPath = pathJoin(indexDir, INDEX_FILE);

    if (existsSync(indexPath)) {
      const indexData = JSON.parse(readFileSync(indexPath, 'utf8'));
      codeChunks = indexData.chunks || [];
      indexTimestamp = indexData.timestamp || 0;
      console.log(`Loaded existing index with ${codeChunks.length} chunks from ${indexPath}`);
      return;
    }

    console.log("No existing index found, checking for shared index");

    // Try shared index as fallback
    const sharedIndexPath = pathResolver.getSharedIndexPath();
    if (existsSync(sharedIndexPath)) {
      const sharedIndexData = JSON.parse(readFileSync(sharedIndexPath, 'utf8'));
      codeChunks = sharedIndexData.chunks || [];
      indexTimestamp = sharedIndexData.timestamp || 0;
      console.log(`Loaded shared MCP-REPL index with ${codeChunks.length} chunks from ${sharedIndexPath}`);
      return;
    }

    console.log("No existing index found, starting fresh");
    codeChunks = [];
    indexTimestamp = 0;

  } catch (error) {
    console.warn("Failed to load index, starting fresh:", error.message);
    codeChunks = [];
    indexTimestamp = 0;
  }
}
async function scanDirectory(dir, ignoreFilter, files, exts) {
  try {
    console.log(`Scanning directory: ${dir}`);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    console.log(`Found ${entries.length} entries in ${dir}`);
    for (const entry of entries) {
      const fullPath = pathJoin(dir, entry.name);
      if (ignoreFilter.ignores(fullPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, ignoreFilter, files, exts);
      } else if (entry.isFile()) {
        if (shouldIndexFile(fullPath, exts)) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size <= MAX_FILE_SIZE) {
              files.push(fullPath);
              console.log(`Added file: ${fullPath} (${stat.size} bytes)`);
            } else {
              console.log(`Skipping large file: ${fullPath} (${stat.size} bytes)`);
            }
          } catch (error) {
            console.error(`Error stating file ${fullPath}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
}
async function getLastModifiedTime(folders) {
  let lastModified = 0;
  for (const folder of folders) {
    try {
      const files = await fs.readdir(folder, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile()) {
          const fullPath = pathJoin(folder, file.name);
          const stats = await fs.stat(fullPath);
          lastModified = Math.max(lastModified, stats.mtimeMs);
        }
      }
    } catch (error) {
    }
  }
  return lastModified;
}
async function getEmbedding(text) {
  if (!embeddingExtractor) {
    throw new Error('Embedding extractor not initialized');
  }

  const cacheKey = text;
  const cached = embeddingLRUCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Enhanced code-specific preprocessing for better embeddings
    const enhancedText = enhanceTextForCodeEmbedding(text);

    const embedding = await embeddingExtractor(enhancedText, {
      pooling: 'cls',
      normalize: true,
      truncation: true,
      max_length: 512
    });

    // Handle Transformers.js API contract properly
    let embeddingArray;
    if (embedding && embedding.data) {
      // Tensor object with data property
      embeddingArray = Array.from(embedding.data);
    } else if (Array.isArray(embedding)) {
      // Direct array response
      embeddingArray = embedding;
    } else if (embedding && typeof embedding.toArray === 'function') {
      // Tensor with toArray method
      embeddingArray = Array.from(await embedding.toArray());
    } else {
      throw new Error(`Unexpected embedding format: ${typeof embedding}`);
    }

    embeddingLRUCache.set(cacheKey, embeddingArray);
    return embeddingArray;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

// Enhance text for code embeddings with context and structure
function enhanceTextForCodeEmbedding(text) {
  let enhanced = text;

  // Add framework-specific context based on detected patterns
  if (text.toLowerCase().includes('tanstack') || text.toLowerCase().includes('react-table')) {
    enhanced += ' react table component columns rows data';
  }
  if (text.toLowerCase().includes('router') || text.toLowerCase().includes('route')) {
    enhanced += ' navigation routing path component layout';
  }
  if (text.toLowerCase().includes('recharts')) {
    enhanced += ' chart visualization data graph plot axis';
  }
  if (text.toLowerCase().includes('zustand') || text.toLowerCase().includes('store')) {
    enhanced += ' state management store actions reducers';
  }
  if (text.toLowerCase().includes('clerk') || text.toLowerCase().includes('auth')) {
    enhanced += ' authentication login logout user session';
  }
  if (text.toLowerCase().includes('typescript') || text.toLowerCase().includes('type')) {
    enhanced += ' typescript interface type definition generic enum';
  }
  if (text.toLowerCase().includes('usequery') || text.toLowerCase().includes('usemutation')) {
    enhanced += ' react query data fetching mutation async';
  }
  if (text.toLowerCase().includes('dashboard') || text.toLowerCase().includes('layout')) {
    enhanced += ' dashboard layout ui component sidebar navigation';
  }
  if (text.toLowerCase().includes('table') || text.toLowerCase().includes('data')) {
    enhanced += ' table data rows columns sorting filtering';
  }

  return enhanced;
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
export async function initializeVectorSystem(indexDir = null) {
  // Use path resolver to determine correct index directory
  const pathResolver = getPathResolver();
  const resolvedIndexDir = indexDir || pathResolver.getIndexDirectory();
  // If already initializing, wait for that promise
  if (initializationPromise) {
    return await initializationPromise;
  }

  // If already initialized, return immediately
  if (isInitialized) return true;

  // Create initialization promise to prevent race conditions
  initializationPromise = (async () => {
    try {
      if (!existsSync(resolvedIndexDir)) {
        mkdirSync(resolvedIndexDir, { recursive: true });
        console.log(`Created index directory: ${resolvedIndexDir}`);
      }
      if (!embeddingExtractor) {
        await initializeEmbeddingProvider();
      }
      await loadIndex(resolvedIndexDir);
      isInitialized = true;
      return true;
    } catch (error) {
      console.error("Vector system initialization failed:", error);
      initializationPromise = null; // Reset on failure
      throw new Error(`Vector system initialization failed: ${error.message}`);
    }
  })();

  return await initializationPromise;
}
export async function processFile(file, codeChunks) {
  const newChunks = [];
  try {
    const stats = await fs.stat(file);
    let content = await fs.readFile(file, 'utf8');

    if (stats.size > MAX_FILE_SIZE) {
      console.log(`File ${file} is large (${stats.size} bytes), using intelligent chunking`);
      // Instead of truncating, use intelligent chunking for large files
      const language = detectLanguageFromPath(file);
      const largeFileChunks = createCodeChunks(content, file, language);
      newChunks.push(...largeFileChunks);
    } else {
      // For smaller files, use the existing chunking logic
      const language = detectLanguageFromPath(file);
      const chunks = createCodeChunks(content, file, language);
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
export async function syncVectorIndex(folders, exts = DEFAULT_EXTS) {
  if (!isInitialized) {
    await initializeVectorSystem();
  }
  const files = [];
  const startTime = Date.now();
  console.log(`Starting index sync for folders: ${folders.join(', ')}`);
  const lastModified = await getLastModifiedTime(folders);
  if (lastModified <= indexTimestamp && codeChunks.length > 0) {
    console.log(`Index is up to date with ${codeChunks.length} chunks`);
    return codeChunks.length; 
  }
  console.log(`Scanning directories for files...`);
  for (const folder of folders) {
    try {
      
      const customPatterns = loadCustomIgnorePatterns(folder);
      const ignoreFilter = createIgnoreFilter(folder, customPatterns, {
        useGitignore: true,
        useDefaults: true,
        caseSensitive: false
      });
      await scanDirectory(folder, ignoreFilter, files, exts);
    } catch (error) {
      console.warn(`Error using common ignore filter for ${folder}, skipping:`, error);
      
    }
  }
  console.log(`Found ${files.length} files to process`);
  const newChunks = [];
  let skippedFiles = 0;
  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      if (stats.size > MAX_FILE_SIZE) {
        console.log(`Skipping large file: ${file} (${stats.size} bytes)`);
        skippedFiles++;
        continue;
      }
      const ext = pathExtname(file).toLowerCase();
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
      console.log(`Processed ${file}: ${chunks.length} chunks`);
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
  console.log(`Created ${newChunks.length} chunks total, skipped ${skippedFiles} files`);
  if (newChunks.length > codeChunks.length * 1.5 || newChunks.length < codeChunks.length * 0.5) {
    embeddingLRUCache.clear();
  }
  codeChunks = newChunks;
  indexTimestamp = startTime;
  const pathResolver = getPathResolver();
  const resolvedIndexDir = pathResolver.getIndexDirectory();

  const indexData = {
    timestamp: indexTimestamp,
    chunks: codeChunks.map(c => ({
      file: c.file,
      content: c.content,
      startLine: c.startLine,
      endLine: c.endLine
    }))
  };
  if (!existsSync(resolvedIndexDir)) {
    mkdirSync(resolvedIndexDir, { recursive: true });
  }
  const indexPath = pathJoin(resolvedIndexDir, INDEX_FILE);
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`Saved index to ${indexPath} with ${codeChunks.length} chunks`);
  return codeChunks.length;
}
function extractFunctionSignature(content) {
  
  const functionRegex = /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{)/g;
  const matches = [];
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    
    const name = match[1] || match[2] || match[3] || match[4];
    if (name) {
      const signature = match[0];
      matches.push({
        name,
        signature: signature.trim(),
        start: match.index,
        end: match.index + signature.length
      });
    }
  }
  return matches;
}
export async function findSimilarFunctions(targetFunction, topK = 3) {
  if (!isInitialized) {
    await initializeVectorSystem();
  }
  if (codeChunks.length === 0) {
    return [];
  }
  
  const targetSignature = extractFunctionSignature(targetFunction)[0];
  if (!targetSignature) {
    return [];
  }
  const queryEmbedding = await getEmbedding(targetFunction);
  const functionResults = [];
  
  const functionChunks = codeChunks.filter(chunk => {
    const signatures = extractFunctionSignature(chunk.content);
    return signatures.length > 0;
  });
  for (const chunk of functionChunks) {
    const signatures = extractFunctionSignature(chunk.content);
    for (const sig of signatures) {
      if (sig.name !== targetSignature.name) { 
        const chunkEmbedding = await getEmbedding(chunk.content);
        const similarity = calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
        if (similarity > 0.80) { 
          functionResults.push({
            file: chunk.file,
            functionName: sig.name,
            signature: sig.signature,
            content: chunk.content,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            similarity: similarity
          });
        }
      }
    }
  }
  return functionResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
// AGENT QUERY OPTIMIZATION: Convert specific queries to generic coding patterns
function optimizeAgentQuery(query) {
  let optimizedQuery = query;

  // Generic coding concept mappings (framework-agnostic)
  const conceptMappings = {
    // Routing patterns (any framework)
    'routing|router|route': 'navigation path url handler controller endpoint',
    'authenticated|auth|login': 'authentication authorization security user session',
    'layout|template': 'structure design component wrapper container',

    // Data management patterns
    'query|fetch|request': 'data retrieval async api call http service',
    'mutation|update|save': 'data modification persistence change write',
    'state|store': 'data management persistence reactive state container',

    // UI Component patterns
    'component|ui|interface': 'user interface element widget view screen',
    'form|input|field': 'data entry validation submission user input',
    'table|list|grid': 'data display collection array items rows',
    'chart|graph|visualization': 'data visual representation plot diagram',

    // Architecture patterns
    'service|api|endpoint': 'business logic data layer backend service',
    'controller|handler': 'request processing logic coordination middleware',
    'middleware|guard': 'interceptor filter validation security cross-cutting',
    'repository|dao': 'data access persistence database abstraction',

    // Code structure patterns
    'hook|custom|util': 'reusable logic function helper utility',
    'type|interface|schema': 'data structure definition contract validation',
    'config|settings': 'configuration parameters environment setup',

    // Path patterns (framework-agnostic)
    'src/.*routes/': 'routing navigation url handler',
    'src/.*components/': 'ui interface element widget',
    'src/.*services/': 'business logic data layer',
    'src/.*utils/': 'utility helper shared function',
    'src/.*hooks/': 'reusable logic custom function',
    'src/.*types/': 'type definition interface schema',
  };

  // Apply concept mappings using regex patterns
  for (const [pattern, generic] of Object.entries(conceptMappings)) {
    if (pattern.includes('|')) {
      // Handle multiple patterns separated by |
      const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
      if (regex.test(optimizedQuery)) {
        optimizedQuery = optimizedQuery.replace(regex, generic);
      }
    } else if (pattern.includes('/')) {
      // Handle path patterns
      const regex = new RegExp(pattern, 'gi');
      optimizedQuery = optimizedQuery.replace(regex, generic);
    }
  }

  // Generic path-to-concept conversions
  const pathPatterns = [
    { pattern: /src\/[^\/]+\/routes\/[^\/]*/gi, replacement: 'route handler navigation' },
    { pattern: /src\/[^\/]+\/components\/[^\/]*/gi, replacement: 'ui component element' },
    { pattern: /src\/[^\/]+\/services\/[^\/]*/gi, replacement: 'service data layer' },
    { pattern: /src\/[^\/]+\/utils\/[^\/]*/gi, replacement: 'utility helper function' },
    { pattern: /src\/[^\/]+\/hooks\/[^\/]*/gi, replacement: 'custom hook logic' },
    { pattern: /src\/[^\/]+\/types\/[^\/]*/gi, replacement: 'type interface definition' },
    { pattern: /src\/[^\/]+\/layouts?\/[^\/]*/gi, replacement: 'layout structure template' },
    { pattern: /src\/[^\/]+\/stores?\/[^\/]*/gi, replacement: 'state management data' },
  ];

  pathPatterns.forEach(({ pattern, replacement }) => {
    optimizedQuery = optimizedQuery.replace(pattern, replacement);
  });

  // Detect and transform abstract conceptual searches to concrete implementations
  const abstractPatterns = [
    {
      pattern: /\b(performance bottleneck|slow performance|performance issue|performance problem)\b/gi,
      replacement: 'debounce throttle memo useCallback useMemo inefficient loop',
      reason: 'Abstract performance concepts → concrete optimization patterns'
    },
    {
      pattern: /\b(memory leak|memory issue|memory problem)\b/gi,
      replacement: 'cleanup useEffect clearInterval removeEventListener garbage collection',
      reason: 'Abstract memory concepts → concrete cleanup patterns'
    },
    {
      pattern: /\b(optimization opportunity|optimize|optimization)\b/gi,
      replacement: 'memo useCallback useMemo lazy loading code splitting efficient',
      reason: 'Abstract optimization → concrete optimization techniques'
    },
    {
      pattern: /\b(slow component|slow rendering)\b/gi,
      replacement: 'React.memo useMemo useCallback component re-render',
      reason: 'Abstract slowness → concrete React optimization patterns'
    }
  ];

  let wasAbstract = false;
  abstractPatterns.forEach(({ pattern, replacement, reason }) => {
    if (pattern.test(optimizedQuery)) {
      console.error(`Optimizing abstract search: ${reason}`);
      optimizedQuery = optimizedQuery.replace(pattern, replacement);
      wasAbstract = true;
    }
  });

  if (wasAbstract) {
    console.error(`Transformed abstract query to concrete implementation patterns: "${optimizedQuery}"`);
  }

  // Remove overly specific prefixes/suffixes that limit search scope
  optimizedQuery = optimizedQuery
    .replace(/@[\w\-]+\/[\w\-]+/g, '') // Remove package names like @tanstack/react-router
    .replace(/\b(create|use|get|post|put|delete)[A-Z]/g, (match) => match.toLowerCase()) // Normalize method prefixes
    .replace(/\b[A-Z][a-z]*[A-Z][a-zA-Z]*/g, (match) => match.toLowerCase()); // Normalize camelCase

  return optimizedQuery.trim();
}

function preprocessQuery(query) {
  let processedQuery = query.toLowerCase();

  // AGENT QUERY OPTIMIZATION: Convert library-specific queries to generic patterns
  processedQuery = optimizeAgentQuery(processedQuery);

  // Enhanced code-specific intent recognition and expansion - FRAMEWORK-AGNOSTIC
  const intentPatterns = {
    // Component and UI patterns - GENERIC
    'component|ui|view': 'interface props state lifecycle render template widget element',
    'form|input|field': 'validation submission data entry user input schema control',
    'table|list|grid': 'collection array items rows columns display data structure',
    'layout|container': 'wrapper structure design template organization arrangement',

    // Function and logic patterns - GENERIC
    'function|method': 'parameters return value signature scope visibility static instance',
    'utility|helper': 'shared reusable common extract abstract helper function module',
    'algorithm|logic': 'procedure steps flow control condition iteration recursion optimization',

    // Data and state patterns - GENERIC
    'state|data': 'persistence storage mutation reactive immutable observable container',
    'store|repository': 'data access abstraction layer business logic entity model',
    'cache|memory': 'temporary storage performance optimization fast access retention',
    'model|entity': 'business object domain structure validation rules behavior',

    // Architecture patterns - GENERIC
    'service|business': 'logic layer abstraction coordination workflow process flow',
    'controller|handler': 'request processing response coordination endpoint routing',
    'middleware|interceptor': 'cross-cutting validation security logging transformation',
    'api|endpoint': 'interface contract communication protocol request response',

    // Error and validation patterns - GENERIC
    'error|exception': 'failure handling recovery debugging logging monitoring graceful',
    'validation|constraint': 'rules checking verification business logic integrity',
    'boundary|guard': 'protection isolation containment error handling security',
    'retry|fallback': 'resilience recovery alternative backup graceful degradation',

    // Performance and optimization patterns - GENERIC (CONCRETE IMPLEMENTATIONS)
    'performance|optimization': 'debounce throttle memo useCallback useMemo efficiency',
    'cache|memoization': 'storage data retrieval memory optimization fast access',
    'lazy|deferred': 'on-demand loading delayed execution resource management',
    'concurrent|parallel': 'simultaneous execution threading async non-blocking',

    // Code quality patterns - GENERIC
    'refactor|cleanup': 'improvement restructuring simplification clarity maintainability',
    'duplicate|redundant': 'repetition elimination consolidation DRY abstraction',
    'magic|hardcoded': 'constants configuration parameters flexibility maintainability',
    'standard|convention': 'consistency patterns best practices readability team standards',

    // Testing patterns - GENERIC
    'test|spec': 'verification validation assertion behavior expected actual',
    'mock|stub|fake': 'simulation isolation dependency injection controlled environment',
    'assert|verify': 'checking validation expected outcome behavior correctness',

    // Configuration and patterns - GENERIC
    'config|setting': 'parameter environment deployment customization setup configuration',
    'pattern|design': 'architecture structure organization reusable solution approach',
    'factory|builder': 'creation construction instantiation complex object assembly',

    // Language agnostic patterns - GENERIC
    'type|interface': 'definition contract structure schema validation checking',
    'async|promise': 'non-blocking concurrent future callback continuation',
    'generics|templates': 'parameterized types reusable code flexibility safety',
    'inheritance|polymorphism': 'extension specialization overriding abstraction hierarchy',

    // File and module patterns - GENERIC
    'import|require|include': 'dependency module sharing encapsulation organization',
    'export|provide|expose': 'interface API public contract sharing module',
    'namespace|package': 'organization grouping structure encapsulation naming',

    // Database and persistence patterns - GENERIC
    'database|storage': 'persistence query transaction schema indexing relationship',
    'query|search': 'retrieval filtering selection criteria condition matching',
    'transaction|consistency': 'atomicity durability integrity rollback commit',

    // Security patterns - GENERIC
    'authentication|authorization': 'identity verification permission access control',
    'encryption|hashing': 'protection obfuscation security integrity verification',
    'sanitization|validation': 'input cleaning verification security safety checking',

    // Logging and monitoring patterns - GENERIC
    'log|trace|debug': 'observability troubleshooting auditing performance monitoring',
    'metric|telemetry': 'measurement analytics reporting performance health',
    'event|notification': 'messaging broadcasting signaling communication system',
    'query': 'retrieval filtering selection criteria condition database search sql',
    'model': 'interface structure definition schema business object entity data type',
  };

  // Apply single-word patterns
  for (const [pattern, expansions] of Object.entries(intentPatterns)) {
    if (processedQuery.includes(pattern)) {
      processedQuery += ' ' + expansions;
    }
  }

  // Enhanced multi-word intent patterns - GENERIC UNIVERSAL CODE PATTERNS
  const multiWordIntents = {
    // Component and UI patterns (GENERIC)
    'components': 'component class function interface props state lifecycle render return',
    'user interface': 'ui view layout styling design element widget component interface',

    // Function and logic patterns (GENERIC)
    'functions': 'function method procedure return parameter call invoke execute',
    'logic': 'logic conditionals if else switch case boolean expression algorithm',
    'utilities': 'utility helper function shared common reusable logic method helper',

    // Data and state patterns (GENERIC)
    'state': 'state data store variable object array management data structure',
    'data structures': 'object array map set list dictionary collection data structure',
    'configuration': 'config settings options parameters environment variables constants',

    // Architecture patterns (GENERIC)
    'api': 'api endpoint route handler request response http service client server',
    'service': 'service layer business logic data access controller handler',
    'middleware': 'middleware authentication authorization logging error processing filter',

    // Error and validation patterns (GENERIC)
    'error handling': 'error handling exception catch throw try validation recovery',
    'validation': 'validation check verify input form data schema constraint',
    'boundaries': 'boundary component error handling fallback ui safety',

    // Performance and optimization patterns (GENERIC)
    'performance': 'performance optimization memoization caching efficient fast',
    'optimization': 'optimization improve efficient fast algorithm performance',
    'caching': 'cache storage retrieval performance optimization memory',

    // Code quality patterns (GENERIC)
    'refactoring': 'refactor improve code quality structure maintainability organization',
    'duplication': 'duplicate code repeated logic copy paste refactor extract',
    'magic': 'magic number hardcoded constant literal value configuration',

    // Testing patterns (GENERIC)
    'testing': 'test unit integration spec mock spy expect assert validation',
    'specification': 'spec test specification validation unit integration',
    'mocking': 'mock spy stub test double simulation fake',

    // Language patterns (GENERIC)
    'typescript': 'interface type enum generic union intersection readonly optional',
    'javascript': 'function const let var async await promise object array',
    'python': 'class def function async await with context decorator generator',
    'go': 'func struct interface method channel goroutine defer return error',
    'rust': 'fn struct trait enum lifetime ownership borrowing mut let match',

    // Module and import patterns (GENERIC)
    'modules': 'module package import export dependency file namespace',
    'imports': 'import require module package dependency export default',

    // Async patterns (GENERIC)
    'async': 'async await promise then callback resolve reject',
    'promises': 'promise async await then resolve reject catch finally',

    // Database patterns (GENERIC)
    'database': 'database sql query model schema table',
    'queries': 'query search filter select data retrieve',

    // Security patterns (GENERIC)
    'security': 'security validation input sanitization authentication authorization',
    'validation': 'validation input sanitization verification check constraint',
    'sanitization': 'sanitization input security validation cleaning encoding'
  };

  // Apply multi-word patterns
  for (const [pattern, expansions] of Object.entries(multiWordIntents)) {
    if (processedQuery.includes(pattern)) {
      processedQuery += ' ' + expansions;
    }
  }

  return processedQuery;
}
export async function queryVectorIndex(query, topK = 8) {
  // Ensure proper initialization with race condition protection
  await initializeVectorSystem();

  if (codeChunks.length === 0) {
    return [];
  }

  const enhancedQuery = preprocessQuery(query);
  let queryEmbedding;

  try {
    queryEmbedding = await getEmbedding(enhancedQuery);
  } catch (error) {
    console.error('Failed to generate query embedding:', error);
    return [];
  }

  const results = [];
  // Use smaller batch size for better performance and memory usage
  const batchSize = platformConfig.batchSize;
  const maxConcurrency = Math.min(platformConfig.maxConcurrency, Math.ceil(codeChunks.length / batchSize));

  // Process batches in parallel for better performance
  const batchPromises = [];
  for (let i = 0; i < codeChunks.length; i += batchSize) {
    const batch = codeChunks.slice(i, i + batchSize);
    batchPromises.push(processBatch(batch, queryEmbedding, query));

    // Limit concurrent batches to prevent memory overload
    if (batchPromises.length >= maxConcurrency) {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
      batchPromises.length = 0;
    }
  }

  // Process remaining batches
  if (batchPromises.length > 0) {
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  // Enhanced filtering and ranking - AGENT QUERY OPTIMIZATION
  // Remove relevance threshold - just sort by relevance and use topK cutoff
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by enhanced relevance score
    .slice(0, topK)
    .map(r => ({
      file: r.file,
      content: r.content,
      startLine: r.startLine,
      endLine: r.endLine,
      score: r.relevanceScore,
      vectorScore: r.vectorSimilarity
    }));
}

// Process a batch of chunks for vector similarity calculation
async function processBatch(batch, queryEmbedding, query) {
  const batchResults = await Promise.all(batch.map(async (chunk) => {
    let chunkEmbedding;
    try {
      // Check if we have a cached embedding for this chunk
      const cacheKey = `${chunk.file}:${chunk.startLine}:${chunk.endLine}`;
      chunkEmbedding = embeddingLRUCache.get(cacheKey);

      if (!chunkEmbedding) {
        chunkEmbedding = await getEmbedding(chunk.content);
        // Cache the embedding for future searches
        embeddingLRUCache.set(cacheKey, chunkEmbedding);
      }
    } catch (error) {
      console.error(`Failed to generate embedding for chunk: ${error.message}`);
      return null;
    }

    const vectorSimilarity = calculateCosineSimilarity(queryEmbedding, chunkEmbedding);

    // Calculate enhanced relevance score for code
    const relevanceScore = calculateCodeRelevanceScore(query, chunk.content, vectorSimilarity);

    return {
      file: chunk.file,
      content: chunk.content,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      vectorSimilarity: vectorSimilarity,
      relevanceScore: relevanceScore
    };
  }));

  return batchResults.filter(r => r !== null); // Filter out failed embeddings
}

// Calculate enhanced relevance score for code searches
function calculateCodeRelevanceScore(query, codeContent, vectorSimilarity) {
  let relevanceScore = vectorSimilarity;
  const queryLower = query.toLowerCase();
  const codeLower = codeContent.toLowerCase();

  // Boost score for exact keyword matches
  const queryKeywords = extractKeywords(queryLower);
  const codeKeywords = extractKeywords(codeLower);

  // Calculate keyword overlap
  const keywordOverlap = queryKeywords.filter(keyword =>
    codeKeywords.includes(keyword) || codeLower.includes(keyword)
  ).length;

  if (keywordOverlap > 0) {
    relevanceScore += Math.min(0.3, keywordOverlap * 0.1); // Boost up to 0.3 for keyword matches
  }

  // Generic concept-based boosts (framework-agnostic)
  const conceptBoosts = [
    { query: ['routing', 'navigation', 'route'], code: ['router', 'route', 'navigation', 'endpoint'], boost: 0.15 },
    { query: ['authentication', 'auth', 'login'], code: ['auth', 'login', 'session', 'user', 'security'], boost: 0.15 },
    { query: ['component', 'ui', 'interface'], code: ['component', 'ui', 'view', 'element'], boost: 0.1 },
    { query: ['state', 'store'], code: ['state', 'store', 'data', 'model'], boost: 0.1 },
    { query: ['api', 'service'], code: ['api', 'service', 'endpoint', 'controller'], boost: 0.15 },
    { query: ['form', 'input'], code: ['form', 'input', 'field', 'validation'], boost: 0.1 },
    { query: ['query', 'fetch'], code: ['query', 'fetch', 'request', 'database'], boost: 0.15 },
    { query: ['test', 'spec'], code: ['test', 'spec', 'assert', 'mock'], boost: 0.1 },
  ];

  conceptBoosts.forEach(({ query: queryTerms, code: codeTerms, boost }) => {
    const queryMatch = queryTerms.some(term => queryLower.includes(term));
    const codeMatch = codeTerms.some(term => codeLower.includes(term));
    if (queryMatch && codeMatch) {
      relevanceScore += boost;
    }
  });

  // Component-specific boosts
  if (queryLower.includes('component') && codeLower.includes('component')) {
    relevanceScore += 0.15;
  }
  if (queryLower.includes('table') && codeLower.includes('table')) {
    relevanceScore += 0.15;
  }
  if (queryLower.includes('router') && codeLower.includes('router')) {
    relevanceScore += 0.15;
  }
  if (queryLower.includes('auth') && (codeLower.includes('auth') || codeLower.includes('login') || codeLower.includes('signin'))) {
    relevanceScore += 0.15;
  }
  if (queryLower.includes('dashboard') && codeLower.includes('dashboard')) {
    relevanceScore += 0.15;
  }

  // React Query specific boosts
  if ((queryLower.includes('usequery') || queryLower.includes('usemutation')) &&
      (codeLower.includes('usequery') || codeLower.includes('usemutation') || codeLower.includes('queryclient'))) {
    relevanceScore += 0.25;
  }

  // Layout and navigation boosts
  if (queryLower.includes('layout') && codeLower.includes('layout')) {
    relevanceScore += 0.15;
  }
  if (queryLower.includes('navigation') && codeLower.includes('nav')) {
    relevanceScore += 0.15;
  }

  // Normalize score to [0, 1] range
  return Math.min(1.0, relevanceScore);
}

// Extract meaningful keywords from text
function extractKeywords(text) {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an']);

  return text
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .map(word => word.toLowerCase());
}
export async function searchCode(params, workingDirectory, folderPaths = ['.'], extensions = DEFAULT_EXTS, topK = 6) {
  let query;
  if (typeof params === 'object' && params !== null) {
    query = params.query;
    workingDirectory = params.workingDirectory;
    folderPaths = ['.']; // Always search from working directory root
    extensions = params.extensions || extensions;
    topK = params.topK || topK;
  } else {
    query = params;
  }

  const queryForError = query; // Store query for error handling

  try {
    console.error(`searchCode called with query: "${query}", workingDir: "${workingDirectory}", folders: ${Array.isArray(folderPaths) ? folderPaths.join(', ') : folderPaths}`);
    
    if (!workingDirectory || typeof workingDirectory !== 'string') {
      throw new Error('Working directory is required and must be a valid path string');
    }
    
    if (!existsSync(workingDirectory)) {
      throw new Error(`Working directory does not exist: ${workingDirectory}`);
    }
    console.error(`Effective working directory: ${workingDirectory}`);
    
    console.error("Initializing vector system...");
    const initPromise = isInitialized ? Promise.resolve() : initializeVectorSystem();
    await Promise.race([
      initPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 15000))
    ]);
    console.error("Vector system initialized successfully");
    
    const absFolders = folderPaths.map(f => {
      const resolvedPath = isAbsolute(f) ? f : pathResolve(workingDirectory, f);
      console.error(`Resolving path: ${f} -> ${resolvedPath}`);
      if (!existsSync(resolvedPath)) {
        console.warn(`Search path does not exist: ${resolvedPath}, skipping`);
        return null;
      }
      return resolvedPath;
    }).filter(Boolean);
    if (absFolders.length === 0) {
      console.warn(`No valid search paths found in: ${Array.isArray(folderPaths) ? folderPaths.join(', ') : folderPaths}`);
      return [];
    }
    console.error(`Absolute folders: ${absFolders.join(', ')}`);

    // Create ignore files if they don't exist
    createIgnoreFilesIfNeeded(workingDirectory);

    // Check if sync is needed, but don't block search for it
    const lastModified = await getLastModifiedTime(absFolders);
    const needsSync = lastModified > indexTimestamp || codeChunks.length === 0;

    if (needsSync) {
      console.error("Index sync needed, starting background sync...");

      
      // Start sync in background but don't wait for it
      syncVectorIndex(absFolders, extensions).catch(error => {
        console.error("Background sync failed:", error.message);
      });

      // If we have no chunks at all, wait a bit for initial sync
      if (codeChunks.length === 0) {
        console.error("Waiting for initial sync (up to 10 seconds)...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        if (codeChunks.length === 0) {
          console.error("Initial sync timed out, proceeding with empty index");
        }
      }
    } else {
      console.error(`Index is up to date with ${codeChunks.length} chunks`);
    }

    console.error("Starting vector query...");
    const searchResults = await queryVectorIndex(query, topK);
        return searchResults;
  } catch (error) {
    console.error(`Search failed for query "${queryForError}":`, error);
    throw new Error(`Search failed: ${error.message}`);
  }
}
export async function searchSemantic(query, options = {}) {
  const { workingDirectory, folders = ['.'], extensions = DEFAULT_EXTS, topK = 6 } = options;
  return await searchCode(query, workingDirectory, folders, extensions, topK);
}
// Automatic ignore file creation
function createIgnoreFilesIfNeeded(workingDirectory) {
  const searchIgnorePath = pathJoin(workingDirectory, '.searchignore');
  const searchDefaultsPath = pathJoin(workingDirectory, '.search-defaults.json');
  const gitignorePath = pathJoin(workingDirectory, '.gitignore');

  // Create .searchignore if it doesn't exist
  if (!existsSync(searchIgnorePath)) {
    const searchIgnoreContent = [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'out/**',
      '.git/**',
      '*.log',
      '*.tmp',
      'temp/**',
      'tmp/**',
      '.vscode/**',
      '.idea/**'
    ].join('\n');

    try {
      writeFileSync(searchIgnorePath, searchIgnoreContent);
      console.error(`Created .searchignore file in ${workingDirectory}`);
    } catch (error) {
      console.warn(`Failed to create .searchignore file: ${error.message}`);
    }
  }

  // Create .search-defaults.json if it doesn't exist
  if (!existsSync(searchDefaultsPath)) {
    const searchDefaultsContent = {
      files: [
        "**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**", "**/out/**",
        "**/coverage/**", "**/.nyc_output/**", "**/.git/**", "**/.vscode/**", "**/.idea/**",
        "**/*.log", "**/*.tmp", "**/temp/**", "**/tmp/**", "**/.DS_Store", "**/Thumbs.db",
        "**/*.map", "**/*.min.js", "**/*.min.css", "**/package-lock.json", "**/yarn.lock"
      ],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"],
      directories: ["node_modules", ".next", "dist", "build", "out", "coverage", ".nyc_output", ".git", ".vscode", ".idea", "temp", "tmp"]
    };

    try {
      writeFileSync(searchDefaultsPath, JSON.stringify(searchDefaultsContent, null, 2));
      console.error(`Created .search-defaults.json file in ${workingDirectory}`);
    } catch (error) {
      console.warn(`Failed to create .search-defaults.json file: ${error.message}`);
    }
  }
}

export async function initialize(indexDir = null) {
  return await initializeVectorSystem(indexDir);
}
export async function syncIndex(folders, exts = DEFAULT_EXTS) {
  return await syncVectorIndex(folders, exts);
}
export async function queryIndex(query, topK = 8) {
  // Add timeout to prevent hanging during vector search (120 seconds for very large codebases)
    const searchPromise = queryVectorIndex(query, topK);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Vector search timeout after 120 seconds')), 120000);
    });
    return await Promise.race([searchPromise, timeoutPromise]);
}
export {
  MAX_FILE_SIZE,
  MAX_LINES_PER_CHUNK,
  DEFAULT_EXTS,
  INDEX_DIR,
  INDEX_FILE,
  VECTOR_INDEX_FILE,
  platformConfig,
  embeddingLRUCache,
  codeChunks,
  isInitialized,
  embeddingExtractor,
  findCodeFiles
};
import { createToolResponse, createErrorResponse, validateRequiredParams } from '../core/utilities.js';
function formatSearchResults(results, query, path) {
  if (results.length === 0) {
    return `No results found for "${query}" in ${path}`;
  }
  return `${results.length} results for "${query}" in ${path}:\n\n${results.map(r => `${r.file}:${r.startLine}-${r.endLine}\n${r.content.substring(0, 200)}${r.content.length > 200 ? '...' : ''}\nSimilarity: ${r.score.toFixed(3)}`).join('\n\n')}`;
}
export const searchTools = [
  {
    name: "searchcode",
    description: "Semantic code search using vector embeddings. Best for: finding similar functions/patterns, discovering existing implementations, locating API usage, architectural patterns. Use technical terms like 'useState useEffect lifecycle', 'router navigation handler', 'error handling validation'. Avoid abstract concepts like 'performance bottlenecks' or 'memory leaks' - use concrete implementation patterns instead.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Technical search query describing code patterns or implementations" },
                workingDirectory: { type: "string", description: "Absolute path to search directory" },
        cursor: { type: "string", description: "Pagination cursor for result sets" },
        pageSize: { type: "number", description: "Results per page (default: 6)" },
        topK: { type: "number", description: "Max results (default: 10)" }
      },
      required: ["query", "workingDirectory"]
    },
    handler: withCrossToolAwareness(withConnectionManagement(async ({ query, workingDirectory, cursor, pageSize = 6, topK = 10 }) => {

      const consoleRestore = suppressConsoleOutput();
      try {

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          throw new Error('Query parameter is required and must be a non-empty string');
        }

        if (!workingDirectory) {
          throw new Error('Working directory parameter is required');
        }
        const effectiveWorkingDirectory = workingDirectory;

        const context = await workingDirectoryContext.getToolContext(effectiveWorkingDirectory, 'searchcode', query);
        console.error(`Search request: query="${query}", workingDir="${effectiveWorkingDirectory}"`);

        const fullPath = effectiveWorkingDirectory;
        if (!existsSync(fullPath)) {
          console.warn(`Search path does not exist: ${fullPath}`);
          const response = {
            content: [{ type: "text", text: "Search path does not exist" }],
            isError: true
          };
          return addExecutionStatusToResponse(response, 'searchcode');
        }

        const cachedResults = getSearchResult(query, fullPath);
        if (cachedResults) {
          console.error(`Using cached results for query: "${query}"`);
          const response = {
            content: [{ type: "text", text: JSON.stringify(cachedResults, null, 2) }]
          };
          return addExecutionStatusToResponse(response, 'searchcode');
        }

        console.error(`Searching for: "${query}" in ${fullPath}`);
        let results = [];

        try {
          // Try to use the vector embedding system first for true semantic search
          console.error(`Attempting semantic vector search for: "${query}"`);
          try {
            // Initialize vector system if needed
            if (!isInitialized) {
              console.error(`Initializing vector system for semantic search...`);
              await Promise.race([
                initializeVectorSystem(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Vector search initialization timeout')), 40000)
                )
              ]);
            }

            // Perform semantic search with the optimized query
            let semanticQuery = query;

            // Optimize query for semantic search
            if (query.toLowerCase().includes('react') && query.toLowerCase().includes('component')) {
              const componentMatches = query.match(/\b([A-Z][a-zA-Z0-9]*)\b/g);
              if (componentMatches && componentMatches.length > 0) {
                semanticQuery = componentMatches.join(' ');
                console.error(`Optimized semantic query to: "${semanticQuery}"`);
              }
            }

            const semanticResults = await queryVectorIndex(semanticQuery, Math.min(topK, 15));

            if (semanticResults && semanticResults.length > 0) {
              console.error(`Semantic search found ${semanticResults.length} results`);

              // Filter results to only include files from the target working directory
              const filteredResults = semanticResults.filter(r =>
                r.file.startsWith(fullPath)
              );

              console.error(`Filtered to ${filteredResults.length} results in target directory: ${fullPath}`);

              if (filteredResults.length > 0) {
                results = filteredResults.map(r => ({
                  file: r.file,
                  startLine: r.startLine || 0,
                  endLine: r.endLine || 0,
                  content: r.content || '',
                  score: r.score || 0.8,
                  type: 'semantic'
                }));
              } else {
                console.error(`No files found in target directory ${fullPath}, falling back to text search`);
                throw new Error('No files in target directory - fallback to text search');
              }
            } else {
              console.error(`Semantic search returned no results, falling back to text search`);
              throw new Error('Fallback to text search');
            }
          } catch (semanticError) {
            console.error(`Semantic search failed, using text search: ${semanticError.message}`);

            // Fallback to text search
            const files = await findCodeFiles(fullPath);
            if (files.length === 0) {
              console.error(`No code files found in: ${fullPath}`);
              results = [];
            } else {
              console.error(`Found ${files.length} files to search in: ${fullPath}`);

              // Optimize query to handle broad terms better
              let searchQuery = query.toLowerCase();

              // If query contains broad terms, try to extract more specific patterns
              if (searchQuery.includes('react') && searchQuery.includes('component')) {
                // Extract potential component names from the query - look for capitalized words
                const componentMatches = query.match(/\b([A-Z][a-zA-Z0-9]*)\b/g);
                if (componentMatches && componentMatches.length > 0) {
                  // Use the first component name found, or join multiple
                  searchQuery = componentMatches.join(' ').toLowerCase();
                  console.error(`Optimized broad React query to: "${searchQuery}"`);
                } else {
                  // Fallback: remove broad terms but keep descriptive words
                  searchQuery = searchQuery.replace(/\b(react|component|function|const|var|let)\b/g, '').trim();
                  if (searchQuery) {
                    console.error(`Filtered React broad terms, optimized to: "${searchQuery}"`);
                  }
                }
              }

              // Handle overly broad queries by focusing on unique terms
              const broadTerms = ['function', 'const', 'component', 'react', 'var', 'let'];
              const queryTerms = searchQuery.split(' ').filter(term =>
                term.length > 2 && !broadTerms.includes(term)
              );

              if (queryTerms.length > 0 && queryTerms.length < searchQuery.split(' ').length) {
                searchQuery = queryTerms.join(' ');
                console.error(`Filtered broad terms, optimized query to: "${searchQuery}"`);
              }
              const maxFilesToSearch = Math.min(50, files.length);
              const filesToSearch = files.slice(0, maxFilesToSearch);

              for (const filePath of filesToSearch) {
                try {
                  const content = await fs.readFile(filePath, 'utf8');
                  const lines = content.split('\n');
                  const maxLines = Math.min(1000, lines.length);

                  for (let i = 0; i < maxLines; i++) {
                    const line = lines[i];
                    if (line.toLowerCase().includes(searchQuery)) {

                    const startLine = Math.max(0, i - 2);
                    const endLine = Math.min(lines.length - 1, i + 2);
                    const matchContent = lines.slice(startLine, endLine + 1).join('\n');
                    results.push({
                      file: filePath,
                      startLine: startLine + 1,
                      endLine: endLine + 1,
                      content: matchContent,
                      score: 0.8,
                      type: 'code'
                    });

                    if (results.length >= topK) {
                      break;
                    }
                  }
                }
                if (results.length >= topK) {
                  break;
                }
              } catch (error) {
                console.error(`Error reading file ${filePath}:`, error.message);
              }
            }
          }
        }
        } catch (error) {
          console.error(`Error during search:`, error.message);

          results = [];
        }

        const formattedResults = results.map(r => ({
          file: r.file,
          line: `${r.startLine}-${r.endLine}`,
          content: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
          score: r.score.toFixed(3),
          type: r.type || 'code'
        }));
        cacheSearchResult(query, formattedResults, fullPath);

        addContextPattern(query, 'search');
        
        const insights = generateSearchInsights(results, query, effectiveWorkingDirectory);

        const toolContext = createToolContext('searchcode', effectiveWorkingDirectory, query, {
          filesAccessed: results.map(r => r.file),
          patterns: [query],
          insights: insights
        });

        await workingDirectoryContext.updateContext(effectiveWorkingDirectory, 'searchcode', toolContext);

        const response = {
          content: [{ type: "text", text: JSON.stringify(formattedResults, null, 2) }]
        };
        return addExecutionStatusToResponse(response, 'searchcode');
      } catch (error) {
        // Use enhanced error handling with logging and clear feedback
        const errorHandler = createEnhancedErrorHandler('searchcode');
        const errorContext = {
          workingDirectory: workingDirectory || process.cwd(),
          query: query,
          operation: 'search',
          args: { query, workingDirectory, topK, cursor, pageSize }
        };

        return errorHandler.createErrorResponse(error, errorContext);
      } finally {

        consoleRestore.restore();
      }
    }, 'searchcode', {
      maxRetries: 2,
      retryDelay: 1000
    }), 'searchcode')
  }
];