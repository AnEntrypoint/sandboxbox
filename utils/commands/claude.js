import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { spawn } from 'child_process';
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

function handleStreamingOutput(data) {
  const lines = data.toString().split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const event = JSON.parse(line);

      if (event.type === 'system' && event.subtype === 'init') {
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
    } catch (e) {
      // Non-JSON output, print as-is
      process.stderr.write(data);
    }
  }
}

export async function claudeCommand(projectDir, prompt = '') {
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
  if (prompt) {
    console.log(color('yellow', `Prompt: ${prompt}`));
  }
  console.log('');

  const { sandboxDir, cleanup } = createSandbox(projectDir);

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    const env = createSandboxEnv(sandboxDir, {
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
      CLAUDECODE: '1'
    });

    console.log(color('green', `✅ Sandbox created`));
    console.log(color('cyan', `📦 Tools enabled: ${ALLOWED_TOOLS.length} tools\n`));

    const claudeArgs = [
      '-p',
      '--verbose',
      '--output-format', 'stream-json',
      '--allowed-tools',
      ...ALLOWED_TOOLS,
      '--'
    ];

    if (prompt) {
      claudeArgs.push(prompt);
    } else {
      claudeArgs.push('Start an interactive session');
    }

    console.log(color('blue', `📝 Running Claude Code with ${ALLOWED_TOOLS.length} tools\n`));

    return new Promise((resolve, reject) => {
      const proc = spawn('claude', claudeArgs, {
        cwd: join(sandboxDir, 'workspace'),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });

      let stdoutOutput = '';
      let stderrOutput = '';
      let lastError = '';

      proc.stdout.on('data', (data) => {
        stdoutOutput += data.toString();

        // Check for errors in JSON output
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'result' && event.is_error) {
              lastError = event.result;
            }
          } catch (e) {}
        }

        handleStreamingOutput(data);
      });

      proc.stderr.on('data', (data) => {
        stderrOutput += data.toString();
        process.stderr.write(data);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          cleanup();
          resolve(true);
        } else {
          console.log(color('red', `\n❌ Claude Code exited with code ${code}`));
          if (lastError) {
            console.log(color('red', `\nClaude Error: ${lastError}`));
          }
          if (stderrOutput) {
            console.log(color('red', `\nStderr: ${stderrOutput.substring(0, 300)}`));
          }
          cleanup();
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        console.log(color('red', `\n❌ Failed to start: ${error.message}`));
        cleanup();
        reject(error);
      });
    });
  } catch (error) {
    console.log(color('red', `\n❌ Claude Code failed: ${error.message}`));
    cleanup();
    return false;
  }
}
