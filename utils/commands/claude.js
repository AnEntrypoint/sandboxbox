import { existsSync, writeFileSync, appendFileSync } from 'fs';
import { resolve, join } from 'path';
import { spawn, execSync } from 'child_process';
import { color } from '../colors.js';
import { createSandbox, createSandboxEnv } from '../sandbox.js';
import { ClaudeOptimizer } from '../claude-optimizer.js';
import { SystemOptimizer } from '../system-optimizer.js';

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

// Console output configuration
const MAX_CONSOLE_LINES = parseInt(process.env.SANDBOX_MAX_CONSOLE_LINES) || 5;
const MAX_LOG_ENTRY_LENGTH = parseInt(process.env.SANDBOX_MAX_LOG_LENGTH) || 200;
const ENABLE_FILE_LOGGING = process.env.SANDBOX_ENABLE_FILE_LOGGING === 'true';
const VERBOSE_OUTPUT = process.env.SANDBOX_VERBOSE === 'true' || process.argv.includes('--verbose');
global.toolCallLog = [];
global.logFileHandle = null;
global.pendingToolCalls = new Map(); // Track tool calls by ID for result matching
global.conversationalBuffer = ''; // Track conversational text between tool calls

// Helper function to extract tool metadata without showing actual content
function extractToolMetadata(toolUse) {
  const metadata = {
    name: toolUse.name || 'unknown',
    id: toolUse.id || 'no-id',
    inputCount: 0,
    inputTypes: {},
    inputSizes: {},
    totalInputSize: 0
  };

  if (toolUse.input && typeof toolUse.input === 'object') {
    metadata.inputCount = Object.keys(toolUse.input).length;

    for (const [key, value] of Object.entries(toolUse.input)) {
      const type = Array.isArray(value) ? 'array' : typeof value;
      metadata.inputTypes[key] = type;

      // Calculate sizes without exposing content
      if (type === 'string') {
        metadata.inputSizes[key] = `${value.length} chars`;
        metadata.totalInputSize += value.length;
      } else if (type === 'array') {
        metadata.inputSizes[key] = `${value.length} items`;
        metadata.totalInputSize += JSON.stringify(value).length;
      } else if (type === 'object' && value !== null) {
        const objSize = JSON.stringify(value).length;
        metadata.inputSizes[key] = `${objSize} chars`;
        metadata.totalInputSize += objSize;
      } else {
        metadata.inputSizes[key] = `${type}`;
      }
    }
  }

  return metadata;
}

// Helper function to extract tool result metadata
function extractResultMetadata(result) {
  const metadata = {
    type: 'unknown',
    size: 0,
    hasContent: false,
    isToolResult: false,
    isError: false
  };

  if (result && typeof result === 'object') {
    metadata.isToolResult = result.type === 'tool_result';
    metadata.isError = result.is_error || false;

    if (result.content) {
      metadata.hasContent = true;

      if (typeof result.content === 'string') {
        metadata.type = 'text';
        metadata.size = result.content.length;
      } else if (Array.isArray(result.content)) {
        metadata.type = 'array';
        metadata.size = result.content.length;
        // Count items by type without showing content
        const typeCounts = {};
        result.content.forEach(item => {
          const itemType = item?.type || 'unknown';
          typeCounts[itemType] = (typeCounts[itemType] || 0) + 1;
        });
        metadata.itemTypes = typeCounts;
      } else if (typeof result.content === 'object') {
        metadata.type = 'object';
        metadata.size = Object.keys(result.content).length;
      }
    }
  }

  return metadata;
}


// Helper function to truncate text to a sensible length
function truncateText(text, maxLength = MAX_LOG_ENTRY_LENGTH) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Enhanced tool logging with detailed metadata and length limiting
function logToolCall(toolName, action = 'call', toolUse = null, result = null) {
  const shortTime = new Date().toLocaleTimeString();
  let logEntry = `Tool: ${toolName}`;

  // Add conversational text if available
  if (global.conversationalBuffer.trim()) {
    const truncatedText = truncateText(global.conversationalBuffer.trim(), 80);
    logEntry += ` - "${truncatedText}"`;
    global.conversationalBuffer = ''; // Clear buffer after using
  }

  // Add compact metadata
  if (toolUse && action === 'call') {
    const metadata = extractToolMetadata(toolUse);
    const metaInfo = [];

    if (metadata.inputCount > 0) {
      metaInfo.push(`${metadata.inputCount} inputs`);
    }

    if (metadata.totalInputSize > 0) {
      metaInfo.push(`${metadata.totalInputSize} chars`);
    }

    if (metaInfo.length > 0) {
      logEntry += ` (${metaInfo.join(', ')})`;
    }
  }

  // Add result metadata
  if (result && action === 'result') {
    const metadata = extractResultMetadata(result);
    const resultInfo = [];

    if (metadata.hasContent) {
      if (metadata.size > 0) {
        if (metadata.type === 'text') {
          resultInfo.push(`${metadata.size} chars`);
        } else if (metadata.type === 'array') {
          resultInfo.push(`${metadata.size} items`);
        }
      }

      if (metadata.isError) {
        resultInfo.push('ERROR');
      }
    }

    if (resultInfo.length > 0) {
      logEntry += ` → ${resultInfo.join(', ')}`;
    }
  }

  const finalLogEntry = `[${shortTime}] ${truncateText(logEntry)}`;

  global.toolCallLog.push(finalLogEntry);

  // Keep only the last MAX_CONSOLE_LINES for console display
  if (global.toolCallLog.length > MAX_CONSOLE_LINES) {
    global.toolCallLog = global.toolCallLog.slice(-MAX_CONSOLE_LINES);
  }

  // Optionally log to file with full metadata
  if (ENABLE_FILE_LOGGING) {
    try {
      if (!global.logFileHandle) {
        const timestamp = new Date().toISOString();
        const logFileName = `sandboxbox-tool-calls-${Date.now()}.log`;
        writeFileSync(logFileName, `# SandboxBox Tool Calls Log\n# Started: ${timestamp}\n# Format: [timestamp] Tool: name - "text" (metadata)\n\n`);
        global.logFileHandle = logFileName;
      }

      const timestamp = new Date().toISOString();
      let fileLogEntry = `[${timestamp}] Tool: ${toolName}`;

      if (global.conversationalBuffer.trim()) {
        fileLogEntry += ` - "${global.conversationalBuffer.trim()}"`;
      }

      if (toolUse && action === 'call') {
        const metadata = extractToolMetadata(toolUse);
        fileLogEntry += `\n    Input details: ${JSON.stringify(metadata.inputSizes, null, 2)}`;
      }

      if (result && action === 'result') {
        const metadata = extractResultMetadata(result);
        fileLogEntry += `\n    Result details: ${JSON.stringify(metadata, null, 2)}`;
      }

      appendFileSync(global.logFileHandle, fileLogEntry + '\n');
    } catch (error) {
      // Don't fail if logging fails
      console.log(color('yellow', `⚠️  Could not write to log file: ${error.message}`));
    }
  }
}

// Function to log conversational text
function logConversationalText(text) {
  if (text && text.trim()) {
    global.conversationalBuffer += text + ' ';
  }
}

// Helper function to display recent tool calls
function displayRecentToolCalls() {
  if (global.toolCallLog.length > 0) {
    console.log(color('cyan', `\n🔧 Recent tool calls (showing last ${global.toolCallLog.length}):`));
    global.toolCallLog.forEach(log => {
      console.log(color('cyan', `   ${log}`));
    });
  }
}


export async function claudeCommand(projectDir, prompt) {
  if (!existsSync(projectDir)) {
    console.log(color('red', `❌ Project directory not found: ${projectDir}`));
    return false;
  }

  // Note: We don't require git repository anymore - the sandbox will initialize it if needed

  console.log(color('blue', '🚀 Starting Claude Code in sandbox...'));
  console.log(color('yellow', `Project: ${projectDir}`));
  console.log(color('yellow', `Prompt: ${prompt}`));
  console.log('');

  const startTime = Date.now();
  if (VERBOSE_OUTPUT) console.log(color('cyan', '⏱️  Stage 1: Creating sandbox...'));

  const { sandboxDir, cleanup } = createSandbox(projectDir);
  const sandboxCreateTime = Date.now() - startTime;
  if (VERBOSE_OUTPUT) console.log(color('green', `✅ Sandbox created in ${sandboxCreateTime}ms`));

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    const envStartTime = Date.now();
    if (VERBOSE_OUTPUT) console.log(color('cyan', '⏱️  Stage 2: Setting up environment...'));

    // Apply Claude optimizations
    const claudeOptimizer = new ClaudeOptimizer(sandboxDir);
    claudeOptimizer.optimizeSettings();
    await claudeOptimizer.prewarmPlugins();

    // Apply system optimizations (with sudo access)
    const systemOptimizer = new SystemOptimizer();
    const systemOptimizationsApplied = await systemOptimizer.optimizeSystem();

    // Create optimized environment
    const baseEnv = createSandboxEnv(sandboxDir, {
      CLAUDECODE: '1'
    });

    const env = systemOptimizationsApplied
      ? { ...baseEnv, ...systemOptimizer.createOptimizedContainerEnv() }
      : claudeOptimizer.createOptimizedEnv(baseEnv);

    const envCreateTime = Date.now() - envStartTime;
    if (VERBOSE_OUTPUT) console.log(color('green', `✅ Environment configured in ${envCreateTime}ms`));

    if (systemOptimizationsApplied && VERBOSE_OUTPUT) {
      console.log(color('yellow', `🚀 System-level optimizations applied`));
    }

    if (VERBOSE_OUTPUT) console.log(color('cyan', `📦 Using host Claude settings with all available tools\n`));

    const claudeArgs = [
      '--verbose',
      '--output-format', 'stream-json',
      '--permission-mode', 'bypassPermissions',
      '--allowed-tools', ALLOWED_TOOLS.join(',')
    ];

    if (VERBOSE_OUTPUT) console.log(color('blue', `📝 Running Claude Code with host settings\n`));

    return new Promise((resolve, reject) => {
      const claudeStartTime = Date.now();
      console.log(color('cyan', '⏱️  Stage 3: Starting Claude Code...'));

      const workspacePath = join(sandboxDir, 'workspace');

      // Modify the prompt to include directory change instruction
      const modifiedPrompt = `You are working in a sandboxed environment. Your working directory is "${workspacePath}". All operations should be performed in this directory. ${prompt}`;

      const proc = spawn('claude', claudeArgs, {
        cwd: workspacePath,  // Set working directory directly
        env: env,  // Use the environment directly without modification
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,  // Don't use shell since we're setting cwd directly
        detached: false
      });

      let claudeStarted = false;
      let jsonBuffer = ''; // Buffer for incomplete JSON lines

      function handleEvent(event) {
        if (event.type === 'system' && event.subtype === 'init') {
          if (!claudeStarted) {
            const claudeCreateTime = Date.now() - claudeStartTime;
            if (VERBOSE_OUTPUT) console.log(color('green', `✅ Claude Code started in ${claudeCreateTime}ms`));
            claudeStarted = true;
          }
          if (VERBOSE_OUTPUT) console.log(color('green', `✅ Session started (${event.session_id.substring(0, 8)}...)`));
          if (VERBOSE_OUTPUT) console.log(color('cyan', `📦 Model: ${event.model}`));
          console.log(color('cyan', `🔧 Tools: ${event.tools.length} available`));

          // Warning if only default tools (15) are available instead of host tools (39)
          if (event.tools.length === 15) {
            console.log(color('yellow', `⚠️  Warning: No added tools found - using default tool set (15 tools)`));
            console.log(color('yellow', `⚠️  Host settings should provide 39 tools with MCP plugins`));
          }

          // List available tools
          if (event.tools && event.tools.length > 0) {
            const toolNames = event.tools.map(tool => tool.name || tool).sort();
            console.log(color('yellow', `   Available: ${toolNames.join(', ')}\n`));
          } else {
            console.log('');
          }
        } else if (event.type === 'assistant' && event.message) {
          const content = event.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                // Capture conversational text and display if verbose
                if (VERBOSE_OUTPUT) {
                  process.stdout.write(block.text);
                } else {
                  logConversationalText(block.text);
                }
              } else if (block.type === 'tool_use') {
                // Track the tool call for later result matching
                if (block.id) {
                  global.pendingToolCalls.set(block.id, block.name);
                }
                logToolCall(block.name, 'call', block);
                if (VERBOSE_OUTPUT) {
                  console.log(color('cyan', `\n🔧 Using tool: ${block.name}`));
                }
              }
            }
          }
        } else if (event.type === 'user' && event.message) {
          const content = event.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                // Match the result with the original tool call
                const toolUseId = block.tool_use_id;
                const toolName = global.pendingToolCalls.get(toolUseId) || `unknown_tool_${toolUseId}`;

                logToolCall(toolName, 'result', null, block);

                // Remove from pending calls after matching
                global.pendingToolCalls.delete(toolUseId);
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
      }

      function handleStreamingOutput(data) {
        jsonBuffer += data.toString();

        // Split by newlines but keep the last incomplete line in buffer
        const lines = jsonBuffer.split('\n');
        jsonBuffer = lines.pop() || ''; // Keep last line (might be incomplete)

        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines

          try {
            const event = JSON.parse(line);
            handleEvent(event);
          } catch (jsonError) {
            // Log JSON parsing errors for troubleshooting
            console.log(color('red', `🔍 JSON parse error: ${jsonError.message}`));
            console.log(color('yellow', `🔍 Problematic line (${line.length} chars): ${line.substring(0, 200)}${line.length > 200 ? '...' : ''}`));
            console.log(color('cyan', `🔍 Buffer state: ${jsonBuffer.length} chars in buffer`));

            // If we can't parse, put the line back in buffer and try to recover
            jsonBuffer = line + '\n' + jsonBuffer;
            console.log(color('yellow', `🔍 Attempting to recover - ${jsonBuffer.length} chars in buffer`));
          }
        }
      }

      // Add error handling
      proc.on('error', (error) => {
        console.log(color('red', `🔍 Debug: Process error: ${error.message}`));
        reject(error);
      });

      // Write modified prompt to stdin
      proc.stdin.write(modifiedPrompt);
      proc.stdin.end();

      let stdoutOutput = '';
      let stderrOutput = '';
      let lastError = '';

      proc.stdout.on('data', (data) => {
        stdoutOutput += data.toString();

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

        // Try to parse any remaining data in buffer
        if (jsonBuffer.trim()) {
          try {
            const event = JSON.parse(jsonBuffer);
            handleEvent(event);
          } catch (error) {
            console.log(color('yellow', `⚠️  Could not parse remaining buffer data: ${error.message}`));
            console.log(color('yellow', `⚠️  Remaining buffer: ${jsonBuffer.substring(0, 100)}...`));
          }
        }

        // Display recent tool calls
        displayRecentToolCalls();

        // Performance summary
        console.log(color('cyan', `\n📊 Performance Summary:`));
        console.log(color('cyan', `  • Sandbox creation: ${sandboxCreateTime}ms`));
        console.log(color('cyan', `  • Environment setup: ${envCreateTime}ms`));
        console.log(color('cyan', `  • Claude Code session: ${totalTime - sandboxCreateTime - envCreateTime}ms`));
        console.log(color('cyan', `  • Total time: ${totalTime}ms`));

        // Log file information if enabled
        if (ENABLE_FILE_LOGGING && global.logFileHandle) {
          console.log(color('yellow', `📝 Tool calls logged to: ${global.logFileHandle}`));
        }

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
