# Automated Testing Strategy for AI Providers and Models

This document outlines a comprehensive automated testing strategy for AI providers, models, and the 6-phase processing flow in Flex Chat.

## Overview

The automated testing strategy covers:
- **Provider Testing** - Individual AI provider functionality
- **Model Testing** - Model discovery, classification, and capabilities
- **Flow Testing** - 6-phase processing with different scenarios
- **Integration Testing** - Multi-provider setups and RAG integration
- **Performance Testing** - Response times and reliability

## Test Categories

### 1. Provider Unit Tests

**Purpose**: Test individual AI provider functionality in isolation.

**Test Scenarios**:
```javascript
// Example test structure
describe('GeminiProvider', () => {
  test('should initialize with valid API key', async () => {
    const provider = new GeminiProvider({ api_key: 'test-key' });
    expect(provider).toBeDefined();
  });

  test('should discover models successfully', async () => {
    const models = await provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('type');
  });

  test('should classify model types correctly', () => {
    const chatModel = { name: 'gemini-2.0-flash-exp', supportedActions: ['generateContent'] };
    const classification = provider.classifyModelType(chatModel);
    expect(classification.type).toBe('chat');
    expect(classification.capabilities).toContain('chat');
  });

  test('should generate chat responses', async () => {
    const response = await provider.generateChat({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gemini-2.0-flash-exp'
    });
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });

  test('should handle API errors gracefully', async () => {
    const provider = new GeminiProvider({ api_key: 'invalid-key' });
    await expect(provider.healthCheck()).rejects.toThrow();
  });
});
```

### 2. Model Discovery Tests

**Purpose**: Test model discovery and classification across providers.

**Test Scenarios**:
```javascript
describe('Model Discovery', () => {
  test('should discover models from all providers', async () => {
    const providers = ['gemini', 'openai', 'ollama'];
    for (const providerName of providers) {
      const provider = getProvider(providerName);
      const models = await provider.listModels();
      expect(models.length).toBeGreaterThan(0);
    }
  });

  test('should classify models correctly', async () => {
    const geminiProvider = new GeminiProvider({ api_key: process.env.FLEX_CHAT_GEMINI_KEY });
    const models = await geminiProvider.listModels();
    
    const chatModels = models.filter(m => m.type === 'chat');
    const embeddingModels = models.filter(m => m.type === 'embedding');
    
    expect(chatModels.length).toBeGreaterThan(0);
    // Providers may expose embedding models in discovery; RAG wrapper uses embedding models, not Node config
    expect(embeddingModels.length).toBeGreaterThan(0);
  });

  test('should handle model discovery failures', async () => {
    const provider = new GeminiProvider({ api_key: 'invalid-key' });
    const models = await provider.listModels();
    expect(models).toEqual(provider.getDefaultModelsList());
  });
});
```

### 3. 6-Phase Processing Flow Tests

**Purpose**: Test the complete 6-phase processing flow with different scenarios.

**Test Scenarios**:
```javascript
describe('6-Phase Processing Flow', () => {
  test('should process chat without RAG', async () => {
    const config = loadConfig('examples/06-gemini-simple-test.json');
    const result = await processChatRequest({
      prompt: 'Hello, how are you?',
      previousMessages: [],
      selectedCollections: [],
      topic: ''
    }, config);
    
    expect(result.response).toBeDefined();
    expect(result.topic).toBeDefined();
    expect(result.model).toBe('gemini-2.0-flash-exp');
  });

  test('should process chat with RAG', async () => {
    const config = loadConfig('examples/07-gemini-rag-test.json');
    const result = await processChatRequest({
      prompt: 'What is OpenShift AI?',
      previousMessages: [],
      selectedCollections: [{ service: 'red_hat_products', name: 'openshift-ai' }],
      topic: ''
    }, config);
    
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(500); // Should be comprehensive
    expect(result.service).toBe('red_hat_products');
  });

  test('should handle topic detection', async () => {
    const result = await identifyTopic('What is OpenShift AI?', [], '', config.intent, aiProviders);
    expect(result).toContain('OpenShift');
  });

  test('should handle intent detection', async () => {
    const rag = { results: [], service: 'red_hat_products' };
    const intent = await detectIntent('OpenShift AI question', rag, config.intent, aiProviders);
    expect(intent).toBeDefined();
  });
});
```

### 4. RAG Integration Tests

**Purpose**: Test RAG integration with mocked and real RAG services.

**Test Scenarios**:
```javascript
describe('RAG Integration', () => {
  test('should work with mocked RAG service', async () => {
    const mockRAGService = {
      query: jest.fn().mockResolvedValue({
        results: [
          { content: 'OpenShift AI is a platform for AI/ML workloads', distance: 0.1 }
        ],
        service: 'red_hat_products'
      })
    };
    
    const result = await collectRagResults(
      'OpenShift AI',
      [{ service: 'red_hat_products', name: 'openshift-ai' }],
      { red_hat_products: mockRAGService },
      {}
    );
    
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.service).toBe('red_hat_products');
  });

  test('should handle RAG service failures', async () => {
    const failingRAGService = {
      query: jest.fn().mockRejectedValue(new Error('RAG service unavailable'))
    };
    
    const result = await collectRagResults(
      'OpenShift AI',
      [{ service: 'red_hat_products', name: 'openshift-ai' }],
      { red_hat_products: failingRAGService },
      {}
    );
    
    expect(result.results).toEqual([]);
    expect(result.service).toBeUndefined();
  });
});
```

### 5. Performance Tests

**Purpose**: Test response times and reliability across providers.

**Test Scenarios**:
```javascript
describe('Performance Tests', () => {
  test('should respond within acceptable time limits', async () => {
    const startTime = Date.now();
    const result = await processChatRequest({
      prompt: 'Hello',
      previousMessages: [],
      selectedCollections: [],
      topic: ''
    }, config);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // 5 seconds max
    expect(result.response).toBeDefined();
  });

  test('should handle concurrent requests', async () => {
    const requests = Array(10).fill().map(() => 
      processChatRequest({
        prompt: 'Test concurrent request',
        previousMessages: [],
        selectedCollections: [],
        topic: ''
      }, config)
    );
    
    const results = await Promise.all(requests);
    expect(results.length).toBe(10);
    results.forEach(result => {
      expect(result.response).toBeDefined();
    });
  });
});
```

## Test Configuration

### Test Environment Setup

```javascript
// test/setup.js
const { config } = require('dotenv');

// Load test environment variables
config({ path: '.env.test' });

// Mock external services
jest.mock('../backend/chat/ai-providers/providers', () => ({
  GeminiProvider: jest.fn(),
  OpenAIProvider: jest.fn(),
  OllamaProvider: jest.fn()
}));

// Test data fixtures
const testConfigs = {
  simple: require('../config/examples/06-gemini-simple-test.json'),
  rag: require('../config/examples/07-gemini-rag-test.json'),
  multi: require('../config/examples/05-gemini-multi-llm.json')
};
```

### Test Data Fixtures

```javascript
// test/fixtures/chat-requests.js
module.exports = {
  simpleChat: {
    prompt: 'Hello, how are you?',
    previousMessages: [],
    selectedCollections: [],
    selectedModels: [],
    topic: ''
  },
  
  ragChat: {
    prompt: 'What is OpenShift AI?',
    previousMessages: [],
    selectedCollections: [{ service: 'red_hat_products', name: 'openshift-ai' }],
    selectedModels: [],
    topic: ''
  },
  
  multiProviderChat: {
    prompt: 'Test different providers',
    previousMessages: [],
    selectedCollections: [],
    selectedModels: [],
    topic: ''
  }
};
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ai-provider-tests.yml
name: AI Provider Tests

on:
  push:
    branches: [main, feature/*]
  pull_request:
    branches: [main]

jobs:
  test-providers:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        provider: [gemini, openai, ollama]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run provider tests
      env:
        FLEX_CHAT_GEMINI_KEY: ${{ secrets.FLEX_CHAT_GEMINI_KEY }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      run: npm test -- --testNamePattern="${{ matrix.provider }}"
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run performance tests
      run: npm run test:performance
```

## Test Execution

### Local Testing

```bash
# Run all tests
npm test

# Run specific provider tests
npm test -- --testNamePattern="GeminiProvider"

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run with coverage
npm run test:coverage
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:integration": "jest --testPathPattern=integration",
    "test:performance": "jest --testPathPattern=performance",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

## Benefits

### ✅ **Reliability**
- Catch regressions early
- Ensure consistent behavior across providers
- Validate model compatibility

### ✅ **Performance**
- Monitor response times
- Identify performance bottlenecks
- Ensure scalability

### ✅ **Quality**
- Validate response quality
- Test error handling
- Ensure graceful failures

### ✅ **Maintenance**
- Easy to add new providers
- Simple to test new models
- Clear test coverage

## Next Steps

1. **Implement test framework** - Set up Jest and test structure
2. **Create test fixtures** - Mock data and configurations
3. **Write unit tests** - Individual provider functionality
4. **Write integration tests** - End-to-end scenarios
5. **Set up CI/CD** - Automated testing pipeline
6. **Monitor performance** - Track response times and reliability

---

*This automated testing strategy ensures robust, reliable, and performant AI provider integration in Flex Chat.*
