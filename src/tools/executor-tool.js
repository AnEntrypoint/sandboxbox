import { spawn, execSync } from 'child_process';
import { validateWorkingDirectory, createToolResponse, validateRequiredParams as validateRequiredParamsUtil } from '../core/utilities.js';
import { writeFileSync, chmodSync, unlinkSync } from 'fs';
import path from 'path';
import os from 'os';
import { workingDirectoryContext, createToolContext } from '../core/working-directory-context.js';
import { suppressConsoleOutput } from '../core/console-suppression.js';
import { executionState, shouldExecuteAsync, addExecutionStatusToResponse } from '../core/execution-state.js';
import { ToolError, ToolErrorHandler } from '../core/error-handling.js';
import { withConnectionManagement, getGlobalConnectionManager } from '../core/connection-manager.js';
import { withCrossToolAwareness, addToolMetadata } from '../core/cross-tool-context.js';



function getContextSummary(context) {
  if (!context || !context.sessionData) {
    return '';
  }

  const lines = [];

  // Only include practically useful information
  if (context.workingDirectory !== process.cwd()) {
    lines.push(`Working directory: ${context.workingDirectory}`);
  }

  return lines.join('\n') + '\n';
}

function createExecutionErrorResponse(error, startTime, context = {}) {
  return {
    success: false,
    error: error?.message || error || 'Unknown error occurred',
    executionTimeMs: Date.now() - startTime,
    ...context
  };
}

// Enhance execution result with error analysis and actionable suggestions
function enhanceExecutionResult(result, code, runtime, workingDirectory) {
  if (!result || result.success) {
    return result;
  }

  // Perform error analysis for syntax errors
  const errorAnalysis = analyzeExecutionError(result.stderr, result.stdout, runtime, code);

  // Create enhanced error response
  const enhancedResult = {
    ...result,
    _errorAnalysis: errorAnalysis,
    _requiresTroubleshooting: errorAnalysis.isSyntaxError || !result.success,
    _suggestions: errorAnalysis.suggestions || [],
    _confidence: errorAnalysis.confidence
  };

  // If this is a syntax error, provide detailed guidance
  if (errorAnalysis.isSyntaxError) {
    enhancedResult.error = `🐛 SYNTAX ERROR DETECTED: ${errorAnalysis.specificError}`;
    enhancedResult._troubleshootingRequired = true;
    enhancedResult._nextSteps = [
      'Review the code syntax carefully',
      'Fix the identified syntax issues',
      'Test the corrected code again',
      'Use language-specific documentation if needed'
    ];
  }

  return enhancedResult;
}


function generateExecutionInsights(result, query, workingDirectory) {
  const insights = [];

  if (result.success) {
    if (result.filesAccessed && result.filesAccessed.length > 0) {
      insights.push(`Modified ${result.filesAccessed.length} files: ${result.filesAccessed.slice(0, 3).join(', ')}${result.filesAccessed.length > 3 ? '...' : ''}`);
    }

    if (result.executionTimeMs) {
      insights.push(`Execution time: ${result.executionTimeMs}ms`);
    }

    if (result.stdout && result.stdout.length > 0) {
      const lines = result.stdout.split('\n').length;
      insights.push(`Generated ${lines} lines of output`);
    }
  }

  if (workingDirectory !== process.cwd()) {
    insights.push(`Working directory: ${workingDirectory}`);
  }

  return insights;
}

function createSuccessResponse(data, startTime, context = {}) {
  return {
    success: true,
    executionTimeMs: Date.now() - startTime,
    ...data,
    ...context
  };
}

function createTimeoutError(operation, timeoutMs, startTime) {
  return createExecutionErrorResponse(
    `${operation} timed out after ${timeoutMs}ms`,
    startTime,
    { timeout: true, timeoutMs }
  );
}

function handleProcessError(error, command, startTime) {
  let errorMessage = 'Process execution failed';
  let errorContext = { command };
  let suggestions = [];

  if (error.code === 'ENOENT') {
    errorMessage = `Command not found: ${command}`;
    errorContext.missingCommand = true;
    suggestions = [
      `Install ${command} using your package manager`,
      `Check if ${command} is in your PATH`,
      `Verify the command name is correct`
    ];
  } else if (error.code === 'EACCES') {
    errorMessage = `Permission denied executing: ${command}`;
    errorContext.permissionDenied = true;
    suggestions = [
      `Check file permissions for ${command}`,
      `Run with appropriate permissions`,
      `Verify the command is executable`
    ];
  } else if (error.signal) {
    errorMessage = `Process terminated with signal: ${error.signal}`;
    errorContext.signal = error.signal;
    suggestions = [
      `Process was killed by signal ${error.signal}`,
      `Check for resource limits or timeouts`,
      `Verify system resources are available`
    ];
  } else if (error.code) {
    errorMessage = `Process failed with code: ${error.code}`;
    errorContext.exitCode = error.code;
    suggestions = [
      `Check the error output for details`,
      `Verify the command syntax and arguments`,
      `Check if all required dependencies are available`
    ];
  }

  return {
    ...createExecutionErrorResponse(errorMessage, startTime, errorContext),
    suggestions,
    requiresTroubleshooting: true
  };
}

// Enhanced syntax error detection and analysis
function analyzeExecutionError(stderr, stdout, runtime, code) {
  const analysis = {
    isSyntaxError: false,
    errorType: 'unknown',
    specificError: null,
    suggestions: [],
    confidence: 0,
    context: {}
  };

  const errorOutput = (stderr || stdout || '').toLowerCase();

  // JavaScript/TypeScript syntax errors
  if (['nodejs', 'deno'].includes(runtime)) {
    if (errorOutput.includes('syntaxerror')) {
      analysis.isSyntaxError = true;
      analysis.errorType = 'syntax';
      analysis.specificError = extractJavaScriptError(errorOutput);
            analysis.confidence = 0.9;
    }
  }

  // Python syntax errors
  else if (runtime === 'python') {
    if (errorOutput.includes('syntaxerror')) {
      analysis.isSyntaxError = true;
      analysis.errorType = 'syntax';
      analysis.specificError = extractPythonError(errorOutput);
            analysis.confidence = 0.9;
    }
  }

  // Go compilation errors
  else if (runtime === 'go') {
    if (errorOutput.includes('syntax error') || errorOutput.includes('expected')) {
      analysis.isSyntaxError = true;
      analysis.errorType = 'syntax';
      analysis.specificError = extractGoError(errorOutput);
            analysis.confidence = 0.85;
    }
  }

  // Rust compilation errors
  else if (runtime === 'rust') {
    if (errorOutput.includes('error:') && errorOutput.includes('expected')) {
      analysis.isSyntaxError = true;
      analysis.errorType = 'syntax';
      analysis.specificError = extractRustError(errorOutput);
            analysis.confidence = 0.85;
    }
  }

  // C/C++ compilation errors
  else if (['c', 'cpp'].includes(runtime)) {
    if (errorOutput.includes('error:') && errorOutput.includes('expected')) {
      analysis.isSyntaxError = true;
      analysis.errorType = 'syntax';
      analysis.specificError = extractCppError(errorOutput);
            analysis.confidence = 0.85;
    }
  }

  return analysis;
}

function extractJavaScriptError(errorOutput) {
  const match = errorOutput.match(/syntaxerror:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : 'Unknown JavaScript syntax error';
}

function extractPythonError(errorOutput) {
  const match = errorOutput.match(/syntaxerror:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : 'Unknown Python syntax error';
}

function extractGoError(errorOutput) {
  const match = errorOutput.match(/syntax error:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : 'Unknown Go syntax error';
}

function extractRustError(errorOutput) {
  const match = errorOutput.match(/error\[E\d+\]:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : 'Unknown Rust syntax error';
}

function extractCppError(errorOutput) {
  const match = errorOutput.match(/error:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : 'Unknown C/C++ syntax error';
}


export async function executeProcess(command, args = [], options = {}) {
  const startTime = Date.now();
  const { timeout = 240000, cwd, input, encoding = 'utf8' } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: input ? 'pipe' : ['ignore', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';
    let isResolved = false;

    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        child.kill('SIGTERM');
        isResolved = true;
        resolve(createTimeoutError(`${command} ${args.join(' ')}`, timeout, startTime));
      }
    }, timeout);

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        if (data && typeof data === 'object' && Buffer.isBuffer(data)) {
          stdout += data.toString(encoding);
        } else if (data && typeof data === 'string') {
          stdout += data;
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        if (data && typeof data === 'object' && Buffer.isBuffer(data)) {
          stderr += data.toString(encoding);
        } else if (data && typeof data === 'string') {
          stderr += data;
        }
      });
    }

    child.on('close', (code, signal) => {
      if (!isResolved) {
        clearTimeout(timeoutId);
        isResolved = true;

        if (code === 0) {
          resolve(createSuccessResponse({ stdout, stderr, code, signal }, startTime));
        } else {
          resolve(createExecutionErrorResponse(
            stderr || `Process exited with code ${code}`,
            startTime,
            { stdout, stderr, code, signal }
          ));
        }
      }
    });

    child.on('error', (error) => {
      if (!isResolved) {
        clearTimeout(timeoutId);
        isResolved = true;
        resolve(handleProcessError(error, `${command} ${args.join(' ')}`, startTime));
      }
    });

    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

const EXECUTION_CONFIGS = {
  nodejs: { command: 'node', args: ['-e'], description: 'Node.js JavaScript' },
  deno: { command: 'deno', args: ['eval', '--no-check'], description: 'Deno JavaScript/TypeScript' },
  bash: { command: 'bash', args: ['-c'], description: 'Bash shell commands' },
  go: { command: 'go', args: ['run'], description: 'Go programming language', requiresFile: true },
  rust: { command: 'rustc', args: [], description: 'Rust programming language', requiresCompile: true },
  python: { command: 'python3', args: ['-c'], description: 'Python programming language' },
  c: { command: 'gcc', args: [], description: 'C programming language', requiresCompile: true },
  cpp: { command: 'g++', args: [], description: 'C++ programming language', requiresCompile: true }
};

export async function executeWithRuntime(codeOrCommands, runtime, options = {}) {
  const { workingDirectory, timeout = 240000 } = options;
  const config = EXECUTION_CONFIGS[runtime];

  if (!config) {
    throw new Error(`Unsupported runtime: ${runtime}`);
  }

  
  if (runtime === 'bash') {
    
    if (Array.isArray(codeOrCommands)) {
      const script = createBashScript(codeOrCommands);
      const tempScript = path.join(os.tmpdir(), `glootie_bash_${Date.now()}.sh`);
      writeFileSync(tempScript, script);
      chmodSync(tempScript, '755');

      
      return executeProcess(config.command, [tempScript], {
        cwd: workingDirectory,
        timeout,
        encoding: 'utf8'
      }).finally(() => {
        try { unlinkSync(tempScript); } catch (e) {
          
        }
      });
    } else {
      
      return executeProcess(config.command, [...config.args, codeOrCommands], {
        cwd: workingDirectory,
        timeout,
        encoding: 'utf8'
      });
    }
  }

  if (config.requiresFile) {
    
    const tempFile = path.join(os.tmpdir(), `glootie_${runtime}_${Date.now()}.${runtime === 'go' ? 'go' : 'rs'}`);
    try {
      writeFileSync(tempFile, codeOrCommands);
      return executeProcess(config.command, [...config.args, tempFile], {
        cwd: workingDirectory,
        timeout,
        encoding: 'utf8'
      });
    } finally {
      try { unlinkSync(tempFile); } catch (e) {}
    }
  }

  if (config.requiresCompile) {
    
    const extensions = { rust: 'rs', c: 'c', cpp: 'cpp' };
    const compilers = { rust: 'rustc', c: 'gcc', cpp: 'g++' };

    const tempFile = path.join(os.tmpdir(), `glootie_${runtime}_${Date.now()}.${extensions[runtime]}`);
    const tempExec = path.join(os.tmpdir(), `glootie_${runtime}_${Date.now()}`);

    try {
      writeFileSync(tempFile, codeOrCommands);

      
      const compileResult = await executeProcess(compilers[runtime], [tempFile, '-o', tempExec], {
        cwd: workingDirectory,
        timeout: timeout / 2,
        encoding: 'utf8'
      });

      if (!compileResult.success) {
        return compileResult;
      }

      
      return await executeProcess(tempExec, [], {
        cwd: workingDirectory,
        timeout: timeout / 2,
        encoding: 'utf8'
      });
    } finally {
      try { unlinkSync(tempFile); } catch (e) {}
      try { unlinkSync(tempExec); } catch (e) {}
    }
  }

  
  let finalCode = codeOrCommands;

  // Handle stdin and provide ESM guidance for Node.js
  if (runtime === 'nodejs') {
    // Check if code uses CommonJS require() and provide guidance
    const usesRequire = codeOrCommands.includes('require(');
    const guidance = usesRequire ? `
// Note: This code uses require() which is CommonJS syntax.
// In ESM mode (which MCP glootie uses), use:
//   const fs = require('fs');           // ❌ CommonJS (won't work)
//   import fs from 'fs';               // ✅ ESM (works)
//   const fs = await import('fs');     // ✅ ESM dynamic import (works)

` : '';

    finalCode = `
// Note: Running in MCP context with limited stdin access
${guidance}

${codeOrCommands}
`;
  }

  return executeProcess(config.command, [...config.args, finalCode], {
    cwd: workingDirectory,
    timeout,
    encoding: 'utf8'
  });
}

export async function executeBashCommands(commands, options = {}) {
  return executeWithRuntime(commands, 'bash', options);
}

export async function executeNodeCode(code, options = {}) {
  return executeWithRuntime(code, 'nodejs', options);
}

export async function executeDenoCode(code, options = {}) {
  return executeWithRuntime(code, 'deno', options);
}

export async function executeBashCommand(commands, timeout = 240000, workingDirectory, defaultWorkingDir) {
  const startTime = Date.now();

  const paramError = validateRequiredParams({ workingDirectory }, ['workingDirectory'], startTime);
  if (paramError) return paramError;

  const dirValidation = validateWorkingDirectory(workingDirectory);
  if (!dirValidation.isValid) {
    return createExecutionErrorResponse(dirValidation.error, startTime);
  }

  const effectiveWorkingDir = dirValidation.resolvedDir;

  const commandArray = Array.isArray(commands) ? commands : [commands];

  
  const nonEmptyCommands = commandArray.filter(cmd => {
    if (typeof cmd !== 'string') return false;
    const trimmed = cmd.trim();
    
    return trimmed.length > 0 && !trimmed.startsWith('#');
  });

  if (nonEmptyCommands.length === 0) {
    return createExecutionErrorResponse("No valid commands to execute", startTime);
  }

  const validationResult = validateExecutionContent(nonEmptyCommands, 'Commands');
  if (!validationResult.valid) {
    return createExecutionErrorResponse(validationResult.error, startTime);
  }

  
  const securityValidation = validateBashCommands(nonEmptyCommands);
  if (!securityValidation.valid) {
    return createExecutionErrorResponse(securityValidation.error, startTime);
  }

  
  const result = await executeBashCommands(nonEmptyCommands, {
    workingDirectory: dirValidation.effectiveDir,
    timeout
  });

  return result;
}

export function validateBashCommands(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    return {
      valid: false,
      error: "Commands must be a non-empty array"
    };
  }

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];

    if (typeof command !== 'string') {
      return {
        valid: false,
        error: `Command ${i}: Must be a string`
      };
    }

    if (command.trim().length === 0) {
      return {
        valid: false,
        error: `Command ${i}: Cannot be empty or whitespace only`
      };
    }

    const dangerous = ['rm -rf /', 'sudo rm', 'format', 'mkfs', ':(){ :|:& };:', 'dd if=/dev/zero'];
    const lowerCommand = command.toLowerCase();

    for (const pattern of dangerous) {
      if (lowerCommand.includes(pattern)) {
        return {
          valid: false,
          error: `Command ${i}: Contains potentially dangerous pattern '${pattern}'`
        };
      }
    }
  }

  return { valid: true };
}

function createBashScript(commands) {
  const scriptLines = [
    '#!/bin/bash',
    'set -e',
    'set -o pipefail',
    '',
    'echo "=== BASH EXECUTION START ==="',
    `echo "Commands to execute: ${commands.length}"`,
    'echo "Working directory: $(pwd)"',
    'echo "Timestamp: $(date)"',
    'echo ""'
  ];

  commands.forEach((command, index) => {
    scriptLines.push(`echo "--- Command ${index + 1}/${commands.length} ---"`);
    scriptLines.push(`echo "$ ${command}"`);
    scriptLines.push(command);
    scriptLines.push('CMD_EXIT_CODE=$?');
    scriptLines.push('if [ $CMD_EXIT_CODE -ne 0 ]; then');
    scriptLines.push(`  echo "Command ${index + 1} failed with exit code $CMD_EXIT_CODE" >&2`);
    scriptLines.push('  exit $CMD_EXIT_CODE');
    scriptLines.push('fi');
    scriptLines.push('echo ""');
  });

  scriptLines.push('echo "=== BASH EXECUTION COMPLETE ==="');
  scriptLines.push('echo "All commands completed"');

  return scriptLines.join('\n');
}


// validateRequiredParamsUtil is now imported from utilities.js

function validateExecutionContent(content, type) {
  if (!content || (typeof content !== 'string' && !Array.isArray(content))) {
    return { valid: false, error: `${type} must be a non-empty string or array` };
  }

  if (typeof content === 'string' && content.trim().length === 0) {
    return { valid: false, error: `${type} cannot be empty or whitespace only` };
  }

  if (Array.isArray(content) && content.length === 0) {
    return { valid: false, error: `${type} array cannot be empty` };
  }

  if (Array.isArray(content)) {
    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      if (typeof item !== 'string') {
        return { valid: false, error: `${type} array item ${i} must be a string` };
      }
      if (item.trim().length === 0) {
        return { valid: false, error: `${type} array item ${i} cannot be empty` };
      }
    }
  }

  return { valid: true };
}


let runtimeCache = null;

export function detectAvailableRuntimes() {
  if (runtimeCache) return runtimeCache;

  const runtimes = {
    nodejs: { cmd: 'node --version', available: false, version: null },
    deno: { cmd: 'deno --version', available: false, version: null },
    bash: { cmd: 'bash --version', available: false, version: null },
    go: { cmd: 'go version', available: false, version: null },
    rust: { cmd: 'rustc --version', available: false, version: null },
    python: { cmd: 'python3 --version', available: false, version: null },
    c: { cmd: 'gcc --version', available: false, version: null },
    cpp: { cmd: 'g++ --version', available: false, version: null }
  };

  for (const [name, config] of Object.entries(runtimes)) {
    try {
      const result = execSync(config.cmd, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      config.available = true;
      config.version = result.split('\n')[0].trim();
    } catch (error) {
      config.available = false;
    }
  }

  runtimeCache = runtimes;
  return runtimes;
}

export async function executeWithRuntimeValidation(codeOrCommands, runtime, options = {}) {
  const startTime = Date.now();

  
  const runtimes = detectAvailableRuntimes();
  const runtimeInfo = runtimes[runtime];

  if (!runtimeInfo || !runtimeInfo.available) {
    const config = EXECUTION_CONFIGS[runtime];
    const errorMessage = `${config.description} runtime not available. Install ${config.command} to use this feature.`;
    return createExecutionErrorResponse(errorMessage, startTime);
  }

  return executeWithRuntime(codeOrCommands, runtime, options);
}

export async function executeGoCode(code, options = {}) {
  return executeWithRuntimeValidation(code, 'go', options);
}

export async function executePythonCode(code, options = {}) {
  return executeWithRuntimeValidation(code, 'python', options);
}

export async function executeRustCode(code, options = {}) {
  return executeWithRuntimeValidation(code, 'rust', options);
}

export async function executeCCode(code, options = {}) {
  return executeWithRuntimeValidation(code, 'c', options);
}

export async function executeCppCode(code, options = {}) {
  return executeWithRuntimeValidation(code, 'cpp', options);
}

export { generateExecutionInsights };

export const executionTools = [
  {
    name: "execute",
    description: "Execute code in JS/TS, Go, Rust, Python, C, C++, or bash with auto-runtime detection. Primary tool for testing hypotheses before implementation. Supports both code snippets and shell commands.",
    inputSchema: {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "Path to working directory for execution."
        },
        code: {
          type: "string",
          description: "Code to execute. Include timeouts for network/async operations to prevent hangs."
        },
        commands: {
          type: ["string", "array"],
          description: "Bash commands (single or array for planned batch executions)"
        },
        runtime: {
          type: "string",
          enum: ["nodejs", "deno", "bash", "go", "rust", "python", "c", "cpp", "auto"],
          description: "Execution runtime (default: auto-detect)"
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 240000)"
        }
      },
      required: ["workingDirectory"]
    },
    handler: withCrossToolAwareness(withConnectionManagement(async ({ code, commands, workingDirectory, runtime = "auto", timeout = 240000 }) => {
      const consoleRestore = suppressConsoleOutput();
      const effectiveWorkingDirectory = workingDirectory;
      const query = code || commands || '';

      try {
        // Validate required parameters
        if (!workingDirectory) {
          throw new ToolError(
            'Working directory is required',
            'MISSING_PARAMETER',
            'execute',
            false,
            ['Provide absolute path to working directory', 'Check tool documentation']
          );
        }

        // Start execution tracking for all operations
        const execution = executionState.startExecution({
          type: 'execute',
          code,
          commands,
          runtime,
          workingDirectory: effectiveWorkingDirectory,
          timeout
        });

        let result;
        if (code) {
          let targetRuntime = runtime === "auto" ? "nodejs" : runtime;

          if (runtime === "auto") {
            const shellCommands = ['npm ', 'npx ', 'yarn ', 'pip ', 'python ', 'go ', 'rustc ', 'gcc ', 'g++ ', 'git ', 'mkdir ', 'rm ', 'ls ', 'cd '];
            const isShellCommand = shellCommands.some(cmd => code.trim().startsWith(cmd));
            if (isShellCommand) {
              targetRuntime = 'bash';
            }
          }

          try {
            const executionStart = Date.now();
            result = await executeWithRuntimeValidation(code, targetRuntime, { workingDirectory, timeout });
            const executionDuration = Date.now() - executionStart;

            // Complete execution (duration-based logic for cross-tool sharing)
            executionState.completeExecution(execution.id, result);
          } catch (executionError) {
            if (targetRuntime === 'bash') {
              try {
                result = await executeWithRuntimeValidation(code, 'nodejs', { workingDirectory, timeout });
              } catch (fallbackError) {
                result = {
                  success: false,
                  stdout: '',
                  stderr: `Failed to execute as both bash and nodejs:\nBash error: ${executionError.message}\nNode.js error: ${fallbackError.message}`,
                  executionTimeMs: 0
                };
              }
            } else {
              result = {
                success: false,
                stdout: '',
                stderr: `Execution failed: ${executionError.message}`,
                executionTimeMs: 0
              };
            }
            executionState.failExecution(execution.id, executionError);
          }
          result = enhanceExecutionResult(result, code, targetRuntime, workingDirectory);
        } else if (commands) {
          try {
            const executionStart = Date.now();
            result = await executeWithRuntimeValidation(commands, 'bash', { workingDirectory, timeout });
            const executionDuration = Date.now() - executionStart;

            // Complete execution
            executionState.completeExecution(execution.id, result);
          } catch (executionError) {
            result = {
              success: false,
              stdout: '',
              stderr: `Command execution failed: ${executionError.message}`,
              executionTimeMs: 0
            };
            executionState.failExecution(execution.id, executionError);
          }
          result = enhanceExecutionResult(result, commands, 'bash', workingDirectory);
        } else {
          result = { content: [{ type: "text", text: "No code or commands provided" }] };
        }


        const insights = generateExecutionInsights(result, query, effectiveWorkingDirectory);

        // Format response with enhanced error information
        let responseContent = result;

        if (result._errorAnalysis && result._errorAnalysis.isSyntaxError) {
          // Simple error response
          responseContent = {
            ...result,
            content: [{ type: "text", text: result.error || result.stderr || 'Execution failed' }]
          };
        } else if (!result.success) {
          // Simple error format
          responseContent = {
            ...result,
            content: [{ type: "text", text: result.error || result.stderr || 'Execution failed' }]
          };
        } else if (!result.content) {
          // Format successful execution or basic error
          let outputText = '';

          if (result.success) {
            outputText = result.stdout || 'Execution successful';
          } else {
            outputText = result.error || result.stderr || 'Execution failed';
          }

          responseContent = {
            ...result,
            content: [{ type: "text", text: outputText }]
          };
        }

        const toolContext = createToolContext('execute', effectiveWorkingDirectory, query, {
          ...responseContent,
          duration: responseContent.executionTimeMs || 0,
          filesAccessed: responseContent.filesAccessed || [],
          patterns: responseContent.patterns || [],
          insights: insights
        });

        await workingDirectoryContext.updateContext(effectiveWorkingDirectory, 'execute', toolContext);

        // Clean up old executions
        executionState.cleanup();

        return responseContent;
      } catch (error) {

        const errorContext = createToolContext('execute', effectiveWorkingDirectory, query, {
          error: error.message,
          duration: 0
        });
        await workingDirectoryContext.updateContext(effectiveWorkingDirectory, 'execute', errorContext);

        return {
          content: [{ type: "text", text: `Execution error: ${error.message}` }],
          isError: true
        };
      } finally {

        consoleRestore.restore();
      }
    }, 'execute', {
      maxRetries: 2,
      retryDelay: 1000
    }), 'execute')
  }
];

