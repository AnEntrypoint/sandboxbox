#!/usr/bin/env node

// Post-install script to fix @ast-grep/napi Windows binding issue
// This works around npm bug #4828 with optional dependencies on Windows

import { platform, arch } from 'os';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execPromise = promisify(exec);

async function fixAstGrepBinding() {
  // Only run on Windows x64
  if (platform() !== 'win32' || arch() !== 'x64') {
    return;
  }

  const bindingPath = 'node_modules/@ast-grep/napi-win32-x64-msvc';
  const nodeFile = join(bindingPath, 'ast-grep-napi.win32-x64-msvc.node');

  // Check if binding is already installed and has the .node file
  if (existsSync(nodeFile)) {
    return; // Silently succeed if already installed
  }

  console.error('⚠️  @ast-grep/napi Windows binding missing, installing...');

  try {
    // Download and extract the Windows binding
    await execPromise('npm pack @ast-grep/napi-win32-x64-msvc@0.39.5');
    await execPromise('tar -xzf ast-grep-napi-win32-x64-msvc-0.39.5.tgz');

    // Create directory and copy files using Node.js APIs (cross-platform)
    mkdirSync(bindingPath, { recursive: true });
    cpSync('package', bindingPath, { recursive: true });

    // Clean up
    rmSync('package', { recursive: true, force: true });
    rmSync('ast-grep-napi-win32-x64-msvc-0.39.5.tgz', { force: true });

    console.error('✓ @ast-grep/napi Windows binding installed successfully');
  } catch (error) {
    // Silent failure - AST features will gracefully degrade
    console.error('✗ Failed to install @ast-grep/napi Windows binding:', error.message);
  }
}

fixAstGrepBinding().catch(console.error);