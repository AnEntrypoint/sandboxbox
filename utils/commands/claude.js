import { existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { color } from '../colors.js';
import { checkPodman, setupBackendNonBlocking, getPodmanPath } from '../podman.js';
import { buildClaudeContainerCommand, createClaudeDockerfile } from '../claude-workspace.js';
import { createIsolatedEnvironment, setupCleanupHandlers, buildContainerMounts } from '../isolation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      shell: process.platform === 'win32',
      windowsHide: process.platform === 'win32'
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
  if (!setupBackendNonBlocking(buildPodman)) return false;

  // Create isolated environment once (outside retry loop)
  const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
  setupCleanupHandlers(cleanup);
  const mounts = buildContainerMounts(tempProjectDir, projectDir);
  const containerCommand = buildClaudeContainerCommand(tempProjectDir, buildPodman, command, mounts);

  // Retry container operation with backend readiness check
  let retries = 0;
  const maxRetries = process.platform === 'linux' ? 3 : 12; // More retries for Windows/macOS

  while (retries < maxRetries) {
    try {
      execSync(containerCommand, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: process.platform === 'win32',
        timeout: 30000 // 30 second timeout
      });

      cleanup();
      console.log(color('green', '\n✅ Claude Code session completed! (Isolated - no host changes)'));
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries && error.message.includes('Cannot connect to Podman')) {
        console.log(color('yellow', `   Backend not ready yet (${retries}/${maxRetries}), waiting 15 seconds...`));
        const start = Date.now();
        while (Date.now() - start < 15000) {
          // Wait 15 seconds
        }
        continue;
      }
      cleanup(); // Cleanup on final failure
      console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
      return false;
    }
  }
}

function buildClaudeContainer() {
  const dockerfilePath = resolve(__dirname, '..', '..', 'Dockerfile.claude');
  const dockerfileContent = createClaudeDockerfile();

  writeFileSync(dockerfilePath, dockerfileContent);
  console.log(color('blue', '🏗️  Building Claude Code container...'));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;
  if (!setupBackendNonBlocking(podmanPath)) return false;

  try {
    execSync(`"${podmanPath}" build -f "${dockerfilePath}" -t sandboxbox-local:latest .`, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..', '..'),
      shell: process.platform === 'win32',
      windowsHide: process.platform === 'win32'
    });
    console.log(color('green', '\n✅ Claude Code container built successfully!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Build failed: ${error.message}`));
    return false;
  }
}
