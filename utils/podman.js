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
  if (process.platform === 'linux') return true;

  const execOptions = { encoding: 'utf-8', stdio: 'pipe', shell: true };

  try {
    execSync(`"${podmanPath}" info`, execOptions);
    return true;
  } catch (infoError) {
    if (!infoError.message.includes('Cannot connect to Podman')) {
      return false;
    }

    console.log(color('yellow', '\n🔧 Initializing Podman backend (one-time setup, takes 2-3 minutes)...'));

    try {
      // Check existing machines with shorter timeout
      let machines = [];
      try {
        const machineListOutput = execSync(`"${podmanPath}" machine list --format json`, {
          ...execOptions,
          timeout: 3000 // 3 seconds timeout
        });
        machines = JSON.parse(machineListOutput || '[]');
        console.log(color('cyan', `   Found ${machines.length} existing machine(s)`));
      } catch (machineListError) {
        console.log(color('yellow', '   Could not list machines quickly, checking via info command...'));
        // Try to detect if machine exists by checking for specific error messages
        try {
          execSync(`"${podmanPath}" info`, {
            ...execOptions,
            timeout: 3000
          });
          console.log(color('green', '   Backend is already working!'));
          return true;
        } catch (infoError) {
          if (infoError.message.includes('127.0.0.1')) {
            console.log(color('cyan', '   Machine exists but not running, proceeding...'));
          } else {
            console.log(color('yellow', '   Assuming no machines exist'));
          }
        }
      }

      if (machines.length === 0) {
        console.log(color('cyan', '   Creating Podman machine...'));
        const initCmd = process.platform === 'win32'
          ? `"${podmanPath}" machine init --rootful=false`
          : `"${podmanPath}" machine init`;

        try {
          execSync(initCmd, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            timeout: 120000 // 2 minutes
          });
        } catch (initError) {
          const errorOutput = initError.stdout?.toString() + initError.stderr?.toString();
          if (errorOutput?.includes('already exists') ||
              errorOutput?.includes('VM already exists') ||
              initError.message.includes('already exists')) {
            console.log(color('cyan', '   Machine already exists, proceeding...'));
          } else {
            console.log(color('red', `   Error output: ${errorOutput}`));
            throw initError;
          }
        }
      } else {
        console.log(color('cyan', '   Using existing machine'));
      }

      console.log(color('cyan', '   Checking machine status...'));
      try {
        const statusOutput = execSync(`"${podmanPath}" machine list`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          shell: true,
          timeout: 3000 // 3 seconds timeout
        });

        if (statusOutput.includes('Running')) {
          console.log(color('green', '   Machine is already running'));
        } else {
          console.log(color('cyan', '   Starting Podman machine...'));
          startMachineWithRetry();
        }
      } catch (statusError) {
        console.log(color('cyan', '   Could not check status, attempting to start machine...'));
        startMachineWithRetry();
      }

      // Give background process time to start, then verify once
      console.log(color('cyan', '   Giving background process time to start...'));
      const start = Date.now();
      while (Date.now() - start < 15000) {
        // Wait 15 seconds for background start
      }

      // Quick verification attempt
      console.log(color('cyan', '   Verifying backend connection...'));
      try {
        execSync(`"${podmanPath}" info`, {
          ...execOptions,
          timeout: 5000 // 5 second timeout
        });
        console.log(color('green', '   Backend is ready!'));
      } catch (verifyError) {
        console.log(color('yellow', '   Backend still starting. This is normal for first-time setup.'));
        console.log(color('cyan', '   If this persists, run manually:'));
        const manualCmd = process.platform === 'win32'
          ? `"${podmanPath}" machine init --rootful=false && "${podmanPath}" machine start`
          : `"${podmanPath}" machine init && "${podmanPath}" machine start`;
        console.log(color('cyan', `   ${manualCmd}`));
        console.log(color('yellow', '   Then try sandboxbox again.'));
        return false;
      }

      console.log(color('green', '\n✅ Podman backend setup completed!\n'));
      return true;

      function startMachineWithRetry() {
        // Use completely silent background start
        console.log(color('cyan', '   Starting Podman machine silently in background...'));

        const startProcess = spawn(`"${podmanPath}" machine start`, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          detached: true
        });

        startProcess.unref(); // Completely detach from parent
        console.log(color('yellow', '   Machine start initiated in background (may take 1-2 minutes)'));
      }
    } catch (setupError) {
      if (setupError.signal === 'SIGTERM') {
        console.log(color('red', '\n❌ Setup timed out. Please run manually:'));
      } else {
        console.log(color('red', `\n❌ Setup failed: ${setupError.message}`));
        console.log(color('red', `   Error details: ${setupError.stack}`));
      }

      const manualCmd = process.platform === 'win32'
        ? `"${podmanPath}" machine init --rootful=false && "${podmanPath}" machine start`
        : `"${podmanPath}" machine init && "${podmanPath}" machine start`;
      console.log(color('cyan', `   Manual setup: ${manualCmd}`));
      return false;
    }
  }
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