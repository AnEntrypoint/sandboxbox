import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  unlinkSync
} from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createMCPResponse } from '../core/mcp-pagination.js';
import { workingDirectoryContext, createToolContext } from '../core/working-directory-context.js';
import { createIgnoreFilter } from '../core/ignore-manager.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';
import {
  initializeVectorSystem,
  queryVectorIndex,
  DEFAULT_EXTS,
  isInitialized,
  embeddingExtractor,
  findCodeFiles,
  syncVectorIndex,
  embeddingLRUCache,
  codeChunks
} from './vector-tool.js';
import { JobManager, Job, JobStatus, JobPriority } from '../core/job-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async job manager for search operations
const jobManager = new JobManager('./search-job-storage');

export const ASYNC_SEARCH_TOOL = {
  name: 'async_search',
  description: 'ASYNC vector embedding search with progress tracking. Uses ONLY vector embeddings - no fallbacks. Query optimization extracts meaningful terms. Returns job ID for progress monitoring. Results available via pagination (page 1 = latest). Jobs auto-cancel after 30 minutes. USE SPECIFIC QUERIES: "TaskManager component" (not "React component"), "useState hooks" (not "state"), "validation logic". AVOID broad terms: "component", "function", "const".',

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - be specific! Vector embeddings will find semantically similar code. Examples: "TaskManager component", "useState hooks", "validation logic", "error handling". Avoid broad terms like "component", "function", "const".'
      },
      path: {
        type: 'string',
        description: 'Directory to search in (default: current directory). MUST be absolute path like "/Users/username/project/src" not relative like "./src"'
      },
      workingDirectory: {
        type: 'string',
        description: 'Optional: Absolute path to working directory base path. Use full paths like "/Users/username/project" not relative paths like "./project".'
      },
      topK: {
        type: 'number',
        description: 'Maximum results to return (default: 10, max: 50)',
        default: 10,
        minimum: 1,
        maximum: 50
      },
      timeout: {
        type: 'number',
        description: 'Job timeout in seconds (default: 1800 = 30 minutes, max: 3600 = 1 hour)',
        default: 1800,
        minimum: 60,
        maximum: 3600
      }
    },
    required: ['query']
  },

  handler: async ({ query, path = '.', workingDirectory, topK = 10, timeout = 1800 }) => {
    const consoleRestore = suppressConsoleOutput();

    try {
      // Validate query
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Query parameter is required and must be a non-empty string');
      }

      const effectiveWorkingDirectory = workingDirectory || process.cwd();
      const searchPathParam = path || '.';

      // Create async search job
      const job = jobManager.createJob({
        type: 'vector_search',
        name: `Vector Search: ${query}`,
        description: `Semantic vector search for "${query}" in ${searchPathParam}`,
        parameters: { query, path: searchPathParam, workingDirectory: effectiveWorkingDirectory, topK },
        priority: JobPriority.NORMAL,
        timeout: timeout * 1000
      });

      console.error(`Created async search job ${job.id} for query: "${query}"`);

      // Start the search in background
      executeVectorSearch(job).catch(error => {
        console.error(`Vector search job ${job.id} failed:`, error);
        job.fail(error);
      });

      // Return immediate response with job info
      return {
        content: [{
          type: 'text',
          text: `🔍 Vector search started for "${query}"

JOB DETAILS:
• Job ID: ${job.id}
• Status: ${job.status}
• Query: "${query}"
• Path: ${searchPathParam}
• Timeout: ${timeout} seconds

MONITORING INSTRUCTIONS:
• Check progress: Use job_status tool with job_id="${job.id}"
• View results: Use job_results tool with job_id="${job.id}"
• List all jobs: Use job_list tool
• Cancel job: Use job_cancel tool with job_id="${job.id}"

RESULTS:
• Available when job completes
• Access via pagination (page 1 = latest results)
• Auto-deletes after 1 hour of completion

NOTES:
• Uses ONLY vector embeddings (no text search fallback)
• Query automatically optimized for semantic search
• Job auto-cancels after ${timeout} seconds if not completed`
        }],
        isError: false
      };

    } catch (error) {
      const errorContext = createToolContext('async_search', workingDirectory || process.cwd(), query, {
        error: error.message
      });
      await workingDirectoryContext.updateContext(workingDirectory || process.cwd(), 'async_search', errorContext);

      return {
        content: [{ type: 'text', text: `❌ Vector search initialization failed: ${error.message}` }],
        isError: true
      };
    } finally {
      consoleRestore.restore();
    }
  }
};

// Background search execution
async function executeVectorSearch(job) {
  try {
    job.start();
    job.updateProgress(5, 'Initializing vector system');

    const { query, path: searchPathParam, workingDirectory, topK } = job.parameters;

    // Initialize vector system if needed
    if (!isInitialized) {
      job.addOutput('Initializing vector embedding system...');
      await initializeVectorSystem();
    }

    if (!isInitialized || !embeddingExtractor) {
      throw new Error('Vector embedding system required but not available');
    }

    job.updateProgress(15, 'Vector system ready');

    // Resolve search path
    let searchPath;
    if (path.isAbsolute(searchPathParam)) {
      searchPath = searchPathParam;
    } else {
      searchPath = path.resolve(workingDirectory, searchPathParam);
    }

    if (!existsSync(searchPath)) {
      throw new Error(`Search path does not exist: ${searchPath}`);
    }

    job.updateProgress(25, `Searching in: ${searchPath}`);

    // Optimize query for vector search
    let semanticQuery = query;
    job.addOutput(`Original query: "${query}"`);

    // Extract component names from React queries
    if (query.toLowerCase().includes('react') && query.toLowerCase().includes('component')) {
      const componentMatches = query.match(/\b([A-Z][a-zA-Z0-9]*)\b/g);
      if (componentMatches && componentMatches.length > 0) {
        semanticQuery = componentMatches.join(' ');
        job.addOutput(`Extracted components: "${semanticQuery}"`);
      }
    }

    // Filter broad terms
    const broadTerms = ['function', 'const', 'component', 'react', 'var', 'let'];
    const queryTerms = semanticQuery.split(' ').filter(term =>
      term.length > 2 && !broadTerms.includes(term.toLowerCase())
    );

    if (queryTerms.length > 0 && queryTerms.length < semanticQuery.split(' ').length) {
      semanticQuery = queryTerms.join(' ');
      job.addOutput(`Optimized query: "${semanticQuery}"`);
    }

    job.updateProgress(40, `Performing vector search: "${semanticQuery}"`);

    // Perform vector search
    const semanticResults = await queryVectorIndex(semanticQuery, Math.min(topK, 50));

    job.updateProgress(85, `Processing ${semanticResults?.length || 0} results`);

    if (!semanticResults || semanticResults.length === 0) {
      job.addOutput('No vector search results found');
      job.complete({ results: [], count: 0, query: semanticQuery, type: 'vector' });
      return;
    }

    // Format results
    const results = semanticResults.map(r => ({
      file: r.file,
      startLine: r.startLine,
      endLine: r.endLine,
      content: r.content,
      score: r.score || 0.8,
      similarity: r.score || 0.8,
      type: 'vector'
    }));

    job.addOutput(`Vector search found ${results.length} results`);
    job.updateProgress(100, 'Vector search completed');

    job.complete({
      results,
      count: results.length,
      query: semanticQuery,
      type: 'vector',
      searchPath,
      executionTime: job.getDuration()
    });

  } catch (error) {
    job.fail(error);
  }
}

// Job management tools
export const JOB_STATUS_TOOL = {
  name: 'job_status',
  description: 'Check status and progress of async jobs. Returns current state, progress percentage, ETA, warnings, and recent output.',

  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'string',
        description: 'Job ID to check status for'
      },
      include_output: {
        type: 'boolean',
        description: 'Include recent output messages (default: true)',
        default: true
      },
      include_warnings: {
        type: 'boolean',
        description: 'Include warnings (default: true)',
        default: true
      }
    },
    required: ['job_id']
  },

  handler: async ({ job_id, include_output = true, include_warnings = true }) => {
    const consoleRestore = suppressConsoleOutput();

    try {
      const job = jobManager.getJob(job_id);
      if (!job) {
        return {
          content: [{ type: 'text', text: `❌ Job not found: ${job_id}\n\nUse job_list to see all available jobs.` }],
          isError: true
        };
      }

      const jobDetails = job.getDetailedOutput();

      let response = `📋 JOB STATUS: ${job.name}

BASIC INFO:
• Job ID: ${job.id}
• Type: ${job.type}
• Status: ${job.status.toUpperCase()}
• Progress: ${job.progress}%
• Created: ${new Date(job.createdAt).toLocaleString()}
`;

      if (job.startedAt) {
        response += `• Started: ${new Date(job.startedAt).toLocaleString()}\n`;
      }
      if (job.completedAt) {
        response += `• Completed: ${new Date(job.completedAt).toLocaleString()}\n`;
      }
      if (job.getDuration() > 0) {
        response += `• Duration: ${Math.round(job.getDuration() / 1000)}s\n`;
      }
      if (job.getETA()) {
        response += `• ETA: ${Math.round(job.getETA() / 1000)}s\n`;
      }

      if (include_output && job.output.length > 0) {
        response += `\n📝 RECENT OUTPUT (${job.output.length} messages):\n`;
        job.output.slice(-5).forEach((entry, i) => {
          response += `${i + 1}. [${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}\n`;
        });
      }

      if (include_warnings && job.warnings.length > 0) {
        response += `\n⚠️  WARNINGS (${job.warnings.length}):\n`;
        job.warnings.slice(-3).forEach((warning, i) => {
          response += `${i + 1}. [${new Date(warning.timestamp).toLocaleTimeString()}] ${warning.message}\n`;
        });
      }

      if (job.error) {
        response += `\n❌ ERROR: ${job.error}\n`;
      }

      if (job.status === JobStatus.COMPLETED && job.result) {
        response += `\n✅ RESULTS:\n• Found ${job.result.count || 0} results\n• Query: "${job.result.query}"\n• Type: ${job.result.type}\n• Execution time: ${Math.round((job.result.executionTime || 0) / 1000)}s`;
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
        isError: false
      };

    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Failed to get job status: ${error.message}` }],
        isError: true
      };
    } finally {
      consoleRestore.restore();
    }
  }
};

export const JOB_RESULTS_TOOL = {
  name: 'job_results',
  description: 'Get completed job results with pagination. Page 1 shows latest/most relevant results. Supports semantic result filtering.',

  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'string',
        description: 'Job ID to get results for'
      },
      page: {
        type: 'number',
        description: 'Page number (1 = latest/most relevant results)',
        default: 1,
        minimum: 1
      },
      page_size: {
        type: 'number',
        description: 'Results per page (default: 10)',
        default: 10,
        minimum: 1,
        maximum: 50
      },
      min_similarity: {
        type: 'number',
        description: 'Minimum similarity score (0.0-1.0, default: 0.0)',
        default: 0.0,
        minimum: 0.0,
        maximum: 1.0
      }
    },
    required: ['job_id']
  },

  handler: async ({ job_id, page = 1, page_size = 10, min_similarity = 0.0 }) => {
    const consoleRestore = suppressConsoleOutput();

    try {
      const job = jobManager.getJob(job_id);
      if (!job) {
        return {
          content: [{ type: 'text', text: `❌ Job not found: ${job_id}` }],
          isError: true
        };
      }

      if (job.status !== JobStatus.COMPLETED) {
        return {
          content: [{
            type: 'text',
            text: `⏳ Job not yet completed. Status: ${job.status.toUpperCase()}

Use job_status to check progress. Current progress: ${job.progress}%`
          }],
          isError: false
        };
      }

      const results = job.result?.results || [];

      // Filter by similarity if specified
      const filteredResults = results.filter(r =>
        (r.similarity || r.score || 0) >= min_similarity
      );

      // Pagination
      const startIndex = (page - 1) * page_size;
      const endIndex = startIndex + page_size;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);

      let response = `📊 RESULTS: ${job.name}

QUERY: "${job.result.query}"
TOTAL RESULTS: ${filteredResults.length} (showing ${startIndex + 1}-${Math.min(endIndex, filteredResults.length)})
PAGE: ${page} of ${Math.ceil(filteredResults.length / page_size) || 1}
MIN SIMILARITY: ${min_similarity}

`;

      if (paginatedResults.length === 0) {
        response += 'No results match the specified criteria.\n';
      } else {
        paginatedResults.forEach((result, index) => {
          const globalIndex = startIndex + index + 1;
          response += `\n--- Result ${globalIndex} ---\n`;
          response += `📁 File: ${result.file}\n`;
          response += `📍 Lines: ${result.startLine}-${result.endLine}\n`;
          response += `🎯 Similarity: ${(result.similarity || result.score || 0).toFixed(3)}\n`;
          response += `📝 Content:\n${result.content.trim()}\n`;
        });
      }

      if (filteredResults.length > page_size) {
        response += `\n\n📄 PAGES: Use page parameter (1-${Math.ceil(filteredResults.length / page_size)})`;
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
        isError: false
      };

    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Failed to get job results: ${error.message}` }],
        isError: true
      };
    } finally {
      consoleRestore.restore();
    }
  }
};

export const JOB_LIST_TOOL = {
  name: 'job_list',
  description: 'List all async jobs with filtering options. Shows job status, progress, and basic info.',

  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'],
        description: 'Filter by job status (optional)'
      },
      type: {
        type: 'string',
        enum: ['vector_search'],
        description: 'Filter by job type (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum jobs to return (default: 20)',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    }
  },

  handler: async ({ status, type, limit = 20 }) => {
    const consoleRestore = suppressConsoleOutput();

    try {
      let jobs = jobManager.getAllJobs();

      // Apply filters
      if (status) {
        jobs = jobs.filter(job => job.status === status);
      }
      if (type) {
        jobs = jobs.filter(job => job.type === type);
      }

      // Sort by creation time (newest first)
      jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply limit
      jobs = jobs.slice(0, limit);

      const stats = jobManager.getStats();

      let response = `📋 JOB LIST (${jobs.length} shown)

OVERALL STATS:
• Total Jobs: ${stats.total}
• Running: ${stats.running}
• Completed: ${stats.completed}
• Failed: ${stats.failed}
• Cancelled: ${stats.cancelled}

`;

      if (jobs.length === 0) {
        response += 'No jobs match the specified criteria.\n';
      } else {
        jobs.forEach((job, index) => {
          response += `\n${index + 1}. ${job.name}\n`;
          response += `   ID: ${job.id}\n`;
          response += `   Status: ${job.status.toUpperCase()}\n`;
          response += `   Progress: ${job.progress}%\n`;
          response += `   Created: ${new Date(job.createdAt).toLocaleString()}\n`;
          if (job.startedAt) {
            response += `   Duration: ${Math.round(job.getDuration() / 1000)}s\n`;
          }
          if (job.getETA()) {
            response += `   ETA: ${Math.round(job.getETA() / 1000)}s\n`;
          }
        });
      }

      return {
        content: [{ type: 'text', text: response.trim() }],
        isError: false
      };

    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Failed to list jobs: ${error.message}` }],
        isError: true
      };
    } finally {
      consoleRestore.restore();
    }
  }
};

export const JOB_CANCEL_TOOL = {
  name: 'job_cancel',
  description: 'Cancel pending or running async jobs. Releases resources and stops execution.',

  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'string',
        description: 'Job ID to cancel'
      }
    },
    required: ['job_id']
  },

  handler: async ({ job_id }) => {
    const consoleRestore = suppressConsoleOutput();

    try {
      const job = jobManager.getJob(job_id);
      if (!job) {
        return {
          content: [{ type: 'text', text: `❌ Job not found: ${job_id}` }],
          isError: true
        };
      }

      if (![JobStatus.PENDING, JobStatus.RUNNING].includes(job.status)) {
        return {
          content: [{
            type: 'text',
            text: `⚠️  Job cannot be cancelled. Status: ${job.status.toUpperCase()}

Only pending and running jobs can be cancelled.`
          }],
          isError: false
        };
      }

      const success = jobManager.cancelJob(job_id);

      if (success) {
        return {
          content: [{
            type: 'text',
            text: `✅ Job cancelled successfully: ${job_id}

JOB DETAILS:
• Name: ${job.name}
• Status: ${job.status.toUpperCase()}
• Duration: ${Math.round(job.getDuration() / 1000)}s
• Progress: ${job.progress}%

Resources have been released and job execution stopped.`
          }],
          isError: false
        };
      } else {
        return {
          content: [{ type: 'text', text: `❌ Failed to cancel job: ${job_id}` }],
          isError: true
        };
      }

    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Failed to cancel job: ${error.message}` }],
        isError: true
      };
    } finally {
      consoleRestore.restore();
    }
  }
};

export { jobManager };
export default ASYNC_SEARCH_TOOL;