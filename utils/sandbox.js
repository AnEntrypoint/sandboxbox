import { mkdtempSync, rmSync, cpSync, existsSync, mkdirSync, writeFileSync, symlinkSync, realpathSync, readFileSync } from 'fs';
import { tmpdir, homedir, platform } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

export function createSandbox(projectDir, options = {}) {
  const { useHostSettings = false, headlessMode = false } = options;
  const sandboxDir = mkdtempSync(join(tmpdir(), 'sandboxbox-'));
  const workspaceDir = join(sandboxDir, 'workspace');
  const VERBOSE_OUTPUT = process.env.SANDBOX_VERBOSE === 'true' || process.argv.includes('--verbose');

  // Ensure host directory is a git repository
  if (!existsSync(join(projectDir, '.git'))) {
    // Initialize git repository in host directory if it doesn't exist
    execSync(`git init "${projectDir}"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  }

  // Configure global git safe directories
  execSync(`git config --global --add safe.directory "${projectDir}"`, {
    stdio: 'pipe',
    shell: true,
    windowsHide: true
  });
  execSync(`git config --global --add safe.directory "${projectDir}/.git"`, {
    stdio: 'pipe',
    shell: true,
    windowsHide: true
  });

  // Configure host repository to accept pushes to current branch
  try {
    execSync(`cd "${projectDir}" && git config receive.denyCurrentBranch updateInstead`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  } catch (error) {
    // Silently skip repository configuration
  }

  // Copy/clone the project to workspace
  if (existsSync(join(projectDir, '.git'))) {
    // If it's a git repo, do a shallow clone
    execSync(`git clone --depth 1 --no-tags "${projectDir}" "${workspaceDir}"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  } else {
    // If not a git repo, just copy the files
    mkdirSync(workspaceDir, { recursive: true });
    execSync(`cp -r "${projectDir}"/* "${workspaceDir}/"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
    // Initialize git in workspace
    execSync(`git init "${workspaceDir}"`, {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
  }

  // Ensure .claude is in .gitignore in the sandbox workspace
  const gitignorePath = join(workspaceDir, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `# Claude Code settings (project-specific, not to be committed)
.claude/

# Dependencies
node_modules/
*.log
.DS_Store
`);
  } else {
    // Add .claude to existing .gitignore if not already present
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.claude/')) {
      writeFileSync(gitignorePath, gitignoreContent + '\n# Claude Code settings (project-specific, not to be committed)\n.claude/\n');
    }
  }

  // Set up host repo as origin in sandbox (pointing to host directory)
  try {
    execSync(`git remote add origin "${projectDir}"`, {
      cwd: workspaceDir,
      stdio: 'pipe',
      shell: true
    });
  } catch (e) {
    // Remote already exists, update it
    execSync(`git remote set-url origin "${projectDir}"`, {
      cwd: workspaceDir,
      stdio: 'pipe',
      shell: true
    });
    // Remote updated silently
  }

  // Set up upstream tracking for current branch
  try {
    const currentBranch = execSync(`git branch --show-current`, {
      cwd: workspaceDir,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    // Ensure the branch exists on the host side
    try {
      execSync(`cd "${projectDir}" && git checkout ${currentBranch}`, {
        stdio: 'pipe',
        shell: true
      });
    } catch (e) {
      // Branch doesn't exist on host, create it
      execSync(`cd "${projectDir}" && git checkout -b ${currentBranch}`, {
        stdio: 'pipe',
        shell: true
      });
    }

    execSync(`git branch --set-upstream-to=origin/${currentBranch} ${currentBranch}`, {
      cwd: workspaceDir,
      stdio: 'pipe',
      shell: true
    });
  } catch (e) {
    // Upstream may not exist yet, ignore error
  }

  // Copy project's .claude/settings.json if it exists (project-level Claude settings)
  const projectClaudeSettingsPath = join(projectDir, '.claude', 'settings.json');
  if (existsSync(projectClaudeSettingsPath)) {
    const sandboxClaudeSettingsPath = join(workspaceDir, '.claude', 'settings.json');
    mkdirSync(join(workspaceDir, '.claude'), { recursive: true });
    cpSync(projectClaudeSettingsPath, sandboxClaudeSettingsPath);

    if (VERBOSE_OUTPUT) {
      console.log('✅ Copied project Claude settings to sandbox');
    }
  }

  // Batch fetch git identity settings for efficiency
  const gitSettings = execSync(`git config --global --get user.name && git config --global --get user.email && git config --global --get color.ui`, {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8'
  }).trim().split('\n');

  const [userName, userEmail, colorUi] = gitSettings;

  // Batch configure git settings in sandbox
  execSync(`git config user.name "${userName}" && git config user.email "${userEmail}" && git config color.ui "${colorUi}"`, {
    cwd: workspaceDir,
    stdio: 'pipe',
    shell: true
  });

  // Configure Git remote to host for bidirectional synchronization
  try {
    execSync(`cd "${workspaceDir}" && git remote add host "${projectDir}"`, {
      stdio: 'pipe',
      shell: true
    });

    if (VERBOSE_OUTPUT) {
      console.log('✅ Configured Git remote to host repository');
    }
  } catch (error) {
    // Remote might already exist, try to update it
    try {
      execSync(`cd "${workspaceDir}" && git remote set-url host "${projectDir}"`, {
        stdio: 'pipe',
        shell: true
      });

      if (VERBOSE_OUTPUT) {
        console.log('✅ Updated Git remote to host repository');
      }
    } catch (updateError) {
      if (VERBOSE_OUTPUT) {
        console.log('⚠️  Could not configure Git remote to host');
      }
    }
  }

  // Setup Claude settings in sandbox
  const hostClaudeDir = join(homedir(), '.claude');
  const sandboxClaudeDir = join(sandboxDir, '.claude');

  // Always use bundled SandboxBox settings unless host settings are requested
  if (!useHostSettings) {
    // Create sandbox Claude directory and copy bundled settings
    mkdirSync(sandboxClaudeDir, { recursive: true });

    const bundledSettingsPath = join(resolve(fileURLToPath(import.meta.url), '..'), '..', 'sandboxbox-settings.json');
    const sandboxSettingsPath = join(sandboxClaudeDir, 'settings.json');

    // Copy bundled settings to sandbox
    if (existsSync(bundledSettingsPath)) {
      cpSync(bundledSettingsPath, sandboxSettingsPath);

      // Also copy credentials from host if available
      const hostCredentialsPath = join(hostClaudeDir, '.credentials.json');
      if (existsSync(hostCredentialsPath)) {
        cpSync(hostCredentialsPath, join(sandboxClaudeDir, '.credentials.json'));
      }

      if (VERBOSE_OUTPUT) {
        console.log('✅ Using bundled SandboxBox settings with Git integration hooks');
        // Show hook information
        const settings = JSON.parse(readFileSync(bundledSettingsPath, 'utf8'));
        if (settings.hooks) {
          console.log('📋 Bundled hooks configured:');
          Object.keys(settings.hooks).forEach(hookType => {
            const hookCount = settings.hooks[hookType].length;
            console.log(`   ${hookType}: ${hookCount} hook(s)`);
            settings.hooks[hookType].forEach((hook, index) => {
              const commandCount = hook.hooks ? hook.hooks.length : 0;
              console.log(`     ${index + 1}. ${hook.matcher || '*'} (${commandCount} commands)`);
            });
          });
        }
      }
    }
  } else if (existsSync(hostClaudeDir)) {
    try {
      // Create symbolic link to host .claude directory
      symlinkSync(hostClaudeDir, sandboxClaudeDir, 'dir');

      const VERBOSE_OUTPUT = process.env.SANDBOX_VERBOSE === 'true' || process.argv.includes('--verbose');
      if (VERBOSE_OUTPUT) {
        // Show hook information in verbose mode
        const settingsPath = join(hostClaudeDir, 'settings.json');
        if (existsSync(settingsPath)) {
          const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
          if (false && settings.hooks) {
            console.log('✅ Linked to host Claude settings directory');
            console.log('📋 Hooks configured:');
            Object.keys(settings.hooks).forEach(hookType => {
              const hookCount = settings.hooks[hookType].length;
              console.log(`   ${hookType}: ${hookCount} hook(s)`);
              settings.hooks[hookType].forEach((hook, index) => {
                const commandCount = hook.hooks ? hook.hooks.length : 0;
                console.log(`     ${index + 1}. ${hook.matcher || '*'} (${commandCount} commands)`);
              });
            });
          } else {
            console.log('✅ Linked to host Claude settings directory (no hooks configured)');
          }
        }
      }
    } catch (error) {
      // Fallback to copying if symlink fails
      mkdirSync(sandboxClaudeDir, { recursive: true });

      const VERBOSE_OUTPUT = process.env.SANDBOX_VERBOSE === 'true' || process.argv.includes('--verbose');
      if (VERBOSE_OUTPUT) {
        console.log('⚠️  Could not create symlink, copying Claude settings instead');
        console.log(`   Symlink error: ${error.code} - ${error.message}`);
      }

      // Copy only essential files (avoid large files like history)
      const essentialFiles = [
        'settings.json',
        '.credentials.json'
      ];

      // Copy files efficiently
      for (const file of essentialFiles) {
        const hostFile = join(hostClaudeDir, file);
        const sandboxFile = join(sandboxClaudeDir, file);

        if (existsSync(hostFile) && hostFile !== sandboxFile) {
          // Additional check using real paths to detect symlink/bind mount issues
          let shouldCopy = true;
          try {
            const hostRealPath = realpathSync(hostFile);
            const sandboxRealPath = realpathSync(sandboxFile);
            if (hostRealPath === sandboxRealPath) {
              shouldCopy = false;
            }
          } catch (e) {
            // If we can't resolve real paths, proceed with copy attempt
          }

          if (VERBOSE_OUTPUT) {
            console.log(`   Copying ${file}: ${hostFile} -> ${sandboxFile}`);
            console.log(`   Path comparison: hostFile === sandboxFile = ${hostFile === sandboxFile}`);
            console.log(`   Host file exists: ${existsSync(hostFile)}`);
            console.log(`   Sandbox file exists: ${existsSync(sandboxFile)}`);
            try {
              const hostRealPath = realpathSync(hostFile);
              const sandboxRealPath = realpathSync(sandboxFile);
              console.log(`   Real paths: host=${hostRealPath}, sandbox=${sandboxRealPath}`);
              console.log(`   Real path comparison: hostRealPath === sandboxRealPath = ${hostRealPath === sandboxRealPath}`);
            } catch (e) {
              console.log(`   Real path check failed: ${e.message}`);
            }
          }

          if (shouldCopy) {
            cpSync(hostFile, sandboxFile);
          } else if (VERBOSE_OUTPUT) {
            console.log(`   Skipping copy - real paths are the same`);
          }
          if (VERBOSE_OUTPUT && file === 'settings.json') {
            // Show hook information for copied settings
            // const settings = JSON.parse(readFileSync(hostFile, 'utf8'));
            if (false && settings.hooks) {
              console.log('📋 Hooks configured in copied settings:');
              Object.keys(settings.hooks).forEach(hookType => {
                const hookCount = settings.hooks[hookType].length;
                console.log(`   ${hookType}: ${hookCount} hook(s)`);
                settings.hooks[hookType].forEach((hook, index) => {
                  const commandCount = hook.hooks ? hook.hooks.length : 0;
                  console.log(`     ${index + 1}. ${hook.matcher || '*'} (${commandCount} commands)`);
                });
              });
            }
          }
        } else if (existsSync(hostFile) && hostFile === sandboxFile) {
          if (VERBOSE_OUTPUT) {
            console.log(`   Skipping copy of ${file} - source and destination are the same`);
          }
          if (VERBOSE_OUTPUT && file === 'settings.json') {
            // Show hook information for existing settings
            // const settings = JSON.parse(readFileSync(hostFile, 'utf8'));
            if (false && settings.hooks) {
              console.log('📋 Hooks configured in existing settings:');
              Object.keys(settings.hooks).forEach(hookType => {
                const hookCount = settings.hooks[hookType].length;
                console.log(`   ${hookType}: ${hookCount} hook(s)`);
                settings.hooks[hookType].forEach((hook, index) => {
                  const commandCount = hook.hooks ? hook.hooks.length : 0;
                  console.log(`     ${index + 1}. ${hook.matcher || '*'} (${commandCount} commands)`);
                });
              });
            }
          }
        }
      }

      // Copy plugins directory if it exists (but skip large cache files)
      const pluginsDir = join(hostClaudeDir, 'plugins');
      if (existsSync(pluginsDir)) {
        const sandboxPluginsDir = join(sandboxClaudeDir, 'plugins');

        // Check real paths to avoid copying directory to itself
        let shouldCopyPlugins = true;
        try {
          const pluginsRealPath = realpathSync(pluginsDir);
          const sandboxPluginsRealPath = realpathSync(sandboxPluginsDir);
          if (pluginsRealPath === sandboxPluginsRealPath) {
            shouldCopyPlugins = false;
          }
        } catch (e) {
          // If we can't resolve real paths, proceed with copy attempt
        }

        if (shouldCopyPlugins) {
          cpSync(pluginsDir, sandboxPluginsDir, { recursive: true });
        }
      }

      // Copy the glootie-cc plugin from host if it exists
      const hostPluginDir = join(dirname(projectDir), 'plugin');
      if (existsSync(hostPluginDir)) {
        const sandboxPluginDir = join(sandboxDir, 'plugin');

        if (VERBOSE_OUTPUT) {
          console.log('📦 Copying glootie-cc plugin from host');
        }

        cpSync(hostPluginDir, sandboxPluginDir, { recursive: true });

        // Make sure the hook scripts are executable
        const startScript = join(sandboxPluginDir, 'start.sh');
        const stopScript = join(sandboxPluginDir, 'stop.sh');

        if (existsSync(startScript)) {
          execSync(`chmod +x "${startScript}"`, { stdio: 'pipe' });
        }
        if (existsSync(stopScript)) {
          execSync(`chmod +x "${stopScript}"`, { stdio: 'pipe' });
        }
      }
    }
  }

  // Optimize cache directory handling - use symlinks instead of copying
  const hostCacheDir = join(homedir(), '.cache');
  if (existsSync(hostCacheDir)) {
    const sandboxCacheDir = join(sandboxDir, '.cache');
    mkdirSync(sandboxCacheDir, { recursive: true });

    // Create symlink to ms-playwright cache instead of copying (major performance improvement)
    const playwrightCacheDir = join(hostCacheDir, 'ms-playwright');
    if (existsSync(playwrightCacheDir)) {
      const sandboxPlaywrightDir = join(sandboxCacheDir, 'ms-playwright');
      try {
        symlinkSync(playwrightCacheDir, sandboxPlaywrightDir, 'dir');
      } catch (error) {
        // Fallback to copying only if symlink fails
        cpSync(playwrightCacheDir, sandboxPlaywrightDir, { recursive: true });
      }
    }
  }

  const cleanup = () => {
    // Close any log files that might be open
    if (global.logFileHandle) {
      try {
        appendFileSync(global.logFileHandle, `\n# Session ended: ${new Date().toISOString()}\n`);
        global.logFileHandle = null;
      } catch (error) {
        // Don't fail on log cleanup
      }
    }
    rmSync(sandboxDir, { recursive: true, force: true });
  };

  return { sandboxDir, cleanup };
}

export function createSandboxEnv(sandboxDir, options = {}) {
  const sandboxClaudeDir = join(sandboxDir, '.claude');
  const sandboxCacheDir = join(sandboxDir, '.cache');

  // Start with all process environment variables
  const env = {
    ...process.env,
  };

  // IMPORTANT: Set HOME to sandbox directory for Claude to find settings
  // but preserve access to host credentials via symlink
  env.HOME = sandboxDir;
  env.USERPROFILE = sandboxDir;

  // Set XDG paths to use sandbox Claude directory
  env.XDG_CONFIG_HOME = sandboxClaudeDir;
  env.XDG_DATA_HOME = join(sandboxClaudeDir, '.local', 'share');
  env.XDG_CACHE_HOME = sandboxCacheDir;
  env.TMPDIR = join(sandboxDir, 'tmp');
  env.TEMP = join(sandboxDir, 'tmp');
  env.TMP = join(sandboxDir, 'tmp');
  env.PLAYWRIGHT_BROWSERS_PATH = join(sandboxDir, 'browsers');
  env.PLAYWRIGHT_STORAGE_STATE = join(sandboxDir, '.playwright', 'storage-state.json');
  if (process.env.CLAUDE_CODE_ENTRYPOINT) {
    env.CLAUDE_CODE_ENTRYPOINT = process.env.CLAUDE_CODE_ENTRYPOINT;
  }

  // Ensure TERM is set with fallback
  env.TERM = process.env.TERM || 'xterm-256color';

  // Apply any additional options
  Object.assign(env, options);

  return env;
}

export function runInSandbox(commandStr, args, sandboxDir, env) {
  return new Promise((resolve, reject) => {
    const fullCommand = args.length > 0 ? `${commandStr} ${args.join(' ')}` : commandStr;

    const proc = spawn(fullCommand, [], {
      cwd: join(sandboxDir, 'workspace'),
      env,
      stdio: 'inherit',
      shell: true,
      windowsHide: false
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}