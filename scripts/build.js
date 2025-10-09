#!/usr/bin/env node

/**
 * SQLite-style build script for SandboxBox
 * Downloads and compiles bubblewrap binary during npm install
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BINARY_DIR = path.join(__dirname, '..', 'bin');
const BWRAP_VERSION = '0.11.0';

console.log('📦 Building SandboxBox with bubblewrap...');

async function downloadAndBuild() {
  // Create binary directory
  if (!fs.existsSync(BINARY_DIR)) {
    fs.mkdirSync(BINARY_DIR, { recursive: true });
  }

  const binaryPath = path.join(BINARY_DIR, 'bwrap');

  // Skip on non-Linux platforms but still create stub
  if (process.platform !== 'linux') {
    console.log('ℹ️  Skipping bubblewrap build on non-Linux platform');
    console.log('   SandboxBox works on Linux only');
    return;
  }

  // Check if already built
  if (fs.existsSync(binaryPath)) {
    try {
      execSync(`"${binaryPath}" --version`, { stdio: 'ignore' });
      console.log('✅ Bubblewrap already built');
      return;
    } catch (e) {
      console.log('⚠️  Existing binary broken, rebuilding...');
    }
  }

  // Try to use system bubblewrap first (fallback option)
  try {
    const systemBwrap = execSync('which bwrap', { encoding: 'utf8' }).trim();
    if (systemBwrap && fs.existsSync(systemBwrap)) {
      fs.copyFileSync(systemBwrap, binaryPath);
      fs.chmodSync(binaryPath, 0o755);
      console.log('✅ Using system bubblewrap:', systemBwrap);
      return;
    }
  } catch (e) {
    // System bwrap not found, continue with build
  }

  // Build from source like SQLite does
  await buildFromSource(binaryPath);
}

async function buildFromSource(binaryPath) {
  console.log('🔨 Building bubblewrap from source (SQLite-style)...');

  const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'bwrap-build-'));

  try {
    // Download source tarball
    console.log('📥 Downloading bubblewrap source...');
    const tarball = `bubblewrap-${BWRAP_VERSION}.tar.xz`;
    const tarballPath = path.join(tmpDir, tarball);
    const url = `https://github.com/containers/bubblewrap/releases/download/v${BWRAP_VERSION}/${tarball}`;

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tarballPath);

      function download(url) {
        https.get(url, (response) => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log(`🔄 Following redirect to: ${response.headers.location}`);
            download(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      }

      download(url);
    });

    // Extract source
    console.log('📦 Extracting source...');
    execSync(`tar -xf "${tarballPath}" -C "${tmpDir}"`, { stdio: 'inherit' });

    const sourceDir = path.join(tmpDir, `bubblewrap-${BWRAP_VERSION}`);

    // Check for required build tools
    const missingTools = [];
    try {
      execSync('which gcc', { stdio: 'ignore' });
    } catch (e) {
      missingTools.push('gcc');
    }

    try {
      execSync('which xz', { stdio: 'ignore' });
    } catch (e) {
      missingTools.push('xz');
    }

    if (missingTools.length > 0) {
      console.log(`⚠️  Missing build tools: ${missingTools.join(', ')}`);
      console.log('   On Ubuntu/Debian: sudo apt-get install build-essential xz-utils');
      console.log('   On CentOS/RHEL: sudo yum groupinstall "Development Tools" && sudo yum install xz');
      console.log('   Falling back to system bubblewrap check...');

      // Create a placeholder binary that will show helpful error
      const placeholderScript = `#!/bin/bash
echo "❌ Bubblewrap not available"
echo ""
echo "💡 Install bubblewrap system-wide:"
echo "   sudo apt-get install bubblewrap    # Ubuntu/Debian"
echo "   sudo apk add bubblewrap            # Alpine"
echo "   sudo yum install bubblewrap        # CentOS/RHEL"
echo ""
echo "Or install build tools and reinstall SandboxBox:"
echo "   sudo apt-get install build-essential xz-utils"
echo "   npm uninstall sandboxbox && npm install sandboxbox"
exit 1
`;
      fs.writeFileSync(binaryPath, placeholderScript);
      fs.chmodSync(binaryPath, 0o755);
      console.log('📝 Created placeholder binary with installation instructions');
      return;
    }

    // Configure and build
    console.log('⚙️  Configuring build...');
    execSync(`
      cd "${sourceDir}" &&
      ./configure --prefix="${tmpDir}/install" --disable-man
    `, { stdio: 'inherit' });

    console.log('🏗️  Compiling bubblewrap...');
    execSync(`
      cd "${sourceDir}" &&
      make -j$(nproc 2>/dev/null || echo 4)
    `, { stdio: 'inherit' });

    console.log('📦 Installing...');
    execSync(`
      cd "${sourceDir}" &&
      make install
    `, { stdio: 'inherit' });

    // Copy binary to final location
    const builtBinary = path.join(tmpDir, 'install', 'bin', 'bwrap');
    if (fs.existsSync(builtBinary)) {
      fs.copyFileSync(builtBinary, binaryPath);
      fs.chmodSync(binaryPath, 0o755);
      console.log('✅ Bubblewrap built successfully!');

      // Test the binary
      const version = execSync(`"${binaryPath}" --version`, { encoding: 'utf8' });
      console.log(`🎯 Built: ${version.trim()}`);
    } else {
      throw new Error('Built binary not found');
    }

  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Run the build
downloadAndBuild().catch(error => {
  console.error('❌ Build failed:', error.message);
  console.log('💡 SandboxBox will still work with system bubblewrap if available');
  process.exit(0); // Don't fail npm install
});