import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { color } from '../colors.js';
import { createSandbox, createSandboxEnv, runInSandbox } from '../sandbox.js';

export function buildCommand(dockerfilePath) {
  console.log(color('yellow', '⚠️  Build command not yet implemented'));
  return false;
}

export async function runCommand(projectDir, cmd = 'bash') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  console.log(color('blue', '🚀 Creating sandbox environment...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${cmd}\n`));

  const { sandboxDir, cleanup } = createSandbox(projectDir);

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    const env = createSandboxEnv(sandboxDir, {
      PLAYWRIGHT_BROWSERS_PATH: join(sandboxDir, 'browsers')
    });

    console.log(color('green', `✅ Sandbox created: ${sandboxDir}`));
    console.log(color('cyan', '📦 Running in isolated environment...\n'));

    await runInSandbox(cmd, [], sandboxDir, env);

    console.log(color('green', '\n✅ Command completed!'));
    cleanup();
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Command failed: ${error.message}`));
    cleanup();
    return false;
  }
}

export async function shellCommand(projectDir) {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  console.log(color('blue', '🚀 Starting interactive shell...'));
  return runCommand(projectDir, 'bash');
}

export function versionCommand() {
  console.log(color('green', 'SandboxBox - Process Containment Sandbox'));
  console.log(color('cyan', 'Using Node.js process isolation'));
  return true;
}
