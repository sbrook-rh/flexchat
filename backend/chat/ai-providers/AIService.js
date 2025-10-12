const { registry } = require('./providers');
const ModelDiscovery = require('./discovery/ModelDiscovery');
const HealthChecker = require('./discovery/HealthChecker');

/**
 * AIService - Main service for managing AI providers and operations
 */
class AIService {
  constructor(config = {}) {
    this.config = config;
    this.modelDiscovery = new ModelDiscovery();
    this.healthChecker = new HealthChecker();
    this.activeProvider = null;
    this.providers = new Map();
    
    // Initialize with default provider if specified
    if (config.defaultProvider) {
      this.setActiveProvider(config.defaultProvider, config.providerConfigs?.[config.defaultProvider]);
    }
  }

  /**
   * Set the active provider
   */
  async setActiveProvider(providerName, config = null) {
    try {
      const providerConfig = config || this.getConfigForProvider(providerName);
      const provider = registry.createProvider(providerName, providerConfig);
      
      // Validate the provider
      const validation = provider.validateConfig(providerConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration for ${providerName}: ${validation.errors.join(', ')}`);
      }
      
      this.activeProvider = provider;
      this.providers.set(providerName, provider);
      
      console.log(`✅ Active provider set to: ${providerName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to set provider ${providerName}:`, error.message);
      return false;
    }
  }

  /**
   * Get the active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Get a specific provider
   */
  getProvider(providerName) {
    return this.providers.get(providerName) || this.activeProvider;
  }

  /**
   * List all available providers
   */
  listProviders() {
    return registry.listProviders();
  }

  /**
   * Get all available models
   */
  async getModels(providerName = null) {
    if (providerName) {
      return await this.modelDiscovery.getProviderModels(providerName);
    }
    return await this.modelDiscovery.getAllModels();
  }

  /**
   * Get models by type
   */
  async getModelsByType(type, providerName = null) {
    const providers = providerName ? [providerName] : [];
    return await this.modelDiscovery.getModelsByType(type, providers);
  }

  /**
   * Find a specific model
   */
  async findModel(identifier, providerName = null) {
    const providers = providerName ? [providerName] : [];
    return await this.modelDiscovery.findModel(identifier, providers);
  }

  /**
   * Get recommended models
   */
  async getRecommendedModels(useCase = 'general') {
    return await this.modelDiscovery.getRecommendedModels(useCase);
  }

  /**
   * Generate chat completion
   */
  async generateChat(messages, options = {}) {
    if (!this.activeProvider) {
      throw new Error('No active provider set. Call setActiveProvider() first.');
    }

    const model = options.model || await this.activeProvider.getChatModel();
    return await this.activeProvider.generateChat(messages, model, options);
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(text, options = {}) {
    if (!this.activeProvider) {
      throw new Error('No active provider set. Call setActiveProvider() first.');
    }

    const model = options.model || await this.activeProvider.getEmbeddingModel();
    return await this.activeProvider.generateEmbeddings(text, model);
  }

  /**
   * Check health of all providers
   */
  async checkHealth() {
    return await this.healthChecker.checkAllProviders();
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return this.healthChecker.getSystemHealth();
  }

  /**
   * Get recommended providers based on health
   */
  getRecommendedProviders() {
    return this.healthChecker.getRecommendedProviders();
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthChecker.start();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    this.healthChecker.stop();
  }

  /**
   * Get configuration for a provider
   */
  getConfigForProvider(providerName) {
    const configs = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || process.env.CHAT_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
        retries: parseInt(process.env.OPENAI_RETRIES) || 3,
        retryDelay: parseInt(process.env.OPENAI_RETRY_DELAY) || 1000,
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
      }
      // Future providers will be added here
    };

    return configs[providerName.toLowerCase()] || {};
  }

  /**
   * Initialize with environment configuration
   */
  async initializeFromEnv() {
    const providers = this.listProviders();
    let initialized = false;

    for (const providerName of providers) {
      const config = this.getConfigForProvider(providerName);
      if (config.apiKey) {
        const success = await this.setActiveProvider(providerName, config);
        if (success) {
          initialized = true;
          break;
        }
      }
    }

    if (!initialized) {
      throw new Error('No valid provider configuration found in environment variables');
    }

    return this.activeProvider;
  }

  /**
   * Get provider information
   */
  getProviderInfo(providerName = null) {
    const provider = providerName ? this.getProvider(providerName) : this.activeProvider;
    if (!provider) {
      return null;
    }

    return {
      name: provider.getName(),
      configSchema: provider.getConfigSchema(),
      defaultModels: provider.getDefaultModels(),
      isHealthy: this.healthChecker.getProviderHealth(provider.getName()).status === 'healthy'
    };
  }

  /**
   * Switch to a different provider
   */
  async switchProvider(providerName, config = null) {
    const success = await this.setActiveProvider(providerName, config);
    if (success) {
      console.log(`🔄 Switched to provider: ${providerName}`);
    }
    return success;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      activeProvider: this.activeProvider?.getName() || null,
      availableProviders: this.listProviders(),
      healthStats: this.healthChecker.getStats(),
      modelCache: this.modelDiscovery.cache.size
    };
  }
}

module.exports = AIService;
