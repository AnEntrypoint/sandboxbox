const fs = require('fs');

const results = [];

fs.readdirSync('.').forEach(filename => {
    if (filename.startsWith('claude-steps-') && filename.endsWith('.json')) {
        try {
            const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const testType = data.testType || 'unknown';
            const category = data.testCategory || 'unknown';

            const tools = [];
            const mcpTools = [];
            const errors = [];

            data.stepData.forEach(step => {
                if (step.type === 'assistant' && step.message) {
                    step.message.content.forEach(item => {
                        if (item.type === 'tool_use') {
                            const toolName = item.name;
                            if (toolName.startsWith('mcp__')) {
                                mcpTools.push(toolName);
                            } else {
                                tools.push(toolName);
                            }
                        }
                    });
                } else if (step.type === 'user' && step.is_error) {
                    errors.push({
                        content: step.content,
                        tool_use_id: step.tool_use_id
                    });
                }
            });

            results.push({
                filename,
                testType,
                category,
                totalTools: tools.length,
                mcpTools: mcpTools.length,
                errors: errors.length,
                tools,
                mcpTools,
                errors
            });
        } catch (e) {
            console.error(`Error processing ${filename}:`, e.message);
        }
    }
});

// Print summary
console.log('=== STEP FILE ANALYSIS SUMMARY ===');
console.log(`Total files analyzed: ${results.length}`);

console.log('\n=== BASIC STATISTICS ===');
results.forEach(result => {
    console.log(`${result.filename}:`);
    console.log(`  Type: ${result.testType} | Category: ${result.category}`);
    console.log(`  Tools: ${result.totalTools} | MCP Tools: ${result.mcpTools.length} | Errors: ${result.errors.length}`);
});

console.log('\n=== TOOL USAGE PATTERNS ===');
const allTools = {};
results.forEach(result => {
    result.tools.forEach(tool => {
        allTools[tool] = (allTools[tool] || 0) + 1;
    });
});

console.log('Most used tools:');
Object.entries(allTools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tool, count]) => {
        console.log(`  ${tool}: ${count}`);
    });

console.log('\n=== MCP TOOL USAGE ===');
const allMcpTools = {};
results.forEach(result => {
    result.mcpTools.forEach(tool => {
        allMcpTools[tool] = (allMcpTools[tool] || 0) + 1;
    });
});

if (Object.keys(allMcpTools).length > 0) {
    console.log('MCP tools used:');
    Object.entries(allMcpTools)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tool, count]) => {
            console.log(`  ${tool}: ${count}`);
        });
} else {
    console.log('No MCP tools found');
}

console.log('\n=== ERROR ANALYSIS ===');
const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
console.log(`Total errors: ${totalErrors}`);

results.forEach(result => {
    if (result.errors.length > 0) {
        console.log(`${result.filename} has ${result.errors.length} errors:`);
        result.errors.slice(0, 2).forEach(error => {
            console.log(`  ${error.content.substring(0, 100)}...`);
        });
    }
});

console.log('\n=== BASELINE VS MCP COMPARISON ===');
const baseline = results.filter(r => r.testType === 'baseline');
const mcp = results.filter(r => r.testType === 'mcp');

console.log(`Baseline files: ${baseline.length}`);
console.log(`MCP files: ${mcp.length}`);

if (baseline.length > 0 && mcp.length > 0) {
    const baselineTools = baseline.reduce((sum, r) => sum + r.totalTools, 0);
    const mcpTools = mcp.reduce((sum, r) => sum + r.totalTools, 0);
    const baselineMcpTools = baseline.reduce((sum, r) => sum + r.mcpTools.length, 0);
    const mcpMcpTools = mcp.reduce((sum, r) => sum + r.mcpTools.length, 0);

    console.log(`Average tools per task - Baseline: ${(baselineTools / baseline.length).toFixed(1)}, MCP: ${(mcpTools / mcp.length).toFixed(1)}`);
    console.log(`MCP tools usage - Baseline: ${baselineMcpTools}, MCP: ${mcpMcpTools}`);
}