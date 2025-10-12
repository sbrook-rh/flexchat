/**
 * RetrievalProvider - Abstract base class for retrieval/context providers
 * All retrieval providers must implement these methods
 */
class RetrievalProvider {
  constructor(config) {
    if (this.constructor === RetrievalProvider) {
      throw new Error('RetrievalProvider is an abstract class and cannot be instantiated directly');
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
   * Query the provider for relevant context
   * @param {string} text - Query text
   * @param {Object} options - Query options (top_k, filters, etc.)
   * @returns {Promise<Array>} Array of results with text and score
   */
  async query(text, options = {}) {
    throw new Error('query() must be implemented by subclass');
  }

  /**
   * Check if the provider is healthy and available
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Get the configuration schema for this provider
   * @returns {Object} JSON schema for provider configuration
   */
  getConfigSchema() {
    throw new Error('getConfigSchema() must be implemented by subclass');
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
   * Initialize the provider (setup connections, etc.)
   * @returns {Promise<void>}
   */
  async initialize() {
    // Optional - override if needed
  }

  /**
   * Cleanup resources (close connections, etc.)
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Optional - override if needed
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

  /**
   * Check if URL is valid
   * @param {string} string - URL to validate
   * @returns {boolean}
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

module.exports = RetrievalProvider;

