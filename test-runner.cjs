#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const TEST_TIMEOUT = 12000000;
const MAX_RETRIES = 2;
const NPM_TIMEOUT = 1200000;
const RESULTS_DIR = 'results';

const TESTS = [
  {
    name: 'Admin Dashboard Analysis',
    prompt: 'Analyze the shadcn-admin dashboard structure and components. Examine the src/routes/_authenticated/ layout, src/components/ organization, and data visualization with recharts. Look specifically at the dashboard routing structure, navigation patterns using @tanstack/react-router, and authentication flow with Clerk. Identify areas where TypeScript types could be improved and suggest optimizations for the Vite-based admin interface.',
    category: 'component-analysis'
  },
  {
    name: 'New Admin Page Creation',
    prompt: 'Add a new admin page for reports/analytics to the shadcn-admin project. Follow the existing TanStack Router file-based routing patterns in src/routes/_authenticated/, create the page component with proper TypeScript interfaces, include shadcn/ui components (using @tanstack/react-table for data display), implement proper authentication guards, and ensure it fits the existing Vite-based admin dashboard design system with Tailwind CSS 4.',
    category: 'ui-generation'
  },
  {
    name: 'State Management Refactoring',
    prompt: 'Refactor the shadcn-admin state management: 1) Analyze current Zustand store usage in src/stores/ (like auth-store.ts), 2) Extract common state logic into reusable store modules, 3) Improve TypeScript typing using Zod schemas, 4) Add proper error handling for async state operations with React Query, 5) Create a summary of the refactoring improvements.',
    category: 'refactoring'
  },
  {
    name: 'Performance Optimization',
    prompt: 'Optimize the shadcn-admin dashboard performance: 1) Identify performance bottlenecks in @tanstack/react-table components and recharts visualizations, 2) Implement proper memoization for expensive components using React 19 features, 3) Optimize the TanStack Router navigation re-renders, 4) Add virtual scrolling for large data lists, 5) Validate performance improvements with Vite build optimizations.',
    category: 'optimization'
  }
];

const PACKAGE_JSON = {
  name: 'shadcn-admin-test',
  version: '2.1.0',
  private: true,
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'tsc && vite build',
    preview: 'vite preview',
    lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
  },
  dependencies: {
    'react': '^19.1.1',
    'react-dom': '^19.1.1',
    '@radix-ui/react-avatar': '^1.1.1',
    '@radix-ui/react-dropdown-menu': '^2.1.2',
    '@radix-ui/react-label': '^2.1.0',
    '@radix-ui/react-select': '^2.1.2',
    '@radix-ui/react-separator': '^1.1.0',
    '@radix-ui/react-slot': '^1.1.0',
    '@radix-ui/react-switch': '^1.1.1',
    '@radix-ui/react-toast': '^1.2.2',
    '@radix-ui/react-tooltip': '^1.1.3',
    '@tanstack/react-query': '^5.59.20',
    '@tanstack/react-router': '^1.82.1',
    'class-variance-authority': '^0.7.0',
    'clsx': '^2.1.1',
    'cmdk': '1.0.0',
    'date-fns': '^4.1.0',
    'lucide-react': '^0.463.0',
    '@tanstack/react-table': '^8.21.3',
    'recharts': '^2.13.3',
    'react-hook-form': '^7.53.2',
    'sonner': '^1.7.0',
    'tailwind-merge': '^2.5.4',
    'tailwindcss-animate': '^1.0.7',
    'vite-tsconfig-paths': '^5.1.3',
    'zod': '^3.23.8',
    'zustand': '^5.0.2',
    '@clerk/backend': '^1.17.1',
    '@clerk/clerk-react': '^5.13.1',
    'hono': '^4.6.12',
    'react-resizable-panels': '^2.1.7'
  },
  devDependencies: {
    'typescript': '~5.9.2',
    '@types/node': '^24.3.0',
    '@types/react': '^19.1.10',
    '@types/react-dom': '^19.1.7',
    'postcss': '^8',
    'tailwindcss': '^3.4.1',
    'eslint': '^8',
    'eslint-config-next': '14.2.5'
  }
};

// Load universal ignore patterns from shared file
function loadUniversalIgnorePatterns() {
  try {
    const fs = require('fs');
    const path = require('path');
    const universalIgnorePath = path.join(__dirname, 'src', 'core', 'universal-ignore.txt');
    const content = fs.readFileSync(universalIgnorePath, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.trim());
  } catch (error) {
    console.warn(`Warning: Could not load universal ignore patterns: ${error.message}`);
    return [
      'node_modules/**',
      '.git/**',
      'build/**',
      'dist/**',
      'coverage/**',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ];
  }
}

const SEARCH_IGNORE_PATTERNS = loadUniversalIgnorePatterns();

class OptimizedMCPTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: '3.4.56',
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      }
    };
  }

  async runOptimizedTest() {
    console.log('🚀 MCP Performance Test v3.1.6');
    console.log(`Platform: ${this.results.systemInfo.platform} ${this.results.systemInfo.arch} | Node.js: ${this.results.systemInfo.nodeVersion}`);

    console.log('🔍 Running pre-flight checks...');
    await this.runPreflightChecks();

    fs.mkdirSync(RESULTS_DIR, { recursive: true });

    const testDir = '../optimized-test-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });

    let performanceResults = null;
    let testError = null;

    try {
      console.log('🔧 Setting up test environment...');
      await this.setupOptimizedEnvironment(testDir);

      console.log('🧪 Running all performance tests...');
      performanceResults = await this.testOptimizedPerformance(testDir);
      this.results.performance = performanceResults;

      const resultsFile = path.join(RESULTS_DIR, 'mcp-performance-' + Date.now() + '.json');
      fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
      console.log('📊 Results saved to: ' + resultsFile);

      this.displayPerformanceSummary(performanceResults);
    } catch (error) {
      console.error('❌ Test failed: ' + error.message);
      this.results.error = error.message;
      testError = error;
    }

    if (performanceResults && !testError) {
      console.log('📝 Generating analysis reports...');
      try {
        await this.generateUserReview(testDir, performanceResults);
        await this.generateSuggestions(testDir, performanceResults);
        console.log('✅ Analysis reports generated successfully');
      } catch (reportError) {
        console.error('❌ Failed to generate reports:', reportError.message);
      }
    }

    await this.cleanupTestDirectories(testDir);

    if (testError) {
      throw testError;
    }

    console.log('🎉 All tests, cleanup, and analysis completed!');
  }

  async executeClaudeCommand(command, workingDir, timeout, testInfo = {}, outputFile, stepsFile, startTime) {
    return new Promise((resolve, reject) => {
      const args = this.parseCommandArgs(command);

      // Check if this is an MCP test by looking for MCP config in the command
      const isMcpTest = command.includes('--mcp-config');
      const testLabel = this.createTestLabel(testInfo);

      let stdout = '';
      let stderr = '';

      let child;
      if (isMcpTest) {
        console.log(`${testLabel} 🔧 Starting MCP test with script wrapper`);
        // For MCP tests, use script wrapper like baseline tests
        child = spawn('script', [
          '-q', '-c', `cd "${workingDir}" && ${command}`, '/dev/null'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
      } else {
        console.log(`${testLabel} 🔧 Starting baseline test with script wrapper`);
        // For baseline tests, keep using script wrapper
        child = spawn('script', [
          '-q', '-c', `cd "${workingDir}" && ${command}`, '/dev/null'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
      }

      console.log(`${testLabel} 🚀 Child process spawned, PID: ${child.pid}`);

      // Open file streams for continuous writing
      const stdoutStream = fs.createWriteStream(`${outputFile}.stdout.log`, { flags: 'w' });
      const stderrStream = fs.createWriteStream(`${outputFile}.stderr.log`, { flags: 'w' });

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Write continuously to file
        stdoutStream.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Write continuously to file
        stderrStream.write(output);

        // Show errors immediately
        this.streamError(output, testLabel);
      });

      // Close streams when process ends
      child.on('close', () => {
        stdoutStream.end();
        stderrStream.end();
      });

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        console.log(`${testLabel} ⏰ Command timed out after ${timeout/1000}s`);

        // Just log timeout - files written at end

        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);

        // Files will be written at the end of runTestCommand

        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(`Command failed with exit code ${code}`);
          Object.assign(error, { code, stderr, stdout, command });
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  parseCommandArgs(command) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  createTestLabel(testInfo = {}) {
    if (testInfo.testType && testInfo.testName) {
      const type = testInfo.testType.toUpperCase();
      const nameAbbrev = testInfo.testName.split(' ').map(w => w[0]).join('').substring(0, 4);
      return `[${type}:${nameAbbrev}]`;
    }
    return '[TEST]';
  }

  streamOutput(output, testLabel) {
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${testLabel} ${line}`);
        process.stdout.write(''); // Force immediate output
      }
    });
  }

  streamError(output, testLabel) {
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${testLabel} ERROR: ${line}`);
      }
    });
  }

  async runPreflightChecks() {
    const checks = [];

    try {
      execSync('claude --version', { stdio: 'pipe' });
      checks.push({ name: 'Claude CLI', status: '✅ Available' });
    } catch (error) {
      checks.push({ name: 'Claude CLI', status: '❌ Not found', error: error.message });
    }

    try {
      execSync('timeout 1 node src/index.js', { stdio: 'pipe', timeout: 3000, encoding: 'utf8' });
      checks.push({ name: 'MCP Server', status: '✅ Starts successfully' });
    } catch (error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        checks.push({ name: 'MCP Server', status: '✅ Starts successfully' });
      } else {
        checks.push({ name: 'MCP Server', status: '❌ Startup failed', error: error.message });
      }
    }

    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'src/index.js'))) {
      checks.push({ name: 'Working Directory', status: '✅ Correct location' });
    } else {
      checks.push({ name: 'Working Directory', status: '❌ Wrong location - missing src/index.js' });
    }

    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    if (majorVersion >= 18) {
      checks.push({ name: 'Node.js Version', status: `✅ ${nodeVersion} (compatible)` });
    } else {
      checks.push({ name: 'Node.js Version', status: `⚠️ ${nodeVersion} (may have issues)` });
    }

    checks.forEach(check => {
      console.log(`  ${check.status}: ${check.name}`);
      if (check.error) {
        console.log(`     Error: ${check.error}`);
      }
    });

    const failed = checks.filter(c => c.status.startsWith('❌'));
    if (failed.length > 0) {
      console.log(`⚠️  ${failed.length} pre-flight check(s) failed - tests may not run properly`);
    } else {
      console.log('✅ All pre-flight checks passed');
    }

    return checks;
  }

  async setupOptimizedEnvironment(testDir) {
    console.log('🔧 Setting up main test environment...');
  }

  async setupTestDirectory(testDir) {
    console.log('🚀 Setting up shadcn-admin test environment...');

    try {
      // Clone shadcn-admin repository as the base
      execSync('git clone https://github.com/satnaing/shadcn-admin.git temp-shadcn-admin', {
        cwd: path.dirname(testDir),
        stdio: 'inherit'
      });

      // Move the cloned content to the test directory
      const tempDir = path.join(path.dirname(testDir), 'temp-shadcn-admin');
      const files = fs.readdirSync(tempDir);

      files.forEach(file => {
        const srcPath = path.join(tempDir, file);
        const destPath = path.join(testDir, file);

        if (fs.statSync(srcPath).isDirectory()) {
          fs.cpSync(srcPath, destPath, { recursive: true });
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      });

      // Clean up temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      // Update package.json with our specific configuration
      const packageJsonPath = path.join(testDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Preserve shadcn-admin dependencies but ensure test compatibility
        packageJson.devDependencies = packageJson.devDependencies || {};
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          ...PACKAGE_JSON.devDependencies
        };

        // Add any additional test-specific dependencies
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies = {
          ...packageJson.dependencies,
          ...PACKAGE_JSON.dependencies
        };

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      }

      console.log('📦 Installing shadcn-admin dependencies...');
      await this.runNpmInstall(testDir);

      // Add searchignore file for shadcn-admin
      fs.writeFileSync(path.join(testDir, '.searchignore'), SEARCH_IGNORE_PATTERNS.join('\n'));

      const defaultIgnorePatterns = {
        files: [
          '**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/out/**',
          '**/coverage/**', '**/.nyc_output/**', '**/.git/**', '**/.vscode/**', '**/.idea/**',
          '**/*.log', '**/*.tmp', '**/temp/**', '**/tmp/**', '**/.DS_Store', '**/Thumbs.db',
          '**/*.map', '**/*.min.js', '**/*.min.css', '**/package-lock.json', '**/yarn.lock'
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
        directories: ['node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.nyc_output', '.git', '.vscode', '.idea', 'temp', 'tmp']
      };
      fs.writeFileSync(path.join(testDir, '.search-defaults.json'), JSON.stringify(defaultIgnorePatterns, null, 2));

      const isMcpTest = path.basename(testDir).includes('mcp');
      if (isMcpTest) {
        const mainDir = process.cwd();
        const claudeConfig = {
          mcpServers: {
            glootie: {
              command: "node",
              args: [path.resolve(mainDir, 'src', 'index.js')],
              env: {}
            }
          }
        };
        fs.writeFileSync(path.join(testDir, '.claude.json'), JSON.stringify(claudeConfig, null, 2));
        console.log(`📝 Created MCP configuration for ${path.basename(testDir)}`);
      }

      // Initialize git repository
      await this.initializeGitRepo(testDir);

    } catch (cloneError) {
      console.warn('⚠️ Failed to clone shadcn-admin, falling back to basic setup:', cloneError.message);

      // Fallback to basic setup if cloning fails
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(PACKAGE_JSON, null, 2));
      const dirs = ['app/components', 'app/ui', 'components/ui', 'lib'];
      dirs.forEach(dir => fs.mkdirSync(path.join(testDir, dir), { recursive: true }));

      // Create basic shadcn/ui files
      
      console.log('📦 Installing dependencies...');
      await this.runNpmInstall(testDir);

      // Continue with default setup
      fs.writeFileSync(path.join(testDir, '.searchignore'), SEARCH_IGNORE_PATTERNS.join('\n'));

      const defaultIgnorePatterns = {
        files: [
          '**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/out/**',
          '**/coverage/**', '**/.nyc_output/**', '**/.git/**', '**/.vscode/**', '**/.idea/**',
          '**/*.log', '**/*.tmp', '**/temp/**', '**/tmp/**', '**/.DS_Store', '**/Thumbs.db',
          '**/*.map', '**/*.min.js', '**/*.min.css', '**/package-lock.json', '**/yarn.lock'
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
        directories: ['node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.nyc_output', '.git', '.vscode', '.idea', 'temp', 'tmp']
      };
      fs.writeFileSync(path.join(testDir, '.search-defaults.json'), JSON.stringify(defaultIgnorePatterns, null, 2));

      const isMcpTest = path.basename(testDir).includes('mcp');
      if (isMcpTest) {
        const mainDir = process.cwd();
        const claudeConfig = {
          mcpServers: {
            glootie: {
              command: "node",
              args: [path.resolve(mainDir, 'src', 'index.js')],
              env: {}
            }
          }
        };
        fs.writeFileSync(path.join(testDir, '.claude.json'), JSON.stringify(claudeConfig, null, 2));
        console.log(`📝 Created MCP configuration for ${path.basename(testDir)}`);
      }

      const gitignoreContent = fs.readFileSync(path.join(process.cwd(), 'test-gitignore.txt'), 'utf8');
      fs.writeFileSync(path.join(testDir, '.gitignore'), gitignoreContent);
      await this.initializeGitRepo(testDir);
    }
  }

  async runNpmInstall(testDir) {
    return new Promise((resolve, reject) => {
      const isMcpTest = path.basename(testDir).includes('mcp');
      let command = 'npm install --no-audit --prefer-offline --ignore-scripts --no-progress --silent @modelcontextprotocol/sdk @ast-grep/napi ignore';

      const child = spawn('script', ['-q', '-c', command, '/dev/null'], {
        cwd: testDir,
        stdio: 'pipe',
        env: process.env
      });

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`📦 ${path.basename(testDir)}: ${line}`);
          }
        });
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`📦 ${path.basename(testDir)} ERROR: ${line}`);
          }
        });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });

      setTimeout(() => {
        child.kill();
        reject(new Error('npm install timed out after 20 minutes'));
      }, NPM_TIMEOUT);
    });
  }

  async initializeGitRepo(testDir) {
    try {
      execSync('git init', { cwd: testDir, stdio: 'ignore' });
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'ignore' });
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -a -m "Initial boilerplate commit"', { cwd: testDir, stdio: 'ignore' });
      console.log(`✅ Git repository initialized for ${path.basename(testDir)}`);
    } catch (gitError) {
      console.warn(`Warning: Could not initialize git repository for ${path.basename(testDir)}:`, gitError.message);
    }
  }

  async testOptimizedPerformance(testDir) {
    console.log('🧪 Running performance tests...');

    console.log(`🚀 Running ${TESTS.length} tests in parallel...`);
    console.log(`   Tests: ${TESTS.length} (${TESTS.length * 2} total runs)`);

    const testDirectories = [];
    const allTestPromises = [];

    TESTS.forEach(test => {
      const baselineDir = `${testDir}-baseline-${test.category}`;
      const mcpDir = `${testDir}-mcp-${test.category}`;

      fs.mkdirSync(baselineDir, { recursive: true });
      fs.mkdirSync(mcpDir, { recursive: true });

      testDirectories.push(
        { dir: baselineDir, test, type: 'baseline' },
        { dir: mcpDir, test, type: 'mcp' }
      );
    });

    console.log(`📦 Setting up ${testDirectories.length} test directories in parallel...`);
    await Promise.all(testDirectories.map(({ dir }) => this.setupTestDirectory(dir)));

    TESTS.forEach(test => {
      const baselineDir = `${testDir}-baseline-${test.category}`;
      const mcpDir = `${testDir}-mcp-${test.category}`;

      const baselinePromise = this.runTestCommand(baselineDir, test, false)
        .then(result => ({ type: 'baseline', test, result, directory: baselineDir }))
        .catch(error => ({
          type: 'baseline',
          test,
          result: { success: false, duration: 0, error: error.message, testType: 'baseline' },
          directory: baselineDir
        }));

      const mcpPromise = this.runTestCommand(mcpDir, test, true)
        .then(result => ({ type: 'mcp', test, result, directory: mcpDir }))
        .catch(error => ({
          type: 'mcp',
          test,
          result: { success: false, duration: 0, error: error.message, testType: 'mcp' },
          directory: mcpDir
        }));

      allTestPromises.push(baselinePromise, mcpPromise);
    });

    console.log(`🏃 [${new Date().toLocaleTimeString()}] Starting all ${allTestPromises.length} test executions in parallel...`);

    const startTime = Date.now();
    let completedCount = 0;

    const monitoredPromises = allTestPromises.map((promise, index) =>
      promise.then(result => {
        completedCount++;
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`   ✅ [${new Date().toLocaleTimeString()}] Test ${completedCount}/${allTestPromises.length} completed (${elapsed.toFixed(1)}s elapsed)`);
        return result;
      }).catch(error => {
        completedCount++;
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`   ❌ [${new Date().toLocaleTimeString()}] Test ${completedCount}/${allTestPromises.length} failed (${elapsed.toFixed(1)}s elapsed)`);
        throw error;
      })
    );

    const allResults = await Promise.all(monitoredPromises);
    const totalTime = (Date.now() - startTime) / 1000;

    console.log(`📊 [${new Date().toLocaleTimeString()}] All tests completed! Total parallel execution time: ${totalTime.toFixed(1)}s`);

    const resultsByTest = new Map();
    TESTS.forEach(test => {
      resultsByTest.set(test.category, { test, baseline: null, mcp: null });
    });

    allResults.forEach(({ type, test, result }) => {
      const key = test.category;
      if (resultsByTest.has(key)) {
        resultsByTest.get(key)[type] = result;
      }
    });

    const testResults = [];
    resultsByTest.forEach(({ test, baseline, mcp }) => {
      const improvement = baseline.success && mcp.success
        ? ((baseline.duration - mcp.duration) / baseline.duration * 100).toFixed(1)
        : 'N/A';

      const testResult = {
        name: test.name,
        category: test.category,
        baseline,
        optimized: mcp,
        improvement
      };

      console.log(`✅ Completed: ${test.name}`);
      console.log(`   Baseline: ${baseline.success ? baseline.duration.toFixed(1) + 's' : 'FAILED'} | MCP: ${mcp.success ? mcp.duration.toFixed(1) + 's' : 'FAILED'} | Improvement: ${improvement}%`);

      this.logTestErrors(baseline, mcp);

      testResults.push(testResult);
    });

    const results = {
      tests: testResults,
      avgImprovement: 0,
      cacheEffectiveness: 0,
      optimizationBenefits: []
    };

    const successfulTests = results.tests.filter(t => t.improvement !== 'N/A');
    if (successfulTests.length > 0) {
      const avgImprovement = successfulTests.reduce((sum, t) => sum + parseFloat(t.improvement), 0) / successfulTests.length;
      results.avgImprovement = avgImprovement.toFixed(1);
    }

    console.log('🎉 All tests completed!');
    return results;
  }

  logTestErrors(baseline, mcp) {
    if (!baseline.success) {
      console.log(`  ❌ Baseline failed: ${baseline.error || 'Unknown error'}`);
      if (baseline.fullError) {
        console.log(`     Command: ${baseline.fullError.command}`);
        console.log(`     Exit code: ${baseline.fullError.code}`);
        if (baseline.fullError.stderr) {
          console.log(`     stderr: ${baseline.fullError.stderr.substring(0, 200)}...`);
        }
      }
    }
    if (!mcp.success) {
      console.log(`  ❌ MCP failed: ${mcp.error || 'Unknown error'}`);
      if (mcp.fullError) {
        console.log(`     Command: ${mcp.fullError.command}`);
        console.log(`     Exit code: ${mcp.fullError.code}`);
        if (mcp.fullError.stderr) {
          console.log(`     stderr: ${mcp.fullError.stderr.substring(0, 200)}...`);
        }
      }
    }
  }

  async runTestCommand(workingDir, test, useMcp) {
    const startTime = Date.now();
    let lastError = null;
    const testType = useMcp ? 'mcp' : 'baseline';

    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const outputFile = path.join(RESULTS_DIR, `claude-output-${test.category}-${testType}.json`);
    const stepsFile = path.join(RESULTS_DIR, `claude-steps-${test.category}-${testType}.json`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!fs.existsSync(workingDir)) {
          throw new Error(`Test directory not found: ${workingDir}`);
        }

        const normalizedPath = path.resolve(workingDir);

        const standardTools = "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell";
        const mcpTools = "mcp__glootie__execute,mcp__glootie__searchcode,mcp__glootie__ast_tool";
        const allowedTools = useMcp ? `${standardTools},${mcpTools}` : standardTools;

        const finalPrompt = test.prompt + (useMcp ? " start with glootie mcp tools and use them to save time and improve work " : "");
        const mcpConfig = useMcp ? '--mcp-config ./.claude.json' : '';
        const permissionMode = '--permission-mode bypassPermissions';

        console.log('Path',normalizedPath);
        const claudeCmd = `cd ${normalizedPath}; ${useMcp ? 'env CLAUDE_CONFIG_DIR=. ' : ''} claude ${mcpConfig} ${permissionMode} -p "${finalPrompt}" --allowed-tools "${allowedTools}" --output-format stream-json --verbose --debug`;

        console.log(`🚀 [${new Date().toLocaleTimeString()}] Starting ${testType} test for ${test.name}`);
        console.log(`   📁 Working dir: ${path.basename(workingDir)}`);
        console.log(`   🔧 Tools: ${allowedTools.split(',').length} (MCP: ${useMcp ? 'enabled' : 'disabled'})`);
        console.log(`   💻 Command: ${claudeCmd}`);

        const testInfo = { testType, testName: test.name, testCategory: test.category };

        console.log(`   ⚡ Executing Claude command (output streaming to ${path.basename(outputFile)}.stdout.log)...`);

        const output = await this.executeClaudeCommand(claudeCmd, './', TEST_TIMEOUT, testInfo, outputFile, stepsFile, startTime);

        console.log(`   📋 Output sample: ${output.substring(0, 200).replace(/\n/g, '\\n')}...`);
        console.log(`   🔢 Output lines: ${output.split('\n').length}`);

        const finalOutputData = {
          timestamp: new Date(startTime).toISOString(),
          testType,
          testName: test.name,
          testCategory: test.category,
          command: claudeCmd,
          rawOutput: output,
          outputLength: output.length,
          endTime: new Date().toISOString()
        };
        fs.writeFileSync(outputFile, JSON.stringify(finalOutputData, null, 2));

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`✅ [${new Date().toLocaleTimeString()}] Completed ${testType} test for ${test.name} in ${duration.toFixed(1)}s`);

        const parsedOutput = this.parseOutput(output, useMcp, testType, test.name, test.category, startTime);

        fs.writeFileSync(stepsFile, JSON.stringify({
          timestamp: new Date(startTime).toISOString(),
          testType,
          testName: test.name,
          testCategory: test.category,
          prompt: test.prompt,
          stepData: parsedOutput.stepData,
          totalSteps: parsedOutput.totalSteps,
          toolCallsCount: parsedOutput.toolCalls ? parsedOutput.toolCalls.length : 0,
          toolResultsCount: parsedOutput.toolResults ? parsedOutput.toolResults.length : 0,
          parseError: parsedOutput.parseError,
          duration,
          toolsUsed: parsedOutput.toolsUsed,
          mcpServerStatus: parsedOutput.mcpServerStatus,
          finalUpdateTime: new Date().toISOString()
        }, null, 2));

        console.log(`✅ ${testType} test completed successfully`);
        console.log(`   Duration: ${duration.toFixed(1)}s`);
        console.log(`   Output: ${output.length} chars`);
        console.log(`   Steps: ${parsedOutput.totalSteps}`);
        console.log(`   Tools called: ${parsedOutput.totalToolCalls}`);
        console.log(`   Tools used: ${parsedOutput.toolsUsed ? parsedOutput.toolsUsed.join(', ') : 'none'}`);
        console.log(`   MCP Server: ${parsedOutput.mcpServerStatus || 'unknown'}`);

        this.logToolUsage(parsedOutput, useMcp);

        if (parsedOutput.parseError) {
          console.log(`   ⚠️  Parse warnings: ${parsedOutput.parseError}`);
        }


        return {
          success: true,
          duration,
          outputLength: output.length,
          useMcp,
          attempt,
          timestamp: new Date().toISOString(),
          parsedOutput,
          totalSteps: parsedOutput.totalSteps,
          toolCallsCount: parsedOutput.totalToolCalls,
          toolResultsCount: parsedOutput.totalToolResults,
          toolsUsed: parsedOutput.toolsUsed,
          mcpServerStatus: parsedOutput.mcpServerStatus,
          outputFile,
          stepsFile
        };
      } catch (error) {
        lastError = error;
        console.error(`❌ Test attempt ${attempt} failed for ${test.name} (${testType}):`, error.message);
        if (error.stderr) console.error(`   stderr: ${error.stderr.substring(0, 300)}`);
        if (error.stdout) console.error(`   stdout: ${error.stdout.substring(0, 300)}`);
        if (error.code) console.error(`   exit code: ${error.code}`);

        if (this.shouldSkipRetry(error)) {
          console.error(`   Non-retryable error detected, stopping attempts`);
          break;
        }

        if (attempt < MAX_RETRIES) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`   Retrying in ${waitTime/1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await this.sleep(waitTime);
        }
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(`🔥 Final failure for ${test.name} (${useMcp ? 'mcp' : 'baseline'}) after ${MAX_RETRIES} attempts`);

    return {
      success: false,
      duration,
      outputLength: 0,
      error: lastError?.message || 'Unknown error',
      fullError: {
        message: lastError?.message,
        stderr: lastError?.stderr,
        stdout: lastError?.stdout,
        code: lastError?.code,
        command: command,
        workingDir: normalizedPath,
        toolsCount: allowedTools.split(',').length
      },
      useMcp,
      retries: MAX_RETRIES,
      timestamp: new Date().toISOString(),
      stderr: lastError?.stderr || '',
      stdout: lastError?.stdout || ''
    };
  }

  createIncrementalData(testType, test, timestamp) {
    return {
      timestamp: new Date(timestamp).toISOString(),
      testType,
      testName: test.name,
      testCategory: test.category,
      prompt: test.prompt,
      startTime: new Date().toISOString(),
      rawOutput: '',
      outputLength: 0,
      stepData: [],
      toolCalls: [],
      toolResults: [],
      toolsUsed: new Set(),
      mcpServerStatus: testType === 'mcp' ? 'unknown' : 'disabled',
      totalSteps: 0,
      totalToolCalls: 0,
      totalToolResults: 0,
      parseError: null
    };
  }

  parseOutput(output, useMcp, testType, testName, testCategory, startTime) {
    try {
      const lines = output.split('\n').filter(line => line.trim());
      let jsonLines = [];

      const potentialJsonLines = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(item => item);

      if (potentialJsonLines.length > 0) {
        jsonLines = potentialJsonLines;
        console.log(`   📄 Found ${jsonLines.length} JSON lines in stream`);
      } else {
        console.log(`   📄 No JSON lines found, output appears to be plain text (${output.length} chars)`);
        jsonLines = [{
          type: 'final_response',
          content: output,
          timestamp: new Date().toISOString()
        }];
      }

      const toolCalls = [];
      const toolResults = [];
      const toolsUsed = new Set();
      let mcpServerStatus = useMcp ? 'unknown' : 'disabled';
      let incrementalStepData = [];

      for (let i = 0; i < jsonLines.length; i++) {
        const item = jsonLines[i];

        this.processJsonItem(item, toolCalls, toolResults, toolsUsed, mcpServerStatus, useMcp, incrementalStepData);
      }

      return {
        rawOutput: output,
        jsonLines,
        stepData: incrementalStepData,
        totalSteps: incrementalStepData.length,
        toolCalls,
        toolResults,
        toolsUsed: Array.from(toolsUsed),
        mcpServerStatus,
        totalToolCalls: toolCalls.length,
        totalToolResults: toolResults.length,
        finalResponse: jsonLines[jsonLines.length - 1]
      };
    } catch (parseError) {
      return {
        rawOutput: output,
        parseError: parseError.message,
        stepData: [],
        totalSteps: 0,
        toolCalls: [],
        toolResults: [],
        toolsUsed: [],
        mcpServerStatus: 'parse_error',
        totalToolCalls: 0,
        totalToolResults: 0
      };
    }
  }

  processJsonItem(item, toolCalls, toolResults, toolsUsed, mcpServerStatus, useMcp, incrementalStepData) {
    if (item.type === 'assistant' && item.message && item.message.content) {
      item.message.content.forEach(content => {
        if (content.type === 'tool_use') {
          toolCalls.push({
            id: content.id,
            name: content.name,
            input: content.input
          });
          toolsUsed.add(content.name);

          if (content.name && content.name.startsWith('mcp__glootie__')) {
            console.log(`   🎯 MCP tool used: ${content.name}`);
          }
        }
      });
    }

    if (item.type === 'user' && item.message && item.message.content) {
      item.message.content.forEach(content => {
        if (content.tool_use_id && content.type === 'tool_result') {
          toolResults.push({
            tool_use_id: content.tool_use_id,
            content: content.content
          });
        }
      });
    }

    if (useMcp && item.type === 'system' && item.mcp_servers) {
      console.log(`   🔗 MCP Server status: ${item.mcp_servers.map(s => `${s.name}: ${s.status}`).join(', ')}`);
      if (item.mcp_servers && item.mcp_servers.length > 0) {
        mcpServerStatus = item.mcp_servers[0].status;
      }
    }

    if (useMcp && item.type === 'system' && item.message && item.message.includes('mcp_servers')) {
      try {
        const serverMatch = item.message.match(/"status":\s*"([^"]+)"/);
        if (serverMatch) {
          mcpServerStatus = serverMatch[1];
          console.log(`   🔗 MCP Server status found: ${mcpServerStatus}`);
        }
      } catch (e) {
      }
    }

    if (item.type === 'system' && item.tools) {
      console.log(`   🛠️ Available tools: ${item.tools.length} total`);
      const mcpTools = item.tools.filter(tool => tool.startsWith('mcp__glootie__'));
      if (mcpTools.length > 0 && useMcp) {
        console.log(`   🎯 MCP tools available: ${mcpTools.length}`);
        console.log(`   📋 Available MCP tools: ${mcpTools.join(', ')}`);
      }
    }

    const isStep = item.type === 'assistant' && item.message && item.message.content &&
                  item.message.content.some(content => content.type === 'tool_use') ||
                  item.type === 'user' && item.message && item.message.content &&
                  item.message.content.some(content => content.type === 'tool_result') ||
                  item.type === 'system' && item.subtype === 'init' ||
                  item.type === 'step' || item.step;

    if (isStep) {
      incrementalStepData.push(item);
    }
  }

  logToolUsage(parsedOutput, useMcp) {
    const mcpToolsUsed = parsedOutput.toolsUsed ? parsedOutput.toolsUsed.filter(tool => tool.startsWith('mcp__glootie__')) : [];
    const standardToolsUsed = parsedOutput.toolsUsed ? parsedOutput.toolsUsed.filter(tool => !tool.startsWith('mcp__glootie__')) : [];

    if (useMcp) {
      console.log(`   🎯 MCP tools used: ${mcpToolsUsed.length ? mcpToolsUsed.join(', ') : 'none'}`);
      console.log(`   📋 Standard tools used: ${standardToolsUsed.length ? standardToolsUsed.join(', ') : 'none'}`);
      console.log(`   📊 MCP vs Standard ratio: ${mcpToolsUsed.length}:${standardToolsUsed.length}`);
    } else {
      console.log(`   📋 Standard tools only: ${standardToolsUsed.length ? standardToolsUsed.join(', ') : 'none'}`);
    }
  }

  writeIncrementalResults(newOutput, outputFile, stepsFile, testInfo, command, startTime, fullStdout) {
    try {
      const testType = testInfo.testType; // Extract testType from testInfo

      // Parse the latest output chunk for JSON lines
      const lines = newOutput.split('\n').filter(line => line.trim());
      const jsonLines = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          jsonLines.push(parsed);
        } catch (e) {
          // Skip non-JSON lines
        }
      }

      if (jsonLines.length === 0) return; // No new JSON data to process

      const currentTime = Date.now();
      const duration = (currentTime - startTime) / 1000;

      const incrementalOutputData = {
        timestamp: new Date(startTime).toISOString(),
        testType,
        testName: testInfo.testName || 'Unknown',
        testCategory: testInfo.testCategory || 'Unknown',
        command: command,
        startTime: new Date(startTime).toISOString(),
        lastUpdate: new Date().toISOString(),
        rawOutput: fullStdout,
        outputLength: fullStdout.length,
        duration,
        status: 'running'
      };

      fs.writeFileSync(outputFile, JSON.stringify(incrementalOutputData, null, 2));

      const parsedOutput = this.parseOutput(fullStdout, testType === 'mcp', testType, testInfo.testName || 'Unknown', testInfo.testCategory || 'Unknown', startTime);

      const incrementalStepsData = {
        timestamp: new Date(startTime).toISOString(),
        testType,
        testName: testInfo.testName || 'Unknown',
        testCategory: testInfo.testCategory || 'Unknown',
        command: command,
        lastUpdate: new Date().toISOString(),
        stepData: parsedOutput.stepData || [],
        totalSteps: parsedOutput.totalSteps || 0,
        toolCallsCount: parsedOutput.toolCalls ? parsedOutput.toolCalls.length : 0,
        toolResultsCount: parsedOutput.toolResults ? parsedOutput.toolResults.length : 0,
        toolsUsed: parsedOutput.toolsUsed || [],
        mcpServerStatus: parsedOutput.mcpServerStatus || 'unknown',
        duration,
        status: 'running',
        parseError: parsedOutput.parseError
      };

      fs.writeFileSync(stepsFile, JSON.stringify(incrementalStepsData, null, 2));

      // Log significant updates
      if (jsonLines.some(line => line.type === 'assistant' && line.message?.content?.some(c => c.type === 'tool_use'))) {
        console.log(`   📝 [${new Date().toLocaleTimeString()}] Updated results: ${parsedOutput.totalSteps} steps, ${parsedOutput.toolsUsed.length} tools used`);
      }

    } catch (error) {
      console.error(`   ⚠️ Incremental write error: ${error.message}`);
    }
  }

  markTestStatus(outputFile, stepsFile, status, startTime, stdout) {
    try {
      const duration = (Date.now() - startTime) / 1000;

      if (fs.existsSync(outputFile)) {
        const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        outputData.status = status;
        outputData.duration = duration;
        outputData.lastUpdate = new Date().toISOString();
        outputData.finalOutput = stdout;
        fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      }

      if (fs.existsSync(stepsFile)) {
        const stepsData = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
        stepsData.status = status;
        stepsData.duration = duration;
        stepsData.lastUpdate = new Date().toISOString();
        fs.writeFileSync(stepsFile, JSON.stringify(stepsData, null, 2));
      }

      console.log(`   📝 Marked test as '${status}' after ${duration.toFixed(1)}s`);
    } catch (error) {
      console.error(`   ⚠️ Error marking test status: ${error.message}`);
    }
  }

  shouldSkipRetry(error) {
    const nonRetryableErrors = ['ENOENT', 'EACCES', 'EPERM', 'Command failed'];
    return nonRetryableErrors.some(code => error.message.includes(code));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  displayPerformanceSummary(results) {
    console.log('\n📊 Performance Summary');
    const total = results.tests.length;
    const successful = results.tests.filter(t => t.baseline.success && t.optimized.success).length;
    const failed = total - successful;

    console.log(`Average Improvement: ${results.avgImprovement}% | Completed: ${total} | Successful: ${successful} | Failed: ${failed}`);

    if (successful === 0) {
      console.log('❌ No tests completed successfully - check error logs above');
    } else if (failed > 0) {
      console.log(`⚠️  ${failed}/${total} tests failed - performance metrics may be incomplete`);
    }

    if (parseFloat(results.avgImprovement) > 0) {
      console.log(`🎯 Success: ${results.avgImprovement}% average improvement across ${successful} successful tests`);
    } else if (successful > 0) {
      console.log(`📉 Performance degraded on average: ${results.avgImprovement}% across ${successful} tests`);
    }

    console.log('\n📋 Test Results Breakdown:');
    results.tests.forEach(test => {
      const baselineStatus = test.baseline.success ? '✅' : '❌';
      const optimizedStatus = test.optimized.success ? '✅' : '❌';
      console.log(`  ${test.name}:`);
      console.log(`    Baseline: ${baselineStatus} ${test.baseline.duration.toFixed(1)}s`);
      console.log(`    Optimized: ${optimizedStatus} ${test.optimized.duration.toFixed(1)}s`);
      console.log(`    Improvement: ${test.improvement}%`);
    });
  }

  generatePerformanceSummary(performanceResults) {
    let summary = 'PERFORMANCE TEST RESULTS SUMMARY:\n\n';

    summary += `Average Improvement: ${performanceResults.avgImprovement}%\n`;
    summary += `Total Tests: ${performanceResults.tests.length}\n`;

    const successful = performanceResults.tests.filter(t => t.baseline.success && t.optimized.success).length;
    const failed = performanceResults.tests.length - successful;
    summary += `Successful Tests: ${successful}\n`;
    summary += `Failed Tests: ${failed}\n\n`;

    summary += 'DETAILED TEST RESULTS:\n';
    performanceResults.tests.forEach(test => {
      summary += `\n${test.name}:\n`;
      summary += `  Baseline: ${test.baseline.success ? test.baseline.duration.toFixed(1) + 's' : 'FAILED'}\n`;
      summary += `  MCP: ${test.optimized.success ? test.optimized.duration.toFixed(1) + 's' : 'FAILED'}\n`;
      summary += `  Improvement: ${test.improvement}%\n`;
    });

    return summary;
  }

  async generateUserReview(testDir, performanceResults) {
    try {
      console.log('Generating user review...');
      const performanceSummary = this.generatePerformanceSummary(performanceResults);
      const reviewCmd = `claude -p "I need you to analyze the actual experiences of the coding agents during the MCP Glootie v3.1.4 benchmarking test by examining their step outputs and history. Please base your analysis on a complete examination of the saved step files to find out what went right and what went wrong.

CRITICAL: You must examine the actual step files in the results/ directory:
- results/claude-steps-*.json files contain the actual step-by-step execution data
- results/claude-output-*.json files contain the raw Claude outputs
- evaluate the difference between the work done on each project, the baseline vs the mcp, in their optimized-test directories
- The step files show tool calls, results, and execution patterns
- Compare baseline vs MCP tool usage patterns
- Additional time spent or things run is fine, even if it didnt help us here, if it would help us in more complicated situations
- We dont need tooling that makes the agent choose any pre-determined behaviors or tools, the agent should make its own choices
- Dont complain about additional context in light of simple tasks, since we're optimizing for complex tasks

Wall clock times:
${performanceSummary}

Analysis Requirements:
Use the glootie tools to improve your analysis performance
Use git to check which files have changed in each projects optimized-test folder and compare the changes between the baseline and the mcp test

Focus Areas:
- What the step outputs reveal about tool reliability and coding skill
- Which tools actually helped agents accomplish tasks vs which created friction
- Real-world experience of agents using these tools for development tasks
- Pay close attention to any chekovs guns that threw off the agents
- We're looking for improved intelligent and predictive behaviors and more truth-grounded code.
- Slower is better if it improved results or testing was more thorough
- Additional time spent or things run is fine, even if it didnt help us here, if it would help us in more complicated situations
- We prefer it if the LLM makes the decisions, we dont want to recommend tools that create baked activities
- We dont need tooling that makes the agent choose any pre-determined behaviors or tools, the agent should make its own choices
- Dont complain about additional context in light of simple tasks, since we're optimizing for complex tasks

results is in ./results, with all the steps taken by agents

Write an honest END_USER_REVIEW.md from the perspective of the agents who actually ran the tests. Base it entirely on the step data and outputs you examine. Be comprehensive and tell the real story of what happened during testing, not theoretical analysis or any drama or theatrics, just their story as the agents who had to do the work. It should be in natural language and it should be a review, not a report. Be as explicit and detailed about the experience as possible." --add-dir "./" --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell" --verbose`;

      const reviewOutput = execSync(reviewCmd, {
        cwd: './',
        timeout: TEST_TIMEOUT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ END_USER_REVIEW.md generated', reviewOutput);
    } catch (error) {
      console.error('❌ Failed to generate user review:', error.message);
      throw error;
    }
  }

  async generateSuggestions(testDir, performanceResults) {
    try {
      console.log('Generating suggestions...');
      const performanceSummary = this.generatePerformanceSummary(performanceResults);
      const suggestionsCmd = `claude -p "I need you to analyze the actual experiences of coding agents using MCP Glootie v3.1.4 by examining their step history and outputs to write detailed SUGGESTIONS.md. Please base your analysis entirely on the saved step files to understand what the agents really experienced.

CRITICAL: You must examine the actual step files in the results/ directory:
- results/claude-steps-*.json files contain the real step-by-step execution data
- results/claude-output-*.json files contain the raw Claude outputs
- These files show what actually happened during testing

WALL CLOCK TIMES:
${performanceSummary}

Analysis Requirements:
Use the glootie tools to improve your analysis capabilities, remember to begin first, ths is a complex task

Also pay close attention END_USER_REVIEW.md for a prepared work on the same subject, but dont let it throw you off your findings, it might be wrong, you're providing a second opinion

Focus Areas:
- What friction points did agents encounter when using specific tools?
- Where did agents succeed or fail in accomplishing their assigned tasks?
- Which tools actually improved the agent experience vs which created new problems?
- What do the actual step outputs reveal about tool reliability and usability?
- We prefer more thorough, verified, well thought out processes and signs of intelligent behavior and prediction of iseues.
- Slower is better if it improved results or testing was more thorough
- We prefer it if the LLM makes the decisions, we dont want to recommend tools that create baked activities

Pay close attention to any chekovs guns that threw off the agents
results is in ./results, with all the steps taken by agents

Write SUGGESTIONS.md as a comprehensive, no-nonsense technical improvement document that specifically addresses the pain points and successes you observed in the actual agent experiences. Provide concrete, actionable suggestions for making the tooling better based on what the agents actually went through. Focus on practical improvements rather than theoretical benefits, based entirely on the step data analysis. Use lateral thinking to expose potential changes that havent previously been ideantified. Use critical thinking to get rid of any ideas not worth exploring. WGFY all the different opportunities for change to find the best ones." --add-dir "./" --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell" --verbose`;

      const suggestionsOutput = execSync(suggestionsCmd, {
        cwd: './',
        timeout: TEST_TIMEOUT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ SUGGESTIONS.md generated', suggestionsOutput);
    } catch (error) {
      console.error('❌ Failed to generate suggestions:', error.message);
      throw error;
    }
  }

  async cleanupTestDirectories(testDir) {
    console.log('🧹 Cleaning up test directories...');

    const baseTestDir = testDir;
    const testDirs = [baseTestDir];

    try {
      const parentDir = path.dirname(baseTestDir);
      const baseName = path.basename(baseTestDir);
      const allDirs = fs.readdirSync(parentDir);
      const relatedDirs = allDirs.filter(dir => dir.startsWith(baseName));

      relatedDirs.forEach(dir => {
        const fullPath = path.join(parentDir, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          testDirs.push(fullPath);
        }
      });
    } catch (error) {
      console.warn('Warning: Could not find all test directories:', error.message);
    }

    for (const dir of testDirs) {
      await this.cleanupTestDirectory(dir);
    }
  }

  async cleanupTestDirectory(dir) {
    try {
      if (fs.existsSync(dir)) {
        const stepFiles = fs.readdirSync(dir).filter(file =>
          file.startsWith('claude-steps-') || file.startsWith('claude-output-')
        );

        if (stepFiles.length > 0) {
          console.log(`📋 Copying ${stepFiles.length} step files from ${path.basename(dir)} to results directory...`);
          for (const file of stepFiles) {
            const src = path.join(dir, file);
            const dest = path.join(RESULTS_DIR, file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not copy step files from ${dir}:`, error.message);
    }

    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Test directory ${path.basename(dir)} cleaned up successfully`);
      }
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up test directory ${dir}:`, cleanupError.message);
      try {
        execSync(`rm -rf "${dir}"`, { stdio: 'ignore' });
        console.log(`✅ Test directory ${path.basename(dir)} force cleaned up successfully`);
      } catch (e) {
        console.warn(`Warning: Final cleanup also failed for ${dir}:`, e.message);
      }
    }
  }
}

const test = new OptimizedMCPTest();
test.runOptimizedTest().catch(console.error);