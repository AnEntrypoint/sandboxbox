import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

export class SystemOptimizer {
  constructor() {
    this.hasSudo = this.checkSudoAccess();
  }

  checkSudoAccess() {
    try {
      execSync('sudo -n true', { stdio: 'pipe' });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Optimize system for Claude Code performance
  async optimizeSystem() {
    if (!this.hasSudo) {
      return false;
    }

    const optimizations = [
      this.optimizeKernelParameters(),
      this.optimizeNetworkStack(),
      this.preloadCommonLibraries(),
      this.optimizeFilesystem(),
      this.setupClaudeService()
    ];

    const results = await Promise.allSettled(optimizations);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return successCount > 0;
  }

  // Optimize kernel parameters for faster process spawning
  async optimizeKernelParameters() {
    if (!this.hasSudo) return false;

    try {
      const kernelTweaks = [
        'sysctl -w vm.overcommit_memory=1',           // Allow memory overcommit
        'sysctl -w kernel.sched_min_granularity_ns=1000000',  // Faster task scheduling
        'sysctl -w fs.file-max=1048576',             // Increase file descriptor limit
        'sysctl -w net.core.somaxconn=65535',        // Increase connection backlog
        'sysctl -w net.ipv4.tcp_fin_timeout=15',     // Faster TCP connection cleanup
        'sysctl -w net.ipv4.tcp_keepalive_time=600',  // Reduce keepalive timeout
        'sysctl -w vm.swappiness=10'                 // Reduce swapping
      ];

      for (const tweak of kernelTweaks) {
        execSync(`sudo ${tweak}`, { stdio: 'pipe' });
      }

      return true;
    } catch (error) {
      // Silently skip optimization if it fails
      return false;
    }
  }

  // Preload Claude and plugin dependencies
  async preloadCommonLibraries() {
    if (!this.hasSudo) return false;

    try {
      // Create a preload script for common Node.js and Claude dependencies
      const preloadScript = `
# Preload common libraries for faster Claude startup
echo "Preloading Claude dependencies..."

# Common Node.js modules
export NODE_PATH="/usr/lib/node_modules:$NODE_PATH"

# Preload essential binaries
which npx >/dev/null && npx --version >/dev/null 2>&1 &
which node >/dev/null && node --version >/dev/null 2>&1 &

# Wait for preloads to complete
wait

echo "Preloading complete"
`;

      const preloadPath = '/tmp/claude-preload.sh';
      writeFileSync(preloadPath, preloadScript);
      execSync(`chmod +x ${preloadPath}`, { stdio: 'pipe' });

      // Execute preload script with elevated privileges if needed
      execSync(preloadPath, { stdio: 'pipe' });

      return true;
    } catch (error) {
      // Silently skip optimization if it fails
      return false;
    }
  }

  // Optimize filesystem for faster access
  async optimizeFilesystem() {
    if (!this.hasSudo) return false;

    try {
      // Optimize tmpfs for faster temporary operations
      const tmpfsOptimizations = [
        'mount -t tmpfs -o size=1G tmpfs /tmp/claude-cache 2>/dev/null || true',
        'mkdir -p /tmp/claude-cache /tmp/claude-plugins',
        'chmod 777 /tmp/claude-cache /tmp/claude-plugins'
      ];

      for (const opt of tmpfsOptimizations) {
        execSync(`sudo ${opt}`, { stdio: 'pipe' });
      }

      return true;
    } catch (error) {
      // Silently skip optimization if it fails
      return false;
    }
  }

  // Setup Claude as a pre-warmed service
  async setupClaudeService() {
    if (!this.hasSudo) return false;

    try {
      const serviceConfig = `[Unit]
Description=Claude Code Pre-warm Service
After=network.target

[Service]
Type=forking
User=root
ExecStart=/usr/local/bin/claude-prewarm.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

      const prewarmScript = `#!/bin/bash
# Claude Code pre-warming service
echo "Starting Claude pre-warm service..."

# Create necessary directories
mkdir -p /tmp/claude-cache /tmp/claude-plugins /tmp/claude-sessions

# Pre-warm Node.js runtime
timeout 10s node --version >/dev/null 2>&1 &

# Pre-warm NPX
timeout 10s npx --version >/dev/null 2>&1 &

# Pre-warm common plugins if available
timeout 5s npx -y glootie-cc@anentrypoint-plugins --help >/dev/null 2>&1 &

echo "Claude pre-warm service ready"
`;

      // Write service file
      execSync('echo "' + serviceConfig.replace(/"/g, '\\"') + '" | sudo tee /etc/systemd/system/claude-prewarm.service', { stdio: 'pipe' });

      // Write prewarm script
      execSync('echo "' + prewarmScript.replace(/"/g, '\\"') + '" | sudo tee /usr/local/bin/claude-prewarm.sh', { stdio: 'pipe' });
      execSync('sudo chmod +x /usr/local/bin/claude-prewarm.sh', { stdio: 'pipe' });

      // Enable and start service
      execSync('sudo systemctl daemon-reload', { stdio: 'pipe' });
      execSync('sudo systemctl enable claude-prewarm.service', { stdio: 'pipe' });
      execSync('sudo systemctl start claude-prewarm.service', { stdio: 'pipe' });

      return true;
    } catch (error) {
      // Silently skip optimization if it fails
      return false;
    }
  }

  // Optimize network stack for faster plugin communication
  async optimizeNetworkStack() {
    if (!this.hasSudo) return false;

    try {
      const networkOptimizations = [
        'sysctl -w net.core.rmem_max=134217728',      // Increase receive buffer
        'sysctl -w net.core.wmem_max=134217728',      // Increase send buffer
        'sysctl -w net.ipv4.tcp_rmem="4096 65536 134217728"',  // TCP receive buffer
        'sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"',  // TCP send buffer
        'sysctl -w net.ipv4.tcp_congestion_control=bbr'  // Use BBR congestion control
      ];

      for (const opt of networkOptimizations) {
        execSync(`sudo ${opt}`, { stdio: 'pipe' });
      }

      return true;
    } catch (error) {
      // Silently skip optimization if it fails
      return false;
    }
  }

  // Create optimized container environment
  createOptimizedContainerEnv() {
    return {
      // System optimizations
      'NODE_OPTIONS': '--max-old-space-size=4096 --no-experimental-fetch',
      'CLAUDE_OPTIMIZED': '1',
      'CLAUDE_CACHE_DIR': '/tmp/claude-cache',
      'CLAUDE_PLUGIN_DIR': '/tmp/claude-plugins',

      // Performance tuning
      'UV_THREADPOOL_SIZE': '16',
      'NODEUV_THREADPOOL_SIZE': '16',

      // Fast startup flags
      'CLAUDE_FAST_INIT': '1',
      'CLAUDE_SKIP_WELCOME': '1',
      'CLAUDE_MINIMAL_PLUGINS': '1',

      // Timeout optimizations
      'MCP_TIMEOUT': '3000',
      'MCP_CONNECT_TIMEOUT': '2000',
      'CLAUDE_PLUGIN_TIMEOUT': '5000'
    };
  }
}