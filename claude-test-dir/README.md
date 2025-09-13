# Claude Test Application

A complex Node.js application with deliberate issues for testing Claude -p performance with and without MCP REPL tools.

## Issues Included

### Security Issues
- Weak password hashing
- Insecure JWT verification
- No input sanitization
- Potential NoSQL injection
- Hardcoded secrets

### Performance Issues
- Blocking database connections
- Inefficient caching strategies
- N+1 query problems
- Memory-intensive operations
- Synchronous file operations

### Code Quality Issues
- Global state management
- Poor error handling
- Missing validation
- Duplicate code
- Inefficient algorithms

### Architecture Issues
- Monolithic design
- Tight coupling
- Missing separation of concerns
- Poor scalability patterns

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

The server will start on http://localhost:3000

## Testing Endpoints

- `POST /api/users/register` - User registration
- `POST /api/products` - Product creation
- `GET /api/products/search` - Product search
- `GET /api/analytics/users` - User analytics
- `POST /api/products/bulk` - Bulk product operations
- `GET /health` - Health check
- `POST /api/files/upload` - File upload (intentionally broken)