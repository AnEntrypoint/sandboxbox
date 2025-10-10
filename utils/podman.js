import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

      // Auto-setup minimal backend for Windows portable operation
      if (process.platform === 'win32' && isBundled) {
        try {
          execSync(`"${newPodmanPath}" info`, { ...execOptions, stdio: 'pipe' });
        } catch (infoError) {
          if (infoError.message.includes('Cannot connect to Podman')) {
            console.log('\n🔧 Setting up portable Podman backend...');
            try {
              // Try to start existing machine first
              execSync(`"${newPodmanPath}" machine start`, {
                stdio: 'inherit',
                shell: true,
                cwd: __dirname
              });
              console.log('\n✅ Portable Podman backend started!');
            } catch (startError) {
              if (startError.message.includes('does not exist') || startError.message.includes('not found')) {
                try {
                  // Create new machine if none exists
                  execSync(`"${newPodmanPath}" machine init --rootful=false`, {
                    stdio: 'inherit',
                    shell: true,
                    cwd: __dirname
                  });
                  execSync(`"${newPodmanPath}" machine start`, {
                    stdio: 'inherit',
                    shell: true,
                    cwd: __dirname
                  });
                  console.log('\n✅ Portable Podman backend created and started!');
                } catch (initError) {
                  console.log('\n⚠️  Podman backend setup needed on first container run');
                }
              } else {
                console.log('\n⚠️  Podman backend setup needed on first container run');
              }
            }
          }
        }
      }

      console.log('\n✅ Portable Podman ready');

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