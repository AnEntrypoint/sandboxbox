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
      // Check existing machines with timeout
      let machines = [];
      try {
        const machineListOutput = execSync(`"${podmanPath}" machine list --format json`, {
          ...execOptions,
          timeout: 10000 // 10 seconds timeout
        });
        machines = JSON.parse(machineListOutput || '[]');
        console.log(color('cyan', `   Found ${machines.length} existing machine(s)`));
      } catch (machineListError) {
        console.log(color('yellow', '   Could not list machines, assuming no machines exist'));
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
          timeout: 10000
        });

        if (statusOutput.includes('Running')) {
          console.log(color('green', '   Machine is already running'));
        } else {
          console.log(color('cyan', '   Starting Podman machine...'));
          execSync(`"${podmanPath}" machine start`, {
            stdio: 'inherit',
            shell: true,
            timeout: 180000 // 3 minutes
          });
        }
      } catch (statusError) {
        console.log(color('cyan', '   Could not check status, attempting to start machine...'));
        execSync(`"${podmanPath}" machine start`, {
          stdio: 'inherit',
          shell: true,
          timeout: 180000 // 3 minutes
        });
      }

      // Verify backend is actually working
      console.log(color('cyan', '   Verifying backend connection...'));
      try {
        execSync(`"${podmanPath}" info`, execOptions);
      } catch (verifyError) {
        console.log(color('red', `   Backend verification failed: ${verifyError.message}`));
        console.log(color('yellow', '   Please ensure Podman machine is running manually'));
        return false;
      }

      console.log(color('green', '\n✅ Podman backend setup completed!\n'));
      return true;
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