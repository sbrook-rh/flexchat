const { registry } = require('./providers');

/**
 * RetrievalService - Main service for managing retrieval providers
 */
class RetrievalService {
  constructor(aiService) {
    this.aiService = aiService;
    this.providers = new Map();
  }

  /**
   * Initialize knowledge bases from configuration
   * @param {Object} knowledgeBasesConfig - Knowledge bases configuration
   */
  async initializeKnowledgeBases(knowledgeBasesConfig) {
    for (const [name, config] of Object.entries(knowledgeBasesConfig)) {
      try {
        await this.addKnowledgeBase(name, config);
        console.log(`✅ Initialized knowledge base: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to initialize knowledge base ${name}:`, error.message);
      }
    }
  }

  /**
   * Add a knowledge base
   * @param {string} name - Knowledge base name
   * @param {Object} config - Knowledge base configuration
   */
  async addKnowledgeBase(name, config) {
    const providerType = config.type;
    const provider = registry.createProvider(providerType, config, this.aiService);
    
    // Validate configuration
    const validation = provider.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration for ${name}: ${validation.errors.join(', ')}`);
    }
    
    // Initialize the provider
    await provider.initialize();
    
    // Store the provider
    this.providers.set(name, provider);
    
    return provider;
  }

  /**
   * Get a knowledge base provider
   * @param {string} name - Knowledge base name
   * @returns {RetrievalProvider}
   */
  getKnowledgeBase(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Knowledge base '${name}' not found. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  /**
   * Query a knowledge base
   * @param {string} knowledgeBaseName - Knowledge base name
   * @param {string} text - Query text
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async query(knowledgeBaseName, text, options = {}) {
    const provider = this.getKnowledgeBase(knowledgeBaseName);
    return await provider.query(text, options);
  }

  /**
   * Add documents to a knowledge base
   * @param {string} knowledgeBaseName - Knowledge base name
   * @param {Array} documents - Documents to add
   * @returns {Promise<Object>} Result
   */
  async addDocuments(knowledgeBaseName, documents) {
    const provider = this.getKnowledgeBase(knowledgeBaseName);
    return await provider.addDocuments(documents);
  }

  /**
   * Delete documents from a knowledge base
   * @param {string} knowledgeBaseName - Knowledge base name
   * @param {Array} ids - Document IDs to delete
   * @returns {Promise<Object>} Result
   */
  async deleteDocuments(knowledgeBaseName, ids) {
    const provider = this.getKnowledgeBase(knowledgeBaseName);
    return await provider.deleteDocuments(ids);
  }

  /**
   * Get document count for a knowledge base
   * @param {string} knowledgeBaseName - Knowledge base name
   * @returns {Promise<number>} Document count
   */
  async getDocumentCount(knowledgeBaseName) {
    const provider = this.getKnowledgeBase(knowledgeBaseName);
    return await provider.getDocumentCount();
  }

  /**
   * Check health of all knowledge bases
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    const health = {};
    
    for (const [name, provider] of this.providers.entries()) {
      health[name] = await provider.healthCheck();
    }
    
    const healthyCount = Object.values(health).filter(h => h.status === 'healthy').length;
    const totalCount = Object.keys(health).length;
    
    return {
      overall: healthyCount === totalCount ? 'healthy' : 'degraded',
      healthyCount,
      totalCount,
      knowledgeBases: health,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * List all knowledge bases
   * @returns {Array} Knowledge base names
   */
  listKnowledgeBases() {
    return Array.from(this.providers.keys());
  }

  /**
   * Get statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const stats = {
      knowledgeBases: {},
      totalDocuments: 0
    };
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        const count = await provider.getDocumentCount();
        stats.knowledgeBases[name] = {
          provider: provider.getName(),
          documentCount: count,
          status: 'available'
        };
        stats.totalDocuments += count;
      } catch (error) {
        stats.knowledgeBases[name] = {
          provider: provider.getName(),
          status: 'error',
          error: error.message
        };
      }
    }
    
    return stats;
  }

  /**
   * Cleanup all providers
   */
  async cleanup() {
    for (const [name, provider] of this.providers.entries()) {
      try {
        await provider.cleanup();
        console.log(`Cleaned up knowledge base: ${name}`);
      } catch (error) {
        console.error(`Error cleaning up knowledge base ${name}:`, error.message);
      }
    }
    this.providers.clear();
  }
}

module.exports = RetrievalService;

