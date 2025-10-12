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
        timeout: 300000 // 5 minutes for container builds
      });
      console.log(color('green', '\n✅ Container built successfully!'));
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries && (error.message.includes('Cannot connect to Podman') || error.message.includes('connectex') || error.message.includes('No connection could be made') || error.message.includes('actively refused') || error.message.includes('Command failed'))) {
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
      // Try container operation first
      const containerOptions = {
        stdio: process.platform === 'win32' ? ['pipe', 'pipe', 'pipe'] : 'inherit',
        shell: process.platform === 'win32',
        windowsHide: process.platform === 'win32',
        timeout: 30000 // 30 second timeout
      };

      // For echo command, capture and display output
      if (cmd === 'echo' || cmd.startsWith('echo ')) {
        const echoCmd = cmd.replace('echo ', '');
        const output = execSync(`"${podmanPath}" run --rm ${mounts.join(' ')} -w /workspace sandboxbox:latest echo ${echoCmd}`, {
          ...containerOptions,
          encoding: 'utf8'
        }).trim();
        console.log(output);
      } else {
        // For longer-running commands, use extended timeout
        const longRunningOptions = {
          ...containerOptions,
          timeout: 600000 // 10 minutes for longer operations
        };
        execSync(`"${podmanPath}" run --rm -it ${mounts.join(' ')} -w /workspace sandboxbox:latest ${cmd}`, longRunningOptions);
      }

      cleanup();
      console.log(color('green', '\n✅ Container execution completed! (Isolated - no host changes)'));
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries && (error.message.includes('Cannot connect to Podman') || error.message.includes('connectex') || error.message.includes('No connection could be made') || error.message.includes('actively refused') || error.message.includes('Command failed'))) {
        console.log(color('yellow', `   Backend not ready yet (${retries}/${maxRetries}), initializing machine...`));

        // Actually initialize the machine instead of just waiting
        if (process.platform === 'win32') {
          try {
            // First try to start existing machine
            console.log(color('cyan', '   Starting Podman machine...'));
            execSync(`"${podmanPath}" machine start`, {
              stdio: 'pipe',
              shell: true,
              windowsHide: true,
              timeout: 60000 // 1 minute for machine start
            });

            console.log(color('green', '   ✅ Podman machine started!'));
            // Wait a bit more for machine to be fully ready
            console.log(color('cyan', '   Waiting 5 seconds for machine to fully initialize...'));
            const readyStart = Date.now();
            while (Date.now() - readyStart < 5000) {
              // Wait 5 seconds
            }
            continue; // Try container again
          } catch (startError) {
            // Machine doesn't exist or failed to start, try initializing it
            if (startError.message.includes('does not exist') || startError.message.includes('not found')) {
              try {
                console.log(color('cyan', '   Initializing new Podman machine...'));
                execSync(`"${podmanPath}" machine init --rootful=false`, {
                  stdio: 'pipe',
                  shell: true,
                  windowsHide: true,
                  timeout: 180000 // 3 minutes for machine init
                });

                console.log(color('cyan', '   Starting new Podman machine...'));
                execSync(`"${podmanPath}" machine start`, {
                  stdio: 'pipe',
                  shell: true,
                  windowsHide: true,
                  timeout: 60000 // 1 minute for machine start
                });

                console.log(color('green', '   ✅ Podman machine ready!'));
                continue; // Try container again immediately
              } catch (initError) {
                console.log(color('red', `   Machine init failed: ${initError.message}`));
              }
            } else {
              console.log(color('red', `   Machine start failed: ${startError.message}`));
            }
          }
        }

        // If machine setup failed or not Windows, wait and retry
        console.log(color('yellow', `   Waiting 15 seconds before retry...`));
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
        stdio: process.platform === 'win32' ? ['pipe', 'pipe', 'pipe'] : 'inherit',
        shell: process.platform === 'win32',
        windowsHide: process.platform === 'win32',
        timeout: 600000 // 10 minutes for interactive shell sessions
      });

      cleanup();
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries && (error.message.includes('Cannot connect to Podman') || error.message.includes('connectex') || error.message.includes('No connection could be made') || error.message.includes('actively refused') || error.message.includes('Command failed'))) {
        console.log(color('yellow', `   Backend not ready yet (${retries}/${maxRetries}), initializing machine...`));

        // Actually initialize the machine instead of just waiting
        if (process.platform === 'win32') {
          try {
            // First try to start existing machine
            console.log(color('cyan', '   Starting Podman machine...'));
            execSync(`"${podmanPath}" machine start`, {
              stdio: 'pipe',
              shell: true,
              windowsHide: true,
              timeout: 60000 // 1 minute for machine start
            });

            console.log(color('green', '   ✅ Podman machine started!'));
            // Wait a bit more for machine to be fully ready
            console.log(color('cyan', '   Waiting 5 seconds for machine to fully initialize...'));
            const readyStart = Date.now();
            while (Date.now() - readyStart < 5000) {
              // Wait 5 seconds
            }
            continue; // Try container again
          } catch (startError) {
            // Machine doesn't exist or failed to start, try initializing it
            if (startError.message.includes('does not exist') || startError.message.includes('not found')) {
              try {
                console.log(color('cyan', '   Initializing new Podman machine...'));
                execSync(`"${podmanPath}" machine init --rootful=false`, {
                  stdio: 'pipe',
                  shell: true,
                  windowsHide: true,
                  timeout: 180000 // 3 minutes for machine init
                });

                console.log(color('cyan', '   Starting new Podman machine...'));
                execSync(`"${podmanPath}" machine start`, {
                  stdio: 'pipe',
                  shell: true,
                  windowsHide: true,
                  timeout: 60000 // 1 minute for machine start
                });

                console.log(color('green', '   ✅ Podman machine ready!'));
                continue; // Try container again immediately
              } catch (initError) {
                console.log(color('red', `   Machine init failed: ${initError.message}`));
              }
            } else {
              console.log(color('red', `   Machine start failed: ${startError.message}`));
            }
          }
        }

        // If machine setup failed or not Windows, wait and retry
        console.log(color('yellow', `   Waiting 15 seconds before retry...`));
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
