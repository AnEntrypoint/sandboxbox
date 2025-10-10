#!/usr/bin/env node

/**
 * SandboxBox CLI - Portable Container Runner with Podman
 *
 * Cross-platform container runner using Podman with Claude Code integration
 * Works on Windows, macOS, and Linux
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { color } from './utils/colors.js';
import { checkPodman, getPodmanPath } from './utils/podman.js';
import { buildClaudeContainerCommand, createClaudeDockerfile } from './utils/claude-workspace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function showBanner() {
  console.log(color('cyan', '📦 SandboxBox - Portable Container Runner'));
  console.log(color('cyan', '═════════════════════════════════════════════════'));
  console.log('');
}

function showHelp() {
  console.log(color('yellow', 'Usage:'));
  console.log('  npx sandboxbox <command> [options]');
  console.log('');
  console.log(color('yellow', 'Commands:'));
  console.log('  build [dockerfile]            Build container from Dockerfile');
  console.log('  run <project-dir> [cmd]       Run project in container');
  console.log('  shell <project-dir>           Start interactive shell');
  console.log('  claude <project-dir>          Start Claude Code with local repository');
  console.log('  version                       Show version information');
  console.log('');
  console.log(color('yellow', 'Examples:'));
  console.log('  npx sandboxbox build');
  console.log('  npx sandboxbox claude ./my-project');
  console.log('  npx sandboxbox run ./my-project "npm test"');
  console.log('  npx sandboxbox shell ./my-project');
  console.log('');
  console.log(color('yellow', 'Requirements:'));
  console.log('  - Podman (auto-downloaded if needed)');
  console.log('  - Works on Windows, macOS, and Linux!');
  console.log('');
  console.log(color('magenta', '🚀 Fast startup • True isolation • Claude Code integration'));
}

function buildClaudeContainer() {
  const dockerfilePath = resolve(__dirname, 'Dockerfile.claude');
  const dockerfileContent = createClaudeDockerfile();

  writeFileSync(dockerfilePath, dockerfileContent);
  console.log(color('blue', '🏗️  Building Claude Code container...'));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;

  try {
    execSync(`"${podmanPath}" build -f "${dockerfilePath}" -t sandboxbox-local:latest .`, {
      stdio: 'inherit',
      cwd: __dirname,
      shell: process.platform === 'win32'
    });
    console.log(color('green', '\n✅ Claude Code container built successfully!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Build failed: ${error.message}`));
    return false;
  }
}

function runClaudeWorkspace(projectDir, command = 'claude') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  if (!existsSync(resolve(projectDir, '.git'))) {
    console.log(color('red', `❌ Not a git repository: ${projectDir}`));
    console.log(color('yellow', 'Please run this command in a git repository directory'));
    return false;
  }

  console.log(color('blue', '🚀 Starting Claude Code with local repository...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${command}\n`));

  const podmanPath = checkPodman();
  if (!podmanPath) return false;

  try {
    const containerCommand = buildClaudeContainerCommand(projectDir, podmanPath, command);
    execSync(containerCommand, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    console.log(color('green', '\n✅ Claude Code session completed!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  showBanner();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  switch (command) {
    case 'build':
      const dockerfilePath = commandArgs[0] || './Dockerfile';

      if (!existsSync(dockerfilePath)) {
        console.log(color('red', `❌ Dockerfile not found: ${dockerfilePath}`));
        process.exit(1);
      }

      console.log(color('blue', '🏗️  Building container...'));
      console.log(color('yellow', `Dockerfile: ${dockerfilePath}\n`));

      const buildPodman = checkPodman();
      if (!buildPodman) process.exit(1);

      try {
        execSync(`"${buildPodman}" build -f "${dockerfilePath}" -t sandboxbox:latest .`, {
          stdio: 'inherit',
          cwd: dirname(dockerfilePath),
          shell: process.platform === 'win32'
        });
        console.log(color('green', '\n✅ Container built successfully!'));
      } catch (error) {
        console.log(color('red', `\n❌ Build failed: ${error.message}`));
        process.exit(1);
      }
      break;

    case 'run':
      if (commandArgs.length === 0) {
        console.log(color('red', '❌ Please specify a project directory'));
        console.log(color('yellow', 'Usage: npx sandboxbox run <project-dir> [command]'));
        process.exit(1);
      }

      const projectDir = resolve(commandArgs[0]);
      const cmd = commandArgs[1] || 'bash';

      if (!existsSync(projectDir)) {
        console.log(color('red', `❌ Project directory not found: ${projectDir}`));
        process.exit(1);
      }

      console.log(color('blue', '🚀 Running project in container...'));
      console.log(color('yellow', `Project: ${projectDir}`));
      console.log(color('yellow', `Command: ${cmd}\n`));

      const runPodman = checkPodman();
      if (!runPodman) process.exit(1);

      try {
        execSync(`"${runPodman}" run --rm -it -v "${projectDir}:/workspace" -w /workspace sandboxbox:latest ${cmd}`, {
          stdio: 'inherit',
          shell: process.platform === 'win32'
        });
        console.log(color('green', '\n✅ Container execution completed!'));
      } catch (error) {
        console.log(color('red', `\n❌ Run failed: ${error.message}`));
        process.exit(1);
      }
      break;

    case 'shell':
      if (commandArgs.length === 0) {
        console.log(color('red', '❌ Please specify a project directory'));
        console.log(color('yellow', 'Usage: npx sandboxbox shell <project-dir>'));
        process.exit(1);
      }

      const shellProjectDir = resolve(commandArgs[0]);

      if (!existsSync(shellProjectDir)) {
        console.log(color('red', `❌ Project directory not found: ${shellProjectDir}`));
        process.exit(1);
      }

      console.log(color('blue', '🐚 Starting interactive shell...'));
      console.log(color('yellow', `Project: ${shellProjectDir}\n`));

      const shellPodman = checkPodman();
      if (!shellPodman) process.exit(1);

      try {
        execSync(`"${shellPodman}" run --rm -it -v "${shellProjectDir}:/workspace" -w /workspace sandboxbox:latest /bin/bash`, {
          stdio: 'inherit',
          shell: process.platform === 'win32'
        });
      } catch (error) {
        console.log(color('red', `\n❌ Shell failed: ${error.message}`));
        process.exit(1);
      }
      break;

    case 'claude':
      if (commandArgs.length === 0) {
        console.log(color('red', '❌ Please specify a project directory'));
        console.log(color('yellow', 'Usage: npx sandboxbox claude <project-dir>'));
        process.exit(1);
      }

      const claudeProjectDir = resolve(commandArgs[0]);
      const claudeCommand = commandArgs.slice(1).join(' ') || 'claude';

      // Check if Claude container exists, build if needed
      const podmanPath = getPodmanPath();
      try {
        execSync(`"${podmanPath}" image inspect sandboxbox-local:latest`, {
          stdio: 'pipe',
          shell: process.platform === 'win32'
        });
      } catch {
        console.log(color('yellow', '📦 Building Claude Code container...'));
        if (!buildClaudeContainer()) {
          process.exit(1);
        }
      }

      if (!runClaudeWorkspace(claudeProjectDir, claudeCommand)) {
        process.exit(1);
      }
      break;

    case 'version':
      try {
        const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
        console.log(color('green', `SandboxBox v${packageJson.version}`));
        console.log(color('cyan', 'Portable containers with Claude Code integration'));
        if (checkPodman()) {
          console.log('');
        }
      } catch (error) {
        console.log(color('red', '❌ Could not read version'));
      }
      break;

    default:
      console.log(color('red', `❌ Unknown command: ${command}`));
      console.log(color('yellow', 'Use --help for usage information'));
      process.exit(1);
  }
}

main().catch(error => {
  console.error(color('red', '❌ SandboxBox failed:'));
  console.error(color('red', error.message));
  console.error('');
  console.error(color('yellow', '💡 Try: npx sandboxbox --help'));
  process.exit(1);
});