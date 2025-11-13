#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = new Server(
  {
    name: 'sandboxbox',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sandboxbox_run',
        description: 'Execute a prompt in an isolated sandboxbox environment. Runs Claude Code with the given prompt in a temporary containerized workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt to execute in the sandboxbox environment',
            },
            directory: {
              type: 'string',
              description: 'The directory to run in (defaults to current directory)',
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'sandboxbox_run') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { prompt, directory } = request.params.arguments;

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt is required and must be a string');
  }

  const targetDir = directory || process.cwd();
  const cliPath = resolve(__dirname, '..', 'cli.js');

  return new Promise((resolve, reject) => {
    const args = ['claude', targetDir, prompt];
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SANDBOX_VERBOSE: 'false' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          content: [{
            type: 'text',
            text: `Error (exit code ${code}):\n${stderr || stdout}`,
          }],
          isError: true,
        });
      } else {
        resolve({
          content: [{
            type: 'text',
            text: stdout || 'Command completed successfully',
          }],
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        content: [{
          type: 'text',
          text: `Error: ${error.message}`,
        }],
        isError: true,
      });
    });
  });
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
