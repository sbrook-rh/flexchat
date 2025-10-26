/**
 * Test setup and configuration
 */

// Load environment variables for testing
require('dotenv').config({ path: require('path').join(__dirname, '../.env.test') });

// Mock external services
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      list: jest.fn().mockResolvedValue({
        pageLength: 3,
        getItem: jest.fn().mockImplementation((index) => {
          const models = [
            {
              name: 'gemini-2.0-flash-exp',
              displayName: 'Gemini 2.0 Flash Experimental',
              description: 'Fast chat model',
              supportedActions: ['generateContent'],
              inputTokenLimit: 8192
            },
            {
              name: 'text-embedding-004',
              displayName: 'Text Embedding 004',
              description: 'Embedding model',
              supportedActions: ['embedText'],
              inputTokenLimit: 2048
            },
            {
              name: 'gemini-2.0-flash-thinking-exp',
              displayName: 'Gemini 2.0 Flash Thinking Experimental',
              description: 'Reasoning model',
              supportedActions: ['generateContent'],
              inputTokenLimit: 8192
            }
          ];
          return models[index] || models[0];
        })
      })
    }
  }))
}));

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai'
          }
        ]
      })
    }
  }))
}));

// Mock Ollama
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({
      data: {
        models: [
          {
            name: 'qwen2.5:3b-instruct',
            size: 3000000000,
            digest: 'sha256:abc123'
          }
        ]
      }
    })
  }))
}));

// Test data fixtures
global.testConfigs = {
  simple: {
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
  },
  rag: {
    llms: {
      gemini: { api_key: 'test-key', provider: 'gemini' },
      local: { base_url: 'http://localhost:11434', provider: 'ollama' }
    },
    rag_services: {
      red_hat_products: {
        url: 'http://localhost:5006',
        match_threshold: 0.2,
        provider: 'chromadb-wrapper'
      }
    },
    responses: [
      {
        match: {
          rag_results: 'any',
          service: 'red_hat_products',
          collection_contains: 'openshift-ai'
        },
        prompt: 'You are a Red Hat support engineer. Context: {{rag_context}}',
        llm: 'gemini',
        model: 'gemini-2.0-flash-exp'
      }
    ]
  }
};

global.testRequests = {
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
  }
};

// Global test utilities
global.mockRAGService = {
  query: jest.fn().mockResolvedValue({
    results: [
      { content: 'OpenShift AI is a platform for AI/ML workloads', distance: 0.1 }
    ],
    service: 'red_hat_products'
  })
};

global.mockAIProviders = {
  gemini: {
    generateChat: jest.fn().mockResolvedValue({
      content: 'Test response from Gemini',
      usage: { totalTokens: 10 }
    }),
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      details: 'Gemini provider is working'
    })
  }
};
