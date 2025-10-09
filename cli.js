#!/usr/bin/env node

/**
 * SandboxBox CLI - Zero-Privilege Container Runner
 *
 * Simple usage:
 *   npx sandboxbox setup              # One-time Alpine setup
 *   npx sandboxbox build <dockerfile> # Build from Dockerfile
 *   npx sandboxbox run <project>      # Run Playwright tests
 *   npx sandboxbox shell <project>    # Interactive shell
 */

// Debug: Make sure the script starts
console.log('🚀 SandboxBox starting...');
if (process.env.DEBUG) {
  console.log(`🔧 Debug: Platform: ${process.platform}`);
  console.log(`🔧 Debug: Node.js: ${process.version}`);
  console.log(`🔧 Debug: Args: ${process.argv.slice(2).join(' ')}`);
}

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// We'll import bubblewrap later, only on Linux systems

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function color(colorName, text) {
  return `${colors[colorName]}${text}${colors.reset}`;
}

function showBanner() {
  console.log(color('cyan', '📦 SandboxBox - Zero-Privilege Container Runner'));
  console.log(color('cyan', '═════════════════════════════════════════════════════'));
  console.log('');
}

function showHelp() {
  console.log(color('yellow', 'Usage:'));
  console.log('  npx sandboxbox <command> [options]');
  console.log('');
  console.log(color('yellow', 'Commands:'));
  console.log('  setup                          Set up Alpine Linux environment (one-time)');
  console.log('  build <dockerfile>            Build container from Dockerfile');
  console.log('  run <project-dir>             Run Playwright tests in isolation');
  console.log('  shell <project-dir>           Start interactive shell in container');
  console.log('  quick-test <project-dir>      Quick test with sample Dockerfile');
  console.log('');
  console.log(color('yellow', 'Examples:'));
  console.log('  npx sandboxbox setup');
  console.log('  npx sandboxbox build ./Dockerfile');
  console.log('  npx sandboxbox run ./my-project');
  console.log('  npx sandboxbox shell ./my-project');
  console.log('  npx sandboxbox quick-test ./my-app');
  console.log('');
  console.log(color('yellow', 'Requirements:'));
  console.log('  - bubblewrap (bwrap): sudo apt-get install bubblewrap');
  console.log('  - No root privileges needed after installation!');
  console.log('');
  console.log(color('magenta', '🚀 8ms startup • True isolation • Playwright ready'));
}

async function checkBubblewrap() {
  try {
    const { bubblewrap } = await import('./lib/bubblewrap.js');

    if (bubblewrap.isAvailable()) {
      console.log(color('green', `✅ Bubblewrap found: ${bubblewrap.getVersion()}`));

      if (!bubblewrap.checkUserNamespaces()) {
        console.log(color('yellow', '⚠️  User namespaces not available'));
        console.log(color('yellow', '   Try: sudo sysctl kernel.unprivileged_userns_clone=1'));
        console.log(color('yellow', '   Or: echo 1 | sudo tee /proc/sys/kernel/unprivileged_userns_clone'));
      }

      return true;
    } else {
      console.log(color('red', bubblewrap.findBubblewrap().message));
      return false;
    }
  } catch (error) {
    console.log(color('red', `❌ Failed to load bubblewrap manager: ${error.message}`));
    return false;
  }
}

function runScript(scriptPath, args = []) {
  try {
    const cmd = `node "${scriptPath}" ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', cwd: __dirname });
  } catch (error) {
    console.log(color('red', `❌ Command failed: ${error.message}`));
    process.exit(1);
  }
}

function createSampleDockerfile(projectDir) {
  // Ensure project directory exists
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }

  const dockerfile = `# Sample Dockerfile for SandboxBox
FROM alpine

# Install Node.js and test dependencies
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files (if they exist)
COPY package*.json ./

# Install dependencies (if package.json exists)
RUN if [ -f package.json ]; then npm install; fi

# Copy application code
COPY . .

# Default command - run tests or start app
CMD ["npm", "test"]
`;

  const dockerfilePath = resolve(projectDir, 'Dockerfile.sandboxbox');
  writeFileSync(dockerfilePath, dockerfile);
  console.log(color('green', `✅ Created sample Dockerfile: ${dockerfilePath}`));
  return dockerfilePath;
}

async function main() {
  // Check platform first
  if (process.platform !== 'linux') {
    console.log(color('red', '❌ SandboxBox only works on Linux systems'));
    console.log(color('yellow', '🐧 Required: Linux with bubblewrap (bwrap)'));
    console.log('');
    console.log(color('cyan', '💡 Alternatives for Windows users:'));
    console.log('   • Use WSL2 (Windows Subsystem for Linux 2)');
    console.log('   • Use Docker Desktop with Linux containers');
    console.log('   • Use GitHub Actions (ubuntu-latest runners)');
    console.log('   • Use a cloud Linux instance (AWS, GCP, Azure)');
    console.log('');
    console.log(color('green', '✅ On Linux/WSL2, simply run: npx sandboxbox --help'));
    process.exit(1);
  }

  const args = process.argv.slice(2);

  showBanner();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  switch (command) {
    case 'setup':
      console.log(color('blue', '🏔️  Setting up Alpine Linux environment...'));
      if (!(await checkBubblewrap())) process.exit(1);
      runScript('./container.js', ['setup']);
      break;

    case 'build':
      if (commandArgs.length === 0) {
        console.log(color('red', '❌ Please specify a Dockerfile path'));
        console.log(color('yellow', 'Usage: npx claudtainer build <dockerfile>'));
        process.exit(1);
      }
      console.log(color('blue', '🏗️  Building container...'));
      if (!(await checkBubblewrap())) process.exit(1);
      runScript('./container.js', ['build', commandArgs[0]]);
      break;

    case 'run':
      const projectDir = commandArgs[0] || '.';
      console.log(color('blue', '🚀 Running Playwright tests...'));
      if (!(await checkBubblewrap())) process.exit(1);
      runScript('./container.js', ['run', projectDir]);
      break;

    case 'shell':
      const shellDir = commandArgs[0] || '.';
      console.log(color('blue', '🐚 Starting interactive shell...'));
      if (!(await checkBubblewrap())) process.exit(1);
      runScript('./container.js', ['shell', shellDir]);
      break;

    case 'quick-test':
      const testDir = commandArgs[0] || '.';
      console.log(color('blue', '⚡ Quick test mode...'));
      console.log(color('yellow', 'Creating sample Dockerfile and running tests...\n'));

      // Create sample Dockerfile first
      const sampleDockerfile = createSampleDockerfile(testDir);

      // Check for bubblewrap before proceeding
      if (!(await checkBubblewrap())) {
        console.log(color('yellow', '\n📋 Sample Dockerfile created successfully!'));
        console.log(color('yellow', 'To run tests, install bubblewrap and try again:'));
        console.log(color('cyan', `   npx sandboxbox build "${sampleDockerfile}"`));
        console.log(color('cyan', `   npx sandboxbox run "${testDir}"`));
        process.exit(1);
      }

      // Build and run
      console.log(color('blue', 'Building container...'));
      runScript('./container.js', ['build', sampleDockerfile]);

      console.log(color('blue', 'Running tests...'));
      runScript('./container.js', ['run', testDir]);
      break;

    case 'version':
      const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
      console.log(color('green', `SandboxBox v${packageJson.version}`));
      console.log(color('cyan', 'Zero-privilege containers with Playwright support'));
      break;

    default:
      console.log(color('red', `❌ Unknown command: ${command}`));
      console.log(color('yellow', 'Use --help for usage information'));
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ SandboxBox failed to start:');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 This might be because:');
    console.error('   • You are not on Linux (SandboxBox requires Linux)');
    console.error('   • Node.js version compatibility issue');
    console.error('   • Missing dependencies during installation');
    console.error('');
    console.error('📋 System information:');
    console.error(`   Platform: ${process.platform}`);
    console.error(`   Node.js: ${process.version}`);
    console.error(`   Architecture: ${process.arch}`);
    console.error('');
    console.error('🔧 Try: npx sandboxbox --help');
    process.exit(1);
  });
}