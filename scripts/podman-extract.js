import { createWriteStream, createReadStream, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

export async function extractZip(zipPath, extractTo) {
  return new Promise((resolve, reject) => {
    try {
      const psCommand = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${extractTo.replace(/'/g, "''")}')`;

      execSync(`powershell -Command "${psCommand}"`, {
        stdio: 'pipe',
        shell: true,
        windowsHide: true,
        timeout: 120000 // ZIP extraction can take time
      });

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export async function extractTarGz(tarPath, extractTo, stripComponents = 0) {
  return new Promise(async (resolve, reject) => {
    try {
      const tarWithoutGz = tarPath.replace('.gz', '');
      const readStream = createReadStream(tarPath);
      const writeStream = createWriteStream(tarWithoutGz);
      const gunzip = createGunzip();

      await pipeline(readStream, gunzip, writeStream);

      try {
        execSync(`tar -xf "${tarWithoutGz}" -C "${extractTo}"${stripComponents ? ` --strip-components=${stripComponents}` : ''}`, {
          stdio: 'pipe',
          shell: process.platform === 'win32',
          windowsHide: process.platform === 'win32',
          timeout: 120000
        });
      } catch (tarError) {
        if (process.platform === 'win32') {
          try {
            execSync(`bsdtar -xf "${tarWithoutGz}" -C "${extractTo}"${stripComponents ? ` --strip-components=${stripComponents}` : ''}`, {
              stdio: 'pipe',
              shell: true,
              windowsHide: true,
              timeout: 120000
            });
          } catch (bsdtarError) {
            throw new Error(`Failed to extract tar archive. Please install tar or bsdtar: ${tarError.message}`);
          }
        } else {
          throw tarError;
        }
      }

      unlinkSync(tarWithoutGz);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function download(url, dest) {
  return new Promise(async (resolve, reject) => {
    const { get: httpsGet } = await import('https');
    const { get: httpGet } = await import('http');
    const { createWriteStream } = await import('fs');

    const get = url.startsWith('https') ? httpsGet : httpGet;

    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(dest);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', reject);
    }).on('error', reject);
  });
}