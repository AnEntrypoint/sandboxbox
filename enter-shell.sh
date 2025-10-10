#!/bin/bash
# Enter persistent interactive shell in the SandboxBox container environment

cat << 'BANNER'
╔════════════════════════════════════════════════════════════════╗
║         🚀 SandboxBox Persistent Shell Environment            ║
║                                                                 ║
║  Environment: Built from Dockerfile                            ║
║  User: node                                                     ║
║  Home: /home/node                                              ║
║  Workspace: /workspace                                          ║
║  Shell: zsh with Oh-My-Zsh                                     ║
║                                                                 ║
║  ✅ Available Tools:                                            ║
║     • Node.js v22.19.0                                         ║
║     • npm, Git, Claude Code CLI                                ║
║     • Vim, Zsh, jq, gh                                         ║
║     • Playwright dependencies                                  ║
║                                                                 ║
║  💡 Tips:                                                       ║
║     • All files in /workspace persist                          ║
║     • Type 'exit' to leave the shell                           ║
║     • Use Claude Code with 'claude'                            ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
BANNER

echo ""
echo "🎯 Entering persistent shell..."
echo ""

# Start interactive zsh as node user in /workspace
exec sudo -u node -i zsh -c "cd /workspace && exec zsh"
