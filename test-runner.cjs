#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const TEST_TIMEOUT = 12000000;
const MAX_RETRIES = 2;
const NPM_TIMEOUT = 1200000;
const RESULTS_DIR = 'results';

// Command validation function
function validateCommand(command, useMcp) {
  const errors = [];

  // Check for common command construction errors
  if (command.includes('claude--permission-mode')) {
    errors.push('Missing space between claude and --permission-mode');
  }

  if (command.includes('.claude.json--permission-mode')) {
    errors.push('Missing space between --mcp-config and --permission-mode');
  }

  // Check for proper quoting
  const openQuotes = (command.match(/"/g) || []).length;
  if (openQuotes % 2 !== 0) {
    errors.push('Unclosed quotes in command');
  }

  // Check for working directory existence
  const workingDirMatch = command.match(/cd\s+"([^"]+)"/);
  if (workingDirMatch && !fs.existsSync(workingDirMatch[1])) {
    errors.push(`Working directory does not exist: ${workingDirMatch[1]}`);
  }

  // Check MCP config file exists for MCP tests
  if (useMcp && command.includes('--mcp-config')) {
    const configMatch = command.match(/--mcp-config\s+(\S+)/);
    if (configMatch && !fs.existsSync(configMatch[1])) {
      errors.push(`MCP config file does not exist: ${configMatch[1]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    error: errors.length > 0 ? errors.join(', ') : null
  };
}

const TESTS = [
  {
    name: 'Component Analysis & Enhancement',
    prompt: 'Find all React components in this shadcn/ui project and analyze the component structure and patterns. Look specifically at the task-manager component and suggest improvements for better TypeScript typing and performance.',
    category: 'component-analysis'
  },
  {
    name: 'UI Component Generation',
    prompt: 'Add a new shadcn/ui component for a modal dialog component. Create it following the existing patterns (similar to button, card, input components). Include proper TypeScript interfaces and make it accessible. Validate it follows shadcn/ui patterns.',
    category: 'ui-generation'
  },
  {
    name: 'Project Refactoring Task',
    prompt: 'Perform a comprehensive refactoring: 1) Search for all hardcoded strings in components, 2) Extract common utility functions from multiple components into shared hooks, 3) Add proper error boundaries to the React components, 4) Generate a summary of changes made.',
    category: 'refactoring'
  },
  {
    name: 'Performance Optimization',
    prompt: 'Analyze the task-manager component for performance issues. Look for unnecessary re-renders, missing memoization, and inefficient state management. Then implement optimizations using React.memo, useCallback, and useMemo where appropriate. Validate the performance improvements.',
    category: 'optimization'
  }
];

const PACKAGE_JSON = {
  name: 'mcp-test-project',
  version: '0.1.0',
  private: true,
  scripts: {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint'
  },
  dependencies: {
    'react': '^18',
    'react-dom': '^18',
    'next': '14.2.5',
    '@radix-ui/react-slot': '^1.0.2',
    'class-variance-authority': '^0.7.0',
    'clsx': '^2.1.1',
    'lucide-react': '^0.424.0',
    'tailwind-merge': '^2.5.2',
    'tailwindcss-animate': '^1.0.7',
    '@modelcontextprotocol/sdk': '^1.11.0',
    '@ast-grep/napi': '^0.39.5',
    'ignore': '^7.0.5'
  },
  devDependencies: {
    'typescript': '^5',
    '@types/node': '^20',
    '@types/react': '^18',
    '@types/react-dom': '^18',
    'postcss': '^8',
    'tailwindcss': '^3.4.1',
    'eslint': '^8',
    'eslint-config-next': '14.2.5'
  }
};

const FILE_TEMPLATES = {
  utils: `
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
`,
  button: `
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
export { Button, buttonVariants }
`,
  card: `
import * as React from "react"
import { cn } from "@/lib/utils"
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
`,
  input: `
import * as React from "react"
import { cn } from "@/lib/utils"
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
export { Input }
`,
  taskManager: `
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { formatDate, generateId } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  dueDate?: Date
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as const })
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks).map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined
      })))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  const addTask = () => {
    if (!newTask.title.trim()) return
    const task: Task = {
      id: generateId(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      completed: false,
      createdAt: new Date()
    }
    setTasks(prev => [...prev, task])
    setNewTask({ title: '', description: '', priority: 'medium' })
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Task title..."
            value={newTask.title}
            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
          />
          <Input
            placeholder="Task description..."
            value={newTask.description}
            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <Button onClick={addTask}>Add Task</Button>
        </CardContent>
      </Card>
      <div className="flex gap-2 mb-4">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All ({tasks.length})
        </Button>
        <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>
          Active ({tasks.filter(t => !t.completed).length})
        </Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>
          Completed ({tasks.filter(t => t.completed).length})
        </Button>
      </div>
      <div className="space-y-4">
        {filteredTasks.map(task => (
          <Card key={task.id} className={task.completed ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={\`font-medium \${task.completed ? 'line-through' : ''}\`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Priority: {task.priority}</span>
                    <span>Created: {formatDate(task.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed ? 'Undo' : 'Complete'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
export default TaskManager
`,
  page: `
import { TaskManager } from '@/components/task-manager'
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Task Manager</h1>
          <p className="text-muted-foreground mt-4">
            A modern task management application built with Next.js and shadcn/ui
          </p>
        </div>
        <TaskManager />
      </div>
    </main>
  )
}
`,
  tailwindConfig: `
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
`,
  layout: `
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Test Project',
  description: 'Test project for components',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
`,
  globalsCss: `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,
  eslintConfig: `
{
  "extends": ["next/core-web-vitals"]
}
`,
  searchIgnore: [
    'node_modules/**',
    '.next/**',
    'coverage/**',
    '.nyc_output/**',
    '*.log',
    '*.tmp',
    'temp/**',
    'tmp/**',
    '.git/**',
    '.vscode/**',
    '.idea/**',
    'dist/**',
    'build/**',
    'out/**'
  ]
};

class OptimizedMCPTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: '3.1.6',
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      }
    };
  }

  async runOptimizedTest() {
    console.log('🚀 MCP Performance Test v3.1.6');
    console.log(`Platform: ${this.results.systemInfo.platform} ${this.results.systemInfo.arch} | Node.js: ${this.results.systemInfo.nodeVersion}`);

    console.log('🔍 Running pre-flight checks...');
    await this.runPreflightChecks();

    fs.mkdirSync(RESULTS_DIR, { recursive: true });

    const testDir = './optimized-test-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });

    let performanceResults = null;
    let testError = null;

    try {
      console.log('🔧 Setting up test environment...');
      await this.setupOptimizedEnvironment(testDir);

      console.log('🧪 Running all performance tests...');
      performanceResults = await this.testOptimizedPerformance(testDir);
      this.results.performance = performanceResults;

      const resultsFile = path.join(RESULTS_DIR, 'mcp-performance-' + Date.now() + '.json');
      fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
      console.log('📊 Results saved to: ' + resultsFile);

      this.displayPerformanceSummary(performanceResults);
    } catch (error) {
      console.error('❌ Test failed: ' + error.message);
      this.results.error = error.message;
      testError = error;
    }

    if (performanceResults && !testError) {
      console.log('📝 Generating analysis reports...');
      try {
        await this.generateUserReview(testDir, performanceResults);
        await this.generateSuggestions(testDir, performanceResults);
        console.log('✅ Analysis reports generated successfully');
      } catch (reportError) {
        console.error('❌ Failed to generate reports:', reportError.message);
      }
    }

    await this.cleanupTestDirectories(testDir);

    if (testError) {
      throw testError;
    }

    console.log('🎉 All tests, cleanup, and analysis completed!');
  }

  async executeClaudeCommand(command, workingDir, timeout, testInfo = {}, outputFile, stepsFile, startTime) {
    return new Promise((resolve, reject) => {
      const args = this.parseCommandArgs(command);

      // Check if this is an MCP test by looking for MCP config in the command
      const isMcpTest = command.includes('--mcp-config');
      const testLabel = this.createTestLabel(testInfo);

      let stdout = '';
      let stderr = '';

      let child;
      if (isMcpTest) {
        console.log(`${testLabel} 🔧 Starting MCP test with script wrapper`);
        // For MCP tests, use script wrapper like baseline tests
        child = spawn('script', [
          '-q', '-c', `cd "${workingDir}" && ${command}`, '/dev/null'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
      } else {
        console.log(`${testLabel} 🔧 Starting baseline test with script wrapper`);
        // For baseline tests, keep using script wrapper
        child = spawn('script', [
          '-q', '-c', `cd "${workingDir}" && ${command}`, '/dev/null'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
      }

      console.log(`${testLabel} 🚀 Child process spawned, PID: ${child.pid}`);

      // Open file streams for continuous writing
      const stdoutStream = fs.createWriteStream(`${outputFile}.stdout.log`, { flags: 'w' });
      const stderrStream = fs.createWriteStream(`${outputFile}.stderr.log`, { flags: 'w' });

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Write continuously to file
        stdoutStream.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Write continuously to file
        stderrStream.write(output);

        // Show errors immediately
        this.streamError(output, testLabel);
      });

      // Close streams when process ends
      child.on('close', () => {
        stdoutStream.end();
        stderrStream.end();
      });

      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        console.log(`${testLabel} ⏰ Command timed out after ${timeout/1000}s`);

        // Just log timeout - files written at end

        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);

        // Files will be written at the end of runTestCommand

        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(`Command failed with exit code ${code}`);
          Object.assign(error, { code, stderr, stdout, command });
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  parseCommandArgs(command) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  createTestLabel(testInfo = {}) {
    if (testInfo.testType && testInfo.testName) {
      const type = testInfo.testType.toUpperCase();
      const nameAbbrev = testInfo.testName.split(' ').map(w => w[0]).join('').substring(0, 4);
      return `[${type}:${nameAbbrev}]`;
    }
    return '[TEST]';
  }

  streamOutput(output, testLabel) {
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${testLabel} ${line}`);
        process.stdout.write(''); // Force immediate output
      }
    });
  }

  streamError(output, testLabel) {
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${testLabel} ERROR: ${line}`);
      }
    });
  }

  async runPreflightChecks() {
    const checks = [];

    try {
      execSync('claude --version', { stdio: 'pipe' });
      checks.push({ name: 'Claude CLI', status: '✅ Available' });
    } catch (error) {
      checks.push({ name: 'Claude CLI', status: '❌ Not found', error: error.message });
    }

    try {
      execSync('timeout 1 node src/index.js', { stdio: 'pipe', timeout: 3000, encoding: 'utf8' });
      checks.push({ name: 'MCP Server', status: '✅ Starts successfully' });
    } catch (error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        checks.push({ name: 'MCP Server', status: '✅ Starts successfully' });
      } else {
        checks.push({ name: 'MCP Server', status: '❌ Startup failed', error: error.message });
      }
    }

    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'src/index.js'))) {
      checks.push({ name: 'Working Directory', status: '✅ Correct location' });
    } else {
      checks.push({ name: 'Working Directory', status: '❌ Wrong location - missing src/index.js' });
    }

    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    if (majorVersion >= 18) {
      checks.push({ name: 'Node.js Version', status: `✅ ${nodeVersion} (compatible)` });
    } else {
      checks.push({ name: 'Node.js Version', status: `⚠️ ${nodeVersion} (may have issues)` });
    }

    checks.forEach(check => {
      console.log(`  ${check.status}: ${check.name}`);
      if (check.error) {
        console.log(`     Error: ${check.error}`);
      }
    });

    const failed = checks.filter(c => c.status.startsWith('❌'));
    if (failed.length > 0) {
      console.log(`⚠️  ${failed.length} pre-flight check(s) failed - tests may not run properly`);
    } else {
      console.log('✅ All pre-flight checks passed');
    }

    return checks;
  }

  async setupOptimizedEnvironment(testDir) {
    console.log('🔧 Setting up main test environment...');
  }

  async setupTestDirectory(testDir) {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(PACKAGE_JSON, null, 2));

    const dirs = ['app/components', 'app/ui', 'components/ui', 'lib'];
    dirs.forEach(dir => fs.mkdirSync(path.join(testDir, dir), { recursive: true }));

    fs.writeFileSync(path.join(testDir, 'lib/utils.ts'), FILE_TEMPLATES.utils);
    fs.writeFileSync(path.join(testDir, 'components/ui/button.tsx'), FILE_TEMPLATES.button);
    fs.writeFileSync(path.join(testDir, 'components/ui/card.tsx'), FILE_TEMPLATES.card);
    fs.writeFileSync(path.join(testDir, 'components/ui/input.tsx'), FILE_TEMPLATES.input);
    fs.writeFileSync(path.join(testDir, 'components/task-manager.tsx'), FILE_TEMPLATES.taskManager);
    fs.writeFileSync(path.join(testDir, 'app/page.tsx'), FILE_TEMPLATES.page);
    fs.writeFileSync(path.join(testDir, 'app/layout.tsx'), FILE_TEMPLATES.layout);
    fs.writeFileSync(path.join(testDir, 'app/globals.css'), FILE_TEMPLATES.globalsCss);
    fs.writeFileSync(path.join(testDir, '.eslintrc.json'), FILE_TEMPLATES.eslintConfig);
    fs.writeFileSync(path.join(testDir, 'tailwind.config.js'), FILE_TEMPLATES.tailwindConfig);

    fs.writeFileSync(path.join(testDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        baseUrl: '.',
        paths: { '@/*': ['./*'] }
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules']
    }, null, 2));

    console.log('📦 Installing dependencies...');
    await this.runNpmInstall(testDir);

    fs.writeFileSync(path.join(testDir, '.searchignore'), FILE_TEMPLATES.searchIgnore.join('\n'));

    const defaultIgnorePatterns = {
      files: [
        '**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/out/**',
        '**/coverage/**', '**/.nyc_output/**', '**/.git/**', '**/.vscode/**', '**/.idea/**',
        '**/*.log', '**/*.tmp', '**/temp/**', '**/tmp/**', '**/.DS_Store', '**/Thumbs.db',
        '**/*.map', '**/*.min.js', '**/*.min.css', '**/package-lock.json', '**/yarn.lock'
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
      directories: ['node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.nyc_output', '.git', '.vscode', '.idea', 'temp', 'tmp']
    };
    fs.writeFileSync(path.join(testDir, '.search-defaults.json'), JSON.stringify(defaultIgnorePatterns, null, 2));

    const isMcpTest = path.basename(testDir).includes('mcp');
    if (isMcpTest) {
      const mainDir = process.cwd();
      const hooksDir = path.resolve(mainDir, 'src', 'glooitie-hooks');

      // For MCP tests, use glootie server with built-in hooks
      const claudeConfig = {
        mcpServers: {
          glootie: {
            command: "node",
            args: [path.resolve(mainDir, 'src', 'index.js')],
            env: {}
          }
        }
      };
      fs.writeFileSync(path.join(testDir, '.claude.json'), JSON.stringify(claudeConfig, null, 2));
      console.log(`📝 Created MCP configuration for ${path.basename(testDir)}`);
    }

    const gitignoreContent = fs.readFileSync(path.join(process.cwd(), 'test-gitignore.txt'), 'utf8');
    fs.writeFileSync(path.join(testDir, '.gitignore'), gitignoreContent);

    await this.initializeGitRepo(testDir);
  }

  async runNpmInstall(testDir) {
    return new Promise((resolve, reject) => {
      const isMcpTest = path.basename(testDir).includes('mcp');
      let command = 'npm install --no-audit --prefer-offline --ignore-scripts --no-progress --silent @modelcontextprotocol/sdk @ast-grep/napi ignore';

      // No additional dependencies needed for MCP tests

      const child = spawn('script', ['-q', '-c', command, '/dev/null'], {
        cwd: testDir,
        stdio: 'pipe',
        env: process.env
      });

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`📦 ${path.basename(testDir)}: ${line}`);
          }
        });
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`📦 ${path.basename(testDir)} ERROR: ${line}`);
          }
        });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });

      setTimeout(() => {
        child.kill();
        reject(new Error('npm install timed out after 20 minutes'));
      }, NPM_TIMEOUT);
    });
  }

  async initializeGitRepo(testDir) {
    try {
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'ignore' });
      execSync('git init', { cwd: testDir, stdio: 'ignore' });
      execSync('git add .', { cwd: testDir, stdio: 'ignore' });
      execSync('git commit -a -m "Initial boilerplate commit"', { cwd: testDir, stdio: 'ignore' });
      console.log(`✅ Git repository initialized for ${path.basename(testDir)}`);
    } catch (gitError) {
      console.warn(`Warning: Could not initialize git repository for ${path.basename(testDir)}:`, gitError.message);
    }
  }

  async testOptimizedPerformance(testDir) {
    console.log('🧪 Running performance tests...');

    console.log(`🚀 Running ${TESTS.length} tests in parallel...`);
    console.log(`   Tests: ${TESTS.length} (${TESTS.length * 2} total runs)`);

    const testDirectories = [];
    const allTestPromises = [];

    TESTS.forEach(test => {
      const baselineDir = `${testDir}-baseline-${test.category}`;
      const mcpDir = `${testDir}-mcp-${test.category}`;

      fs.mkdirSync(baselineDir, { recursive: true });
      fs.mkdirSync(mcpDir, { recursive: true });

      testDirectories.push(
        { dir: baselineDir, test, type: 'baseline' },
        { dir: mcpDir, test, type: 'mcp' }
      );
    });

    console.log(`📦 Setting up ${testDirectories.length} test directories in parallel...`);
    await Promise.all(testDirectories.map(({ dir }) => this.setupTestDirectory(dir)));

    TESTS.forEach(test => {
      const baselineDir = `${testDir}-baseline-${test.category}`;
      const mcpDir = `${testDir}-mcp-${test.category}`;

      const baselinePromise = this.runTestCommand(baselineDir, test, false)
        .then(result => ({ type: 'baseline', test, result, directory: baselineDir }))
        .catch(error => ({
          type: 'baseline',
          test,
          result: { success: false, duration: 0, error: error.message, testType: 'baseline' },
          directory: baselineDir
        }));

      const mcpPromise = this.runTestCommand(mcpDir, test, true)
        .then(result => ({ type: 'mcp', test, result, directory: mcpDir }))
        .catch(error => ({
          type: 'mcp',
          test,
          result: { success: false, duration: 0, error: error.message, testType: 'mcp' },
          directory: mcpDir
        }));

      allTestPromises.push(baselinePromise, mcpPromise);
    });

    console.log(`🏃 [${new Date().toLocaleTimeString()}] Starting all ${allTestPromises.length} test executions in parallel...`);

    const startTime = Date.now();
    let completedCount = 0;

    const monitoredPromises = allTestPromises.map((promise, index) =>
      promise.then(result => {
        completedCount++;
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`   ✅ [${new Date().toLocaleTimeString()}] Test ${completedCount}/${allTestPromises.length} completed (${elapsed.toFixed(1)}s elapsed)`);
        return result;
      }).catch(error => {
        completedCount++;
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`   ❌ [${new Date().toLocaleTimeString()}] Test ${completedCount}/${allTestPromises.length} failed (${elapsed.toFixed(1)}s elapsed)`);
        throw error;
      })
    );

    const allResults = await Promise.all(monitoredPromises);
    const totalTime = (Date.now() - startTime) / 1000;

    console.log(`📊 [${new Date().toLocaleTimeString()}] All tests completed! Total parallel execution time: ${totalTime.toFixed(1)}s`);

    const resultsByTest = new Map();
    TESTS.forEach(test => {
      resultsByTest.set(test.category, { test, baseline: null, mcp: null });
    });

    allResults.forEach(({ type, test, result }) => {
      const key = test.category;
      if (resultsByTest.has(key)) {
        resultsByTest.get(key)[type] = result;
      }
    });

    const testResults = [];
    resultsByTest.forEach(({ test, baseline, mcp }) => {
      const improvement = baseline.success && mcp.success
        ? ((baseline.duration - mcp.duration) / baseline.duration * 100).toFixed(1)
        : 'N/A';

      const testResult = {
        name: test.name,
        category: test.category,
        baseline,
        optimized: mcp,
        improvement
      };

      console.log(`✅ Completed: ${test.name}`);
      console.log(`   Baseline: ${baseline.success ? baseline.duration.toFixed(1) + 's' : 'FAILED'} | MCP: ${mcp.success ? mcp.duration.toFixed(1) + 's' : 'FAILED'} | Improvement: ${improvement}%`);

      this.logTestErrors(baseline, mcp);

      testResults.push(testResult);
    });

    const results = {
      tests: testResults,
      avgImprovement: 0,
      cacheEffectiveness: 0,
      optimizationBenefits: []
    };

    const successfulTests = results.tests.filter(t => t.improvement !== 'N/A');
    if (successfulTests.length > 0) {
      const avgImprovement = successfulTests.reduce((sum, t) => sum + parseFloat(t.improvement), 0) / successfulTests.length;
      results.avgImprovement = avgImprovement.toFixed(1);
    }

    console.log('🎉 All tests completed!');
    return results;
  }

  logTestErrors(baseline, mcp) {
    if (!baseline.success) {
      console.log(`  ❌ Baseline failed: ${baseline.error || 'Unknown error'}`);
      if (baseline.fullError) {
        console.log(`     Command: ${baseline.fullError.command}`);
        console.log(`     Exit code: ${baseline.fullError.code}`);
        if (baseline.fullError.stderr) {
          console.log(`     stderr: ${baseline.fullError.stderr.substring(0, 200)}...`);
        }
      }
    }
    if (!mcp.success) {
      console.log(`  ❌ MCP failed: ${mcp.error || 'Unknown error'}`);
      if (mcp.fullError) {
        console.log(`     Command: ${mcp.fullError.command}`);
        console.log(`     Exit code: ${mcp.fullError.code}`);
        if (mcp.fullError.stderr) {
          console.log(`     stderr: ${mcp.fullError.stderr.substring(0, 200)}...`);
        }
      }
    }
  }

  async runTestCommand(workingDir, test, useMcp) {
    const startTime = Date.now();
    let lastError = null;
    const testType = useMcp ? 'mcp' : 'baseline';

    // Declare file paths outside retry loop so they're accessible to executeClaudeCommand
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const outputFile = path.join(RESULTS_DIR, `claude-output-${test.category}-${testType}.json`);
    const stepsFile = path.join(RESULTS_DIR, `claude-steps-${test.category}-${testType}.json`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!fs.existsSync(workingDir)) {
          throw new Error(`Test directory not found: ${workingDir}`);
        }

        const normalizedPath = path.resolve(workingDir);

        const standardTools = "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell";
        const mcpTools = "mcp__glootie__execute,mcp__glootie__searchcode,mcp__glootie__ast_tool";
        const allowedTools = useMcp ? `${standardTools},${mcpTools}` : standardTools;

        const finalPrompt = test.prompt + (useMcp ? " use glootie " : "");
        const mcpConfig = useMcp ? '--mcp-config ./.claude.json' : '';
        const permissionMode = '--permission-mode bypassPermissions';

        // MCP tests now include built-in hooks

        const claudeCmd = `cd "${workingDir}" && ${useMcp ? 'env CLAUDE_CONFIG_DIR=. ' : ''} claude ${mcpConfig} ${permissionMode} -p "${finalPrompt}" --allowed-tools "${allowedTools}" --add-dir "./" --output-format stream-json --verbose --debug`;

        // Validate command construction
        const validation = validateCommand(claudeCmd, useMcp);
        if (!validation.valid) {
          console.log(`   ❌ Command validation failed: ${validation.error}`);
          console.log(`   🔧 Validation errors: ${validation.errors.join('; ')}`);
          throw new Error(`Command validation failed: ${validation.error}`);
        }
        console.log(`   ✅ Command validation passed`);

        console.log(`🚀 [${new Date().toLocaleTimeString()}] Starting ${testType} test for ${test.name}`);
        console.log(`   📁 Working dir: ${path.basename(workingDir)}`);
        console.log(`   🔧 Tools: ${allowedTools.split(',').length} (MCP: ${useMcp ? 'enabled' : 'disabled'})`);
        console.log(`   💻 Command: ${claudeCmd}`);

        const testInfo = { testType, testName: test.name, testCategory: test.category };

        console.log(`   ⚡ Executing Claude command (output streaming to ${path.basename(outputFile)}.stdout.log)...`);

        const output = await this.executeClaudeCommand(claudeCmd, './', TEST_TIMEOUT, testInfo, outputFile, stepsFile, startTime);

        console.log(`   📋 Output sample: ${output.substring(0, 200).replace(/\n/g, '\\n')}...`);
        console.log(`   🔢 Output lines: ${output.split('\n').length}`);

        // Create final output data
        const finalOutputData = {
          timestamp: new Date(startTime).toISOString(),
          testType,
          testName: test.name,
          testCategory: test.category,
          command: claudeCmd,
          rawOutput: output,
          outputLength: output.length,
          endTime: new Date().toISOString()
        };
        fs.writeFileSync(outputFile, JSON.stringify(finalOutputData, null, 2));

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`✅ [${new Date().toLocaleTimeString()}] Completed ${testType} test for ${test.name} in ${duration.toFixed(1)}s`);

        const parsedOutput = this.parseOutput(output, useMcp, testType, test.name, test.category, startTime);

        fs.writeFileSync(stepsFile, JSON.stringify({
          timestamp: new Date(startTime).toISOString(),
          testType,
          testName: test.name,
          testCategory: test.category,
          prompt: test.prompt,
          stepData: parsedOutput.stepData,
          totalSteps: parsedOutput.totalSteps,
          toolCallsCount: parsedOutput.toolCalls ? parsedOutput.toolCalls.length : 0,
          toolResultsCount: parsedOutput.toolResults ? parsedOutput.toolResults.length : 0,
          parseError: parsedOutput.parseError,
          duration,
          toolsUsed: parsedOutput.toolsUsed,
          mcpServerStatus: parsedOutput.mcpServerStatus,
          finalUpdateTime: new Date().toISOString()
        }, null, 2));

        console.log(`✅ ${testType} test completed successfully`);
        console.log(`   Duration: ${duration.toFixed(1)}s`);
        console.log(`   Output: ${output.length} chars`);
        console.log(`   Steps: ${parsedOutput.totalSteps}`);
        console.log(`   Tools called: ${parsedOutput.totalToolCalls}`);
        console.log(`   Tools used: ${parsedOutput.toolsUsed ? parsedOutput.toolsUsed.join(', ') : 'none'}`);
        console.log(`   MCP Server: ${parsedOutput.mcpServerStatus || 'unknown'}`);

        this.logToolUsage(parsedOutput, useMcp);

        if (parsedOutput.parseError) {
          console.log(`   ⚠️  Parse warnings: ${parsedOutput.parseError}`);
        }

        // Hooks are automatically managed by the MCP server

        return {
          success: true,
          duration,
          outputLength: output.length,
          useMcp,
          attempt,
          timestamp: new Date().toISOString(),
          parsedOutput,
          totalSteps: parsedOutput.totalSteps,
          toolCallsCount: parsedOutput.totalToolCalls,
          toolResultsCount: parsedOutput.totalToolResults,
          toolsUsed: parsedOutput.toolsUsed,
          mcpServerStatus: parsedOutput.mcpServerStatus,
          outputFile,
          stepsFile
        };
      } catch (error) {
        lastError = error;
        console.error(`❌ Test attempt ${attempt} failed for ${test.name} (${testType}):`, error.message);
        if (error.stderr) console.error(`   stderr: ${error.stderr.substring(0, 300)}`);
        if (error.stdout) console.error(`   stdout: ${error.stdout.substring(0, 300)}`);
        if (error.code) console.error(`   exit code: ${error.code}`);

        if (this.shouldSkipRetry(error)) {
          console.error(`   Non-retryable error detected, stopping attempts`);
          break;
        }

        if (attempt < MAX_RETRIES) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`   Retrying in ${waitTime/1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await this.sleep(waitTime);
        }
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(`🔥 Final failure for ${test.name} (${useMcp ? 'mcp' : 'baseline'}) after ${MAX_RETRIES} attempts`);

    return {
      success: false,
      duration,
      outputLength: 0,
      error: lastError?.message || 'Unknown error',
      fullError: {
        message: lastError?.message,
        stderr: lastError?.stderr,
        stdout: lastError?.stdout,
        code: lastError?.code,
        command: command,
        workingDir: normalizedPath,
        toolsCount: allowedTools.split(',').length
      },
      useMcp,
      retries: MAX_RETRIES,
      timestamp: new Date().toISOString(),
      stderr: lastError?.stderr || '',
      stdout: lastError?.stdout || ''
    };
  }

  createIncrementalData(testType, test, timestamp) {
    return {
      timestamp: new Date(timestamp).toISOString(),
      testType,
      testName: test.name,
      testCategory: test.category,
      prompt: test.prompt,
      startTime: new Date().toISOString(),
      rawOutput: '',
      outputLength: 0,
      stepData: [],
      toolCalls: [],
      toolResults: [],
      toolsUsed: new Set(),
      mcpServerStatus: testType === 'mcp' ? 'unknown' : 'disabled',
      totalSteps: 0,
      totalToolCalls: 0,
      totalToolResults: 0,
      parseError: null
    };
  }

  parseOutput(output, useMcp, testType, testName, testCategory, startTime) {
    try {
      const lines = output.split('\n').filter(line => line.trim());
      let jsonLines = [];

      const potentialJsonLines = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(item => item);

      if (potentialJsonLines.length > 0) {
        jsonLines = potentialJsonLines;
        console.log(`   📄 Found ${jsonLines.length} JSON lines in stream`);
      } else {
        console.log(`   📄 No JSON lines found, output appears to be plain text (${output.length} chars)`);
        jsonLines = [{
          type: 'final_response',
          content: output,
          timestamp: new Date().toISOString()
        }];
      }

      const toolCalls = [];
      const toolResults = [];
      const toolsUsed = new Set();
      let mcpServerStatus = useMcp ? 'unknown' : 'disabled';
      let incrementalStepData = [];

      for (let i = 0; i < jsonLines.length; i++) {
        const item = jsonLines[i];

        this.processJsonItem(item, toolCalls, toolResults, toolsUsed, mcpServerStatus, useMcp, incrementalStepData);
      }

      return {
        rawOutput: output,
        jsonLines,
        stepData: incrementalStepData,
        totalSteps: incrementalStepData.length,
        toolCalls,
        toolResults,
        toolsUsed: Array.from(toolsUsed),
        mcpServerStatus,
        totalToolCalls: toolCalls.length,
        totalToolResults: toolResults.length,
        finalResponse: jsonLines[jsonLines.length - 1]
      };
    } catch (parseError) {
      return {
        rawOutput: output,
        parseError: parseError.message,
        stepData: [],
        totalSteps: 0,
        toolCalls: [],
        toolResults: [],
        toolsUsed: [],
        mcpServerStatus: 'parse_error',
        totalToolCalls: 0,
        totalToolResults: 0
      };
    }
  }

  processJsonItem(item, toolCalls, toolResults, toolsUsed, mcpServerStatus, useMcp, incrementalStepData) {
    if (item.type === 'assistant' && item.message && item.message.content) {
      item.message.content.forEach(content => {
        if (content.type === 'tool_use') {
          toolCalls.push({
            id: content.id,
            name: content.name,
            input: content.input
          });
          toolsUsed.add(content.name);

          if (content.name && content.name.startsWith('mcp__glootie__')) {
            console.log(`   🎯 MCP tool used: ${content.name}`);
          }
        }
      });
    }

    if (item.type === 'user' && item.message && item.message.content) {
      item.message.content.forEach(content => {
        if (content.tool_use_id && content.type === 'tool_result') {
          toolResults.push({
            tool_use_id: content.tool_use_id,
            content: content.content
          });
        }
      });
    }

    if (useMcp && item.type === 'system' && item.mcp_servers) {
      console.log(`   🔗 MCP Server status: ${item.mcp_servers.map(s => `${s.name}: ${s.status}`).join(', ')}`);
      if (item.mcp_servers && item.mcp_servers.length > 0) {
        mcpServerStatus = item.mcp_servers[0].status;
      }
    }

    if (useMcp && item.type === 'system' && item.message && item.message.includes('mcp_servers')) {
      try {
        const serverMatch = item.message.match(/"status":\s*"([^"]+)"/);
        if (serverMatch) {
          mcpServerStatus = serverMatch[1];
          console.log(`   🔗 MCP Server status found: ${mcpServerStatus}`);
        }
      } catch (e) {
      }
    }

    if (item.type === 'system' && item.tools) {
      console.log(`   🛠️ Available tools: ${item.tools.length} total`);
      const mcpTools = item.tools.filter(tool => tool.startsWith('mcp__glootie__'));
      if (mcpTools.length > 0 && useMcp) {
        console.log(`   🎯 MCP tools available: ${mcpTools.length}`);
        console.log(`   📋 Available MCP tools: ${mcpTools.join(', ')}`);
      }
    }

    const isStep = item.type === 'assistant' && item.message && item.message.content &&
                  item.message.content.some(content => content.type === 'tool_use') ||
                  item.type === 'user' && item.message && item.message.content &&
                  item.message.content.some(content => content.type === 'tool_result') ||
                  item.type === 'system' && item.subtype === 'init' ||
                  item.type === 'step' || item.step;

    if (isStep) {
      incrementalStepData.push(item);
    }
  }

  logToolUsage(parsedOutput, useMcp) {
    const mcpToolsUsed = parsedOutput.toolsUsed ? parsedOutput.toolsUsed.filter(tool => tool.startsWith('mcp__glootie__')) : [];
    const standardToolsUsed = parsedOutput.toolsUsed ? parsedOutput.toolsUsed.filter(tool => !tool.startsWith('mcp__glootie__')) : [];

    if (useMcp) {
      console.log(`   🎯 MCP tools used: ${mcpToolsUsed.length ? mcpToolsUsed.join(', ') : 'none'}`);
      console.log(`   📋 Standard tools used: ${standardToolsUsed.length ? standardToolsUsed.join(', ') : 'none'}`);
      console.log(`   📊 MCP vs Standard ratio: ${mcpToolsUsed.length}:${standardToolsUsed.length}`);
    } else {
      console.log(`   📋 Standard tools only: ${standardToolsUsed.length ? standardToolsUsed.join(', ') : 'none'}`);
    }
  }

  writeIncrementalResults(newOutput, outputFile, stepsFile, testInfo, command, startTime, fullStdout) {
    try {
      const testType = testInfo.testType; // Extract testType from testInfo

      // Parse the latest output chunk for JSON lines
      const lines = newOutput.split('\n').filter(line => line.trim());
      const jsonLines = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          jsonLines.push(parsed);
        } catch (e) {
          // Skip non-JSON lines
        }
      }

      if (jsonLines.length === 0) return; // No new JSON data to process

      // Update output file with current state
      const currentTime = Date.now();
      const duration = (currentTime - startTime) / 1000;

      const incrementalOutputData = {
        timestamp: new Date(startTime).toISOString(),
        testType,
        testName: testInfo.testName || 'Unknown',
        testCategory: testInfo.testCategory || 'Unknown',
        command: command,
        startTime: new Date(startTime).toISOString(),
        lastUpdate: new Date().toISOString(),
        rawOutput: fullStdout,
        outputLength: fullStdout.length,
        duration,
        status: 'running'
      };

      fs.writeFileSync(outputFile, JSON.stringify(incrementalOutputData, null, 2));

      // Parse and update steps file
      const parsedOutput = this.parseOutput(fullStdout, testType === 'mcp', testType, testInfo.testName || 'Unknown', testInfo.testCategory || 'Unknown', startTime);

      const incrementalStepsData = {
        timestamp: new Date(startTime).toISOString(),
        testType,
        testName: testInfo.testName || 'Unknown',
        testCategory: testInfo.testCategory || 'Unknown',
        command: command,
        lastUpdate: new Date().toISOString(),
        stepData: parsedOutput.stepData || [],
        totalSteps: parsedOutput.totalSteps || 0,
        toolCallsCount: parsedOutput.toolCalls ? parsedOutput.toolCalls.length : 0,
        toolResultsCount: parsedOutput.toolResults ? parsedOutput.toolResults.length : 0,
        toolsUsed: parsedOutput.toolsUsed || [],
        mcpServerStatus: parsedOutput.mcpServerStatus || 'unknown',
        duration,
        status: 'running',
        parseError: parsedOutput.parseError
      };

      fs.writeFileSync(stepsFile, JSON.stringify(incrementalStepsData, null, 2));

      // Log significant updates
      if (jsonLines.some(line => line.type === 'assistant' && line.message?.content?.some(c => c.type === 'tool_use'))) {
        console.log(`   📝 [${new Date().toLocaleTimeString()}] Updated results: ${parsedOutput.totalSteps} steps, ${parsedOutput.toolsUsed.length} tools used`);
      }

    } catch (error) {
      // Don't throw, just log to avoid breaking the main test flow
      console.error(`   ⚠️ Incremental write error: ${error.message}`);
    }
  }

  markTestStatus(outputFile, stepsFile, status, startTime, stdout) {
    try {
      const duration = (Date.now() - startTime) / 1000;

      // Update output file with final status
      if (fs.existsSync(outputFile)) {
        const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        outputData.status = status;
        outputData.duration = duration;
        outputData.lastUpdate = new Date().toISOString();
        outputData.finalOutput = stdout;
        fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      }

      // Update steps file with final status
      if (fs.existsSync(stepsFile)) {
        const stepsData = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
        stepsData.status = status;
        stepsData.duration = duration;
        stepsData.lastUpdate = new Date().toISOString();
        fs.writeFileSync(stepsFile, JSON.stringify(stepsData, null, 2));
      }

      console.log(`   📝 Marked test as '${status}' after ${duration.toFixed(1)}s`);
    } catch (error) {
      console.error(`   ⚠️ Error marking test status: ${error.message}`);
    }
  }

  shouldSkipRetry(error) {
    const nonRetryableErrors = ['ENOENT', 'EACCES', 'EPERM', 'Command failed'];
    return nonRetryableErrors.some(code => error.message.includes(code));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  displayPerformanceSummary(results) {
    console.log('\n📊 Performance Summary');
    const total = results.tests.length;
    const successful = results.tests.filter(t => t.baseline.success && t.optimized.success).length;
    const failed = total - successful;

    console.log(`Average Improvement: ${results.avgImprovement}% | Completed: ${total} | Successful: ${successful} | Failed: ${failed}`);

    if (successful === 0) {
      console.log('❌ No tests completed successfully - check error logs above');
    } else if (failed > 0) {
      console.log(`⚠️  ${failed}/${total} tests failed - performance metrics may be incomplete`);
    }

    if (parseFloat(results.avgImprovement) > 0) {
      console.log(`🎯 Success: ${results.avgImprovement}% average improvement across ${successful} successful tests`);
    } else if (successful > 0) {
      console.log(`📉 Performance degraded on average: ${results.avgImprovement}% across ${successful} tests`);
    }

    console.log('\n📋 Test Results Breakdown:');
    results.tests.forEach(test => {
      const baselineStatus = test.baseline.success ? '✅' : '❌';
      const optimizedStatus = test.optimized.success ? '✅' : '❌';
      console.log(`  ${test.name}:`);
      console.log(`    Baseline: ${baselineStatus} ${test.baseline.duration.toFixed(1)}s`);
      console.log(`    Optimized: ${optimizedStatus} ${test.optimized.duration.toFixed(1)}s`);
      console.log(`    Improvement: ${test.improvement}%`);
    });
  }

  generatePerformanceSummary(performanceResults) {
    let summary = 'PERFORMANCE TEST RESULTS SUMMARY:\n\n';

    summary += `Average Improvement: ${performanceResults.avgImprovement}%\n`;
    summary += `Total Tests: ${performanceResults.tests.length}\n`;

    const successful = performanceResults.tests.filter(t => t.baseline.success && t.optimized.success).length;
    const failed = performanceResults.tests.length - successful;
    summary += `Successful Tests: ${successful}\n`;
    summary += `Failed Tests: ${failed}\n\n`;

    summary += 'DETAILED TEST RESULTS:\n';
    performanceResults.tests.forEach(test => {
      summary += `\n${test.name}:\n`;
      summary += `  Baseline: ${test.baseline.success ? test.baseline.duration.toFixed(1) + 's' : 'FAILED'}\n`;
      summary += `  MCP: ${test.optimized.success ? test.optimized.duration.toFixed(1) + 's' : 'FAILED'}\n`;
      summary += `  Improvement: ${test.improvement}%\n`;
    });

    return summary;
  }

  async generateUserReview(testDir, performanceResults) {
    try {
      console.log('Generating user review...');
      const performanceSummary = this.generatePerformanceSummary(performanceResults);
      const reviewCmd = `claude -p "I need you to analyze the actual experiences of the coding agents during the MCP Glootie v3.1.4 benchmarking test by examining their step outputs and history. Please base your analysis on a complete examination of the saved step files to find out what went right and what went wrong.

CRITICAL: You must examine the actual step files in the results/ directory:
- results/claude-steps-*.json files contain the actual step-by-step execution data
- results/claude-output-*.json files contain the raw Claude outputs
- evaluate the difference between the work done on each project, the baseline vs the mcp, in their optimized-test directories
- The step files show tool calls, results, and execution patterns
- Compare baseline vs MCP tool usage patterns
- Additional time spent or things run is fine, even if it didnt help us here, if it would help us in more complicated situations

Wall clock times:
${performanceSummary}

Analysis Requirements:
Use the glootie tools to improve your analysis performance
Use git to check which files have changed in each projects optimized-test folder and compare the changes between the baseline and the mcp test

Focus Areas:
- What the step outputs reveal about tool reliability and coding skill
- Which tools actually helped agents accomplish tasks vs which created friction
- Real-world experience of agents using these tools for development tasks
- Pay close attention to any chekovs guns that threw off the agents
- We're looking for improved intelligent and predictive behaviors and more truth-grounded code.
- Slower is better if it improved results or testing was more thorough
- Additional time spent or things run is fine, even if it didnt help us here, if it would help us in more complicated situations

results is in ./results, with all the steps taken by agents

Write an honest END_USER_REVIEW.md from the perspective of the agents who actually ran the tests. Base it entirely on the step data and outputs you examine. Be comprehensive and tell the real story of what happened during testing, not theoretical analysis or any drama or theatrics, just their story as the agents who had to do the work. It should be in natural language and it should be a review, not a report. Be as explicit and detailed about the experience as possible." --add-dir "./" --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell" --verbose`;

      const reviewOutput = execSync(reviewCmd, {
        cwd: './',
        timeout: TEST_TIMEOUT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ END_USER_REVIEW.md generated', reviewOutput);
    } catch (error) {
      console.error('❌ Failed to generate user review:', error.message);
      throw error;
    }
  }

  async generateSuggestions(testDir, performanceResults) {
    try {
      console.log('Generating suggestions...');
      const performanceSummary = this.generatePerformanceSummary(performanceResults);
      const suggestionsCmd = `claude -p "I need you to analyze the actual experiences of coding agents using MCP Glootie v3.1.4 by examining their step history and outputs to write detailed SUGGESTIONS.md. Please base your analysis entirely on the saved step files to understand what the agents really experienced.

CRITICAL: You must examine the actual step files in the results/ directory:
- results/claude-steps-*.json files contain the real step-by-step execution data
- results/claude-output-*.json files contain the raw Claude outputs
- These files show what actually happened during testing

WALL CLOCK TIMES:
${performanceSummary}

Analysis Requirements:
Use the glootie tools to improve your analysis capabilities, remember to begin first, ths is a complex task

Also pay close attention END_USER_REVIEW.md for a prepared work on the same subject, but dont let it throw you off your findings, it might be wrong, you're providing a second opinion

Focus Areas:
- What friction points did agents encounter when using specific tools?
- Where did agents succeed or fail in accomplishing their assigned tasks?
- Which tools actually improved the agent experience vs which created new problems?
- What do the actual step outputs reveal about tool reliability and usability?
- We prefer more thorough, verified, well thought out processes and signs of intelligent behavior and prediction of iseues.
- Slower is better if it improved results or testing was more thorough

Pay close attention to any chekovs guns that threw off the agents
results is in ./results, with all the steps taken by agents

Write SUGGESTIONS.md as a comprehensive, no-nonsense technical improvement document that specifically addresses the pain points and successes you observed in the actual agent experiences. Provide concrete, actionable suggestions for making the tooling better based on what the agents actually went through. Focus on practical improvements rather than theoretical benefits, based entirely on the step data analysis. Use lateral thinking to expose potential changes that havent previously been ideantified. Use critical thinking to get rid of any ideas not worth exploring. WGFY all the different opportunities for change to find the best ones." --add-dir "./" --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell" --verbose`;

      const suggestionsOutput = execSync(suggestionsCmd, {
        cwd: './',
        timeout: TEST_TIMEOUT,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ SUGGESTIONS.md generated', suggestionsOutput);
    } catch (error) {
      console.error('❌ Failed to generate suggestions:', error.message);
      throw error;
    }
  }

  async cleanupTestDirectories(testDir) {
    console.log('🧹 Cleaning up test directories...');

    const baseTestDir = testDir;
    const testDirs = [baseTestDir];

    try {
      const parentDir = path.dirname(baseTestDir);
      const baseName = path.basename(baseTestDir);
      const allDirs = fs.readdirSync(parentDir);
      const relatedDirs = allDirs.filter(dir => dir.startsWith(baseName));

      relatedDirs.forEach(dir => {
        const fullPath = path.join(parentDir, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          testDirs.push(fullPath);
        }
      });
    } catch (error) {
      console.warn('Warning: Could not find all test directories:', error.message);
    }

    for (const dir of testDirs) {
      await this.cleanupTestDirectory(dir);
    }
  }

  async cleanupTestDirectory(dir) {
    try {
      if (fs.existsSync(dir)) {
        const stepFiles = fs.readdirSync(dir).filter(file =>
          file.startsWith('claude-steps-') || file.startsWith('claude-output-')
        );

        if (stepFiles.length > 0) {
          console.log(`📋 Copying ${stepFiles.length} step files from ${path.basename(dir)} to results directory...`);
          for (const file of stepFiles) {
            const src = path.join(dir, file);
            const dest = path.join(RESULTS_DIR, file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not copy step files from ${dir}:`, error.message);
    }

    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Test directory ${path.basename(dir)} cleaned up successfully`);
      }
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up test directory ${dir}:`, cleanupError.message);
      try {
        execSync(`rm -rf "${dir}"`, { stdio: 'ignore' });
        console.log(`✅ Test directory ${path.basename(dir)} force cleaned up successfully`);
      } catch (e) {
        console.warn(`Warning: Final cleanup also failed for ${dir}:`, e.message);
      }
    }
  }
}

const test = new OptimizedMCPTest();
test.runOptimizedTest().catch(console.error);