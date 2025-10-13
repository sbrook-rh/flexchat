const ChromaDBProvider = require('./ChromaDBProvider');
const ChromaDBWrapperProvider = require('./ChromaDBWrapperProvider');

/**
 * RetrievalProviderRegistry - Central registry for all retrieval providers
 */
class RetrievalProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.registerDefaultProviders();
  }

  /**
   * Register a provider
   */
  register(name, providerClass) {
    this.providers.set(name.toLowerCase(), providerClass);
  }

  /**
   * Get a provider class by name
   */
  getProvider(name) {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * List all registered providers
   */
  listProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Create a provider instance
   */
  createProvider(name, config, aiService) {
    const ProviderClass = this.getProvider(name);
    if (!ProviderClass) {
      throw new Error(`Retrieval provider '${name}' not found. Available providers: ${this.listProviders().join(', ')}`);
    }
    return new ProviderClass(config, aiService);
  }

  /**
   * Register default providers
   */
  registerDefaultProviders() {
    this.register('chromadb', ChromaDBProvider);
    this.register('chromadb-wrapper', ChromaDBWrapperProvider);
    // Future providers will be registered here
    // this.register('milvus', MilvusProvider);
    // this.register('postgres', PostgresProvider);
    // this.register('pinecone', PineconeProvider);
    // this.register('elasticsearch', ElasticsearchProvider);
  }
}

// Create singleton instance
const registry = new RetrievalProviderRegistry();

module.exports = {
  RetrievalProviderRegistry,
  registry,
  ChromaDBProvider,
  ChromaDBWrapperProvider
};

