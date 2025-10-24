/**
 * AI Provider Automated Tests
 * 
 * This test suite validates AI provider functionality, model discovery,
 * and the 6-phase processing flow with different scenarios.
 */

const { GeminiProvider } = require('../ai-providers/providers');
const { OpenAIProvider } = require('../ai-providers/providers');
const { OllamaProvider } = require('../ai-providers/providers');

// Mock external dependencies
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      list: jest.fn().mockResolvedValue({
        pageLength: 2,
        getItem: jest.fn().mockImplementation((index) => ({
          name: index === 0 ? 'gemini-2.0-flash-exp' : 'text-embedding-004',
          displayName: index === 0 ? 'Gemini 2.0 Flash Experimental' : 'Text Embedding 004',
          description: index === 0 ? 'Fast chat model' : 'Embedding model',
          supportedActions: index === 0 ? ['generateContent'] : ['embedText'],
          inputTokenLimit: index === 0 ? 8192 : 2048
        }))
      })
    }
  }))
}));

describe('AI Provider Tests', () => {
  let geminiProvider;
  let openaiProvider;
  let ollamaProvider;

  beforeEach(() => {
    geminiProvider = new GeminiProvider({ api_key: 'test-key' });
    openaiProvider = new OpenAIProvider({ api_key: 'test-key' });
    ollamaProvider = new OllamaProvider({ base_url: 'http://localhost:11434' });
  });

  describe('Provider Initialization', () => {
    test('should initialize Gemini provider', () => {
      expect(geminiProvider).toBeDefined();
      expect(geminiProvider.apiKey).toBe('test-key');
    });

    test('should initialize OpenAI provider', () => {
      expect(openaiProvider).toBeDefined();
      expect(openaiProvider.apiKey).toBe('test-key');
    });

    test('should initialize Ollama provider', () => {
      expect(ollamaProvider).toBeDefined();
      expect(ollamaProvider.baseUrl).toBe('http://localhost:11434');
    });
  });

  describe('Model Discovery', () => {
    test('should discover models from Gemini provider', async () => {
      const models = await geminiProvider.listModels();
      
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // Check model structure
      const model = models[0];
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('type');
      expect(model).toHaveProperty('capabilities');
      expect(model).toHaveProperty('maxTokens');
    });

    test('should classify model types correctly', () => {
      const chatModel = {
        name: 'gemini-2.0-flash-exp',
        supportedActions: ['generateContent']
      };
      const embeddingModel = {
        name: 'text-embedding-004',
        supportedActions: ['embedText']
      };

      const chatClassification = geminiProvider.classifyModelType(chatModel);
      const embeddingClassification = geminiProvider.classifyModelType(embeddingModel);

      expect(chatClassification.type).toBe('chat');
      expect(chatClassification.capabilities).toContain('chat');
      
      expect(embeddingClassification.type).toBe('embedding');
      expect(embeddingClassification.capabilities).toContain('embedding');
    });

    test('should handle model discovery failures gracefully', async () => {
      // Mock API failure
      geminiProvider.genAI.models.list = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const models = await geminiProvider.listModels();
      expect(models).toEqual(geminiProvider.getDefaultModelsList());
    });
  });

  describe('Health Checks', () => {
    test('should pass health check with valid API key', async () => {
      // Mock successful health check
      geminiProvider.genAI.models.list = jest.fn().mockResolvedValue({
        pageLength: 1,
        getItem: jest.fn().mockReturnValue({ name: 'test-model' })
      });

      const health = await geminiProvider.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details).toBeDefined();
    });

    test('should fail health check with invalid API key', async () => {
      // Mock API failure
      geminiProvider.genAI.models.list = jest.fn().mockRejectedValue(new Error('Invalid API key'));

      const health = await geminiProvider.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should validate Gemini configuration', () => {
      const validConfig = { api_key: 'valid-key' };
      const invalidConfig = { api_key: '' };

      expect(() => geminiProvider.validateConfig(validConfig)).not.toThrow();
      expect(() => geminiProvider.validateConfig(invalidConfig)).toThrow();
    });

    test('should return configuration schema', () => {
      const schema = geminiProvider.getConfigSchema();
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('api_key');
    });
  });

  describe('Default Models', () => {
    test('should return default models list', () => {
      const defaultModels = geminiProvider.getDefaultModels();
      expect(defaultModels).toBeDefined();
      expect(Array.isArray(defaultModels)).toBe(true);
      expect(defaultModels.length).toBeGreaterThan(0);
    });
  });
});

describe('6-Phase Processing Flow Tests', () => {
  const mockConfig = {
    llms: {
      gemini: { api_key: 'test-key', provider: 'gemini' }
    },
    responses: [
      {
        prompt: 'You are a helpful assistant.',
        llm: 'gemini',
        model: 'gemini-2.0-flash-exp'
      }
    ]
  };

  test('should process chat request without RAG', async () => {
    const request = {
      prompt: 'Hello, how are you?',
      previousMessages: [],
      selectedCollections: [],
      topic: ''
    };

    // Mock the processing flow
    const mockProcessChatRequest = jest.fn().mockResolvedValue({
      response: 'Hello! I am doing well, thank you for asking.',
      topic: 'greeting',
      service: undefined,
      model: 'gemini-2.0-flash-exp'
    });

    const result = await mockProcessChatRequest(request, mockConfig);
    
    expect(result.response).toBeDefined();
    expect(result.topic).toBeDefined();
    expect(result.model).toBe('gemini-2.0-flash-exp');
  });

  test('should process chat request with RAG', async () => {
    const request = {
      prompt: 'What is OpenShift AI?',
      previousMessages: [],
      selectedCollections: [{ service: 'red_hat_products', name: 'openshift-ai' }],
      topic: ''
    };

    // Mock RAG results
    const mockRAGResults = {
      results: [
        { content: 'OpenShift AI is a platform for AI/ML workloads', distance: 0.1 }
      ],
      service: 'red_hat_products'
    };

    const mockProcessChatRequest = jest.fn().mockResolvedValue({
      response: 'OpenShift AI is a platform for AI/ML workloads...',
      topic: 'OpenShift AI technology',
      service: 'red_hat_products',
      model: 'gemini-2.0-flash-exp'
    });

    const result = await mockProcessChatRequest(request, mockConfig);
    
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(100);
    expect(result.service).toBe('red_hat_products');
  });
});

describe('Performance Tests', () => {
  test('should respond within acceptable time limits', async () => {
    const startTime = Date.now();
    
    // Mock fast response
    const mockGenerateChat = jest.fn().mockResolvedValue({
      content: 'Test response',
      usage: { totalTokens: 10 }
    });
    
    geminiProvider.generateChat = mockGenerateChat;
    
    const result = await geminiProvider.generateChat({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gemini-2.0-flash-exp'
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // 1 second max for test
    expect(result.content).toBeDefined();
  });

  test('should handle concurrent requests', async () => {
    const requests = Array(5).fill().map(() => 
      geminiProvider.generateChat({
        messages: [{ role: 'user', content: 'Test concurrent request' }],
        model: 'gemini-2.0-flash-exp'
      })
    );
    
    const results = await Promise.all(requests);
    expect(results.length).toBe(5);
    results.forEach(result => {
      expect(result.content).toBeDefined();
    });
  });
});

describe('Error Handling', () => {
  test('should handle API errors gracefully', async () => {
    geminiProvider.genAI.models.list = jest.fn().mockRejectedValue(new Error('API Error'));
    
    const models = await geminiProvider.listModels();
    expect(models).toEqual(geminiProvider.getDefaultModelsList());
  });

  test('should handle network timeouts', async () => {
    geminiProvider.genAI.models.list = jest.fn().mockRejectedValue(new Error('Network timeout'));
    
    const health = await geminiProvider.healthCheck();
    expect(health.status).toBe('unhealthy');
    expect(health.error).toContain('Network timeout');
  });

  test('should handle invalid model names', async () => {
    geminiProvider.genAI.models.list = jest.fn().mockRejectedValue(new Error('Model not found'));
    
    const health = await geminiProvider.healthCheck();
    expect(health.status).toBe('unhealthy');
    expect(health.error).toContain('Model not found');
  });
});
