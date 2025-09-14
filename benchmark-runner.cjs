#!/usr/bin/env node

/**
 * A/B Benchmark Runner with Enhanced MCP Integration
 *
 * This runner enhances the basic framework with:
 * - Direct MCP tool integration testing
 * - Better turn counting and token tracking
 * - Real-time performance monitoring
 * - Enhanced error handling and recovery
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const { performance } = require('perf_hooks');

class EnhancedBenchmarkRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {},
      tasks: [],
      summary: {},
      rawLogs: []
    };
    this.testDir = path.join(process.cwd(), 'benchmark-tests');
    this.logDir = path.join(process.cwd(), 'benchmark-logs');
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced A/B Benchmark Runner');

    // Create directories
    await fs.mkdir(this.testDir, { recursive: true });
    await fs.mkdir(this.logDir, { recursive: true });

    // Get detailed environment info
    this.results.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      claudeVersion: this.getClaudeVersion(),
      glootieVersion: this.getGlootieVersion(),
      mcpServers: this.getMcpServers(),
      systemMemory: this.getSystemMemory(),
      startTime: new Date().toISOString()
    };

    console.log('Environment:', JSON.stringify(this.results.environment, null, 2));
  }

  getClaudeVersion() {
    try {
      return execSync('claude --version', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getGlootieVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      return pkg.version;
    } catch {
      return 'unknown';
    }
  }

  getMcpServers() {
    try {
      const configPath = path.join(process.env.HOME, '.config', 'claude', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.mcpServers || {};
      }
      return {};
    } catch {
      return {};
    }
  }

  getSystemMemory() {
    try {
      const memInfo = execSync('free -m', { encoding: 'utf8' });
      const lines = memInfo.split('\n');
      const memLine = lines.find(line => line.startsWith('Mem:'));
      if (memLine) {
        const parts = memLine.split(/\s+/);
        return {
          total: parseInt(parts[1]),
          used: parseInt(parts[2]),
          free: parseInt(parts[3]),
          available: parseInt(parts[6])
        };
      }
    } catch {
      return {};
    }
    return {};
  }

  async cleanup() {
    console.log('🧹 Comprehensive cleanup...');
    const cleanupTasks = [
      fs.rm(this.testDir, { recursive: true, force: true }),
      fs.rm(this.logDir, { recursive: true, force: true }),
      fs.rm(path.join(process.cwd(), 'benchmark-results'), { recursive: true, force: true })
    ];

    await Promise.allSettled(cleanupTasks);
    console.log('✅ Cleanup completed');
  }

  async runTask(taskConfig, useGlootie = true) {
    const taskId = `${taskConfig.id}_${useGlootie ? 'with' : 'without'}_glootie`;
    const taskDir = path.join(this.testDir, taskId);
    const logFile = path.join(this.logDir, `${taskId}.log`);

    await fs.mkdir(taskDir, { recursive: true });

    // Create comprehensive boilerplate
    await this.createEnhancedBoilerplate(taskDir, taskConfig);

    const startTime = performance.now();
    const sessionData = {
      taskId,
      taskName: taskConfig.name,
      useGlootie,
      startTime: startTime,
      turns: [],
      tokens: { input: 0, output: 0 },
      errors: [],
      mcpToolUsage: useGlootie ? [] : null,
      success: false
    };

    try {
      console.log(`🔍 Running ${taskConfig.name} ${useGlootie ? 'WITH' : 'WITHOUT'} Glootie...`);

      // Execute with enhanced monitoring
      const result = await this.executeWithMonitoring(taskConfig, taskDir, logFile, useGlootie, sessionData);

      // Parse detailed metrics
      await this.parseDetailedMetrics(logFile, sessionData);

      sessionData.success = true;
      sessionData.duration = Number(((performance.now() - startTime) / 1000).toFixed(2));

    } catch (error) {
      sessionData.success = false;
      sessionData.error = error.message;
      sessionData.duration = Number(((performance.now() - startTime) / 1000).toFixed(2));
      console.error(`❌ Error in ${taskConfig.name}:`, error.message);
    }

    return sessionData;
  }

  async executeWithMonitoring(taskConfig, taskDir, logFile, useGlootie, sessionData) {
    return new Promise((resolve, reject) => {
      const prompt = this.enhancePrompt(taskConfig.prompt, useGlootie);
      const command = useGlootie
        ? `claude --with-mcp "${prompt}"`
        : `claude "${prompt}"`;

      const child = spawn('claude', useGlootie ? ['--with-mcp', prompt] : [prompt], {
        cwd: taskDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000 // 5 minutes
      });

      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      child.stdout.on('data', (data) => {
        const output = data.toString();
        logStream.write(`[STDOUT] ${output}\n`);
        this.analyzeOutput(output, sessionData);
      });

      child.stderr.on('data', (data) => {
        const error = data.toString();
        logStream.write(`[STDERR] ${error}\n`);
        sessionData.errors.push(error);
      });

      child.on('close', (code) => {
        logStream.end();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        logStream.end();
        reject(error);
      });
    });
  }

  enhancePrompt(basePrompt, useGlootie) {
    if (useGlootie) {
      return `${basePrompt}

IMPORTANT: Use MCP Glootie tools for all operations:
- Use searchcode for semantic code discovery
- Use executebash/executenodejs for testing
- Use astgrep_search for pattern matching
- Use batch_execute for coordinated workflows
- Use sequentialthinking for documenting process
- NEVER create test files - use MCP tools instead

Mandatory WFGY approach:
- What For: Define specific requirements
- Get: Use appropriate MCP tools
- Yield: Extract maximum insight value`;
    }
    return basePrompt;
  }

  analyzeOutput(output, sessionData) {
    // Track turn indicators
    if (output.includes('Turn') || output.includes('Step')) {
      sessionData.turns.push({
        timestamp: Date.now(),
        type: 'turn'
      });
    }

    // Track MCP tool usage
    if (sessionData.mcpToolUsage !== null) {
      const toolPatterns = [
        /searchcode/g,
        /executebash/g,
        /executenodejs/g,
        /astgrep_search/g,
        /batch_execute/g,
        /sequentialthinking/g
      ];

      toolPatterns.forEach(pattern => {
        const matches = output.match(pattern);
        if (matches) {
          sessionData.mcpToolUsage.push({
            tool: pattern.source,
            count: matches.length,
            timestamp: Date.now()
          });
        }
      });
    }

    // Estimate token usage
    const tokenEstimate = Math.ceil(output.length / 4); // Rough estimate
    sessionData.tokens.input += tokenEstimate;
  }

  async parseDetailedMetrics(logFile, sessionData) {
    try {
      const logContent = await fs.readFile(logFile, 'utf8');

      // More sophisticated parsing can be added here
      // For now, we'll count unique MCP tool usages
      if (sessionData.mcpToolUsage) {
        const uniqueTools = new Set(sessionData.mcpToolUsage.map(t => t.tool));
        sessionData.uniqueMcpTools = uniqueTools.size;
        sessionData.totalMcpCalls = sessionData.mcpToolUsage.reduce((sum, t) => sum + t.count, 0);
      }

      // Calculate turns more accurately
      sessionData.turnCount = sessionData.turns.length || 1;

    } catch (error) {
      console.warn('⚠️ Could not parse detailed metrics:', error.message);
    }
  }

  async createEnhancedBoilerplate(taskDir, config) {
    await fs.mkdir(path.join(taskDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(taskDir, 'tests'), { recursive: true });

    switch (config.category) {
      case 'react':
        await this.createEnhancedReactBoilerplate(taskDir, config);
        break;
      case 'node':
        await this.createEnhancedNodeBoilerplate(taskDir, config);
        break;
      case 'algorithm':
        await this.createEnhancedAlgorithmBoilerplate(taskDir, config);
        break;
      case 'api':
        await this.createEnhancedApiBoilerplate(taskDir, config);
        break;
      default:
        await this.createEnhancedGenericBoilerplate(taskDir, config);
    }

    // Create task documentation
    await this.createTaskDocumentation(taskDir, config);
  }

  async createEnhancedReactBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'jest',
        'test:watch': 'jest --watch',
        start: 'vite',
        build: 'vite build'
      },
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        '@testing-library/react': '^13.4.0',
        '@testing-library/jest-dom': '^5.16.0',
        'jest': '^29.5.0',
        'jest-environment-jsdom': '^29.5.0',
        'vite': '^4.3.0',
        'typescript': '^5.0.0'
      }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const viteConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom'
  }
})
`;

    await fs.writeFile(path.join(taskDir, 'vite.config.js'), viteConfig);

    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }]
    };

    await fs.writeFile(path.join(taskDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

    const appTsx = `
import React, { useState } from 'react'

interface CounterProps {
  initialValue?: number
}

const Counter: React.FC<CounterProps> = ({ initialValue = 0 }) => {
  const [count, setCount] = useState(initialValue)

  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)
  const reset = () => setCount(initialValue)

  return (
    <div className="counter-container">
      <h2>Counter: {count}</h2>
      <div className="button-group">
        <button onClick={increment}>+</button>
        <button onClick={decrement}>-</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

export default Counter
`;

    await fs.writeFile(path.join(taskDir, 'src', 'Counter.tsx'), appTsx);

    const testFile = `
import { render, screen, fireEvent } from '@testing-library/react'
import Counter from '../Counter'

describe('Counter Component', () => {
  test('renders with initial value', () => {
    render(<Counter initialValue={5} />)
    expect(screen.getByText('Counter: 5')).toBeInTheDocument()
  })

  test('increments counter', () => {
    render(<Counter />)
    const incrementButton = screen.getByText('+')
    fireEvent.click(incrementButton)
    expect(screen.getByText('Counter: 1')).toBeInTheDocument()
  })

  test('decrements counter', () => {
    render(<Counter initialValue={3} />)
    const decrementButton = screen.getByText('-')
    fireEvent.click(decrementButton)
    expect(screen.getByText('Counter: 2')).toBeInTheDocument()
  })

  test('resets counter', () => {
    render(<Counter initialValue={5} />)
    const incrementButton = screen.getByText('+')
    const resetButton = screen.getByText('Reset')

    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)
    fireEvent.click(resetButton)

    expect(screen.getByText('Counter: 5')).toBeInTheDocument()
  })
})
`;

    await fs.writeFile(path.join(taskDir, 'tests', 'Counter.test.tsx'), testFile);
  }

  async createEnhancedNodeBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'jest',
        'test:watch': 'jest --watch',
        start: 'node index.js',
        dev: 'nodemon index.js'
      },
      dependencies: {
        'express': '^4.18.0',
        'cors': '^2.8.5',
        'helmet': '^6.0.0',
        'dotenv': '^16.0.0'
      },
      devDependencies: {
        '@types/node': '^18.0.0',
        '@types/express': '^4.17.0',
        '@types/cors': '^2.8.0',
        'jest': '^29.5.0',
        'nodemon': '^2.0.0',
        'supertest': '^6.3.0'
      }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const serverJs = `
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`)
})

export default app
`;

    await fs.writeFile(path.join(taskDir, 'server.js'), serverJs);

    const testFile = `
import request from 'supertest'
import app from '../server.js'

describe('Server Health Check', () => {
  test('GET /health returns 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body.status).toBe('healthy')
    expect(response.body.timestamp).toBeDefined()
  })

  test('GET /unknown route returns 404', async () => {
    await request(app)
      .get('/unknown')
      .expect(404)
  })
})
`;

    await fs.writeFile(path.join(taskDir, 'tests', 'server.test.js'), testFile);

    const envExample = `
PORT=3000
NODE_ENV=development
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
`;

    await fs.writeFile(path.join(taskDir, '.env.example'), envExample);
  }

  async createEnhancedAlgorithmBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        benchmark: 'node benchmark.js'
      },
      devDependencies: {
        '@types/node': '^18.0.0',
        'jest': '^29.5.0',
        'benchmark': '^2.1.0'
      }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const algorithmJs = `
/**
 * ${config.name}
 * ${config.description}
 */

class Solution {
  constructor() {
    this.operations = 0
    this.comparisons = 0
  }

  // Implement your algorithm here
  solve(input) {
    this.resetMetrics()
    // Implementation goes here
    return null
  }

  resetMetrics() {
    this.operations = 0
    this.comparisons = 0
  }

  getMetrics() {
    return {
      operations: this.operations,
      comparisons: this.comparisons
    }
  }
}

export default Solution
`;

    await fs.writeFile(path.join(taskDir, 'src', 'solution.js'), algorithmJs);

    const testFile = `
import Solution from '../src/solution.js'

describe('${config.name}', () => {
  let solution

  beforeEach(() => {
    solution = new Solution()
  })

  test('should handle basic case', () => {
    const input = /* your test input */
    const result = solution.solve(input)
    expect(result).toBeDefined()
  })

  test('should handle edge cases', () => {
    // Edge case tests
  })

  test('should track performance metrics', () => {
    const input = /* your test input */
    solution.solve(input)
    const metrics = solution.getMetrics()
    expect(metrics.operations).toBeGreaterThanOrEqual(0)
    expect(metrics.comparisons).toBeGreaterThanOrEqual(0)
  })
})
`;

    await fs.writeFile(path.join(taskDir, 'tests', 'solution.test.js'), testFile);

    const benchmarkJs = `
import Solution from './src/solution.js'
import { performance } from 'perf_hooks'

function runBenchmark() {
  const solution = new Solution()
  const iterations = 1000

  const testCases = [
    // Add your test cases here
  ]

  console.log('Running benchmarks...')

  testCases.forEach((testCase, index) => {
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      solution.solve(testCase.input)
    }

    const end = performance.now()
    const avgTime = (end - start) / iterations

    console.log(\`Test Case \${index + 1}: \${avgTime.toFixed(4)}ms average\`)

    const metrics = solution.getMetrics()
    console.log(\`  Operations: \${metrics.operations}\`)
    console.log(\`  Comparisons: \${metrics.comparisons}\`)
  })
}

runBenchmark()
`;

    await fs.writeFile(path.join(taskDir, 'benchmark.js'), benchmarkJs);
  }

  async createEnhancedApiBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'jest',
        start: 'node server.js',
        dev: 'nodemon server.js',
        'test:api': 'jest --testNamePattern="API"'
      },
      dependencies: {
        'express': '^4.18.0',
        'ws': '^8.13.0',
        'cors': '^2.8.5',
        'helmet': '^6.0.0'
      },
      devDependencies: {
        '@types/node': '^18.0.0',
        '@types/express': '^4.17.0',
        '@types/ws': '^8.5.0',
        'jest': '^29.5.0',
        'nodemon': '^2.0.0',
        'supertest': '^6.3.0'
      }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const serverJs = `
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection')

  ws.on('message', (message) => {
    console.log('Received:', message.toString())

    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'message',
          data: message.toString(),
          timestamp: new Date().toISOString()
        }))
      }
    })
  })

  ws.on('close', () => {
    console.log('WebSocket connection closed')
  })
})

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    connections: wss.clients.size,
    timestamp: new Date().toISOString()
  })
})

app.post('/api/broadcast', (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'broadcast',
        data: message,
        timestamp: new Date().toISOString()
      }))
    }
  })

  res.json({ success: true, message: 'Broadcast sent' })
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

server.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`)
  console.log(\`📡 WebSocket server ready\`)
})

export default app
`;

    await fs.writeFile(path.join(taskDir, 'server.js'), serverJs);

    const testFile = `
import request from 'supertest'
import app from '../server.js'
import { WebSocket } from 'ws'

describe('WebSocket API Tests', () => {
  test('GET /api/status returns server status', async () => {
    const response = await request(app)
      .get('/api/status')
      .expect(200)

    expect(response.body.status).toBe('online')
    expect(response.body.connections).toBeDefined()
  })

  test('POST /api/broadcast requires message', async () => {
    const response = await request(app)
      .post('/api/broadcast')
      .send({})
      .expect(400)

    expect(response.body.error).toBe('Message is required')
  })

  test('WebSocket connection and messaging', (done) => {
    const ws = new WebSocket('ws://localhost:3000')

    ws.on('open', () => {
      ws.send('Hello from test')
    })

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())
      if (message.type === 'message') {
        expect(message.data).toBe('Hello from test')
        expect(message.timestamp).toBeDefined()
        ws.close()
        done()
      }
    })
  })
})
`;

    await fs.writeFile(path.join(taskDir, 'tests', 'api.test.js'), testFile);
  }

  async createEnhancedGenericBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'jest',
        start: 'node index.js'
      },
      devDependencies: {
        '@types/node': '^18.0.0',
        'jest': '^29.5.0'
      }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const indexJs = `
/**
 * ${config.name}
 * ${config.description}
 */

class GenericSolution {
  constructor() {
    this.metrics = {
      operations: 0,
      startTime: null,
      endTime: null
    }
  }

  start() {
    this.metrics.startTime = Date.now()
    this.metrics.operations = 0
  }

  solve(input) {
    this.start()

    // Implementation goes here
    this.metrics.operations++

    this.metrics.endTime = Date.now()
    return {
      result: null,
      duration: this.metrics.endTime - this.metrics.startTime,
      operations: this.metrics.operations
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      duration: this.metrics.endTime - this.metrics.startTime
    }
  }
}

// Export for testing
export default GenericSolution

// CLI interface
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const solution = new GenericSolution()
  const result = solution.solve(process.argv[2] || 'default input')
  console.log('Result:', result)
}
`;

    await fs.writeFile(path.join(taskDir, 'index.js'), indexJs);

    const testFile = `
import GenericSolution from '../index.js'

describe('${config.name}', () => {
  let solution

  beforeEach(() => {
    solution = new GenericSolution()
  })

  test('should solve basic input', () => {
    const result = solution.solve('test input')
    expect(result).toBeDefined()
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.operations).toBeGreaterThan(0)
  })

  test('should track metrics correctly', () => {
    const result1 = solution.solve('input1')
    const result2 = solution.solve('input2')

    expect(result1.operations).toBe(1)
    expect(result2.operations).toBe(1)
  })

  test('should handle empty input', () => {
    const result = solution.solve('')
    expect(result).toBeDefined()
  })
})
`;

    await fs.writeFile(path.join(taskDir, 'tests', 'index.test.js'), testFile);
  }

  async createTaskDocumentation(taskDir, config) {
    const readme = `# ${config.name}

## Description
${config.description}

## Task Requirements
${this.generateTaskRequirements(config)}

## Success Criteria
- [ ] Implementation meets all requirements
- [ ] Tests pass successfully
- [ ] Code follows best practices
- [ ] Performance is acceptable
- [ ] Error handling is implemented

## Implementation Notes
- Category: ${config.category}
- Complexity: ${this.estimateComplexity(config)}
- Estimated time: ${this.estimateTime(config)}

## Files Structure
- \`src/\` - Source code
- \`tests/\` - Test files
- \`package.json\` - Dependencies and scripts

---

*Generated by MCP Glootie Benchmark Framework*
`;

    await fs.writeFile(path.join(taskDir, 'README.md'), readme);
  }

  generateTaskRequirements(config) {
    switch (config.category) {
      case 'react':
        return `
- React component with TypeScript
- Proper state management
- Unit tests with React Testing Library
- Responsive design considerations
- Accessibility features`;
      case 'node':
        return `
- Express.js server implementation
- RESTful API design
- Error handling and validation
- Security considerations
- Test coverage`;
      case 'algorithm':
        return `
- Efficient algorithm implementation
- Time and space complexity analysis
- Edge case handling
- Performance optimization
- Comprehensive testing`;
      case 'api':
        return `
- WebSocket server implementation
- Real-time messaging capabilities
- API endpoint design
- Connection management
- Error handling`;
      default:
        return `
- Complete implementation
- Proper error handling
- Test coverage
- Documentation
- Best practices`;
    }
  }

  estimateComplexity(config) {
    const complexTasks = ['react_dashboard', 'websocket_server', 'cache_system'];
    const mediumTasks = ['node_api', 'auth_middleware', 'react_form'];

    if (complexTasks.includes(config.id)) return 'High';
    if (mediumTasks.includes(config.id)) return 'Medium';
    return 'Low';
  }

  estimateTime(config) {
    const complexity = this.estimateComplexity(config);
    switch (complexity) {
      case 'High': return '30-45 minutes';
      case 'Medium': return '15-30 minutes';
      default: return '5-15 minutes';
    }
  }

  async runAllTasks() {
    console.log('🏃‍♂️ Running enhanced benchmark tasks...');

    for (const task of this.tasks) {
      console.log(`\n📋 Task: ${task.name} (${task.category}) - ${this.estimateComplexity(task)} complexity`);

      // Run without Glootie
      console.log('  🔄 Running WITHOUT Glootie...');
      const withoutGlootie = await this.runTask(task, false);
      this.results.tasks.push(withoutGlootie);

      // Run with Glootie
      console.log('  🚀 Running WITH Glootie...');
      const withGlootie = await this.runTask(task, true);
      this.results.tasks.push(withGlootie);

      // Calculate and display immediate comparison
      this.displayTaskComparison(task, withoutGlootie, withGlootie);
    }
  }

  displayTaskComparison(task, withoutGlootie, withGlootie) {
    const durationImprovement = withoutGlootie.duration > 0
      ? ((withoutGlootie.duration - withGlootie.duration) / withoutGlootie.duration * 100).toFixed(1)
      : 0;

    const turnsImprovement = withoutGlootie.turnCount > 0
      ? ((withoutGlootie.turnCount - withGlootie.turnCount) / withoutGlootie.turnCount * 100).toFixed(1)
      : 0;

    console.log(`  ✅ ${task.name} completed:`);
    console.log(`     Duration: ${durationImprovement}% improvement (${withoutGlootie.duration}s → ${withGlootie.duration}s)`);
    console.log(`     Turns: ${turnsImprovement}% reduction (${withoutGlootie.turnCount} → ${withGlootie.turnCount})`);
    console.log(`     Success: ${withGlootie.success ? '✅' : '❌'} vs ${withoutGlootie.success ? '✅' : '❌'}`);

    if (withGlootie.uniqueMcpTools > 0) {
      console.log(`     MCP Tools: ${withGlootie.uniqueMcpTools} unique, ${withGlootie.totalMcpCalls} total calls`);
    }
  }

  generateSummary() {
    console.log('📊 Generating enhanced summary...');

    const withGlootie = this.results.tasks.filter(t => t.useGlootie);
    const withoutGlootie = this.results.tasks.filter(t => !t.useGlootie);

    this.results.summary = {
      totalTasks: this.tasks.length,
      avgDurationWithGlootie: this.calculateAverage(withGlootie, 'duration'),
      avgDurationWithoutGlootie: this.calculateAverage(withoutGlootie, 'duration'),
      avgTurnsWithGlootie: this.calculateAverage(withGlootie, 'turnCount'),
      avgTurnsWithoutGlootie: this.calculateAverage(withoutGlootie, 'turnCount'),
      avgTokensWithGlootie: this.calculateAverage(withGlootie, 'tokens.input'),
      avgTokensWithoutGlootie: this.calculateAverage(withoutGlootie, 'tokens.input'),
      successRateWithGlootie: this.calculateSuccessRate(withGlootie),
      successRateWithoutGlootie: this.calculateSuccessRate(withoutGlootie),
      avgMcpToolsUsed: this.calculateAverage(withGlootie, 'uniqueMcpTools'),
      avgMcpCalls: this.calculateAverage(withGlootie, 'totalMcpCalls'),
      errorRateWithGlootie: this.calculateErrorRate(withGlootie),
      errorRateWithoutGlootie: this.calculateErrorRate(withoutGlootie)
    };

    // Calculate improvements
    this.results.summary.improvements = {
      duration: this.calculateImprovement(
        this.results.summary.avgDurationWithoutGlootie,
        this.results.summary.avgDurationWithGlootie
      ),
      turns: this.calculateImprovement(
        this.results.summary.avgTurnsWithoutGlootie,
        this.results.summary.avgTurnsWithGlootie
      ),
      tokens: this.calculateImprovement(
        this.results.summary.avgTokensWithoutGlootie,
        this.results.summary.avgTokensWithGlootie
      ),
      successRate: this.calculateImprovement(
        this.results.summary.successRateWithoutGlootie,
        this.results.summary.successRateWithGlootie,
        false
      ),
      errorRate: this.calculateImprovement(
        this.results.summary.errorRateWithoutGlootie,
        this.results.summary.errorRateWithGlootie,
        false
      )
    };
  }

  calculateErrorRate(tasks) {
    if (tasks.length === 0) return 0;
    const errorCount = tasks.filter(t => t.errors && t.errors.length > 0).length;
    return Number((errorCount / tasks.length * 100).toFixed(1));
  }

  calculateAverage(tasks, property) {
    const validTasks = tasks.filter(t => {
      const value = this.getNestedProperty(t, property);
      return value !== undefined && value !== null && value !== 0;
    });

    if (validTasks.length === 0) return 0;

    const sum = validTasks.reduce((acc, task) => {
      const value = this.getNestedProperty(task, property);
      return acc + (value || 0);
    }, 0);

    return Number((sum / validTasks.length).toFixed(2));
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  calculateSuccessRate(tasks) {
    if (tasks.length === 0) return 0;
    const successCount = tasks.filter(t => t.success).length;
    return Number((successCount / tasks.length * 100).toFixed(1));
  }

  calculateImprovement(baseline, improved, isPercentage = true) {
    if (baseline === 0) return 0;
    const improvement = ((baseline - improved) / baseline * 100).toFixed(1);
    return isPercentage ? Number(improvement) : improved - baseline;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join(process.cwd(), 'benchmark-results');
    await fs.mkdir(resultsDir, { recursive: true });

    const filename = path.join(resultsDir, `enhanced-benchmark-results-${timestamp}.json`);
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`📁 Results saved to: ${filename}`);

    // Save detailed analysis
    await this.generateEnhancedReport(filename);

    // Save raw logs for further analysis
    await this.saveRawLogs(timestamp);
  }

  async generateEnhancedReport(resultsFile) {
    const reportFile = resultsFile.replace('.json', '-enhanced-report.md');
    const report = this.generateEnhancedMarkdownReport();

    await fs.writeFile(reportFile, report);
    console.log(`📄 Enhanced report saved to: ${reportFile}`);
  }

  generateEnhancedMarkdownReport() {
    const { summary, environment, tasks } = this.results;

    return `# Enhanced MCP Glootie A/B Benchmark Report

## 📊 Executive Summary
- **Testing Date**: ${new Date(this.results.timestamp).toLocaleDateString()}
- **Environment**: Claude ${environment.claudeVersion} on ${environment.platform} (${environment.arch})
- **Glootie Version**: ${environment.glootieVersion}
- **Total Tasks**: ${summary.totalTasks}
- **System Memory**: ${environment.systemMemory?.total || 'Unknown'}MB total

## 🎯 Key Performance Metrics

### Duration Performance
- **Without Glootie**: ${summary.avgDurationWithoutGlootie}s average
- **With Glootie**: ${summary.avgDurationWithGlootie}s average
- **Improvement**: ${summary.improvements.duration}% faster

### Conversation Efficiency
- **Without Glootie**: ${summary.avgTurnsWithoutGlootie} turns average
- **With Glootie**: ${summary.avgTurnsWithGlootie} turns average
- **Improvement**: ${summary.improvements.turns}% reduction

### Token Consumption
- **Without Glootie**: ${summary.avgTokensWithoutGlootie} tokens average
- **With Glootie**: ${summary.avgTokensWithGlootie} tokens average
- **Improvement**: ${summary.improvements.tokens}% reduction

### Reliability Metrics
- **Without Glootie**: ${summary.successRateWithoutGlootie}% success rate
- **With Glootie**: ${summary.successRateWithGlootie}% success rate
- **Improvement**: ${summary.improvements.successRate.toFixed(1)}% improvement

- **Error Rate Reduction**: ${summary.errorRateWithoutGlootie}% → ${summary.errorRateWithGlootie}% (${Math.abs(summary.improvements.errorRate).toFixed(1)}% improvement)

### MCP Tool Usage (With Glootie)
- **Average Tools Used**: ${summary.avgMcpToolsUsed} unique tools per task
- **Average Tool Calls**: ${summary.avgMcpCalls} calls per task

## 📋 Detailed Task Analysis

${tasks.map(task => `
### ${task.taskName} (${task.useGlootie ? 'WITH' : 'WITHOUT'} Glootie)
- **Duration**: ${task.duration}s
- **Turns**: ${task.turnCount || 'N/A'}
- **Tokens**: ${task.tokens?.input || 0}
- **Success**: ${task.success ? '✅' : '❌'}
${task.uniqueMcpTools ? `- **MCP Tools**: ${task.uniqueMcpTools} unique, ${task.totalMcpCalls || 0} calls` : ''}
${task.errors?.length ? `- **Errors**: ${task.errors.length} encountered` : ''}
${task.error ? `- **Failure**: ${task.error}` : ''}
`).join('')}

## 🚀 Performance Analysis

### Key Findings
${this.generateKeyFindings()}

### Tool Usage Patterns
${this.generateToolUsageAnalysis()}

### Task-Specific Insights
${this.generateTaskSpecificInsights()}

## 🔧 Recommendations for v2.13.0

Based on the benchmark results, the following improvements are recommended:

${this.generateEnhancedRecommendations()}

## 📈 Technical Details

### Environment Configuration
\`\`\`json
${JSON.stringify(environment, null, 2)}
\`\`\`

### Raw Metrics
\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\`

---

*Enhanced report generated by MCP Glootie A/B Benchmark Framework v2.12.0*
`;
  }

  generateKeyFindings() {
    const findings = [];
    const { improvements } = this.results.summary;

    if (improvements.duration > 25) {
      findings.push("- **Significant speed improvement**: Glootie provides substantial performance benefits");
    }

    if (improvements.turns > 40) {
      findings.push("- **Excellent turn reduction**: Conversation efficiency is dramatically improved");
    }

    if (improvements.tokens > 20) {
      findings.push("- **Strong token efficiency**: Better tool usage reduces token consumption");
    }

    if (improvements.successRate > 10) {
      findings.push("- **Enhanced reliability**: Much higher success rate with MCP tools");
    }

    if (this.results.summary.avgMcpToolsUsed > 3) {
      findings.push("- **Good tool adoption**: Agents effectively utilize multiple MCP tools");
    }

    return findings.join('\n');
  }

  generateToolUsageAnalysis() {
    const withGlootie = this.results.tasks.filter(t => t.useGlootie && t.mcpToolUsage);
    if (withGlootie.length === 0) return '- No MCP tool usage data available';

    const toolUsage = {};
    withGlootie.forEach(task => {
      task.mcpToolUsage?.forEach(tool => {
        if (!toolUsage[tool.tool]) {
          toolUsage[tool.tool] = { count: 0, tasks: 0 };
        }
        toolUsage[tool.tool].count += tool.count;
        toolUsage[tool.tool].tasks++;
      });
    });

    return Object.entries(toolUsage)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([tool, stats]) =>
        `- **${tool}**: Used ${stats.count} times across ${stats.tasks} tasks`
      ).join('\n');
  }

  generateTaskSpecificInsights() {
    const insights = [];

    // Analyze performance by category
    const categories = {};
    this.results.tasks.forEach(task => {
      const taskConfig = this.tasks.find(t => t.id === task.taskId.replace(/_with_glootie|_without_glootie/, ''));
      if (taskConfig) {
        if (!categories[taskConfig.category]) {
          categories[taskConfig.category] = { with: [], without: [] };
        }
        if (task.useGlootie) {
          categories[taskConfig.category].with.push(task);
        } else {
          categories[taskConfig.category].without.push(task);
        }
      }
    });

    Object.entries(categories).forEach(([category, data]) => {
      const avgWith = data.with.reduce((sum, t) => sum + t.duration, 0) / data.with.length;
      const avgWithout = data.without.reduce((sum, t) => sum + t.duration, 0) / data.without.length;
      const improvement = ((avgWithout - avgWith) / avgWithout * 100).toFixed(1);

      insights.push(`- **${category}**: ${improvement}% average improvement`);
    });

    return insights.join('\n');
  }

  generateEnhancedRecommendations() {
    const recs = [];
    const { improvements } = this.results.summary;

    if (improvements.duration > 20) {
      recs.push("- **Scale forceful descriptions**: Apply similar behavioral language to more tools");
      recs.push("- **Enhanced coordination**: Improve batch_execute tool chaining efficiency");
    }

    if (improvements.turns > 30) {
      recs.push("- **WFGY optimization**: Refine framework guidance for better insight extraction");
      recs.push("- **Tool sequencing**: Optimize tool order for maximum turn reduction");
    }

    if (this.results.summary.avgMcpToolsUsed < 4) {
      recs.push("- **Tool discovery**: Improve tool description clarity to encourage broader usage");
    }

    if (this.results.summary.errorRateWithGlootie > 10) {
      recs.push("- **Error handling**: Enhance tool error recovery and guidance");
    }

    recs.push("- **Performance monitoring**: Add real-time metrics collection");
    recs.push("- **A/B testing framework**: Enhance for continuous benchmarking");

    return recs.join('\n');
  }

  async saveRawLogs(timestamp) {
    const logsDir = path.join(process.cwd(), 'benchmark-results', 'raw-logs');
    await fs.mkdir(logsDir, { recursive: true });

    // Copy all log files
    try {
      const logFiles = await fs.readdir(this.logDir);
      for (const file of logFiles) {
        const source = path.join(this.logDir, file);
        const dest = path.join(logsDir, `${timestamp}-${file}`);
        await fs.copyFile(source, dest);
      }
      console.log(`📋 Raw logs saved to: ${logsDir}`);
    } catch (error) {
      console.warn('⚠️ Could not save raw logs:', error.message);
    }
  }

  // Define the 10 benchmark tasks (same as before but with enhanced metadata)
  get tasks() {
    return [
      {
        id: 'react_counter',
        name: 'React Counter Component',
        category: 'react',
        description: 'Create a React counter component with increment/decrement functionality',
        prompt: 'Create a React counter component with increment, decrement, and reset buttons. Include TypeScript types and Jest tests. Use modern React hooks and ensure accessibility.',
        complexity: 'low',
        estimatedTime: '5-10 minutes'
      },
      {
        id: 'node_api',
        name: 'Node.js REST API',
        category: 'node',
        description: 'Build a RESTful API for user management with CRUD operations',
        prompt: 'Build a RESTful API using Express.js for user management with CRUD operations, validation, error handling, and security middleware. Include proper testing.',
        complexity: 'medium',
        estimatedTime: '15-20 minutes'
      },
      {
        id: 'quick_sort',
        name: 'Quick Sort Algorithm',
        category: 'algorithm',
        description: 'Implement quick sort algorithm with optimizations',
        prompt: 'Implement an optimized quick sort algorithm with pivot selection, in-place sorting, and comprehensive test cases. Include performance analysis.',
        complexity: 'medium',
        estimatedTime: '10-15 minutes'
      },
      {
        id: 'auth_middleware',
        name: 'Authentication Middleware',
        category: 'node',
        description: 'Create JWT authentication middleware for Express',
        prompt: 'Create JWT authentication middleware for Express.js with token validation, user extraction, error handling, and security best practices.',
        complexity: 'medium',
        estimatedTime: '15-20 minutes'
      },
      {
        id: 'react_form',
        name: 'React Form with Validation',
        category: 'react',
        description: 'Build a form with real-time validation and submission handling',
        prompt: 'Build a React form component with real-time validation, error messages, submission handling, and accessibility features using modern hooks.',
        complexity: 'medium',
        estimatedTime: '10-15 minutes'
      },
      {
        id: 'binary_search',
        name: 'Binary Search Tree',
        category: 'algorithm',
        description: 'Implement binary search tree with insertion, deletion, and traversal',
        prompt: 'Implement a binary search tree with insertion, deletion, in-order traversal, and search operations. Include time complexity analysis and edge cases.',
        complexity: 'medium',
        estimatedTime: '15-20 minutes'
      },
      {
        id: 'file_processor',
        name: 'File Processing Utility',
        category: 'node',
        description: 'Create a file processing utility with stream handling',
        prompt: 'Create a file processing utility that reads large files using streams, processes data efficiently, and writes output with proper error handling and memory management.',
        complexity: 'medium',
        estimatedTime: '15-25 minutes'
      },
      {
        id: 'react_dashboard',
        name: 'Dashboard Component',
        category: 'react',
        description: 'Build a dashboard with charts and data visualization',
        prompt: 'Build a React dashboard component with charts, data tables, responsive design, and real-time updates using modern libraries and best practices.',
        complexity: 'high',
        estimatedTime: '25-35 minutes'
      },
      {
        id: 'cache_system',
        name: 'LRU Cache Implementation',
        category: 'algorithm',
        description: 'Implement LRU cache with O(1) operations',
        prompt: 'Implement an LRU (Least Recently Used) cache with O(1) get and put operations using hash map and doubly linked list. Include comprehensive testing.',
        complexity: 'high',
        estimatedTime: '20-30 minutes'
      },
      {
        id: 'websocket_server',
        name: 'WebSocket Real-time Server',
        category: 'api',
        description: 'Create WebSocket server with real-time messaging',
        prompt: 'Create a WebSocket server using ws library for real-time messaging with connection management, broadcast functionality, and REST API integration.',
        complexity: 'high',
        estimatedTime: '25-35 minutes'
      }
    ];
  }

  async run() {
    try {
      // Cleanup before starting
      await this.cleanup();

      // Initialize
      await this.initialize();

      // Run all tasks
      await this.runAllTasks();

      // Generate summary
      this.generateSummary();

      // Save results
      await this.saveResults();

      console.log('\n🎉 Enhanced A/B Benchmark completed successfully!');
      console.log('📊 Summary:', JSON.stringify(this.results.summary, null, 2));

    } catch (error) {
      console.error('❌ Enhanced benchmark failed:', error);
    } finally {
      // Cleanup after completion
      await this.cleanup();
    }
  }
}

// CLI entry point
if (require.main === module) {
  const benchmark = new EnhancedBenchmarkRunner();
  benchmark.run().catch(console.error);
}

module.exports = EnhancedBenchmarkRunner;