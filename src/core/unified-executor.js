import { spawn, execSync } from 'child_process';
import { validateWorkingDirectory } from './utilities.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function createErrorResponse(error, startTime, context = {}) {
  return {
    success: false,
    error: error?.message || error || 'Unknown error occurred',
    executionTimeMs: Date.now() - startTime,
    ...context
  };
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
  return createErrorResponse(
    `${operation} timed out after ${timeoutMs}ms`,
    startTime,
    { timeout: true, timeoutMs }
  );
}

function handleProcessError(error, command, startTime) {
  let errorMessage = 'Process execution failed';
  let errorContext = { command };

  if (error.code === 'ENOENT') {
    errorMessage = `Command not found: ${command}`;
    errorContext.missingCommand = true;
  } else if (error.code === 'EACCES') {
    errorMessage = `Permission denied executing: ${command}`;
    errorContext.permissionDenied = true;
  } else if (error.signal) {
    errorMessage = `Process terminated with signal: ${error.signal}`;
    errorContext.signal = error.signal;
  } else if (error.code) {
    errorMessage = `Process failed with code: ${error.code}`;
    errorContext.exitCode = error.code;
  }

  return createErrorResponse(errorMessage, startTime, errorContext);
}

function validateRequiredParams(params, required, startTime) {
  for (const param of required) {
    if (!params[param]) {
      return createErrorResponse(
        `Parameter '${param}' is required`,
        startTime,
        { parameterError: true, parameter: param }
      );
    }
  }
  return null;
}

export async function executeProcess(command, args = [], options = {}) {
  const startTime = Date.now();
  const { timeout = 120000, cwd, input, encoding = 'utf8' } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: input ? 'pipe' : ['pipe', 'pipe', 'pipe']
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
          resolve(createErrorResponse(
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

// Unified execution configuration for different languages
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
  const { workingDirectory, timeout = 120000 } = options;
  const config = EXECUTION_CONFIGS[runtime];

  if (!config) {
    throw new Error(`Unsupported runtime: ${runtime}`);
  }

  // Handle special cases
  if (runtime === 'bash') {
    const commandString = Array.isArray(codeOrCommands) ? codeOrCommands.join(' && ') : codeOrCommands;
    return executeProcess(config.command, [...config.args, commandString], {
      cwd: workingDirectory,
      timeout,
      encoding: 'utf8'
    });
  }

  if (config.requiresFile) {
    // Go requires temporary file
    const tempFile = path.join(os.tmpdir(), `glootie_${runtime}_${Date.now()}.${runtime === 'go' ? 'go' : 'rs'}`);
    try {
      fs.writeFileSync(tempFile, codeOrCommands);
      return executeProcess(config.command, [...config.args, tempFile], {
        cwd: workingDirectory,
        timeout,
        encoding: 'utf8'
      });
    } finally {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }

  if (config.requiresCompile) {
    // Languages requiring compilation (Rust, C, C++)
    const extensions = { rust: 'rs', c: 'c', cpp: 'cpp' };
    const compilers = { rust: 'rustc', c: 'gcc', cpp: 'g++' };

    const tempFile = path.join(os.tmpdir(), `glootie_${runtime}_${Date.now()}.${extensions[runtime]}`);
    const tempExec = path.join(os.tmpdir(), `glootie_${runtime}_${Date.now()}`);

    try {
      fs.writeFileSync(tempFile, codeOrCommands);

      // Compile
      const compileResult = await executeProcess(compilers[runtime], [tempFile, '-o', tempExec], {
        cwd: workingDirectory,
        timeout: timeout / 2,
        encoding: 'utf8'
      });

      if (!compileResult.success) {
        return compileResult;
      }

      // Execute
      return await executeProcess(tempExec, [], {
        cwd: workingDirectory,
        timeout: timeout / 2,
        encoding: 'utf8'
      });
    } finally {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      try { fs.unlinkSync(tempExec); } catch (e) {}
    }
  }

  // Simple interpreted languages (Node.js, Deno, Python)
  return executeProcess(config.command, [...config.args, codeOrCommands], {
    cwd: workingDirectory,
    timeout,
    encoding: 'utf8'
  });
}

// Legacy functions for backward compatibility
export async function executeBashCommands(commands, options = {}) {
  return executeWithRuntime(commands, 'bash', options);
}

export async function executeNodeCode(code, options = {}) {
  return executeWithRuntime(code, 'nodejs', options);
}

export async function executeDenoCode(code, options = {}) {
  return executeWithRuntime(code, 'deno', options);
}

export async function executeBashCommand(commands, timeout = 120000, workingDirectory, defaultWorkingDir) {
  const startTime = Date.now();

  const paramError = validateRequiredParams({ workingDirectory }, ['workingDirectory'], startTime);
  if (paramError) return paramError;

  const dirValidation = validateWorkingDirectory(workingDirectory, defaultWorkingDir);
  if (!dirValidation.valid) {
    return createErrorResponse(dirValidation.error, startTime);
  }

  const effectiveWorkingDir = dirValidation.effectiveDir;

  const commandArray = Array.isArray(commands) ? commands : [commands];

  const validationResult = validateExecutionContent(commandArray, 'Commands');
  if (!validationResult.valid) {
    return createErrorResponse(validationResult.error, startTime);
  }

  // Additional bash-specific security validation
  const securityValidation = validateBashCommands(commandArray);
  if (!securityValidation.valid) {
    return createErrorResponse(securityValidation.error, startTime);
  }

  const result = await executeBashCommands(commands, {
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

export function createToolResponse(content, isError = false) {
  return {
    content: [{ type: "text", text: content }],
    isError
  };
}

export function createErrorResponseUtil(message) {
  return createToolResponse(`Error: ${message}`, true);
}

// Unified validation functions
function validateRequiredParamsUtil(params, requiredParams) {
  const missingParams = requiredParams.filter(param => !params[param]);
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
}

// Unified content validation for different execution types
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

function createTimeoutToolHandler(handler, toolName = 'Unknown Tool', timeoutMs = 30000) {
  return async (args) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([
        handler(args),
        timeoutPromise
      ]);
    } catch (error) {
      if (error.message.includes('timed out')) {
        return createErrorResponseUtil(`Tool ${toolName} timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  };
}

// Language runtime detection cache
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
        timeout: 3000,
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

// Unified execution with runtime validation
export async function executeWithRuntimeValidation(codeOrCommands, runtime, options = {}) {
  const startTime = Date.now();
  const { workingDirectory, timeout = 120000 } = options;

  // Validate runtime availability
  const runtimes = detectAvailableRuntimes();
  const runtimeInfo = runtimes[runtime];

  if (!runtimeInfo || !runtimeInfo.available) {
    const config = EXECUTION_CONFIGS[runtime];
    const errorMessage = `${config.description} runtime not available. Install ${config.command} to use this feature.`;
    return createErrorResponse(errorMessage, startTime);
  }

  return executeWithRuntime(codeOrCommands, runtime, options);
}

// Legacy functions for backward compatibility (now using unified approach)
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

export const executionTools = [
  {
    name: "execute",
    description: "MANDATORY: TEST CODE IDEAS BEFORE IMPLEMENTING THEM - Execute code snippets in any languages (JS/TS, Go, Rust, Python, C, C++) with automatic runtime detection. ALWAYS USE THIS FIRST for: testing hypotheses, validating approaches, prototyping functions, debugging issues. Perfect for 'what if' scenarios before committing to implementation.",
    inputSchema: {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "REQUIRED: Absolute path to working directory for execution. Use full paths like '/Users/username/project' not relative paths like './project'."
        },
        code: {
          type: "string",
          description: "Jcode to execute"
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
          description: "Timeout in milliseconds (default: 120000)"
        }
      },
      required: ["workingDirectory"]
    },
    handler: createTimeoutToolHandler(async ({ code, commands, workingDirectory, runtime = "auto", timeout = 120000 }) => {
      if (code) {
        const targetRuntime = runtime === "auto" ? "nodejs" : runtime;
        return await executeWithRuntimeValidation(code, targetRuntime, { workingDirectory, timeout });
      }

      if (commands) {
        return await executeWithRuntimeValidation(commands, 'bash', { workingDirectory, timeout });
      }

      return { content: [{ type: "text", text: "No code or commands provided" }] };
    }, 'execute', 120000)
  }
];