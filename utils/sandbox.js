import { mkdtempSync, rmSync, cpSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

export function createSandbox(projectDir) {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));

  if (projectDir && existsSync(projectDir)) {
    cpSync(projectDir, join(sandboxDir, 'workspace'), {
      recursive: true,
      filter: (src) => !src.includes('node_modules')
    });
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
  const env = {
    PATH: process.env.PATH,
    HOME: sandboxDir,
    USERPROFILE: sandboxDir,
    TMPDIR: join(sandboxDir, 'tmp'),
    TEMP: join(sandboxDir, 'tmp'),
    TMP: join(sandboxDir, 'tmp'),
    ...options
  };

  return env;
}

export function runInSandbox(command, args, sandboxDir, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: join(sandboxDir, 'workspace'),
      env,
      stdio: 'inherit',
      shell: true
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
