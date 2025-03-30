# REPL Server Tests

This directory contains modular test files for the Simple REPL MCP Server.

## Test Structure

Each test file exports an array of test cases. The files are organized by test categories:

### Basic JavaScript Features
- `basic.js`: Basic functionality tests (arithmetic, strings, objects, arrays)
- `edge-cases.js`: Edge case handling tests (empty returns, special characters)
- `es6-features.js`: ES6+ language features (arrow functions, classes, destructuring)
- `regex.js`: Regular expression tests (matching, replacing, capture groups)
- `json-operations.js`: JSON handling (parsing, stringifying, error handling)
- `custom.js`: Custom JS feature tests (template literals, spread operator)

### Console Output
- `console.js`: Basic console output tests
- `console-advanced.js`: Advanced console methods and formatting

### Error Handling
- `errors.js`: Basic error tests
- `error-handling.js`: Comprehensive error handling (custom errors, stack traces)

### Asynchronous Code
- `async.js`: Basic async/await and Promise tests
- `advanced-async.js`: Advanced async patterns (Promise.all, Promise.race)

### Modules and Node.js Features
- `modules.js`: Basic module system tests
- `module-advanced.js`: Advanced module patterns and security restrictions
- `buffer-streams.js`: Buffer and TypedArray tests
- `process-env.js`: Process and environment variable tests

## Test Statistics

The current test suite contains 16 test files with 109 individual tests covering:
- Basic JavaScript execution
- Modern ES6+ features
- Error handling and reporting
- Asynchronous code execution
- Console output capturing
- Module loading and security
- Node.js specific features
- Buffer and binary data handling

## Adding New Tests

To add new tests, either:

1. Add test cases to an existing file
2. Create a new test file

### Adding to Existing Files

Add a new test case object to the array in the relevant file:

```javascript
// Add to the existing tests array
export default [
  // ... existing tests
  {
    name: 'My new test',
    code: 'return "test code";',
    expectedResult: 'test code'
  }
];
```

### Creating a New Test File

1. Create a new JavaScript file in the `tests` directory
2. Export an array of test cases:

```javascript
/**
 * My new test category
 */
export default [
  {
    name: 'Test name',
    code: 'return "test result";', // JavaScript code to execute
    expectedResult: 'test result'  // Expected value in the result
  },
  // Add more tests...
];
```

## Test Case Format

Each test case should be an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Descriptive name of the test |
| `code` | string | JavaScript code to execute in the REPL |
| `expectedResult` | string | Expected substring in the result (optional) |
| `expectedConsoleOutput` | string/array | Expected console output (optional) |
| `expectedError` | string | Expected error message substring (optional) |

At least one of `expectedResult`, `expectedConsoleOutput`, or `expectedError` should be provided.

## Running Tests

All tests are automatically discovered and run when you execute:

```
node test-repl.js
```

No need to update the main test script when adding new test files - they will be discovered automatically! 