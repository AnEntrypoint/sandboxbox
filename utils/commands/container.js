import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { color } from '../colors.js';
import { checkPodman, setupBackendNonBlocking } from '../podman.js';
import { createIsolatedEnvironment, setupCleanupHandlers, buildContainerMounts } from '../isolation.js';

export function buildCommand(dockerfilePath) {
  if (!existsSync(dockerfilePath)) {
    console.log(color('red', `❌ Dockerfile not found: ${dockerfilePath}`));
    return false;
  }

  console.log(color('blue', '🏗️  Building container...'));
  console.log(color('yellow', `Dockerfile: ${dockerfilePath}\n`));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;
  if (!setupBackendNonBlocking(podmanPath)) return false;

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
  if (!setupBackendNonBlocking(podmanPath)) return false;

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
  if (!setupBackendNonBlocking(podmanPath)) return false;

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
