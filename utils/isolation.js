import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Builds container volume mounts with git identity and host remote
 * @param {string} tempProjectDir - Temporary project directory
 * @param {string} originalProjectDir - Original host project directory
 * @returns {Array} - Array of volume mount strings
 */
export function buildContainerMounts(tempProjectDir, originalProjectDir) {
  const mounts = [`-v "${tempProjectDir}:/workspace:rw"`];

  // Add host repository as git remote
  mounts.push(`-v "${originalProjectDir}:/host-repo:rw"`);

  // Add git identity mounts
  const homeDir = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;

  if (existsSync(`${homeDir}/.gitconfig`)) {
    mounts.push(`-v "${homeDir}/.gitconfig:/root/.gitconfig:ro"`);
  }

  if (existsSync(`${homeDir}/.ssh`)) {
    mounts.push(`-v "${homeDir}/.ssh:/root/.ssh:ro"`);
  }

  return mounts;
}

/**
 * Creates an isolated temporary environment for running commands
 * @param {string} projectDir - Source project directory
 * @returns {Object} - Contains tempDir, tempProjectDir, and cleanup function
 */
export function createIsolatedEnvironment(projectDir) {
  const tempDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
  const projectName = projectDir.split(/[\\\/]/).pop() || 'project';
  const tempProjectDir = join(tempDir, projectName);

  // Copy project to temporary directory (creates isolation)
  // First create the directory (cross-platform)
  if (process.platform === 'win32') {
    execSync(`powershell -Command "New-Item -ItemType Directory -Path '${tempProjectDir}' -Force"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true,
      timeout: 30000
    });
  } else {
    execSync(`mkdir -p "${tempProjectDir}"`, {
      stdio: 'pipe',
      shell: true,
      timeout: 30000
    });
  }

  if (process.platform === 'win32') {
    // Windows approach - include hidden files like .git
    execSync(`powershell -Command "Copy-Item -Path '${projectDir}\\*' -Destination '${tempProjectDir}' -Recurse -Force -Exclude 'node_modules'"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true,
      timeout: 60000 // Copy operations can take longer
    });
    // Also copy hidden files separately
    execSync(`powershell -Command "Get-ChildItem -Path '${projectDir}' -Force -Name | Where-Object { $_ -like '.*' } | ForEach-Object { Copy-Item -Path (Join-Path '${projectDir}' $_) -Destination '${tempProjectDir}' -Recurse -Force }"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true,
      timeout: 60000
    });
  } else {
    // Unix approach - include hidden files
    execSync(`cp -r "${projectDir}"/.* "${tempProjectDir}/" 2>/dev/null || true`, {
      stdio: 'pipe',
      shell: true,
      timeout: 60000
    });
    execSync(`cp -r "${projectDir}"/* "${tempProjectDir}/"`, {
      stdio: 'pipe',
      shell: true,
      timeout: 60000
    });
  }

  // Configure git remote to point to mounted host repository (only if git repo)
  try {
    // Check if the project directory is a git repository
    const gitDirPath = process.platform === 'win32'
      ? `${projectDir}\\.git`
      : `${projectDir}/.git`;

    if (!existsSync(gitDirPath)) {
      // Not a git repository, skip git setup
      // Define cleanup function early for early return
      const cleanup = () => {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      };
      return { tempDir, tempProjectDir, cleanup };
    }

    // Also check if the temp directory has .git after copy
    const tempGitDirPath = process.platform === 'win32'
      ? `${tempProjectDir}\\.git`
      : `${tempProjectDir}/.git`;

    if (!existsSync(tempGitDirPath)) {
      // Copy didn't preserve git, skip git setup
      // Define cleanup function early for early return
      const cleanup = () => {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      };
      return { tempDir, tempProjectDir, cleanup };
    }

    // Normalize paths for cross-platform compatibility
    const normalizedTempDir = tempProjectDir.replace(/\\/g, '/');
    const normalizedOriginalDir = projectDir.replace(/\\/g, '/');

    // Configure git to allow operations in mounted directories
    execSync(`git config --global --add safe.directory /workspace`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: process.platform === 'win32',
      timeout: 10000
    });

    // Configure host repository to accept pushes to checked-out branch
    if (process.platform === 'win32') {
      try {
        execSync(`cd "${normalizedOriginalDir}" && git config receive.denyCurrentBranch ignore`, {
          stdio: 'pipe',
          shell: true,
          windowsHide: true,
          timeout: 10000
        });
      } catch (e) {
        // Ignore if git config fails
      }
    } else {
      execSync(`cd "${normalizedOriginalDir}" && git config receive.denyCurrentBranch ignore`, {
        stdio: 'pipe',
        shell: true,
        timeout: 10000
      });
    }

    // Remove any existing origin first (Windows-compatible)
    if (process.platform === 'win32') {
      try {
        execSync(`cd "${normalizedTempDir}" && git remote remove origin`, {
          stdio: 'pipe',
          shell: true,
          windowsHide: true,
          timeout: 10000
        });
      } catch (e) {
        // Ignore if origin doesn't exist
      }
    } else {
      execSync(`cd "${normalizedTempDir}" && git remote remove origin 2>/dev/null || true`, {
        stdio: 'pipe',
        shell: true,
        timeout: 10000
      });
    }

    // Add origin pointing to mounted host repository (accessible from container)
    execSync(`cd "${normalizedTempDir}" && git remote add origin /host-repo`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: process.platform === 'win32',
      timeout: 10000
    });

    // Set up upstream tracking for current branch (use push -u to set upstream)
    const currentBranch = execSync(`cd "${normalizedTempDir}" && git branch --show-current`, {
      encoding: 'utf8',
      stdio: 'pipe',
      windowsHide: process.platform === 'win32',
      timeout: 10000
    }).trim();

    // Note: Upstream will be set automatically on first push with -u flag
    // No need to set up upstream manually as it may not exist yet
  } catch (error) {
    // Log git remote setup errors for debugging
    console.error(`Git remote setup failed: ${error.message}`);
  }

  // Ensure cleanup on exit
  const cleanup = () => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  };

  return { tempDir, tempProjectDir, cleanup };
}

/**
 * Sets up cleanup handlers for process signals
 * @param {Function} cleanup - Cleanup function to call
 */
export function setupCleanupHandlers(cleanup) {
  // Set up cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
}