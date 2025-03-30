/**
 * Example usage of the REPL helper
 * Run this in the REPL with:
 *   const code = require('./temp/repl-example.js');
 *   await code.run();
 */

// Import the helper module
const helper = require('./temp/repl-helper.js');

// Example functions
async function testEnvironmentVariables() {
  console.log("-- Testing Environment Variables --");
  
  // Get environment variables with fallbacks
  const supabaseUrl = helper.env.get('SUPABASE_URL', 'https://default-url.supabase.co');
  const apiKey = helper.env.get('API_KEY', '********');
  
  console.log(`SUPABASE_URL: ${supabaseUrl}`);
  console.log(`API_KEY: ${apiKey}`);
  
  // Check if variables exist
  console.log(`Has SUPABASE_URL: ${helper.env.has('SUPABASE_URL')}`);
  
  return {
    supabaseUrl,
    hasApiKey: helper.env.has('API_KEY')
  };
}

async function testUrlUtilities() {
  console.log("-- Testing URL Utilities --");
  
  const urls = [
    'example.com',
    'http://example.com/api',
    'https://supabase.co/docs'
  ];
  
  // Test URL normalization
  for (const url of urls) {
    const normalized = helper.url.normalize(url);
    console.log(`Original: ${url} -> Normalized: ${normalized}`);
  }
  
  // Test path joining
  const basePath = 'api/v1';
  const endpoint = 'users';
  const fullPath = helper.url.joinPaths(basePath, endpoint);
  console.log(`Joined paths: ${basePath} + ${endpoint} = ${fullPath}`);
  
  return {
    normalizedUrls: urls.map(url => helper.url.normalize(url)),
    joinedPath: fullPath
  };
}

async function testAsyncFunctions() {
  console.log("-- Testing Async Functions --");
  
  // Test sleep
  console.log("Sleeping for 500ms...");
  await helper.async.sleep(500);
  console.log("Awake!");
  
  // Test retry (this will succeed on 3rd attempt)
  let attempts = 0;
  try {
    const result = await helper.async.retry(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return `Success on attempt ${attempts}`;
    }, 3, 100);
    
    console.log(`Retry result: ${result}`);
  } catch (error) {
    console.error(`Retry failed: ${error.message}`);
  }
  
  // Test timeout (this should timeout)
  try {
    await helper.async.withTimeout(async () => {
      await helper.async.sleep(1000);
      return "This should not be returned";
    }, 500);
  } catch (error) {
    console.log(`Timeout error: ${error.message}`);
  }
  
  return {
    retryAttempts: attempts,
    sleepWorks: true
  };
}

// Main function to run all examples
async function run() {
  console.log("Running REPL helper examples...");
  
  const envResults = await testEnvironmentVariables();
  const urlResults = await testUrlUtilities();
  const asyncResults = await testAsyncFunctions();
  
  // Return all results
  return {
    environment: envResults,
    urls: urlResults,
    async: asyncResults
  };
}

// Export the run function
module.exports = { run };

// If running directly in REPL, execute the run function
if (typeof process !== 'undefined' && process.env.TEST_MCP === 'true') {
  run()
    .then(results => console.log("Example complete:", results))
    .catch(error => console.error("Example failed:", error));
} 