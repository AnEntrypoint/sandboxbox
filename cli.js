#!/usr/bin/env node

/**
 * SandboxBox CLI - Process Containment Sandbox
 * Lightweight process isolation for CLI tools
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { color } from './utils/colors.js';
import { showBanner, showHelp } from './utils/ui.js';
import { buildCommand, runCommand, shellCommand, claudeCommand, versionCommand } from './utils/commands/index.js';

async function main() {
  const args = process.argv.slice(2);
  showBanner();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'build':
        const dockerfilePath = commandArgs[0];
        if (!buildCommand(dockerfilePath)) process.exit(1);
        break;

      case 'run':
        if (commandArgs.length === 0) {
          console.log(color('red', '❌ Please specify a project directory'));
          console.log(color('yellow', 'Usage: npx sandboxbox run <project-dir> [command]'));
          process.exit(1);
        }
        const projectDir = resolve(process.cwd(), commandArgs[0]);
        const cmd = commandArgs.slice(1).join(' ');
        if (!(await runCommand(projectDir, cmd))) process.exit(1);
        break;

      case 'shell':
        if (commandArgs.length === 0) {
          console.log(color('red', '❌ Please specify a project directory'));
          console.log(color('yellow', 'Usage: npx sandboxbox shell <project-dir>'));
          process.exit(1);
        }
        const shellProjectDir = resolve(process.cwd(), commandArgs[0]);
        if (!(await shellCommand(shellProjectDir))) process.exit(1);
        break;

      case 'claude':
        if (commandArgs.length === 0) {
          console.log(color('red', '❌ Please specify a project directory'));
          console.log(color('yellow', 'Usage: npx sandboxbox claude <project-dir> [prompt]'));
          console.log(color('yellow', 'Example: npx sandboxbox claude . "your prompt here"'));
          process.exit(1);
        }

        let claudeProjectDir, claudePrompt;

        // Check if first argument exists as a directory
        const potentialDir = resolve(process.cwd(), commandArgs[0]);
        if (existsSync(potentialDir)) {
          claudeProjectDir = potentialDir;
          claudePrompt = commandArgs.slice(1).join(' ');
        } else {
          // If first argument doesn't exist as directory, assume current directory and treat everything as prompt
          claudeProjectDir = process.cwd();
          claudePrompt = commandArgs.join(' ');
          console.log(color('yellow', `⚠️  Directory '${commandArgs[0]}' not found, using current directory`));
        }

        if (!(await claudeCommand(claudeProjectDir, claudePrompt))) process.exit(1);
        break;

      case 'version':
        if (!versionCommand()) process.exit(1);
        break;

      default:
        console.log(color('red', `❌ Unknown command: ${command}`));
        console.log(color('yellow', 'Use --help for usage information'));
        process.exit(1);
    }
  } catch (error) {
    console.log(color('red', `\n❌ Fatal error: ${error.message}`));
    process.exit(1);
  }
}

main();