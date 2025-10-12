const axios = require('axios');
const AIProvider = require('../base/AIProvider');
const ModelInfo = require('../base/ModelInfo');

/**
 * OpenAIProvider - Implementation for OpenAI API
 */
class OpenAIProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.apiUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
  }

  /**
   * List all available OpenAI models
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });

      const models = response.data.data.map(model => {
        const isChatModel = model.id.startsWith('gpt-') || model.id.includes('chat');
        const isEmbeddingModel = model.id.includes('embedding') || model.id.includes('ada');
        
        let type = 'chat';
        if (isEmbeddingModel && !isChatModel) type = 'embedding';
        else if (isEmbeddingModel && isChatModel) type = 'both';

        return this.createModelInfo({
          id: model.id,
          name: model.id,
          type: type,
          maxTokens: this.getMaxTokensForModel(model.id),
          description: this.getModelDescription(model.id),
          capabilities: this.getModelCapabilities(model.id)
        });
      });

      return models;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
      // Return default models if API call fails
      return this.getDefaultModelsList();
    }
  }

  /**
   * Generate chat completion
   */
  async generateChat(messages, model, options = {}) {
    const requestData = {
      model: model,
      messages: messages,
      max_tokens: options.max_tokens || this.config.maxTokens,
      temperature: options.temperature || this.config.temperature,
      ...options
    };

    return await this.withRetry(async () => {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model,
        finish_reason: response.data.choices[0].finish_reason
      };
    });
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(text, model) {
    const input = Array.isArray(text) ? text : [text];
    
    return await this.withRetry(async () => {
      const response = await axios.post(
        `${this.apiUrl}/embeddings`,
        {
          model: model,
          input: input
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      return response.data.data.map(item => item.embedding);
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Try to list models as a health check
      await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return {
        status: 'healthy',
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'OpenAI API key'
        },
        baseUrl: {
          type: 'string',
          description: 'OpenAI API base URL',
          default: 'https://api.openai.com/v1'
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds',
          default: 30000
        },
        retries: {
          type: 'number',
          description: 'Number of retries for failed requests',
          default: 3
        },
        retryDelay: {
          type: 'number',
          description: 'Delay between retries in milliseconds',
          default: 1000
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for responses',
          default: 1000
        },
        temperature: {
          type: 'number',
          description: 'Temperature for response generation',
          minimum: 0,
          maximum: 2,
          default: 0.7
        }
      },
      required: ['apiKey']
    };
  }

  /**
   * Get default models
   */
  getDefaultModels() {
    return {
      chat: 'gpt-4o-mini',
      embedding: 'text-embedding-3-small'
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    
    if (!config.apiKey) {
      errors.push('OpenAI API key is required');
    }
    
    if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
      errors.push('Invalid base URL format');
    }
    
    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default models list (fallback when API is unavailable)
   */
  getDefaultModelsList() {
    return [
      this.createModelInfo({
        id: 'gpt-4o',
        name: 'GPT-4o',
        type: 'chat',
        maxTokens: 128000,
        description: 'Most capable GPT-4 model',
        capabilities: ['function-calling', 'vision', 'json-mode']
      }),
      this.createModelInfo({
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        type: 'chat',
        maxTokens: 128000,
        description: 'Faster, cheaper GPT-4 model',
        capabilities: ['function-calling', 'vision', 'json-mode']
      }),
      this.createModelInfo({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        type: 'chat',
        maxTokens: 16384,
        description: 'Fast and efficient model',
        capabilities: ['function-calling']
      }),
      this.createModelInfo({
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        type: 'embedding',
        maxTokens: 8191,
        description: 'Latest embedding model, small',
        capabilities: []
      }),
      this.createModelInfo({
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        type: 'embedding',
        maxTokens: 8191,
        description: 'Latest embedding model, large',
        capabilities: []
      }),
      this.createModelInfo({
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada 002',
        type: 'embedding',
        maxTokens: 8191,
        description: 'Previous generation embedding model',
        capabilities: []
      })
    ];
  }

  /**
   * Get max tokens for a specific model
   */
  getMaxTokensForModel(modelId) {
    const tokenLimits = {
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16384,
      'text-embedding-3-small': 8191,
      'text-embedding-3-large': 8191,
      'text-embedding-ada-002': 8191
    };
    
    return tokenLimits[modelId] || 4096;
  }

  /**
   * Get model description
   */
  getModelDescription(modelId) {
    const descriptions = {
      'gpt-4o': 'Most capable GPT-4 model with vision and function calling',
      'gpt-4o-mini': 'Faster, cheaper GPT-4 model with vision and function calling',
      'gpt-4-turbo': 'High-performance GPT-4 model',
      'gpt-4': 'Standard GPT-4 model',
      'gpt-3.5-turbo': 'Fast and efficient GPT-3.5 model',
      'text-embedding-3-small': 'Latest embedding model, small and efficient',
      'text-embedding-3-large': 'Latest embedding model, large and powerful',
      'text-embedding-ada-002': 'Previous generation embedding model'
    };
    
    return descriptions[modelId] || 'OpenAI model';
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(modelId) {
    const capabilities = {
      'gpt-4o': ['function-calling', 'vision', 'json-mode'],
      'gpt-4o-mini': ['function-calling', 'vision', 'json-mode'],
      'gpt-4-turbo': ['function-calling', 'vision', 'json-mode'],
      'gpt-4': ['function-calling', 'json-mode'],
      'gpt-3.5-turbo': ['function-calling']
    };
    
    return capabilities[modelId] || [];
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = OpenAIProvider;
