import { mkdtempSync, rmSync, cpSync, existsSync, mkdirSync, writeFileSync, symlinkSync } from 'fs';
import { tmpdir, homedir, platform } from 'os';
import { join, resolve } from 'path';
import { spawn, execSync } from 'child_process';

export function createSandbox(projectDir) {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
  const workspaceDir = join(sandboxDir, 'workspace');

  // Set git safe directory before cloning
  execSync(`git config --global --add safe.directory "${projectDir}"`, {
    stdio: 'pipe',
    shell: true
  });
  execSync(`git config --global --add safe.directory "${projectDir}/.git"`, {
    stdio: 'pipe',
    shell: true
  });

  execSync(`git clone "${projectDir}" "${workspaceDir}"`, {
    stdio: 'pipe',
    shell: true,
    windowsHide: true
  });

  // Set up host repo as origin in sandbox (only if not already exists)
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

  // Configure host repo to accept pushes to current branch
  execSync(`git config receive.denyCurrentBranch updateInstead`, {
    cwd: projectDir,
    stdio: 'pipe',
    shell: true
  });

  // Transfer git identity from host to sandbox
  const userName = execSync('git config --global user.name', {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8'
  }).trim();

  const userEmail = execSync('git config --global user.email', {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8'
  }).trim();

  execSync(`git config user.name "${userName}"`, {
    cwd: workspaceDir,
    stdio: 'pipe',
    shell: true
  });

  execSync(`git config user.email "${userEmail}"`, {
    cwd: workspaceDir,
    stdio: 'pipe',
    shell: true
  });

  const colorUi = execSync('git config --global color.ui', {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8'
  }).trim();

  execSync(`git config color.ui "${colorUi}"`, {
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

  // Copy host cache directories that Claude might need
  const hostCacheDir = join(homedir(), '.cache');
  if (existsSync(hostCacheDir)) {
    const sandboxCacheDir = join(sandboxDir, '.cache');
    mkdirSync(sandboxCacheDir, { recursive: true });

    // Copy ms-playwright cache if it exists
    const playwrightCacheDir = join(hostCacheDir, 'ms-playwright');
    if (existsSync(playwrightCacheDir)) {
      cpSync(playwrightCacheDir, join(sandboxCacheDir, 'ms-playwright'), { recursive: true });
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

  // Keep host HOME directory for Claude credentials access
  // but add sandbox directories for other XDG paths
  // env.HOME = process.env.HOME; // Already inherited from process.env
  env.USERPROFILE = process.env.USERPROFILE || process.env.HOME;
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