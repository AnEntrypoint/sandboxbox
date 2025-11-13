import { existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { color } from '../colors.js';
import { createSandbox, createSandboxEnv, runInSandbox } from '../sandbox.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildCommand(dockerfilePath) {
  const repoRoot = resolve(__dirname, '..', '..');
  const dockerfile = dockerfilePath || join(repoRoot, 'Dockerfile');

  if (!existsSync(dockerfile)) {
    console.log(color('red', `❌ Dockerfile not found: ${dockerfile}`));
    return false;
  }

  console.log(color('cyan', `📦 Building sandboxbox container from ${dockerfile}...`));

  try {
    const buildContext = dirname(dockerfile);

    execSync(`podman build -t sandboxbox:latest -f "${dockerfile}" "${buildContext}"`, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    console.log(color('green', '✅ Container built successfully!'));
    return true;
  } catch (error) {
    console.log(color('red', `❌ Build failed: ${error.message}`));
    return false;
  }
}

export async function runCommand(projectDir, cmd) {
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
