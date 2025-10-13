import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { homedir, platform } from 'os';
import { color } from '../colors.js';
import { createSandbox, createSandboxEnv, runInSandbox } from '../sandbox.js';

export async function claudeCommand(projectDir, command = 'claude') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  if (!existsSync(resolve(projectDir, '.git'))) {
    console.log(color('red', `❌ Not a git repository: ${projectDir}`));
    console.log(color('yellow', 'Please run this command in a git repository directory'));
    return false;
  }

  console.log(color('blue', '🚀 Starting Claude Code in sandbox...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${command}\n`));

  const { sandboxDir, cleanup } = createSandbox(projectDir);

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    let hostClaudeDir = join(homedir(), '.claude');
    if (platform() === 'win32') {
      // Convert Windows path to Unix style for bash
      hostClaudeDir = hostClaudeDir.replace(/^([A-Z]):/, '/$1').replace(/\\/g, '/');
    }

    const env = createSandboxEnv(sandboxDir, {
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
      CLAUDECODE: '1',
      HOME: hostClaudeDir // Set HOME to host Claude directory for Claude Code
    });

    console.log(color('green', `✅ Sandbox created: ${sandboxDir}`));
    console.log(color('cyan', `📦 Claude Code using host config: ${hostClaudeDir}\n`));

    await runInSandbox(`claude ${command}`, [], sandboxDir, env);

    console.log(color('green', '\n✅ Claude Code session completed!'));
    cleanup();
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
    cleanup();
    return false;
  }
}
