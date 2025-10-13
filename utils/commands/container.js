import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { color } from '../colors.js';
import { checkQemu, getDiskImagePath, buildQemuCommand } from '../qemu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildCommand(dockerfilePath) {
  console.log(color('yellow', '⚠️  Build command not yet implemented for QEMU'));
  console.log(color('cyan', 'Will create disk image from Dockerfile'));
  return false;
}

export function runCommand(projectDir, cmd = 'bash') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  console.log(color('blue', '🚀 Starting QEMU virtual machine...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${cmd}\n`));

  const qemuPath = checkQemu();
  if (!qemuPath) {
    console.log(color('red', '❌ QEMU not found'));
    console.log(color('yellow', '📦 Auto-downloading QEMU...'));
    return false;
  }

  const diskImage = getDiskImagePath();
  if (!existsSync(diskImage)) {
    console.log(color('red', '❌ Disk image not found'));
    console.log(color('yellow', '📦 Downloading Playwright disk image...'));
    return false;
  }

  console.log(color('green', `✅ QEMU ready: ${qemuPath}`));
  console.log(color('green', `✅ Disk image: ${diskImage}`));

  const qemuCmd = buildQemuCommand(diskImage, projectDir);
  console.log(color('cyan', '\n🖥️  Booting Linux VM...\n'));

  try {
    execSync(qemuCmd, {
      stdio: 'inherit',
      shell: true
    });

    console.log(color('green', '\n✅ VM session completed!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ VM failed: ${error.message}`));
    return false;
  }
}

export function shellCommand(projectDir) {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  console.log(color('blue', '🚀 Starting interactive shell...'));
  return runCommand(projectDir, 'bash');
}

export function versionCommand() {
  const qemuPath = checkQemu();
  if (!qemuPath) {
    console.log(color('red', '❌ QEMU not found'));
    return false;
  }

  try {
    const version = execSync(`${qemuPath} --version`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(color('green', version.trim()));
    return true;
  } catch (error) {
    console.log(color('red', `❌ Version check failed: ${error.message}`));
    return false;
  }
}
