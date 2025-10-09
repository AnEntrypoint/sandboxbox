#!/usr/bin/env node

/**
 * Download bubblewrap binary during npm install
 * Makes SandboxBox completely self-contained
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BINARY_DIR = path.join(__dirname, '..', 'bin');
const BWRAP_VERSION = '0.8.0';

console.log('📦 Setting up SandboxBox with bubblewrap...');

async function downloadBubblewrap() {
  // Create binary directory
  if (!fs.existsSync(BINARY_DIR)) {
    fs.mkdirSync(BINARY_DIR, { recursive: true });
  }

  const binaryPath = path.join(BINARY_DIR, 'bwrap');

  // Skip download on non-Linux platforms
  if (process.platform !== 'linux') {
    console.log('ℹ️  Skipping bubblewrap download on non-Linux platform');
    console.log('   SandboxBox works on Linux only');
    return;
  }

  // Try to use system bubblewrap first (fastest option)
  try {
    const systemBwrap = execSync('which bwrap', { encoding: 'utf8' }).trim();
    if (systemBwrap && fs.existsSync(systemBwrap)) {
      fs.copyFileSync(systemBwrap, binaryPath);
      fs.chmodSync(binaryPath, 0o755);
      console.log('✅ Using system bubblewrap:', systemBwrap);
      return;
    }
  } catch (e) {
    // System bwrap not found, continue with download
  }

  // Try to download pre-built binary
  const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
  const binaryUrl = `https://github.com/containers/bubblewrap/releases/download/v${BWRAP_VERSION}/bubblewrap-${BWRAP_VERSION}.${arch}.tar.xz`;

  try {
    console.log('📥 Downloading bubblewrap binary...');

    // Download with fallback
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(path.join(BINARY_DIR, `bubblewrap-${BWRAP_VERSION}.tar.xz`));

      https.get(binaryUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('📦 Extracting bubblewrap...');

          // Extract binary
          try {
            execSync(`tar -xf "${path.join(BINARY_DIR, `bubblewrap-${BWRAP_VERSION}.tar.xz`)}" -C "${BINARY_DIR}" --strip-components=1`, { stdio: 'inherit' });

            // Move binary to expected location
            const extractedBinary = path.join(BINARY_DIR, 'bin', 'bwrap');
            if (fs.existsSync(extractedBinary)) {
              fs.renameSync(extractedBinary, binaryPath);
            } else {
              // Try alternative extraction pattern
              const altBinary = path.join(BINARY_DIR, 'bubblewrap-0.8.0', 'bwrap');
              if (fs.existsSync(altBinary)) {
                fs.renameSync(altBinary, binaryPath);
              }
            }

            // Set executable permissions
            fs.chmodSync(binaryPath, 0o755);

            // Cleanup
            fs.rmSync(path.join(BINARY_DIR, `bubblewrap-${BWRAP_VERSION}.tar.xz`), { force: true });
            fs.rmSync(path.join(BINARY_DIR, 'bubblewrap-0.8.0'), { recursive: true, force: true });

            console.log('✅ Bubblewrap downloaded successfully');
            resolve();
          } catch (extractError) {
            reject(new Error(`Failed to extract: ${extractError.message}`));
          }
        });
      }).on('error', reject);
    });

  } catch (downloadError) {
    console.log('⚠️  Download failed, trying to compile from source...');
    try {
      await compileBubblewrap(binaryPath);
    } catch (compileError) {
      console.log('❌ Both download and compilation failed');
      console.log('');
      console.log('💡 Easy solutions:');
      console.log('   1. Install system bubblewrap: sudo apt-get install bubblewrap');
      console.log('   2. Install build tools: sudo apt-get install build-essential xz-utils');
      console.log('   3. Use a Linux system with bubblewrap pre-installed');
      console.log('');
      console.log('SandboxBox will work with system bubblewrap if available.');
      console.log('Continuing without bundled binary...');
      return; // Don't exit, just continue without bundled binary
    }
  }
}

async function compileBubblewrap(binaryPath) {
  try {
    console.log('🔨 Compiling bubblewrap from source...');

    const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'bwrap-build-'));

    try {
      // Download source
      execSync(`
        cd "${tmpDir}" &&
        wget -q https://github.com/containers/bubblewrap/releases/download/v${BWRAP_VERSION}/bubblewrap-${BWRAP_VERSION}.tar.xz &&
        tar -xf bubblewrap-${BWRAP_VERSION}.tar.xz
      `, { stdio: 'inherit' });

      // Build dependencies check
      try {
        execSync('which gcc', { stdio: 'ignore' });
      } catch (e) {
        console.log('❌ GCC not found. Please install build-essential:');
        console.log('   Ubuntu/Debian: sudo apt-get install build-essential');
        console.log('   CentOS/RHEL: sudo yum groupinstall "Development Tools"');
        console.log('   Or install bubblewrap system-wide: sudo apt-get install bubblewrap');
        process.exit(1);
      }

      // Compile
      execSync(`
        cd "${tmpDir}/bubblewrap-${BWRAP_VERSION}" &&
        ./configure --prefix="${tmpDir}/install" &&
        make -j$(nproc 2>/dev/null || echo 4) &&
        make install
      `, { stdio: 'inherit' });

      // Copy binary
      fs.copyFileSync(path.join(tmpDir, 'install', 'bin', 'bwrap'), binaryPath);
      fs.chmodSync(binaryPath, 0o755);

      console.log('✅ Bubblewrap compiled successfully');

    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

  } catch (compileError) {
    console.log('❌ Failed to compile bubblewrap');
    console.log('💡 Please install bubblewrap system-wide:');
    console.log('   sudo apt-get install bubblewrap  # Ubuntu/Debian');
    console.log('   sudo apk add bubblewrap          # Alpine');
    console.log('   sudo yum install bubblewrap      # CentOS/RHEL');
    console.log('');
    console.log('Then try installing SandboxBox again.');
    throw compileError; // Re-throw to let the caller handle it
  }
}

// Run the download
downloadBubblewrap().catch(error => {
  console.error('❌ Setup failed:', error.message);
  // Don't exit with error code 1, just warn and continue
  console.log('ℹ️  SandboxBox will use system bubblewrap if available');
});