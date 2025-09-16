#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
class OptimizedMCPTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: '3.1.3',
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      optimizations: [
        'Response caching for tools list',
        'Smart tool selection based on task complexity',
        'Performance metrics tracking',
        'Batch execution optimization',
        'Connection pooling simulation'
      ]
    };
  }
  async runOptimizedTest() {
    console.log('🚀 MCP Performance Test v3.1.3');
    console.log(`Platform: ${this.results.systemInfo.platform} ${this.results.systemInfo.arch} | Node.js: ${this.results.systemInfo.nodeVersion}`);
    const testDir = './optimized-test-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    try {
      await this.setupOptimizedEnvironment(testDir);
      const performanceResults = await this.testOptimizedPerformance(testDir);
      this.results.performance = performanceResults;
      const resultsFile = 'results/mcp-performance-' + Date.now() + '.json';
      fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
      console.log('📊 Results saved to: ' + resultsFile);
      this.displayPerformanceSummary(performanceResults);
      console.log('📝 Generating reports...');
      await this.generateUserReview(testDir, performanceResults);
      await this.generateSuggestions(testDir, performanceResults);
    } catch (error) {
      console.error('❌ Test failed: ' + error.message);
      this.results.error = error.message;
    } finally {
      // Copy any remaining step files to results directory before cleanup
      try {
        const stepFiles = fs.readdirSync(testDir).filter(file =>
          file.startsWith('claude-steps-') || file.startsWith('claude-output-')
        );
        for (const file of stepFiles) {
          const src = path.join(testDir, file);
          const dest = path.join('results', file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
          }
        }
      } catch (error) {
        console.warn('Warning: Could not copy some step files:', error.message);
      }
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    console.log('🎉 Test completed!');
  }
  async setupOptimizedEnvironment(testDir) {
    console.log('🔧 Setting up test environment...');
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
    const appDir = path.join(testDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(path.join(appDir, 'components'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'ui'), { recursive: true });
    const componentsDir = path.join(testDir, 'components');
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(path.join(componentsDir, 'ui'), { recursive: true });
    const libDir = path.join(testDir, 'lib');
    fs.mkdirSync(libDir, { recursive: true });
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
    fs.writeFileSync(path.join(testDir, 'tailwind.config.js'), `
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
    console.log('📦 Installing dependencies...');
    execSync('npm install --no-audit --prefer-offline --ignore-scripts', {
      cwd: testDir,
      timeout: 720000,
      stdio: 'pipe'
    });
    const claudeConfig = {
      mcpServers: {
        glootie: {
          type: "stdio",
          command: "node",
          args: [path.join(__dirname, 'src', 'index.js')],
          env: {
            MCP_OPTIMIZED: "true",
            MCP_CACHE_ENABLED: "true",
            NODE_ENV: "production"
          }
        }
      }
    };
    fs.writeFileSync(path.join(testDir, '.claude.json'), JSON.stringify(claudeConfig, null, 2));
  }
  async testOptimizedPerformance(testDir) {
    console.log('🧪 Running performance tests...');
    const tests = [
      {
        name: 'Component Analysis & Enhancement',
        prompt: 'Use searchcode to find all React components in this shadcn/ui project, then use astgrep_search to analyze the component structure and patterns. Look specifically at the task-manager component and suggest improvements for better TypeScript typing and performance.',
        category: 'component-analysis'
      },
      {
        name: 'UI Component Generation',
        prompt: 'Add a new shadcn/ui component for a modal dialog component. Create it following the existing patterns (similar to button, card, input components). Include proper TypeScript interfaces and make it accessible. Use execute to create the file and astgrep_lint to validate it follows shadcn/ui patterns.',
        category: 'ui-generation'
      },
      {
        name: 'Project Refactoring Task',
        prompt: 'Use batch_execute to perform a comprehensive refactoring: 1) Search for all hardcoded strings in components and create a constants file, 2) Extract common utility functions from multiple components into shared hooks, 3) Add proper error boundaries to the React components, 4) Generate a summary of changes made.',
        category: 'refactoring'
      },
      {
        name: 'Performance Optimization',
        prompt: 'Analyze the task-manager component for performance issues using searchcode and astgrep_search. Look for unnecessary re-renders, missing memoization, and inefficient state management. Then implement optimizations using React.memo, useCallback, and useMemo where appropriate.',
        category: 'optimization'
      }
    ];
    const results = {
      tests: [],
      avgImprovement: 0,
      cacheEffectiveness: 0,
      optimizationBenefits: []
    };
    for (const test of tests) {
      console.log(`Running: ${test.name}`);
      const baselineResult = await this.runTestCommand(testDir, test, false);
      const optimizedResult = await this.runTestCommand(testDir, test, true);
      const improvement = baselineResult.success && optimizedResult.success
        ? ((baselineResult.duration - optimizedResult.duration) / baselineResult.duration * 100).toFixed(1)
        : 'N/A';
      const testResult = {
        name: test.name,
        category: test.category,
        baseline: baselineResult,
        optimized: optimizedResult,
        improvement: improvement
      };
      results.tests.push(testResult);
      console.log(`  Baseline: ${baselineResult.duration.toFixed(1)}s | Optimized: ${optimizedResult.duration.toFixed(1)}s | Improvement: ${improvement}%`);
    }
    const successfulTests = results.tests.filter(t => t.improvement !== 'N/A');
    if (successfulTests.length > 0) {
      const avgImprovement = successfulTests.reduce((sum, t) => sum + parseFloat(t.improvement), 0) / successfulTests.length;
      results.avgImprovement = avgImprovement.toFixed(1);
    }
    return results;
  }
  async runTestCommand(workingDir, test, useMcp) {
    const startTime = Date.now();
    const maxRetries = 2;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!fs.existsSync(workingDir)) {
          throw new Error(`Test directory not found: ${workingDir}`);
        }
        const normalizedPath = path.resolve(workingDir);
        const testType = useMcp ? 'mcp' : 'baseline';
        const timestamp = Date.now();

        // Create output files for analysis with test category
        const outputFile = path.join('results', `claude-output-${test.category}-${testType}.json`);
        const stepsFile = path.join('results', `claude-steps-${test.category}-${testType}.json`);

        const baseCmd = `claude -p "${test.prompt}" --dangerously-skip-permissions --add-dir "${normalizedPath}" --output-format stream-json --verbose`;
        const standardTools = "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell";
        const mcpTools = "mcp__glootie__execute,mcp__glootie__retrieve_overflow,mcp__glootie__searchcode,mcp__glootie__astgrep_search,mcp__glootie__astgrep_replace,mcp__glootie__astgrep_lint,mcp__glootie__astgrep_analyze,mcp__glootie__astgrep_advanced_search,mcp__glootie__astgrep_project,mcp__glootie__astgrep_rules,mcp__glootie__batch_execute,mcp__glootie__sequentialthinking";
        const allowedTools = useMcp ? `${standardTools},${mcpTools}` : standardTools;
        const claudeCmd = `${baseCmd} --allowed-tools "${allowedTools}"`;
        const timeout = 720000;
        const output = execSync(claudeCmd, {
          cwd: workingDir,
          timeout,
          encoding: 'utf8',
          stdio: 'pipe',
          maxBuffer: 50 * 1024 * 1024
        });

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
          const lines = output.split('\n').filter(line => line.trim());
          const jsonLines = lines.map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          }).filter(item => item);
          stepData = jsonLines.filter(item => item.type === 'step' || item.step);
          parsedOutput = {
            rawOutput: output,
            jsonLines,
            stepData,
            totalSteps: stepData.length,
            toolCalls: jsonLines.filter(item => item.tool_call),
            toolResults: jsonLines.filter(item => item.tool_result),
            finalResponse: jsonLines[jsonLines.length - 1]
          };
        } catch (parseError) {
          parsedOutput = {
            rawOutput: output,
            parseError: parseError.message,
            stepData: [],
            totalSteps: 0
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
        return {
          success: true,
          duration,
          outputLength: output.length,
          useMcp,
          attempt,
          timestamp: new Date().toISOString(),
          parsedOutput,
          totalSteps: parsedOutput.totalSteps,
          toolCallsCount: parsedOutput.toolCalls ? parsedOutput.toolCalls.length : 0,
          toolResultsCount: parsedOutput.toolResults ? parsedOutput.toolResults.length : 0,
          outputFile,
          stepsFile
        };
      } catch (error) {
        lastError = error;
        if (this.shouldSkipRetry(error)) {
          break;
        }
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await this.sleep(waitTime);
        }
      }
    }
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    return {
      success: false,
      duration,
      outputLength: 0,
      error: lastError?.message || 'Unknown error',
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
    console.log(`Average Improvement: ${results.avgImprovement}% | Completed: ${results.tests.length} | Successful: ${results.tests.filter(t => t.baseline.success && t.optimized.success).length}`);
    if (parseFloat(results.avgImprovement) > 0) {
      console.log(`🎯 Success: ${results.avgImprovement}% average improvement`);
    }
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

Write an honest END_USER_REVIEW.md from the perspective of the agents who actually ran the tests. Base it entirely on the step data and outputs you examine. Be comprehensive and tell the real story of what happened during testing, not theoretical analysis." --add-dir /config/workspace/mcp-repl/results --add-dir /config/workspace/mcp-repl --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell,mcp__glootie__execute,mcp__glootie__searchcode,mcp__glootie__batch_execute,mcp__glootie__sequentialthinking" --verbose`;
      const reviewOutput = execSync(reviewCmd, {
        cwd: '/config/workspace/mcp-repl',
        timeout: 720000,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      fs.writeFileSync(path.join('/config/workspace/mcp-repl', 'END_USER_REVIEW.md'), reviewOutput);
      console.log('✅ END_USER_REVIEW.md generated');
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

Focus Areas:
- What friction points did agents encounter when using specific tools?
- Where did agents succeed or fail in accomplishing their assigned tasks?
- What timing patterns reveal about tool performance from the agent's perspective?
- Which tools actually improved the agent experience vs which created new problems?
- What do the actual step outputs reveal about tool reliability and usability?

Write SUGGESTIONS.md as a comprehensive, no-nonsense technical improvement document that specifically addresses the pain points and successes you observed in the actual agent experiences. Provide concrete, actionable suggestions for making the tooling better based on what the agents actually went through. Focus on practical improvements rather than theoretical benefits, based entirely on the step data analysis." --add-dir /config/workspace/mcp-repl/results --add-dir /config/workspace/mcp-repl --allowed-tools "Bash,Read,Edit,Write,Grep,WebSearch,Task,BashOutput,Glob,ExitPlanMode,NotebookEdit,MultiEdit,WebFetch,TodoWrite,KillShell,mcp__glootie__execute,mcp__glootie__searchcode,mcp__glootie__batch_execute,mcp__glootie__sequentialthinking" --verbose`;
      const suggestionsOutput = execSync(suggestionsCmd, {
        cwd: '/config/workspace/mcp-repl',
        timeout: 720000, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      fs.writeFileSync(path.join('/config/workspace/mcp-repl', 'SUGGESTIONS.md'), suggestionsOutput);
      console.log('✅ SUGGESTIONS.md generated');
    } catch (error) {
      console.error('❌ Failed to generate suggestions:', error.message);
      throw error;
    }
  }
}
const test = new OptimizedMCPTest();
test.runOptimizedTest().catch(console.error);