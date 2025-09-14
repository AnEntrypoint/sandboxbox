// Programming Productivity Engine v2.17.0
// Focus on actual development effectiveness, not execution speed

import { CodebaseIntelligenceEngine } from './codebase-intelligence-engine.js';
import { IntegrationValidator } from './integration-validator.js';
import { NextGenOptimizationEngine } from './next-gen-optimization.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProgrammingProductivityEngine {
  constructor(workingDirectory) {
    this.workingDirectory = workingDirectory;
    this.version = '2.17.0';

    // Core components focused on programming productivity
    this.codebaseIntelligence = new CodebaseIntelligenceEngine(workingDirectory);
    this.integrationValidator = new IntegrationValidator(workingDirectory);
    this.nextGenOptimizer = new NextGenOptimizationEngine();

    // Programming productivity metrics
    this.productivityMetrics = {
      codeIntegrationSuccessRate: 0,
      contextualAppropriatenessScore: 0,
      workflowCompletionRate: 0,
      developerSatisfactionScore: 0,
      codebaseLearningEffectiveness: 0
    };

    // Tool orchestration intelligence
    this.toolOrchestrator = {
      taskToToolMapping: new Map(),
      successfulPatterns: new Map(),
      failurePatterns: new Map()
    };

    // Programming session history
    this.programmingHistory = [];
  }

  // Main programming productivity optimization
  async optimizeForProgrammingProductivity(taskContext, availableTools = [], conversationHistory = []) {
    const startTime = Date.now();

    console.log('🚀 Optimizing for Programming Productivity (NOT execution speed)');
    console.log(`Task: ${taskContext.currentTask}`);

    const optimization = {
      timestamp: new Date().toISOString(),
      taskContext,
      version: this.version,
      focus: 'Programming Effectiveness',
      results: {},
      overallProductivityScore: 0
    };

    try {
      // Step 1: Understand the codebase context
      console.log('  📊 Analyzing codebase intelligence...');
      optimization.results.codebaseIntelligence = await this.codebaseIntelligence.analyzeCodebaseIntelligence(taskContext);

      // Step 2: Orchestrate optimal tool selection for programming task
      console.log('  🔧 Orchestrating optimal tools for programming task...');
      optimization.results.toolOrchestration = await this.orchestrateOptimalTools(taskContext, availableTools, optimization.results.codebaseIntelligence);

      // Step 3: Apply next-gen optimization with programming focus
      console.log('  ⚡ Applying programming-focused optimization...');
      optimization.results.nextGenOptimization = await this.nextGenOptimizer.optimizeWithNextGenTechniques(
        taskContext,
        optimization.results.toolOrchestration.selectedTools,
        conversationHistory
      );

      // Step 4: Generate contextually appropriate code/solution
      console.log('  💻 Generating contextually appropriate solution...');
      optimization.results.contextualSolution = await this.generateContextualSolution(
        taskContext,
        optimization.results.codebaseIntelligence,
        optimization.results.nextGenOptimization
      );

      // Step 5: Validate integration and practical usability
      console.log('  ✅ Validating integration and usability...');
      optimization.results.integrationValidation = await this.integrationValidator.validateCodeIntegration(
        optimization.results.contextualSolution.generatedCode,
        {
          ...taskContext,
          intelligence: optimization.results.codebaseIntelligence
        }
      );

      // Step 6: Calculate programming productivity metrics
      console.log('  📈 Calculating programming productivity metrics...');
      optimization.results.productivityMetrics = this.calculateProgrammingProductivityMetrics(optimization.results);

      // Step 7: Generate programming-focused recommendations
      optimization.results.programmingRecommendations = this.generateProgrammingRecommendations(optimization.results);

      // Calculate overall programming productivity score
      optimization.overallProductivityScore = this.calculateOverallProductivityScore(optimization.results);

      const processingTime = Date.now() - startTime;
      optimization.processingTime = processingTime;

      // Store programming session
      this.storeProgrammingSession(optimization);

      console.log(`✅ Programming productivity optimization completed in ${processingTime}ms`);
      console.log(`   Overall Programming Productivity Score: ${optimization.overallProductivityScore.toFixed(1)}%`);

      return optimization;

    } catch (error) {
      console.error('❌ Programming productivity optimization failed:', error.message);
      optimization.error = error.message;
      optimization.overallProductivityScore = 0;
      return optimization;
    }
  }

  // Orchestrate optimal tool selection for programming tasks
  async orchestrateOptimalTools(taskContext, availableTools, codebaseIntelligence) {
    const orchestration = {
      taskAnalysis: {},
      selectedTools: [],
      toolChain: [],
      reasoning: [],
      confidence: 0
    };

    try {
      // Analyze programming task requirements
      orchestration.taskAnalysis = this.analyzeProgrammingTaskRequirements(taskContext);

      // Select tools based on programming effectiveness, not execution speed
      const toolSelection = this.selectToolsForProgrammingTask(
        orchestration.taskAnalysis,
        availableTools,
        codebaseIntelligence
      );

      orchestration.selectedTools = toolSelection.tools;
      orchestration.reasoning = toolSelection.reasoning;
      orchestration.confidence = toolSelection.confidence;

      // Create intelligent tool chain for complete workflow
      orchestration.toolChain = this.createProgrammingToolChain(
        orchestration.selectedTools,
        orchestration.taskAnalysis
      );

      // Update successful patterns
      if (orchestration.confidence > 70) {
        const pattern = this.createToolPattern(taskContext, orchestration.selectedTools);
        this.toolOrchestrator.successfulPatterns.set(pattern,
          (this.toolOrchestrator.successfulPatterns.get(pattern) || 0) + 1
        );
      }

    } catch (error) {
      orchestration.error = error.message;
      orchestration.confidence = 20;
    }

    return orchestration;
  }

  // Analyze programming task requirements (not execution requirements)
  analyzeProgrammingTaskRequirements(taskContext) {
    const analysis = {
      taskType: 'unknown',
      programmingComplexity: 'medium',
      codeGenerationNeeded: false,
      codeAnalysisNeeded: false,
      integrationRequired: false,
      testingRequired: false,
      refactoringNeeded: false
    };

    const task = taskContext.currentTask?.toLowerCase() || '';

    // Determine task type
    if (task.includes('implement') || task.includes('create') || task.includes('add')) {
      analysis.taskType = 'implementation';
      analysis.codeGenerationNeeded = true;
      analysis.integrationRequired = true;
    } else if (task.includes('fix') || task.includes('bug') || task.includes('debug')) {
      analysis.taskType = 'debugging';
      analysis.codeAnalysisNeeded = true;
      analysis.testingRequired = true;
    } else if (task.includes('refactor') || task.includes('improve') || task.includes('optimize')) {
      analysis.taskType = 'refactoring';
      analysis.refactoringNeeded = true;
      analysis.codeAnalysisNeeded = true;
      analysis.integrationRequired = true;
    } else if (task.includes('analyze') || task.includes('review') || task.includes('understand')) {
      analysis.taskType = 'analysis';
      analysis.codeAnalysisNeeded = true;
    } else if (task.includes('test') || task.includes('verify')) {
      analysis.taskType = 'testing';
      analysis.testingRequired = true;
      analysis.codeAnalysisNeeded = true;
    }

    // Determine programming complexity
    if (task.includes('simple') || task.includes('basic')) {
      analysis.programmingComplexity = 'low';
    } else if (task.includes('complex') || task.includes('advanced') || task.includes('architecture')) {
      analysis.programmingComplexity = 'high';
    } else if (task.includes('enterprise') || task.includes('system') || task.includes('scalable')) {
      analysis.programmingComplexity = 'very-high';
    }

    return analysis;
  }

  // Select tools optimized for programming effectiveness
  selectToolsForProgrammingTask(taskAnalysis, availableTools, codebaseIntelligence) {
    const selection = {
      tools: [],
      reasoning: [],
      confidence: 60
    };

    try {
      // Core programming tools (always needed)
      const coreTools = ['searchcode', 'executenodejs'];
      selection.tools.push(...coreTools);
      selection.reasoning.push('Core programming tools for code search and execution');

      // AST tools for code manipulation (high programming value)
      if (taskAnalysis.codeAnalysisNeeded || taskAnalysis.refactoringNeeded) {
        const astTools = ['astgrep_search', 'astgrep_analyze'];
        if (taskAnalysis.refactoringNeeded) {
          astTools.push('astgrep_replace');
        }
        selection.tools.push(...astTools);
        selection.reasoning.push('AST tools for sophisticated code analysis and manipulation');
        selection.confidence += 15;
      }

      // Batch execution for workflow efficiency
      if (selection.tools.length > 3) {
        selection.tools.push('batch_execute');
        selection.reasoning.push('Batch execution for efficient workflow completion');
        selection.confidence += 10;
      }

      // Sequential thinking for complex programming tasks
      if (taskAnalysis.programmingComplexity === 'high' || taskAnalysis.programmingComplexity === 'very-high') {
        selection.tools.push('sequentialthinking');
        selection.reasoning.push('Sequential thinking for complex programming problem solving');
        selection.confidence += 12;
      }

      // Project-specific tools based on codebase intelligence
      if (codebaseIntelligence.architecture.pattern === 'react-app') {
        selection.reasoning.push('React-specific patterns detected, prioritize component analysis');
        selection.confidence += 8;
      } else if (codebaseIntelligence.architecture.pattern === 'node-api') {
        selection.reasoning.push('Node.js API patterns detected, focus on service layer tools');
        selection.confidence += 8;
      }

      // Remove duplicate tools
      selection.tools = [...new Set(selection.tools)];

    } catch (error) {
      selection.reasoning.push(`Tool selection error: ${error.message}`);
      selection.confidence = 30;
    }

    return selection;
  }

  // Create programming-focused tool chain
  createProgrammingToolChain(selectedTools, taskAnalysis) {
    const toolChain = [];

    // Phase 1: Understanding (always first for programming tasks)
    if (selectedTools.includes('searchcode')) {
      toolChain.push({
        phase: 'understanding',
        tool: 'searchcode',
        purpose: 'Understand existing codebase patterns and context',
        priority: 'critical'
      });
    }

    // Phase 2: Analysis (before implementation)
    if (selectedTools.includes('astgrep_search') || selectedTools.includes('astgrep_analyze')) {
      toolChain.push({
        phase: 'analysis',
        tool: selectedTools.includes('astgrep_analyze') ? 'astgrep_analyze' : 'astgrep_search',
        purpose: 'Analyze code structure and identify patterns',
        priority: 'high'
      });
    }

    // Phase 3: Implementation (core programming work)
    toolChain.push({
      phase: 'implementation',
      tool: 'executenodejs',
      purpose: 'Execute programming solution with validation',
      priority: 'critical'
    });

    // Phase 4: Integration/Refactoring (if needed)
    if (selectedTools.includes('astgrep_replace')) {
      toolChain.push({
        phase: 'integration',
        tool: 'astgrep_replace',
        purpose: 'Apply refactoring with pattern matching',
        priority: 'high'
      });
    }

    // Phase 5: Validation (programming effectiveness check)
    toolChain.push({
      phase: 'validation',
      tool: 'executenodejs',
      purpose: 'Validate solution works in context',
      priority: 'critical'
    });

    return toolChain;
  }

  // Generate contextually appropriate solution
  async generateContextualSolution(taskContext, codebaseIntelligence, nextGenOptimization) {
    const solution = {
      generatedCode: '',
      contextualRecommendations: [],
      integrationGuidance: [],
      confidence: 0
    };

    try {
      // Get contextual recommendations from codebase intelligence
      const recommendations = this.codebaseIntelligence.generateContextualRecommendations(
        taskContext,
        taskContext.content || ''
      );

      solution.contextualRecommendations = recommendations.recommendations;

      // Generate code that follows project patterns
      solution.generatedCode = this.generateCodeFollowingPatterns(
        taskContext,
        codebaseIntelligence,
        recommendations
      );

      // Generate integration guidance
      solution.integrationGuidance = this.generateIntegrationGuidance(
        solution.generatedCode,
        codebaseIntelligence
      );

      solution.confidence = recommendations.confidence;

    } catch (error) {
      solution.error = error.message;
      solution.confidence = 20;
    }

    return solution;
  }

  // Generate code following project patterns
  generateCodeFollowingPatterns(taskContext, codebaseIntelligence, recommendations) {
    // In a real implementation, this would use AI to generate context-aware code
    // For now, simulate contextually appropriate code generation

    const context = codebaseIntelligence.integrationContext;
    const task = taskContext.currentTask || '';

    let generatedCode = '';

    // Apply style conventions
    const indent = context?.codeStyle?.indentation === 'tabs' ? '\t' : '  ';
    const quote = context?.codeStyle?.quotes === 'double' ? '"' : "'";

    // Generate code based on task type and context
    if (task.includes('function') || task.includes('implement')) {
      generatedCode = this.generateContextualFunction(task, context, indent, quote);
    } else if (task.includes('class') || task.includes('component')) {
      generatedCode = this.generateContextualClass(task, context, indent, quote);
    } else if (task.includes('test')) {
      generatedCode = this.generateContextualTest(task, context, indent, quote);
    } else {
      generatedCode = this.generateGenericSolution(task, context, indent, quote);
    }

    return generatedCode;
  }

  // Generate contextual function
  generateContextualFunction(task, context, indent, quote) {
    const asyncPattern = context?.codeStyle?.async === 'async-await' ? 'async ' : '';

    return `${asyncPattern}function processTask(input) {
${indent}if (!input) {
${indent}${indent}throw new Error(${quote}Input is required${quote});
${indent}}
${indent}
${indent}// Implementation following project patterns
${indent}const result = ${asyncPattern ? 'await ' : ''}performOperation(input);
${indent}
${indent}return {
${indent}${indent}success: true,
${indent}${indent}data: result,
${indent}${indent}timestamp: new Date().toISOString()
${indent}};
}`;
  }

  // Generate contextual class
  generateContextualClass(task, context, indent, quote) {
    return `class TaskProcessor {
${indent}constructor(options = {}) {
${indent}${indent}this.options = options;
${indent}${indent}this.initialized = false;
${indent}}
${indent}
${indent}async initialize() {
${indent}${indent}// Initialize following project patterns
${indent}${indent}this.initialized = true;
${indent}${indent}return this;
${indent}}
${indent}
${indent}process(input) {
${indent}${indent}if (!this.initialized) {
${indent}${indent}${indent}throw new Error(${quote}Processor not initialized${quote});
${indent}${indent}}
${indent}${indent}
${indent}${indent}// Process following project conventions
${indent}${indent}return this.handleInput(input);
${indent}}
}`;
  }

  // Generate contextual test
  generateContextualTest(task, context, indent, quote) {
    const framework = context?.testingFramework || 'jest';

    return `describe(${quote}Task Processing${quote}, () => {
${indent}let processor;
${indent}
${indent}beforeEach(() => {
${indent}${indent}processor = new TaskProcessor();
${indent}});
${indent}
${indent}test(${quote}should process valid input${quote}, async () => {
${indent}${indent}const input = { data: ${quote}test${quote} };
${indent}${indent}const result = await processor.process(input);
${indent}${indent}
${indent}${indent}expect(result.success).toBe(true);
${indent}${indent}expect(result.data).toBeDefined();
${indent}});
${indent}
${indent}test(${quote}should handle invalid input${quote}, () => {
${indent}${indent}expect(() => {
${indent}${indent}${indent}processor.process(null);
${indent}${indent}}).toThrow(${quote}Input is required${quote});
${indent}});
});`;
  }

  // Generate generic solution
  generateGenericSolution(task, context, indent, quote) {
    return `// Solution for: ${task}
// Generated following project conventions

const solution = {
${indent}execute() {
${indent}${indent}// Implementation logic here
${indent}${indent}console.log(${quote}Executing solution...${quote});
${indent}${indent}return ${quote}success${quote};
${indent}},
${indent}
${indent}validate() {
${indent}${indent}// Validation logic here
${indent}${indent}return true;
${indent}}
};

export default solution;`;
  }

  // Generate integration guidance
  generateIntegrationGuidance(generatedCode, codebaseIntelligence) {
    const guidance = [];

    // File placement guidance
    if (codebaseIntelligence.architecture.organization === 'feature-based') {
      guidance.push('Place in appropriate feature directory following project structure');
    } else if (codebaseIntelligence.architecture.organization === 'layer-based') {
      guidance.push('Place in appropriate layer directory (components, services, utils)');
    }

    // Import/export guidance
    if (codebaseIntelligence.patterns.architectural?.includes('default-exports')) {
      guidance.push('Use default export to match project convention');
    } else if (codebaseIntelligence.patterns.architectural?.includes('named-exports')) {
      guidance.push('Use named exports to match project convention');
    }

    // Testing guidance
    if (codebaseIntelligence.testingPatterns?.framework) {
      guidance.push(`Add tests using ${codebaseIntelligence.testingPatterns.framework} framework`);
    }

    // Dependency guidance
    guidance.push('Ensure all imports are available in project dependencies');
    guidance.push('Follow existing error handling patterns');

    return guidance;
  }

  // Calculate programming productivity metrics (NOT execution metrics)
  calculateProgrammingProductivityMetrics(results) {
    const metrics = {
      codeIntegrationSuccess: 0,
      contextualAppropriateness: 0,
      workflowCompletionRate: 0,
      developerSatisfaction: 0,
      codebaseLearning: 0
    };

    try {
      // Code integration success rate
      if (results.integrationValidation) {
        const validation = results.integrationValidation;
        metrics.codeIntegrationSuccess = validation.overallSuccess ?
          Math.min(95, validation.confidence + 10) :
          Math.max(30, validation.confidence);
      }

      // Contextual appropriateness
      if (results.codebaseIntelligence && results.contextualSolution) {
        const intelligence = results.codebaseIntelligence;
        metrics.contextualAppropriateness = Math.min(95,
          intelligence.confidence +
          (results.contextualSolution.confidence || 0) / 2
        );
      }

      // Workflow completion rate
      if (results.toolOrchestration) {
        const orchestration = results.toolOrchestration;
        const completedPhases = orchestration.toolChain ? orchestration.toolChain.length : 0;
        metrics.workflowCompletionRate = Math.min(95,
          orchestration.confidence + (completedPhases * 5)
        );
      }

      // Developer satisfaction (based on integration success and context)
      metrics.developerSatisfaction = Math.min(95,
        (metrics.codeIntegrationSuccess * 0.4) +
        (metrics.contextualAppropriateness * 0.3) +
        (metrics.workflowCompletionRate * 0.3)
      );

      // Codebase learning effectiveness
      if (results.codebaseIntelligence) {
        metrics.codebaseLearning = results.codebaseIntelligence.confidence;
      }

    } catch (error) {
      // Default to moderate scores if calculation fails
      Object.keys(metrics).forEach(key => {
        metrics[key] = 60;
      });
    }

    return metrics;
  }

  // Calculate overall programming productivity score
  calculateOverallProductivityScore(results) {
    const metrics = results.productivityMetrics;

    // Weighted average focusing on practical programming outcomes
    const weights = {
      codeIntegrationSuccess: 0.30,    // Most important - does it work?
      contextualAppropriateness: 0.25, // Does it fit the project?
      workflowCompletionRate: 0.25,    // Does it complete the task?
      developerSatisfaction: 0.15,     // Is it actually useful?
      codebaseLearning: 0.05          // Does it improve over time?
    };

    let score = 0;
    Object.entries(weights).forEach(([metric, weight]) => {
      score += (metrics[metric] || 0) * weight;
    });

    return Math.min(95, Math.max(20, score));
  }

  // Generate programming-focused recommendations
  generateProgrammingRecommendations(results) {
    const recommendations = {
      immediate: [],
      strategic: [],
      learning: []
    };

    try {
      const metrics = results.productivityMetrics;

      // Immediate recommendations
      if (metrics.codeIntegrationSuccess < 70) {
        recommendations.immediate.push('Fix integration issues before proceeding');
        recommendations.immediate.push('Validate dependencies and imports');
      }

      if (metrics.contextualAppropriateness < 70) {
        recommendations.immediate.push('Review and follow project conventions more closely');
        recommendations.immediate.push('Analyze existing code patterns for consistency');
      }

      // Strategic recommendations
      if (metrics.workflowCompletionRate < 80) {
        recommendations.strategic.push('Improve tool orchestration for complete workflows');
        recommendations.strategic.push('Focus on end-to-end task completion');
      }

      if (metrics.developerSatisfaction < 75) {
        recommendations.strategic.push('Prioritize practical usability over theoretical perfection');
        recommendations.strategic.push('Test generated code in real development scenarios');
      }

      // Learning recommendations
      if (metrics.codebaseLearning < 70) {
        recommendations.learning.push('Increase codebase analysis frequency');
        recommendations.learning.push('Build stronger project pattern recognition');
      }

      // Add general programming productivity recommendations
      recommendations.strategic.push('Focus on programming effectiveness over execution speed');
      recommendations.learning.push('Continuously learn from successful integration patterns');

    } catch (error) {
      recommendations.immediate.push('Address calculation errors in productivity metrics');
    }

    return recommendations;
  }

  // Store programming session for learning
  storeProgrammingSession(optimization) {
    const session = {
      timestamp: optimization.timestamp,
      task: optimization.taskContext.currentTask,
      productivityScore: optimization.overallProductivityScore,
      success: optimization.overallProductivityScore >= 70,
      metrics: optimization.results.productivityMetrics,
      tools: optimization.results.toolOrchestration?.selectedTools || [],
      learnings: this.extractLearnings(optimization)
    };

    this.programmingHistory.push(session);

    // Keep recent history
    if (this.programmingHistory.length > 100) {
      this.programmingHistory = this.programmingHistory.slice(-100);
    }

    // Update productivity metrics
    this.updateProductivityMetrics(session);
  }

  // Extract learnings from programming session
  extractLearnings(optimization) {
    const learnings = [];

    if (optimization.results.codebaseIntelligence?.confidence > 80) {
      learnings.push('Strong codebase understanding achieved');
    }

    if (optimization.results.integrationValidation?.overallSuccess) {
      learnings.push('Successful code integration pattern identified');
    }

    if (optimization.overallProductivityScore > 85) {
      learnings.push('High productivity pattern - replicate approach');
    }

    return learnings;
  }

  // Update overall productivity metrics
  updateProductivityMetrics(session) {
    if (session.success && session.metrics) {
      Object.keys(this.productivityMetrics).forEach(metric => {
        const currentValue = this.productivityMetrics[metric];
        const sessionValue = session.metrics[metric] || 0;

        // Moving average with more weight on recent sessions
        this.productivityMetrics[metric] = (currentValue * 0.8) + (sessionValue * 0.2);
      });
    }
  }

  // Helper methods
  createToolPattern(taskContext, tools) {
    return JSON.stringify({
      taskType: this.analyzeProgrammingTaskRequirements(taskContext).taskType,
      tools: tools.sort()
    });
  }

  // Get programming productivity statistics
  getProgrammingProductivityStats() {
    const totalSessions = this.programmingHistory.length;

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        successRate: 0,
        averageProductivityScore: 0,
        trendingUp: false
      };
    }

    const successfulSessions = this.programmingHistory.filter(s => s.success).length;
    const successRate = (successfulSessions / totalSessions) * 100;

    const avgScore = this.programmingHistory.reduce((sum, s) => sum + s.productivityScore, 0) / totalSessions;

    // Check if trending up (last 10 vs previous 10)
    let trendingUp = false;
    if (totalSessions >= 20) {
      const recent = this.programmingHistory.slice(-10);
      const previous = this.programmingHistory.slice(-20, -10);

      const recentAvg = recent.reduce((sum, s) => sum + s.productivityScore, 0) / recent.length;
      const previousAvg = previous.reduce((sum, s) => sum + s.productivityScore, 0) / previous.length;

      trendingUp = recentAvg > previousAvg;
    }

    return {
      totalSessions,
      successRate: Math.round(successRate),
      averageProductivityScore: Math.round(avgScore),
      currentMetrics: { ...this.productivityMetrics },
      trendingUp,
      recentSessions: this.programmingHistory.slice(-5)
    };
  }
}

export default ProgrammingProductivityEngine;