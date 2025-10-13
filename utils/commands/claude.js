import { existsSync, cpSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';
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
    const claudeDir = join(sandboxDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });

    const hostClaudeDir = join(homedir(), '.claude');
    if (existsSync(hostClaudeDir)) {
      cpSync(hostClaudeDir, claudeDir, { recursive: true });
    }

    const env = createSandboxEnv(sandboxDir, {
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
      CLAUDECODE: '1'
    });

    console.log(color('green', `✅ Sandbox created: ${sandboxDir}`));
    console.log(color('cyan', '📦 Claude Code running in isolated environment...\n'));

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
