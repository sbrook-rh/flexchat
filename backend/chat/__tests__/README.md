# Chat Backend Tests

This directory contains automated tests for the chat backend, focusing on strategy detection logic, RAG functionality, and API endpoints.

## Setup

### Install Dependencies

```bash
cd backend/chat
npm install
```

This will install both production dependencies and dev dependencies (Jest, Supertest).

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Current Test Files

1. **`strategy-detection.test.js`** - Comprehensive test suite outline
   - Tests for `detectStrategyWithDynamicCollections`
   - Tests for `detectStrategyWithRAG`
   - Tests for `detectStrategyWithLLM`
   - Tests for `detectStrategy` (full flow)
   - Integration tests for end-to-end scenarios
   
2. **`strategy-detection-example.test.js`** - Fully implemented example tests
   - Shows the pattern for implementing tests with mocks
   - Demonstrates AAA (Arrange-Act-Assert) pattern
   - Example of testing multi-candidate collection
   - Example of testing context combining

## Implementation Plan

The tests in `strategy-detection.test.js` are currently **outlined but not implemented**. This is intentional - it serves as:

1. **A comprehensive test plan** - All scenarios we need to cover
2. **A TODO list** - Each `TODO: Implement test` is a task
3. **Documentation** - Shows what behavior we expect from each function

### Before You Can Run These Tests

The test files are ready to use as patterns, but to actually run them, we need to:

1. **Refactor `server.js` to export detection functions**
   
   Currently `server.js` doesn't export the detection functions. We need to add:
   
   ```javascript
   // At the end of server.js, before the initialization code
   module.exports = {
     detectStrategyWithDynamicCollections,
     detectStrategyWithRAG,
     detectStrategyWithLLM,
     detectStrategy,
     generateResponse
   };
   ```

2. **Make functions testable by accepting dependencies as parameters**
   
   Currently the functions use global `config`, `aiProviders`, and `ragProviders`. 
   For testing, we should either:
   - Accept these as parameters (better for testing)
   - Or use Jest's module mocking (easier but less explicit)

3. **Decide on mocking strategy**
   
   Two approaches:
   
   **Approach A: Dependency Injection** (more explicit)
   ```javascript
   async function detectStrategyWithDynamicCollections(
     selectedCollections, 
     userQuery,
     config,        // Injected
     ragProviders   // Injected
   ) {
     // ...
   }
   ```
   
   **Approach B: Module Mocking** (Jest magic)
   ```javascript
   // In test file
   jest.mock('../retrieval-providers/providers');
   jest.mock('../ai-providers/providers');
   
   // Jest will automatically mock these modules
   ```

## Writing a New Test

Follow the **AAA Pattern** shown in the example file:

### 1. Arrange
Set up all mocks and test data:
```javascript
const mockProvider = {
  getName: jest.fn().mockReturnValue('ChromaDBWrapper'),
  query: jest.fn().mockResolvedValue([...])
};
```

### 2. Act
Call the function being tested:
```javascript
const result = await detectStrategyWithDynamicCollections(
  selectedCollections,
  userQuery
);
```

### 3. Assert
Verify the results:
```javascript
expect(result.matched).toBe(false);
expect(result.candidates).toHaveLength(2);
expect(mockProvider.query).toHaveBeenCalledTimes(2);
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage of strategy detection logic
- **Integration Tests**: All major user flows tested
- **Edge Cases**: Error handling, empty results, timeouts

## Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --testNamePattern="multiple collections"

# Run a specific file
npm test -- strategy-detection.test.js

# Run tests in a specific describe block
npm test -- --testNamePattern="detectStrategyWithDynamicCollections"
```

## Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run with Node inspector (for debugging in Chrome DevTools)
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome and click "inspect" on the Node process.

## Continuous Integration

These tests are designed to run in CI without requiring external services (LLMs, databases). All external dependencies should be mocked.

## Next Steps

1. Choose mocking approach (DI vs module mocking)
2. Refactor server.js to export functions
3. Implement tests one by one, starting with:
   - `detectStrategyWithDynamicCollections` - multiple candidates (the bug we fixed!)
   - `detectStrategyWithLLM` - combining candidates
   - Full flow integration tests
4. Add tests for API endpoints using Supertest
5. Add tests for AI providers
6. Add tests for retrieval providers

## Questions?

See `strategy-detection-example.test.js` for a fully worked example showing exactly how to structure your tests with mocks and assertions.

