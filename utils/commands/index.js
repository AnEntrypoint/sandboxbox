import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { color } from '../colors.js';
import { checkQemu } from '../qemu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export { buildCommand, runCommand, shellCommand } from './container.js';
export { claudeCommand } from './claude.js';

export function versionCommand() {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf-8'));
    console.log(color('green', `SandboxBox v${packageJson.version}`));
    console.log(color('cyan', 'Truly portable containers with QEMU + Playwright'));
    if (checkQemu()) {
      console.log(color('green', '✅ QEMU available'));
    }
    return true;
  } catch (error) {
    console.log(color('red', '❌ Could not read version'));
    return false;
  }
}
