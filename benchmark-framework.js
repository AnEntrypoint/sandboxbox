#!/usr/bin/env node

/**
 * A/B Benchmark Testing Framework for MCP Glootie
 *
 * This script runs 10 programming tasks comparing Claude Code performance
 * with and without MCP Glootie tools enabled.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const { performance } = require('perf_hooks');

class ABBenchmarkFramework {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {},
      tasks: [],
      summary: {}
    };
    this.testDir = path.join(process.cwd(), 'benchmark-tests');
  }

  async initialize() {
    console.log('🚀 Initializing A/B Benchmark Framework');

    // Get environment info
    this.results.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      claudeVersion: this.getClaudeVersion(),
      glootieVersion: this.getGlootieVersion()
    };

    console.log('Environment:', JSON.stringify(this.results.environment, null, 2));

    // Create test directory
    await fs.mkdir(this.testDir, { recursive: true });
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

  async cleanup() {
    console.log('🧹 Cleaning up test files...');
    try {
      await fs.rm(this.testDir, { recursive: true, force: true });
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }

  async runTask(taskConfig, useGlootie = true) {
    const taskDir = path.join(this.testDir, `${taskConfig.id}_${useGlootie ? 'with' : 'without'}_glootie`);
    await fs.mkdir(taskDir, { recursive: true });

    // Create boilerplate code
    await this.createBoilerplate(taskDir, taskConfig);

    const startTime = performance.now();
    let output = '';
    let error = null;
    let turns = 0;
    let tokens = 0;

    try {
      // Build the command
      const command = useGlootie
        ? `claude --with-mcp "${taskConfig.prompt}"`
        : `claude "${taskConfig.prompt}"`;

      console.log(`Running ${taskConfig.name} ${useGlootie ? 'WITH' : 'WITHOUT'} Glootie...`);

      // Execute the command
      const result = execSync(command, {
        cwd: taskDir,
        encoding: 'utf8',
        timeout: 300000 // 5 minutes timeout
      });

      output = result;

      // Parse metrics from output (this would need customization based on actual output format)
      turns = this.parseTurns(output);
      tokens = this.parseTokens(output);

    } catch (err) {
      error = err.message;
      console.error(`Error in ${taskConfig.name}:`, error);
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // seconds

    return {
      taskId: taskConfig.id,
      taskName: taskConfig.name,
      useGlootie,
      duration: Number(duration.toFixed(2)),
      turns,
      tokens,
      success: !error,
      error,
      output: output.length > 500 ? output.substring(0, 500) + '...' : output
    };
  }

  parseTurns(output) {
    // This is a placeholder - actual parsing would depend on Claude's output format
    const matches = output.match(/Turn\s+\d+/g);
    return matches ? matches.length : 1;
  }

  parseTokens(output) {
    // This is a placeholder - actual parsing would depend on Claude's output format
    const matches = output.match(/(\d+)\s*tokens/);
    return matches ? parseInt(matches[1]) : 0;
  }

  async createBoilerplate(taskDir, taskConfig) {
    switch (taskConfig.category) {
      case 'react':
        await this.createReactBoilerplate(taskDir, taskConfig);
        break;
      case 'node':
        await this.createNodeBoilerplate(taskDir, taskConfig);
        break;
      case 'algorithm':
        await this.createAlgorithmBoilerplate(taskDir, taskConfig);
        break;
      case 'api':
        await this.createApiBoilerplate(taskDir, taskConfig);
        break;
      default:
        await this.createGenericBoilerplate(taskDir, taskConfig);
    }
  }

  async createReactBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      scripts: { test: 'jest' },
      dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      devDependencies: { jest: '^29.0.0', '@testing-library/react': '^13.0.0' }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const appJs = `
import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Benchmark Task: ${config.name}</h1>
      <p>Implement: ${config.description}</p>
    </div>
  );
}

export default App;
`;

    await fs.writeFile(path.join(taskDir, 'src', 'App.js'), appJs);
  }

  async createNodeBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      scripts: { test: 'jest', start: 'node index.js' },
      dependencies: {},
      devDependencies: { jest: '^29.0.0' }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const indexJs = `
/**
 * Benchmark Task: ${config.name}
 * Description: ${config.description}
 */

// Implement your solution here
function main() {
  console.log('Task: ${config.name}');
  console.log('Description: ${config.description}');
}

if (require.main === module) {
  main();
}

module.exports = { main };
`;

    await fs.writeFile(path.join(taskDir, 'index.js'), indexJs);
  }

  async createAlgorithmBoilerplate(taskDir, config) {
    const indexJs = `
/**
 * Benchmark Task: ${config.name}
 * Description: ${config.description}
 */

function solution() {
  // Implement your algorithm here
  // ${config.description}

  return null; // Replace with actual implementation
}

// Test cases
function testSolution() {
  // Add test cases here
  console.log('Testing solution...');
}

if (require.main === module) {
  testSolution();
}

module.exports = { solution, testSolution };
`;

    await fs.writeFile(path.join(taskDir, 'index.js'), indexJs);
  }

  async createApiBoilerplate(taskDir, config) {
    const packageJson = {
      name: `benchmark-${config.id}`,
      version: '1.0.0',
      scripts: { test: 'jest', start: 'node server.js' },
      dependencies: { express: '^4.18.0' },
      devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' }
    };

    await fs.writeFile(path.join(taskDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    const serverJs = `
const express = require('express');
const app = express();

// Benchmark Task: ${config.name}
// Description: ${config.description}

app.use(express.json());

// Implement your API endpoints here
app.get('/', (req, res) => {
  res.json({ message: 'API endpoint for ${config.name}' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;
`;

    await fs.writeFile(path.join(taskDir, 'server.js'), serverJs);
  }

  async createGenericBoilerplate(taskDir, config) {
    const indexJs = `
/**
 * Benchmark Task: ${config.name}
 * Description: ${config.description}
 */

function main() {
  // Implement your solution here
  console.log('Task: ${config.name}');
  console.log('Description: ${config.description}');
}

if (require.main === module) {
  main();
}

module.exports = { main };
`;

    await fs.writeFile(path.join(taskDir, 'index.js'), indexJs);
  }

  async runAllTasks() {
    console.log('🏃‍♂️ Running all benchmark tasks...');

    for (const task of this.tasks) {
      console.log(`\n📋 Task: ${task.name} (${task.category})`);

      // Run without Glootie
      const withoutGlootie = await this.runTask(task, false);
      this.results.tasks.push(withoutGlootie);

      // Run with Glootie
      const withGlootie = await this.runTask(task, true);
      this.results.tasks.push(withGlootie);

      // Calculate immediate comparison
      const improvement = withoutGlootie.duration > 0
        ? ((withoutGlootie.duration - withGlootie.duration) / withoutGlootie.duration * 100).toFixed(1)
        : 0;

      console.log(`✅ ${task.name} completed - Glootie improvement: ${improvement}%`);
    }
  }

  generateSummary() {
    console.log('📊 Generating summary...');

    const withGlootie = this.results.tasks.filter(t => t.useGlootie);
    const withoutGlootie = this.results.tasks.filter(t => !t.useGlootie);

    this.results.summary = {
      totalTasks: this.tasks.length,
      avgDurationWithGlootie: this.calculateAverage(withGlootie, 'duration'),
      avgDurationWithoutGlootie: this.calculateAverage(withoutGlootie, 'duration'),
      avgTurnsWithGlootie: this.calculateAverage(withGlootie, 'turns'),
      avgTurnsWithoutGlootie: this.calculateAverage(withoutGlootie, 'turns'),
      avgTokensWithGlootie: this.calculateAverage(withGlootie, 'tokens'),
      avgTokensWithoutGlootie: this.calculateAverage(withoutGlootie, 'tokens'),
      successRateWithGlootie: this.calculateSuccessRate(withGlootie),
      successRateWithoutGlootie: this.calculateSuccessRate(withoutGlootie)
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
      )
    };
  }

  calculateAverage(tasks, property) {
    const validTasks = tasks.filter(t => t[property] !== undefined && t[property] !== null);
    if (validTasks.length === 0) return 0;
    const sum = validTasks.reduce((acc, task) => acc + task[property], 0);
    return Number((sum / validTasks.length).toFixed(2));
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
    const filename = `benchmark-results-${timestamp}.json`;

    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`📁 Results saved to: ${filename}`);

    // Also save a human-readable report
    await this.generateReport(filename);
  }

  async generateReport(resultsFile) {
    const reportFile = resultsFile.replace('.json', '-report.md');
    const report = this.generateMarkdownReport();

    await fs.writeFile(reportFile, report);
    console.log(`📄 Report saved to: ${reportFile}`);
  }

  generateMarkdownReport() {
    const { summary, environment, tasks } = this.results;

    return `# MCP Glootie A/B Benchmark Report

## 📊 Executive Summary
- **Testing Date**: ${new Date(this.results.timestamp).toLocaleDateString()}
- **Environment**: Claude ${environment.claudeVersion} on ${environment.platform} (${environment.arch})
- **Glootie Version**: ${environment.glootieVersion}
- **Total Tasks**: ${summary.totalTasks}

## 🎯 Key Performance Metrics

### Duration Improvement
- **Without Glootie**: ${summary.avgDurationWithoutGlootie}s average
- **With Glootie**: ${summary.avgDurationWithGlootie}s average
- **Improvement**: ${summary.improvements.duration}% faster

### Turn Reduction
- **Without Glootie**: ${summary.avgTurnsWithoutGlootie} turns average
- **With Glootie**: ${summary.avgTurnsWithGlootie} turns average
- **Improvement**: ${summary.improvements.turns}% reduction

### Token Efficiency
- **Without Glootie**: ${summary.avgTokensWithoutGlootie} tokens average
- **With Glootie**: ${summary.avgTokensWithGlootie} tokens average
- **Improvement**: ${summary.improvements.tokens}% reduction

### Success Rate
- **Without Glootie**: ${summary.successRateWithoutGlootie}% success rate
- **With Glootie**: ${summary.successRateWithGlootie}% success rate
- **Improvement**: ${summary.improvements.successRate.toFixed(1)}% improvement

## 📋 Detailed Task Results

${tasks.map(task => `
### ${task.taskName} (${task.useGlootie ? 'WITH' : 'WITHOUT'} Glootie)
- **Duration**: ${task.duration}s
- **Turns**: ${task.turns}
- **Tokens**: ${task.tokens}
- **Success**: ${task.success ? '✅' : '❌'}
${task.error ? `- **Error**: ${task.error}` : ''}
`).join('')}

## 🚀 Recommendations

Based on the benchmark results, the following improvements are recommended:

${this.generateRecommendations()}

---

*Report generated by MCP Glootie A/B Benchmark Framework*
`;
  }

  generateRecommendations() {
    const recs = [];
    const { improvements } = this.results.summary;

    if (improvements.duration > 20) {
      recs.push("- **Excellent performance improvement**: Glootie shows significant speed gains");
    }

    if (improvements.turns > 30) {
      recs.push("- **Strong turn reduction**: Conversation efficiency is substantially improved");
    }

    if (improvements.tokens > 15) {
      recs.push("- **Good token efficiency**: Reduced token consumption indicates better tool usage");
    }

    if (improvements.successRate > 5) {
      recs.push("- **Improved reliability**: Higher success rate shows better tool integration");
    }

    if (recs.length === 0) {
      recs.push("- **Moderate improvements**: Some benefits observed, consider fine-tuning tool descriptions");
    }

    return recs.join('\n');
  }

  // Define the 10 benchmark tasks
  get tasks() {
    return [
      {
        id: 'react_counter',
        name: 'React Counter Component',
        category: 'react',
        description: 'Create a React counter component with increment/decrement functionality',
        prompt: 'Create a React counter component with increment, decrement, and reset buttons. Include TypeScript types and Jest tests.'
      },
      {
        id: 'node_api',
        name: 'Node.js REST API',
        category: 'node',
        description: 'Build a RESTful API for user management with CRUD operations',
        prompt: 'Build a RESTful API using Express.js for user management with CRUD operations, validation, and error handling.'
      },
      {
        id: 'quick_sort',
        name: 'Quick Sort Algorithm',
        category: 'algorithm',
        description: 'Implement quick sort algorithm with optimizations',
        prompt: 'Implement an optimized quick sort algorithm with pivot selection, in-place sorting, and comprehensive test cases.'
      },
      {
        id: 'auth_middleware',
        name: 'Authentication Middleware',
        category: 'node',
        description: 'Create JWT authentication middleware for Express',
        prompt: 'Create JWT authentication middleware for Express.js with token validation, user extraction, and error handling.'
      },
      {
        id: 'react_form',
        name: 'React Form with Validation',
        category: 'react',
        description: 'Build a form with real-time validation and submission handling',
        prompt: 'Build a React form component with real-time validation, error messages, and submission handling using hooks.'
      },
      {
        id: 'binary_search',
        name: 'Binary Search Tree',
        category: 'algorithm',
        description: 'Implement binary search tree with insertion, deletion, and traversal',
        prompt: 'Implement a binary search tree with insertion, deletion, in-order traversal, and search operations with time complexity analysis.'
      },
      {
        id: 'file_processor',
        name: 'File Processing Utility',
        category: 'node',
        description: 'Create a file processing utility with stream handling',
        prompt: 'Create a file processing utility that reads large files using streams, processes data, and writes output with error handling.'
      },
      {
        id: 'react_dashboard',
        name: 'Dashboard Component',
        category: 'react',
        description: 'Build a dashboard with charts and data visualization',
        prompt: 'Build a React dashboard component with charts, data tables, and responsive design using modern libraries.'
      },
      {
        id: 'cache_system',
        name: 'LRU Cache Implementation',
        category: 'algorithm',
        description: 'Implement LRU cache with O(1) operations',
        prompt: 'Implement an LRU (Least Recently Used) cache with O(1) get and put operations using hash map and doubly linked list.'
      },
      {
        id: 'websocket_server',
        name: 'WebSocket Real-time Server',
        category: 'api',
        description: 'Create WebSocket server with real-time messaging',
        prompt: 'Create a WebSocket server using ws library for real-time messaging with connection management and broadcast functionality.'
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

      console.log('\n🎉 A/B Benchmark completed successfully!');
      console.log('📊 Summary:', JSON.stringify(this.results.summary, null, 2));

    } catch (error) {
      console.error('❌ Benchmark failed:', error);
    } finally {
      // Cleanup after completion
      await this.cleanup();
    }
  }
}

// CLI entry point
if (require.main === module) {
  const benchmark = new ABBenchmarkFramework();
  benchmark.run().catch(console.error);
}

module.exports = ABBenchmarkFramework;