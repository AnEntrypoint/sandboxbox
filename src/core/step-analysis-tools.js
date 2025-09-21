import fs from 'fs';
import path from 'path';

// Enhanced step file analysis tools for MCP v3.1.4 compatibility
class StepFileAnalyzer {
  constructor() {
    this.supportedTestTypes = ['component-analysis', 'optimization', 'refactoring', 'ui-generation'];
  }

  async analyzeStepFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      return {
        success: true,
        filePath,
        analysis: this.extractStepInsights(data),
        metadata: this.extractMetadata(data),
        performance: this.calculatePerformanceMetrics(data)
      };
    } catch (error) {
      return {
        success: false,
        filePath,
        error: error.message
      };
    }
  }

  extractMetadata(data) {
    return {
      timestamp: data.timestamp,
      session_id: data.session_id,
      model: data.model,
      tools: data.tools || [],
      mcp_servers: data.mcp_servers || [],
      permission_mode: data.permissionMode,
      total_steps: data.stepData?.length || 0
    };
  }

  calculatePerformanceMetrics(data) {
    if (!data.stepData || data.stepData.length === 0) {
      return null;
    }

    const steps = data.stepData;
    const duration = this.calculateDuration(steps);
    const toolUsage = this.analyzeToolUsage(steps);
    const errorAnalysis = this.analyzeErrors(steps);
    const agentBehavior = this.analyzeAgentBehavior(steps);

    return {
      duration,
      toolUsage,
      errorAnalysis,
      agentBehavior,
      efficiency: this.calculateEfficiency(steps, toolUsage)
    };
  }

  calculateDuration(steps) {
    if (steps.length < 2) return 0;

    const start = new Date(steps[0].timestamp);
    const end = new Date(steps[steps.length - 1].timestamp);
    return (end - start) / 1000; // Convert to seconds
  }

  analyzeToolUsage(steps) {
    const toolUsage = {};
    const toolSuccess = {};
    const toolChains = [];

    steps.forEach((step, index) => {
      if (step.type === 'assistant' && step.message?.content) {
        step.message.content.forEach(content => {
          if (content.type === 'tool_use') {
            const toolName = content.name;
            toolUsage[toolName] = (toolUsage[toolName] || 0) + 1;

            // Track tool chains (sequential tool usage)
            if (index > 0) {
              const prevStep = steps[index - 1];
              if (prevStep.type === 'assistant' && prevStep.message?.content) {
                prevStep.message.content.forEach(prevContent => {
                  if (prevContent.type === 'tool_use') {
                    toolChains.push(`${prevContent.name} -> ${toolName}`);
                  }
                });
              }
            }
          }
        });
      }

      // Track success rates
      if (step.type === 'user' && step.message?.content) {
        step.message.content.forEach(content => {
          if (content.type === 'tool_result' && content.tool_use_id) {
            const isSuccess = !content.content?.is_error;
            toolSuccess[content.tool_use_id] = isSuccess;
          }
        });
      }
    });

    return {
      usage: toolUsage,
      success: toolSuccess,
      chains: toolChains,
      totalTools: Object.keys(toolUsage).length,
      mostUsed: Object.entries(toolUsage)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null
    };
  }

  analyzeErrors(steps) {
    const errors = [];
    const warnings = [];

    steps.forEach((step, index) => {
      if (step.type === 'user' && step.message?.content) {
        step.message.content.forEach(content => {
          if (content.type === 'tool_result' && content.content?.is_error) {
            errors.push({
              step: index,
              tool_use_id: content.tool_use_id,
              error: content.content
            });
          }
        });
      }

      // Detect potential issues
      if (step.type === 'assistant' && step.message?.content) {
        const toolUses = step.message.content.filter(c => c.type === 'tool_use');
        if (toolUses.length > 5) {
          warnings.push({
            step: index,
            issue: 'High tool usage in single step',
            count: toolUses.length
          });
        }
      }
    });

    return {
      errors,
      warnings,
      errorRate: errors.length / steps.length,
      hasCriticalErrors: errors.length > 0
    };
  }

  analyzeAgentBehavior(steps) {
    const behavior = {
      averageResponseTime: 0,
      responseTimes: [],
      toolDiversity: 0,
      strategicPauses: 0,
      adaptationEvents: 0
    };

    let lastTimestamp = null;
    steps.forEach(step => {
      if (step.timestamp) {
        const timestamp = new Date(step.timestamp);
        if (lastTimestamp) {
          const timeDiff = (timestamp - lastTimestamp) / 1000;
          behavior.responseTimes.push(timeDiff);

          if (timeDiff > 10) { // Strategic pause threshold
            behavior.strategicPauses++;
          }
        }
        lastTimestamp = timestamp;
      }
    });

    if (behavior.responseTimes.length > 0) {
      behavior.averageResponseTime = behavior.responseTimes.reduce((a, b) => a + b, 0) / behavior.responseTimes.length;
    }

    return behavior;
  }

  calculateEfficiency(steps, toolUsage) {
    const totalSteps = steps.length;
    const toolSteps = steps.filter(step =>
      step.type === 'assistant' && step.message?.content?.some(c => c.type === 'tool_use')
    ).length;

    return {
      stepEfficiency: toolSteps / totalSteps,
      toolDiversity: Object.keys(toolUsage.usage).length,
      averageToolsPerStep: toolSteps / Math.max(toolSteps, 1),
      successRate: Object.values(toolUsage.success).filter(Boolean).length / Math.max(Object.keys(toolUsage.success).length, 1)
    };
  }

  extractStepInsights(data) {
    const insights = {
      workflowPattern: this.identifyWorkflowPattern(data),
      toolStrategy: this.identifyToolStrategy(data),
      agentExperience: this.evaluateAgentExperience(data),
      recommendations: this.generateRecommendations(data)
    };

    return insights;
  }

  identifyWorkflowPattern(data) {
    const steps = data.stepData || [];
    const pattern = {
      type: 'unknown',
      phases: [],
      characteristics: []
    };

    // Analyze step sequence to identify patterns
    const assistantSteps = steps.filter(s => s.type === 'assistant');
    const userSteps = steps.filter(s => s.type === 'user');

    if (assistantSteps.length > userSteps.length) {
      pattern.type = 'agent-driven';
      pattern.characteristics.push('high-autonomy');
    } else {
      pattern.type = 'collaborative';
      pattern.characteristics.push('balanced-interaction');
    }

    // Identify phases
    let currentPhase = 'initialization';
    let phaseStart = 0;

    steps.forEach((step, index) => {
      if (step.type === 'assistant' && step.message?.content) {
        const content = step.message.content.find(c => c.type === 'text');
        if (content && content.text.toLowerCase().includes('analyze')) {
          if (currentPhase !== 'analysis') {
            if (index > phaseStart) {
              pattern.phases.push({
                type: currentPhase,
                start: phaseStart,
                end: index - 1,
                steps: index - phaseStart
              });
            }
            currentPhase = 'analysis';
            phaseStart = index;
          }
        }
      }
    });

    // Add final phase
    pattern.phases.push({
      type: currentPhase,
      start: phaseStart,
      end: steps.length - 1,
      steps: steps.length - phaseStart
    });

    return pattern;
  }

  identifyToolStrategy(data) {
    const steps = data.stepData || [];
    const toolUsage = this.analyzeToolUsage(steps);

    return {
      preferredTools: Object.entries(toolUsage.usage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tool, count]) => ({ tool, count })),
      strategy: this.categorizeStrategy(toolUsage),
      effectiveness: toolUsage.success && Object.keys(toolUsage.success).length > 0
        ? Object.values(toolUsage.success).filter(Boolean).length / Object.keys(toolUsage.success).length
        : 0
    };
  }

  categorizeStrategy(toolUsage) {
    const usage = toolUsage.usage;
    const totalTools = Object.keys(usage).length;
    const totalUses = Object.values(usage).reduce((a, b) => a + b, 0);

    if (totalTools === 1) return 'specialized';
    if (totalTools > 10) return 'exploratory';
    if (totalUses / totalTools > 3) return 'iterative';
    return 'balanced';
  }

  evaluateAgentExperience(data) {
    const steps = data.stepData || [];
    const performance = this.calculatePerformanceMetrics(data);

    return {
      efficiency: performance?.efficiency?.stepEfficiency || 0,
      adaptability: this.calculateAdaptability(steps),
      problemSolving: this.assessProblemSolving(steps),
      collaboration: this.assessCollaboration(steps)
    };
  }

  calculateAdaptability(steps) {
    // Measure how well the agent adapts to tool results
    let adaptationScore = 0;
    let adaptationEvents = 0;

    steps.forEach((step, index) => {
      if (step.type === 'user' && step.message?.content) {
        step.message.content.forEach(content => {
          if (content.type === 'tool_result' && !content.content?.is_error) {
            // Check if next assistant step shows adaptation
            if (index < steps.length - 1) {
              const nextStep = steps[index + 1];
              if (nextStep.type === 'assistant' && nextStep.message?.content) {
                const textContent = nextStep.message.content.find(c => c.type === 'text');
                if (textContent && (textContent.text.toLowerCase().includes('based on') ||
                                  textContent.text.toLowerCase().includes('therefore'))) {
                  adaptationEvents++;
                  adaptationScore += 1;
                }
              }
            }
          }
        });
      }
    });

    return adaptationEvents > 0 ? adaptationScore / adaptationEvents : 0;
  }

  assessProblemSolving(steps) {
    // Assess problem-solving capabilities
    let problemSolvingScore = 0;
    let problemSolvingEvents = 0;

    steps.forEach(step => {
      if (step.type === 'assistant' && step.message?.content) {
        const textContent = step.message.content.find(c => c.type === 'text');
        if (textContent) {
          const text = textContent.text.toLowerCase();
          if (text.includes('analyze') || text.includes('investigate') || text.includes('examine')) {
            problemSolvingEvents++;
            problemSolvingScore += 1;
          }
          if (text.includes('solution') || text.includes('fix') || text.includes('resolve')) {
            problemSolvingEvents++;
            problemSolvingScore += 2;
          }
        }
      }
    });

    return problemSolvingEvents > 0 ? problemSolvingScore / problemSolvingEvents : 0;
  }

  assessCollaboration(steps) {
    // Assess collaboration with user
    let collaborationScore = 0;
    let collaborationEvents = 0;

    steps.forEach(step => {
      if (step.type === 'assistant' && step.message?.content) {
        const textContent = step.message.content.find(c => c.type === 'text');
        if (textContent) {
          const text = textContent.text.toLowerCase();
          if (text.includes('recommend') || text.includes('suggest') || text.includes('would you like')) {
            collaborationEvents++;
            collaborationScore += 1;
          }
        }
      }
    });

    return collaborationEvents > 0 ? collaborationScore / collaborationEvents : 0;
  }

  generateRecommendations(data) {
    const performance = this.calculatePerformanceMetrics(data);
    const recommendations = [];

    if (performance?.errorAnalysis?.hasCriticalErrors) {
      recommendations.push({
        type: 'error-handling',
        priority: 'high',
        message: 'Improve error handling and validation for critical operations'
      });
    }

    if (performance?.efficiency?.stepEfficiency < 0.7) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        message: 'Optimize step efficiency by reducing unnecessary operations'
      });
    }

    if (performance?.toolUsage?.totalTools > 15) {
      recommendations.push({
        type: 'tool-usage',
        priority: 'medium',
        message: 'Consider consolidating tool usage to reduce complexity'
      });
    }

    return recommendations;
  }

  async compareBaselineVsMCP(baselineFile, mcpFile) {
    try {
      const baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
      const mcpData = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));

      const baselineAnalysis = await this.analyzeStepFile(baselineFile);
      const mcpAnalysis = await this.analyzeStepFile(mcpFile);

      return {
        comparison: {
          duration: {
            baseline: baselineAnalysis.performance?.duration || 0,
            mcp: mcpAnalysis.performance?.duration || 0,
            improvement: baselineAnalysis.performance?.duration && mcpAnalysis.performance?.duration
              ? ((baselineAnalysis.performance.duration - mcpAnalysis.performance.duration) / baselineAnalysis.performance.duration * 100)
              : 0
          },
          steps: {
            baseline: baselineAnalysis.metadata?.total_steps || 0,
            mcp: mcpAnalysis.metadata?.total_steps || 0,
            reduction: baselineAnalysis.metadata?.total_steps && mcpAnalysis.metadata?.total_steps
              ? baselineAnalysis.metadata.total_steps - mcpAnalysis.metadata.total_steps
              : 0
          },
          toolUsage: {
            baseline: baselineAnalysis.performance?.toolUsage?.totalTools || 0,
            mcp: mcpAnalysis.performance?.toolUsage?.totalTools || 0,
            difference: mcpAnalysis.performance?.toolUsage?.totalTools - baselineAnalysis.performance?.toolUsage?.totalTools || 0
          },
          errorRate: {
            baseline: baselineAnalysis.performance?.errorAnalysis?.errorRate || 0,
            mcp: mcpAnalysis.performance?.errorAnalysis?.errorRate || 0,
            improvement: baselineAnalysis.performance?.errorAnalysis && mcpAnalysis.performance?.errorAnalysis
              ? ((baselineAnalysis.performance.errorAnalysis.errorRate - mcpAnalysis.performance.errorAnalysis.errorRate) / baselineAnalysis.performance.errorAnalysis.errorRate * 100)
              : 0
          }
        },
        insights: {
          mcpAdvantages: this.identifyMCPAdvantages(baselineAnalysis, mcpAnalysis),
          baselineAdvantages: this.identifyBaselineAdvantages(baselineAnalysis, mcpAnalysis),
          recommendations: this.generateComparativeRecommendations(baselineAnalysis, mcpAnalysis)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  identifyMCPAdvantages(baselineAnalysis, mcpAnalysis) {
    const advantages = [];

    if (mcpAnalysis.performance?.duration < baselineAnalysis.performance?.duration) {
      advantages.push('Faster execution time');
    }

    if (mcpAnalysis.performance?.efficiency?.stepEfficiency > baselineAnalysis.performance?.efficiency?.stepEfficiency) {
      advantages.push('Higher step efficiency');
    }

    if (mcpAnalysis.performance?.errorAnalysis?.errorRate < baselineAnalysis.performance?.errorAnalysis?.errorRate) {
      advantages.push('Lower error rate');
    }

    return advantages;
  }

  identifyBaselineAdvantages(baselineAnalysis, mcpAnalysis) {
    const advantages = [];

    if (baselineAnalysis.performance?.toolUsage?.totalTools < mcpAnalysis.performance?.toolUsage?.totalTools) {
      advantages.push('Simpler tool usage');
    }

    if (baselineAnalysis.metadata?.total_steps < mcpAnalysis.metadata?.total_steps) {
      advantages.push('Fewer steps required');
    }

    return advantages;
  }

  generateComparativeRecommendations(baselineAnalysis, mcpAnalysis) {
    const recommendations = [];

    // Analyze which approach performs better in different areas
    if (mcpAnalysis.performance?.duration < baselineAnalysis.performance?.duration) {
      recommendations.push('Use MCP approach for time-sensitive tasks');
    }

    if (baselineAnalysis.performance?.errorAnalysis?.errorRate < mcpAnalysis.performance?.errorAnalysis?.errorRate) {
      recommendations.push('Use baseline approach for error-critical tasks');
    }

    return recommendations;
  }
}

export const stepAnalysisTools = [
  {
    name: "analyze_step_file",
    description: "Comprehensive analysis of step files for agent experience evaluation and performance insights.",
    supported_operations: ["step analysis", "performance metrics", "agent behavior", "error analysis"],
    use_cases: ["Analyze agent workflow patterns", "Evaluate tool usage efficiency", "Identify performance bottlenecks", "Compare agent strategies"],
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the step file to analyze"
        },
        workingDirectory: {
          type: "string",
          description: "Working directory for file resolution"
        }
      },
      required: ["filePath", "workingDirectory"]
    },
    handler: async (args) => {
      const analyzer = new StepFileAnalyzer();
      const fullPath = path.resolve(args.workingDirectory, args.filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Step file not found: ${fullPath}`);
      }

      const result = await analyzer.analyzeStepFile(fullPath);
      return result;
    }
  },
  {
    name: "compare_baseline_mcp",
    description: "Compare baseline and MCP step files to evaluate performance improvements and agent experience differences.",
    supported_operations: ["performance comparison", "efficiency analysis", "agent experience comparison"],
    use_cases: ["Evaluate MCP effectiveness", "Identify improvement areas", "Compare tool usage patterns", "Analyze agent behavior differences"],
    inputSchema: {
      type: "object",
      properties: {
        baselineFile: {
          type: "string",
          description: "Path to baseline step file"
        },
        mcpFile: {
          type: "string",
          description: "Path to MCP step file"
        },
        workingDirectory: {
          type: "string",
          description: "Working directory for file resolution"
        }
      },
      required: ["baselineFile", "mcpFile", "workingDirectory"]
    },
    handler: async (args) => {
      const analyzer = new StepFileAnalyzer();
      const baselinePath = path.resolve(args.workingDirectory, args.baselineFile);
      const mcpPath = path.resolve(args.workingDirectory, args.mcpFile);

      if (!fs.existsSync(baselinePath)) {
        throw new Error(`Baseline file not found: ${baselinePath}`);
      }

      if (!fs.existsSync(mcpPath)) {
        throw new Error(`MCP file not found: ${mcpPath}`);
      }

      const result = await analyzer.compareBaselineVsMCP(baselinePath, mcpPath);
      return result;
    }
  },
  {
    name: "analyze_performance_data",
    description: "Analyze comprehensive performance data from MCP test results including multiple test categories.",
    supported_operations: ["performance analysis", "statistical insights", "trend analysis"],
    use_cases: ["Analyze overall MCP performance", "Identify trends across test types", "Generate performance reports", "Evaluate agent effectiveness"],
    inputSchema: {
      type: "object",
      properties: {
        performanceFile: {
          type: "string",
          description: "Path to performance data JSON file"
        },
        workingDirectory: {
          type: "string",
          description: "Working directory for file resolution"
        }
      },
      required: ["performanceFile", "workingDirectory"]
    },
    handler: async (args) => {
      const fullPath = path.resolve(args.workingDirectory, args.performanceFile);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Performance file not found: ${fullPath}`);
      }

      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const analyzer = new StepFileAnalyzer();

        const analysis = {
          overall: {
            totalTests: data.performance?.tests?.length || 0,
            version: data.version,
            timestamp: data.timestamp,
            systemInfo: data.systemInfo
          },
          testResults: data.performance?.tests?.map(test => ({
            name: test.name,
            category: test.category,
            baseline: {
              duration: test.baseline?.duration || 0,
              success: test.baseline?.success || false,
              steps: test.baseline?.parsedOutput?.stepData?.length || 0
            },
            mcp: {
              duration: test.mcp?.duration || 0,
              success: test.mcp?.success || false,
              steps: test.mcp?.parsedOutput?.stepData?.length || 0
            },
            improvement: {
              duration: test.baseline?.duration && test.mcp?.duration
                ? ((test.baseline.duration - test.mcp.duration) / test.baseline.duration * 100)
                : 0,
              steps: test.baseline?.parsedOutput?.stepData?.length && test.mcp?.parsedOutput?.stepData?.length
                ? test.baseline.parsedOutput.stepData.length - test.mcp.parsedOutput.stepData.length
                : 0
            }
          })) || [],
          insights: {
            averageImprovement: data.performance?.tests?.reduce((acc, test) => {
              const improvement = test.baseline?.duration && test.mcp?.duration
                ? ((test.baseline.duration - test.mcp.duration) / test.baseline.duration * 100)
                : 0;
              return acc + improvement;
            }, 0) / (data.performance?.tests?.length || 1),
            bestPerformingCategory: data.performance?.tests?.reduce((best, test) => {
              const improvement = test.baseline?.duration && test.mcp?.duration
                ? ((test.baseline.duration - test.mcp.duration) / test.baseline.duration * 100)
                : 0;
              return improvement > (best?.improvement || -Infinity) ? { ...test, improvement } : best;
            }, null),
            worstPerformingCategory: data.performance?.tests?.reduce((worst, test) => {
              const improvement = test.baseline?.duration && test.mcp?.duration
                ? ((test.baseline.duration - test.mcp.duration) / test.baseline.duration * 100)
                : 0;
              return improvement < (worst?.improvement || Infinity) ? { ...test, improvement } : worst;
            }, null)
          }
        };

        return analysis;
      } catch (error) {
        throw new Error(`Failed to analyze performance data: ${error.message}`);
      }
    }
  }
];

export default stepAnalysisTools;