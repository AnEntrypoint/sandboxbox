#!/usr/bin/env node
// Minimal delegate entrypoint — start the consolidated main server
// Use ARM64-safe server to avoid StdioServerTransport memory corruption

async function startServer() {
  const isARM64 = process.arch === 'arm64' || process.platform === 'linux' && process.arch === 'arm64';

  if (isARM64) {
    // Use ARM64-safe implementation to avoid StdioServerTransport crashes
    console.log('[DEBUG] Using ARM64-safe server implementation');
    await import('./arm64-safe-server.js');
  } else {
    // Use standard implementation on other architectures
    console.log('[DEBUG] Using standard server implementation');
    const { startServer: startStandardServer } = await import('./server-core.js');
    await startStandardServer();
  }
}

startServer().catch((err) => {
  console.error('[START ERROR]', err);
  process.exit(1);
});
