import { mkdtempSync, rmSync, cpSync, existsSync, mkdirSync } from 'fs';
import { tmpdir, homedir, platform } from 'os';
import { join, resolve } from 'path';
import { spawn, execSync } from 'child_process';

export function createSandbox(projectDir) {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
  const workspaceDir = join(sandboxDir, 'workspace');

  if (projectDir && existsSync(projectDir)) {
    const isGitRepo = existsSync(join(projectDir, '.git'));

    if (isGitRepo) {
      // Set git safe directory before cloning
      try {
        execSync(`git config --global --add safe.directory "${projectDir}"`, {
          stdio: 'pipe',
          shell: true
        });
        execSync(`git config --global --add safe.directory "${projectDir}/.git"`, {
          stdio: 'pipe',
          shell: true
        });
      } catch (e) {
        // Ignore if safe directory already exists
      }

      execSync(`git clone "${projectDir}" "${workspaceDir}"`, {
        stdio: 'pipe',
        shell: true,
        windowsHide: true
      });

      // Configure host repo to accept pushes
      try {
        execSync(`git config receive.denyCurrentBranch updateInstead`, {
          cwd: projectDir,
          stdio: 'pipe',
          shell: true
        });
      } catch (e) {
        // Ignore if already configured
      }

      // Transfer git identity from host to sandbox
      try {
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

        if (userName) {
          execSync(`git config user.name "${userName}"`, {
            cwd: workspaceDir,
            stdio: 'pipe',
            shell: true
          });
        }

        if (userEmail) {
          execSync(`git config user.email "${userEmail}"`, {
            cwd: workspaceDir,
            stdio: 'pipe',
            shell: true
          });
        }

        const colorUi = execSync('git config --global color.ui', {
          stdio: 'pipe',
          shell: true,
          encoding: 'utf8'
        }).trim();

        if (colorUi) {
          execSync(`git config color.ui "${colorUi}"`, {
            cwd: workspaceDir,
            stdio: 'pipe',
            shell: true
          });
        }
      } catch (e) {
        // Ignore if git config not available on host
      }
    } else {
      cpSync(projectDir, workspaceDir, {
        recursive: true,
        filter: (src) => !src.includes('node_modules')
      });
    }
  }

  const claudeDir = join(sandboxDir, '.claude');
  const hostClaudeDir = join(homedir(), '.claude');

  // Create symlink or copy Claude credentials for authentication
  if (existsSync(hostClaudeDir)) {
    try {
      // Try to create a symlink first (works on Unix systems)
      if (platform() !== 'win32') {
        execSync(`ln -sf "${hostClaudeDir}" "${claudeDir}"`, {
          stdio: 'pipe',
          shell: true
        });
      } else {
        // On Windows, copy the credentials file
        cpSync(hostClaudeDir, claudeDir, { recursive: true });
      }
    } catch (e) {
      // Fallback: copy specific credential files
      const credentialsFile = join(hostClaudeDir, '.credentials.json');
      if (existsSync(credentialsFile)) {
        mkdirSync(claudeDir, { recursive: true });
        cpSync(credentialsFile, join(claudeDir, '.credentials.json'));
      }
    }
  }

  const playwrightDir = join(sandboxDir, '.playwright');
  mkdirSync(playwrightDir, { recursive: true });

  // Copy Playwright MCP profile from host to sandbox
  const playwrightCacheDir = platform() === 'darwin'
    ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
    : platform() === 'win32'
    ? join(homedir(), 'AppData', 'Local', 'ms-playwright')
    : join(homedir(), '.cache', 'ms-playwright');

  const mcpProfiles = ['mcp-chrome-profile', 'mcp-chromium-profile', 'mcp-firefox-profile', 'mcp-webkit-profile'];

  for (const profileName of mcpProfiles) {
    const hostProfile = join(playwrightCacheDir, profileName);
    if (existsSync(hostProfile)) {
      const sandboxProfile = join(sandboxDir, '.cache', 'ms-playwright', profileName);
      try {
        mkdirSync(join(sandboxDir, '.cache', 'ms-playwright'), { recursive: true });
        cpSync(hostProfile, sandboxProfile, { recursive: true });
      } catch (e) {
        // Ignore if profile copy fails
      }
    }
  }

  const cleanup = () => {
    try {
      rmSync(sandboxDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup failed:', e.message);
    }
  };

  return { sandboxDir, cleanup };
}

export function createSandboxEnv(sandboxDir, options = {}) {
  const hostHome = homedir();
  const sandboxClaudeDir = join(sandboxDir, '.claude');

  const env = {
    PATH: process.env.PATH,
    HOME: sandboxClaudeDir,
    USERPROFILE: sandboxClaudeDir,
    TMPDIR: join(sandboxDir, 'tmp'),
    TEMP: join(sandboxDir, 'tmp'),
    TMP: join(sandboxDir, 'tmp'),
    XDG_CACHE_HOME: join(sandboxDir, '.cache'),
    PLAYWRIGHT_BROWSERS_PATH: join(sandboxDir, 'browsers'),
    PLAYWRIGHT_STORAGE_STATE: join(sandboxDir, '.playwright', 'storage-state.json'),
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
    CLAUDECODE: '1',
    NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || join(hostHome, '.npm'),
    npm_config_cache: process.env.npm_config_cache || join(hostHome, '.npm'),
    NODE_ENV: process.env.NODE_ENV,
    TERM: process.env.TERM || 'xterm-256color',
    LS_COLORS: process.env.LS_COLORS,
    LANG: process.env.LANG,
    LC_ALL: process.env.LC_ALL,
    SHELL: process.env.SHELL,
    USER: process.env.USER,
    LOGNAME: process.env.LOGNAME,
    EDITOR: process.env.EDITOR,
    VISUAL: process.env.VISUAL,
    PAGER: process.env.PAGER,
    LESS: process.env.LESS,
    LESSOPEN: process.env.LESSOPEN,
    LESSCLOSE: process.env.LESSCLOSE,
    DISPLAY: process.env.DISPLAY,
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
    SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK,
    SSH_AGENT_PID: process.env.SSH_AGENT_PID,
    GPG_AGENT_INFO: process.env.GPG_AGENT_INFO,
    ...options
  };

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
