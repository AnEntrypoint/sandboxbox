import { mkdtempSync, rmSync, cpSync, existsSync, mkdirSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { join } from 'path';
import { spawn, execSync } from 'child_process';

export function createSandbox(projectDir) {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
  const workspaceDir = join(sandboxDir, 'workspace');

  if (projectDir && existsSync(projectDir)) {
    const isGitRepo = existsSync(join(projectDir, '.git'));

    if (isGitRepo) {
      execSync(`git clone "${projectDir}" "${workspaceDir}"`, {
        stdio: 'pipe',
        shell: true,
        windowsHide: true
      });
    } else {
      cpSync(projectDir, workspaceDir, {
        recursive: true,
        filter: (src) => !src.includes('node_modules')
      });
    }
  }

  const claudeDir = join(sandboxDir, '.claude');
  const hostClaudeDir = join(homedir(), '.claude');

  if (existsSync(hostClaudeDir)) {
    try {
      cpSync(hostClaudeDir, claudeDir, {
        recursive: true,
        filter: (src) => {
          return !src.includes('shell-snapshots') &&
                 !src.includes('logs') &&
                 !src.includes('debug') &&
                 !src.includes('.log');
        }
      });
    } catch (e) {
      console.error('Warning: Failed to copy Claude config:', e.message);
    }
  } else {
    mkdirSync(claudeDir, { recursive: true });
  }

  const playwrightDir = join(sandboxDir, '.playwright');
  mkdirSync(playwrightDir, { recursive: true });

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

  const env = {
    PATH: process.env.PATH,
    HOME: sandboxDir,
    USERPROFILE: sandboxDir,
    TMPDIR: join(sandboxDir, 'tmp'),
    TEMP: join(sandboxDir, 'tmp'),
    TMP: join(sandboxDir, 'tmp'),
    PLAYWRIGHT_BROWSERS_PATH: join(sandboxDir, 'browsers'),
    PLAYWRIGHT_STORAGE_STATE: join(sandboxDir, '.playwright', 'storage-state.json'),
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
    CLAUDECODE: '1',
    NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || join(hostHome, '.npm'),
    npm_config_cache: process.env.npm_config_cache || join(hostHome, '.npm'),
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
