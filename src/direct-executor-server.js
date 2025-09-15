#!/usr/bin/env node
// Minimal delegate entrypoint — start the consolidated main server
// Uses universal server for all architectures

async function startServer() {
  // Use universal server implementation for all architectures
  console.log('[DEBUG] Starting universal MCP server');
  await import('./universal-server.js');
}

startServer().catch((err) => {
  console.error('[START ERROR]', err);
  process.exit(1);
});
