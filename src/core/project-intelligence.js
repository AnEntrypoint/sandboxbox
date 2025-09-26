import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

// Project intelligence system with automatic project type detection
export class ProjectIntelligence {
  constructor() {
    this.projectCache = new Map();
    this.projectStructureFile = '.glootie-project-structure.json';
  }

  // Analyze project structure and type
  analyzeProject(workingDirectory) {
    const cacheKey = workingDirectory;

    // Check cache first
    if (this.projectCache.has(cacheKey)) {
      const cached = this.projectCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.analysis;
      }
    }

    const analysis = this.performProjectAnalysis(workingDirectory);

    // Cache the result
    this.projectCache.set(cacheKey, {
      analysis,
      timestamp: Date.now()
    });

    // Save human-readable project structure file
    this.saveProjectStructure(workingDirectory, analysis);

    return analysis;
  }

  performProjectAnalysis(workingDirectory) {
    const analysis = {
      projectType: 'unknown',
      framework: null,
      languages: new Set(),
      buildTools: new Set(),
      packageManagers: new Set(),
      testingFrameworks: new Set(),
      dependencies: new Map(),
      devDependencies: new Map(),
      structure: {
        directories: new Set(),
        files: new Set(),
        configFiles: new Set()
      },
      patterns: {
        hasTypeScript: false,
        hasTests: false,
        hasSrcDir: false,
        hasPublicDir: false,
        monorepo: false,
        hasDocker: false,
        hasCI: false
      },
      recommendations: []
    };

    // Scan directory structure
    this.scanDirectory(workingDirectory, analysis);

    // Analyze package files
    this.analyzePackageFiles(workingDirectory, analysis);

    // Detect project type and framework
    this.detectProjectType(analysis);

    // Generate recommendations
    this.generateRecommendations(analysis);

    return analysis;
  }

  scanDirectory(directory, analysis, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(directory, fullPath);

        if (entry.isFile()) {
          analysis.structure.files.add(relativePath);

          // Detect config files
          if (this.isConfigFile(entry.name)) {
            analysis.structure.configFiles.add(relativePath);
          }

          // Analyze file extensions for language detection
          const ext = path.extname(entry.name).toLowerCase();
          if (ext) {
            analysis.languages.add(this.mapExtensionToLanguage(ext));
          }

        } else if (entry.isDirectory()) {
          analysis.structure.directories.add(relativePath);

          // Skip certain directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }

          // Check for common patterns
          if (entry.name === 'src') analysis.patterns.hasSrcDir = true;
          if (entry.name === 'public') analysis.patterns.hasPublicDir = true;
          if (entry.name === 'tests' || entry.name === 'test' || entry.name === '__tests__') {
            analysis.patterns.hasTests = true;
          }
          if (entry.name === 'packages' || entry.name === 'apps') {
            analysis.patterns.monorepo = true;
          }

          // Recursively scan subdirectories
          this.scanDirectory(fullPath, analysis, depth + 1, maxDepth);
        }
      }
    } catch (error) {
      // Ignore directories that can't be read
    }
  }

  analyzePackageFiles(workingDirectory, analysis) {
    const packageFiles = ['package.json', 'pnpm-workspace.yaml', ' Cargo.toml', 'go.mod', 'requirements.txt', 'pyproject.toml'];

    packageFiles.forEach(filename => {
      const filePath = path.join(workingDirectory, filename);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          this.parsePackageFile(filename, content, analysis);
        } catch (error) {
          // Ignore files that can't be read
        }
      }
    });
  }

  parsePackageFile(filename, content, analysis) {
    switch (filename) {
      case 'package.json':
        this.parsePackageJson(content, analysis);
        break;
      case 'Cargo.toml':
        analysis.languages.add('rust');
        break;
      case 'go.mod':
        analysis.languages.add('go');
        break;
      case 'requirements.txt':
      case 'pyproject.toml':
        analysis.languages.add('python');
        break;
    }
  }

  parsePackageJson(content, analysis) {
    try {
      const pkg = JSON.parse(content);

      // Detect dependencies
      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach(dep => {
          analysis.dependencies.set(dep, pkg.dependencies[dep]);
          this.detectFrameworkFromDependency(dep, analysis);
        });
      }

      if (pkg.devDependencies) {
        Object.keys(pkg.devDependencies).forEach(dep => {
          analysis.devDependencies.set(dep, pkg.devDependencies[dep]);
          this.detectBuildToolFromDependency(dep, analysis);
          this.detectTestingFrameworkFromDependency(dep, analysis);
        });
      }

      // Detect package managers
      if (existsSync(path.join(path.dirname(content), 'pnpm-lock.yaml'))) {
        analysis.packageManagers.add('pnpm');
      } else if (existsSync(path.join(path.dirname(content), 'yarn.lock'))) {
        analysis.packageManagers.add('yarn');
      } else {
        analysis.packageManagers.add('npm');
      }

      // Check for TypeScript
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
        analysis.patterns.hasTypeScript = true;
        analysis.languages.add('typescript');
      }

    } catch (error) {
      // Invalid JSON, ignore
    }
  }

  detectFrameworkFromDependency(dep, analysis) {
    const frameworkMap = {
      'react': 'react',
      'next': 'nextjs',
      'vue': 'vue',
      'angular': 'angular',
      'svelte': 'svelte',
      'express': 'express',
      'fastify': 'fastify',
      'koa': 'koa',
      'nestjs': 'nestjs',
      'electron': 'electron',
      'astro': 'astro',
      'remix': 'remix',
      'gatsby': 'gatsby'
    };

    const framework = frameworkMap[dep.toLowerCase()];
    if (framework) {
      analysis.framework = framework;
    }
  }

  detectBuildToolFromDependency(dep, analysis) {
    const buildTools = {
      'webpack': 'webpack',
      'vite': 'vite',
      'rollup': 'rollup',
      'esbuild': 'esbuild',
      'parcel': 'parcel',
      'babel': 'babel',
      'typescript': 'typescript',
      'postcss': 'postcss',
      'tailwindcss': 'tailwindcss'
    };

    const tool = buildTools[dep.toLowerCase()];
    if (tool) {
      analysis.buildTools.add(tool);
    }
  }

  detectTestingFrameworkFromDependency(dep, analysis) {
    const testingFrameworks = {
      'jest': 'jest',
      'mocha': 'mocha',
      'jasmine': 'jasmine',
      'cypress': 'cypress',
      'playwright': 'playwright',
      'vitest': 'vitest',
      'testing-library': 'testing-library',
      'supertest': 'supertest',
      'chai': 'chai',
      'sinon': 'sinon'
    };

    const framework = testingFrameworks[dep.toLowerCase()];
    if (framework) {
      analysis.testingFrameworks.add(framework);
    }
  }

  detectProjectType(analysis) {
    const languages = Array.from(analysis.languages);
    const framework = analysis.framework;

    // Web frameworks
    if (['nextjs', 'react', 'vue', 'angular', 'svelte'].includes(framework)) {
      analysis.projectType = 'web-application';
    }
    // Backend frameworks
    else if (['express', 'fastify', 'koa', 'nestjs'].includes(framework)) {
      analysis.projectType = 'backend-api';
    }
    // Desktop apps
    else if (framework === 'electron') {
      analysis.projectType = 'desktop-application';
    }
    // Static sites
    else if (['astro', 'gatsby', 'remix'].includes(framework)) {
      analysis.projectType = 'static-site';
    }
    // Language-specific projects
    else if (languages.includes('rust')) {
      analysis.projectType = 'rust-application';
    }
    else if (languages.includes('go')) {
      analysis.projectType = 'go-application';
    }
    else if (languages.includes('python')) {
      analysis.projectType = 'python-application';
    }
    // Monorepo
    else if (analysis.patterns.monorepo) {
      analysis.projectType = 'monorepo';
    }
    // Node.js library
    else if (languages.includes('javascript') || languages.includes('typescript')) {
      analysis.projectType = 'node-library';
    }

    // Detect Docker and CI
    analysis.patterns.hasDocker = analysis.structure.configFiles.has('Dockerfile');
    analysis.patterns.hasCI = Array.from(analysis.structure.configFiles).some(file =>
      file.includes('.github') || file.includes('.gitlab-ci') || file.includes('travis')
    );
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // TypeScript recommendations
    if (analysis.patterns.hasTypeScript) {
      recommendations.push('✅ TypeScript detected - Ensure proper type checking and configuration');
    } else if (analysis.languages.has('javascript')) {
      recommendations.push('💡 Consider adding TypeScript for better type safety');
    }

    // Testing recommendations
    if (analysis.patterns.hasTests) {
      if (analysis.testingFrameworks.size === 0) {
        recommendations.push('🧪 Tests found but no testing framework detected');
      } else {
        recommendations.push(`✅ Testing with ${Array.from(analysis.testingFrameworks).join(', ')}`);
      }
    } else {
      recommendations.push('🧪 Consider adding tests for better code quality');
    }

    // Build tool recommendations
    if (analysis.buildTools.size === 0 && analysis.languages.has('javascript')) {
      recommendations.push('🔧 Consider adding a build tool like Vite or Webpack');
    }

    // Framework-specific recommendations
    if (analysis.framework === 'nextjs') {
      recommendations.push('🚀 Next.js project detected - Consider using app router for new features');
    }

    // Docker recommendations
    if (analysis.patterns.hasDocker) {
      recommendations.push('🐳 Docker detected - Containerization ready');
    } else {
      recommendations.push('🐳 Consider adding Docker for containerization');
    }

    // CI/CD recommendations
    if (analysis.patterns.hasCI) {
      recommendations.push('🔄 CI/CD pipeline detected');
    } else {
      recommendations.push('🔄 Consider adding CI/CD pipeline for automation');
    }

    analysis.recommendations = recommendations;
  }

  saveProjectStructure(workingDirectory, analysis) {
    const structurePath = path.join(workingDirectory, this.projectStructureFile);

    // Convert Sets to Arrays for JSON serialization
    const serializableAnalysis = {
      ...analysis,
      languages: Array.from(analysis.languages),
      buildTools: Array.from(analysis.buildTools),
      packageManagers: Array.from(analysis.packageManagers),
      testingFrameworks: Array.from(analysis.testingFrameworks),
      dependencies: Array.from(analysis.dependencies.entries()),
      devDependencies: Array.from(analysis.devDependencies.entries()),
      structure: {
        directories: Array.from(analysis.structure.directories),
        files: Array.from(analysis.structure.files),
        configFiles: Array.from(analysis.structure.configFiles)
      },
      lastAnalyzed: Date.now()
    };

    try {
      writeFileSync(structurePath, JSON.stringify(serializableAnalysis, null, 2));
    } catch (error) {
      // Ignore write errors
    }
  }

  // Helper methods
  isConfigFile(filename) {
    const configFiles = [
      'package.json', 'tsconfig.json', 'jsconfig.json', 'webpack.config.js',
      'vite.config.js', 'tailwind.config.js', '.eslintrc', '.prettierrc',
      'Dockerfile', 'docker-compose.yml', 'Cargo.toml', 'go.mod',
      'requirements.txt', 'pyproject.toml', 'pom.xml', 'build.gradle'
    ];

    return configFiles.includes(filename) ||
           filename.startsWith('.') ||
           filename.endsWith('.config.js') ||
           filename.endsWith('.config.ts');
  }

  shouldSkipDirectory(dirname) {
    const skipDirs = [
      'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'target',
      'coverage', '.cache', 'tmp', 'temp', '.vscode', '.idea'
    ];

    return skipDirs.includes(dirname) || dirname.startsWith('.');
  }

  mapExtensionToLanguage(ext) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.java': 'java',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'bash',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less'
    };

    return languageMap[ext] || 'unknown';
  }

  // Get formatted project summary
  getProjectSummary(workingDirectory) {
    const analysis = this.analyzeProject(workingDirectory);

    return {
      projectType: analysis.projectType,
      framework: analysis.framework,
      languages: Array.from(analysis.languages),
      buildTools: Array.from(analysis.buildTools),
      packageManagers: Array.from(analysis.packageManagers),
      keyPatterns: {
        hasTypeScript: analysis.patterns.hasTypeScript,
        hasTests: analysis.patterns.hasTests,
        hasDocker: analysis.patterns.hasDocker,
        monorepo: analysis.patterns.monorepo
      },
      recommendations: analysis.recommendations.slice(0, 5), // Top 5 recommendations
      structureSummary: {
        totalFiles: analysis.structure.files.size,
        totalDirectories: analysis.structure.directories.size,
        configFiles: Array.from(analysis.structure.configFiles).slice(0, 10)
      }
    };
  }
}

// Global instance
export const projectIntelligence = new ProjectIntelligence();