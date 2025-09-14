// Attention Optimization Engine v2.15.0
// Advanced context management and attention window optimization

class AttentionOptimizationEngine {
  constructor() {
    this.relevanceScorer = new RelevanceScorer();
    this.progressiveSummarizer = new ProgressiveSummarizer();
    this.contextRecommender = new ContextAwareRecommender();
    this.adaptiveContextManager = new AdaptiveContextManager();

    this.optimizationStrategies = new Map([
      ['relevance_scoring', this.optimizeRelevanceScoring.bind(this)],
      ['progressive_summarization', this.optimizeProgressiveSummarization.bind(this)],
      ['context_aware_recommendations', this.optimizeContextAwareRecommendations.bind(this)],
      ['adaptive_context_windows', this.optimizeAdaptiveContextWindows.bind(this)]
    ]);

    this.performanceMetrics = {
      optimizationTime: [],
      tokenReduction: [],
      qualityImprovement: [],
      attentionEfficiency: []
    };
  }

  async optimizeAttention(taskContext, availableTools, conversationHistory = []) {
    const startTime = Date.now();

    // Step 1: Analyze task complexity and context requirements
    const complexityAnalysis = this.adaptiveContextManager.analyzeTaskComplexity(
      taskContext.currentTask,
      conversationHistory
    );

    // Step 2: Apply relevance-based content prioritization
    const relevanceOptimization = await this.optimizeRelevanceScoring(taskContext);

    // Step 3: Apply progressive summarization for large content
    const summarizationOptimization = await this.optimizeProgressiveSummarization(taskContext);

    // Step 4: Generate context-aware tool recommendations
    const recommendationOptimization = await this.optimizeContextAwareRecommendations(
      taskContext,
      conversationHistory
    );

    // Step 5: Apply adaptive context window sizing
    const contextOptimization = this.adaptiveContextManager.optimizeContext(
      taskContext.content || '',
      taskContext.currentTask,
      conversationHistory
    );

    const optimizationTime = Date.now() - startTime;

    // Calculate overall improvements
    const overallImprovements = this.calculateOverallImprovements({
      relevance: relevanceOptimization,
      summarization: summarizationOptimization,
      recommendations: recommendationOptimization,
      context: contextOptimization
    });

    // Update performance metrics
    this.updatePerformanceMetrics({
      optimizationTime,
      tokenReduction: overallImprovements.tokenReduction,
      qualityImprovement: overallImprovements.qualityImprovement,
      attentionEfficiency: overallImprovements.attentionEfficiency
    });

    return {
      originalContext: {
        tokens: taskContext.content ? taskContext.content.length / 4 : 0,
        complexity: complexityAnalysis.complexity,
        score: complexityAnalysis.score
      },
      optimizedContext: {
        tokens: contextOptimization.optimizedTokens,
        profile: contextOptimization.profile,
        compressionApplied: contextOptimization.compressionApplied
      },
      toolRecommendations: recommendationOptimization,
      contentPrioritization: relevanceOptimization,
      summarization: summarizationOptimization,
      overallImprovements,
      performance: {
        optimizationTime: optimizationTime + 'ms',
        averageOptimizationTime: this.getAverageOptimizationTime(),
        tokenReduction: overallImprovements.tokenReduction + '%',
        qualityImprovement: overallImprovements.qualityImprovement + '%',
        attentionEfficiency: overallImprovements.attentionEfficiency + '%'
      }
    };
  }

  async optimizeRelevanceScoring(taskContext) {
    if (!taskContext.content) return { applied: false, reason: 'No content to score' };

    const scoring = this.relevanceScorer.scoreContent(taskContext.content);
    const prioritization = this.relevanceScorer.prioritizeChunks(taskContext.content, 50);

    return {
      applied: true,
      totalScore: scoring.totalScore,
      averageScore: scoring.averageScore,
      highPriorityLines: scoring.lineScores.filter(item => item.score > 5).length,
      estimatedImprovement: Math.min(scoring.totalScore / scoring.lineScores.length * 10, 40).toFixed(1) + '%'
    };
  }

  async optimizeProgressiveSummarization(taskContext) {
    if (!taskContext.content) return { applied: false, reason: 'No content to summarize' };

    const reduction = this.progressiveSummarizer.estimateReduction(taskContext.content);
    const summary = this.progressiveSummarizer.generateProgressiveSummary(taskContext.content, 'medium');

    return {
      applied: true,
      originalTokens: reduction.originalTokens,
      summaryTokens: reduction.summaryTokens,
      reduction: reduction.reductionPercentage + '%',
      followupQueriesReduced: reduction.followupQueriesReduced,
      summaryPoints: summary.points.length,
      estimatedImprovement: reduction.reductionPercentage + '%'
    };
  }

  async optimizeContextAwareRecommendations(taskContext, conversationHistory) {
    const analysis = this.contextRecommender.analyzeContext(
      conversationHistory,
      taskContext.currentTask
    );
    const recommendation = this.contextRecommender.generateRecommendation(analysis);

    return {
      applied: true,
      topRecommendations: recommendation.recommendedTools.slice(0, 3),
      confidence: recommendation.confidence,
      estimatedImprovement: recommendation.estimatedImprovement,
      reasoning: recommendation.reasoning
    };
  }

  optimizeAdaptiveContextWindows(taskContext) {
    // This is handled by the adaptiveContextManager in the main optimization
    return { applied: false, reason: 'Handled in main optimization' };
  }

  calculateOverallImprovements(optimizations) {
    const improvements = [];

    if (optimizations.relevance.applied) {
      improvements.push(parseFloat(optimizations.relevance.estimatedImprovement));
    }

    if (optimizations.summarization.applied) {
      improvements.push(parseFloat(optimizations.summarization.estimatedImprovement));
    }

    if (optimizations.recommendations.applied) {
      improvements.push(parseFloat(optimizations.recommendations.estimatedImprovement));
    }

    if (optimizations.context.reductionPercentage > 0) {
      improvements.push(optimizations.context.reductionPercentage);
    }

    const avgImprovement = improvements.length > 0
      ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
      : 0;

    // Calculate weighted improvements
    const tokenReduction = Math.min(avgImprovement * 1.2, 85); // Cap at 85%
    const qualityImprovement = Math.min(avgImprovement * 0.8, 50); // Cap at 50%
    const attentionEfficiency = Math.min(avgImprovement * 1.5, 75); // Cap at 75%

    return {
      tokenReduction: tokenReduction.toFixed(1),
      qualityImprovement: qualityImprovement.toFixed(1),
      attentionEfficiency: attentionEfficiency.toFixed(1)
    };
  }

  updatePerformanceMetrics(metrics) {
    this.performanceMetrics.optimizationTime.push(metrics.optimizationTime);
    this.performanceMetrics.tokenReduction.push(parseFloat(metrics.tokenReduction));
    this.performanceMetrics.qualityImprovement.push(parseFloat(metrics.qualityImprovement));
    this.performanceMetrics.attentionEfficiency.push(parseFloat(metrics.attentionEfficiency));

    // Keep only last 100 measurements
    Object.keys(this.performanceMetrics).forEach(key => {
      if (this.performanceMetrics[key].length > 100) {
        this.performanceMetrics[key] = this.performanceMetrics[key].slice(-100);
      }
    });
  }

  getAverageOptimizationTime() {
    const times = this.performanceMetrics.optimizationTime;
    return times.length > 0
      ? (times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(2) + 'ms'
      : '0ms';
  }

  getPerformanceSummary() {
    const summary = {};

    Object.keys(this.performanceMetrics).forEach(key => {
      const values = this.performanceMetrics[key];
      if (values.length > 0) {
        summary[key] = {
          average: (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2),
          min: Math.min(...values).toFixed(2),
          max: Math.max(...values).toFixed(2),
          count: values.length
        };
      }
    });

    return summary;
  }
}

// Relevance Scoring Class
class RelevanceScorer {
  constructor() {
    this.keywords = {
      high: ['error', 'bug', 'fix', 'critical', 'important', 'key', 'main', 'core', 'function', 'class', 'export'],
      medium: ['method', 'variable', 'const', 'let', 'var', 'return', 'async', 'await'],
      low: ['comment', 'log', 'debug', 'console', 'print', 'todo', 'fixme']
    };
  }

  scoreContent(content) {
    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const lines = contentStr.split('\n');
    let totalScore = 0;
    let lineScores = [];

    lines.forEach((line, index) => {
      let score = 0;
      const lowerLine = line.toLowerCase();

      // High priority keywords
      this.keywords.high.forEach(keyword => {
        if (lowerLine.includes(keyword)) score += 3;
      });

      // Medium priority keywords
      this.keywords.medium.forEach(keyword => {
        if (lowerLine.includes(keyword)) score += 2;
      });

      // Low priority keywords
      this.keywords.low.forEach(keyword => {
        if (lowerLine.includes(keyword)) score += 1;
      });

      // Code structure bonus
      if (line.includes('function') || line.includes('class') || line.includes('export')) {
        score += 4;
      }

      // Error handling bonus
      if (lowerLine.includes('try') || lowerLine.includes('catch') || lowerLine.includes('error')) {
        score += 3;
      }

      lineScores.push({ line: index + 1, score, content: line.trim() });
      totalScore += score;
    });

    return { totalScore, lineScores, averageScore: totalScore / lines.length };
  }

  prioritizeChunks(content, chunkSize = 50) {
    const scoring = this.scoreContent(content);
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const lines = contentStr.split('\n');

    const sortedLines = scoring.lineScores.sort((a, b) => b.score - a.score);

    const chunks = [];
    for (let i = 0; i < sortedLines.length; i += chunkSize) {
      const chunk = sortedLines.slice(i, i + chunkSize);
      chunks.push({
        priority: i / chunkSize,
        lines: chunk,
        totalScore: chunk.reduce((sum, item) => sum + item.score, 0),
        averageScore: chunk.reduce((sum, item) => sum + item.score, 0) / chunk.length
      });
    }

    return { chunks, scoring };
  }
}

// Progressive Summarizer Class
class ProgressiveSummarizer {
  constructor() {
    this.summarizationPatterns = {
      keyFunctions: /function\s+(\w+)\s*\([^)]*\)\s*{[^}]*}/g,
      keyClasses: /class\s+(\w+)[^{]*{[^}]*}/g,
      keyVariables: /(?:const|let|var)\s+(\w+)\s*=\s*([^;]+)/g,
      errorHandling: /try\s*{[^}]*}\s*catch\s*\([^)]*\)\s*{[^}]*}/g,
      imports: /import\s+.*?\s+from\s+['\"][^'\"]*['\"]/g,
      exports: /export\s+(?:default\s+)?(?:function|class|const|let|var)/g
    };
  }

  extractKeyPoints(content, maxPoints = 10) {
    const keyPoints = [];

    // Extract functions
    const functions = [];
    let match;
    while ((match = this.summarizationPatterns.keyFunctions.exec(content)) !== null) {
      functions.push({
        type: 'function',
        name: match[1],
        signature: match[0].substring(0, Math.min(match[0].indexOf('{') + 50, match[0].length)),
        line: this.getLineNumber(content, match.index)
      });
    }

    // Extract classes
    const classes = [];
    this.summarizationPatterns.keyClasses.lastIndex = 0;
    while ((match = this.summarizationPatterns.keyClasses.exec(content)) !== null) {
      classes.push({
        type: 'class',
        name: match[1],
        signature: match[0].substring(0, Math.min(match[0].indexOf('{') + 100, match[0].length)),
        line: this.getLineNumber(content, match.index)
      });
    }

    // Combine and prioritize
    const allPoints = [
      ...functions.map(f => ({ ...f, priority: 5 })),
      ...classes.map(c => ({ ...c, priority: 4 }))
    ];

    allPoints.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.line - b.line;
    });

    return allPoints.slice(0, maxPoints);
  }

  getLineNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  generateProgressiveSummary(content, detailLevel = 'medium') {
    const keyPoints = this.extractKeyPoints(content);

    const summaries = {
      minimal: {
        title: "Code Structure Overview",
        points: keyPoints.slice(0, 3).map(p => p.type + ': ' + p.name),
        totalElements: keyPoints.length
      },
      medium: {
        title: "Key Code Elements",
        points: keyPoints.slice(0, 6).map(p => p.type + ': ' + p.name + ' (line ' + p.line + ')'),
        totalElements: keyPoints.length
      },
      detailed: {
        title: "Comprehensive Code Analysis",
        points: keyPoints.map(p => p.type + ': ' + p.name + ' (line ' + p.line + ') - ' + (p.signature || '')),
        totalElements: keyPoints.length
      }
    };

    return summaries[detailLevel] || summaries.medium;
  }

  estimateReduction(content) {
    const originalTokens = content.length / 4;
    const summary = this.generateProgressiveSummary(content);
    const summaryTokens = JSON.stringify(summary).length / 4;
    const reduction = ((originalTokens - summaryTokens) / originalTokens) * 100;

    return {
      originalTokens: Math.round(originalTokens),
      summaryTokens: Math.round(summaryTokens),
      reductionPercentage: reduction.toFixed(1),
      followupQueriesReduced: Math.round(reduction / 10)
    };
  }
}

// Context Aware Recommender Class
class ContextAwareRecommender {
  constructor() {
    this.toolPatterns = {
      searchcode: {
        keywords: ['find', 'search', 'look for', 'locate', 'discover', 'explore', 'understand', 'analyze'],
        patterns: ['codebase', 'project', 'files', 'directory', 'structure'],
        confidence: 0.9
      },
      astgrep_search: {
        keywords: ['pattern', 'match', 'structure', 'syntax', 'ast', 'parse', 'specific', 'exact'],
        patterns: ['function', 'class', 'variable', 'method', 'declaration', 'definition'],
        confidence: 0.85
      },
      batch_execute: {
        keywords: ['multiple', 'several', 'together', 'coordinate', 'combine', 'batch', 'parallel'],
        patterns: ['at once', 'in parallel', 'simultaneously', 'together', 'coordinated'],
        confidence: 0.8
      },
      sequentialthinking: {
        keywords: ['plan', 'analyze', 'think', 'strategy', 'approach', 'complex', 'step', 'phase'],
        patterns: ['step by step', 'systematic', 'methodical', 'structured', 'organized'],
        confidence: 0.75
      },
      executebash: {
        keywords: ['run', 'execute', 'command', 'bash', 'shell', 'terminal', 'system', 'install'],
        patterns: ['npm', 'node', 'python', 'build', 'test', 'deploy'],
        confidence: 0.7
      }
    };

    this.contextWeights = {
      recentTools: 0.3,
      keywordMatch: 0.4,
      patternMatch: 0.2,
      taskComplexity: 0.1
    };
  }

  analyzeContext(conversationHistory, currentTask) {
    const analysis = {
      keywords: this.extractKeywords(currentTask),
      patterns: this.extractPatterns(currentTask),
      recentTools: this.getRecentTools(conversationHistory),
      complexity: this.assessComplexity(currentTask),
      suggestedTools: []
    };

    Object.keys(this.toolPatterns).forEach(toolName => {
      const tool = this.toolPatterns[toolName];
      let score = 0;

      const keywordMatches = analysis.keywords.filter(keyword =>
        tool.keywords.some(k => keyword.includes(k) || k.includes(keyword))
      ).length;
      score += keywordMatches * this.contextWeights.keywordMatch;

      const patternMatches = analysis.patterns.filter(pattern =>
        tool.patterns.some(p => pattern.includes(p) || p.includes(pattern))
      ).length;
      score += patternMatches * this.contextWeights.patternMatch;

      if (analysis.recentTools.includes(toolName)) {
        score += this.contextWeights.recentTools;
      }

      if (analysis.complexity > 0.7 && ['sequentialthinking', 'batch_execute'].includes(toolName)) {
        score += this.contextWeights.taskComplexity;
      }

      score *= tool.confidence;

      analysis.suggestedTools.push({
        name: toolName,
        score: score,
        confidence: tool.confidence,
        reasoning: this.generateReasoning(toolName, keywordMatches, patternMatches, analysis)
      });
    });

    analysis.suggestedTools.sort((a, b) => b.score - a.score);
    return analysis;
  }

  extractKeywords(task) {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = task.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)];
  }

  extractPatterns(task) {
    const patterns = [];

    if (task.includes('function') || task.includes('method')) patterns.push('function');
    if (task.includes('class') || task.includes('object')) patterns.push('class');
    if (task.includes('variable') || task.includes('const') || task.includes('let')) patterns.push('variable');
    if (task.includes('error') || task.includes('exception')) patterns.push('error');
    if (task.includes('test') || task.includes('spec')) patterns.push('test');
    if (task.includes('build') || task.includes('compile')) patterns.push('build');
    if (task.includes('deploy') || task.includes('publish')) patterns.push('deploy');

    return patterns;
  }

  getRecentTools(conversationHistory) {
    const recentTools = [];
    const recentMessages = conversationHistory.slice(-5);

    recentMessages.forEach(message => {
      if (message.tool_calls) {
        message.tool_calls.forEach(call => {
          if (call.function && call.function.name) {
            recentTools.push(call.function.name);
          }
        });
      }
    });

    return [...new Set(recentTools)];
  }

  assessComplexity(task) {
    const complexityIndicators = [
      'multiple', 'several', 'complex', 'advanced', 'comprehensive', 'integrate',
      'architecture', 'system', 'framework', 'optimize', 'refactor'
    ];

    const matches = complexityIndicators.filter(indicator =>
      task.toLowerCase().includes(indicator)
    ).length;

    return Math.min(matches * 0.2, 1.0);
  }

  generateReasoning(toolName, keywordMatches, patternMatches, analysis) {
    const reasons = [];

    if (keywordMatches > 0) reasons.push(keywordMatches + ' keyword matches');
    if (patternMatches > 0) reasons.push(patternMatches + ' pattern matches');
    if (analysis.recentTools.includes(toolName)) reasons.push('recently used');
    if (analysis.complexity > 0.7 && ['sequentialthinking', 'batch_execute'].includes(toolName)) {
      reasons.push('high complexity task');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'general recommendation';
  }

  generateRecommendation(analysis) {
    const topTools = analysis.suggestedTools.slice(0, 3);

    return {
      recommendedTools: topTools,
      reasoning: this.generateOverallReasoning(topTools, analysis),
      confidence: this.calculateOverallConfidence(topTools),
      estimatedImprovement: this.estimateImprovement(topTools)
    };
  }

  generateOverallReasoning(topTools, analysis) {
    if (topTools.length === 0) return 'No specific tools recommended';

    const primaryTool = topTools[0];
    let reasoning = 'Primary: ' + primaryTool.name + ' (' + primaryTool.reasoning + ')';

    if (topTools.length > 1) {
      reasoning += ', Secondary: ' + topTools[1].name + ' (' + topTools[1].reasoning + ')';
    }

    if (analysis.complexity > 0.7) {
      reasoning += ' - Complex task detected';
    }

    return reasoning;
  }

  calculateOverallConfidence(topTools) {
    if (topTools.length === 0) return 0;

    const avgConfidence = topTools.reduce((sum, tool) => sum + tool.confidence, 0) / topTools.length;
    return (avgConfidence * 100).toFixed(1) + '%';
  }

  estimateImprovement(topTools) {
    const baseImprovement = 0.3;

    const toolBonus = topTools.reduce((sum, tool) => {
      if (['batch_execute', 'sequentialthinking'].includes(tool.name)) return sum + 0.2;
      if (['searchcode', 'astgrep_search'].includes(tool.name)) return sum + 0.15;
      return sum + 0.1;
    }, 0);

    const totalImprovement = Math.min(baseImprovement + toolBonus, 0.8);

    return (totalImprovement * 100).toFixed(1) + '%';
  }
}

// Adaptive Context Manager Class
class AdaptiveContextManager {
  constructor() {
    this.contextProfiles = {
      minimal: {
        maxTokens: 2000,
        detailLevel: 'minimal',
        compressionRatio: 0.7,
        useProgressiveSummarization: true
      },
      standard: {
        maxTokens: 4000,
        detailLevel: 'medium',
        compressionRatio: 0.8,
        useProgressiveSummarization: true
      },
      extended: {
        maxTokens: 8000,
        detailLevel: 'medium',
        compressionRatio: 0.9,
        useProgressiveSummarization: false
      },
      comprehensive: {
        maxTokens: 16000,
        detailLevel: 'detailed',
        compressionRatio: 1.0,
        useProgressiveSummarization: false
      }
    };

    this.complexityIndicators = {
      low: ['simple', 'basic', 'quick', 'easy', 'small', 'single', 'find', 'get'],
      medium: ['implement', 'create', 'build', 'add', 'update', 'modify', 'integrate'],
      high: ['complex', 'advanced', 'comprehensive', 'system', 'architecture', 'optimize', 'refactor', 'multiple', 'several']
    };
  }

  analyzeTaskComplexity(task, conversationHistory) {
    const analysis = {
      complexity: 'medium',
      score: 0.5,
      indicators: [],
      recommendedProfile: 'standard'
    };

    const lowerTask = task.toLowerCase();
    let complexityScore = 0;

    Object.entries(this.complexityIndicators).forEach(([level, indicators]) => {
      const matches = indicators.filter(indicator => lowerTask.includes(indicator)).length;

      if (matches > 0) {
        analysis.indicators.push({ level, matches, indicators: indicators.filter(i => lowerTask.includes(i)) });

        switch (level) {
          case 'low':
            complexityScore += matches * 0.1;
            break;
          case 'medium':
            complexityScore += matches * 0.2;
            break;
          case 'high':
            complexityScore += matches * 0.3;
            break;
        }
      }
    });

    const historyLength = conversationHistory.length;
    if (historyLength > 20) complexityScore += 0.2;
    else if (historyLength > 10) complexityScore += 0.1;

    if (task.length > 500) complexityScore += 0.15;
    else if (task.length > 200) complexityScore += 0.1;

    const technicalTerms = ['api', 'database', 'algorithm', 'architecture', 'framework', 'microservice', 'authentication', 'deployment'];
    const technicalMatches = technicalTerms.filter(term => lowerTask.includes(term)).length;
    complexityScore += technicalMatches * 0.1;

    analysis.score = Math.min(complexityScore, 1.0);

    if (analysis.score < 0.3) {
      analysis.complexity = 'low';
      analysis.recommendedProfile = 'minimal';
    } else if (analysis.score < 0.6) {
      analysis.complexity = 'medium';
      analysis.recommendedProfile = 'standard';
    } else if (analysis.score < 0.8) {
      analysis.complexity = 'high';
      analysis.recommendedProfile = 'extended';
    } else {
      analysis.complexity = 'very-high';
      analysis.recommendedProfile = 'comprehensive';
    }

    return analysis;
  }

  optimizeContext(content, task, conversationHistory) {
    const complexityAnalysis = this.analyzeTaskComplexity(task, conversationHistory);
    const profile = this.contextProfiles[complexityAnalysis.recommendedProfile];

    const optimization = {
      originalTokens: content.length / 4,
      optimizedContent: content,
      optimizedTokens: 0,
      reductionPercentage: 0,
      profile: complexityAnalysis.recommendedProfile,
      compressionApplied: false
    };

    if (profile.useProgressiveSummarization && optimization.originalTokens > profile.maxTokens) {
      const compressionRatio = profile.compressionRatio;
      const targetTokens = profile.maxTokens * compressionRatio;

      if (optimization.originalTokens > targetTokens) {
        const lines = content.split('\n');
        const targetLines = Math.floor(lines.length * (targetTokens / optimization.originalTokens));

        const prioritizedLines = this.prioritizeLines(lines);
        optimization.optimizedContent = prioritizedLines.slice(0, targetLines).join('\n');
        optimization.compressionApplied = true;
      }
    }

    optimization.optimizedTokens = optimization.optimizedContent.length / 4;
    optimization.reductionPercentage = ((optimization.originalTokens - optimization.optimizedTokens) / optimization.originalTokens) * 100;

    return optimization;
  }

  prioritizeLines(lines) {
    const lineScores = lines.map((line, index) => {
      let score = 0;
      const lowerLine = line.toLowerCase();

      if (line.includes('function') || line.includes('class') || line.includes('export')) score += 10;
      if (lowerLine.includes('error') || lowerLine.includes('catch') || lowerLine.includes('try')) score += 8;
      if (line.includes('import') || line.includes('require')) score += 7;
      if (line.includes('const') || line.includes('let') || line.includes('var')) score += 5;
      if (line.includes('return') || line.includes('async') || line.includes('await')) score += 4;
      if (lowerLine.includes('console') || lowerLine.includes('debug') || lowerLine.includes('log')) score += 1;
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) score += 2;
      if (line.trim() === '') score -= 1;

      return { line, score, index };
    });

    return lineScores.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.index - b.index;
    }).map(item => item.line);
  }
}

export { AttentionOptimizationEngine };