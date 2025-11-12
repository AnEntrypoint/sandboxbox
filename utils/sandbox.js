import { mkdtempSync, rmSync, cpSync, existsSync, mkdirSync, writeFileSync, symlinkSync, realpathSync, readFileSync, appendFileSync } from 'fs';
import { tmpdir, homedir, platform } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

export function createSandbox(projectDir, options = {}) {
  const { useHostSettings = false, headlessMode = false, allocatedPort = null } = options;
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

  // Configure global git safe directories with duplicate prevention
  function addSafeDirectory(dir) {
    try {
      // Check if directory is already in safe.directory config
      const existingDirs = execSync('git config --global --get-all safe.directory', {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim().split('\n').filter(d => d.length > 0);

      if (!existingDirs.includes(dir)) {
        execSync(`git config --global --add safe.directory "${dir}"`, {
          stdio: 'pipe',
          shell: true,
          windowsHide: true
        });
      }
    } catch (error) {
      // If get-all fails, try adding directly (might be first entry)
      try {
        execSync(`git config --global --add safe.directory "${dir}"`, {
          stdio: 'pipe',
          shell: true,
          windowsHide: true
        });
      } catch (addError) {
        // Silently fail if config is locked or directory already exists
        if (VERBOSE_OUTPUT) {
          console.log(`Warning: Could not add safe.directory ${dir}: ${addError.message}`);
        }
      }
    }
  }

  addSafeDirectory(projectDir);
  addSafeDirectory(`${projectDir}/.git`);

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
    // Create sandbox Claude directory
    mkdirSync(sandboxClaudeDir, { recursive: true });

    const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
    const claudeSandboxDir = join(repoRoot, '.claude-sandbox');

    // Copy .claude-sandbox configuration to sandbox
    if (existsSync(claudeSandboxDir)) {
      // Copy settings.json
      const claudeSandboxSettingsPath = join(claudeSandboxDir, 'settings.json');
      if (existsSync(claudeSandboxSettingsPath)) {
        const sandboxSettingsPath = join(sandboxClaudeDir, 'settings.json');
        cpSync(claudeSandboxSettingsPath, sandboxSettingsPath);

        // Update MCP server paths to use actual sandbox directory
        const settings = JSON.parse(readFileSync(sandboxSettingsPath, 'utf8'));
        if (settings.mcpServers) {
          Object.keys(settings.mcpServers).forEach(serverName => {
            const server = settings.mcpServers[serverName];
            if (server.args) {
              server.args = server.args.map(arg =>
                arg.replace('${HOME}', sandboxDir)
              );
            }
          });
          writeFileSync(sandboxSettingsPath, JSON.stringify(settings, null, 2));

          // Create separate mcp.json file for --mcp-config flag
          const mcpConfigPath = join(sandboxClaudeDir, 'mcp.json');
          const mcpConfig = { mcpServers: settings.mcpServers };
          writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
        }

        if (VERBOSE_OUTPUT) {
          console.log('✅ Copied .claude-sandbox settings to sandbox');
        }
      }

      // Copy plugins directory
      const claudeSandboxPluginsDir = join(claudeSandboxDir, 'plugins');
      if (existsSync(claudeSandboxPluginsDir)) {
        const sandboxPluginsDir = join(sandboxClaudeDir, 'plugins');
        cpSync(claudeSandboxPluginsDir, sandboxPluginsDir, { recursive: true });

        // Update plugin paths in config.json to point to sandbox locations
        const configPath = join(sandboxPluginsDir, 'config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf8'));
          if (config.repositories) {
            Object.keys(config.repositories).forEach(repo => {
              const repoName = repo.toLowerCase();
              config.repositories[repo].path = join(sandboxClaudeDir, 'plugins', 'marketplaces', repoName);
            });
            writeFileSync(configPath, JSON.stringify(config, null, 2));
          }
        }

        if (VERBOSE_OUTPUT) {
          console.log('✅ Copied .claude-sandbox plugins to sandbox');
        }
      }

      // Copy credentials from host if available
      const hostCredentialsPath = join(hostClaudeDir, '.credentials.json');
      if (existsSync(hostCredentialsPath)) {
        cpSync(hostCredentialsPath, join(sandboxClaudeDir, '.credentials.json'));
      }

      if (VERBOSE_OUTPUT) {
        console.log('✅ Using .claude-sandbox configuration');
      }
    } else if (VERBOSE_OUTPUT) {
      console.log('⚠️  .claude-sandbox directory not found in repo');
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

  // Preserve important host credentials and tool configurations
  const hostHome = homedir();

  // Firebase and Google Cloud credentials
  const firebaseCredPath = join(hostHome, '.config', 'firebase');
  const gcloudCredPath = join(hostHome, '.config', 'gcloud');
  const googleCredPath = join(hostHome, '.config', 'google-cloud');

  // GitHub credentials
  const ghCredPath = join(hostHome, '.config', 'gh');

  // Other development tools
  const claspCredPath = join(hostHome, '.clasprc.json');
  const awsCredPath = join(hostHome, '.aws');
  const sshCredPath = join(hostHome, '.ssh');
  const npmCredPath = join(hostHome, '.npmrc');

  // Create symlinks to host credentials in sandbox
  const sandboxConfigDir = join(sandboxDir, '.config');
  mkdirSync(sandboxConfigDir, { recursive: true });

  // Firebase
  if (existsSync(firebaseCredPath)) {
    symlinkSync(firebaseCredPath, join(sandboxConfigDir, 'firebase'), 'dir');
  }

  // Google Cloud
  if (existsSync(gcloudCredPath)) {
    symlinkSync(gcloudCredPath, join(sandboxConfigDir, 'gcloud'), 'dir');
  }
  if (existsSync(googleCredPath)) {
    symlinkSync(googleCredPath, join(sandboxConfigDir, 'google-cloud'), 'dir');
  }

  // GitHub CLI
  if (existsSync(ghCredPath)) {
    symlinkSync(ghCredPath, join(sandboxConfigDir, 'gh'), 'dir');
  }

  // Google Apps Script (clasp)
  if (existsSync(claspCredPath)) {
    symlinkSync(claspCredPath, join(sandboxDir, '.clasprc.json'));
  }

  // AWS
  if (existsSync(awsCredPath)) {
    symlinkSync(awsCredPath, join(sandboxDir, '.aws'), 'dir');
  }

  // SSH (for git operations)
  if (existsSync(sshCredPath)) {
    symlinkSync(sshCredPath, join(sandboxDir, '.ssh'), 'dir');
  }

  // NPM
  if (existsSync(npmCredPath)) {
    symlinkSync(npmCredPath, join(sandboxDir, '.npmrc'));
  }

  // Preserve credential environment variables
  const credEnvVars = [
    'FIREBASE_TOKEN',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCLOUD_PROJECT',
    'GITHUB_TOKEN',
    'GH_TOKEN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'AWS_DEFAULT_REGION',
    'CLASP_CREDENTIALS',
    'NPM_TOKEN',
    'GIT_SSH_COMMAND',
    'SSH_AUTH_SOCK'
  ];

  credEnvVars.forEach(varName => {
    if (process.env[varName]) {
      env[varName] = process.env[varName];
    }
  });

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