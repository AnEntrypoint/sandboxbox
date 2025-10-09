/**
 * Portable bubblewrap binary manager
 * Handles bundled, system, and downloaded bubblewrap binaries
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BubblewrapManager {
  constructor() {
    this.bwrapPath = null;
    this.alpineRoot = path.join(
      process.env.HOME || process.env.USERPROFILE,
      '.cache',
      'sandboxbox',
      'alpine-root'
    );
  }

  /**
   * Find bubblewrap binary in this order:
   * 1. Bundled binary (downloaded during npm install)
   * 2. System binary
   * 3. Throw error with helpful message
   */
  findBubblewrap() {
    if (this.bwrapPath) {
      return this.bwrapPath;
    }

    // Try bundled binary first
    const bundledPath = path.join(__dirname, '..', 'bin', 'bwrap');
    if (fs.existsSync(bundledPath)) {
      try {
        // Test if it works
        execSync(`"${bundledPath}" --version`, { stdio: 'ignore' });
        this.bwrapPath = bundledPath;
        console.log('✅ Using bundled bubblewrap');
        return this.bwrapPath;
      } catch (e) {
        console.log('⚠️  Bundled bubblewrap not working, falling back to system...');
      }
    }

    // Try system binary
    try {
      const systemBwrap = execSync('which bwrap', { encoding: 'utf8' }).trim();
      if (systemBwrap && fs.existsSync(systemBwrap)) {
        execSync(`"${systemBwrap}" --version`, { stdio: 'ignore' });
        this.bwrapPath = systemBwrap;
        console.log('✅ Using system bubblewrap');
        return this.bwrapPath;
      }
    } catch (e) {
      // System bwrap not available
    }

    // No bubblewrap found
    throw new Error(`
❌ Bubblewrap not found!

💡 Easy fixes:
1. Reinstall SandboxBox: npm uninstall sandboxbox && npm install sandboxbox
2. Install system-wide: sudo apt-get install bubblewrap
3. Install manually: https://github.com/containers/bubblewrap

📦 SandboxBox works on Linux only and requires bubblewrap for container isolation.
`);
  }

  /**
   * Check if bubblewrap is available
   */
  isAvailable() {
    try {
      this.findBubblewrap();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get bubblewrap version
   */
  getVersion() {
    try {
      const bwrapPath = this.findBubblewrap();
      const version = execSync(`"${bwrapPath}" --version`, { encoding: 'utf8' });
      return version.trim();
    } catch (e) {
      return 'Unknown';
    }
  }

  /**
   * Check if user namespaces are available
   */
  checkUserNamespaces() {
    try {
      // Try to create a user namespace
      execSync('unshare -U true', { stdio: 'ignore' });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Setup Alpine Linux rootfs if needed
   */
  async ensureAlpineRoot() {
    if (fs.existsSync(path.join(this.alpineRoot, 'bin', 'sh'))) {
      return; // Already set up
    }

    console.log('🏔️  Setting up Alpine Linux environment...');

    fs.mkdirSync(this.alpineRoot, { recursive: true });

    // Download Alpine minirootfs
    const alpineVersion = '3.20.2';
    const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
    const tarball = `alpine-minirootfs-${alpineVersion}-${arch}.tar.gz`;
    const tarballPath = path.join(this.alpineRoot, tarball);

    console.log('📥 Downloading Alpine Linux...');
    const url = `https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/${arch}/${tarball}`;

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tarballPath);

      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', reject);
    });

    // Extract Alpine
    console.log('📦 Extracting Alpine rootfs...');
    execSync(`tar -xzf "${tarballPath}" -C "${this.alpineRoot}"`, { stdio: 'inherit' });
    fs.unlinkSync(tarballPath);

    // Install basic packages
    console.log('🔧 Installing Node.js and Chromium...');
    const bwrapPath = this.findBubblewrap();

    execSync(`
      "${bwrapPath}" \\
        --ro-bind "${this.alpineRoot}" / \\
        --proc /proc \\
        --dev /dev \\
        --tmpfs /tmp \\
        --share-net \\
        --die-with-parent \\
        /bin/sh -c "
          echo 'https://dl-cdn.alpinelinux.org/alpine/v3.20/main' > /etc/apk/repositories
          echo 'https://dl-cdn.alpinelinux.org/alpine/v3.20/community' >> /etc/apk/repositories
          apk update
          apk add --no-cache nodejs npm chromium nss freetype harfbuzz ttf-freefont xvfb mesa-gl libx11 libxrandr libxss
          echo '✅ Alpine setup complete'
        "
    `, { stdio: 'inherit' });

    console.log('✅ Alpine Linux environment ready!');
  }

  /**
   * Get Alpine root path
   */
  getAlpineRoot() {
    return this.alpineRoot;
  }

  /**
   * Cleanup cached files
   */
  cleanup() {
    if (fs.existsSync(this.alpineRoot)) {
      fs.rmSync(this.alpineRoot, { recursive: true, force: true });
      console.log('🧹 Cleaned up Alpine cache');
    }
  }
}

// Export singleton instance
export const bubblewrap = new BubblewrapManager();