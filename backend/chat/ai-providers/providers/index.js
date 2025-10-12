const OpenAIProvider = require('./OpenAIProvider');
const OllamaProvider = require('./OllamaProvider');

/**
 * Provider Registry - Central registry for all AI providers
 */
class ProviderRegistry {
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
  createProvider(name, config) {
    const ProviderClass = this.getProvider(name);
    if (!ProviderClass) {
      throw new Error(`Provider '${name}' not found. Available providers: ${this.listProviders().join(', ')}`);
    }
    return new ProviderClass(config);
  }

  /**
   * Register default providers
   */
  registerDefaultProviders() {
    this.register('openai', OpenAIProvider);
    this.register('ollama', OllamaProvider);
    // Future providers will be registered here
    // this.register('anthropic', AnthropicProvider);
    // this.register('gemini', GeminiProvider);
  }
}

// Create singleton instance
const registry = new ProviderRegistry();

module.exports = {
  ProviderRegistry,
  registry,
  OpenAIProvider,
  OllamaProvider
};
