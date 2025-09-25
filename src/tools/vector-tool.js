#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import os from 'os';
import ignore from 'ignore';
import { createIgnoreFilter, loadCustomIgnorePatterns } from '../core/ignore-manager.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';
import { createMCPResponse, withPagination } from '../core/mcp-pagination.js';
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
const INDEX_DIR = './code_search_index';
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
const MAX_FILE_SIZE = 75 * 1024; 
const MAX_LINES_PER_CHUNK = 200; 
const MAX_CACHE_SIZE = 1500; 
const INDEX_FILE = 'code_index.json';
const VECTOR_INDEX_FILE = 'vector_index.json';
const platformConfig = {
  memoryLimit: platform.isARM64 ? 1024 * 1024 * 1024 : 512 * 1024 * 1024,
  batchSize: platform.isARM64 ? 64 : 32,
  maxConcurrency: platform.isARM64 ? 6 : 3,
  timeout: platform.isARM64 ? 45000 : 25000
};
let codeChunks = [];
let embeddingExtractor = null;
let isInitialized = false;
let indexTimestamp = 0;
function generateSearchInsights(results, query, workingDirectory) {
  const insights = [];
  
  insights.push(`Found ${results.length} results for query: "${query}"`);
  
  const uniqueFiles = new Set(results.map(r => r.file));
  if (uniqueFiles.size > 1) {
    insights.push(`Results span ${uniqueFiles.size} different files`);
  }
  
  const fileTypes = new Set(results.map(r => r.file.split('.').pop()));
  if (fileTypes.size > 1) {
    insights.push(`Results include ${fileTypes.size} file types: ${Array.from(fileTypes).join(', ')}`);
  }
  
  const scores = results.map(r => parseFloat(r.score || 0));
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  if (avgScore > 0.7) {
    insights.push(`High relevance results (avg score: ${avgScore.toFixed(2)})`);
  } else if (avgScore > 0.4) {
    insights.push(`Moderate relevance results (avg score: ${avgScore.toFixed(2)})`);
  } else {
    insights.push(`Low relevance results (avg score: ${avgScore.toFixed(2)}) - consider refining query`);
  }
  
  if (results.length > 0) {
    const highQualityResults = results.filter(r => r.score > 0.6).length;
    insights.push(`${highQualityResults} high-quality matches (score > 0.6)`);
  }
  
  if (results.length > 0) {
    const topResult = results[0];
    insights.push(`Best match: ${topResult.file} (score: ${topResult.score})`);
  }
  
  if (query.toLowerCase().includes('error') || query.toLowerCase().includes('bug')) {
    insights.push('Searching for errors/bugs - consider checking related test files');
  }
  if (query.toLowerCase().includes('function') || query.toLowerCase().includes('method')) {
    insights.push('Function search - consider looking for related functions or usage patterns');
  }
  if (query.toLowerCase().includes('config') || query.toLowerCase().includes('setting')) {
    insights.push('Configuration search - check for environment-specific configs');
  }
  
  if (results.length === 0) {
    insights.push('No results found - try broader search terms or different keywords');
  } else if (results.length > 20) {
    insights.push('Many results - consider refining search with more specific terms');
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
    env.localModelPath = './.cache';
    env.allowLocalModels = true;
    env.remoteModelPath = null;
    env.forceDownload = false;

    console.log(`Loading model: ${DEFAULT_MODEL}`);

    // Create pipeline with timeout and error handling
    const pipelinePromise = pipeline('feature-extraction', DEFAULT_MODEL, {
      quantized: true,
      device: 'cpu'
    });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Model loading timeout after 60 seconds')), 60000);
    });

    embeddingExtractor = await Promise.race([pipelinePromise, timeoutPromise]);
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
  try {
    const indexPath = pathJoin(indexDir, INDEX_FILE);
    if (existsSync(indexPath)) {
      const indexData = JSON.parse(readFileSync(indexPath, 'utf8'));
      codeChunks = indexData.chunks || [];
      indexTimestamp = indexData.timestamp || 0;
      console.log(`Loaded existing index with ${codeChunks.length} chunks`);
    } else {
      console.log("No existing index found, starting fresh");
      codeChunks = [];
      indexTimestamp = 0;
    }
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
    const filePromises = entries.map(async (entry) => {
      const fullPath = pathJoin(dir, entry.name);
      if (ignoreFilter.ignores) {
        
        if (ignoreFilter.ignores(fullPath)) {
          return null;
        }
      } else {
        
        const relativePath = pathRelative(ignoreFilter.rootDir, fullPath);
        if (ignoreFilter.ig.ignores(relativePath)) {
          return null;
        }
      }
      if (entry.isDirectory()) {
        return scanDirectory(fullPath, ignoreFilter, files, exts);
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
      return null;
    });
    await Promise.all(filePromises);
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
    // Add timeout to prevent hanging during embedding generation
    const embeddingPromise = embeddingExtractor(text, {
      pooling: 'cls',
      normalize: true,
      truncation: true,
      max_length: 512
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Embedding generation timeout after 30 seconds')), 30000);
    });

    const embedding = await Promise.race([embeddingPromise, timeoutPromise]);
    embeddingLRUCache.set(cacheKey, embedding);
    return embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
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
      console.log(`Created index directory: ${indexDir}`);
    }
    if (!embeddingExtractor) {
      await initializeEmbeddingProvider();
    }
    await loadIndex(indexDir);
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Vector system initialization failed:", error);
    throw new Error(`Vector system initialization failed: ${error.message}`);
  }
}
export async function processFile(file, codeChunks) {
  const newChunks = [];
  try {
    const stats = await fs.stat(file);
    if (stats.size > MAX_FILE_SIZE) {
      console.log(`File ${file} is large (${stats.size} bytes), truncating`);
      let content = await fs.readFile(file, 'utf8');
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
  const indexData = {
    timestamp: indexTimestamp,
    chunks: codeChunks.map(c => ({
      file: c.file,
      content: c.content,
      startLine: c.startLine,
      endLine: c.endLine
    }))
  };
  if (!existsSync(INDEX_DIR)) {
    mkdirSync(INDEX_DIR, { recursive: true });
  }
  const indexPath = pathJoin(INDEX_DIR, INDEX_FILE);
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
        const similarity = calculateCosineSimilarity(queryEmbedding.data, chunkEmbedding.data);
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
function preprocessQuery(query) {
  let processedQuery = query.toLowerCase();
  
  const refactoringPatterns = {
    
    'hardcoded': 'hardcoded string literal magic number constant value',
    'magic': 'magic number hardcoded constant',
    'literal': 'string literal text constant hardcoded',
    'duplicate': 'duplicate code repeated logic copy paste',
    'repeated': 'repeated code duplicate logic similar pattern',
    
    'utility': 'utility function helper method shared common logic',
    'shared': 'shared logic common function utility helper',
    'helper': 'helper function utility method shared logic',
    'common': 'common logic shared utility function pattern',
    
    'component': 'component ui element interface view',
    'ui': 'ui component interface element user interface',
    'interface': 'interface component ui type definition',
    
    'error': 'error handling exception catch throw validation',
    'validation': 'validation check verify error input',
    'boundary': 'error boundary exception handling validation',
    
    'state': 'state management data store variable',
    'data': 'data structure object array variable',
    'store': 'store state data management',
    
    'api': 'api endpoint route handler request http',
    'endpoint': 'endpoint api route handler http request',
    'handler': 'handler function callback event',
    
    'config': 'configuration settings config option parameter',
    'setting': 'setting configuration option parameter config',
    
    'test': 'test spec unit integration validation',
    'spec': 'spec test specification validation',
    
    'async': 'async await promise then callback',
    'promise': 'promise async await then resolve reject',
    'await': 'await async promise then',
    
    'file': 'file module document code source',
    'module': 'module file package export import',
    'import': 'import require include module package',
    'export': 'export module package function variable',
    
    'logic': 'logic code algorithm function method',
    'algorithm': 'algorithm logic code function method',
    'pattern': 'pattern design code logic structure',
    
    'database': 'database sql query model schema',
    'query': 'query sql database search filter',
    'model': 'model data database schema structure',
    
    'react': 'react component hook state props',
    'hook': 'hook useeffect usestate context custom',
    'useeffect': 'useeffect hook react side effect',
    'usestate': 'usestate hook react state management',
    'props': 'props properties component react',
    
    'function': 'function method def declaration arrow',
    'method': 'method function class object',
    'class': 'class struct interface type object',
    'interface': 'interface type definition struct class',
    'type': 'type definition interface struct class',
    'variable': 'variable const let var declaration',
    'constant': 'constant const variable declaration',
    
    'performance': 'performance optimization speed efficient fast',
    'optimization': 'optimization performance improve efficient',
    'efficient': 'efficient fast performance optimization',
    
    'security': 'security safe validation protection',
    'validation': 'validation check verify security input',
    'safe': 'safe security validation protection'
  };
  
  for (const [pattern, expansions] of Object.entries(refactoringPatterns)) {
    if (processedQuery.includes(pattern)) {
      processedQuery += ' ' + expansions;
    }
  }
  
  const multiWordPatterns = {
    'hardcoded strings': 'hardcoded string literal text constant value',
    'shared logic': 'shared logic common utility function helper method',
    'error boundaries': 'error boundary exception handling validation safety',
    'utility functions': 'utility function helper method shared common logic',
    'common patterns': 'common pattern design code logic structure algorithm',
    'react components': 'react component ui element interface view hook',
    'data structures': 'data structure object array model type',
    'state management': 'state management data store variable context',
    'input validation': 'input validation check verify security error handling',
    'code patterns': 'code pattern logic design structure algorithm method',
    'file structure': 'file structure module organization code architecture',
    'performance optimization': 'performance optimization efficient fast code algorithm',
    'error handling': 'error handling exception catch throw validation safety'
  };
  
  for (const [pattern, expansions] of Object.entries(multiWordPatterns)) {
    if (processedQuery.includes(pattern)) {
      processedQuery += ' ' + expansions;
    }
  }
  return processedQuery;
}
export async function queryVectorIndex(query, topK = 8) {
  if (!isInitialized) {
    await initializeVectorSystem();
  }
  if (codeChunks.length === 0) {
    return [];
  }
  
  const enhancedQuery = preprocessQuery(query);
  const queryEmbedding = await getEmbedding(enhancedQuery);
  const results = [];
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
  
  const MIN_RELEVANCE_THRESHOLD = 0.3; 
  return results
    .filter(r => r.similarity >= MIN_RELEVANCE_THRESHOLD)
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
export async function searchCode(params, workingDirectory, folderPaths = ['.'], extensions = DEFAULT_EXTS, topK = 6) {
  try {
    
    let query;
    if (typeof params === 'object' && params !== null) {
      query = params.query;
      workingDirectory = params.workingDirectory || workingDirectory;
      folderPaths = params.path || folderPaths;
      extensions = params.extensions || extensions;
      topK = params.topK || topK;
    } else {
      query = params;
    }
    console.error(`searchCode called with query: "${query}", workingDir: "${workingDirectory}", folders: ${Array.isArray(folderPaths) ? folderPaths.join(', ') : folderPaths}`);
    
    if (!workingDirectory || typeof workingDirectory !== 'string') {
      workingDirectory = process.cwd();
    }
    
    if (!existsSync(workingDirectory)) {
      console.warn(`Working directory does not exist: ${workingDirectory}, using current directory`);
      workingDirectory = process.cwd();
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
    console.error("Starting index sync...");
    const results = await syncVectorIndex(absFolders, extensions);
    console.error(`Indexed ${results} chunks from ${absFolders.length} directories`);
    console.error("Starting vector query...");
    const searchResults = await queryVectorIndex(query, topK);
    console.error(`Found ${searchResults.length} results for query: "${query}"`);
    return searchResults;
  } catch (error) {
    console.error(`Search failed for query "${query}":`, error);
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
export async function syncIndex(folders, exts = DEFAULT_EXTS) {
  return await syncVectorIndex(folders, exts);
}
export async function queryIndex(query, topK = 8) {
  return await queryVectorIndex(query, topK);
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
  return `${results.length} results for "${query}" in ${path}:\n\n${results.map(r => `${r.file}:${r.startLine}-${r.endLine}\n${r.content.substring(0, 200)}${r.content.length > 200 ? '...' : ''}\nSimilarity: ${r.score.toFixed(3)}`).join('\n\n')}`;
}
export const searchTools = [
  {
    name: "searchcode",
    description: "Semantic code search optimized for refactoring tasks. Use SPECIFIC, TARGETED queries for best results. Examples: 'TaskManager component' (not 'React component'), 'handleAddTask function' (not 'function'), 'useState hooks' (not 'state'), 'validation logic', 'error handling', 'API calls'. Avoid broad terms like 'component', 'function', 'const' - use specific names and patterns. Automatically expands to include relevant patterns.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query optimized for refactoring. Use concise terms: 'hardcoded', 'utility', 'component', 'error', 'validation'. Automatically expands to include relevant patterns." },
        path: { type: "string", description: "Directory to search in (default: current directory). MUST be absolute path like '/Users/username/project/src' not relative like './src'" },
        workingDirectory: { type: "string", description: "Optional: Absolute path to working directory base path. If not provided, defaults to current directory. Use full paths like '/Users/username/project' not relative paths like './project'." },
        cursor: { type: "string", description: "Pagination cursor from previous search results" },
        pageSize: { type: "number", description: "Number of results per page (default: 6)" },
        topK: { type: "number", description: "Maximum total results to consider (default: 10, take a few more than you need)" }
      },
      required: ["query"]
    },
    handler: async ({ query, path = ".", workingDirectory, cursor, pageSize = 6, topK = 10 }) => {
      
      const consoleRestore = suppressConsoleOutput();
      try {
        
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          throw new Error('Query parameter is required and must be a non-empty string');
        }
        const effectiveWorkingDirectory = workingDirectory || process.cwd();
        const searchPathParam = path || '.';
        
        const context = await workingDirectoryContext.getToolContext(effectiveWorkingDirectory, 'searchcode', query);
        console.error(`Search request: query="${query}", path="${searchPathParam}", workingDir="${effectiveWorkingDirectory}"`);
        
        if (!existsSync(effectiveWorkingDirectory)) {
          console.warn(`Working directory does not exist: ${effectiveWorkingDirectory}`);
          const response = {
            content: [{ type: "text", text: "Working directory does not exist" }],
            isError: true
          };
          return addExecutionStatusToResponse(response, 'searchcode');
        }
        
        const fullPath = isAbsolute(searchPathParam)
          ? searchPathParam
          : pathResolve(effectiveWorkingDirectory, searchPathParam);
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
              await initializeVectorSystem();
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
              results = semanticResults.map(r => ({
                file: r.file,
                startLine: r.startLine,
                endLine: r.endLine,
                content: r.content,
                score: r.score || 0.8,
                type: 'semantic'
              }));
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
            console.error(`Found ${results.length} real results for query: "${query}"`);
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
        
        for (let i = 0; i < results.length; i++) {
          for (let j = i + 1; j < results.length; j++) {
            
          }
        }
        console.error(`Returning ${results.length} results for query: "${query}"`);
        
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
        
        const errorContext = createToolContext('searchcode', workingDirectory || process.cwd(), query, {
          error: error.message
        });
        await workingDirectoryContext.updateContext(workingDirectory || process.cwd(), 'searchcode', errorContext);
        const response = {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true
        };
        return addExecutionStatusToResponse(response, 'searchcode');
      } finally {
        
        consoleRestore.restore();
      }
    }
  }
];