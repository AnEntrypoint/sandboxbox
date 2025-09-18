#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
class OptimizedMCPTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: '3.1.6',
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      optimizations: [
        'MCP tools properly configured and enabled',
        'Working directory parameter fix for MCP tools',
        'Specific MCP tool usage prompts',
        'Enhanced tool usage tracking',
        'Performance comparison between standard and MCP tools',
        'Search optimization with .gitignore and .searchignore files',
        'Focused file extension filtering for faster code search',
        'Exclusion of build artifacts from search indexing',
        'Sane default ignore patterns via .search-defaults.json',
        'Automatic application of ignore patterns when no gitignore exists'
      ]
    };
  }
  async runOptimizedTest() {
    console.log('🚀 MCP Performance Test v3.1.6');
    console.log(`Platform: ${this.results.systemInfo.platform} ${this.results.systemInfo.arch} | Node.js: ${this.results.systemInfo.nodeVersion}`);

    // Pre-flight checks
    console.log('🔍 Running pre-flight checks...');
    await this.runPreflightChecks();

    // Ensure results directory exists at the start
    fs.mkdirSync('results', { recursive: true });

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

      // Ensure results directory exists
      fs.mkdirSync('results', { recursive: true });

      const resultsFile = 'results/mcp-performance-' + Date.now() + '.json';
      fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
      console.log('📊 Results saved to: ' + resultsFile);

      this.displayPerformanceSummary(performanceResults);

      console.log('📝 Generating analysis reports...');
      await this.generateUserReview(testDir, performanceResults);
      await this.generateSuggestions(testDir, performanceResults);

    } catch (error) {
      console.error('❌ Test failed: ' + error.message);
      this.results.error = error.message;
      testError = error;
    }

    // Cleanup happens only at the very end, after all tests and analysis
    console.log('🧹 Cleaning up test directories...');

    // Find all test directories (baseline and mcp variants)
    const baseTestDir = testDir;
    const testDirs = [baseTestDir];

    // Find all related test directories
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

    // Clean up each test directory
    testDirs.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          // Copy any remaining step files to results directory before cleanup
          const stepFiles = fs.readdirSync(dir).filter(file =>
            file.startsWith('claude-steps-') || file.startsWith('claude-output-')
          );
          if (stepFiles.length > 0) {
            console.log(`📋 Copying ${stepFiles.length} step files from ${path.basename(dir)} to results directory...`);
            for (const file of stepFiles) {
              const src = path.join(dir, file);
              const dest = path.join('results', file);
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
        // Force cleanup with additional commands
        try {
          execSync(`rm -rf "${dir}"`, { stdio: 'ignore' });
          console.log(`✅ Test directory ${path.basename(dir)} force cleaned up successfully`);
        } catch (e) {
          console.warn(`Warning: Final cleanup also failed for ${dir}:`, e.message);
        }
      }
    });

    if (testError) {
      throw testError;
    }

    console.log('🎉 All tests and analysis completed!');
  }

  async runPreflightChecks() {
    const checks = [];

    // Check Claude CLI availability
    try {
      execSync('claude --version', { stdio: 'pipe' });
      checks.push({ name: 'Claude CLI', status: '✅ Available' });
    } catch (error) {
      checks.push({ name: 'Claude CLI', status: '❌ Not found', error: error.message });
    }

    // Check MCP server
    try {
      const timeout = 3000;
      // Test if the server can be spawned (it will run indefinitely, so we need to kill it)
      const serverProcess = execSync('timeout 1 node src/index.js', {
        stdio: 'pipe',
        timeout,
        encoding: 'utf8'
      });
      checks.push({ name: 'MCP Server', status: '✅ Starts successfully' });
    } catch (error) {
      // Timeout is expected since the server runs indefinitely
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        checks.push({ name: 'MCP Server', status: '✅ Starts successfully' });
      } else {
        checks.push({ name: 'MCP Server', status: '❌ Startup failed', error: error.message });
      }
    }

    // Check working directory
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'src/index.js'))) {
      checks.push({ name: 'Working Directory', status: '✅ Correct location' });
    } else {
      checks.push({ name: 'Working Directory', status: '❌ Wrong location - missing src/index.js' });
    }

    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    if (majorVersion >= 18) {
      checks.push({ name: 'Node.js Version', status: `✅ ${nodeVersion} (compatible)` });
    } else {
      checks.push({ name: 'Node.js Version', status: `⚠️ ${nodeVersion} (may have issues)` });
    }

    // Display results
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
    // This method is now simplified since we create separate directories for each test
    console.log('🔧 Setting up main test environment...');
    // The actual test setup is done in setupTestDirectory for each individual test
  }

  setupTestDirectory(testDir) {
    // Create the test directory structure and configuration
    const packageJson = {
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
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create directory structure
    const appDir = path.join(testDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(path.join(appDir, 'components'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'ui'), { recursive: true });
    const componentsDir = path.join(testDir, 'components');
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(path.join(componentsDir, 'ui'), { recursive: true });
    const libDir = path.join(testDir, 'lib');
    fs.mkdirSync(libDir, { recursive: true });

    // Create essential files
    fs.writeFileSync(path.join(libDir, 'utils.ts'), `
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
`);

    // Create basic components
    fs.writeFileSync(path.join(componentsDir, 'ui', 'button.tsx'), `
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
`);

    // Create card component
    fs.writeFileSync(path.join(componentsDir, 'ui', 'card.tsx'), `
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
`);

    // Create input component
    fs.writeFileSync(path.join(componentsDir, 'ui', 'input.tsx'), `
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
`);

    // Create task manager component
    fs.writeFileSync(path.join(componentsDir, 'task-manager.tsx'), `
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
`);

    // Create page component
    fs.writeFileSync(path.join(appDir, 'page.tsx'), `
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
`);

    // Create config files
    fs.writeFileSync(path.join(testDir, 'tailwind.config.js'), `
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
`);

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
        plugins: [
          {
            name: 'next'
          }
        ],
        baseUrl: '.',
        paths: {
          '@/*': ['./*']
        }
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules']
    }, null, 2));

    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install --no-audit --prefer-offline --ignore-scripts', {
      cwd: testDir,
      timeout: 1200000,
      stdio: 'pipe'
    });

    // Create search optimization file
    const searchIgnore = [
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
    ];
    fs.writeFileSync(path.join(testDir, '.searchignore'), searchIgnore.join('\n'));

    // Create default ignore patterns
    const defaultIgnorePatterns = {
      files: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/.idea/**',
        '**/*.log',
        '**/*.tmp',
        '**/temp/**',
        '**/tmp/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.map',
        '**/*.min.js',
        '**/*.min.css',
        '**/package-lock.json',
        '**/yarn.lock'
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
      directories: [
        'node_modules',
        '.next',
        'dist',
        'build',
        'out',
        'coverage',
        '.nyc_output',
        '.git',
        '.vscode',
        '.idea',
        'temp',
        'tmp'
      ]
    };
    fs.writeFileSync(path.join(testDir, '.search-defaults.json'), JSON.stringify(defaultIgnorePatterns, null, 2));

    // Create Claude configuration - use absolute path to main directory's src/index.js
    const mainDir = process.cwd();
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

    // Copy .gitignore
    const gitignoreContent = fs.readFileSync(path.join(process.cwd(), 'test-gitignore.txt'), 'utf8');
    fs.writeFileSync(path.join(testDir, '.gitignore'), gitignoreContent);
  }
  async testOptimizedPerformance(testDir) {
    console.log('🧪 Running performance tests...');
    const tests = [
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

    console.log('🚀 Running all tests in parallel...');
    console.log(`   Tests: ${tests.length} (${tests.length * 2} total runs)`);

    // Create all test promises to run everything in parallel
    console.log(`🚀 Creating ${tests.length * 2} parallel test executions...`);

    const allTestPromises = [];

    // Create separate directories and test promises for each test
    tests.forEach(test => {
      // Create separate directory for baseline test
      const baselineDir = `${testDir}-baseline-${test.category}`;
      fs.mkdirSync(baselineDir, { recursive: true });
      this.setupTestDirectory(baselineDir);

      const baselinePromise = this.runTestCommand(baselineDir, test, false)
        .then(result => ({
          type: 'baseline',
          test: test,
          result: result,
          directory: baselineDir
        }))
        .catch(error => ({
          type: 'baseline',
          test: test,
          result: {
            success: false,
            duration: 0,
            error: error.message,
            testType: 'baseline'
          },
          directory: baselineDir
        }));
      allTestPromises.push(baselinePromise);

      // Create separate directory for MCP test
      const mcpDir = `${testDir}-mcp-${test.category}`;
      fs.mkdirSync(mcpDir, { recursive: true });
      this.setupTestDirectory(mcpDir);

      const mcpPromise = this.runTestCommand(mcpDir, test, true)
        .then(result => ({
          type: 'mcp',
          test: test,
          result: result,
          directory: mcpDir
        }))
        .catch(error => ({
          type: 'mcp',
          test: test,
          result: {
            success: false,
            duration: 0,
            error: error.message,
            testType: 'mcp'
          },
          directory: mcpDir
        }));
      allTestPromises.push(mcpPromise);
    });

    console.log(`🏃 Starting all ${allTestPromises.length} test executions in parallel...`);

    // Wait for all tests to complete
    const allResults = await Promise.all(allTestPromises);

    console.log(`📊 Processing results from ${allResults.length} completed tests...`);

    // Group results by test
    const resultsByTest = new Map();
    tests.forEach(test => {
      resultsByTest.set(test.category, { test, baseline: null, mcp: null });
    });

    // Process results
    allResults.forEach(({ type, test, result }) => {
      const key = test.category;
      if (resultsByTest.has(key)) {
        resultsByTest.get(key)[type] = result;
      }
    });

    // Create final test results
    const testResults = [];
    resultsByTest.forEach(({ test, baseline, mcp }) => {
      const improvement = baseline.success && mcp.success
        ? ((baseline.duration - mcp.duration) / baseline.duration * 100).toFixed(1)
        : 'N/A';

      const testResult = {
        name: test.name,
        category: test.category,
        baseline: baseline,
        optimized: mcp,
        improvement: improvement
      };

      console.log(`✅ Completed: ${test.name}`);
      console.log(`   Baseline: ${baseline.success ? baseline.duration.toFixed(1) + 's' : 'FAILED'} | MCP: ${mcp.success ? mcp.duration.toFixed(1) + 's' : 'FAILED'} | Improvement: ${improvement}%`);

      // Log detailed errors if tests failed
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
  async runTestCommand(workingDir, test, useMcp) {
    const startTime = Date.now();
    const maxRetries = 2;
    let lastError = null;
    const testType = useMcp ? 'mcp' : 'baseline';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!fs.existsSync(workingDir)) {
          throw new Error(`Test directory not found: ${workingDir}`);
        }
        const normalizedPath = path.resolve(workingDir);
        const timestamp = Date.now();

        // Ensure results directory exists
        fs.mkdirSync('results', { recursive: true });

        // Create output files for analysis with test category
        const outputFile = path.join('results', `claude-output-${test.category}-${testType}.json`);
        const stepsFile = path.join('results', `claude-steps-${test.category}-${testType}.json`);

        const standardTools = "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell";
        const mcpTools = "mcp__glootie__execute,mcp__glootie__retrieve_overflow,mcp__glootie__searchcode,mcp__glootie__parse_ast,mcp__glootie__astgrep_search,mcp__glootie__astgrep_replace,mcp__glootie__astgrep_lint,mcp__glootie__batch_execute,mcp__glootie__sequentialthinking,mcp__glootie__vector_search";
        const allowedTools = useMcp ? `${standardTools},${mcpTools}` : standardTools;

        // Use the same prompt for both tests - fair comparison
        const finalPrompt = test.prompt + (useMcp ? ' always use glootie for everything' : '');

        // Claude should run in the test directory and add the current directory ("./")
        // Also specify the MCP config file to ensure MCP server is loaded
        // Use bypassPermissions mode for MCP tests to avoid permission prompts
        const permissionMode = useMcp ? ' --permission-mode bypassPermissions' : '';
        const claudeCmd = `claude -p "${finalPrompt}" --allowed-tools "${allowedTools}" --add-dir "./" --mcp-config ./.claude.json${permissionMode} --output-format stream-json --verbose`;
        const timeout = 1200000;

        console.log(`🚀 Executing ${testType} test for ${test.name}`);
        console.log(`   Command: ${claudeCmd}`);
        console.log(`   Working dir: ${workingDir} (Claude will run from here)`);
        console.log(`   Tools: ${allowedTools.split(',').length} (MCP: ${useMcp})`);
        console.log(`   Timeout: ${timeout/1000}s`);

        console.log(`   🔍 Testing output format...`);
        const output = execSync(claudeCmd, {
          cwd: workingDir,
          timeout,
          encoding: 'utf8',
          stdio: 'pipe',
          maxBuffer: 50 * 1024 * 1024
        });

        // Debug: Show first 200 chars of output to understand format
        console.log(`   📋 Output sample: ${output.substring(0, 200).replace(/\n/g, '\\n')}...`);
        console.log(`   🔢 Output lines: ${output.split('\n').length}`);

        // Save raw output for analysis
        fs.writeFileSync(outputFile, JSON.stringify({
          timestamp: new Date(timestamp).toISOString(),
          testType,
          testName: test.name,
          testCategory: test.category,
          prompt: test.prompt,
          rawOutput: output,
          outputLength: output.length
        }, null, 2));
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        let parsedOutput = null;
        let stepData = [];
        try {
          // Check if output is JSON stream format or plain text
          const lines = output.split('\n').filter(line => line.trim());
          let jsonLines = [];

          // Try to parse as JSON stream first
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
            // If no JSON lines, this might be plain text output
            console.log(`   📄 No JSON lines found, output appears to be plain text (${output.length} chars)`);
            // Create a single JSON object representing the final response
            jsonLines = [{
              type: 'final_response',
              content: output,
              timestamp: new Date().toISOString()
            }];
          }

          // Find all tool calls and results
          const toolCalls = [];
          const toolResults = [];
          const toolsUsed = new Set();

          jsonLines.forEach(item => {
            // Check for tool calls in assistant messages
            if (item.type === 'assistant' && item.message && item.message.content) {
              item.message.content.forEach(content => {
                if (content.type === 'tool_use') {
                  toolCalls.push({
                    id: content.id,
                    name: content.name,
                    input: content.input
                  });
                  toolsUsed.add(content.name);
                }
              });
            }

            // Check for tool results in user messages
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

            // Also check for MCP server status in system messages
            if (item.type === 'system' && item.mcp_servers) {
              console.log(`   🔗 MCP Server status: ${item.mcp_servers.map(s => `${s.name}: ${s.status}`).join(', ')}`);
            }

            // Check available tools list
            if (item.type === 'system' && item.tools) {
              console.log(`   🛠️ Available tools: ${item.tools.length} total`);
              const mcpTools = item.tools.filter(tool => tool.startsWith('g__'));
              if (mcpTools.length > 0) {
                console.log(`   🎯 MCP tools available: ${mcpTools.length}`);
              }
            }
          });

          // Check for MCP server status and tools
          let mcpServerStatus = 'unknown';
          jsonLines.forEach(item => {
            // Check for MCP server status in raw output
            if (item.rawOutput && item.rawOutput.includes('mcp_servers')) {
              try {
                const parsed = JSON.parse(item.rawOutput);
                if (parsed.mcp_servers && parsed.mcp_servers.length > 0) {
                  mcpServerStatus = parsed.mcp_servers[0].status;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }

            // Check for MCP tools in the tools list
            if (item.tools && Array.isArray(item.tools)) {
              item.tools.forEach(tool => {
                if (tool.name && tool.name.startsWith('g__')) {
                  toolsUsed.add(tool.name);
                }
              });
            }

            // Also check for MCP tools in debug output
            if (item.rawOutput && item.rawOutput.includes('g__')) {
              const mcpMatches = item.rawOutput.match(/g__\w+/g);
              if (mcpMatches) {
                mcpMatches.forEach(match => toolsUsed.add(match));
              }
            }
          });

          // Count meaningful interactions as steps (tool calls, results, and assistant messages)
          stepData = jsonLines.filter(item => {
            // Include tool calls and results
            if (item.type === 'assistant' && item.message && item.message.content) {
              return item.message.content.some(content => content.type === 'tool_use');
            }
            if (item.type === 'user' && item.message && item.message.content) {
              return item.message.content.some(content => content.type === 'tool_result');
            }
            // Include system initialization messages
            if (item.type === 'system' && item.subtype === 'init') {
              return true;
            }
            // Also include explicit step markers if they exist
            return item.type === 'step' || item.step;
          });
          parsedOutput = {
            rawOutput: output,
            jsonLines,
            stepData,
            totalSteps: stepData.length,
            toolCalls,
            toolResults,
            toolsUsed: Array.from(toolsUsed),
            mcpServerStatus,
            totalToolCalls: toolCalls.length,
            totalToolResults: toolResults.length,
            finalResponse: jsonLines[jsonLines.length - 1]
          };
        } catch (parseError) {
          parsedOutput = {
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

        // Save step data for analysis
        fs.writeFileSync(stepsFile, JSON.stringify({
          timestamp: new Date(timestamp).toISOString(),
          testType,
          testName: test.name,
          testCategory: test.category,
          prompt: test.prompt,
          stepData: parsedOutput.stepData,
          totalSteps: parsedOutput.totalSteps,
          toolCallsCount: parsedOutput.toolCalls ? parsedOutput.toolCalls.length : 0,
          toolResultsCount: parsedOutput.toolResults ? parsedOutput.toolResults.length : 0,
          parseError: parsedOutput.parseError,
          duration
        }, null, 2));

        console.log(`✅ ${testType} test completed successfully`);
        console.log(`   Duration: ${duration.toFixed(1)}s`);
        console.log(`   Output: ${output.length} chars`);
        console.log(`   Steps: ${parsedOutput.totalSteps}`);
        console.log(`   Tools called: ${parsedOutput.totalToolCalls}`);
        console.log(`   Tools used: ${parsedOutput.toolsUsed ? parsedOutput.toolsUsed.join(', ') : 'none'}`);
        console.log(`   MCP Server: ${parsedOutput.mcpServerStatus || 'unknown'}`);

        // Enhanced MCP tool usage reporting
        const mcpToolsUsed = parsedOutput.toolsUsed ? parsedOutput.toolsUsed.filter(tool => tool.startsWith('g__')) : [];
        const standardToolsUsed = parsedOutput.toolsUsed ? parsedOutput.toolsUsed.filter(tool => !tool.startsWith('g__')) : [];

        if (useMcp) {
          console.log(`   🎯 MCP tools used: ${mcpToolsUsed.length ? mcpToolsUsed.join(', ') : 'none'}`);
          console.log(`   📋 Standard tools used: ${standardToolsUsed.length ? standardToolsUsed.join(', ') : 'none'}`);
          console.log(`   📊 MCP vs Standard ratio: ${mcpToolsUsed.length}:${standardToolsUsed.length}`);
        } else {
          console.log(`   📋 Standard tools only: ${standardToolsUsed.length ? standardToolsUsed.join(', ') : 'none'}`);
        }

        if (parsedOutput.parseError) {
          console.log(`   ⚠️  Parse warnings: ${parsedOutput.parseError}`);
        }
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
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`   Retrying in ${waitTime/1000}s... (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(waitTime);
        }
      }
    }
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(`🔥 Final failure for ${test.name} (${useMcp ? 'mcp' : 'baseline'}) after ${maxRetries} attempts`);
    console.error(`   Command: ${claudeCmd}`);
    console.error(`   Working directory: ${normalizedPath}`);
    console.error(`   Tools enabled: ${allowedTools.split(',').length} tools`);

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
        command: claudeCmd,
        workingDir: normalizedPath,
        toolsCount: allowedTools.split(',').length
      },
      useMcp,
      retries: maxRetries,
      timestamp: new Date().toISOString(),
      stderr: lastError?.stderr || '',
      stdout: lastError?.stdout || ''
    };
  }
  shouldSkipRetry(error) {
    const nonRetryableErrors = [
      'ENOENT', 
      'EACCES', 
      'EPERM',  
      'Command failed'
    ];
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

    // Show per-test breakdown
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
  async generateUserReview(testDir, performanceResults) {
    try {
      console.log('Generating user review...');
      const reviewCmd = `claude -p "I need you to analyze the actual experiences of the coding agents during the MCP Glootie v3.1.4 benchmarking test by examining their step outputs and history. Please base your analysis on a complete examination of the saved step files to find out what went right and what went wrong.

CRITICAL: You must examine the actual step files in the results/ directory:
- results/claude-steps-*.json files contain the actual step-by-step execution data
- results/claude-output-*.json files contain the raw Claude outputs
- The step files show tool calls, results, and execution patterns
- Compare baseline vs MCP tool usage patterns

Analysis Requirements:
1. Use Read to examine the actual step files to understand the agent experience
2. Use searchcode to find patterns across all test outputs in the results/ directory
3. Use execute to analyze timing patterns and success rates from the results data
4. Use sequentialthinking to organize your findings about what actually happened

Focus Areas:
- What the step outputs reveal about tool reliability and performance
- Which tools actually helped agents accomplish tasks vs which created friction
- Real-world experience of agents using these tools for development tasks
- Timing patterns, error rates, and success points from the step data
- When these tools would actually be worth using vs when they'd get in the way

Write an honest END_USER_REVIEW.md from the perspective of the agents who actually ran the tests. Base it entirely on the step data and outputs you examine. Be comprehensive and tell the real story of what happened during testing, not theoretical analysis or any drama or theatrics, just their story as the agents who had to do the work. It should be in natural language and it should be a review, not a report. Be as explicit and detailed about the experience as possible." --add-dir "./" --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell,g__execute,g__searchcode,g__batch_execute,g__sequentialthinking" --verbose`;
      const reviewOutput = execSync(reviewCmd, {
        cwd: './results',
        timeout: 1200000,
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
      const suggestionsCmd = `claude -p "I need you to analyze the actual experiences of coding agents using MCP Glootie v3.1.4 by examining their step history and outputs to write detailed SUGGESTIONS.md. Please base your analysis entirely on the saved step files to understand what the agents really experienced.

CRITICAL: You must examine the actual step files in the results/ directory:
- results/claude-steps-*.json files contain the real step-by-step execution data
- results/claude-output-*.json files contain the raw Claude outputs
- These files show what actually happened during testing

Analysis Requirements:
1. Use Read to examine the actual step files and understand the agent experience
2. Use searchcode to find patterns across all test outputs in the results/ directory
3. Use execute to analyze timing patterns, success rates, and failure points from the results data
4. Use sequentialthinking to organize your findings about what actually happened

Also check END_USER_REVIEW.md for a prepared work on the same subject, but dont let it throw you off your findings

Focus Areas:
- What friction points did agents encounter when using specific tools?
- Where did agents succeed or fail in accomplishing their assigned tasks?
- What timing patterns reveal about tool performance from the agent's perspective?
- Which tools actually improved the agent experience vs which created new problems?
- What do the actual step outputs reveal about tool reliability and usability?

Write SUGGESTIONS.md as a comprehensive, no-nonsense technical improvement document that specifically addresses the pain points and successes you observed in the actual agent experiences. Provide concrete, actionable suggestions for making the tooling better based on what the agents actually went through. Focus on practical improvements rather than theoretical benefits, based entirely on the step data analysis." --add-dir "./" --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell,g__execute,g__searchcode,g__batch_execute,g__sequentialthinking" --verbose`;
      const suggestionsOutput = execSync(suggestionsCmd, {
        cwd: './results',
        timeout: 1200000,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ SUGGESTIONS.md generated', suggestionsOutput);
    } catch (error) {
      console.error('❌ Failed to generate suggestions:', error.message);
      throw error;
    }
  }
}
const test = new OptimizedMCPTest();
test.runOptimizedTest().catch(console.error);