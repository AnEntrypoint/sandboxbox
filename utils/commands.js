import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { color } from './colors.js';
import { checkPodman, getPodmanPath, ensureBackend } from './podman.js';
import { buildClaudeContainerCommand, createClaudeDockerfile } from './claude-workspace.js';
import { createIsolatedEnvironment, setupCleanupHandlers, buildContainerMounts } from './isolation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildCommand(dockerfilePath) {
  if (!existsSync(dockerfilePath)) {
    console.log(color('red', `❌ Dockerfile not found: ${dockerfilePath}`));
    return false;
  }

  console.log(color('blue', '🏗️  Building container...'));
  console.log(color('yellow', `Dockerfile: ${dockerfilePath}\n`));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;

  ensureBackend(podmanPath);

  try {
    execSync(`"${podmanPath}" build -f "${dockerfilePath}" -t sandboxbox:latest .`, {
      stdio: 'inherit',
      cwd: dirname(dockerfilePath),
      shell: process.platform === 'win32'
    });
    console.log(color('green', '\n✅ Container built successfully!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Build failed: ${error.message}`));
    return false;
  }
}

export function runCommand(projectDir, cmd = 'bash') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  console.log(color('blue', '🚀 Running project in isolated container...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${cmd}\n`));
  console.log(color('cyan', '📦 Note: Changes will NOT affect host files (isolated environment)'));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;

  ensureBackend(podmanPath);

  try {
    const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
    setupCleanupHandlers(cleanup);
    const mounts = buildContainerMounts(tempProjectDir, projectDir);

    execSync(`"${podmanPath}" run --rm -it ${mounts.join(' ')} -w /workspace sandboxbox:latest ${cmd}`, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    cleanup();
    console.log(color('green', '\n✅ Container execution completed! (Isolated - no host changes)'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Run failed: ${error.message}`));
    return false;
  }
}

export function shellCommand(projectDir) {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  console.log(color('blue', '🐚 Starting interactive shell in isolated container...'));
  console.log(color('yellow', `Project: ${projectDir}\n`));
  console.log(color('cyan', '📦 Note: Changes will NOT affect host files (isolated environment)'));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;

  ensureBackend(podmanPath);

  try {
    const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
    setupCleanupHandlers(cleanup);
    const mounts = buildContainerMounts(tempProjectDir, projectDir);

    execSync(`"${podmanPath}" run --rm -it ${mounts.join(' ')} -w /workspace sandboxbox:latest /bin/bash`, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    cleanup();
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Shell failed: ${error.message}`));
    return false;
  }
}

export function claudeCommand(projectDir, command = 'claude') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  if (!existsSync(resolve(projectDir, '.git'))) {
    console.log(color('red', `❌ Not a git repository: ${projectDir}`));
    console.log(color('yellow', 'Please run this command in a git repository directory'));
    return false;
  }

  const podmanPath = getPodmanPath();
  try {
    execSync(`"${podmanPath}" image inspect sandboxbox-local:latest`, {
      stdio: 'pipe',
      shell: process.platform === 'win32'
    });
  } catch {
    console.log(color('yellow', '📦 Building Claude Code container...'));
    if (!buildClaudeContainer()) {
      return false;
    }
  }

  console.log(color('blue', '🚀 Starting Claude Code in isolated environment...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${command}`));
  console.log(color('cyan', '📦 Note: Changes will be isolated and will NOT affect the original repository\n'));

  const buildPodman = checkPodman();
  if (!buildPodman) return false;

  ensureBackend(buildPodman);

  try {
    const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
    setupCleanupHandlers(cleanup);
    const mounts = buildContainerMounts(tempProjectDir, projectDir);
    const containerCommand = buildClaudeContainerCommand(tempProjectDir, buildPodman, command, mounts);

    execSync(containerCommand, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    cleanup();
    console.log(color('green', '\n✅ Claude Code session completed! (Isolated - no host changes)'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
    return false;
  }
}

export function versionCommand() {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
    console.log(color('green', `SandboxBox v${packageJson.version}`));
    console.log(color('cyan', 'Portable containers with Claude Code integration'));
    if (checkPodman()) {
      console.log('');
    }
    return true;
  } catch (error) {
    console.log(color('red', '❌ Could not read version'));
    return false;
  }
}

function buildClaudeContainer() {
  const dockerfilePath = resolve(__dirname, '../Dockerfile.claude');
  const dockerfileContent = createClaudeDockerfile();

  writeFileSync(dockerfilePath, dockerfileContent);
  console.log(color('blue', '🏗️  Building Claude Code container...'));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;

  ensureBackend(podmanPath);

  try {
    execSync(`"${podmanPath}" build -f "${dockerfilePath}" -t sandboxbox-local:latest .`, {
      stdio: 'inherit',
      cwd: dirname(__dirname),
      shell: process.platform === 'win32'
    });
    console.log(color('green', '\n✅ Claude Code container built successfully!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Build failed: ${error.message}`));
    return false;
  }
}