#!/usr/bin/env node

/**
 * Simple Benchmark Runner
 *
 * Quick execution script for running the enhanced benchmark
 */

const EnhancedBenchmarkRunner = require('./benchmark-runner.cjs');

console.log('🚀 Starting MCP Glootie A/B Benchmark...');

const benchmark = new EnhancedBenchmarkRunner();

benchmark.run()
  .then(() => {
    console.log('✅ Benchmark completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });