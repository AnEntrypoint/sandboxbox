#!/usr/bin/env node

console.log('🚀 SandboxBox test starting...');
console.log('Platform:', process.platform);
console.log('Node.js:', process.version);

if (process.platform !== 'linux') {
  console.log('❌ SandboxBox only works on Linux systems');
  console.log('🐧 Required: Linux with bubblewrap (bwrap)');
  console.log('');
  console.log('💡 Alternatives for Windows users:');
  console.log('   • Use WSL2 (Windows Subsystem for Linux 2)');
  console.log('   • Use Docker Desktop with Linux containers');
  console.log('   • Use GitHub Actions (ubuntu-latest runners)');
  console.log('   • Use a cloud Linux instance (AWS, GCP, Azure)');
  console.log('');
  console.log('✅ On Linux/WSL2, simply run: npx sandboxbox --help');
  process.exit(1);
}

console.log('✅ Platform check passed - you are on Linux!');
console.log('');
console.log('📦 SandboxBox - Zero-Privilege Container Runner');
console.log('═════════════════════════════════════════════════════');
console.log('');
console.log('Usage: npx sandboxbox <command> [options]');
console.log('');
console.log('Commands:');
console.log('  setup                          Set up Alpine Linux environment (one-time)');
console.log('  build <dockerfile>            Build container from Dockerfile');
console.log('  run <project-dir>             Run Playwright tests in isolation');
console.log('  shell <project-dir>           Start interactive shell in container');
console.log('  quick-test <project-dir>      Quick test with sample Dockerfile');
console.log('  version                       Show version information');
console.log('');
console.log('Requirements:');
console.log('  - bubblewrap (bwrap): sudo apt-get install bubblewrap');
console.log('  - No root privileges needed after installation!');
console.log('');
console.log('🚀 8ms startup • True isolation • Playwright ready');