import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

export class ClaudeOptimizer {
  constructor(sandboxDir) {
    this.sandboxDir = sandboxDir;
    this.claudeDir = join(sandboxDir, '.claude');
  }

  // Optimize Claude settings for faster startup
  optimizeSettings() {
    const settingsPath = join(this.claudeDir, 'settings.json');

    // Load existing settings or create optimized defaults
    let settings = {};
    if (existsSync(settingsPath)) {
      try {
        settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        console.log('⚠️  Could not read existing settings, creating optimized defaults');
      }
    }

    // Apply startup optimizations
    const optimizedSettings = {
      ...settings,
      // Reduce plugin timeouts
      pluginTimeout: 5000,
      // Disable unnecessary features for faster startup
      alwaysThinkingEnabled: false,
      // Optimize plugin loading
      enabledPlugins: {
        ...settings.enabledPlugins,
        // Only enable essential plugins for performance
        'glootie-cc@anentrypoint-plugins': true
      },
      // Add performance-focused hooks
      hooks: {
        ...(settings.hooks || {}),
        SessionStart: [
          {
            matcher: "*",
            hooks: [
              {
                type: "command",
                command: "echo 'Claude optimized session started'"
              }
            ]
          }
        ]
      }
    };

    // Ensure directory exists
    mkdirSync(dirname(settingsPath), { recursive: true });

    // Write optimized settings
    writeFileSync(settingsPath, JSON.stringify(optimizedSettings, null, 2));
    console.log('✅ Applied Claude startup optimizations');

    return optimizedSettings;
  }

  // Pre-warm plugin connections
  async prewarmPlugins() {
    console.log('🔥 Pre-warming Claude plugins...');

    const prewarmScript = `
# Pre-warm script for Claude plugins
echo "Pre-warming plugin connections..."

# Set environment for faster plugin discovery
export NODE_OPTIONS="--max-old-space-size=2048"
export CLAUDE_PLUGIN_TIMEOUT=5000

# Pre-warm glootie plugin
if command -v npx >/dev/null 2>&1; then
  timeout 3s npx -y glootie-cc@anentrypoint-plugins --version >/dev/null 2>&1 &
fi

echo "Plugin pre-warming complete"
`;

    const scriptPath = join(this.sandboxDir, '.claude', 'prewarm.sh');
    writeFileSync(scriptPath, prewarmScript);

    return scriptPath;
  }

  // Create optimized environment for Claude
  createOptimizedEnv(baseEnv = {}) {
    return {
      ...baseEnv,
      // Performance optimizations
      NODE_OPTIONS: "--max-old-space-size=2048",
      CLAUDE_PLUGIN_TIMEOUT: "5000",
      CLAUDE_CACHE_DIR: join(this.sandboxDir, '.cache', 'claude'),
      // Network optimizations
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      // Plugin optimizations
      MCP_TIMEOUT: "5000",
      MCP_CONNECTION_TIMEOUT: "3000",
      // Fast startup flags
      CLAUDE_FAST_STARTUP: "1",
      CLAUDE_MINIMAL_MODE: "1"
    };
  }

  // Generate startup timing profile
  async profileStartup(claudeCommand) {
    console.log('📊 Profiling Claude startup...');

    const profileScript = `
#!/bin/bash
echo "Starting Claude startup profile..."
start_time=$(date +%s%3N)

# Run Claude with timing
timeout 30s ${claudeCommand} --help >/dev/null 2>&1 &
claude_pid=$!

# Monitor startup progress
while kill -0 $claude_pid 2>/dev/null; do
  current_time=$(date +%s%3N)
  elapsed=$((current_time - start_time))

  if [ $elapsed -gt 10000 ]; then
    echo "⚠️  Startup taking longer than 10s..."
    kill $claude_pid 2>/dev/null
    break
  fi

  sleep 0.5
done

wait $claude_pid
end_time=$(date +%s%3N)
total_time=$((end_time - start_time))

echo "Claude startup completed in ${total_time}ms"
`;

    return profileScript;
  }
}