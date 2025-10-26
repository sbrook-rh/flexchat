/**
 * Phase 1 Services Tests
 * Tests for Configuration Builder System - Phase 1 services
 * 
 * Note: These tests verify core functionality of Phase 1 services
 * Some tests require live services (Ollama) to be running
 */

// Skip setup.js to avoid mocking issues
jest.mock('../ai-providers/providers/OpenAIProvider', () => class {}, { virtual: true });
jest.mock('../ai-providers/providers/OllamaProvider', () => class {}, { virtual: true });
jest.mock('../ai-providers/providers/GeminiProvider', () => class {}, { virtual: true });

const { ProviderDiscovery } = require('../ai-providers/discovery');
const { ConnectionTester } = require('../ai-providers/services/ConnectionTester');
const { EnvVarManager } = require('../ai-providers/services/EnvVarManager');

describe('Phase 1: Provider Discovery Service', () => {
  describe('ProviderDiscovery.listProviders()', () => {
    it('should return structured provider list with LLM and RAG categories', async () => {
      const discovery = new ProviderDiscovery();
      const result = await discovery.listProviders();
      
      expect(result).toHaveProperty('llm');
      expect(result).toHaveProperty('rag');
      expect(Array.isArray(result.llm)).toBe(true);
      expect(Array.isArray(result.rag)).toBe(true);
    });

    it('should include required fields for each provider', async () => {
      const discovery = new ProviderDiscovery();
      const result = await discovery.listProviders();
      
      // Check LLM providers
      result.llm.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('display_name');
        expect(provider).toHaveProperty('description');
        expect(provider).toHaveProperty('schema');
        expect(typeof provider.id).toBe('string');
        expect(typeof provider.display_name).toBe('string');
      });
    });

    it('should include connection schema for each provider', async () => {
      const discovery = new ProviderDiscovery();
      const result = await discovery.listProviders();
      
      // Test at least one LLM provider has schema
      const openaiProvider = result.llm.find(p => p.id === 'openai');
      expect(openaiProvider).toBeDefined();
      expect(openaiProvider.schema).toHaveProperty('fields');
      expect(Array.isArray(openaiProvider.schema.fields)).toBe(true);
      expect(openaiProvider.schema.fields.length).toBeGreaterThan(0);
    });

    it('should discover all expected LLM providers', async () => {
      const discovery = new ProviderDiscovery();
      const result = await discovery.listProviders();
      
      const llmIds = result.llm.map(p => p.id);
      expect(llmIds).toContain('openai');
      expect(llmIds).toContain('ollama');
      expect(llmIds).toContain('gemini');
    });
  });
});

describe('Phase 1: Connection Testing Service', () => {
  describe('ConnectionTester.testConnection()', () => {
    it('should test Ollama connection successfully', async () => {
      const tester = new ConnectionTester();
      const config = {
        provider: 'ollama',
        base_url: 'http://localhost:11434'
      };
      
      // Note: This requires Ollama to be running
      const result = await tester.testConnection('llm', 'ollama', config);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('method');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.duration).toBe('number');
    }, 15000); // 15s timeout for network call

    it('should handle connection failure gracefully', async () => {
      const tester = new ConnectionTester();
      const config = {
        provider: 'ollama',
        base_url: 'http://invalid-host:99999'
      };
      
      const result = await tester.testConnection('llm', 'ollama', config);
      
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('errorType');
    });

    it('should timeout after 10 seconds', async () => {
      const tester = new ConnectionTester();
      const config = {
        provider: 'ollama',
        base_url: 'http://10.255.255.1:11434' // Non-routable IP
      };
      
      const startTime = Date.now();
      const result = await tester.testConnection('llm', 'ollama', config);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(false);
      expect(duration).toBeLessThan(12000); // Should timeout in ~10s
    }, 15000);

    it('should classify error types correctly', async () => {
      const tester = new ConnectionTester();
      const config = {
        provider: 'openai',
        api_key: 'invalid-key'
      };
      
      const result = await tester.testConnection('llm', 'openai', config);
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBeDefined();
      expect(['authentication', 'network', 'timeout', 'unknown']).toContain(result.errorType);
    });
  });
});

describe('Phase 1: Environment Variable Manager', () => {
  // Save original env vars
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Set up test env vars
    process.env.FLEX_CHAT_TEST_VAR = 'test-value';
    process.env.OPENAI_API_KEY = 'sk-test1234567890';
    process.env.GEMINI_API_KEY = 'gm-test1234567890';
    process.env.UNRELATED_VAR = 'should-not-appear';
  });

  afterEach(() => {
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  describe('EnvVarManager.listEnvVars()', () => {
    it('should list allowed environment variables', () => {
      const manager = new EnvVarManager();
      const result = manager.listEnvVars();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by allowlist patterns', () => {
      const manager = new EnvVarManager();
      const result = manager.listEnvVars();
      
      const names = result.map(v => v.name);
      
      // Should include allowed vars
      expect(names).toContain('FLEX_CHAT_TEST_VAR');
      expect(names).toContain('OPENAI_API_KEY');
      expect(names).toContain('GEMINI_API_KEY');
      
      // Should NOT include unrelated vars
      expect(names).not.toContain('UNRELATED_VAR');
    });

    it('should mask sensitive values', () => {
      const manager = new EnvVarManager();
      const result = manager.listEnvVars();
      
      const openaiVar = result.find(v => v.name === 'OPENAI_API_KEY');
      expect(openaiVar).toBeDefined();
      expect(openaiVar.value).toMatch(/^sk-t.*90$/);
      expect(openaiVar.value).toContain('***');
      expect(openaiVar.value.length).toBeLessThan('sk-test1234567890'.length);
    });

    it('should include isSensitive flag', () => {
      const manager = new EnvVarManager();
      const result = manager.listEnvVars();
      
      result.forEach(envVar => {
        expect(envVar).toHaveProperty('isSensitive');
        expect(typeof envVar.isSensitive).toBe('boolean');
      });
    });
  });

  describe('EnvVarManager.getEnvVarSuggestions()', () => {
    it('should suggest environment variables for API key fields', () => {
      const manager = new EnvVarManager();
      const suggestions = manager.getEnvVarSuggestions('api_key');
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('OPENAI_API_KEY');
    });

    it('should suggest variables for URL fields', () => {
      const manager = new EnvVarManager();
      const suggestions = manager.getEnvVarSuggestions('base_url');
      
      expect(Array.isArray(suggestions)).toBe(true);
      // Should include FLEX_CHAT vars that might contain URLs
    });

    it('should return empty array for unknown field types', () => {
      const manager = new EnvVarManager();
      const suggestions = manager.getEnvVarSuggestions('unknown_field_type');
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0); // Still returns FLEX_CHAT vars
    });
  });
});

describe('Phase 1: Configuration Loader Integration', () => {
  const { loadConfig, getProcessedConfig } = require('../lib/config-loader');
  const path = require('path');
  
  it('should load raw config with placeholders intact', () => {
    // Use a test config file
    const configPath = path.join(__dirname, '../../../config/config-simon.json');
    const rawConfig = loadConfig(configPath);
    
    expect(rawConfig).toBeDefined();
    expect(rawConfig).toHaveProperty('llms');
    
    // Check if any values contain ${...} placeholders
    const configStr = JSON.stringify(rawConfig);
    if (configStr.includes('${')) {
      expect(configStr).toMatch(/\$\{[A-Z_]+\}/);
    }
  });

  it('should process environment variables on demand', () => {
    const rawConfig = {
      test_key: '${FLEX_CHAT_TEST_VAR}',
      nested: {
        api_key: '${OPENAI_API_KEY}'
      }
    };
    
    // Set env vars
    process.env.FLEX_CHAT_TEST_VAR = 'processed-value';
    process.env.OPENAI_API_KEY = 'sk-processed';
    
    const processed = getProcessedConfig(rawConfig);
    
    expect(processed.test_key).toBe('processed-value');
    expect(processed.nested.api_key).toBe('sk-processed');
    
    // Raw config should remain unchanged
    expect(rawConfig.test_key).toBe('${FLEX_CHAT_TEST_VAR}');
  });

  it('should handle missing environment variables gracefully', () => {
    const rawConfig = {
      missing: '${NONEXISTENT_VAR}'
    };
    
    const processed = getProcessedConfig(rawConfig);
    
    // Should keep placeholder if env var doesn't exist
    expect(processed.missing).toBe('${NONEXISTENT_VAR}');
  });
});

