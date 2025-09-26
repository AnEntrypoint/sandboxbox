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
  memoryLimit: 1024 * 1024 * 1024,
  batchSize: 64,
  maxConcurrency: 6,
  timeout: 45000
};
let codeChunks = [];
let embeddingExtractor = null;
let isInitialized = false;
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
    // Enhanced code-specific preprocessing for better embeddings
    const enhancedText = enhanceTextForCodeEmbedding(text);

    // Add timeout to prevent hanging during embedding generation
    const embeddingPromise = embeddingExtractor(enhancedText, {
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

  // Enhanced code-specific intent recognition and expansion - TECHNICAL IMPLEMENTATION FOCUSED
  const intentPatterns = {
    // Component and UI patterns - TECHNICAL FOCUS
    'react': 'React.Component FunctionComponent JSX.Element useState useEffect useCallback useMemo useRef props children',
    'component': 'interface Props<T = unknown> React.FC const function export return JSX.Element',
    'hook': 'useState useEffect useCallback useMemo useRef customHook<T> useLayout useId useReducer',
    'usestate': 'useState<T>(initial: T | () => T) const [state, setState] = useState',
    'useeffect': 'useEffect(() => { return cleanup }, [dependencies]) sideEffect dependencyArray',
    'props': 'interface Props extends React.PropsWithChildren<T> optional?: required: readonly',

    // Function and logic patterns - TECHNICAL FOCUS
    'function': 'function name<T>(params: Type): ReturnType export const arrow = async => return',
    'method': 'public private protected static method<T>(params): Type this.bind.apply.call',
    'utility': 'export const util = <T>(input: T): Result => utility helper shared reusable',
    'helper': 'function helper<T>(input: T): Output type Helper = (input: T) => Result',

    // Data and state patterns - TECHNICAL FOCUS
    'state': 'useState<T> dispatch reducer action selector createSlice configureStore Provider',
    'data': 'Array<T> Map<K,V> Set<T> Record<K,V> interface type object json parse stringify',
    'store': 'configureStore({ reducer: {} }) createSlice({ name, initialState, reducers })',
    'context': 'createContext<ContextType>() useContext(Context) Context.Provider value={}',

    // Architecture patterns - TECHNICAL FOCUS
    'api': 'fetch(url, options) axios.get/post/put/delete request response headers status',
    'endpoint': 'GET /api/users POST /api/data route handler controller service',
    'service': 'class UserService { constructor(repo: UserRepo) async findAll(): Promise<User[]> }',
    'controller': '@Controller() @Get("/users") async findAll(): Promise<User[]> { }',
    'middleware': 'app.use(cors()) app.use(express.json()) authenticate(req, res, next)',

    // Error and validation patterns - TECHNICAL FOCUS
    'error': 'try catch finally throw new Error(message) Promise.catch async error boundary',
    'validation': 'zod.object({}).parse() type guard instanceof isRequired constraint',
    'boundary': 'ErrorBoundary getDerivedStateFromError componentDidCatch fallback UI Component',
    'exception': 'Exception Error TypeError ReferenceError SyntaxError catch throw finally',

    // Performance and optimization patterns - TECHNICAL FOCUS
    'performance': 'memo useMemo useCallback React.memo memoization cache key optimization',
    'optimization': 'debounce throttle virtualization lazy loading suspense fallback useMemoKey',
    'cache': 'cacheKey storage localStorage sessionStorage WeakMap memoization strategy React.cache',
    'memo': 'memo<T>(Component: React.FC<T>) useMemo<T>(callback, deps) useCallback',

    // Code quality patterns - TECHNICAL FOCUS
    'hardcoded': 'process.env.NODE_ENV const CONFIG = {} enum Values string literal magic number',
    'magic': 'MAGIC_NUMBER const TIMEOUT = 5000 enum Status type StatusCode DRY principle',
    'duplicate': 'DRY extract helper function abstract to utility reuse compose pattern',
    'refactor': 'extract method inline variable rename signature change type improve maintainability',

    // Testing patterns - TECHNICAL FOCUS
    'test': 'describe() it() expect() jest.fn() vi.fn() mockReturnValue mockResolvedValue',
    'spec': 'specification test suite beforeEach afterEach cleanup mock spy assertion expect',
    'mock': 'jest.mock() vi.mock() mockImplementation mockImplementationOnce spyOn',

    // Configuration and patterns - TECHNICAL FOCUS
    'config': 'process.env config.env vite.config.ts tailwind.config.ts tsconfig.json package.json',
    'setting': 'const settings = { key: value } type Settings = {} interface Config',
    'pattern': 'design pattern singleton factory observer strategy decorator adapter composite',

    // Language specific patterns - TECHNICAL FOCUS
    'typescript': 'interface type enum generic <T> extends implements readonly ? : utility types',
    'javascript': 'async await => ...rest optional chaining ?. nullish coalescing ?? Promise',
    'python': '@property def __init__ self class method decorator generator yield async def',
    'go': 'func (r *Receiver) method() error struct interface channel make <- go defer',
    'rust': 'fn main() -> Result<(), Error> struct impl trait lifetime mut let match',

    // File and module patterns - TECHNICAL FOCUS
    'import': 'import type { } from import * as import default export { named } require',
    'export': 'export default export const export type export interface export function module.exports',
    'module': 'module.exports __esModule namespace package.json main index.ts barrel export',

    // Async patterns - TECHNICAL FOCUS
    'async': 'async function await Promise.all Promise.race Promise.resolve() Promise.reject()',
    'promise': 'new Promise((resolve, reject) =>) .then() .catch() .finally() async/await',
    'await': 'await result try { await asyncOperation() } catch (error) { handle() }',

    // Database patterns - TECHNICAL FOCUS
    'database': 'SELECT INSERT UPDATE DELETE WHERE JOIN GROUP BY ORDER BY LIMIT',
    'query': 'SELECT * FROM table WHERE condition = value ORDER BY column DESC LIMIT 10',
    'model': 'interface User { id: number; email: string; createdAt: Date; } type UserModel',

    // Security patterns - TECHNICAL FOCUS
    'security': 'sanitize(input) escapeHtml(xss) validation csrfToken authenticate authorize',
    'validation': 'zod.parse(input) typeof value === "string" instance validation schema',
    'sanitization': 'DOMPurify.sanitize(input) escape(input) encodeURI decodeURI encodeURIComponent'
  };

  // Apply single-word patterns
  for (const [pattern, expansions] of Object.entries(intentPatterns)) {
    if (processedQuery.includes(pattern)) {
      processedQuery += ' ' + expansions;
    }
  }

  // Enhanced multi-word intent patterns - TECHNICAL IMPLEMENTATION FOCUSED
  const multiWordIntents = {
    'react components': 'React.Component FunctionComponent interface props children ReactNode useState useEffect useCallback useMemo useRef',
    'utility functions': 'function export const return parameter type interface generic utility helper',
    'error handling': 'try catch throw Error TypeError finally Promise.catch async error boundary',
    'state management': 'useState useState dispatch reducer action selector createSlice configureStore',
    'performance optimization': 'memo useMemo useCallback React.memo memoization cache optimization useMemoKey',
    'input validation': 'zod schema validate type guard interface constraint required optional',
    'code organization': 'export import module namespace type interface class struct function',
    'api endpoints': 'fetch axios request response get post put delete endpoint url http',
    'data structures': 'Array<T> Map<K,V> Set<T> Record<K,V> interface type object array map set',
    'error boundaries': 'ErrorBoundary getDerivedStateFromError componentDidCatch fallback error',
    'async operations': 'async await Promise.all Promise.race Promise.resolve Promise.reject then catch',
    'testing strategies': 'describe it expect jest.fn vi.fn mock spyOn beforeEach afterEach',
    'configuration management': 'config.env process.env Config interface type const enum',
    'security measures': 'xss csrf sanitization validation escape encode decode authentication authorization',
    'memory management': 'cleanup useEffect return dispose WeakMap WeakRef finalize garbage collection',
    // Technical library patterns
    'tanstack table': 'useTable ColumnDef ColumnAccessor sorting filtering pagination flexRender',
    'tanstack router': 'createRouter Route Link useNavigate useSearch createFileRoute',
    'tanstack query': 'useQuery useMutation useQueryClient QueryClient staleTime refetch',
    'recharts visualization': 'BarChart LineChart PieChart XAxis YAxis Tooltip Legend ResponsiveContainer dataKey',
    'shadcn components': 'Button Input Card Dialog Select Table DataTable Command Badge',
    'radix ui': 'Root Trigger Content Item Label Value Separator Checkbox RadioGroup',
    'tailwind css': 'className flex gap px py rounded border shadow hover focus disabled',
    'typescript types': 'interface type enum generic union intersection Record Partial Required Omit Pick',
    'react hooks': 'useState useEffect useCallback useMemo useRef useLayout useId useReducer',
    'form handling': 'handleSubmit register control watch formState react-hook-form zod resolver'
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
      const vectorSimilarity = calculateCosineSimilarity(queryEmbedding.data, chunkEmbedding.data);

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
    });
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  // Enhanced filtering and ranking
  const MIN_RELEVANCE_THRESHOLD = 0.25; // Lowered to catch more relevant results
  return results
    .filter(r => r.relevanceScore >= MIN_RELEVANCE_THRESHOLD)
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

  // Framework-specific boosts
  if (queryLower.includes('tanstack') && codeLower.includes('tanstack')) {
    relevanceScore += 0.2;
  }
  if (queryLower.includes('react') && codeLower.includes('react')) {
    relevanceScore += 0.15;
  }
  if (queryLower.includes('recharts') && codeLower.includes('recharts')) {
    relevanceScore += 0.2;
  }
  if (queryLower.includes('zustand') && codeLower.includes('zustand')) {
    relevanceScore += 0.2;
  }
  if (queryLower.includes('clerk') && codeLower.includes('clerk')) {
    relevanceScore += 0.2;
  }
  if (queryLower.includes('typescript') && (codeLower.includes('typescript') || codeLower.includes('type') || codeLower.includes('interface'))) {
    relevanceScore += 0.15;
  }

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
  try {
    
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
    description: `Vector code search for finding similar code patterns and components.`,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for code patterns" },
                workingDirectory: { type: "string", description: "Working directory path" },
        cursor: { type: "string", description: "Pagination cursor from previous search results" },
        pageSize: { type: "number", description: "Number of results per page (default: 6)" },
        topK: { type: "number", description: "Maximum total results to consider (default: 10, take a few more than you need)" }
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
    }, 'searchcode', {
      maxRetries: 2,
      retryDelay: 1000
    }), 'searchcode')
  }
];