#!/usr/bin/env node

/**
 * SandboxBox CLI - Portable Container Runner with Podman
 *
 * Cross-platform container runner using Podman
 * Works on Windows, macOS, and Linux
 *
 * Simple usage:
 *   npx sandboxbox build              # Build container from Dockerfile
 *   npx sandboxbox run <project>      # Run project in container
 *   npx sandboxbox shell <project>    # Interactive shell
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function color(colorName, text) {
  return `${colors[colorName]}${text}${colors.reset}`;
}

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
  console.log('  build [dockerfile]            Build container from Dockerfile (default: ./Dockerfile)');
  console.log('  run <project-dir> [cmd]       Run project in container');
  console.log('  shell <project-dir>           Start interactive shell in container');
  console.log('  version                       Show version information');
  console.log('');
  console.log(color('yellow', 'Examples:'));
  console.log('  npx sandboxbox build');
  console.log('  npx sandboxbox build ./Dockerfile.custom');
  console.log('  npx sandboxbox run ./my-project');
  console.log('  npx sandboxbox run ./my-project "npm test"');
  console.log('  npx sandboxbox shell ./my-project');
  console.log('');
  console.log(color('yellow', 'Requirements:'));
  console.log('  - Podman (https://podman.io/getting-started/installation)');
  console.log('  - Works on Windows, macOS, and Linux!');
  console.log('');
  console.log(color('magenta', '🚀 Fast startup • True isolation • Cross-platform'));
}

function getPodmanPath() {
  // Check for bundled podman first
  const platform = process.platform;
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  let bundledPodman;

  if (platform === 'win32') {
    bundledPodman = resolve(__dirname, 'bin', 'podman.exe');
  } else if (platform === 'darwin') {
    bundledPodman = resolve(__dirname, 'bin', 'podman');
  } else {
    bundledPodman = resolve(__dirname, 'bin', `podman-remote-static-linux_${arch}`);
  }

  if (existsSync(bundledPodman)) {
    return bundledPodman;
  }
  // Fall back to system podman
  return 'podman';
}

function checkPodman() {
  const podmanPath = getPodmanPath();
  const isBundled = podmanPath.includes('bin');

  try {
    const version = execSync(`"${podmanPath}" --version`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    console.log(color('green', `✅ ${version}${isBundled ? ' (bundled)' : ''}`));
    return podmanPath;
  } catch (error) {
    console.log(color('red', '❌ Podman not found'));
    console.log(color('yellow', '\n📦 Podman will be auto-downloaded on first install'));
    console.log(color('yellow', '   Or you can install manually:'));
    console.log('');
    if (process.platform === 'win32') {
      console.log(color('cyan', '   Windows:'));
      console.log('   winget install RedHat.Podman');
    } else if (process.platform === 'darwin') {
      console.log(color('cyan', '   macOS:'));
      console.log('   brew install podman');
      console.log('   podman machine init && podman machine start');
    } else {
      console.log(color('cyan', '   Linux:'));
      console.log('   sudo apt-get install podman       # Ubuntu/Debian');
      console.log('   sudo dnf install podman           # Fedora');
    }
    console.log('');
    return null;
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
        console.log('');
        execSync(`"${buildPodman}" build -f "${dockerfilePath}" -t sandboxbox:latest .`, {
          stdio: 'inherit',
          cwd: __dirname
        });
        console.log('');
        console.log(color('green', '✅ Container built successfully!'));
        console.log(color('cyan', '\n💡 Next steps:'));
        console.log('   npx sandboxbox run ./my-project');
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
        console.log('');
        execSync(`"${runPodman}" run --rm -it -v "${projectDir}:/workspace" -w /workspace sandboxbox:latest ${cmd}`, {
          stdio: 'inherit'
        });
        console.log('');
        console.log(color('green', '✅ Container execution completed!'));
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
        console.log('');
        execSync(`"${shellPodman}" run --rm -it -v "${shellProjectDir}:/workspace" -w /workspace sandboxbox:latest /bin/bash`, {
          stdio: 'inherit'
        });
      } catch (error) {
        console.log(color('red', `\n❌ Shell failed: ${error.message}`));
        process.exit(1);
      }
      break;

    case 'version':
      try {
        const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
        console.log(color('green', `SandboxBox v${packageJson.version}`));
        console.log(color('cyan', 'Portable containers with Claude Code & Playwright'));
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

// Run if called directly
main().catch(error => {
  console.error(color('red', '❌ SandboxBox failed:'));
  console.error(color('red', error.message));
  console.error('');
  console.error(color('yellow', '💡 Try: npx sandboxbox --help'));
  process.exit(1);
});
