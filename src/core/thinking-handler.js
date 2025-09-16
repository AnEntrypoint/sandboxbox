

import { createToolDefinition } from './tool-schemas.js';

export function getSequentialThinkingToolDefinition() {
  return createToolDefinition(
    "sequentialthinking",
    "Sequential thinking tool for complex task analysis. Use to organize requirements, tool selection, and insights. Helpful for structured planning of complex tasks.",
    {
      type: "object",
      properties: {
        thoughts: {
          type: ["string", "array"],
          items: {
            type: "string",
            minLength: 1
          },
          minLength: 1,
          description: "Single thought (string) or multiple thoughts (array of strings) to process"
        },
        workingDirectory: {
          type: "string",
          description: "Required - working directory for storing thought data locally"
        },
        parentId: {
          type: "string",
          description: "Optional - parent thought ID for creating thought chains"
        }
      },
      required: ["thoughts", "workingDirectory"]
    }
  );
}

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import * as path from 'path';

export async function handleSequentialThinking(args, defaultWorkingDir) {
  try {
    const { thoughts, workingDirectory, parentId } = args;

    if (!thoughts) {
      throw new Error("Missing 'thoughts' parameter for sequentialthinking tool");
    }

    if (!workingDirectory) {
      throw new Error("Missing 'workingDirectory' parameter for sequentialthinking tool");
    }

    const effectiveDir = path.resolve(workingDirectory || defaultWorkingDir);

    const thoughtsDir = path.join(effectiveDir, '.thoughts');
    if (!existsSync(thoughtsDir)) {
      mkdirSync(thoughtsDir, { recursive: true });
    }

    const processedThoughts = Array.isArray(thoughts) ? thoughts : [thoughts];
    const thoughtId = parentId || `thought_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const thoughtData = {
      id: thoughtId,
      timestamp,
      thoughts: processedThoughts,
      processed: processThoughts(processedThoughts)
    };

    const thoughtFile = path.join(thoughtsDir, `${thoughtId}.json`);
    writeFileSync(thoughtFile, JSON.stringify(thoughtData, null, 2));

    const responseContent = generateThinkingResponse(thoughtData);

    return {
      content: [
        {
          type: 'text',
          text: responseContent
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `SEQUENTIAL THINKING ERROR: ${error.message}`
        }
      ]
    };
  }
}

function processThoughts(thoughts) {
  const processed = {
    count: thoughts.length,
    categories: categorizeThoughts(thoughts),
    keywords: extractKeywords(thoughts),
    priority: assessPriority(thoughts),
    complexity: assessComplexity(thoughts)
  };

  return processed;
}

function categorizeThoughts(thoughts) {
  const categories = {
    planning: 0,
    analysis: 0,
    implementation: 0,
    testing: 0,
    reflection: 0,
    other: 0
  };

  const keywords = {
    planning: ['plan', 'design', 'structure', 'architecture', 'approach'],
    analysis: ['analyze', 'understand', 'examine', 'investigate', 'research'],
    implementation: ['implement', 'build', 'create', 'write', 'develop'],
    testing: ['test', 'verify', 'validate', 'check', 'ensure'],
    reflection: ['reflect', 'review', 'consider', 'think about', 'evaluate']
  };

  thoughts.forEach(thought => {
    const lowerThought = thought.toLowerCase();
    let categorized = false;

    Object.entries(keywords).forEach(([category, categoryKeywords]) => {
      if (categoryKeywords.some(keyword => lowerThought.includes(keyword))) {
        categories[category]++;
        categorized = true;
      }
    });

    if (!categorized) {
      categories.other++;
    }
  });

  return categories;
}

function extractKeywords(thoughts) {
  const allText = thoughts.join(' ').toLowerCase();
  const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an']);

  const words = allText.split(/\s+/).filter(word => word.length > 3 && !commonWords.has(word));
  const wordFreq = {};

  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, freq]) => ({ word, frequency: freq }));
}

function assessPriority(thoughts) {
  const priorityKeywords = {
    high: ['urgent', 'critical', 'important', 'priority', 'essential', 'must', 'immediately'],
    medium: ['should', 'need', 'consider', 'plan', 'design'],
    low: ['optional', 'nice', 'maybe', 'future', 'later', 'could']
  };

  const allText = thoughts.join(' ').toLowerCase();
  let scores = { high: 0, medium: 0, low: 0 };

  Object.entries(priorityKeywords).forEach(([priority, keywords]) => {
    keywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        scores[priority]++;
      }
    });
  });

  if (scores.high > 0) return 'high';
  if (scores.medium > 0) return 'medium';
  if (scores.low > 0) return 'low';
  return 'medium'; 
}

function assessComplexity(thoughts) {
  const complexityIndicators = {
    high: ['complex', 'complicated', 'difficult', 'challenging', 'multiple', 'integrate', 'architecture'],
    medium: ['several', 'different', 'various', 'implement', 'develop'],
    low: ['simple', 'basic', 'straightforward', 'easy', 'single', 'create']
  };

  const allText = thoughts.join(' ').toLowerCase();
  let scores = { high: 0, medium: 0, low: 0 };

  Object.entries(complexityIndicators).forEach(([complexity, indicators]) => {
    indicators.forEach(indicator => {
      if (allText.includes(indicator)) {
        scores[complexity]++;
      }
    });
  });

  if (scores.high > scores.medium && scores.high > scores.low) return 'high';
  if (scores.medium > scores.low) return 'medium';
  return 'low';
}

function generateThinkingResponse(thoughtData) {
  const { id, timestamp, thoughts, processed } = thoughtData;

  let response = `🧠 Sequential Thinking Session\n`;
  response += `Session ID: ${id}\n`;
  response += `Timestamp: ${timestamp}\n`;
  response += `Thoughts: ${processed.count}\n\n`;

  response += `📊 Assessment:\n`;
  response += `• Priority: ${processed.priority.toUpperCase()}\n`;
  response += `• Complexity: ${processed.complexity.toUpperCase()}\n\n`;

  response += `📂 Thought Categories:\n`;
  Object.entries(processed.categories).forEach(([category, count]) => {
    if (count > 0) {
      response += `• ${category}: ${count}\n`;
    }
  });

  if (processed.keywords.length > 0) {
    response += `\n🔑 Key Concepts:\n`;
    processed.keywords.slice(0, 5).forEach(({ word, frequency }) => {
      response += `• ${word} (${frequency})\n`;
    });
  }

  response += `\n💭 Your Thoughts:\n`;
  thoughts.forEach((thought, index) => {
    response += `${index + 1}. ${thought}\n`;
  });

  response += `\n💡 Next Steps:\n`;
  response += generateNextSteps(processed);

  response += `\n💾 Thoughts saved to .thoughts/${id}.json\n`;

  return response;
}

function generateNextSteps(processed) {
  const suggestions = [];

  if (processed.categories.planning > 0) {
    suggestions.push('• Create a detailed implementation plan');
  }

  if (processed.categories.analysis > 0) {
    suggestions.push('• Document your analysis findings');
  }

  if (processed.categories.implementation > 0) {
    suggestions.push('• Start with the highest priority items');
  }

  if (processed.categories.testing > 0) {
    suggestions.push('• Prepare test cases and validation strategies');
  }

  if (processed.categories.reflection > 0) {
    suggestions.push('• Schedule regular review sessions');
  }

  if (suggestions.length === 0) {
    suggestions.push('• Break down the thinking into actionable steps');
    suggestions.push('• Identify dependencies and prerequisites');
  }

  return suggestions.join('\n');
}