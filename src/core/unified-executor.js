import { spawn } from 'child_process';
import { validateWorkingDirectory } from './utilities.js';

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

export async function executeBashCommands(commands, options = {}) {
  const { workingDirectory, timeout = 120000 } = options;
  const commandString = Array.isArray(commands) ? commands.join(' && ') : commands;

  return executeProcess('bash', ['-c', commandString], {
    cwd: workingDirectory,
    timeout,
    encoding: 'utf8'
  });
}

export async function executeNodeCode(code, options = {}) {
  const { workingDirectory, timeout = 120000 } = options;

  return executeProcess('node', ['-e', code], {
    cwd: workingDirectory,
    timeout,
    encoding: 'utf8'
  });
}

export async function executeDenoCode(code, options = {}) {
  const { workingDirectory, timeout = 120000 } = options;

  return executeProcess('deno', ['eval', '--no-check', code], {
    cwd: workingDirectory,
    timeout,
    encoding: 'utf8'
  });
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

  const validationResult = validateBashCommands(commandArray);
  if (!validationResult.valid) {
    return createErrorResponse(validationResult.error, startTime);
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

function validateRequiredParamsUtil(params, requiredParams) {
  const missingParams = requiredParams.filter(param => !params[param]);
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
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

export const executionTools = [
  {
    name: "execute",
    description: "Use this to ground your thought process in truth, test multiple hypotheses here before editing files by running hypthesized code, find first-principal facts first and ensure your edits will work by validating code in this tool, measure-twice-cut-once. Always use this before making edits to confirm your ideas work",
    inputSchema: {
      type: "object",
      properties: {
        workingDirectory: {
          type: "string",
          description: "REQUIRED: Working directory for execution."
        },
        code: {
          type: "string",
          description: "JavaScript/TypeScript code to execute"
        },
        commands: {
          type: ["string", "array"],
          description: "Bash commands (single or array for planned batch executions)"
        },
        runtime: {
          type: "string",
          enum: ["nodejs", "deno", "bash", "auto"],
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
        if (runtime === "nodejs" || runtime === "auto") {
          return await executeNodeCode(code, { workingDirectory, timeout });
        } else if (runtime === "deno") {
          return await executeDenoCode(code, { workingDirectory, timeout });
        }
      }

      if (commands) {
        return await executeBashCommand(commands, timeout, workingDirectory);
      }

      return { content: [{ type: "text", text: "No code or commands provided" }] };
    }, 'execute', 120000)
  }
];