import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { color } from '../colors.js';
import { checkQemu, getDiskImagePath, buildQemuCommand } from '../qemu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function claudeCommand(projectDir, command = 'claude') {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  if (!existsSync(resolve(projectDir, '.git'))) {
    console.log(color('red', `❌ Not a git repository: ${projectDir}`));
    console.log(color('yellow', 'Please run this command in a git repository directory'));
    return false;
  }

  console.log(color('blue', '🚀 Starting Claude Code in QEMU VM...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Command: ${command}\n`));

  const qemuPath = checkQemu();
  if (!qemuPath) {
    console.log(color('red', '❌ QEMU not found'));
    return false;
  }

  const diskImage = getDiskImagePath();
  if (!existsSync(diskImage)) {
    console.log(color('red', '❌ Disk image not found'));
    return false;
  }

  const qemuCmd = buildQemuCommand(diskImage, projectDir, '4G', 4);

  try {
    execSync(qemuCmd, {
      stdio: 'inherit',
      shell: true
    });

    console.log(color('green', '\n✅ Claude Code session completed!'));
    return true;
  } catch (error) {
    console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
    return false;
  }
}
