// Codebase Intelligence Engine v2.17.0
// Deep understanding of project patterns, conventions, and architecture

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodebaseIntelligenceEngine {
  constructor(workingDirectory) {
    this.workingDirectory = workingDirectory;
    this.version = '2.17.0';

    // Project intelligence storage
    this.projectIntelligence = {
      patterns: new Map(),
      conventions: new Map(),
      architecture: {},
      commonPractices: new Map(),
      antiPatterns: new Map()
    };

    // Learning history
    this.learningHistory = [];
    this.analysisCache = new Map();
  }

  // Analyze entire codebase to understand project-specific patterns
  async analyzeCodebaseIntelligence(taskContext = {}) {
    const startTime = Date.now();

    console.log('🧠 Analyzing codebase intelligence...');

    // Deep codebase analysis
    const codebaseAnalysis = await this.performDeepCodebaseAnalysis();

    // Pattern recognition
    const patterns = await this.identifyCodePatterns(codebaseAnalysis);

    // Convention detection
    const conventions = await this.detectProjectConventions(codebaseAnalysis);

    // Architecture understanding
    const architecture = await this.analyzeProjectArchitecture(codebaseAnalysis);

    // Integration context
    const integrationContext = await this.buildIntegrationContext(patterns, conventions, architecture);

    const processingTime = Date.now() - startTime;

    const intelligence = {
      codebaseAnalysis,
      patterns,
      conventions,
      architecture,
      integrationContext,
      confidence: this.calculateIntelligenceConfidence(patterns, conventions, architecture),
      timestamp: new Date().toISOString(),
      processingTime
    };

    // Store intelligence for future use
    this.updateProjectIntelligence(intelligence);

    console.log(`✓ Codebase intelligence analysis completed in ${processingTime}ms`);

    return intelligence;
  }

  // Perform comprehensive codebase analysis
  async performDeepCodebaseAnalysis() {
    const analysis = {
      fileStructure: await this.analyzeFileStructure(),
      codeMetrics: await this.calculateCodeMetrics(),
      dependencyGraph: await this.buildDependencyGraph(),
      testingPatterns: await this.analyzeTestingPatterns(),
      configurationFiles: await this.analyzeConfiguration()
    };

    return analysis;
  }

  // Analyze project file structure and organization
  async analyzeFileStructure() {
    try {
      const structure = {
        directories: [],
        fileTypes: new Map(),
        organizationPattern: 'unknown',
        depth: 0
      };

      const walkDirectory = (dir, currentDepth = 0) => {
        if (currentDepth > 10) return; // Prevent infinite recursion

        try {
          const items = fs.readdirSync(dir);
          structure.depth = Math.max(structure.depth, currentDepth);

          items.forEach(item => {
            const itemPath = path.join(dir, item);
            try {
              const stats = fs.statSync(itemPath);

              if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                structure.directories.push({
                  name: item,
                  path: itemPath,
                  depth: currentDepth
                });
                walkDirectory(itemPath, currentDepth + 1);
              } else if (stats.isFile()) {
                const ext = path.extname(item);
                structure.fileTypes.set(ext, (structure.fileTypes.get(ext) || 0) + 1);
              }
            } catch (error) {
              // Skip files that can't be accessed
            }
          });
        } catch (error) {
          // Skip directories that can't be accessed
        }
      };

      walkDirectory(this.workingDirectory);

      // Determine organization pattern
      structure.organizationPattern = this.detectOrganizationPattern(structure);

      return structure;
    } catch (error) {
      return {
        directories: [],
        fileTypes: new Map(),
        organizationPattern: 'unknown',
        depth: 0,
        error: error.message
      };
    }
  }

  // Calculate meaningful code metrics
  async calculateCodeMetrics() {
    const metrics = {
      totalFiles: 0,
      linesOfCode: 0,
      complexity: 'unknown',
      testCoverage: 'unknown',
      technicalDebt: 'low'
    };

    try {
      const jsFiles = this.findFilesByExtension(['.js', '.ts', '.jsx', '.tsx']);

      for (const file of jsFiles.slice(0, 50)) { // Analyze up to 50 files for performance
        try {
          const content = fs.readFileSync(file, 'utf8');
          metrics.totalFiles++;
          metrics.linesOfCode += content.split('\n').length;
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Estimate complexity based on file count and size
      if (metrics.totalFiles > 100 || metrics.linesOfCode > 10000) {
        metrics.complexity = 'high';
      } else if (metrics.totalFiles > 20 || metrics.linesOfCode > 2000) {
        metrics.complexity = 'medium';
      } else {
        metrics.complexity = 'low';
      }

    } catch (error) {
      metrics.error = error.message;
    }

    return metrics;
  }

  // Build dependency graph
  async buildDependencyGraph() {
    const graph = {
      dependencies: new Map(),
      patterns: [],
      architecture: 'unknown'
    };

    try {
      // Analyze package.json if it exists
      const packageJsonPath = path.join(this.workingDirectory, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.dependencies) {
          Object.keys(packageJson.dependencies).forEach(dep => {
            graph.dependencies.set(dep, 'production');
          });
        }

        if (packageJson.devDependencies) {
          Object.keys(packageJson.devDependencies).forEach(dep => {
            graph.dependencies.set(dep, 'development');
          });
        }

        // Detect framework/architecture from dependencies
        graph.architecture = this.detectArchitectureFromDependencies(graph.dependencies);
      }

    } catch (error) {
      graph.error = error.message;
    }

    return graph;
  }

  // Analyze testing patterns
  async analyzeTestingPatterns() {
    const testingAnalysis = {
      framework: 'unknown',
      testFiles: [],
      coverage: 'unknown',
      patterns: []
    };

    try {
      // Look for test files
      const testFiles = this.findFilesByPattern(['test', 'spec', '__tests__']);
      testingAnalysis.testFiles = testFiles.slice(0, 10); // Sample test files

      // Detect testing framework from file contents
      if (testFiles.length > 0) {
        const sampleTestContent = fs.readFileSync(testFiles[0], 'utf8');
        testingAnalysis.framework = this.detectTestingFramework(sampleTestContent);
        testingAnalysis.patterns = this.detectTestPatterns(sampleTestContent);
      }

    } catch (error) {
      testingAnalysis.error = error.message;
    }

    return testingAnalysis;
  }

  // Analyze configuration files
  async analyzeConfiguration() {
    const config = {
      buildSystem: 'unknown',
      linting: 'unknown',
      typescript: false,
      configFiles: []
    };

    try {
      const configFiles = [
        'webpack.config.js', 'vite.config.js', 'rollup.config.js',
        '.eslintrc.js', '.eslintrc.json', 'eslint.config.js',
        'tsconfig.json', 'jsconfig.json',
        '.prettierrc', 'prettier.config.js'
      ];

      configFiles.forEach(configFile => {
        const configPath = path.join(this.workingDirectory, configFile);
        if (fs.existsSync(configPath)) {
          config.configFiles.push(configFile);

          // Determine build system
          if (configFile.includes('webpack')) config.buildSystem = 'webpack';
          else if (configFile.includes('vite')) config.buildSystem = 'vite';
          else if (configFile.includes('rollup')) config.buildSystem = 'rollup';

          // Determine linting
          if (configFile.includes('eslint')) config.linting = 'eslint';

          // Determine TypeScript
          if (configFile.includes('tsconfig')) config.typescript = true;
        }
      });

    } catch (error) {
      config.error = error.message;
    }

    return config;
  }

  // Identify code patterns used in the project
  async identifyCodePatterns(codebaseAnalysis) {
    const patterns = {
      architectural: [],
      naming: [],
      structural: [],
      functional: []
    };

    try {
      const sampleFiles = this.findFilesByExtension(['.js', '.ts']).slice(0, 20);

      for (const file of sampleFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');

          // Detect architectural patterns
          if (content.includes('export class')) patterns.architectural.push('class-based');
          if (content.includes('export function')) patterns.architectural.push('function-based');
          if (content.includes('export default')) patterns.architectural.push('default-exports');

          // Detect naming patterns
          if (/^[a-z][a-zA-Z0-9]*$/.test(this.extractVariableNames(content)[0])) {
            patterns.naming.push('camelCase');
          }

          // Detect structural patterns
          if (content.includes('async ') || content.includes('await ')) {
            patterns.structural.push('async-await');
          }
          if (content.includes('.then(')) patterns.structural.push('promises');

          // Detect functional patterns
          if (content.includes('.map(') || content.includes('.filter(')) {
            patterns.functional.push('array-methods');
          }

        } catch (error) {
          // Skip files that can't be analyzed
        }
      }

      // Remove duplicates and get most common patterns
      Object.keys(patterns).forEach(category => {
        patterns[category] = [...new Set(patterns[category])];
      });

    } catch (error) {
      patterns.error = error.message;
    }

    return patterns;
  }

  // Detect project conventions
  async detectProjectConventions(codebaseAnalysis) {
    const conventions = {
      codingStyle: {},
      fileNaming: {},
      directoryStructure: {},
      imports: {},
      exports: {}
    };

    try {
      const sampleFiles = this.findFilesByExtension(['.js', '.ts']).slice(0, 15);

      let indentationSamples = [];
      let quoteSamples = [];

      for (const file of sampleFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');

          // Analyze indentation
          lines.forEach(line => {
            if (line.trim() && line.startsWith('  ') && !line.startsWith('\t')) {
              indentationSamples.push('spaces');
            } else if (line.trim() && line.startsWith('\t')) {
              indentationSamples.push('tabs');
            }
          });

          // Analyze quote style
          const singleQuotes = (content.match(/'/g) || []).length;
          const doubleQuotes = (content.match(/"/g) || []).length;
          if (singleQuotes > doubleQuotes) quoteSamples.push('single');
          else if (doubleQuotes > singleQuotes) quoteSamples.push('double');

        } catch (error) {
          // Skip files that can't be analyzed
        }
      }

      // Determine conventions
      conventions.codingStyle.indentation = this.getMostCommon(indentationSamples) || 'spaces';
      conventions.codingStyle.quotes = this.getMostCommon(quoteSamples) || 'single';

      // File naming conventions from structure analysis
      if (codebaseAnalysis.fileStructure.directories.length > 0) {
        const dirNames = codebaseAnalysis.fileStructure.directories.map(d => d.name);
        conventions.fileNaming.directories = this.detectNamingConvention(dirNames);
      }

    } catch (error) {
      conventions.error = error.message;
    }

    return conventions;
  }

  // Analyze project architecture
  async analyzeProjectArchitecture(codebaseAnalysis) {
    const architecture = {
      pattern: 'unknown',
      layering: [],
      organization: 'unknown',
      complexity: 'medium',
      scalability: 'unknown'
    };

    try {
      const directories = codebaseAnalysis.fileStructure.directories.map(d => d.name.toLowerCase());
      const dependencies = Array.from(codebaseAnalysis.dependencyGraph.dependencies.keys());

      // Detect architectural patterns
      if (directories.includes('components') && directories.includes('pages')) {
        architecture.pattern = 'component-based';
      } else if (directories.includes('models') && directories.includes('views') && directories.includes('controllers')) {
        architecture.pattern = 'mvc';
      } else if (directories.includes('services') && directories.includes('utils')) {
        architecture.pattern = 'service-oriented';
      }

      // Detect layering
      if (directories.includes('components')) architecture.layering.push('presentation');
      if (directories.includes('services')) architecture.layering.push('business');
      if (directories.includes('models') || directories.includes('data')) architecture.layering.push('data');

      // Detect organization
      if (directories.includes('features') || directories.includes('modules')) {
        architecture.organization = 'feature-based';
      } else if (directories.includes('components') && directories.includes('utils')) {
        architecture.organization = 'layer-based';
      }

      // Estimate complexity and scalability
      const fileCount = codebaseAnalysis.codeMetrics.totalFiles;
      const depCount = dependencies.length;

      if (fileCount > 100 || depCount > 50) {
        architecture.complexity = 'high';
        architecture.scalability = 'enterprise';
      } else if (fileCount > 20 || depCount > 10) {
        architecture.complexity = 'medium';
        architecture.scalability = 'moderate';
      } else {
        architecture.complexity = 'low';
        architecture.scalability = 'simple';
      }

    } catch (error) {
      architecture.error = error.message;
    }

    return architecture;
  }

  // Build integration context for generated code
  async buildIntegrationContext(patterns, conventions, architecture) {
    return {
      codeStyle: {
        indentation: conventions.codingStyle?.indentation || 'spaces',
        quotes: conventions.codingStyle?.quotes || 'single',
        async: patterns.structural?.includes('async-await') ? 'async-await' : 'promises'
      },
      architecturalGuidelines: {
        pattern: architecture.pattern,
        organization: architecture.organization,
        preferredPatterns: patterns.architectural || []
      },
      integrationRules: [
        'Follow existing naming conventions',
        'Use consistent indentation and quotes',
        'Match architectural patterns',
        'Integrate with existing testing framework',
        'Respect directory structure'
      ],
      qualityGates: [
        'Code compiles successfully',
        'Follows project conventions',
        'Integrates with existing architecture',
        'Passes existing tests',
        'Maintains performance standards'
      ]
    };
  }

  // Calculate confidence in intelligence analysis
  calculateIntelligenceConfidence(patterns, conventions, architecture) {
    let confidence = 50; // Base confidence

    // Boost confidence based on successful analysis
    if (patterns.architectural && patterns.architectural.length > 0) confidence += 10;
    if (conventions.codingStyle && Object.keys(conventions.codingStyle).length > 0) confidence += 15;
    if (architecture.pattern && architecture.pattern !== 'unknown') confidence += 20;

    // Boost confidence based on data quality
    if (patterns.structural && patterns.structural.length > 2) confidence += 10;
    if (architecture.organization !== 'unknown') confidence += 10;

    return Math.min(95, Math.max(30, confidence));
  }

  // Update project intelligence storage
  updateProjectIntelligence(intelligence) {
    // Store patterns
    if (intelligence.patterns.architectural) {
      intelligence.patterns.architectural.forEach(pattern => {
        this.projectIntelligence.patterns.set(pattern,
          (this.projectIntelligence.patterns.get(pattern) || 0) + 1
        );
      });
    }

    // Store conventions
    if (intelligence.conventions.codingStyle) {
      Object.entries(intelligence.conventions.codingStyle).forEach(([key, value]) => {
        this.projectIntelligence.conventions.set(key, value);
      });
    }

    // Store architecture insights
    this.projectIntelligence.architecture = {
      ...this.projectIntelligence.architecture,
      ...intelligence.architecture
    };

    // Update learning history
    this.learningHistory.push({
      timestamp: intelligence.timestamp,
      confidence: intelligence.confidence,
      patterns: intelligence.patterns,
      conventions: intelligence.conventions
    });

    // Keep only recent history (last 10 analyses)
    if (this.learningHistory.length > 10) {
      this.learningHistory = this.learningHistory.slice(-10);
    }
  }

  // Generate contextual code recommendations
  generateContextualRecommendations(taskContext, codeToGenerate) {
    const intelligence = this.getLatestIntelligence();

    if (!intelligence) {
      return {
        recommendations: ['Analyze codebase first to provide contextual recommendations'],
        confidence: 0
      };
    }

    const recommendations = [];

    // Style recommendations
    if (intelligence.integrationContext.codeStyle) {
      const style = intelligence.integrationContext.codeStyle;
      recommendations.push(`Use ${style.indentation} for indentation`);
      recommendations.push(`Use ${style.quotes} quotes for strings`);
      recommendations.push(`Use ${style.async} for asynchronous operations`);
    }

    // Architectural recommendations
    if (intelligence.integrationContext.architecturalGuidelines) {
      const arch = intelligence.integrationContext.architecturalGuidelines;
      recommendations.push(`Follow ${arch.pattern} architectural pattern`);
      recommendations.push(`Organize code using ${arch.organization} structure`);
    }

    // Integration recommendations
    recommendations.push(...intelligence.integrationContext.integrationRules);

    return {
      recommendations,
      confidence: intelligence.confidence,
      context: intelligence.integrationContext
    };
  }

  // Get latest intelligence analysis
  getLatestIntelligence() {
    return this.learningHistory.length > 0 ? this.learningHistory[this.learningHistory.length - 1] : null;
  }

  // Helper methods
  findFilesByExtension(extensions) {
    const files = [];

    const walkDirectory = (dir) => {
      try {
        const items = fs.readdirSync(dir);

        items.forEach(item => {
          if (item.startsWith('.') || item === 'node_modules') return;

          const itemPath = path.join(dir, item);
          try {
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
              walkDirectory(itemPath);
            } else if (stats.isFile() && extensions.includes(path.extname(item))) {
              files.push(itemPath);
            }
          } catch (error) {
            // Skip files/directories that can't be accessed
          }
        });
      } catch (error) {
        // Skip directories that can't be accessed
      }
    };

    walkDirectory(this.workingDirectory);
    return files;
  }

  findFilesByPattern(patterns) {
    const files = [];

    const walkDirectory = (dir) => {
      try {
        const items = fs.readdirSync(dir);

        items.forEach(item => {
          if (item.startsWith('.') || item === 'node_modules') return;

          const itemPath = path.join(dir, item);
          try {
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
              if (patterns.some(pattern => item.includes(pattern))) {
                // This is a test directory, look for files in it
                const testDirFiles = fs.readdirSync(itemPath);
                testDirFiles.forEach(testFile => {
                  const testFilePath = path.join(itemPath, testFile);
                  if (fs.statSync(testFilePath).isFile()) {
                    files.push(testFilePath);
                  }
                });
              }
              walkDirectory(itemPath);
            } else if (stats.isFile() && patterns.some(pattern => item.includes(pattern))) {
              files.push(itemPath);
            }
          } catch (error) {
            // Skip files/directories that can't be accessed
          }
        });
      } catch (error) {
        // Skip directories that can't be accessed
      }
    };

    walkDirectory(this.workingDirectory);
    return files;
  }

  detectOrganizationPattern(structure) {
    const dirNames = structure.directories.map(d => d.name.toLowerCase());

    if (dirNames.includes('src') && dirNames.includes('test')) return 'standard';
    if (dirNames.includes('lib') && dirNames.includes('bin')) return 'library';
    if (dirNames.includes('components') && dirNames.includes('pages')) return 'react-app';
    if (dirNames.includes('models') && dirNames.includes('controllers')) return 'mvc';

    return 'custom';
  }

  detectArchitectureFromDependencies(dependencies) {
    const deps = Array.from(dependencies.keys());

    if (deps.includes('react')) return 'react-app';
    if (deps.includes('vue')) return 'vue-app';
    if (deps.includes('express')) return 'node-api';
    if (deps.includes('next')) return 'next-js';
    if (deps.includes('angular')) return 'angular-app';

    return 'javascript-project';
  }

  detectTestingFramework(testContent) {
    if (testContent.includes('describe(') && testContent.includes('it(')) return 'jest/mocha';
    if (testContent.includes('test(')) return 'jest';
    if (testContent.includes('@Test')) return 'junit-style';

    return 'unknown';
  }

  detectTestPatterns(testContent) {
    const patterns = [];

    if (testContent.includes('beforeEach')) patterns.push('setup-teardown');
    if (testContent.includes('mock')) patterns.push('mocking');
    if (testContent.includes('expect')) patterns.push('assertion-based');

    return patterns;
  }

  extractVariableNames(content) {
    const matches = content.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
    return matches ? matches.map(match => match.split(/\s+/)[1]) : [];
  }

  getMostCommon(array) {
    if (array.length === 0) return null;

    const counts = {};
    array.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  detectNamingConvention(names) {
    const conventions = [];

    names.forEach(name => {
      if (/^[a-z][a-zA-Z0-9]*$/.test(name)) conventions.push('camelCase');
      else if (/^[a-z][a-z0-9-]*$/.test(name)) conventions.push('kebab-case');
      else if (/^[a-z][a-z0-9_]*$/.test(name)) conventions.push('snake_case');
      else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) conventions.push('PascalCase');
    });

    return this.getMostCommon(conventions) || 'mixed';
  }

  // Get intelligence summary for display
  getIntelligenceSummary() {
    const latest = this.getLatestIntelligence();

    if (!latest) {
      return {
        status: 'No intelligence analysis available',
        recommendation: 'Run analyzeCodebaseIntelligence() first'
      };
    }

    return {
      confidence: latest.confidence,
      patterns: latest.patterns,
      conventions: latest.conventions,
      learningHistory: this.learningHistory.length,
      lastAnalysis: latest.timestamp
    };
  }
}

export default CodebaseIntelligenceEngine;