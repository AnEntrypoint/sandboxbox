import { mkdtempSync, rmSync, cpSync, existsSync, mkdirSync, writeFileSync, symlinkSync } from 'fs';
import { tmpdir, homedir, platform } from 'os';
import { join, resolve } from 'path';
import { spawn, execSync } from 'child_process';

export function createSandbox(projectDir) {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
  const workspaceDir = join(sandboxDir, 'workspace');

  // Ensure host directory is a git repository
  if (!existsSync(join(projectDir, '.git'))) {
    // Initialize git repository in host directory if it doesn't exist
    execSync(`git init "${projectDir}"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  }

  // Configure global git safe directories
  execSync(`git config --global --add safe.directory "${projectDir}"`, {
    stdio: 'pipe',
    shell: true,
    windowsHide: true
  });
  execSync(`git config --global --add safe.directory "${projectDir}/.git"`, {
    stdio: 'pipe',
    shell: true,
    windowsHide: true
  });

  // Configure host repository to accept pushes to current branch
  execSync(`cd "${projectDir}" && git config receive.denyCurrentBranch updateInstead`, {
    stdio: 'pipe',
    shell: true,
    windowsHide: true
  });

  // Copy/clone the project to workspace
  if (existsSync(join(projectDir, '.git'))) {
    // If it's a git repo, do a shallow clone
    execSync(`git clone --depth 1 --no-tags "${projectDir}" "${workspaceDir}"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  } else {
    // If not a git repo, just copy the files
    mkdirSync(workspaceDir, { recursive: true });
    execSync(`cp -r "${projectDir}"/* "${workspaceDir}/"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
    // Initialize git in workspace
    execSync(`git init "${workspaceDir}"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  }

  // Set up host repo as origin in sandbox (pointing to host directory)
  try {
    execSync(`git remote add origin "${projectDir}"`, {
      cwd: workspaceDir,
      stdio: 'pipe',
      shell: true
    });
  } catch (e) {
    // Remote already exists, update it
    execSync(`git remote set-url origin "${projectDir}"`, {
      cwd: workspaceDir,
      stdio: 'pipe',
      shell: true
    });
  }

  // Set up upstream tracking for current branch
  try {
    const currentBranch = execSync(`git branch --show-current`, {
      cwd: workspaceDir,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    execSync(`git branch --set-upstream-to=origin/${currentBranch} ${currentBranch}`, {
      cwd: workspaceDir,
      stdio: 'pipe',
      shell: true
    });
  } catch (e) {
    // Upstream may not exist yet, ignore error
  }

  // Batch fetch git identity settings for efficiency
  const gitSettings = execSync(`git config --global --get user.name && git config --global --get user.email && git config --global --get color.ui`, {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8'
  }).trim().split('\n');

  const [userName, userEmail, colorUi] = gitSettings;

  // Batch configure git settings in sandbox
  execSync(`git config user.name "${userName}" && git config user.email "${userEmail}" && git config color.ui "${colorUi}"`, {
    cwd: workspaceDir,
    stdio: 'pipe',
    shell: true
  });

  // Create symbolic link to host's .claude directory instead of copying
  // This ensures access to the latest credentials and settings
  const hostClaudeDir = join(homedir(), '.claude');
  const sandboxClaudeDir = join(sandboxDir, '.claude');

  if (existsSync(hostClaudeDir)) {
    try {
      // Create symbolic link to host .claude directory
      symlinkSync(hostClaudeDir, sandboxClaudeDir, 'dir');
      console.log('✅ Linked to host Claude settings directory');
    } catch (error) {
      // Fallback to copying if symlink fails
      console.log('⚠️  Could not create symlink, copying Claude settings instead');
      mkdirSync(sandboxClaudeDir, { recursive: true });

      // Copy only essential files (avoid large files like history)
      const essentialFiles = [
        'settings.json',
        '.credentials.json'
      ];

      // Copy files efficiently
      for (const file of essentialFiles) {
        const hostFile = join(hostClaudeDir, file);
        const sandboxFile = join(sandboxClaudeDir, file);

        if (existsSync(hostFile)) {
          cpSync(hostFile, sandboxFile);
        }
      }

      // Copy plugins directory if it exists (but skip large cache files)
      const pluginsDir = join(hostClaudeDir, 'plugins');
      if (existsSync(pluginsDir)) {
        const sandboxPluginsDir = join(sandboxClaudeDir, 'plugins');
        cpSync(pluginsDir, sandboxPluginsDir, { recursive: true });
      }
    }
  }

  // Optimize cache directory handling - use symlinks instead of copying
  const hostCacheDir = join(homedir(), '.cache');
  if (existsSync(hostCacheDir)) {
    const sandboxCacheDir = join(sandboxDir, '.cache');
    mkdirSync(sandboxCacheDir, { recursive: true });

    // Create symlink to ms-playwright cache instead of copying (major performance improvement)
    const playwrightCacheDir = join(hostCacheDir, 'ms-playwright');
    if (existsSync(playwrightCacheDir)) {
      const sandboxPlaywrightDir = join(sandboxCacheDir, 'ms-playwright');
      try {
        symlinkSync(playwrightCacheDir, sandboxPlaywrightDir, 'dir');
      } catch (error) {
        // Fallback to copying only if symlink fails
        cpSync(playwrightCacheDir, sandboxPlaywrightDir, { recursive: true });
      }
    }
  }

  const cleanup = () => {
    rmSync(sandboxDir, { recursive: true, force: true });
  };

  return { sandboxDir, cleanup };
}

export function createSandboxEnv(sandboxDir, options = {}) {
  const sandboxClaudeDir = join(sandboxDir, '.claude');
  const sandboxCacheDir = join(sandboxDir, '.cache');

  // Start with all process environment variables
  const env = {
    ...process.env,
  };

  // IMPORTANT: Set HOME to sandbox directory for Claude to find settings
  // but preserve access to host credentials via symlink
  env.HOME = sandboxDir;
  env.USERPROFILE = sandboxDir;

  // Set XDG paths to use sandbox Claude directory
  env.XDG_CONFIG_HOME = sandboxClaudeDir;
  env.XDG_DATA_HOME = join(sandboxClaudeDir, '.local', 'share');
  env.XDG_CACHE_HOME = sandboxCacheDir;
  env.TMPDIR = join(sandboxDir, 'tmp');
  env.TEMP = join(sandboxDir, 'tmp');
  env.TMP = join(sandboxDir, 'tmp');
  env.PLAYWRIGHT_BROWSERS_PATH = join(sandboxDir, 'browsers');
  env.PLAYWRIGHT_STORAGE_STATE = join(sandboxDir, '.playwright', 'storage-state.json');
  if (process.env.CLAUDE_CODE_ENTRYPOINT) {
    env.CLAUDE_CODE_ENTRYPOINT = process.env.CLAUDE_CODE_ENTRYPOINT;
  }

  // Ensure TERM is set with fallback
  env.TERM = process.env.TERM || 'xterm-256color';

  // Apply any additional options
  Object.assign(env, options);

  return env;
}

export function runInSandbox(commandStr, args, sandboxDir, env) {
  return new Promise((resolve, reject) => {
    const fullCommand = args.length > 0 ? `${commandStr} ${args.join(' ')}` : commandStr;

    const proc = spawn(fullCommand, [], {
      cwd: join(sandboxDir, 'workspace'),
      env,
      stdio: 'inherit',
      shell: true,
      windowsHide: false
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}