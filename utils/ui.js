import { color } from './colors.js';

export function showBanner() {
  const VERBOSE_OUTPUT = process.env.SANDBOX_VERBOSE === 'true' || process.argv.includes('--verbose');
  if (VERBOSE_OUTPUT) {
    console.log(color('cyan', '📦 SandboxBox - Portable Container Runner'));
    console.log(color('cyan', '═════════════════════════════════════════════════'));
    console.log('');
  }
}

export function showHelp() {
  console.log(color('yellow', 'Usage:'));
  console.log('  npx sandboxbox <command> [options]');
  console.log('');
  console.log(color('yellow', 'Commands:'));
  console.log('  build [dockerfile]            Build container from Dockerfile');
  console.log('  run <project-dir> [cmd]       Run project in container');
  console.log('  shell <project-dir>           Start interactive shell');
  console.log('  claude <project-dir> [prompt] [--host] [--headless]  Start Claude Code with Git integration');
  console.log('  mcp                           Start as MCP server (stdio transport)');
  console.log('  version                       Show version information');
  console.log('');
  console.log(color('yellow', 'Claude Command Options:'));
  console.log('  --host                        Use host Claude settings instead of bundled');
  console.log('  --headless                    Configure headless Playwright MCP (runs before Claude)');
  console.log('');
  console.log(color('yellow', 'Examples:'));
  console.log('  npx sandboxbox build');
  console.log('  npx sandboxbox claude ./my-project');
  console.log('  npx sandboxbox run ./my-project "npm test"');
  console.log('  npx sandboxbox shell ./my-project');
  console.log('');
  console.log(color('yellow', 'Requirements:'));
  console.log('  - Docker/Podman runtime');
  console.log('  - Works on Windows, macOS, and Linux!');
  console.log('');
  console.log(color('magenta', '🚀 Fast startup • True isolation • Claude Code integration'));
}