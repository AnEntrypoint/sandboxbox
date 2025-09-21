import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, relative, dirname, basename, extname } from 'path';
import ignore from 'ignore';
import { getDefaultIgnorePatterns } from './shared-utils.js';

// File type classification
const FILE_TYPES = {
  'component': /\.(tsx|jsx)$/,
  'module': /\.(ts|js)$/,
  'style': /\.(css|scss|sass)$/,
  'config': /\.(json|yaml|yml|toml)$/,
  'test': /\.(test|spec)\.(ts|tsx|js|jsx)$/,
  'doc': /\.(md|txt)$/
};

// Ignore patterns - using comprehensive default patterns from shared-utils
const IGNORE_PATTERNS = getDefaultIgnorePatterns();

// Adverbs to find in code
const ADVERB_PATTERNS = [
  'ultra', 'advanced', 'super', 'mega', 'hyper', 'extra', 'premium',
  'enhanced', 'optimized', 'smart', 'intelligent', 'rapid', 'quick',
  'fast', 'slow', 'simple', 'complex', 'basic', 'ultimate'
];

// Import/Export regex patterns
const IMPORT_PATTERNS = [
  /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+([^{}*]+)\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+[*]\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
];

const EXPORT_PATTERNS = [
  /export\s+{([^}]+)}/g,
  /export\s+(default\s+)?(function|const|let|var|class)\s+(\w+)/g,
  /export\s+default\s+(\w+)/g
];

// Simple AST-like parsing for TypeScript/JavaScript
function parseSimpleAST(content, filePath) {
  const lines = content.split('\n');
  const functions = [];
  const classes = [];
  const imports = [];
  const exports = [];
  const comments = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) return;

    // Comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.includes('//')) {
      comments.push(lineNumber);
      return;
    }

    // Imports
    let match;
    IMPORT_PATTERNS.forEach(pattern => {
      while ((match = pattern.exec(trimmed)) !== null) {
        if (match[1] && match[2]) {
          imports.push({
            what: match[1].trim(),
            from: match[2]
          });
        }
      }
    });

    // Exports
    EXPORT_PATTERNS.forEach(pattern => {
      while ((match = pattern.exec(trimmed)) !== null) {
        if (match[1] || match[3]) {
          exports.push({
            name: (match[3] || match[1] || match[2]).trim(),
            type: match[2] || 'variable'
          });
        }
      }
    });

    // Functions
    const functionMatch = trimmed.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:\([^)]*\)\s*=>|function|async\s+function))/);
    if (functionMatch) {
      const funcName = functionMatch[1] || functionMatch[2];
      if (funcName && !['if', 'for', 'while', 'switch', 'catch'].includes(funcName)) {
        functions.push({
          name: funcName,
          line: lineNumber,
          signature: trimmed
        });
      }
    }

    // Classes/Components
    const classMatch = trimmed.match(/(?:class|interface|type)\s+(\w+)/);
    if (classMatch) {
      classes.push({
        name: classMatch[1],
        line: lineNumber,
        type: trimmed.startsWith('class') ? 'class' : 'type'
      });
    }

    // Adverbs in names
    ADVERB_PATTERNS.forEach(adverb => {
      const adverbMatch = trimmed.match(new RegExp(`\\b${adverb}\\w*\\b`, 'gi'));
      if (adverbMatch) {
        // This will be processed in metadata analysis
      }
    });
  });

  return {
    functions,
    classes,
    imports,
    exports,
    comments,
    totalLines: lines.length
  };
}

// Calculate code similarity between functions
function calculateSimilarity(func1, func2) {
  if (!func1.signature || !func2.signature) return 0;

  const sig1 = func1.signature.toLowerCase().replace(/\s+/g, ' ');
  const sig2 = func2.signature.toLowerCase().replace(/\s+/g, ' ');

  // Simple token-based similarity
  const tokens1 = sig1.split(/\W+/).filter(t => t.length > 2);
  const tokens2 = sig2.split(/\W+/).filter(t => t.length > 2);

  const intersection = tokens1.filter(t => tokens2.includes(t));
  const union = [...new Set([...tokens1, ...tokens2])];

  return union.length > 0 ? intersection.length / union.length : 0;
}

// Analyze file dependencies and opportunities
function analyzeDependencies(files, workingDir) {
  const dependencyMap = {};
  const importMap = {};
  const MAX_FILE_SIZE = 1024 * 100; // 100kb max file size

  files.forEach(file => {
    // Skip very large files to prevent memory issues
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`Skipping large file for dependency analysis: ${file.path} (${file.size} bytes)`);
      return;
    }

    try {
      const filePath = join(workingDir, file.path);
      const content = readFileSync(filePath, 'utf8');
      const ast = parseSimpleAST(content, file.path);

      dependencyMap[file.path] = {
        imports: ast.imports,
        exports: ast.exports,
        functions: ast.functions.length,
        classes: ast.classes.length,
        complexity: Math.floor((ast.functions.length + ast.classes.length) / ast.totalLines * 1000) / 10
      };

      // Build import map for similarity analysis
      ast.imports.forEach(imp => {
        if (!importMap[imp.from]) importMap[imp.from] = [];
        importMap[imp.from].push(file.path);
      });
    } catch (error) {
      console.warn(`Error analyzing file ${file.path}: ${error.message}`);
    }
  });

  return { dependencyMap, importMap };
}

// Find similar functions across files (optimized for performance)
function findSimilarFunctions(files, workingDir) {
  const allFunctions = [];
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB max file size

  files.forEach(file => {
    // Skip very large files
    if (file.size > MAX_FILE_SIZE) return;

    try {
      const filePath = join(workingDir, file.path);
      const content = readFileSync(filePath, 'utf8');
      const ast = parseSimpleAST(content, file.path);

      ast.functions.forEach(func => {
        allFunctions.push({
          ...func,
          file: file.path
        });
      });
    } catch (error) {
      console.warn(`Error reading file ${file.path} for similarity analysis: ${error.message}`);
    }
  });

  const similarities = [];
  const MAX_FUNCTIONS_FOR_SIMILARITY = 1000; // Limit to prevent O(n²) explosion

  // If we have too many functions, sample them
  const functionsToCompare = allFunctions.length > MAX_FUNCTIONS_FOR_SIMILARITY
    ? allFunctions.slice(0, MAX_FUNCTIONS_FOR_SIMILARITY)
    : allFunctions;

  for (let i = 0; i < functionsToCompare.length; i++) {
    for (let j = i + 1; j < functionsToCompare.length; j++) {
      const similarity = calculateSimilarity(functionsToCompare[i], functionsToCompare[j]);
      if (similarity > 0.6) {
        similarities.push({
          similarity: Math.round(similarity * 100) / 100,
          functions: [
            { file: functionsToCompare[i].file, name: functionsToCompare[i].name, line: functionsToCompare[i].line },
            { file: functionsToCompare[j].file, name: functionsToCompare[j].name, line: functionsToCompare[j].line }
          ]
        });
      }
    }
  }

  return similarities.slice(0, 10); // Top 10 similarities
}

// Extract code quality metadata
function extractMetadata(files, workingDir) {
  const metadata = {
    adverbs: [],
    comments: [],
    fileStats: {
      totalLines: 0,
      totalFiles: files.length,
      avgLinesPerFile: 0
    }
  };

  let totalLines = 0;

  files.forEach(file => {
    const filePath = join(workingDir, file.path);
    const content = readFileSync(filePath, 'utf8');
    const ast = parseSimpleAST(content, file.path);

    totalLines += ast.totalLines;

    // Find adverbs
    ADVERB_PATTERNS.forEach(adverb => {
      const adverbMatch = content.match(new RegExp(`\\b${adverb}\\w*\\b`, 'gi'));
      if (adverbMatch) {
        adverbMatch.forEach(match => {
          metadata.adverbs.push({
            file: file.path,
            name: match,
            type: 'variable'
          });
        });
      }
    });

    // Comments
    if (ast.comments.length > 0) {
      metadata.comments.push({
        file: file.path,
        lines: ast.comments,
        density: Math.round((ast.comments.length / ast.totalLines) * 1000) / 10
      });
    }
  });

  metadata.fileStats.totalLines = totalLines;
  metadata.fileStats.avgLinesPerFile = Math.round(totalLines / files.length);

  return metadata;
}

// Find componentization opportunities - HIGH IMPACT ONLY
function findOpportunities(files, workingDir, dependencyMap, similarities) {
  const opportunities = [];

  files.forEach(file => {
    const deps = dependencyMap[file.path];
    if (!deps) return;

    // CRITICAL: Large files (>15KB) - high impact modularization
    if (file.size > 15000) {
      opportunities.push({
        type: 'large-file',
        file: file.path,
        size: file.size,
        lines: file.lines,
        impact: 'high',
        suggestion: 'Break into smaller, focused modules'
      });
    }

    // CRITICAL: Very high complexity files (>6.0) - significant maintenance burden
    if (deps.complexity > 6.0) {
      opportunities.push({
        type: 'high-complexity',
        file: file.path,
        complexity: deps.complexity,
        functions: deps.functions,
        classes: deps.classes,
        size: file.size,
        impact: 'high',
        suggestion: 'Split into smaller modules to reduce complexity'
      });
    }

    // MODERATE: Files with many imports (>7) - potential architectural issues
    if (deps.imports.length > 7) {
      opportunities.push({
        type: 'many-dependencies',
        file: file.path,
        dependencies: deps.imports.length,
        impact: 'medium',
        suggestion: 'Consider dependency injection or facade pattern'
      });
    }
  });

  // CRITICAL: Exact duplicates - guaranteed improvement opportunity
  const exactDuplicates = similarities.filter(s => s.similarity === 1.0);
  if (exactDuplicates.length > 0) {
    opportunities.push({
      type: 'exact-duplicates',
      count: exactDuplicates.length,
      examples: exactDuplicates.slice(0, 3),
      impact: 'high',
      suggestion: 'Extract duplicate functions to shared utilities module'
    });
  }

  // Analyze abstraction opportunities - HIGH VALUE ONLY
  const abstractionOpportunities = analyzeAbstractionOpportunities(dependencyMap, similarities);
  opportunities.push(...abstractionOpportunities);

  // Sort by impact and return top 8 most actionable
  return opportunities
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
    })
    .slice(0, 8);
}

// Analyze abstraction and componentization opportunities - HIGH VALUE ONLY
function analyzeAbstractionOpportunities(dependencyMap, similarities) {
  const opportunities = [];

  // CRITICAL: Find functions duplicated 3+ times - high consolidation value
  const functionCounts = {};
  Object.values(dependencyMap).forEach(deps => {
    deps.exports.forEach(exp => {
      if (exp.type === 'function') {
        const key = exp.name;
        functionCounts[key] = (functionCounts[key] || 0) + 1;
      }
    });
  });

  // Focus on heavily duplicated functions (3+ occurrences)
  const criticalSharedFunctions = Object.entries(functionCounts)
    .filter(([name, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (criticalSharedFunctions.length > 0) {
    opportunities.push({
      type: 'shared-utilities',
      count: criticalSharedFunctions.length,
      examples: criticalSharedFunctions.slice(0, 3),
      impact: 'high',
      suggestion: 'Create shared utilities module for heavily duplicated functions'
    });
  }

  // HIGH VALUE: Find modules imported by 5+ files - strong abstraction candidates
  const importPatterns = {};
  Object.entries(dependencyMap).forEach(([file, deps]) => {
    deps.imports.forEach(imp => {
      if (!importPatterns[imp.from]) {
        importPatterns[imp.from] = [];
      }
      importPatterns[imp.from].push(file);
    });
  });

  const heavilyUsedModules = Object.entries(importPatterns)
    .filter(([module, importers]) => importers.length >= 5 && !module.startsWith('.'))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2);

  if (heavilyUsedModules.length > 0) {
    opportunities.push({
      type: 'abstraction-layer',
      count: heavilyUsedModules.length,
      examples: heavilyUsedModules,
      impact: 'high',
      suggestion: 'Create abstraction layers for heavily used modules'
    });
  }

  return opportunities;
}

// Read ignore files from the workspace
function readIgnoreFiles(workingDirectory) {
  const ignoreFiles = [
    '.gitignore',
    '.dockerignore',
    '.eslintignore',
    '.npmignore',
    '.prettierignore',
    '.stylelintignore'
  ];

  const additionalPatterns = [];

  ignoreFiles.forEach(ignoreFile => {
    const ignoreFilePath = join(workingDirectory, ignoreFile);
    if (existsSync(ignoreFilePath)) {
      try {
        const content = readFileSync(ignoreFilePath, 'utf8');
        const lines = content.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));

        // Convert gitignore patterns to ignore.js patterns
        lines.forEach(line => {
          if (line.startsWith('/')) {
            // Absolute path in gitignore becomes directory pattern
            additionalPatterns.push(line.substring(1) + '/**');
          } else if (line.endsWith('/')) {
            // Directory pattern - match the directory and all contents
            additionalPatterns.push(line + '**');
          } else if (line.includes('*')) {
            // Pattern already has wildcards
            additionalPatterns.push(line);
          } else {
            // File pattern - match both the file and any directory with that name
            additionalPatterns.push(line);
            additionalPatterns.push(line + '/**');
          }

          // For directory patterns in gitignore, also add the directory itself
          if (line.endsWith('/')) {
            additionalPatterns.push(line);
          }
        });
      } catch (error) {
        console.warn(`Error reading ignore file ${ignoreFile}: ${error.message}`);
      }
    }
  });

  return additionalPatterns;
}

// Custom file walker with ignore patterns and performance safeguards
function findFiles(workingDirectory, patterns, ignorePatterns) {
  const files = [];

  // Get patterns from ignore files
  const ignoreFilePatterns = readIgnoreFiles(workingDirectory);
  const allIgnorePatterns = [...ignorePatterns, ...ignoreFilePatterns];

  const ig = ignore().add(allIgnorePatterns);
  const startTime = Date.now();
  const MAX_SCAN_TIME = 10000; // 10 seconds timeout
  const MAX_DEPTH = 10; // Maximum directory depth
  const MAX_FILES = 50000; // Maximum files to scan - increased to prevent "Maximum file count reached" errors

  function scanDir(dir, currentDepth = 0) {
    // Timeout check
    if (Date.now() - startTime > MAX_SCAN_TIME) {
      console.warn('File scan timeout reached, stopping early');
      return;
    }

    // Depth check
    if (currentDepth > MAX_DEPTH) {
      console.warn('Maximum directory depth reached, stopping early');
      return;
    }

    // File count check
    if (files.length >= MAX_FILES) {
      console.warn('Maximum file count reached, stopping early');
      return;
    }

    try {
      const entries = readdirSync(dir);

      entries.forEach(entry => {
        const fullPath = join(dir, entry);
        const relativePath = relative(workingDirectory, fullPath);

        // Skip if matches ignore patterns
        if (ig.ignores(relativePath)) {
          return;
        }

        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          scanDir(fullPath, currentDepth + 1);
        } else if (stats.isFile()) {
          // Check if matches any pattern
          const matchesPattern = patterns.some(pattern => {
            if (pattern === '**/*.{ts,tsx,js,jsx}') {
              return /\.(ts|tsx|js|jsx)$/.test(relativePath);
            }
            if (pattern.includes('*')) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
              return regex.test(relativePath);
            }
            return relativePath.endsWith(pattern);
          });

          if (matchesPattern) {
            files.push({
              path: relativePath,
              fullPath: fullPath,
              size: stats.size
            });
          }
        }
      });
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Skipping directory ${dir}: ${error.message}`);
    }
  }

  scanDir(workingDirectory);
  return files;
}

// Main project understanding function
export function understandProject(workingDirectory) {
  const startTime = Date.now();
  const MAX_TOTAL_TIME = 30000; // 30 seconds total timeout

  try {
    // Get all relevant files
    const files = findFiles(workingDirectory, ['**/*.{ts,tsx,js,jsx}'], IGNORE_PATTERNS);

    // Check if we timed out during file scanning
    if (Date.now() - startTime > MAX_TOTAL_TIME) {
      return {
        success: false,
        error: 'Project analysis timed out during file scanning'
      };
    }

    if (files.length === 0) {
      return {
        success: false,
        error: 'No files found matching patterns'
      };
    }

    // Add line counts and types
    files.forEach(file => {
      file.lines = countLines(file.fullPath);
      file.type = getFileType(file.path);
      delete file.fullPath; // Remove to save space
    });

    // Sort by size (largest first)
    files.sort((a, b) => b.size - a.size);

    // Check timeout before expensive analysis
    if (Date.now() - startTime > MAX_TOTAL_TIME) {
      return {
        success: false,
        error: 'Project analysis timed out before analysis phase'
      };
    }

    // Analyze dependencies (with subset if too many files)
    const analysisFiles = files.length > 1000 ? files.slice(0, 1000) : files;
    const { dependencyMap, importMap } = analyzeDependencies(analysisFiles, workingDirectory);

    // Check timeout again
    if (Date.now() - startTime > MAX_TOTAL_TIME) {
      return {
        success: false,
        error: 'Project analysis timed out during dependency analysis'
      };
    }

    // Find similarities (expensive operation - limit files)
    const similarityFiles = files.length > 500 ? files.slice(0, 500) : files;
    const similarities = findSimilarFunctions(similarityFiles, workingDirectory);

    // Extract metadata
    const metadata = extractMetadata(analysisFiles, workingDirectory);

    // Find opportunities
    const opportunities = findOpportunities(analysisFiles, workingDirectory, dependencyMap, similarities);

    // Build heavily optimized output
    const result = {
      // Project overview (most important info first)
      overview: {
        files: files.length,
        lines: metadata.fileStats.totalLines,
        avgSize: Math.round(files.reduce((sum, f) => sum + f.size, 0) / files.length),
        lang: detectPrimaryLanguage(files)
      },

      // Top opportunities (high-impact actionable insights)
      topIssues: opportunities.filter(o => o.impact === 'high').slice(0, 5),

      // Code quality (concise metrics)
      quality: {
        duplicates: similarities.filter(s => s.similarity === 1.0).length,
        similar: similarities.filter(s => s.similarity >= 0.8).length,
        adverbs: metadata.adverbs.length,
        commented: metadata.comments.length
      },

      // Largest files (>10KB only - focus on significant files)
      largeFiles: files.filter(f => f.size > 10000).slice(0, 5).map(f => ({
        p: f.path,
        s: f.size,
        l: f.lines,
        c: dependencyMap[f.path]?.complexity || 0
      })),

      // Full details (for deep analysis)
      details: {
        allFiles: files.map(f => ({
          p: f.path,
          s: f.size,
          l: f.lines,
          t: f.type
        })),
        dependencies: dependencyMap,
        similarities: similarities.filter(s => s.similarity === 1.0).slice(0, 8), // Show exact duplicates only
        metadata: {
          adverbs: metadata.adverbs.slice(0, 5), // Reduce noise
          comments: metadata.comments.filter(c => c.density > 5).map(c => ({ // Only high-comment-density files
            f: c.file,
            l: c.lines.length,
            d: c.density
          }))
        },
        allOpportunities: opportunities
      },

      // Performance metrics
      perf: {
        tokenEstimate: Math.round(JSON.stringify({
          files: files.length,
          deps: Object.keys(dependencyMap).length,
          similar: similarities.length,
          meta: metadata.adverbs.length + metadata.comments.length
        }).length * 0.6), // Optimized token estimate
        processTime: Date.now()
      }
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions
function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function getFileType(filename) {
  for (const [type, pattern] of Object.entries(FILE_TYPES)) {
    if (pattern.test(filename)) return type;
  }
  return 'unknown';
}

function detectPrimaryLanguage(files) {
  const typeCounts = {};
  files.forEach(f => {
    typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
  });

  return Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
}

// Tool definition for MCP
export const projectUnderstandTool = {
  name: 'project_understand',
  description: 'MANDATORY: Always use this first to see the project overview without extra work. Comprehensive project analysis with dependencies, similarities, and optimization opportunities. Token-optimized output.',
  inputSchema: {
    type: 'object',
    properties: {
      workingDirectory: {
        type: 'string',
        description: 'Working directory to analyze'
      }
    },
    required: ['workingDirectory']
  }
};

export const projectUnderstandHandler = async (args) => {
  const { workingDirectory } = args;

  if (!workingDirectory) {
    throw new Error('workingDirectory is required');
  }

  const result = understandProject(workingDirectory);

  if (!result.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${result.error}`
        }
      ]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result.data, null, 2)
      }
    ]
  };
};