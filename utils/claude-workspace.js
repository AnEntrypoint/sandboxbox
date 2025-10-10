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
    -v "${projectPath}:/project:rw" \
    -v "${homeDir}/.claude:/root/.claude" \
    -v "${homeDir}/.ssh:/root/.ssh:ro" \
    -v "${homeDir}/.gitconfig:/root/.gitconfig:ro" \
    ${envArgs} \
    --env REPO_PATH=/project \
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

# Create local workspace script
RUN echo '#!/bin/bash
set -e

REPO_PATH=\${REPO_PATH:-"/project"}
WORKSPACE_DIR="/workspace/project"

echo "🚀 Starting SandboxBox with Claude Code..."
echo "📁 Working with local repository: \$REPO_PATH"
echo "🎯 Workspace: \$WORKSPACE_DIR"

if [ -d "\$REPO_PATH" ] && [ -d "\$REPO_PATH/.git" ]; then
    echo "📂 Creating workspace symlink to local repository..."
    ln -sf "\$REPO_PATH" "\$WORKSPACE_DIR"
    cd "\$WORKSPACE_DIR"
    echo "✅ Workspace linked successfully!"
    echo "📋 Current status:"
    git status
    echo ""
    echo "🔧 Starting Claude Code..."
    echo "💡 Changes will be saved directly to the local repository"
    exec claude
else
    echo "❌ Error: \$REPO_PATH is not a valid git repository"
    exit 1
fi' > /usr/local/bin/start-local-sandbox.sh && chmod +x /usr/local/bin/start-local-sandbox.sh

CMD ["/usr/local/bin/start-local-sandbox.sh"]`;
}