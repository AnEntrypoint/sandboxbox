import { existsSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { color } from './colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getPodmanPath() {
  const platform = process.platform;
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  let bundledPodman;

  if (platform === 'win32') {
    bundledPodman = resolve(__dirname, '..', 'bin', 'podman.exe');
  } else if (platform === 'darwin') {
    bundledPodman = resolve(__dirname, '..', 'bin', 'podman');
  } else {
    bundledPodman = resolve(__dirname, '..', 'bin', `podman-remote-static-linux_${arch}`);
  }

  if (existsSync(bundledPodman)) {
    return bundledPodman;
  }
  return 'podman';
}

export function setupBackendNonBlocking(podmanPath) {
  if (process.platform === 'linux') {
    // Linux can run true rootless Podman
    const execOptions = { encoding: 'utf-8', stdio: 'pipe', shell: true };
    try {
      execSync(`"${podmanPath}" info`, execOptions);
      return true;
    } catch (infoError) {
      console.log(color('yellow', '\n🔧 Starting Podman rootless service...'));
      // Try to start service automatically
      try {
        execSync('podman system service --time=0 &', { stdio: 'ignore', shell: true });
        return true;
      } catch (serviceError) {
        console.log(color('cyan', '   Run: podman system service --time=0 &'));
        return false;
      }
    }
  }

  // Windows: Implement completely silent automated setup
  if (process.platform === 'win32') {
    const execOptions = { encoding: 'utf-8', stdio: 'pipe', shell: true };

    try {
      execSync(`"${podmanPath}" info`, execOptions);
      return true;
    } catch (infoError) {
      if (!infoError.message.includes('Cannot connect to Podman')) {
        return false;
      }

      console.log(color('yellow', '\n🔧 Setting up Podman automatically (silent mode)...'));

      // Start machine setup in background without blocking
      setupMachineBackground(podmanPath);
      return true; // Continue even if setup is in progress
    }
  }

  // macOS: Similar automated approach
  if (process.platform === 'darwin') {
    const execOptions = { encoding: 'utf-8', stdio: 'pipe', shell: true };

    try {
      execSync(`"${podmanPath}" info`, execOptions);
      return true;
    } catch (infoError) {
      if (!infoError.message.includes('Cannot connect to Podman')) {
        return false;
      }

      console.log(color('yellow', '\n🔧 Setting up Podman automatically...'));
      setupMachineBackground(podmanPath);
      return true;
    }
  }

  return false;
}

function setupMachineBackground(podmanPath) {
  console.log(color('cyan', '   Starting machine setup in background...'));

  const initCmd = process.platform === 'win32'
    ? `"${podmanPath}" machine init --rootful=false`
    : `"${podmanPath}" machine init`;

  // Windows-specific: Use completely hidden process execution
  const spawnOptions = process.platform === 'win32' ? {
    stdio: ['ignore', 'ignore', 'ignore'],
    shell: true,
    detached: true,
    windowsHide: true, // Hide the console window on Windows
    cwd: process.cwd() // Ensure working directory is set
  } : {
    stdio: ['ignore', 'ignore', 'ignore'],
    shell: true,
    detached: true
  };

  const initProcess = spawn(initCmd, spawnOptions);
  initProcess.unref();

  // Start machine after init completes (with delay)
  setTimeout(() => {
    const startCmd = `"${podmanPath}" machine start`;
    const startProcess = spawn(startCmd, spawnOptions);
    startProcess.unref();
  }, 30000); // Wait 30 seconds for init to complete

  console.log(color('yellow', '   Setup initiated in background (may take 2-3 minutes)'));
  console.log(color('cyan', '   Container operations will work when setup completes\n'));
}

export function checkBackend(podmanPath) {
  if (process.platform === 'linux') return true;

  const execOptions = { encoding: 'utf-8', stdio: 'pipe', shell: true };

  try {
    execSync(`"${podmanPath}" info`, execOptions);
    return true;
  } catch (infoError) {
    if (infoError.message.includes('Cannot connect to Podman')) {
      console.log(color('red', '\n❌ Podman backend not running'));
      console.log(color('yellow', '\n📋 One-time setup required:'));
      console.log(color('cyan', process.platform === 'win32'
        ? '   Run: podman machine init --rootful=false && podman machine start'
        : '   Run: podman machine init && podman machine start'));
      console.log(color('yellow', '\n⏱️  This takes 2-3 minutes, then works instantly forever.\n'));
      return false;
    }
    throw infoError;
  }
}

export function checkPodman() {
  const podmanPath = getPodmanPath();
  const isBundled = podmanPath.includes('bin');

  try {
    const execOptions = {
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: process.platform === 'win32'
    };

    const version = execSync(`"${podmanPath}" --version`, execOptions).trim();
    console.log(color('green', `✅ ${version}${isBundled ? ' (bundled)' : ''}`));
    return podmanPath;
  } catch (error) {
    console.log('❌ Podman not found');
    console.log('\n📦 Auto-downloading Podman...');

    try {
      const scriptPath = resolve(__dirname, '..', 'scripts', 'download-podman.js');
      execSync(`node "${scriptPath}"`, { stdio: 'inherit', cwd: __dirname, shell: process.platform === 'win32' });

      const newPodmanPath = getPodmanPath();
      if (!existsSync(newPodmanPath) && newPodmanPath !== 'podman') {
        throw new Error('Download completed but binary not found');
      }

      const execOptions = {
        encoding: 'utf-8',
        stdio: 'pipe',
        shell: process.platform === 'win32'
      };

      const newVersion = execSync(`"${newPodmanPath}" --version`, execOptions).trim();
      console.log(`\n✅ ${newVersion} (auto-downloaded)`);
      console.log('✅ Portable Podman ready');

      return newPodmanPath;
    } catch (downloadError) {
      console.log(`\n❌ Auto-download failed: ${downloadError.message}`);
    }

    console.log('\n💡 Please install Podman manually:');
    if (process.platform === 'win32') {
      console.log('   winget install RedHat.Podman');
    } else if (process.platform === 'darwin') {
      console.log('   brew install podman');
      console.log('   podman machine init && podman machine start');
    } else {
      console.log('   sudo apt-get install podman       # Ubuntu/Debian');
      console.log('   sudo dnf install podman           # Fedora');
    }
    console.log('');
    return null;
  }
}