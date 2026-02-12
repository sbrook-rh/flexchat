const ModelInfo = require('./ModelInfo');

/**
 * AIProvider - Abstract base class for AI service providers
 * All AI providers must implement these methods
 */
class AIProvider {
  constructor(config) {
    if (this.constructor === AIProvider) {
      throw new Error('AIProvider is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
    this.name = this.constructor.name.replace('Provider', '');
  }

  /**
   * Get the provider name
   */
  getName() {
    return this.name;
  }

  /**
   * List all available models from this provider
   * @returns {Promise<ModelInfo[]>} Array of available models
   */
  async listModels() {
    throw new Error('listModels() must be implemented by subclass');
  }

  /**
   * Generate a chat completion
   * @param {Array} messages - Array of message objects with role and content
   * @param {string} model - Model ID to use
   * @param {Object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<Object>} Chat completion response
   */
  async generateChat(messages, model, options = {}) {
    throw new Error('generateChat() must be implemented by subclass');
  }

  /**
   * Generate embeddings for text
   * @param {string|Array} text - Text or array of texts to embed
   * @param {string} model - Embedding model ID to use
   * @returns {Promise<Array>} Array of embedding vectors
   */
  async generateEmbeddings(text, model) {
    throw new Error('generateEmbeddings() must be implemented by subclass');
  }

  /**
   * Check if the provider is healthy and available
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Get the connection schema for UI-driven configuration
   * Returns a schema describing configuration fields for dynamic form generation
   * @returns {Object} Connection schema with display_name, fields, and metadata
   */
  static getConnectionSchema() {
    throw new Error('getConnectionSchema() must be implemented by subclass');
  }

  /**
   * Get default models for this provider
   * @returns {Object} Default model IDs for chat and embeddings
   */
  getDefaultModels() {
    throw new Error('getDefaultModels() must be implemented by subclass');
  }

  /**
   * Validate configuration for this provider
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateConfig(config) {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  /**
   * Get a chat model by name or return default
   * @param {string} modelName - Model name to find
   * @returns {Promise<string>} Model ID
   */
  async getChatModel(modelName = null) {
    const models = await this.listModels();
    const chatModels = models.filter(m => m.canChat());
    
    if (modelName) {
      const model = chatModels.find(m => 
        m.id === modelName || m.name === modelName
      );
      if (model) return model.id;
    }
    
    // Return first available chat model or default
    return chatModels.length > 0 ? chatModels[0].id : this.getDefaultModels().chat;
  }

  /**
   * Get an embedding model by name or return default
   * @param {string} modelName - Model name to find
   * @returns {Promise<string>} Model ID
   */
  async getEmbeddingModel(modelName = null) {
    const models = await this.listModels();
    const embeddingModels = models.filter(m => m.canEmbed());
    
    if (modelName) {
      const model = embeddingModels.find(m => 
        m.id === modelName || m.name === modelName
      );
      if (model) return model.id;
    }
    
    // Return first available embedding model or default
    return embeddingModels.length > 0 ? embeddingModels[0].id : this.getDefaultModels().embedding;
  }

  /**
   * Log debug information when FLEX_CHAT_DEBUG=1.
   * Use in generateChat() implementations to log request/response payloads.
   *
   * @param {string} label - Short label, e.g. 'request payload' or 'raw response'
   * @param {*} data - Data to log (will be JSON-stringified if object)
   */
  debugLog(label, data) {
    if (process.env.FLEX_CHAT_DEBUG !== '1') return;
    const prefix = `\n🐛 [${this.name}] ${label}:`;
    if (data !== null && data !== undefined && typeof data === 'object') {
      try {
        console.log(prefix);
        console.log(JSON.stringify(data, null, 2));
      } catch {
        console.log(prefix, data);
      }
    } else {
      console.log(prefix, data);
    }
  }

  /**
   * Helper method to create a ModelInfo object
   * @param {Object} modelData - Model data
   * @returns {ModelInfo} ModelInfo instance
   */
  createModelInfo(modelData) {
    return new ModelInfo({
      ...modelData,
      provider: this.name
    });
  }

  /**
   * Classify model type and capabilities
   * 
   * NOTE: When implementing this method, prefer using actual API data over model name patterns.
   * For example, use supportedActions, capabilities, or other API-provided metadata
   * instead of guessing from model names. This provides more accurate classification.
   * 
   * @param {Object} model - Model object from API
   * @returns {Object} Classification with type and capabilities
   */
  classifyModelType(model) {
    throw new Error('classifyModelType() must be implemented by subclass');
  }

  /**
   * Helper method for retry logic
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay between retries in ms
   * @returns {Promise<any>} Operation result
   */
  async withRetry(operation, maxRetries = null, delay = null) {
    const retries = maxRetries || this.config.retries || 3;
    const retryDelay = delay || this.config.retryDelay || 1000;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether the error is retryable
   */
  isRetryableError(error) {
    // Common retryable error conditions
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const retryableMessages = ['timeout', 'network', 'connection', 'rate limit'];
    
    if (error.response && retryableStatusCodes.includes(error.response.status)) {
      return true;
    }
    
    const message = error.message.toLowerCase();
    return retryableMessages.some(keyword => message.includes(keyword));
  }
}

module.exports = AIProvider;
