const axios = require('axios');
const RetrievalProvider = require('../base/RetrievalProvider');

/**
 * ChromaDBWrapperProvider - Implementation for ChromaDB accessed via a Python wrapper service
 * 
 * This provider connects to a lightweight Python FastAPI service that handles:
 * - Text-to-embedding conversion
 * - ChromaDB persistent client access
 * - Simple query interface
 * 
 * Unlike the direct ChromaDB provider, this doesn't need AI services for embeddings
 * as the wrapper handles that internally.
 */
class ChromaDBWrapperProvider extends RetrievalProvider {
  constructor(config, aiService) {
    super(config);
    this.aiService = aiService;
    
    // Required configuration
    this.baseUrl = config.url;
    this.collection = config.collection;
    
    // Optional configuration with sensible defaults
    this.defaultTopK = config.top_k || 3;
    this.timeout = config.timeout || 30000;
    this.defaultThreshold = config.default_threshold || 0.3;
    this.maxDistance = config.max_distance || 1.0;
    
    // Advanced configuration (optional)
    this.auth = config.auth;
    this.customHeaders = config.headers || {};
    this.retryConfig = config.retry || { max_attempts: 3, delay: 1000 };
    this.healthCheckEndpoint = config.health_check_endpoint || '/health';
    
    // State
    this.isInitialized = false;
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    try {
      // Verify the wrapper service is accessible
      const health = await this.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Wrapper service is not healthy: ${health.message}`);
      }
      
      this.isInitialized = true;
      console.log(`✅ ChromaDB Wrapper Provider initialized: ${this.baseUrl} (collection: ${this.collection})`);
    } catch (error) {
      console.error(`❌ Failed to initialize ChromaDB Wrapper Provider: ${error.message}`);
      throw error;
    }
  }


  /**
   * Convert distance to similarity score (0-1 scale)
   */
  distanceToScore(distance) {
    // Assuming cosine distance (0 = identical, 2 = opposite)
    // Convert to similarity score where 1 = perfect match, 0 = no match
    return Math.max(0, Math.min(1, 1 - (distance / 2)));
  }

  /**
   * Get authentication header based on config
   */
  getAuthHeader() {
    if (!this.auth) return {};
    
    switch (this.auth.type) {
      case 'bearer':
        return { 'Authorization': `Bearer ${this.auth.token}` };
      case 'basic':
        const credentials = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
        return { 'Authorization': `Basic ${credentials}` };
      case 'api-key':
        return { [this.auth.header || 'X-API-Key']: this.auth.key };
      default:
        return {};
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async withRetry(operation) {
    let lastError;
    const maxAttempts = this.retryConfig.max_attempts || 3;
    const baseDelay = this.retryConfig.delay || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Health check for the wrapper service
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.baseUrl}${this.healthCheckEndpoint}`,
        {
          timeout: 5000,
          headers: this.auth ? this.getAuthHeader() : {}
        }
      );

      const isHealthy = response.status === 200 && 
                       (!response.data.status || response.data.status === 'ready' || response.data.status === 'healthy');

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        message: isHealthy ? 'Wrapper service is responding' : `Wrapper service returned unexpected status: ${response.data.status}`,
        details: {
          url: this.baseUrl,
          collection: this.collection,
          responseTime: response.headers['x-response-time'] || 'unknown'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: {
          url: this.baseUrl,
          collection: this.collection,
          error: error.code || 'UNKNOWN'
        }
      };
    }
  }

  /**
   * Get configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          description: 'Base URL of the ChromaDB wrapper service',
          examples: ['http://localhost:5006']
        },
        collection: {
          type: 'string',
          description: 'ChromaDB collection name to query (optional for dynamic collections)'
        },
        top_k: {
          type: 'number',
          description: 'Default number of results to return',
          default: 3,
          minimum: 1
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds',
          default: 30000,
          minimum: 1000
        },
        default_threshold: {
          type: 'number',
          description: 'Default distance threshold for filtering results',
          default: 0.3,
          minimum: 0,
          maximum: 2
        },
        max_distance: {
          type: 'number',
          description: 'Maximum distance - results beyond this are ignored',
          default: 1.0,
          minimum: 0,
          maximum: 2
        },
        auth: {
          type: 'object',
          description: 'Authentication configuration',
          properties: {
            type: {
              type: 'string',
              enum: ['bearer', 'basic', 'api-key']
            },
            token: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            key: { type: 'string' },
            header: { type: 'string' }
          }
        },
        headers: {
          type: 'object',
          description: 'Custom HTTP headers to send with requests'
        },
        retry: {
          type: 'object',
          description: 'Retry configuration',
          properties: {
            max_attempts: {
              type: 'number',
              default: 3,
              minimum: 1
            },
            delay: {
              type: 'number',
              default: 1000,
              minimum: 0
            }
          }
        },
        health_check_endpoint: {
          type: 'string',
          description: 'Health check endpoint path',
          default: '/health'
        }
      }
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];

    // Required fields
    if (!config.url) {
      errors.push('url is required');
    } else {
      try {
        new URL(config.url);
      } catch (e) {
        errors.push('url must be a valid URL');
      }
    }

    // Collection is optional for dynamic collection management
    // If not specified, collections can be selected at query time

    // Optional field validation
    if (config.top_k !== undefined && (typeof config.top_k !== 'number' || config.top_k < 1)) {
      errors.push('top_k must be a positive number');
    }

    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
      errors.push('timeout must be at least 1000ms');
    }

    if (config.default_threshold !== undefined) {
      if (typeof config.default_threshold !== 'number' || config.default_threshold < 0 || config.default_threshold > 2) {
        errors.push('default_threshold must be between 0 and 2');
      }
    }

    if (config.max_distance !== undefined) {
      if (typeof config.max_distance !== 'number' || config.max_distance < 0 || config.max_distance > 2) {
        errors.push('max_distance must be between 0 and 2');
      }
    }

    // Auth validation
    if (config.auth) {
      if (!['bearer', 'basic', 'api-key'].includes(config.auth.type)) {
        errors.push('auth.type must be bearer, basic, or api-key');
      }
      
      if (config.auth.type === 'bearer' && !config.auth.token) {
        errors.push('auth.token is required for bearer authentication');
      }
      
      if (config.auth.type === 'basic' && (!config.auth.username || !config.auth.password)) {
        errors.push('auth.username and auth.password are required for basic authentication');
      }
      
      if (config.auth.type === 'api-key' && !config.auth.key) {
        errors.push('auth.key is required for api-key authentication');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get collection information including metadata
   * @param {string} collectionName - Collection name (optional, uses configured collection if not provided)
   * @returns {Promise<Object>} Collection info with metadata
   */
  async getCollectionInfo(collectionName) {
    const collection = collectionName || this.collection;
    
    if (!collection) {
      throw new Error('Collection name must be specified');
    }
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/collections/${collection}`,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error getting collection info for ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * List all available collections from the wrapper
   * @returns {Promise<Array>} Array of collection info
   */
  async listCollections() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/collections`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data.collections || [];
    } catch (error) {
      console.error('Error listing collections:', error.message);
      throw error;
    }
  }

  /**
   * Query with dynamic collection support
   */
  async query(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Allow collection override at query time
    const collection = options.collection || this.collection;

    try {
      const response = await this.withRetry(async () => {
        return await axios.post(
          `${this.baseUrl}/query`,
          {
            query: text,  // Send text, wrapper handles embedding
            collection: collection,  // Dynamic collection support
            top_k: options.top_k || this.defaultTopK
          },
          {
            timeout: options.timeout || this.timeout,
            headers: {
              'Content-Type': 'application/json',
              ...this.customHeaders,
              ...(this.auth ? this.getAuthHeader() : {})
            }
          }
        );
      });

      // Parse wrapper response
      const data = response.data;
      
      if (!data || !data.results) {
        return [];
      }

      // Filter and transform results
      const maxDistance = options.max_distance || this.maxDistance;
      const results = data.results
        .filter(r => r.distance <= maxDistance)
        .map(r => ({
          text: r.text,
          distance: r.distance,
          score: this.distanceToScore(r.distance),
          metadata: r.metadata || {}
        }));

      return results;
    } catch (error) {
      console.error(`Error querying ChromaDB wrapper (collection: ${collection}):`, error.message);
      throw error;
    }
  }

  /**
   * Add documents (proxy to wrapper)
   */
  async addDocuments(documents) {
    const collection = this.collection;
    
    if (!collection) {
      throw new Error('Collection must be specified to add documents');
    }
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/collections/${collection}/documents`,
        { documents },
        {
          timeout: this.timeout * 2, // Longer timeout for uploads
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error adding documents to ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete documents (not supported - wrapper handles data management)
   */
  async deleteDocuments(ids) {
    throw new Error('Deleting documents is not supported via wrapper. Use the wrapper service directly.');
  }

  /**
   * Get document count
   */
  async getDocumentCount() {
    // This would require the wrapper to expose a count endpoint
    // For now, return unknown
    return -1;
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.isInitialized = false;
    console.log(`Cleaned up ChromaDB Wrapper Provider: ${this.baseUrl}`);
  }
}

module.exports = ChromaDBWrapperProvider;

