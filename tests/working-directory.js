/**
 * Test file to verify that working directory functionality works correctly
 */

export default [
  {
    "name": "Get current working directory",
    "code": "return process.cwd();",
    "expected": process.cwd() // This will be the current directory when tests run
  },
  {
    "name": "Working directory in process object",
    "code": "return typeof process.cwd === 'function';",
    "expected": "true"
  },
  {
    "name": "Process cwd returns string",
    "code": "return typeof process.cwd() === 'string';",
    "expected": "true"
  }
]; 