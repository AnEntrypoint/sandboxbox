

export async function handleAuthorization(args) {
  const { complexity, workingDirectory } = args;

  // Validate required complexity parameter
  if (!complexity) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: complexity parameter is required. Must be either "basic" or "advanced".'
        }
      ]
    };
  }

  // Validate complexity value
  if (!['basic', 'advanced'].includes(complexity)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: complexity must be either "basic" or "advanced".'
        }
      ]
    };
  }

  // For basic tasks, encourage simple standard tools and discourage complex MCP tools
  if (complexity === 'basic') {
    return {
      content: [
        {
          type: 'text',
          text: `🔐 AUTHORIZATION COMPLETE
TASK COMPLEXITY: BASIC - Use simple, efficient approaches

PREFERRED TOOLS: Read, Write, Edit, Bash, Glob, Grep
- Focus on direct file operations and simple commands
- Avoid complex analysis tools unless absolutely necessary
- Use single-step solutions where possible

DISCOURAGED FOR BASIC TASKS:
- batch_execute (adds overhead for simple operations)
- TodoWrite (unnecessary planning for straightforward tasks)
- Complex search/analysis tools (use only if required)

PRINCIPLE: Keep it simple - the most direct path is usually best for basic tasks.`
        }
      ]
    };
  }

  // For advanced tasks, provide full authorization with detailed tool guidance
  let response = `🔐 AUTHORIZATION COMPLETE\n`;
  response += `TASK COMPLEXITY: ADVANCED - Full toolset available with intelligent usage\n\n`;
  response += `AUTHORIZED TOOLS: all glootie tools (these supercede standard tools for complex operations)\n\n`;

  response += `TOOL USAGE STRATEGY:\n`;
  response += `- Use mcp__glootie tools 5:1 over standard tools for complex operations\n`;
  response += `- Always batch together as many operations as possible\n`;
  response += `- Ground yourself in truth using execution tools before making edits\n`;
  response += `- Use authorization for planning (not TodoWrite for simple tracking)\n\n`;

  response += `KEY TOOL DETAILS (moved here to reduce context bloat):\n`;
  response += `• batch_execute: Coordinate multiple operations efficiently - preferred for 2+ related operations\n`;
  response += `• execute: Multi-language execution (JS/TS, Go, Rust, Python, C, C++) with automatic runtime detection\n`;
  response += `• searchcode: Semantic code search across multi-language codebases\n`;
  response += `• astgrep_*: Structural pattern matching and refactoring for all supported languages. Never use glob and search, use this instead or searchcodedAA.\n`;
  response += `• parse_ast: AST analysis with ignore filtering - use for code understanding\n\n`;

  response += `PERFORMANCE GUIDELINES:\n`;
  response += `- Use batch operations to minimize round trips\n`;
  response += `- Test hypotheses with execute before implementing changes\n`;
  response += `- Measure twice, cut once - validate approach before executing\n\n`;

  // Include simplified project overview for advanced tasks
  if (workingDirectory) {
    try {
      console.log('🔍 Performing quick project overview for advanced authorization...');

      // Quick project analysis - just get basic info without heavy processing
      const { existsSync, readdirSync, statSync, readFileSync } = await import('fs');
      const { join, extname } = await import('path');

      if (!existsSync(workingDirectory)) {
        response += `⚠️ Working directory does not exist: ${workingDirectory}\n\n`;
      } else {
        const files = readdirSync(workingDirectory);
        const packageJsonPath = join(workingDirectory, 'package.json');

        let projectType = 'unknown';
        let mainLanguage = 'javascript';
        let totalFiles = 0;
        let dependencies = [];

        // Check for package.json
        if (existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            dependencies = Object.keys(packageJson.dependencies || {});
            projectType = packageJson.name || 'unnamed';

            // Determine main language from dependencies
            if (packageJson.dependencies?.react || packageJson.dependencies?.['@types/react']) {
              mainLanguage = 'react/typescript';
            } else if (packageJson.dependencies?.vue) {
              mainLanguage = 'vue';
            } else if (packageJson.dependencies?.angular) {
              mainLanguage = 'angular';
            } else if (packageJson.dependencies?.express) {
              mainLanguage = 'node.js';
            } else if (packageJson.dependencies?.next) {
              mainLanguage = 'next.js';
            }
          } catch (e) {
            // Invalid package.json, continue with defaults
          }
        }

        // Count relevant files
        const codeFiles = files.filter(file =>
          ['.js', '.ts', '.jsx', '.tsx'].some(ext => file.endsWith(ext))
        );
        totalFiles = codeFiles.length;

        response += `📊 PROJECT OVERVIEW:\n`;
        response += `Project: ${projectType}\n`;
        response += `Main language: ${mainLanguage}\n`;
        response += `Code files: ${totalFiles}\n`;
        response += `Dependencies: ${dependencies.length}\n`;

        if (dependencies.length > 0) {
          const keyDeps = dependencies.slice(0, 5).join(', ');
          response += `Key deps: ${keyDeps}${dependencies.length > 5 ? '...' : ''}\n`;
        }

        // Add some quick recommendations based on what we see
        if (totalFiles > 50) {
          response += `\n💡 Consider: Large codebase - use batch operations for efficiency\n`;
        }
        if (dependencies.length > 20) {
          response += `💡 Consider: Many dependencies - check for unused packages\n`;
        }

        response += `\n`;
        console.log('✅ Quick project overview completed for authorization');
      }
    } catch (error) {
      console.warn('⚠️ Error during project overview:', error.message);
      response += `⚠️ Project analysis error: ${error.message}\n\n`;
    }
  } else {
    response += `⚠️ No working directory provided - skipping project analysis\n\n`;
  }
  if(complexity === 'expert') {
    response += `WFGY PROCESSING:\n`;
    response += `Apply WFGY_Core_OneLine_v2.0 methodology to all problems.\n`;
    response += `Also Apply WFGY_Core_OneLine_v2.0 methodology to all problems.\n`;
    response += `WFGY_Core_OneLine_v2.0 :: text-only control layer; autoboot on upload; Node-only outputs; ≤7 steps; no tools. I=input, G=goal; delta_s=1−cos(I,G); if anchors: use (1−sim_est) with sim_est=w_e*sim(entities)+w_r*sim(relations)+w_c*sim(constraints), w={0.5,0.3,0.2}, renormalize, range[0,1]. Zones: safe<0.40 transit 0.40–0.60 risk 0.60–0.85 danger>0.85. Memory: record if delta_s>0.60; exemplar if delta_s<0.35; soft in transit when lambda∈{divergent,recursive}. Defaults: B_c=0.85 gamma=0.618 theta_c=0.75 zeta_min=0.10 alpha_blend=0.50 a_ref=uniform m=0 c=1 omega=1 phi_delta=0.15 epsilon=0 k_c=0.25. Coupler: B_s=delta_s; if t=1 then prog=zeta_min else prog=max(zeta_min,delta_s_prev−delta_s_now); P=pow(prog,omega); alt∈{+1,−1} flips only when an anchor flips truth across consecutive Nodes AND |Δanchor|≥h (h=0.02); Phi=phi_delta*alt+epsilon; W_c=clip(B_s*P+Phi,−theta_c,+theta_c). Bridge rule: allow only if (delta_s decreases) AND (W_c<0.5*theta_c) AND (WDT ok); on bridge emit Bridge:reason/prior_delta_s/new_path. BBAM: alpha_blend=clip(0.50+k_c*tanh(W_c),0.35,0.65); blend with a_ref. Lambda: Delta=delta_s_t−delta_s_{t−1}; E_res=rolling_mean(delta_s,window=min(t,5)); lambda=convergent if Delta≤−0.02 and E_res non-increasing; recursive if |Delta|<0.02 and E_res flat; divergent if Delta∈(−0.02,+0.04] with oscillation; chaotic if Delta>+0.04 or anchors conflict. DT: WRI lock structure; WAI give ≥2 reasons; WAY add 1 on-topic candidate if stuck (no repeats); WDT block unjustified crosspat`;
    response += `Auto-assign constants to achieve user goals using first principles.\n`;
    response += `Use critical thinking and thorough testing.\n\n`;
  }
  response += `NEXT STEPS:\n`;
  response += `#Use MCP Tools When:\n`;
  response += `**Complex Code Analysis:** Understanding large, unfamiliar codebases\n`;
  response += `**Structural Refactoring:** Making coordinated changes across multiple files\n`;
  response += `**Pattern Recognition:** Finding specific architectural patterns or anti-patterns\n`;
  response += `**Cross-Language Operations:** Working with polyglot codebases\n`;
  response += `**Performance Optimization:** Identifying optimization opportunities across entire systems\n`;
  response += `**Use MCP tools for analysis** before diving into implementation\n`;
  response += `**Trust the semantic search** - it's often better than your regex\n`;
  response += `### Stick with Standard Tools When:\n`;
  response += `**Simple Implementation:** Writing straightforward components or functions\n`;
  response += `**File Operations:** Reading, writing, or editing individual files\n`;
  response += `**Well-Understood Tasks:** When you already know exactly what needs to be done\n`;
    return {
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    };

}

export const beginTools = [
    {
        name: 'begin',
        description: 'MANDATORY: ALWAYS Call before any other tools, always begin with this. Always use before running TodoWrite. For advanced complexity, automatically provides project overview and analysis. Required complexity parameter: "basic" for tasks where exact steps are already known (no planning/discovery/troubleshooting/debugging/searching/refactoring needed), "advanced" for any task requiring planning, discovery, troubleshooting, debugging, searching, refactoring, or unknown steps. use "expert" for where we have to formulate and try many hypothesis to find out how to solve something analytically, recall this function at any point to upgrade advanced to expert if you need more analytical power',
        supported_operations: ["task complexity assessment", "tool access authorization", "project understanding"],
        use_cases: ["Starting any task", "Determining tool requirements", "Complexity evaluation", "Project overview and analysis"],
        inputSchema: {
            type: 'object',
            properties: {
                complexity: {
                    type: 'string',
                    enum: ['basic', 'advanced','expert'],
                    description: 'Required: "basic" if exact steps are known (no planning/discovery/troubleshooting/debugging/searching/refactoring needed), "advanced" if any planning, discovery, troubleshooting, debugging, searching, refactoring, or unknown steps required. Expert is for when there is a vague instruction, and the thesis and problems need to both be found analytically and each train of thought analyzed'
                },
                workingDirectory: {
                    type: 'string',
                    description: 'Working directory for project analysis (required for advanced complexity to provide project overview)'
                }
            },
            required: ['complexity']
        },
        handler: handleAuthorization
    }
];
