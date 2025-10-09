#!/usr/bin/env node

/**
 * SQLite-style build script for SandboxBox
 * Downloads bubblewrap binary during npm install, with fallback to building from source
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

  // SQLite-style approach: try binary downloads first, then build from source
  if (await downloadPreBuiltBinary(binaryPath)) {
    return; // Binary download succeeded
  }

  if (await buildFromSource(binaryPath)) {
    return; // Build from source succeeded
  }

  // Everything failed - show clear error
  console.error('❌ All bubblewrap installation methods failed!');
  console.error('');
  console.error('💡 Option 1 - Install system bubblewrap (recommended):');
  console.error('   sudo apt-get install bubblewrap    # Ubuntu/Debian');
  console.error('   sudo apk add bubblewrap            # Alpine');
  console.error('   sudo yum install bubblewrap        # CentOS/RHEL');
  console.error('');
  console.error('💡 Option 2 - Install build tools for compilation:');
  console.error('   sudo apt-get install build-essential git autoconf automake libtool xz-utils');
  console.error('   sudo yum groupinstall "Development Tools" && sudo yum install git xz');
  console.error('');
  console.error('🚫 SandboxBox cannot function without bubblewrap.');
  process.exit(1);
}

async function downloadPreBuiltBinary(binaryPath) {
  console.log('📥 Trying pre-built bubblewrap binary...');

  const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
  const possibleUrls = [
    // Alpine packages (HTTPS) - use the actual available version
    `https://dl-cdn.alpinelinux.org/alpine/v3.20/main/${arch}/bubblewrap-0.10.0-r0.apk`,
    // Try GitHub releases with different architectures
    `https://github.com/containers/bubblewrap/releases/download/v${BWRAP_VERSION}/bubblewrap-${BWRAP_VERSION}-${arch}.tar.xz`,
    `https://github.com/containers/bubblewrap/releases/download/v${BWRAP_VERSION}/bubblewrap-${BWRAP_VERSION}.tar.gz`,
  ];

  for (const url of possibleUrls) {
    try {
      console.log(`📦 Trying: ${url.split('/').pop()}`);

      const response = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode === 200) {
            resolve(res);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        }).on('error', reject);
      });

      if (url.endsWith('.apk')) {
        // Handle Alpine package
        console.log('📦 Alpine package found, extracting...');
        return await extractAlpinePackage(url, binaryPath);
      } else {
        // Handle tarball
        return await extractTarball(url, binaryPath);
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      continue;
    }
  }

  console.log('❌ No pre-built binaries available');
  return false;
}

async function extractAlpinePackage(url, binaryPath) {
  const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'apk-extract-'));

  try {
    const apkPath = path.join(tmpDir, 'bubblewrap.apk');

    // Download APK
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(apkPath);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', resolve);
      }).on('error', reject);
    });

    // Extract APK (tar.gz format)
    execSync(`tar -xzf "${apkPath}" -C "${tmpDir}"`, { stdio: 'inherit' });

    // Find the binary
    const possiblePaths = [
      path.join(tmpDir, 'usr', 'bin', 'bwrap'),
      path.join(tmpDir, 'bin', 'bwrap'),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        fs.copyFileSync(possiblePath, binaryPath);
        fs.chmodSync(binaryPath, 0o755);
        console.log('✅ Extracted pre-built binary from Alpine package');
        return true;
      }
    }

    throw new Error('Binary not found in package');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function extractTarball(url, binaryPath) {
  const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'tar-extract-'));

  try {
    const tarballPath = path.join(tmpDir, 'bubblewrap.tar');

    // Download tarball
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tarballPath);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', resolve);
      }).on('error', reject);
    });

    // Extract with available tools
    if (tarballPath.endsWith('.xz')) {
      try {
        execSync(`tar -xf "${tarballPath}" -C "${tmpDir}"`, { stdio: 'inherit' });
      } catch (e) {
        throw new Error('xz extraction failed - need xz-utils');
      }
    } else {
      execSync(`tar -xzf "${tarballPath}" -C "${tmpDir}"`, { stdio: 'inherit' });
    }

    // Find the binary
    const possiblePaths = [
      path.join(tmpDir, `bubblewrap-${BWRAP_VERSION}`, 'bwrap'),
      path.join(tmpDir, 'bwrap'),
      path.join(tmpDir, 'bin', 'bwrap'),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        fs.copyFileSync(possiblePath, binaryPath);
        fs.chmodSync(binaryPath, 0o755);
        console.log('✅ Extracted pre-built binary');
        return true;
      }
    }

    throw new Error('Binary not found in tarball');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function buildFromSource(binaryPath) {
  console.log('🔨 Building bubblewrap from source (SQLite-style)...');

  const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'bwrap-build-'));

  try {
    // Try to use system bubblewrap as fallback if available
    try {
      const systemBwrap = execSync('which bwrap', { encoding: 'utf8' }).trim();
      if (systemBwrap && fs.existsSync(systemBwrap)) {
        fs.copyFileSync(systemBwrap, binaryPath);
        fs.chmodSync(binaryPath, 0o755);
        console.log('✅ Using system bubblewrap:', systemBwrap);
        return true;
      }
    } catch (e) {
      // System bwrap not found, continue with build
    }

    // Clone git repository for build files
    console.log('📥 Downloading bubblewrap source from git...');
    const sourceDir = path.join(tmpDir, 'bubblewrap');

    execSync(`
      cd "${tmpDir}" &&
      timeout 120 git clone --depth 1 --branch v${BWRAP_VERSION} https://github.com/containers/bubblewrap.git
    `, { stdio: 'inherit' });

    // Check for required build tools
    const missingTools = [];
    try {
      execSync('which gcc', { stdio: 'ignore' });
    } catch (e) {
      missingTools.push('gcc');
    }

    try {
      execSync('which git', { stdio: 'ignore' });
    } catch (e) {
      missingTools.push('git');
    }

    if (missingTools.length > 0) {
      console.error(`❌ Missing build tools: ${missingTools.join(', ')}`);
      console.error('');
      console.error('💡 Install build tools:');
      console.error('   Ubuntu/Debian: sudo apt-get install build-essential git');
      console.error('   CentOS/RHEL: sudo yum groupinstall "Development Tools" && sudo yum install git');
      console.error('');
      console.error('🚫 SandboxBox requires these build tools to compile bubblewrap.');
      return false;
    }

    // Simple compilation without autotools
    console.log('🏗️  Compiling bubblewrap directly...');
    try {
      execSync(`
        cd "${sourceDir}" &&
        timeout 120 gcc -std=c99 -O2 -DHAVE_CONFIG_H=1 -o bwrap bubblewrap.c || \
        gcc -std=c99 -O2 -o bwrap bubblewrap.c
      `, { stdio: 'inherit' });
    } catch (e) {
      console.error('❌ Direct compilation failed');
      return false;
    }

    // Copy binary to final location
    const builtBinary = path.join(sourceDir, 'bwrap');
    if (fs.existsSync(builtBinary)) {
      fs.copyFileSync(builtBinary, binaryPath);
      fs.chmodSync(binaryPath, 0o755);
      console.log('✅ Bubblewrap built successfully!');

      // Test the binary
      const version = execSync(`"${binaryPath}" --version`, { encoding: 'utf8' });
      console.log(`🎯 Built: ${version.trim()}`);
      return true;
    } else {
      console.log('❌ Built binary not found');
      return false;
    }

  } catch (error) {
    console.log(`❌ Build from source failed: ${error.message}`);
    return false;
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Run the build
downloadAndBuild().catch(error => {
  console.error('❌ Bubblewrap build failed:', error.message);
  console.error('');
  console.error('🚫 SandboxBox cannot function without bubblewrap.');
  console.error('   Please install build tools and try again.');
  process.exit(1);
});