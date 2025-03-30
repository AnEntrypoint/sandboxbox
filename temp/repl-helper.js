/**
 * Helper utilities for the REPL environment
 * This file provides common functionality for working with the REPL
 */

// Initialize the helper object
const replHelper = {};

/**
 * URL utilities for handling URL formatting and validation
 */
replHelper.url = {
  /**
   * Normalize a URL to ensure it has a valid protocol
   * @param {string} url - The URL to normalize
   * @returns {string} The normalized URL with https:// protocol if needed
   */
  normalize: (url) => {
    if (!url) return null;
    
    try {
      // Check if already a valid URL
      new URL(url);
      return url;
    } catch (e) {
      // Not a valid URL, try to fix it
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    }
  },
  
  /**
   * Check if a URL is valid
   * @param {string} url - The URL to validate
   * @returns {boolean} True if the URL is valid
   */
  isValid: (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Join URL paths together
   * @param {...string} parts - URL path parts to join
   * @returns {string} The combined path
   */
  joinPaths: (...parts) => {
    return parts.map(part => part.replace(/^\/|\/$/g, '')).join('/');
  }
};

/**
 * Environment variable utilities with fallback support
 */
replHelper.env = {
  /**
   * Get an environment variable with an optional fallback
   * @param {string} name - The environment variable name
   * @param {*} fallback - The fallback value if the variable is not set
   * @returns {string|*} The environment variable value or fallback
   */
  get: (name, fallback = null) => {
    return process.env[name] || fallback;
  },
  
  /**
   * Check if an environment variable is set
   * @param {string} name - The environment variable name
   * @returns {boolean} True if the variable is set
   */
  has: (name) => {
    return name in process.env && process.env[name] !== '';
  },
  
  /**
   * Get all environment variables
   * @returns {Object} All environment variables as an object
   */
  all: () => {
    return { ...process.env };
  }
};

/**
 * Async utilities for working with promises and async code
 */
replHelper.async = {
  /**
   * Sleep for a specified number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} A promise that resolves after the specified time
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Run a function with a timeout
   * @param {Function} fn - Async function to run
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} A promise that resolves with the function result or rejects with timeout
   */
  withTimeout: async (fn, timeoutMs = 5000) => {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  },
  
  /**
   * Retry a function multiple times with delay
   * @param {Function} fn - Async function to retry
   * @param {number} attempts - Number of attempts
   * @param {number} delay - Delay between attempts in milliseconds
   * @returns {Promise} A promise that resolves with the function result
   */
  retry: async (fn, attempts = 3, delay = 1000) => {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
};

/**
 * Supabase utilities for common Supabase operations
 */
replHelper.supabase = {
  /**
   * Execute SQL query via Supabase REST API
   * @param {string} query - SQL query to execute
   * @param {Object} params - Query parameters
   * @param {Object} options - Additional options
   * @returns {Promise} Promise resolving to query results
   */
  executeSQL: async (query, params = {}, options = {}) => {
    const supabaseUrl = options.url || replHelper.env.get('SUPABASE_URL');
    const supabaseKey = options.key || replHelper.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl) {
      throw new Error('Supabase URL is required. Set SUPABASE_URL environment variable or pass it in options.');
    }
    
    if (!supabaseKey) {
      throw new Error('Supabase service role key is required. Set SUPABASE_SERVICE_ROLE_KEY environment variable or pass it in options.');
    }
    
    const normalizedUrl = replHelper.url.normalize(supabaseUrl);
    const url = `${normalizedUrl}/rest/v1/rpc/execute_sql`;
    
    console.log(`Executing SQL: ${query}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query, params })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL error (${response.status}): ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("SQL execution failed:", error);
      throw error;
    }
  },
  
  /**
   * Check if a table exists in Supabase
   * @param {string} tableName - Table name to check
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} Promise resolving to true if table exists
   */
  tableExists: async (tableName, options = {}) => {
    const query = `
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = $1
      ) as exists
    `;
    
    try {
      const result = await replHelper.supabase.executeSQL(query, { $1: tableName }, options);
      return result.exists === true;
    } catch (error) {
      console.error(`Error checking if table '${tableName}' exists:`, error);
      throw error;
    }
  }
};

/**
 * JSON utilities for working with JSON data
 */
replHelper.json = {
  /**
   * Parse JSON with fallback for errors
   * @param {string} str - JSON string to parse
   * @param {*} fallback - Fallback value if parsing fails
   * @returns {Object|*} Parsed object or fallback
   */
  parse: (str, fallback = null) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  },
  
  /**
   * Stringify with error handling
   * @param {Object} obj - Object to stringify
   * @param {number} spaces - Number of spaces for indentation
   * @returns {string} JSON string or error message
   */
  stringify: (obj, spaces = 0) => {
    try {
      return JSON.stringify(obj, null, spaces);
    } catch (e) {
      return `Error stringifying object: ${e.message}`;
    }
  }
};

// Export the helper for use in REPL
module.exports = replHelper;

// For easier use, also add these to global scope when running in the REPL
if (typeof global !== 'undefined') {
  global.helper = replHelper;
  global.env = replHelper.env;
  global.url = replHelper.url;
  global.supabase = replHelper.supabase;
}

console.log("REPL Helper initialized successfully!"); 