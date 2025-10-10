import { execSync } from 'child_process';

export function getClaudeEnvironment() {
  const envVars = {};

  // Collect Anthropic and Claude environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('ANTHROPIC_') || key.startsWith('CLAUDE')) {
      envVars[key] = value;
    }
  }

  return envVars;
}

export function buildClaudeContainerCommand(projectPath, podmanPath, command = 'claude') {
  const envVars = getClaudeEnvironment();
  const envArgs = Object.entries(envVars)
    .map(([key, value]) => `-e ${key}="${value}"`)
    .join(' ');

  const homeDir = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;

  return `${podmanPath} run --rm -it \
    -v "${projectPath}:/workspace:rw" \
    -v "${homeDir}/.claude:/root/.claude" \
    -v "${homeDir}/.ssh:/root/.ssh:ro" \
    -v "${homeDir}/.gitconfig:/root/.gitconfig:ro" \
    ${envArgs} \
    --env HOME=/root \
    sandboxbox-local:latest \
    ${command}`;
}

export function createClaudeDockerfile() {
  return `FROM node:20

# Install development tools
RUN apt-get update && apt-get install -y --no-install-recommends \\
    git curl bash sudo nano vim \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code@latest

# Create isolated workspace script
RUN echo '#!/bin/bash
set -e

echo "🚀 Starting SandboxBox with Claude Code in isolated environment..."
echo "📁 Working directory: /workspace"
echo "🎯 This is an isolated copy of your repository"

if [ -d "/workspace/.git" ]; then
    echo "✅ Git repository detected in workspace"
    echo "📋 Current status:"
    git status
    echo ""
    echo "🔧 Starting Claude Code..."
    echo "💡 Changes will be isolated and will NOT affect the original repository"
    echo "📝 To save changes, use git commands to commit and push before exiting"
    exec claude
else
    echo "❌ Error: /workspace is not a valid git repository"
    exit 1
fi' > /usr/local/bin/start-isolated-sandbox.sh && chmod +x /usr/local/bin/start-isolated-sandbox.sh

CMD ["/usr/local/bin/start-isolated-sandbox.sh"]`;
}