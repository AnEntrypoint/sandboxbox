import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir, platform, arch } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getQemuPath() {
  const binDir = join(__dirname, '..', 'bin');
  const qemuBinary = platform() === 'win32' ? 'qemu-system-x86_64.exe' : 'qemu-system-x86_64';
  return join(binDir, qemuBinary);
}

export function checkQemu() {
  const qemuPath = getQemuPath();

  if (existsSync(qemuPath)) {
    return qemuPath;
  }

  try {
    execSync('qemu-system-x86_64 --version', { stdio: 'pipe' });
    return 'qemu-system-x86_64';
  } catch {
    return null;
  }
}

export function getDiskImagePath() {
  const cacheDir = join(homedir(), '.sandboxbox', 'images');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  return join(cacheDir, 'playwright-linux.qcow2');
}

export function buildQemuCommand(diskImage, sharedDir, memory = '2G', cpus = 2) {
  const qemuPath = checkQemu() || getQemuPath();

  const args = [
    qemuPath,
    '-m', memory,
    '-smp', cpus.toString(),
    '-drive', `file=${diskImage},format=qcow2`,
    '-virtfs', `local,path=${sharedDir},mount_tag=hostshare,security_model=passthrough,id=hostshare`,
    '-nographic',
    '-serial', 'mon:stdio'
  ];

  if (platform() === 'darwin' && arch() === 'arm64') {
    args.push('-accel', 'hvf');
    args.push('-cpu', 'host');
  } else if (platform() === 'linux') {
    args.push('-enable-kvm');
  }

  return args.join(' ');
}
