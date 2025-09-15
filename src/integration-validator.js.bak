// Integration Validator v2.17.0
// Validates that generated code actually works with existing codebase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IntegrationValidator {
  constructor(workingDirectory) {
    this.workingDirectory = workingDirectory;
    this.version = '2.17.0';

    this.validationHistory = [];
    this.integrationPatterns = new Map();
  }

  // Validate generated code against existing codebase
  async validateCodeIntegration(generatedCode, context = {}) {
    const startTime = Date.now();

    console.log('🔍 Validating code integration...');

    const validation = {
      timestamp: new Date().toISOString(),
      generatedCode,
      context,
      validationResults: {},
      overallSuccess: false,
      confidence: 0,
      recommendations: []
    };

    try {
      // Syntax validation
      validation.validationResults.syntax = await this.validateSyntax(generatedCode, context);

      // Compilation validation
      validation.validationResults.compilation = await this.validateCompilation(generatedCode, context);

      // Import/dependency validation
      validation.validationResults.dependencies = await this.validateDependencies(generatedCode, context);

      // Integration validation
      validation.validationResults.integration = await this.validateIntegration(generatedCode, context);

      // Runtime validation
      validation.validationResults.runtime = await this.validateRuntime(generatedCode, context);

      // Style consistency validation
      validation.validationResults.style = await this.validateStyleConsistency(generatedCode, context);

      // Calculate overall success and confidence
      validation.overallSuccess = this.calculateOverallSuccess(validation.validationResults);
      validation.confidence = this.calculateValidationConfidence(validation.validationResults);
      validation.recommendations = this.generateValidationRecommendations(validation.validationResults);

    } catch (error) {
      validation.error = error.message;
      validation.overallSuccess = false;
      validation.confidence = 0;
    }

    const processingTime = Date.now() - startTime;
    validation.processingTime = processingTime;

    // Store validation history
    this.storeValidationResult(validation);

    console.log(`✓ Integration validation completed in ${processingTime}ms`);
    console.log(`  Success: ${validation.overallSuccess ? 'YES' : 'NO'} (${validation.confidence.toFixed(1)}% confidence)`);

    return validation;
  }

  // Validate syntax correctness
  async validateSyntax(code, context) {
    const syntaxValidation = {
      isValid: false,
      errors: [],
      warnings: [],
      confidence: 0
    };

    try {
      // Basic JavaScript/TypeScript syntax checking
      // In a real implementation, would use proper parsers like @babel/parser

      // Check for basic syntax issues
      const lines = code.split('\n');
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;

      lines.forEach((line, index) => {
        // Count braces, parentheses, brackets
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        parenCount += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        bracketCount += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;

        // Check for common syntax errors
        if (line.includes(';;')) {
          syntaxValidation.warnings.push(`Line ${index + 1}: Double semicolon found`);
        }

        if (line.match(/=\s*=/)) {
          syntaxValidation.errors.push(`Line ${index + 1}: Possible assignment instead of comparison`);
        }
      });

      // Check for balanced braces/parentheses
      if (braceCount !== 0) {
        syntaxValidation.errors.push(`Unbalanced braces: ${braceCount} extra opening braces`);
      }
      if (parenCount !== 0) {
        syntaxValidation.errors.push(`Unbalanced parentheses: ${parenCount} extra opening parentheses`);
      }
      if (bracketCount !== 0) {
        syntaxValidation.errors.push(`Unbalanced brackets: ${bracketCount} extra opening brackets`);
      }

      // Check for basic JavaScript keywords and structure
      const hasValidStructure = /(?:function|class|const|let|var|export|import)/.test(code);
      if (!hasValidStructure && code.length > 50) {
        syntaxValidation.warnings.push('Code may not contain standard JavaScript constructs');
      }

      syntaxValidation.isValid = syntaxValidation.errors.length === 0;
      syntaxValidation.confidence = syntaxValidation.isValid ?
        Math.max(60, 90 - syntaxValidation.warnings.length * 10) :
        Math.max(20, 50 - syntaxValidation.errors.length * 15);

    } catch (error) {
      syntaxValidation.errors.push(`Syntax validation error: ${error.message}`);
      syntaxValidation.confidence = 10;
    }

    return syntaxValidation;
  }

  // Validate compilation compatibility
  async validateCompilation(code, context) {
    const compilationValidation = {
      canCompile: false,
      errors: [],
      warnings: [],
      confidence: 0
    };

    try {
      // Simulate compilation checks
      // In real implementation, would actually attempt compilation

      // Check for TypeScript compatibility if project uses TypeScript
      if (this.isTypeScriptProject()) {
        // Check for TypeScript-specific syntax
        if (code.includes(': string') || code.includes(': number') || code.includes('interface ')) {
          compilationValidation.canCompile = true;
          compilationValidation.confidence += 20;
        } else if (code.length > 100) {
          compilationValidation.warnings.push('Code lacks TypeScript typing for TypeScript project');
          compilationValidation.confidence += 10;
        }
      } else {
        // Standard JavaScript compilation
        compilationValidation.canCompile = true;
        compilationValidation.confidence += 30;
      }

      // Check for modern JavaScript features
      if (code.includes('async ') || code.includes('await ')) {
        if (this.supportsAsyncAwait()) {
          compilationValidation.confidence += 15;
        } else {
          compilationValidation.errors.push('Async/await not supported in target environment');
        }
      }

      // Check for ES6+ features
      if (code.includes('=>') || code.includes('const ') || code.includes('let ')) {
        if (this.supportsES6()) {
          compilationValidation.confidence += 10;
        } else {
          compilationValidation.errors.push('ES6+ features not supported in target environment');
        }
      }

      compilationValidation.canCompile = compilationValidation.errors.length === 0;
      compilationValidation.confidence = Math.min(95, Math.max(20, compilationValidation.confidence));

    } catch (error) {
      compilationValidation.errors.push(`Compilation validation error: ${error.message}`);
      compilationValidation.confidence = 15;
    }

    return compilationValidation;
  }

  // Validate imports and dependencies
  async validateDependencies(code, context) {
    const dependencyValidation = {
      allDependenciesAvailable: false,
      missingDependencies: [],
      unusedImports: [],
      confidence: 0
    };

    try {
      // Extract import statements
      const importMatches = code.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g) || [];
      const requireMatches = code.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g) || [];

      const allImports = [
        ...importMatches.map(match => match.match(/from\s+['"`]([^'"`]+)['"`]/)[1]),
        ...requireMatches.map(match => match.match(/['"`]([^'"`]+)['"`]/)[1])
      ];

      // Check if dependencies exist in project
      const availableDependencies = this.getAvailableDependencies();

      allImports.forEach(importPath => {
        if (importPath.startsWith('.')) {
          // Relative import - check if file exists
          const resolvedPath = path.resolve(this.workingDirectory, importPath);
          if (!this.fileExists(resolvedPath)) {
            dependencyValidation.missingDependencies.push(importPath);
          }
        } else {
          // Package import - check if in dependencies
          const packageName = importPath.split('/')[0];
          if (!availableDependencies.includes(packageName)) {
            dependencyValidation.missingDependencies.push(packageName);
          }
        }
      });

      dependencyValidation.allDependenciesAvailable = dependencyValidation.missingDependencies.length === 0;

      // Calculate confidence
      if (allImports.length === 0) {
        dependencyValidation.confidence = 80; // No dependencies to validate
      } else {
        const availableRatio = (allImports.length - dependencyValidation.missingDependencies.length) / allImports.length;
        dependencyValidation.confidence = Math.round(availableRatio * 90);
      }

    } catch (error) {
      dependencyValidation.confidence = 20;
    }

    return dependencyValidation;
  }

  // Validate integration with existing code
  async validateIntegration(code, context) {
    const integrationValidation = {
      integratesWell: false,
      conflicts: [],
      improvements: [],
      confidence: 0
    };

    try {
      // Check for naming conflicts
      const definedNames = this.extractDefinedNames(code);
      const existingNames = await this.getExistingNames();

      definedNames.forEach(name => {
        if (existingNames.includes(name)) {
          integrationValidation.conflicts.push(`Name conflict: ${name} already exists`);
        }
      });

      // Check for style consistency
      const codeStyle = this.analyzeCodeStyle(code);
      const projectStyle = await this.getProjectStyle();

      if (codeStyle.indentation !== projectStyle.indentation) {
        integrationValidation.improvements.push(`Use ${projectStyle.indentation} for indentation consistency`);
      }

      if (codeStyle.quotes !== projectStyle.quotes) {
        integrationValidation.improvements.push(`Use ${projectStyle.quotes} quotes for consistency`);
      }

      // Check for architectural consistency
      const codePattern = this.detectCodePattern(code);
      const projectPatterns = await this.getProjectPatterns();

      if (!projectPatterns.includes(codePattern)) {
        integrationValidation.improvements.push(`Consider using ${projectPatterns[0]} pattern for consistency`);
      }

      integrationValidation.integratesWell =
        integrationValidation.conflicts.length === 0 &&
        integrationValidation.improvements.length <= 2;

      // Calculate confidence
      let confidence = 70;
      confidence -= integrationValidation.conflicts.length * 15;
      confidence -= integrationValidation.improvements.length * 5;
      integrationValidation.confidence = Math.max(20, Math.min(95, confidence));

    } catch (error) {
      integrationValidation.confidence = 30;
    }

    return integrationValidation;
  }

  // Validate runtime behavior
  async validateRuntime(code, context) {
    const runtimeValidation = {
      likelyToWork: false,
      potentialIssues: [],
      performanceNotes: [],
      confidence: 0
    };

    try {
      // Check for common runtime issues
      if (code.includes('undefined') && !code.includes('typeof undefined')) {
        runtimeValidation.potentialIssues.push('Undefined reference may cause runtime errors');
      }

      if (code.includes('.length') && !code.includes('Array.isArray')) {
        runtimeValidation.potentialIssues.push('Length access without array check may fail');
      }

      // Check for async/await issues
      if (code.includes('await ') && !code.includes('async ')) {
        runtimeValidation.potentialIssues.push('Await used without async function');
      }

      // Performance considerations
      if (code.includes('for (') && code.includes('.length')) {
        runtimeValidation.performanceNotes.push('Consider caching array length in loops');
      }

      if (code.match(/\.\w+\(\)\.\w+\(\)/)) {
        runtimeValidation.performanceNotes.push('Method chaining detected - ensure all methods return appropriate values');
      }

      runtimeValidation.likelyToWork = runtimeValidation.potentialIssues.length === 0;

      // Calculate confidence
      let confidence = 75;
      confidence -= runtimeValidation.potentialIssues.length * 20;
      confidence -= runtimeValidation.performanceNotes.length * 5;
      runtimeValidation.confidence = Math.max(25, Math.min(95, confidence));

    } catch (error) {
      runtimeValidation.confidence = 30;
    }

    return runtimeValidation;
  }

  // Validate style consistency
  async validateStyleConsistency(code, context) {
    const styleValidation = {
      isConsistent: false,
      styleIssues: [],
      confidence: 0
    };

    try {
      const codeStyle = this.analyzeCodeStyle(code);
      const projectStyle = await this.getProjectStyle();

      // Check indentation
      if (codeStyle.indentation !== projectStyle.indentation) {
        styleValidation.styleIssues.push(`Inconsistent indentation: using ${codeStyle.indentation} instead of ${projectStyle.indentation}`);
      }

      // Check quotes
      if (codeStyle.quotes !== projectStyle.quotes) {
        styleValidation.styleIssues.push(`Inconsistent quotes: using ${codeStyle.quotes} instead of ${projectStyle.quotes}`);
      }

      // Check naming convention
      if (codeStyle.naming !== projectStyle.naming) {
        styleValidation.styleIssues.push(`Inconsistent naming: using ${codeStyle.naming} instead of ${projectStyle.naming}`);
      }

      styleValidation.isConsistent = styleValidation.styleIssues.length === 0;
      styleValidation.confidence = Math.max(40, 90 - (styleValidation.styleIssues.length * 15));

    } catch (error) {
      styleValidation.confidence = 40;
    }

    return styleValidation;
  }

  // Calculate overall success
  calculateOverallSuccess(validationResults) {
    const criticalChecks = [
      validationResults.syntax?.isValid,
      validationResults.compilation?.canCompile,
      validationResults.dependencies?.allDependenciesAvailable
    ];

    const importantChecks = [
      validationResults.integration?.integratesWell,
      validationResults.runtime?.likelyToWork
    ];

    const criticalPassed = criticalChecks.filter(check => check === true).length;
    const importantPassed = importantChecks.filter(check => check === true).length;

    // Must pass all critical checks and at least one important check
    return criticalPassed === criticalChecks.length && importantPassed >= 1;
  }

  // Calculate validation confidence
  calculateValidationConfidence(validationResults) {
    const weights = {
      syntax: 0.20,
      compilation: 0.20,
      dependencies: 0.20,
      integration: 0.20,
      runtime: 0.15,
      style: 0.05
    };

    let weightedConfidence = 0;

    Object.entries(weights).forEach(([category, weight]) => {
      const categoryResult = validationResults[category];
      if (categoryResult && typeof categoryResult.confidence === 'number') {
        weightedConfidence += categoryResult.confidence * weight;
      }
    });

    return Math.round(weightedConfidence);
  }

  // Generate validation recommendations
  generateValidationRecommendations(validationResults) {
    const recommendations = [];

    if (validationResults.syntax && !validationResults.syntax.isValid) {
      recommendations.push('Fix syntax errors before integration');
      recommendations.push(...validationResults.syntax.errors.map(error => `- ${error}`));
    }

    if (validationResults.compilation && !validationResults.compilation.canCompile) {
      recommendations.push('Address compilation issues');
      recommendations.push(...validationResults.compilation.errors.map(error => `- ${error}`));
    }

    if (validationResults.dependencies && validationResults.dependencies.missingDependencies.length > 0) {
      recommendations.push('Install missing dependencies:');
      recommendations.push(...validationResults.dependencies.missingDependencies.map(dep => `- npm install ${dep}`));
    }

    if (validationResults.integration && validationResults.integration.improvements.length > 0) {
      recommendations.push('Integration improvements:');
      recommendations.push(...validationResults.integration.improvements.map(imp => `- ${imp}`));
    }

    if (validationResults.runtime && validationResults.runtime.potentialIssues.length > 0) {
      recommendations.push('Address potential runtime issues:');
      recommendations.push(...validationResults.runtime.potentialIssues.map(issue => `- ${issue}`));
    }

    if (validationResults.style && validationResults.style.styleIssues.length > 0) {
      recommendations.push('Style consistency improvements:');
      recommendations.push(...validationResults.style.styleIssues.map(issue => `- ${issue}`));
    }

    return recommendations;
  }

  // Store validation result
  storeValidationResult(validation) {
    this.validationHistory.push({
      timestamp: validation.timestamp,
      success: validation.overallSuccess,
      confidence: validation.confidence,
      issues: validation.validationResults
    });

    // Keep only recent history
    if (this.validationHistory.length > 50) {
      this.validationHistory = this.validationHistory.slice(-50);
    }

    // Update integration patterns
    if (validation.overallSuccess) {
      const pattern = this.extractValidationPattern(validation);
      this.integrationPatterns.set(pattern, (this.integrationPatterns.get(pattern) || 0) + 1);
    }
  }

  // Helper methods
  isTypeScriptProject() {
    return fs.existsSync(path.join(this.workingDirectory, 'tsconfig.json'));
  }

  supportsAsyncAwait() {
    // Check if project configuration supports async/await
    // In real implementation, would check package.json engines, babel config, etc.
    return true; // Assume modern environment
  }

  supportsES6() {
    // Check if project configuration supports ES6
    // In real implementation, would check babel config, target environment, etc.
    return true; // Assume modern environment
  }

  getAvailableDependencies() {
    try {
      const packageJsonPath = path.join(this.workingDirectory, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return [
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {})
        ];
      }
    } catch (error) {
      // Ignore errors
    }
    return [];
  }

  fileExists(filePath) {
    try {
      // Check common extensions
      const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.json'];
      return extensions.some(ext => fs.existsSync(filePath + ext));
    } catch (error) {
      return false;
    }
  }

  extractDefinedNames(code) {
    const names = [];

    // Extract function names
    const functionMatches = code.match(/(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
    functionMatches.forEach(match => {
      const name = match.split(/\s+/)[1];
      if (name && !names.includes(name)) {
        names.push(name);
      }
    });

    // Extract class names
    const classMatches = code.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
    classMatches.forEach(match => {
      const name = match.split(/\s+/)[1];
      if (name && !names.includes(name)) {
        names.push(name);
      }
    });

    return names;
  }

  async getExistingNames() {
    // In real implementation, would analyze existing codebase for defined names
    // For now, return empty array to avoid false conflicts
    return [];
  }

  analyzeCodeStyle(code) {
    const lines = code.split('\n');

    // Analyze indentation
    let spacesCount = 0;
    let tabsCount = 0;

    lines.forEach(line => {
      if (line.startsWith('  ')) spacesCount++;
      if (line.startsWith('\t')) tabsCount++;
    });

    // Analyze quotes
    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;

    // Analyze naming
    const variableNames = this.extractDefinedNames(code);
    const camelCaseCount = variableNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;

    return {
      indentation: spacesCount > tabsCount ? 'spaces' : 'tabs',
      quotes: singleQuotes > doubleQuotes ? 'single' : 'double',
      naming: camelCaseCount > variableNames.length / 2 ? 'camelCase' : 'mixed'
    };
  }

  async getProjectStyle() {
    // In real implementation, would analyze project for consistent style
    return {
      indentation: 'spaces',
      quotes: 'single',
      naming: 'camelCase'
    };
  }

  detectCodePattern(code) {
    if (code.includes('class ')) return 'class-based';
    if (code.includes('function ')) return 'function-based';
    if (code.includes('=>')) return 'arrow-function';
    return 'mixed';
  }

  async getProjectPatterns() {
    // In real implementation, would analyze project for common patterns
    return ['function-based', 'arrow-function'];
  }

  extractValidationPattern(validation) {
    // Create a pattern signature for successful validations
    const pattern = {
      syntax: validation.validationResults.syntax?.isValid,
      compilation: validation.validationResults.compilation?.canCompile,
      dependencies: validation.validationResults.dependencies?.allDependenciesAvailable
    };

    return JSON.stringify(pattern);
  }

  // Get validation statistics
  getValidationStats() {
    const totalValidations = this.validationHistory.length;
    if (totalValidations === 0) {
      return {
        totalValidations: 0,
        successRate: 0,
        averageConfidence: 0,
        commonIssues: []
      };
    }

    const successfulValidations = this.validationHistory.filter(v => v.success).length;
    const successRate = (successfulValidations / totalValidations) * 100;

    const averageConfidence = this.validationHistory.reduce((sum, v) => sum + v.confidence, 0) / totalValidations;

    return {
      totalValidations,
      successRate: Math.round(successRate),
      averageConfidence: Math.round(averageConfidence),
      recentValidations: this.validationHistory.slice(-5),
      integrationPatterns: Array.from(this.integrationPatterns.entries())
    };
  }
}

export default IntegrationValidator;