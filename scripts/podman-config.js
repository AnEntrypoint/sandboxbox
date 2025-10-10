export const PODMAN_VERSION = '4.9.3';
export const ARCH = process.arch === 'arm64' ? 'arm64' : 'amd64';

export const DOWNLOADS = {
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