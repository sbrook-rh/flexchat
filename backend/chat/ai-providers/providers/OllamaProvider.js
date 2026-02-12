const axios = require('axios');
const AIProvider = require('../base/AIProvider');
const ModelInfo = require('../base/ModelInfo');

/**
 * OllamaProvider - Implementation for Ollama local models
 */
class OllamaProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.apiUrl = config.baseUrl || config.base_url || 'http://localhost:11434';
  }


  /**
   * Classify model type based on its name and metadata
   */
  classifyModelType(model) {
    const name = model.name.toLowerCase();
    const family = (model.details?.family || '').toLowerCase();

    // Reasoning models
    if (name.includes('deepseek') || name.includes('r1') || name.includes('reason') || name.includes('think')) {
      return { type: 'reasoning', capabilities: ['reasoning', 'general-llm'] };
    }

    // Embedding models
    if (name.includes('embed') || family.includes('bert')) {
      return { type: 'embedding', capabilities: ['embedding'] };
    }

    // Chat / instruction models
    if (name.includes('instruct') || name.includes('chat') || name.includes('assistant')) {
      return { type: 'chat', capabilities: ['chat'] };
    }

    // Code-specialised models
    if (name.includes('code') || name.includes('coder') || family.includes('code')) {
      return { type: 'code', capabilities: ['chat', 'code'] };
    }

    // Default
    return { type: 'base', capabilities: [] };
  }

  /**
   * List all available Ollama models
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.apiUrl}/api/tags`, {
        timeout: this.config.timeout || 10000
      });

      const models = response.data.models.map(model => {
        // Ollama models can do both chat and embeddings
        const classification = this.classifyModelType(model);

        return this.createModelInfo({
          id: model.name,
          name: model.name,
          type: classification.type,
          maxTokens: model.details?.parameter_size || 4096,
          description: `Ollama model: ${model.name}`,
          capabilities: classification.capabilities,
          size: model.size,
          modified: model.modified_at
        });
      });

      return models;
    } catch (error) {
      console.error('Error fetching Ollama models:', error.message);
      return [];
    }
  }

  /**
   * Generate chat completion
   */
  async generateChat(messages, model, options = {}) {
    const requestData = {
      model: model,
      messages: messages,
      stream: false,
      options: {
        temperature: options.temperature || this.config.temperature || 0.7,
        num_predict: options.max_tokens || this.config.maxTokens || 1000
      }
    };

    // Add tools to request when provided (Ollama 0.1.26+)
    if (options.tools && options.tools.length > 0) {
      requestData.tools = options.tools;
    }

    this.debugLog('request payload', requestData);

    return await this.withRetry(async () => {
      const response = await axios.post(
        `${this.apiUrl}/api/chat`,
        requestData,
        {
          timeout: options.timeout || this.config.timeout || 60000
        }
      );

      this.debugLog('raw response', response.data);

      const message = response.data.message;
      const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

      const result = {
        content: message.content,
        model: response.data.model,
        finish_reason: hasToolCalls ? 'tool_calls' : (response.data.done ? 'stop' : 'length'),
        usage: {
          prompt_tokens: response.data.prompt_eval_count || 0,
          completion_tokens: response.data.eval_count || 0,
          total_tokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
        }
      };

      // Include tool_calls when present
      if (hasToolCalls) {
        result.tool_calls = message.tool_calls;
      }

      return result;
    });
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(text, model) {
    const input = Array.isArray(text) ? text : [text];

    return await this.withRetry(async () => {
      const embeddings = [];

      // Ollama processes embeddings one at a time
      for (const txt of input) {
        const response = await axios.post(
          `${this.apiUrl}/api/embeddings`,
          {
            model: model,
            prompt: txt
          },
          {
            timeout: this.config.timeout || 30000
          }
        );

        embeddings.push(response.data.embedding);
      }

      return embeddings;
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Try to list models as a health check
      await axios.get(`${this.apiUrl}/api/tags`, {
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
  /**
   * Get connection schema for UI-driven configuration
   */
  static getConnectionSchema() {
    return {
      provider: 'ollama',
      display_name: 'Ollama',
      description: 'Connect to local Ollama server for open-source models',
      fields: [
        {
          name: 'baseUrl',
          type: 'url',
          label: 'Server URL',
          description: 'Ollama server endpoint',
          required: false,
          default: 'http://localhost:11434',
          placeholder: 'http://localhost:11434'
        },
        {
          name: 'timeout',
          type: 'number',
          label: 'Timeout (ms)',
          description: 'Request timeout in milliseconds',
          required: false,
          default: 60000,
          min: 1000,
          max: 300000
        }
      ]
    };
  }


  /**
   * Get default models
   */
  getDefaultModels() {
    return {
      chat: 'llama3.2',
      embedding: 'nomic-embed-text'
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];

    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch (e) {
        errors.push('Invalid base URL format');
      }
    }

    if (config.base_url) {
      try {
        new URL(config.base_url);
      } catch (e) {
        errors.push('Invalid base_url format');
      }
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = OllamaProvider;

