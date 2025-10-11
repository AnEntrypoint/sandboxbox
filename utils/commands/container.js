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

  // Start backend setup but don't block on Windows/macOS
  const backendReady = setupBackendNonBlocking(podmanPath);
  if (process.platform === 'linux' && !backendReady) {
    return false; // Only block on Linux for rootless service
  }

  // Retry container operation with backend readiness check
  let retries = 0;
  const maxRetries = process.platform === 'linux' ? 3 : 12; // More retries for Windows/macOS

  while (retries < maxRetries) {
    try {
      execSync(`"${podmanPath}" build -f "${dockerfilePath}" -t sandboxbox:latest .`, {
        stdio: 'inherit',
        cwd: dirname(dockerfilePath),
        shell: process.platform === 'win32',
        windowsHide: process.platform === 'win32',
        timeout: 30000 // 30 second timeout
      });
      console.log(color('green', '\n✅ Container built successfully!'));
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
      console.log(color('red', `\n❌ Build failed: ${error.message}`));
      return false;
    }
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

  // Start backend setup but don't block on Windows/macOS
  const backendReady = setupBackendNonBlocking(podmanPath);
  if (process.platform === 'linux' && !backendReady) {
    return false; // Only block on Linux for rootless service
  }

  // Create isolated environment once (outside retry loop)
  const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
  setupCleanupHandlers(cleanup);
  const mounts = buildContainerMounts(tempProjectDir, projectDir);

  // Retry container operation with backend readiness check
  let retries = 0;
  const maxRetries = process.platform === 'linux' ? 3 : 12; // More retries for Windows/macOS

  while (retries < maxRetries) {
    try {
      execSync(`"${podmanPath}" run --rm -it ${mounts.join(' ')} -w /workspace sandboxbox:latest ${cmd}`, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: process.platform === 'win32',
        timeout: 30000 // 30 second timeout
      });

      cleanup();
      console.log(color('green', '\n✅ Container execution completed! (Isolated - no host changes)'));
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
      console.log(color('red', `\n❌ Run failed: ${error.message}`));
      return false;
    }
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

  // Start backend setup but don't block on Windows/macOS
  const backendReady = setupBackendNonBlocking(podmanPath);
  if (process.platform === 'linux' && !backendReady) {
    return false; // Only block on Linux for rootless service
  }

  // Create isolated environment once (outside retry loop)
  const { tempProjectDir, cleanup } = createIsolatedEnvironment(projectDir);
  setupCleanupHandlers(cleanup);
  const mounts = buildContainerMounts(tempProjectDir, projectDir);

  // Retry container operation with backend readiness check
  let retries = 0;
  const maxRetries = process.platform === 'linux' ? 3 : 12; // More retries for Windows/macOS

  while (retries < maxRetries) {
    try {
      execSync(`"${podmanPath}" run --rm -it ${mounts.join(' ')} -w /workspace sandboxbox:latest /bin/bash`, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: process.platform === 'win32',
        timeout: 30000 // 30 second timeout
      });

      cleanup();
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
      console.log(color('red', `\n❌ Shell failed: ${error.message}`));
      return false;
    }
  }
}
