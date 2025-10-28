const fs = require('fs');
const path = require('path');

/**
 * ProviderDiscovery - Service for discovering and enumerating available providers
 * 
 * This service scans the provider directories and returns metadata about all
 * available AI and RAG providers, including their configuration schemas.
 */
class ProviderDiscovery {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * List all available providers grouped by type
   * @returns {Object} Providers grouped by type { llm: [...], rag: [...] }
   */
  listProviders() {
    // Return cached result if still valid
    if (this.cache && this.isCacheValid()) {
      return this.cache;
    }

    const providers = {
      llm: this.discoverLLMProviders(),
      rag: this.discoverRAGProviders()
    };

    // Cache the result
    this.cache = providers;
    this.cacheTimestamp = Date.now();

    return providers;
  }

  /**
   * Discover all LLM providers
   * @returns {Array} Array of LLM provider metadata
   */
  discoverLLMProviders() {
    const providersDir = path.join(__dirname, '../providers');
    const providers = [];

    try {
      const files = fs.readdirSync(providersDir);
      
      for (const file of files) {
        // Skip index.js and non-JS files
        if (file === 'index.js' || !file.endsWith('.js')) {
          continue;
        }

        try {
          const ProviderClass = require(path.join(providersDir, file));
          
          // Check if class has getConnectionSchema static method
          if (typeof ProviderClass.getConnectionSchema === 'function') {
            const schema = ProviderClass.getConnectionSchema();
            
            providers.push({
              id: schema.provider,
              display_name: schema.display_name,
              description: schema.description || '',
              schema: schema
            });
          }
        } catch (error) {
          console.warn(`Failed to load provider from ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error discovering LLM providers:', error.message);
    }

    return providers;
  }

  /**
   * Discover all RAG providers
   * @returns {Array} Array of RAG provider metadata
   */
  discoverRAGProviders() {
    const providersDir = path.join(__dirname, '../../retrieval-providers/providers');
    const providers = [];

    try {
      // Check if retrieval-providers/providers directory exists
      if (!fs.existsSync(providersDir)) {
        return providers;
      }

      const files = fs.readdirSync(providersDir);
      
      for (const file of files) {
        // Skip index.js and non-JS files
        if (file === 'index.js' || !file.endsWith('.js')) {
          continue;
        }

        try {
          const ProviderClass = require(path.join(providersDir, file));
          
          // Check if class has getConnectionSchema static method
          if (typeof ProviderClass.getConnectionSchema === 'function') {
            const schema = ProviderClass.getConnectionSchema();
            
            providers.push({
              id: schema.provider,
              display_name: schema.display_name,
              description: schema.description || '',
              schema: schema
            });
          }
        } catch (error) {
          console.warn(`Failed to load RAG provider from ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error discovering RAG providers:', error.message);
    }

    return providers;
  }

  /**
   * Get a specific provider by ID and type
   * @param {string} providerId - Provider identifier
   * @param {string} type - Provider type ('llm' or 'rag')
   * @returns {Object|null} Provider metadata or null if not found
   */
  getProvider(providerId, type = null) {
    const allProviders = this.listProviders();
    
    if (type) {
      return allProviders[type]?.find(p => p.id === providerId) || null;
    }

    // Search across all types
    for (const providers of Object.values(allProviders)) {
      const provider = providers.find(p => p.id === providerId);
      if (provider) return provider;
    }

    return null;
  }

  /**
   * Check if cache is still valid
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    if (!this.cacheTimestamp) return false;
    return (Date.now() - this.cacheTimestamp) < this.cacheTTL;
  }

  /**
   * Invalidate the cache (force refresh on next call)
   */
  invalidateCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Get provider capabilities
   * @param {string} providerId - Provider identifier
   * @returns {Array} Array of capability strings
   */
  getProviderCapabilities(providerId) {
    const provider = this.getProvider(providerId);
    if (!provider || !provider.schema) return [];

    // Extract capabilities from schema fields
    const capabilities = [];
    
    // Check if provider supports chat (has required fields for chat)
    const hasChatFields = provider.schema.fields.some(f => 
      ['api_key', 'baseUrl'].includes(f.name)
    );
    if (hasChatFields) capabilities.push('chat');

    // Check for embedding support
    const hasEmbeddingFields = provider.schema.fields.some(f => 
      f.name.includes('embed')
    );
    if (hasEmbeddingFields) capabilities.push('embedding');

    return capabilities;
  }
}

// Export singleton instance
module.exports = new ProviderDiscovery();

