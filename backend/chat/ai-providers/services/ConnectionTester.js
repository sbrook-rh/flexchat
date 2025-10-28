/**
 * ConnectionTester - Service for testing provider connections
 * 
 * This service validates provider configurations by attempting actual connections
 * and performing simple operations to verify they work correctly.
 */
class ConnectionTester {
  constructor() {
    this.defaultTimeout = 10000; // 10 seconds as per spec
  }

  /**
   * Test a provider connection
   * @param {string} providerType - Type of provider ('llm' or 'rag')
   * @param {string} providerId - Provider identifier (e.g., 'openai', 'ollama')
   * @param {Object} config - Configuration to test
   * @returns {Promise<Object>} Test result with status and details
   */
  async testConnection(providerType, providerId, config) {
    const startTime = Date.now();
    console.log('testConnection', providerType, providerId, config);
    try {
      let result;
      
      if (providerType === 'llm') {
        result = await this.testLLMConnection(providerId, config);
      } else if (providerType === 'rag') {
        result = await this.testRAGConnection(providerId, config);
      } else {
        throw new Error(`Unknown provider type: ${providerType}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        provider: providerId,
        type: providerType,
        duration,
        ...result
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        provider: providerId,
        type: providerType,
        duration,
        error: error.message,
        errorType: this.classifyError(error)
      };
    }
  }

  /**
   * Test an LLM provider connection
   * @param {string} providerId - Provider identifier
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Test result details
   */
  async testLLMConnection(providerId, config) {
    // Dynamically load the provider class
    const ProviderClass = this.loadProviderClass('llm', providerId);
    
    // Create a temporary instance with the test config
    const provider = new ProviderClass(config);

    // Test with timeout
    const result = await this.withTimeout(
      async () => {
        // Try to perform a health check first (if available)
        if (typeof provider.healthCheck === 'function') {
          const healthResult = await provider.healthCheck();
          if (healthResult.status !== 'healthy') {
            throw new Error(healthResult.error || 'Health check failed');
          }
          return { method: 'healthCheck', details: healthResult };
        }

        // Fallback: Try to list models
        if (typeof provider.listModels === 'function') {
          const models = await provider.listModels();
          return {
            method: 'listModels',
            modelCount: models.length,
            sampleModels: models.slice(0, 3).map(m => m.id || m.name)
          };
        }

        throw new Error('Provider does not support health check or model listing');
      },
      this.defaultTimeout,
      'Connection test timed out after 10 seconds'
    );

    return result;
  }

  /**
   * Test a RAG provider connection
   * @param {string} providerId - Provider identifier
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Test result details
   */
  async testRAGConnection(providerId, config) {
    // Dynamically load the RAG provider class
    const ProviderClass = this.loadProviderClass('rag', providerId);
    
    // Create a temporary instance with the test config
    const provider = new ProviderClass(config);
    console.log('provider', provider);
    // Test with timeout
    const result = await this.withTimeout(
      async () => {
        // Try to perform a health check
        
        if (typeof provider.healthCheck === 'function') {
          console.log('health check function');
          const healthResult = await provider.healthCheck();
          console.log('health check result', healthResult);
          if (healthResult.status !== 'healthy') {
            console.log('health check failed', healthResult.error);
            throw new Error(healthResult.error || 'Health check failed');
          }
          return { method: 'healthCheck', details: healthResult };
        }

        // Fallback: Try to list collections (if applicable)
        if (typeof provider.listCollections === 'function') {
          const collections = await provider.listCollections();
          return {
            method: 'listCollections',
            collectionCount: collections.length
          };
        }

        throw new Error('Provider does not support health check or collection listing');
      },
      this.defaultTimeout,
      'Connection test timed out after 10 seconds'
    );

    return result;
  }

  /**
   * Load a provider class dynamically
   * @param {string} type - Provider type ('llm' or 'rag')
   * @param {string} providerId - Provider identifier
   * @returns {Class} Provider class
   */
  loadProviderClass(type, providerId) {
    try {
      if (type === 'llm') {
        // Map provider ID to class name
        const className = this.getProviderClassName(providerId);
        const ProviderClass = require(`../providers/${className}`);
        return ProviderClass;
      } else if (type === 'rag') {
        // Map provider ID to RAG class name
        const className = this.getProviderClassName(providerId);
        const ProviderClass = require(`../../retrieval-providers/providers/${className}`);
        return ProviderClass;
      }
    } catch (error) {
      throw new Error(`Failed to load provider ${providerId}: ${error.message}`);
    }
  }

  /**
   * Convert provider ID to class file name
   * @param {string} providerId - Provider identifier (e.g., 'openai', 'chromadb')
   * @returns {string} Class file name (e.g., 'OpenAIProvider.js', 'ChromaDBProvider.js')
   */
  getProviderClassName(providerId) {
    // Convert 'openai' -> 'OpenAIProvider'
    // Convert 'chromadb' -> 'ChromaDBProvider'
    // Convert 'chromadb-wrapper' -> 'ChromaDBWrapperProvider'
    const parts = providerId.split(/[-_]/);
    const className = parts
      .map(part => {
        // Special case: keep 'DB' uppercase
        if (part.toLowerCase() === 'db') {
          return 'DB';
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('');
    return `${className}Provider.js`;
  }

  /**
   * Execute an operation with a timeout
   * @param {Function} operation - Async operation to execute
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} timeoutMessage - Error message on timeout
   * @returns {Promise<any>} Operation result
   */
  async withTimeout(operation, timeout, timeoutMessage) {
    return Promise.race([
      operation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeout)
      )
    ]);
  }

  /**
   * Classify error type for better user feedback
   * @param {Error} error - Error object
   * @returns {string} Error type classification
   */
  classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'authentication';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'authorization';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
      return 'network';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('invalid') || message.includes('bad request') || message.includes('400')) {
      return 'invalid_config';
    }

    return 'unknown';
  }
}

// Export singleton instance
module.exports = new ConnectionTester();

