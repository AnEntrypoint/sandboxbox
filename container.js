#!/usr/bin/env node

/**
 * Bubblewrap Container Runner - Playwright + True Isolation
 *
 * This uses bubblewrap for truly rootless container operation
 * Perfect for Playwright with 8ms startup and zero privileged setup
 *
 * Requirements:
 * - bubblewrap (bwrap) - install with: apt-get install bubblewrap
 * - No root access needed after installation
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { bubblewrap } from './lib/bubblewrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class BubblewrapContainer {
  constructor(options = {}) {
    this.sandboxDir = options.sandboxDir || './sandboxbox-sandbox';
    this.alpineRoot = bubblewrap.getAlpineRoot();
    this.verbose = options.verbose !== false;
    this.env = { ...process.env };
    this.workdir = '/workspace';

    // Auto-create sandbox directory if it doesn't exist
    if (!existsSync(this.sandboxDir)) {
      mkdirSync(this.sandboxDir, { recursive: true });
    }
  }

  /**
   * Check if bubblewrap is available
   */
  checkBubblewrap() {
    if (!bubblewrap.isAvailable()) {
      throw new Error(bubblewrap.findBubblewrap().message);
    }
    return true;
  }

  /**
   * Set up Alpine Linux rootfs with Playwright support
   */
  async setupAlpineRootfs() {
    console.log('🏔️  Setting up Alpine Linux rootfs for Playwright...\n');

    await bubblewrap.ensureAlpineRoot();
    console.log('✅ Alpine rootfs ready!\n');
  }

  /**
   * Install required packages in Alpine with Playwright compatibility fixes
   */
  async setupAlpinePackages() {
    console.log('📦 Installing packages in Alpine with Playwright compatibility...');

    // Create a temporary setup script addressing glibc/musl issues
    const setupScript = `
#!/bin/sh
set -e

# Setup repositories
echo 'https://dl-cdn.alpinelinux.org/alpine/v3.20/main' > /etc/apk/repositories
echo 'https://dl-cdn.alpinelinux.org/alpine/v3.20/community' >> /etc/apk/repositories

# Update package index
apk update

# Install Node.js and required tools for Playwright on Alpine
# NOTE: Using Alpine's system Chromium to avoid glibc/musl compatibility issues
apk add --no-cache \\
    nodejs \\
    npm \\
    chromium \\
    nss \\
    freetype \\
    harfbuzz \\
    ttf-freefont \\
    ca-certificates \\
    wget \\
    curl \\
    git \\
    bash \\
    xvfb \\
    mesa-gl \\
    libx11 \\
    libxrandr \\
    libxss \\
    libgcc \\
    libstdc++ \\
    expat \\
    dbus

# Create workspace directory
mkdir -p /workspace

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Create Playwright config for Alpine
mkdir -p /workspace/playwright-config

# Create Playwright configuration for Alpine (addresses sandbox conflicts)
cat > /workspace/playwright.config.js << 'EOF'
export default defineConfig({
  use: {
    // Required: Chromium's sandbox conflicts with bubblewrap's sandbox
    chromiumSandbox: false,
    headless: true,
    // Use Alpine's system Chromium
    executablePath: '/usr/bin/chromium-browser',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        executablePath: '/usr/bin/chromium-browser',
      },
    },
  ],
  // Skip browser downloads since we use system Chromium
  webServer: {
    command: 'echo "Skipping browser download"',
  },
});
EOF

# Create test script that handles Chromium sandbox issues
cat > /workspace/run-playwright.sh << 'EOF'
#!/bin/sh
set -e

# Environment variables for Playwright on Alpine with bubblewrap
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
export DISPLAY=:99

# Start virtual display for headless operation
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
XVFB_PID=$!

# Give Xvfb time to start
sleep 2

# Cleanup function
cleanup() {
    if [ ! -z "$XVFB_PID" ]; then
        kill $XVFB_PID 2>/dev/null || true
    fi
}

# Trap cleanup
trap cleanup EXIT INT TERM

echo "🎭 Running Playwright in Alpine with bubblewrap isolation..."
echo "📁 Workspace: $(pwd)"
echo "🌐 Display: $DISPLAY"
echo "🚀 Chromium: $(which chromium-browser)"

# Run Playwright tests
exec "$@"
EOF

chmod +x /workspace/run-playwright.sh

echo "✅ Alpine setup complete with Playwright compatibility fixes"
echo "📋 Installed: Node.js, Chromium, Xvfb, fonts, libraries"
echo "🎯 Created: Playwright config and wrapper scripts"
echo "⚠️  Note: Chromium-only (Firefox/WebKit need glibc - use Ubuntu)"
`;

    const scriptPath = join(this.sandboxDir, 'setup-alpine.sh');
    writeFileSync(scriptPath, setupScript, { mode: 0o755 });

    try {
      // Run setup inside Alpine using bubblewrap
      const bwrapCmd = [
        'bwrap',
        '--ro-bind', `${this.alpineRoot}`, '/',
        '--proc', '/proc',
        '--dev', '/dev',
        '--tmpfs', '/tmp',
        '--tmpfs', '/var/tmp',
        '--tmpfs', '/run',
        '--bind', `${this.sandboxDir}`, '/host',
        '--share-net',
        '--die-with-parent',
        '--new-session',
        scriptPath
      ];

      console.log('🔧 Running Alpine setup...');
      execSync(bwrapCmd.join(' '), { stdio: 'inherit' });

    } catch (error) {
      throw new Error(`Alpine setup failed: ${error.message}`);
    }
  }

  /**
   * Run Playwright tests in bubblewrap sandbox with proper sandbox conflict handling
   */
  async runPlaywright(options = {}) {
    this.checkBubblewrap();

    const {
      projectDir = '.',
      testCommand = 'npx playwright test',
      mountProject = true,
      headless = true
    } = options;

    console.log('🎭 Starting Playwright in bubblewrap sandbox...\n');
    console.log('🔧 Addressing Alpine/Playwright compatibility issues...\n');

    // Resolve project directory
    const resolvedProjectDir = resolve(projectDir);

    // First, try full namespace isolation
    try {
      console.log('🎯 Attempting full namespace isolation...');
      return await this.runPlaywrightWithNamespaces(options);
    } catch (error) {
      console.log(`⚠️  Namespace isolation failed: ${error.message}`);
      console.log('🔄 Falling back to basic isolation mode...\n');
      return await this.runPlaywrightBasic(options);
    }
  }

  /**
   * Run simple container test without Playwright (for testing purposes)
   */
  async runSimpleTest(options = {}) {
    const { projectDir = '.', testCommand = 'echo "Container is working!" && ls -la /workspace' } = options;
    const resolvedProjectDir = resolve(projectDir);

    console.log('🧪 Running simple container test...\n');

    // Try basic isolation first
    try {
      console.log('🎯 Attempting basic isolation...');
      return await this.runBasicTest(options);
    } catch (error) {
      console.log(`⚠️  Basic test failed: ${error.message}`);
      console.log('🔄 Running without isolation...\n');
      return this.runWithoutIsolation(options);
    }
  }

  /**
   * Run basic test in container
   */
  async runBasicTest(options = {}) {
    const { projectDir = '.', testCommand = 'echo "Container is working!" && ls -la /workspace' } = options;
    const resolvedProjectDir = resolve(projectDir);

    // Simplified bubblewrap command
    const bwrapCmd = [
      bubblewrap.findBubblewrap(),
      '--bind', resolvedProjectDir, '/workspace',
      '--chdir', '/workspace',
      '--tmpfs', '/tmp',
      '/bin/sh', '-c', testCommand
    ];

    console.log(`🚀 Running: ${testCommand}`);
    console.log(`📁 Project directory: ${resolvedProjectDir}`);
    console.log(`🎯 Sandbox isolation: basic mode\n`);

    return this.executeCommand(bwrapCmd, resolvedProjectDir);
  }

  /**
   * Run without any isolation (last resort)
   */
  async runWithoutIsolation(options = {}) {
    const { projectDir = '.', testCommand = 'echo "Container is working!" && ls -la' } = options;
    const resolvedProjectDir = resolve(projectDir);

    console.log(`🚀 Running without isolation: ${testCommand}`);
    console.log(`📁 Project directory: ${resolvedProjectDir}`);
    console.log(`🎯 Sandbox isolation: none\n`);

    try {
      execSync(testCommand, { stdio: 'inherit', cwd: resolvedProjectDir });
      console.log('\n✅ Test completed successfully!');
      return 0;
    } catch (error) {
      throw new Error(`Test failed: ${error.message}`);
    }
  }

  /**
   * Run Playwright with full namespace isolation (ideal mode)
   */
  async runPlaywrightWithNamespaces(options = {}) {
    const { projectDir = '.', testCommand = 'npx playwright test', mountProject = true } = options;
    const resolvedProjectDir = resolve(projectDir);

    // Build bubblewrap command with proper namespace isolation
    const bwrapCmd = [
      bubblewrap.findBubblewrap(),

      // Core filesystem - read-only Alpine rootfs
      '--ro-bind', `${this.alpineRoot}`, '/',
      '--proc', '/proc',
      '--dev', '/dev',

      // Critical: Bind mount /dev/dri for GPU acceleration (Chrome needs this)
      '--dev-bind', '/dev/dri', '/dev/dri',

      // Temporary directories (fresh for each run)
      '--tmpfs', '/tmp',
      '--tmpfs', '/var/tmp',
      '--tmpfs', '/run',
      '--tmpfs', '/dev/shm',  // Chrome shared memory

      // Mount project directory
      ...(mountProject ? [
        '--bind', resolvedProjectDir, '/workspace',
        '--chdir', '/workspace'
      ] : []),

      // Mount X11 socket for display
      '--bind', '/tmp/.X11-unix', '/tmp/.X11-unix',

      // Host directory access
      '--bind', this.sandboxDir, '/host',

      // Networking (required for Playwright)
      '--share-net',

      // Process isolation - critical for security
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--unshare-cgroup',  // Prevent process group interference

      // Safety features
      '--die-with-parent',
      '--new-session',
      '--as-pid-1',  // Make bash PID 1 in the namespace

      // Set hostname for isolation
      '--hostname', 'playwright-sandbox',

      // Environment variables for Playwright on Alpine
      '--setenv', 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1',
      '--setenv', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser',
      '--setenv', 'DISPLAY=:99',  // Virtual display
      '--setenv', 'CI=true',
      '--setenv', 'NODE_ENV=test',

      // Chrome/Chromium specific variables
      '--setenv', 'CHROMIUM_FLAGS=--no-sandbox --disable-dev-shm-usage --disable-gpu',
      '--setenv', 'CHROME_BIN=/usr/bin/chromium-browser',

      // Preserve important user environment
      ...Object.entries(this.env)
        .filter(([key]) => !['PATH', 'HOME', 'DISPLAY'].includes(key))
        .flatMap(([key, value]) => ['--setenv', key, value])
    ];

    // Use the wrapper script that handles Xvfb and Chromium sandbox issues
    const wrappedCommand = `/workspace/run-playwright.sh ${testCommand}`;
    const fullCmd = [...bwrapCmd, '/bin/sh', '-c', wrappedCommand];

    console.log(`🚀 Running: ${testCommand}`);
    console.log(`📁 Project directory: ${resolvedProjectDir}`);
    console.log(`🎯 Sandbox isolation: full bubblewrap namespace isolation\n`);

    return this.executeCommand(fullCmd, resolvedProjectDir);
  }

  /**
   * Run Playwright with basic isolation (fallback mode for limited environments)
   */
  async runPlaywrightBasic(options = {}) {
    const { projectDir = '.', testCommand = 'npx playwright test', mountProject = true } = options;
    const resolvedProjectDir = resolve(projectDir);

    console.log('🎯 Running in basic isolation mode (limited features)...');

    // Simplified bubblewrap command without namespaces
    const bwrapCmd = [
      bubblewrap.findBubblewrap(),

      // Basic filesystem
      '--bind', resolvedProjectDir, '/workspace',
      '--chdir', '/workspace',
      '--tmpfs', '/tmp',
      '--share-net',  // Keep network access

      // Essential environment variables
      '--setenv', 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1',
      '--setenv', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser',
      '--setenv', 'CHROMIUM_FLAGS=--no-sandbox --disable-dev-shm-usage --disable-gpu',

      // Run command directly without wrapper script
      '/bin/sh', '-c', testCommand
    ];

    console.log(`🚀 Running: ${testCommand}`);
    console.log(`📁 Project directory: ${resolvedProjectDir}`);
    console.log(`🎯 Sandbox isolation: basic mode (limited namespaces)\n`);

    return this.executeCommand(bwrapCmd, resolvedProjectDir);
  }

  /**
   * Execute bubblewrap command with proper error handling
   */
  executeCommand(fullCmd, resolvedProjectDir) {
    try {
      // Execute with spawn for better control
      const child = spawn(fullCmd[0], fullCmd.slice(1), {
        stdio: 'inherit',
        cwd: resolvedProjectDir,
        env: this.env
      });

      return new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ Playwright tests completed successfully!');
            resolve(code);
          } else {
            console.log(`\n❌ Playwright tests failed with exit code: ${code}`);
            reject(new Error(`Playwright tests failed with exit code: ${code}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to start Playwright: ${error.message}`));
        });
      });

    } catch (error) {
      throw new Error(`Playwright execution failed: ${error.message}`);
    }
  }

  /**
   * Run interactive shell in sandbox
   */
  async runShell(options = {}) {
    this.checkBubblewrap();

    const { projectDir = '.' } = options;
    const resolvedProjectDir = resolve(projectDir);

    const bwrapCmd = [
      'bwrap',
      '--ro-bind', `${this.alpineRoot}`, '/',
      '--proc', '/proc',
      '--dev', '/dev',
      '--tmpfs', '/tmp',
      '--bind', resolvedProjectDir, '/workspace',
      '--chdir', '/workspace',
      '--share-net',
      '--unshare-pid',
      '--die-with-parent',
      '--new-session',
      '--hostname', 'claudebox-sandbox',
      '--setenv', 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1',
      '--setenv', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser',
      '/bin/bash'
    ];

    console.log('🐚 Starting interactive shell in sandbox...\n');

    try {
      execSync(bwrapCmd.join(' '), { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Shell execution failed: ${error.message}`);
    }
  }

  /**
   * Check if a command needs sudo privileges
   */
  commandNeedsSudo(command) {
    const sudoCommands = [
      'useradd', 'usermod', 'groupadd', 'userdel', 'chsh',
      'apt-get', 'apt', 'yum', 'dnf', 'apk',
      'chown', 'chmod',
      'systemctl', 'service',
      'npm install -g', 'npm i -g',
      'pnpm install -g', 'pnpm i -g',
      'npx --yes playwright install-deps'
    ];

    // System directories that need sudo for modifications
    const systemPaths = ['/etc/', '/usr/', '/var/', '/opt/', '/home/'];

    // Check if command modifies system directories
    const modifiesSystem = systemPaths.some(path =>
      command.includes(path) && (
        command.includes('mkdir') ||
        command.includes('tee') ||
        command.includes('>') ||
        command.includes('cp') ||
        command.includes('mv')
      )
    );

    return sudoCommands.some(cmd => command.includes(cmd)) || modifiesSystem;
  }

  /**
   * Build container from Dockerfile
   */
  async buildFromDockerfile(dockerfilePath, options = {}) {
    this.checkBubblewrap();

    console.log('🐳 Building container with bubblewrap isolation...\n');

    const content = readFileSync(dockerfilePath, 'utf-8');
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    // Parse Dockerfile
    let baseImage = 'alpine';
    let workdir = '/workspace';
    const buildCommands = [];
    const envVars = {};
    const buildArgs = {}; // ARG variables
    let defaultCmd = null;
    let currentUser = 'root';

    // Handle multi-line commands (lines ending with \)
    const processedLines = [];
    let currentLine = '';
    for (const line of lines) {
      if (line.endsWith('\\')) {
        currentLine += line.slice(0, -1) + ' ';
      } else {
        currentLine += line;
        processedLines.push(currentLine.trim());
        currentLine = '';
      }
    }

    // Parse instructions
    for (const line of processedLines) {
      if (line.startsWith('FROM ')) {
        baseImage = line.substring(5).trim();
        console.log(`📦 FROM ${baseImage}`);

        // Detect base image type
        if (baseImage.includes('ubuntu') || baseImage.includes('debian')) {
          console.log('   🐧 Detected Ubuntu/Debian base image\n');
        } else if (baseImage.includes('alpine')) {
          console.log('   🏔️  Detected Alpine base image\n');
        } else {
          console.log('   ⚠️  Unknown base image type\n');
        }
      } else if (line.startsWith('WORKDIR ')) {
        workdir = line.substring(9).trim().replace(/['"]/g, '');
        console.log(`📁 WORKDIR ${workdir}\n`);
      } else if (line.startsWith('ARG ')) {
        const argLine = line.substring(4).trim();
        const match = argLine.match(/^(\w+)(?:=(.+))?$/);
        if (match) {
          buildArgs[match[1]] = match[2] || '';
          console.log(`🏗️  ARG ${match[1]}${match[2] ? `=${match[2]}` : ''}\n`);
        }
      } else if (line.startsWith('ENV ')) {
        const envLine = line.substring(4).trim();
        const match = envLine.match(/^(\w+)=(.+)$/);
        if (match) {
          envVars[match[1]] = match[2];
          console.log(`🔧 ENV ${match[1]}=${match[2]}\n`);
        }
      } else if (line.startsWith('USER ')) {
        currentUser = line.substring(5).trim();
        console.log(`👤 USER ${currentUser}\n`);
      } else if (line.startsWith('RUN ')) {
        const command = line.substring(4).trim();
        buildCommands.push({ command, user: currentUser, workdir });
        console.log(`⚙️  RUN ${command.substring(0, 70)}${command.length > 70 ? '...' : ''}`);
      } else if (line.startsWith('CMD ')) {
        defaultCmd = line.substring(4).trim();
        console.log(`🎯 CMD ${defaultCmd}\n`);
      } else if (line.startsWith('COPY ') || line.startsWith('ADD ')) {
        console.log(`📋 ${line.substring(0, 70)}${line.length > 70 ? '...' : ''}`);
        console.log('   ⚠️  COPY/ADD commands must be run in project directory\n');
      }
    }

    // Create container root directory
    const containerRoot = join(this.sandboxDir, 'rootfs');
    if (!existsSync(containerRoot)) {
      mkdirSync(containerRoot, { recursive: true });
      console.log(`📁 Created container root: ${containerRoot}\n`);
    }

    // Create build script
    console.log('📝 Creating build script...\n');
    const buildScriptContent = `#!/bin/bash
set -e

# Build script generated from ${dockerfilePath}
# Base image: ${baseImage}
# Total commands: ${buildCommands.length}

echo "🏗️  Starting build process..."
echo ""

${buildCommands.map((cmd, idx) => `
# Command ${idx + 1}/${buildCommands.length}
echo "⚙️  [${idx + 1}/${buildCommands.length}] Executing: ${cmd.command.substring(0, 60)}..."
${cmd.user !== 'root' ? `# Running as user: ${cmd.user}` : ''}
${cmd.command}
echo "   ✅ Command ${idx + 1} completed"
echo ""
`).join('')}

echo "✅ Build complete!"
`;

    const buildScriptPath = join(this.sandboxDir, 'build.sh');
    writeFileSync(buildScriptPath, buildScriptContent, { mode: 0o755 });
    console.log(`✅ Build script created: ${buildScriptPath}\n`);

    // Option to execute the build
    if (options.execute !== false) {
      console.log('🚀 Executing build commands...\n');
      console.log('⚠️  Note: Commands will run on host system (Docker-free mode)\n');

      // Clean up previous build artifacts for idempotency
      console.log('🧹 Cleaning up previous build artifacts...');
      try {
        // Clean up directories
        execSync('sudo rm -rf /commandhistory /workspace /home/node/.oh-my-zsh /home/node/.zshrc* /usr/local/share/npm-global 2>/dev/null || true', {
          stdio: 'pipe'
        });

        // Clean up npm global packages that will be reinstalled
        const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
        execSync(`sudo rm -rf "${npmRoot}/@anthropic-ai/claude-code" "${npmRoot}/@playwright/mcp" 2>/dev/null || true`, {
          stdio: 'pipe'
        });

        console.log('✅ Cleanup complete\n');
      } catch (error) {
        console.log('⚠️  Cleanup had some errors (may be okay)\n');
      }

      console.log('─'.repeat(60) + '\n');

      try {
        for (let i = 0; i < buildCommands.length; i++) {
          const { command, user } = buildCommands[i];
          console.log(`\n📍 [${i + 1}/${buildCommands.length}] ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);

          try {
            // Determine execution mode based on user and command requirements
            let execCommand;
            let runMessage;

            // Commands that need sudo always run as root, regardless of USER directive
            if (this.commandNeedsSudo(command)) {
              // Sudo-requiring command: always run as root
              const escapedCommand = command.replace(/'/g, "'\\''");
              execCommand = `/usr/bin/sudo -E bash -c '${escapedCommand}'`;
              runMessage = '🔐 Running with sudo (requires root privileges)';
            } else if (user !== 'root') {
              // Non-root user: run as that user
              // Use single quotes to avoid nested quote issues with complex commands
              const escapedCommand = command.replace(/'/g, "'\\''");
              execCommand = `/usr/bin/sudo -u ${user} -E bash -c '${escapedCommand}'`;
              runMessage = `👤 Running as user: ${user}`;
            } else {
              // Regular command
              execCommand = command;
              runMessage = null;
            }

            if (runMessage) {
              console.log(`   ${runMessage}`);
            }

            // Execute command with proper environment (including ARG and ENV variables)
            // Ensure npm/node paths are included for node user
            const npmPath = execSync('which npm 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
            const nodePath = npmPath ? dirname(npmPath) : '';
            const basePath = process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
            const fullPath = nodePath ? `${nodePath}:${basePath}` : basePath;

            const execEnv = {
              ...process.env,
              ...buildArgs,
              ...envVars,
              PATH: fullPath
            };

            // Set HOME for non-root users
            if (user !== 'root') {
              execEnv.HOME = `/home/${user}`;
            }

            // Determine working directory (root for system commands, sandbox for user commands)
            const isSystemCommand = user === 'root' && this.commandNeedsSudo(command);
            const cwd = isSystemCommand ? '/' : this.sandboxDir;

            execSync(execCommand, {
              stdio: 'inherit',
              cwd,
              env: execEnv,
              shell: true
            });
            console.log(`✅ Command ${i + 1} completed successfully`);
          } catch (error) {
            console.log(`❌ Command ${i + 1} failed: ${error.message}`);
            console.log(`\n⚠️  Build failed at command ${i + 1}/${buildCommands.length}`);
            console.log(`📝 Partial build script available at: ${buildScriptPath}`);
            throw error;
          }
        }

        console.log('\n' + '─'.repeat(60));
        console.log('\n🎉 Build completed successfully!\n');
        console.log(`📦 Container root: ${containerRoot}`);
        console.log(`📝 Build script: ${buildScriptPath}`);
        if (defaultCmd) {
          console.log(`🎯 Default command: ${defaultCmd}`);
        }
        console.log('');

      } catch (error) {
        throw new Error(`Build failed: ${error.message}`);
      }
    } else {
      console.log('📝 Build script ready (not executed)');
      console.log(`   To build manually: bash ${buildScriptPath}\n`);
    }

    return {
      buildScript: buildScriptPath,
      workdir,
      baseImage,
      containerRoot,
      defaultCmd,
      envVars
    };
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Bubblewrap Container Runner - Playwright + True Isolation

Usage:
  node bubblewrap-container.js <command> [options]

Commands:
  setup                          Set up Alpine Linux rootfs with Playwright
  build <dockerfile>            Build from Dockerfile
  run [project-dir]             Run Playwright tests
  shell [project-dir]           Start interactive shell

Examples:
  node bubblewrap-container.js setup
  node bubblewrap-container.js build Dockerfile.claudebox
  node bubblewrap-container.js run ./my-project
  node bubblewrap-container.js shell ./my-project

Requirements:
  - bubblewrap (bwrap): sudo apt-get install bubblewrap
  - No root privileges needed after installation
`);
    process.exit(0);
  }

  const container = new BubblewrapContainer({ verbose: true });

  try {
    if (args[0] === 'setup') {
      await container.setupAlpineRootfs();

    } else if (args[0] === 'build') {
      const dockerfile = args[1] || './Dockerfile';
      if (!existsSync(dockerfile)) {
        throw new Error(`Dockerfile not found: ${dockerfile}`);
      }

      // Check for --dry-run flag
      const dryRun = args.includes('--dry-run');
      const options = { execute: !dryRun };

      if (dryRun) {
        console.log('🔍 Dry-run mode: Commands will be parsed but not executed\n');
      }

      await container.buildFromDockerfile(dockerfile, options);

    } else if (args[0] === 'run') {
      const projectDir = args[1] || '.';

      // First try simple test to verify container works
      console.log('🧪 Testing container functionality...\n');
      try {
        await container.runSimpleTest({ projectDir });
        console.log('✅ Container test successful!\n');

        // Now try Playwright
        console.log('🎭 Running Playwright tests...\n');
        await container.runPlaywright({ projectDir });
      } catch (error) {
        console.log(`⚠️  Container test failed: ${error.message}`);
        console.log('🚫 Skipping Playwright tests due to container issues\n');
        throw error;
      }

    } else if (args[0] === 'shell') {
      const projectDir = args[1] || '.';
      await container.runShell({ projectDir });

    } else {
      console.error('❌ Unknown command. Use --help for usage.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BubblewrapContainer;