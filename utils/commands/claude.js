import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { spawn, execSync } from 'child_process';
import { color } from '../colors.js';
import { createSandbox, createSandboxEnv } from '../sandbox.js';

const ALLOWED_TOOLS = [
  'Task', 'Bash', 'Glob', 'Grep', 'Read', 'Edit', 'Write', 'NotebookEdit',
  'WebFetch', 'TodoWrite', 'WebSearch', 'BashOutput', 'KillShell',
  'SlashCommand', 'ExitPlanMode', 'mcp__glootie__execute',
  'mcp__glootie__ast_tool', 'mcp__glootie__caveat',
  'mcp__playwright__browser_navigate', 'mcp__playwright__browser_snapshot',
  'mcp__playwright__browser_click', 'mcp__playwright__browser_type',
  'mcp__playwright__browser_evaluate', 'mcp__playwright__browser_close',
  'mcp__vexify__search_code'
];


export async function claudeCommand(projectDir, prompt) {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  if (!existsSync(resolve(projectDir, '.git'))) {
    console.log(color('red', `❌ Not a git repository: ${projectDir}`));
    console.log(color('yellow', 'Please run this command in a git repository directory'));
    return false;
  }

  console.log(color('blue', '🚀 Starting Claude Code in sandbox...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Prompt: ${prompt}`));
  console.log('');

  const startTime = Date.now();
  console.log(color('cyan', '⏱️  Stage 1: Creating sandbox...'));

  const { sandboxDir, cleanup } = createSandbox(projectDir);
  const sandboxCreateTime = Date.now() - startTime;
  console.log(color('green', `✅ Sandbox created in ${sandboxCreateTime}ms`));

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    const envStartTime = Date.now();
    console.log(color('cyan', '⏱️  Stage 2: Setting up environment...'));

    const env = createSandboxEnv(sandboxDir, {
      CLAUDECODE: '1'
    });
    const envCreateTime = Date.now() - envStartTime;
    console.log(color('green', `✅ Environment configured in ${envCreateTime}ms`));

    console.log(color('cyan', `📦 Using host Claude settings with all available tools\n`));

    const claudeArgs = [
      '--verbose',
      '--output-format', 'stream-json'
    ];

    console.log(color('blue', `📝 Running Claude Code with host settings\n`));

    return new Promise((resolve, reject) => {
      const claudeStartTime = Date.now();
      console.log(color('cyan', '⏱️  Stage 3: Starting Claude Code...'));

      const proc = spawn('sh', ['-c', `cd "${join(sandboxDir, 'workspace')}" && claude ${claudeArgs.join(' ')}`], {
        env: env,  // Use the environment directly without modification
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,  // Use shell for proper directory handling
        detached: false
      });

      let claudeStarted = false;

      function handleStreamingOutput(data) {
        const lines = data.toString().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const event = JSON.parse(line);

            if (event.type === 'system' && event.subtype === 'init') {
              if (!claudeStarted) {
                const claudeCreateTime = Date.now() - claudeStartTime;
                console.log(color('green', `✅ Claude Code started in ${claudeCreateTime}ms`));
                claudeStarted = true;
              }
              console.log(color('green', `✅ Session started (${event.session_id.substring(0, 8)}...)`));
              console.log(color('cyan', `📦 Model: ${event.model}`));
              console.log(color('cyan', `🔧 Tools: ${event.tools.length} available\n`));
            } else if (event.type === 'assistant' && event.message) {
              const content = event.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text') {
                    process.stdout.write(block.text);
                  } else if (block.type === 'tool_use') {
                    console.log(color('cyan', `\n🔧 Using tool: ${block.name}`));
                  }
                }
              }
            } else if (event.type === 'result') {
              const usage = event.usage || {};
              const cost = event.total_cost_usd || 0;
              console.log(color('green', `\n\n✅ Completed in ${event.duration_ms}ms`));
              console.log(color('yellow', `💰 Cost: $${cost.toFixed(4)}`));
              if (usage.input_tokens) {
                console.log(color('cyan', `📊 Tokens: ${usage.input_tokens} in, ${usage.output_tokens} out`));
              }
            }
          } catch (jsonError) {
            // Skip malformed JSON lines - might be incomplete chunks
            // Silently continue to avoid breaking the stream
          }
        }
      }

      // Add error handling
      proc.on('error', (error) => {
        console.log(color('red', `🔍 Debug: Process error: ${error.message}`));
        reject(error);
      });

      // Write prompt to stdin
      proc.stdin.write(prompt);
      proc.stdin.end();

      let stdoutOutput = '';
      let stderrOutput = '';
      let lastError = '';

      proc.stdout.on('data', (data) => {
        stdoutOutput += data.toString();

        // Check for errors in JSON output with error handling
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'result' && event.is_error) {
              lastError = event.result;
            }
          } catch (jsonError) {
            // Ignore JSON parsing errors - might be incomplete chunks
            console.error('JSON parse error:', jsonError.message);
          }
        }

        handleStreamingOutput(data);
      });

      proc.stderr.on('data', (data) => {
        stderrOutput += data.toString();
        process.stderr.write(data);
      });

      proc.on('close', (code) => {
        const sessionEndTime = Date.now();
        const totalTime = sessionEndTime - startTime;
        console.log(color('cyan', `\n⏱️  Stage 4: Session completed in ${totalTime}ms`));

        // Performance summary
        console.log(color('cyan', `\n📊 Performance Summary:`));
        console.log(color('cyan', `  • Sandbox creation: ${sandboxCreateTime}ms`));
        console.log(color('cyan', `  • Environment setup: ${envCreateTime}ms`));
        console.log(color('cyan', `  • Claude Code session: ${totalTime - sandboxCreateTime - envCreateTime}ms`));
        console.log(color('cyan', `  • Total time: ${totalTime}ms`));

        cleanup();
        resolve(true);
      });
    });
  } catch (error) {
    console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
    cleanup();
    return false;
  }
}
