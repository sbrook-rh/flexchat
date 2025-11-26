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
      const collectionInfo = this.collection || 'multiple collections';
      console.log(`✅ ChromaDB Wrapper Provider initialized: ${this.baseUrl} (${collectionInfo})`);
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

      const details = {
        url: this.baseUrl,
        collection: this.collection,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
      
      // Include embedding models if present
      if (response.data.embedding_models) {
        details.embedding_models = response.data.embedding_models;
      }
      
      // Include cross-encoder status if present
      if (response.data.cross_encoder) {
        details.cross_encoder = response.data.cross_encoder;
      }

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        message: isHealthy ? 'Wrapper service is responding' : `Wrapper service returned unexpected status: ${response.data.status}`,
        details
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
  // getConfigSchema() {
  //   return {
  //     type: 'object',
  //     required: ['url'],
  //     properties: {
  //       url: {
  //         type: 'string',
  //         description: 'Base URL of the ChromaDB wrapper service',
  //         examples: ['http://localhost:5006']
  //       },
  //       collection: {
  //         type: 'string',
  //         description: 'ChromaDB collection name to query (optional for dynamic collections)'
  //       },
  //       top_k: {
  //         type: 'number',
  //         description: 'Default number of results to return',
  //         default: 3,
  //         minimum: 1
  //       },
  //       timeout: {
  //         type: 'number',
  //         description: 'Request timeout in milliseconds',
  //         default: 30000,
  //         minimum: 1000
  //       },
  //       default_threshold: {
  //         type: 'number',
  //         description: 'Default distance threshold for filtering results',
  //         default: 0.3,
  //         minimum: 0,
  //         maximum: 2
  //       },
  //       max_distance: {
  //         type: 'number',
  //         description: 'Maximum distance - results beyond this are ignored',
  //         default: 1.0,
  //         minimum: 0,
  //         maximum: 2
  //       },
  //       auth: {
  //         type: 'object',
  //         description: 'Authentication configuration',
  //         properties: {
  //           type: {
  //             type: 'string',
  //             enum: ['bearer', 'basic', 'api-key']
  //           },
  //           token: { type: 'string' },
  //           username: { type: 'string' },
  //           password: { type: 'string' },
  //           key: { type: 'string' },
  //           header: { type: 'string' }
  //         }
  //       },
  //       headers: {
  //         type: 'object',
  //         description: 'Custom HTTP headers to send with requests'
  //       },
  //       retry: {
  //         type: 'object',
  //         description: 'Retry configuration',
  //         properties: {
  //           max_attempts: {
  //             type: 'number',
  //             default: 3,
  //             minimum: 1
  //           },
  //           delay: {
  //             type: 'number',
  //             default: 1000,
  //             minimum: 0
  //           }
  //         }
  //       },
  //       health_check_endpoint: {
  //         type: 'string',
  //         description: 'Health check endpoint path',
  //         default: '/health'
  //       }
  //     }
  //   };
  // }

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
   * Create a new collection
   * @param {string} collectionName - Collection name
   * @param {Object} metadata - Collection metadata
   * @returns {Promise<Object>} Created collection info
   */
  async createCollection(collectionName, metadata = {}) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    try {
      // Promote embedding fields to top-level if present in metadata
      const topLevel = {};
      if (metadata && metadata.embedding_provider) {
        topLevel.embedding_provider = metadata.embedding_provider;
      }
      if (metadata && metadata.embedding_model) {
        topLevel.embedding_model = metadata.embedding_model;
      }
      
      const response = await axios.post(
        `${this.baseUrl}/collections`,
        {
          name: collectionName,
          ...topLevel,
          metadata
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error creating collection ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a collection
   * @param {string} collectionName - Collection name
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCollection(collectionName) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    try {
      const response = await axios.delete(
        `${this.baseUrl}/collections/${collectionName}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error deleting collection ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Empty a collection by deleting all documents
   * Preserves collection metadata and settings
   * @param {string} collectionName - Collection name
   * @returns {Promise<Object>} Empty result with count_deleted
   */
  async emptyCollection(collectionName) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    try {
      const response = await axios.delete(
        `${this.baseUrl}/collections/${collectionName}/documents/all`,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error emptying collection ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Update collection metadata
   * @param {string} collectionName - Collection name
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object>} Updated collection info
   */
  async updateCollectionMetadata(collectionName, metadata, merge = false) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    try {
      const response = await axios.put(
        `${this.baseUrl}/collections/${collectionName}/metadata?merge=${merge}`,
        { metadata },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error updating collection metadata for ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get unique metadata values for a field
   * @param {string} collectionName - Collection name
   * @param {string} field - Metadata field name
   * @returns {Promise<Object>} {field, values, count}
   */
  async getMetadataValues(collectionName, field) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    if (!field) {
      throw new Error('Field name is required');
    }
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/collections/${collectionName}/metadata-values`,
        {
          params: { field },
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...this.customHeaders,
            ...(this.auth ? this.getAuthHeader() : {})
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error getting metadata values for ${collectionName}.${field}:`, error.message);
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
        const payload = {
          query: text,
          collection: collection,  // Dynamic collection support
          top_k: options.top_k || this.defaultTopK
        };
        
        return await axios.post(
          `${this.baseUrl}/query`,
          payload,
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
      
      console.log(`   🔍 Wrapper response for ${collection}:`, JSON.stringify(data).substring(0, 200));
      
      if (!data || !data.results) {
        console.log(`   ⚠️  No results field in wrapper response`);
        return { results: [], collectionMetadata: {} };
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

      // Return results with collection metadata
      return {
        results: results,
        collectionMetadata: data.collection_metadata || {}
      };
    } catch (error) {
      console.error(`Error querying ChromaDB wrapper (collection: ${collection}):`, error.message);
      throw error;
    }
  }

  /**
   * Rerank documents using cross-encoder model
   * @param {string} query - Query text
   * @param {Array} documents - Array of documents to rerank (each: {id, text})
   * @param {number} topK - Optional limit on returned results
   * @returns {Promise<Array>} Reranked documents or original if unavailable
   */
  async rerank(query, documents, topK = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if cross-encoder available (graceful degradation)
    try {
      const health = await this.healthCheck();
      if (!health.details?.cross_encoder) {
        console.warn('⚠️  Cross-encoder not available, returning original ranking');
        return documents;
      }
    } catch (error) {
      console.warn('⚠️  Could not check cross-encoder availability:', error.message);
      return documents;
    }

    try {
      const response = await this.withRetry(async () => {
        return await axios.post(
          `${this.baseUrl}/rerank`,
          {
            query: query,
            documents: documents.map(d => ({
              id: d.id || d.metadata?.id || `doc-${Date.now()}-${Math.random()}`,
              text: d.text
            })),
            top_k: topK
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              ...this.customHeaders,
              ...(this.auth ? this.getAuthHeader() : {})
            }
          }
        );
      });

      return response.data.reranked;
    } catch (error) {
      console.error('❌ Error calling /rerank endpoint:', error.message);
      console.warn('⚠️  Falling back to original document order');
      return documents;
    }
  }

  /**
   * Add documents to a collection
   * @param {string} collectionName - Collection name (optional, uses configured collection if not provided)
   * @param {Array} documents - Array of documents to add
   * @returns {Promise<Object>} Upload result
   */
  async addDocuments(collectionName, documents) {
    // Support both signatures: addDocuments(collectionName, documents) or addDocuments(documents)
    let collection, docs;
    
    if (Array.isArray(collectionName)) {
      // Old signature: addDocuments(documents)
      docs = collectionName;
      collection = this.collection;
    } else {
      // New signature: addDocuments(collectionName, documents)
      collection = collectionName;
      docs = documents;
    }
    
    if (!collection) {
      throw new Error('Collection must be specified to add documents');
    }
    
    if (!docs || !Array.isArray(docs)) {
      throw new Error('Documents must be an array');
    }
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/collections/${collection}/documents`,
        { documents: docs },
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

  /**
   * Get connection schema for UI-driven configuration
   * @static
   * @returns {Object} Connection schema with field definitions
   */
  static getConnectionSchema() {
    return {
      provider: 'chromadb-wrapper',
      display_name: 'ChromaDB Wrapper',
      description: 'ChromaDB connection via Python wrapper service with dynamic collections',
      fields: [
        {
          name: 'url',
          type: 'url',
          label: 'Wrapper Service URL',
          description: 'Base URL of the ChromaDB Python wrapper service',
          required: true,
          default: 'http://localhost:5006',
          placeholder: 'http://localhost:5006',
          validation: {
            pattern: '^https?://.+',
            message: 'Must be a valid HTTP or HTTPS URL'
          }
        },
        {
          name: 'timeout',
          type: 'number',
          label: 'Request Timeout (ms)',
          description: 'Maximum time to wait for wrapper service responses',
          required: false,
          default: 30000,
          validation: {
            min: 1000,
            max: 120000,
            message: 'Timeout must be between 1 and 120 seconds'
          }
        }
      ],
      capabilities: ['collections', 'search', 'embeddings', 'dynamic_collections']
    };
  }
}

module.exports = ChromaDBWrapperProvider;

