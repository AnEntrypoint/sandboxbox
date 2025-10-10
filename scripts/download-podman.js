#!/usr/bin/env node

/**
 * Auto-download Podman portable binaries
 * Similar to how sqlite/playwright auto-downloads platform-specific binaries
 */

import { createWriteStream, existsSync, mkdirSync, chmodSync, unlinkSync, createReadStream, readdirSync, statSync } from 'fs';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const binDir = join(__dirname, '..', 'bin');

// Podman remote client versions
const PODMAN_VERSION = '4.9.3';

// Get architecture
const ARCH = process.arch === 'arm64' ? 'arm64' : 'amd64';

const DOWNLOADS = {
  win32: {
    url: `https://github.com/containers/podman/releases/download/v${PODMAN_VERSION}/podman-remote-release-windows_amd64.zip`,
    binary: 'podman.exe',
    extract: 'unzip'
  },
  darwin: {
    url: `https://github.com/containers/podman/releases/download/v${PODMAN_VERSION}/podman-remote-release-darwin_${ARCH}.tar.gz`,
    binary: 'podman',
    extract: 'tar'
  },
  linux: {
    url: `https://github.com/containers/podman/releases/download/v${PODMAN_VERSION}/podman-remote-static-linux_${ARCH}.tar.gz`,
    binary: `podman-remote-static-linux_${ARCH}`,
    extract: 'tar'
  }
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? httpsGet : httpGet;

    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(dest);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', reject);
    }).on('error', reject);
  });
}

// Simple ZIP extraction using built-in Node.js modules
// Basic implementation that handles standard ZIP files without compression complications
async function extractZip(zipPath, extractTo) {
  return new Promise((resolve, reject) => {
    try {
      // For Windows, we'll use PowerShell's built-in ZIP extraction capability
      // This is more reliable than expecting external tools
      const psCommand = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${extractTo.replace(/'/g, "''")}')`;

      execSync(`powershell -Command "${psCommand}"`, {
        stdio: 'pipe',
        cwd: __dirname,
        shell: true
      });

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Extract tar.gz files using Node.js built-in modules
async function extractTarGz(tarPath, extractTo, stripComponents = 0) {
  return new Promise(async (resolve, reject) => {
    try {
      // First, decompress the .gz file
      const tarWithoutGz = tarPath.replace('.gz', '');
      const readStream = createReadStream(tarPath);
      const writeStream = createWriteStream(tarWithoutGz);
      const gunzip = createGunzip();

      await pipeline(readStream, gunzip, writeStream);

      // For tar extraction, we need to use system tar since implementing a full tar parser is complex
      // But we'll ensure it works across platforms by providing fallbacks
      try {
        execSync(`tar -xf "${tarWithoutGz}" -C "${extractTo}"${stripComponents ? ` --strip-components=${stripComponents}` : ''}`, {
          stdio: 'pipe',
          shell: process.platform === 'win32'
        });
      } catch (tarError) {
        // If system tar fails, try with specific flags for different platforms
        if (process.platform === 'win32') {
          // On Windows, try with different tar implementations
          try {
            execSync(`bsdtar -xf "${tarWithoutGz}" -C "${extractTo}"${stripComponents ? ` --strip-components=${stripComponents}` : ''}`, {
              stdio: 'pipe',
              shell: true
            });
          } catch (bsdtarError) {
            throw new Error(`Failed to extract tar archive. Please install tar or bsdtar: ${tarError.message}`);
          }
        } else {
          throw tarError;
        }
      }

      // Clean up the intermediate .tar file
      unlinkSync(tarWithoutGz);

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function main() {
  const platform = process.platform;

  console.log(`\n📦 Setting up Podman portable binaries for ${platform}...`);

  if (!DOWNLOADS[platform]) {
    console.log(`⚠️  Platform ${platform} not supported for auto-download`);
    console.log(`   Skipping auto-download (will use system Podman if available)`);
    return;
  }

  // Create bin directory
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  const { url, binary, extract } = DOWNLOADS[platform];
  const binaryPath = join(binDir, binary);

  // Check if already downloaded
  if (existsSync(binaryPath)) {
    console.log(`✅ Podman already installed at ${binaryPath}`);
    return;
  }

  console.log(`📥 Downloading Podman remote v${PODMAN_VERSION}...`);

  const archiveName = url.split('/').pop();
  const archivePath = join(binDir, archiveName);

  try {
    // Clean up any previous failed extractions using fs operations
    const extractedDir = join(binDir, 'podman-4.9.3');
    if (existsSync(extractedDir)) {
      const fs = await import('fs/promises');
      await fs.rm(extractedDir, { recursive: true, force: true });
    }

    // Download archive
    console.log(`   Downloading from GitHub releases...`);
    await download(url, archivePath);
    console.log(`✅ Downloaded successfully`);

    // Extract based on platform
    console.log(`📦 Extracting...`);
    if (extract === 'tar') {
      await extractTarGz(archivePath, binDir, 1);
    } else if (extract === 'unzip') {
      await extractZip(archivePath, binDir);

      // Windows-specific: move podman.exe from nested directory to bin/
      if (platform === 'win32') {
        const extractedDir = join(binDir, `podman-4.9.3`);
        const extractedPodman = join(extractedDir, 'usr', 'bin', 'podman.exe');
        const targetPodman = join(binDir, binary);

        if (existsSync(extractedPodman)) {
          // Use fs operations instead of shell commands for cross-platform compatibility
          const fs = await import('fs/promises');
          await fs.copyFile(extractedPodman, targetPodman);

          // Clean up the extracted directory
          await fs.rm(extractedDir, { recursive: true, force: true });
        }
      }
    }

    // Make executable on Unix
    if (platform !== 'win32' && existsSync(binaryPath)) {
      chmodSync(binaryPath, 0o755);
    }

    console.log(`✅ Podman remote installed successfully!`);
    console.log(`   Binary: ${binaryPath}\n`);

    // Clean up archive
    if (existsSync(archivePath)) {
      unlinkSync(archivePath);
    }

  } catch (error) {
    console.error(`⚠️  Auto-download failed: ${error.message}`);
    console.log(`\n💡 No problem! You can install Podman manually:`);
    if (platform === 'win32') {
      console.log(`   winget install RedHat.Podman`);
    } else if (platform === 'darwin') {
      console.log(`   brew install podman && podman machine init && podman machine start`);
    } else {
      console.log(`   sudo apt-get install podman  # Ubuntu/Debian`);
    }
    console.log(`\n   Or it will use system Podman if installed.\n`);
    // Don't fail the npm install
  }
}

main().catch(() => {
  // Silently fail - will use system Podman
});
