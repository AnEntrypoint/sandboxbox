#!/usr/bin/env node
// Universal MCP server with cross-platform compatibility and optimizations

import { createMCPServer } from './server-core.js';
import { getAllTools } from './tool-definitions.js';

console.log('[DEBUG] Starting Universal MCP Server v3.1.4...');

// Create the server but don't use the problematic transport
const server = await createMCPServer(process.cwd());
const tools = getAllTools();

console.log('[DEBUG] Server created, setting up manual JSON-RPC handling...');

// Manual JSON-RPC message handling
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      let request;
      try {
        request = JSON.parse(line.trim());
        const response = await handleRequest(request);
        if (response) {
          console.log(JSON.stringify(response));
        }
      } catch (error) {
        // Only send error response for requests (with id), not notifications
        if (request && request.id !== undefined) {
          console.log(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32700, message: "Parse error: " + error.message }
          }));
        } else {
          console.error('[DEBUG] Parse error for notification:', error.message);
        }
      }
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Track initialization state and performance metrics
let isInitialized = false;

// Enhanced performance optimization: Response cache for common requests
const responseCache = new Map();
const CACHE_TTL = 60000; // 60 seconds (increased for better performance)

// Intelligent cache eviction based on usage patterns
const cacheUsage = new Map();

// Performance metrics tracking with detailed analytics
const performanceMetrics = {
  requestCount: 0,
  cacheHits: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  peakResponseTime: 0,
  toolUsage: new Map(),
  errorRate: 0,
  startTime: Date.now(),
  lastOptimization: Date.now()
};

// Connection pool for better resource management
const connectionPool = new Map();
const MAX_CONNECTIONS = 10;

async function handleRequest(request) {
  const startTime = Date.now();
  performanceMetrics.requestCount++;

  const { method, params, id } = request;
  
  // Enhanced performance optimization: Check cache for cacheable requests
  const cacheKey = method === 'tools/list' ? 'tools_list' :
                   method === 'tools/call' ? `tools_call_${JSON.stringify(params)}` : null;

  if (cacheKey) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      performanceMetrics.cacheHits++;
      updateCacheUsage(cacheKey);
      return {
        ...cached.response,
        id // Update ID for the specific request
      };
    }
  }

  switch (method) {
    case 'initialize':
      // Proper MCP initialize response with capabilities negotiation
      const clientVersion = params?.protocolVersion || "2024-11-05";
      const supportedVersion = "2024-11-05"; // Our supported version

      const initResponse = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: supportedVersion,
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: "mcp-glootie-arm64-safe",
            version: "3.1.3" // Updated version with performance optimizations
          }
        }
      };

      return logAndReturn(initResponse, startTime);
      
    case 'notifications/initialized':
      // Handle the initialized notification - no response needed
      isInitialized = true;
      console.error('[DEBUG] MCP handshake completed successfully');
      return null;
      
    case 'ping':
      // Handle ping requests (allowed even before initialization)
      return {
        jsonrpc: "2.0",
        id,
        result: {}
      };
      
    case 'tools/list':
      if (!isInitialized) {
        return logAndReturn({
          jsonrpc: "2.0",
          id,
          error: { code: -32002, message: "Server not initialized" }
        }, startTime);
      }

      // Enhanced performance optimization: Cache tools list response
      const toolsListResponse = {
        jsonrpc: "2.0",
        id,
        result: {
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        }
      };

      // Cache the response with intelligent TTL
      setCache('tools_list', toolsListResponse);

      return logAndReturn(toolsListResponse, startTime);
      
    case 'tools/call':
      if (!isInitialized) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32002, message: "Server not initialized" }
        };
      }
      try {
        // Get tool handlers with ARM64-compatible semantic search
        const { createToolHandlers } = await import('./tool-handlers.js');
        const vectorIndexer = await import('./universal-vector-indexer.js');
        const toolHandlers = createToolHandlers(
          process.cwd(),
          async () => vectorIndexer,
          async () => {
            const utils = await import('./astgrep-utils.js');
            const handlers = await import('./astgrep-handlers.js');
            const handlersAdvanced = await import('./astgrep-handlers-advanced.js');
            return { 
              astgrepUtils: utils, 
              astgrepHandlers: handlers, 
              astgrepHandlersAdvanced: handlersAdvanced 
            };
          },
          async () => ({}), // Mock enhanced utils
          async () => (await import('./batch-handler.js')),
          async () => (await import('./bash-handler.js'))
        );
        
        const handler = toolHandlers[params.name];
        if (!handler) {
          throw new Error(`Unknown tool: ${params.name}`);
        }
        
        const result = await handler(params.arguments || {});

        return logAndReturn({
          jsonrpc: "2.0",
          id,
          result
        }, startTime);
      } catch (error) {
        // Enhanced error handling with specific error codes and fallbacks
        const errorInfo = parseError(error);

        // Log detailed error for debugging
        console.error(`[ERROR] Tool ${params.name} failed: ${errorInfo.code} - ${errorInfo.message}`);

        // Attempt fallback for common errors
        if (errorInfo.shouldFallback) {
          try {
            const fallbackResult = await attemptFallback(params.name, params.arguments || {}, errorInfo);
            if (fallbackResult) {
              return logAndReturn({
                jsonrpc: "2.0",
                id,
                result: {
                  ...fallbackResult,
                  _fallback: true,
                  _originalError: errorInfo.message
                }
              }, startTime);
            }
          } catch (fallbackError) {
            console.error(`[ERROR] Fallback also failed: ${fallbackError.message}`);
          }
        }

        return logAndReturn({
          jsonrpc: "2.0",
          id,
          error: {
            code: errorInfo.code,
            message: errorInfo.message,
            data: {
              tool: params.name,
              timestamp: new Date().toISOString(),
              suggestions: errorInfo.suggestions
            }
          }
        }, startTime);
      }
      
    default:
      return logAndReturn({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" }
      }, startTime);
  }
}

// Enhanced cache management functions
function setCache(key, response) {
  const cacheEntry = {
    response,
    timestamp: Date.now(),
    accessCount: 1
  };

  responseCache.set(key, cacheEntry);
  cacheUsage.set(key, 1);

  // Intelligent cache eviction if cache is full
  if (responseCache.size > 100) {
    evictLeastUsedCacheEntry();
  }
}

function getFromCache(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;

  // Check if cache entry is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    cacheUsage.delete(key);
    return null;
  }

  // Update access statistics
  cached.accessCount++;
  cacheUsage.set(key, (cacheUsage.get(key) || 0) + 1);

  return cached;
}

function updateCacheUsage(key) {
  cacheUsage.set(key, (cacheUsage.get(key) || 0) + 1);
}

function evictLeastUsedCacheEntry() {
  let leastUsedKey = null;
  let leastUsedCount = Infinity;

  for (const [key, count] of cacheUsage) {
    if (count < leastUsedCount) {
      leastUsedCount = count;
      leastUsedKey = key;
    }
  }

  if (leastUsedKey) {
    responseCache.delete(leastUsedKey);
    cacheUsage.delete(leastUsedKey);
  }
}

// Enhanced performance logging function
function logAndReturn(response, startTime) {
  const responseTime = Date.now() - startTime;

  // Update performance metrics
  performanceMetrics.totalResponseTime += responseTime;
  performanceMetrics.averageResponseTime = performanceMetrics.totalResponseTime / performanceMetrics.requestCount;
  performanceMetrics.peakResponseTime = Math.max(performanceMetrics.peakResponseTime, responseTime);

  // Log performance metrics every 50 requests
  if (performanceMetrics.requestCount % 50 === 0) {
    const cacheHitRate = (performanceMetrics.cacheHits / performanceMetrics.requestCount * 100).toFixed(1);
    const avgResponseTime = performanceMetrics.averageResponseTime.toFixed(1);

    console.error(`[PERFORMANCE] Requests: ${performanceMetrics.requestCount}, Avg: ${avgResponseTime}ms, Peak: ${performanceMetrics.peakResponseTime}ms, Cache Hit Rate: ${cacheHitRate}%`);
  }

  // Auto-optimize based on performance metrics
  if (performanceMetrics.requestCount % 200 === 0) {
    optimizePerformance();
  }

  return response;
}

// Adaptive performance optimization
function optimizePerformance() {
  const now = Date.now();
  const timeSinceLastOptimization = now - performanceMetrics.lastOptimization;

  if (timeSinceLastOptimization < 300000) return; // Don't optimize too frequently

  const avgResponseTime = performanceMetrics.averageResponseTime;
  const cacheHitRate = performanceMetrics.cacheHits / performanceMetrics.requestCount;

  // Adjust cache TTL based on performance
  if (avgResponseTime > 1000 && cacheHitRate < 0.5) {
    // Poor performance, increase cache TTL
    global.CACHE_TTL = Math.min(CACHE_TTL * 1.5, 300000); // Max 5 minutes
    console.error(`[OPTIMIZATION] Increased cache TTL to ${global.CACHE_TTL}ms due to poor performance`);
  } else if (avgResponseTime < 200 && cacheHitRate > 0.8) {
    // Good performance, reduce cache TTL to save memory
    global.CACHE_TTL = Math.max(CACHE_TTL * 0.8, 15000); // Min 15 seconds
    console.error(`[OPTIMIZATION] Reduced cache TTL to ${global.CACHE_TTL}ms due to good performance`);
  }

  // Clear old cache entries
  if (responseCache.size > 50) {
    const keysToDelete = [];
    for (const [key, entry] of responseCache) {
      if (now - entry.timestamp > CACHE_TTL * 0.5) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      responseCache.delete(key);
      cacheUsage.delete(key);
    });

    console.error(`[OPTIMIZATION] Cleared ${keysToDelete.length} old cache entries`);
  }

  performanceMetrics.lastOptimization = now;
}

// Enhanced error parsing with specific error codes
function parseError(error) {
  const errorCodeMap = {
    'ENOENT': { code: -32001, message: 'File or directory not found', shouldFallback: true },
    'EACCES': { code: -32002, message: 'Permission denied', shouldFallback: false },
    'ETIMEOUT': { code: -32003, message: 'Operation timeout', shouldFallback: true },
    'EMFILE': { code: -32004, message: 'Too many open files', shouldFallback: true },
    'ENOMEM': { code: -32005, message: 'Out of memory', shouldFallback: false },
    'EPERM': { code: -32006, message: 'Operation not permitted', shouldFallback: false }
  };

  const errorKey = Object.keys(errorCodeMap).find(key => error.message.includes(key) || error.code === key);
  const baseError = errorCodeMap[errorKey] || {
    code: -32000,
    message: error.message || 'Unknown error',
    shouldFallback: false
  };

  return {
    ...baseError,
    suggestions: getErrorSuggestions(baseError.code, error),
    originalError: error
  };
}

// Get suggestions for error recovery
function getErrorSuggestions(errorCode, error) {
  const suggestions = {
    '-32001': ['Check if the file path exists', 'Verify directory permissions', 'Use absolute paths'],
    '-32002': ['Run with elevated permissions', 'Check file ownership', 'Verify process capabilities'],
    '-32003': ['Increase timeout value', 'Check network connectivity', 'Reduce operation complexity'],
    '-32004': ['Close unused file handles', 'Increase file descriptor limit', 'Process files in batches'],
    '-32005': ['Reduce memory usage', 'Process data in chunks', 'Free unused resources'],
    '-32006': ['Check system permissions', 'Verify user capabilities', 'Run with appropriate privileges']
  };

  return suggestions[errorCode] || ['Retry the operation', 'Check system resources', 'Verify input parameters'];
}

// Fallback mechanism for common errors
async function attemptFallback(toolName, args, errorInfo) {
  const fallbackStrategies = {
    'searchcode': async (args) => {
      // Fallback to basic file system search
      const fs = await import('fs');
      const path = await import('path');
      const results = [];

      const searchDir = args.workingDirectory || process.cwd();
      const searchTerm = args.query || 'function';

      try {
        const files = fs.readdirSync(searchDir);
        for (const file of files) {
          if (file.endsWith('.js') || file.endsWith('.ts')) {
            const content = fs.readFileSync(path.join(searchDir, file), 'utf8');
            if (content.includes(searchTerm)) {
              results.push({ file, matches: content.split('\n').filter(line => line.includes(searchTerm)).length });
            }
          }
        }
        return { results, _fallbackMethod: 'filesystem_search' };
      } catch (e) {
        return null;
      }
    },

    'execute': async (args) => {
      // Fallback to simplified execution
      try {
        if (args.commands) {
          const { execSync } = await import('child_process');
          const result = execSync(args.commands, {
            encoding: 'utf8',
            timeout: 30000,
            cwd: args.workingDirectory
          });
          return { output: result, _fallbackMethod: 'simplified_execution' };
        }
      } catch (e) {
        return null;
      }
    }
  };

  const fallback = fallbackStrategies[toolName];
  return fallback ? fallback(args) : null;
}

console.log('[DEBUG] Universal MCP Server ready with cross-platform optimizations v3.1.4');