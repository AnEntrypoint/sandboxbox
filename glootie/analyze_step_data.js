#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read all step files and analyze tool usage patterns
const resultsDir = './results';
const stepFiles = fs.readdirSync(resultsDir).filter(f => f.startsWith('claude-steps-') && f.endsWith('.json'));

console.log('=== MCP GLOOTIE V3.1.4 AGENT EXPERIENCE ANALYSIS ===\n');

// Analysis data structure
const analysis = {
  tests: {},
  toolUsage: {},
  patterns: {},
  frictionPoints: [],
  successes: []
};

stepFiles.forEach(file => {
  const filePath = path.join(resultsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const testType = file.includes('baseline') ? 'baseline' : 'mcp';
  const testName = data.testCategory;
  
  if (!analysis.tests[testName]) {
    analysis.tests[testName] = {};
  }
  
  analysis.tests[testName][testType] = {
    steps: data.stepData.length,
    file: file,
    toolCalls: {},
    time: data.stepData[data.stepData.length - 1]?.timestamp ? 
      new Date(data.stepData[data.stepData.length - 1].timestamp) - new Date(data.stepData[0].timestamp) : 0
  };
  
  // Analyze tool usage
  data.stepData.forEach(step => {
    if (step.type === 'assistant' && step.message?.content) {
      step.message.content.forEach(content => {
        if (content.type === 'tool_use') {
          const toolName = content.name;
          if (!analysis.tests[testName][testType].toolCalls[toolName]) {
            analysis.tests[testName][testType].toolCalls[toolName] = 0;
          }
          analysis.tests[testName][testType].toolCalls[toolName]++;
          
          // Track overall usage
          if (!analysis.toolUsage[toolName]) {
            analysis.toolUsage[toolName] = { baseline: 0, mcp: 0 };
          }
          analysis.toolUsage[toolName][testType]++;
        }
      });
    }
  });
});

// Generate detailed analysis
console.log('## TOOL USAGE ANALYSIS\n');
Object.keys(analysis.toolUsage).forEach(tool => {
  const usage = analysis.toolUsage[tool];
  console.log(`${tool}:`);
  console.log(`  Baseline: ${usage.baseline} calls`);
  console.log(`  MCP: ${usage.mcp} calls`);
  if (usage.baseline > 0 || usage.mcp > 0) {
    const change = usage.mcp - usage.baseline;
    const percentChange = usage.baseline > 0 ? ((change / usage.baseline) * 100).toFixed(1) : 'N/A';
    console.log(`  Change: ${change > 0 ? '+' : ''}${change} (${percentChange}%)`);
  }
  console.log();
});

console.log('## TEST-BY-TEST ANALYSIS\n');
Object.keys(analysis.tests).forEach(testName => {
  console.log(`### ${testName.toUpperCase()}\n`);
  
  const baseline = analysis.tests[testName].baseline;
  const mcp = analysis.tests[testName].mcp;
  
  console.log(`Baseline (${baseline.steps} steps):`);
  Object.keys(baseline.toolCalls).forEach(tool => {
    console.log(`  ${tool}: ${baseline.toolCalls[tool]}`);
  });
  
  console.log(`\nMCP (${mcp.steps} steps):`);
  Object.keys(mcp.toolCalls).forEach(tool => {
    console.log(`  ${tool}: ${mcp.toolCalls[tool]}`);
  });
  
  const stepIncrease = ((mcp.steps - baseline.steps) / baseline.steps * 100).toFixed(1);
  console.log(`\nStep increase: ${stepIncrease}%`);
  console.log('---\n');
});

// Identify specific MCP tool usage patterns
const mcpTools = ['mcp__glootie__searchcode', 'mcp__glootie__execute', 'mcp__glootie__ast_tool'];
console.log('## MCP TOOL SPECIFIC ANALYSIS\n');

mcpTools.forEach(tool => {
  console.log(`### ${tool}\n`);
  
  Object.keys(analysis.tests).forEach(testName => {
    const mcpUsage = analysis.tests[testName].mcp.toolCalls[tool] || 0;
    console.log(`${testName}: ${mcpUsage} uses`);
  });
  console.log();
});

// Save detailed analysis
fs.writeFileSync('./detailed-analysis.json', JSON.stringify(analysis, null, 2));
console.log('Detailed analysis saved to ./detailed-analysis.json');
