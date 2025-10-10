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
      shell: true
    });
  } else {
    execSync(`mkdir -p "${tempProjectDir}"`, {
      stdio: 'pipe',
      shell: true
    });
  }

  if (process.platform === 'win32') {
    // Windows approach - include hidden files like .git
    execSync(`powershell -Command "Copy-Item -Path '${projectDir}\\*' -Destination '${tempProjectDir}' -Recurse -Force -Exclude 'node_modules'"`, {
      stdio: 'pipe',
      shell: true
    });
    // Also copy hidden files separately
    execSync(`powershell -Command "Get-ChildItem -Path '${projectDir}' -Force -Name | Where-Object { $_ -like '.*' } | ForEach-Object { Copy-Item -Path (Join-Path '${projectDir}' $_) -Destination '${tempProjectDir}' -Recurse -Force }"`, {
      stdio: 'pipe',
      shell: true
    });
  } else {
    // Unix approach - include hidden files
    execSync(`cp -r "${projectDir}"/.* "${tempProjectDir}/" 2>/dev/null || true`, {
      stdio: 'pipe',
      shell: true
    });
    execSync(`cp -r "${projectDir}"/* "${tempProjectDir}/"`, {
      stdio: 'pipe',
      shell: true
    });
  }

  // Configure git remote to point to mounted host repository
  try {
    // Remove any existing origin first
    execSync(`cd "${tempProjectDir}" && git remote remove origin 2>/dev/null || true`, {
      stdio: 'pipe',
      shell: true
    });

    // Add origin pointing to mounted host repository (accessible from container)
    execSync(`cd "${tempProjectDir}" && git remote add origin /host-repo`, {
      stdio: 'pipe',
      shell: true
    });

    // Set up upstream tracking for current branch
    const currentBranch = execSync(`cd "${tempProjectDir}" && git branch --show-current`, {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    execSync(`cd "${tempProjectDir}" && git branch --set-upstream-to=origin/${currentBranch} ${currentBranch}`, {
      stdio: 'pipe',
      shell: true
    });
  } catch (error) {
    // Ignore git remote setup errors - container will still work
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