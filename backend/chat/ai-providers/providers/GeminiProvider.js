const { GoogleGenAI } = require('@google/genai');
const AIProvider = require('../base/AIProvider');
const ModelInfo = require('../base/ModelInfo');

/**
 * GeminiProvider - Implementation for Google Gemini API
 */
class GeminiProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.api_key || config.apiKey;
    this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Classify Gemini model type and capabilities using actual API data
   */
  classifyModelType(model) {
    const supportedActions = model.supportedActions || [];
    const capabilities = [];
    let type = 'base';
    
    // Determine type and capabilities based on supportedActions
    if (supportedActions.includes('generateContent')) {
      type = 'chat';
      capabilities.push('chat');
      
      // Check for advanced features
      if (supportedActions.includes('batchGenerateContent')) {
        capabilities.push('batch-processing');
      }
      if (supportedActions.includes('createCachedContent')) {
        capabilities.push('caching');
      }
      
      // Check model name for additional capabilities (fallback for features not in supportedActions)
      const name = model.name.toLowerCase();
      if (name.includes('flash')) capabilities.push('fast');
      if (name.includes('pro')) capabilities.push('advanced');
      if (name.includes('thinking') || name.includes('reason')) {
        capabilities.push('reasoning', 'planning', 'reflection');
        type = 'reasoning';
      }
    }
    
    if (supportedActions.includes('embedText') || supportedActions.includes('embedContent')) {
      type = 'embedding';
      capabilities.push('embedding');
    }
    
    if (supportedActions.includes('generateAnswer')) {
      type = 'specialized';
      capabilities.push('attributed-qa');
    }
    
    // Check for image generation (fallback to name pattern since not in supportedActions)
    const name = model.name.toLowerCase();
    if (name.includes('imagen')) {
      type = 'image';
      capabilities.push('image-generation');
    }
    
    return { type, capabilities };
  }

  /**
   * List all available Gemini models
   */
  async listModels() {
    try {
      const response = await this.genAI.models.list();
      
      // The @google/genai package returns a Pager object with getItem() method
      const models = [];
      for (let i = 0; i < response.pageLength; i++) {
        const model = response.getItem(i);
        const classification = this.classifyModelType(model);

        models.push(this.createModelInfo({
          id: model.name,
          name: model.displayName || model.name,
          type: classification.type,
          maxTokens: model.inputTokenLimit || 4096,
          description: model.description || `Gemini model: ${model.name}`,
          capabilities: classification.capabilities,
          modified: new Date().toISOString()
        }));
      }

      return models;
    } catch (error) {
      console.error('Error fetching Gemini models:', error.message);
      return this.getDefaultModelsList();
    }
  }

  /**
   * Generate chat completion
   */
  async generateChat(messages, model, options = {}) {
    try {
      const result = await this.genAI.models.generateContent({
        model: model,
        contents: this.convertMessagesToContents(messages),
        generationConfig: {
          temperature: options.temperature || this.config.temperature || 0.7,
          maxOutputTokens: options.max_tokens || this.config.maxTokens || 1000,
        }
      });

      return {
        content: result.text,
        usage: {
          prompt_tokens: this.estimateTokens(JSON.stringify(messages)),
          completion_tokens: this.estimateTokens(result.text),
          total_tokens: this.estimateTokens(JSON.stringify(messages)) + this.estimateTokens(result.text)
        },
        model: model,
        finish_reason: 'stop'
      };
    } catch (error) {
      console.error('Gemini API error:', error.message);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(text, model) {
    try {
      const input = Array.isArray(text) ? text : [text];
      
      const result = await this.genAI.models.embedText({
        model: model,
        text: input
      });

      return result.embeddings || result.embedding;
    } catch (error) {
      console.error('Gemini embedding error:', error.message);
      throw new Error(`Gemini embedding error: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.genAI.models.list();
      
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
        api_key: {
          type: 'string',
          description: 'Google Gemini API key (also accepts apiKey for backwards compatibility)'
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
        retry_delay: {
          type: 'number',
          description: 'Delay between retries in milliseconds',
          default: 1000
        },
        max_tokens: {
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
      required: ['api_key']
    };
  }

  /**
   * Get default models
   */
  getDefaultModels() {
    return {
      chat: 'gemini-2.5-flash',
      embedding: 'text-embedding-004'
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];

    if (!config.api_key && !config.apiKey) {
      errors.push('Gemini API key is required');
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
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        type: 'chat',
        maxTokens: 1048576,
        description: 'Most capable Gemini model with large context window',
        capabilities: ['chat', 'reasoning']
      }),
      this.createModelInfo({
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        type: 'chat',
        maxTokens: 1048576,
        description: 'Fast and efficient Gemini model',
        capabilities: ['chat', 'fast']
      }),
      this.createModelInfo({
        id: 'text-embedding-004',
        name: 'Text Embedding 004',
        type: 'embedding',
        maxTokens: 2048,
        description: 'Latest embedding model',
        capabilities: ['embedding']
      })
    ];
  }

  /**
   * Convert messages to Gemini contents format
   */
  convertMessagesToContents(messages) {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return { role: 'user', parts: [{ text: `System: ${msg.content}` }] };
      } else if (msg.role === 'user') {
        return { role: 'user', parts: [{ text: msg.content }] };
      } else if (msg.role === 'assistant') {
        return { role: 'model', parts: [{ text: msg.content }] };
      }
      return { role: 'user', parts: [{ text: msg.content }] };
    });
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }
}

module.exports = GeminiProvider;
