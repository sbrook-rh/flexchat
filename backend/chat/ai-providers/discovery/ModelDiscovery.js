const { registry } = require('../providers');

/**
 * ModelDiscovery - Service for discovering and managing AI models across providers
 */
class ModelDiscovery {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all models from all available providers
   */
  async getAllModels(providers = []) {
    const allModels = [];
    const providerNames = providers.length > 0 ? providers : registry.listProviders();

    for (const providerName of providerNames) {
      try {
        const models = await this.getProviderModels(providerName);
        allModels.push(...models);
      } catch (error) {
        console.warn(`Failed to get models from ${providerName}:`, error.message);
      }
    }

    return allModels;
  }

  /**
   * Get models from a specific provider
   */
  async getProviderModels(providerName) {
    const cacheKey = `models_${providerName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Create a temporary provider instance to get models
      // Note: This requires provider configuration to be available
      const ProviderClass = registry.getProvider(providerName);
      if (!ProviderClass) {
        throw new Error(`Provider '${providerName}' not found`);
      }

      // For now, we'll use default configuration
      // In a real implementation, this would come from environment or config
      const config = this.getDefaultConfigForProvider(providerName);
      const provider = new ProviderClass(config);
      
      const models = await provider.listModels();
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: models,
        timestamp: Date.now()
      });

      return models;
    } catch (error) {
      console.error(`Error getting models from ${providerName}:`, error.message);
      return [];
    }
  }

  /**
   * Get models by type (chat, embedding, or both)
   */
  async getModelsByType(type, providers = []) {
    const allModels = await this.getAllModels(providers);
    return allModels.filter(model => {
      if (type === 'chat') return model.canChat();
      if (type === 'embedding') return model.canEmbed();
      if (type === 'both') return model.canChat() && model.canEmbed();
      return true;
    });
  }

  /**
   * Find a specific model by ID or name
   */
  async findModel(identifier, providers = []) {
    const allModels = await this.getAllModels(providers);
    return allModels.find(model => 
      model.id === identifier || model.name === identifier
    );
  }

  /**
   * Get recommended models for different use cases
   */
  async getRecommendedModels(useCase = 'general') {
    const allModels = await this.getAllModels();
    
    const recommendations = {
      general: {
        chat: allModels
          .filter(m => m.canChat())
          .sort((a, b) => this.getModelScore(a, 'general') - this.getModelScore(b, 'general'))
          .slice(0, 3),
        embedding: allModels
          .filter(m => m.canEmbed())
          .sort((a, b) => this.getModelScore(a, 'embedding') - this.getModelScore(b, 'embedding'))
          .slice(0, 2)
      },
      cost_effective: {
        chat: allModels
          .filter(m => m.canChat() && m.name.toLowerCase().includes('mini'))
          .sort((a, b) => (a.inputCost || 0) - (b.inputCost || 0))
          .slice(0, 3),
        embedding: allModels
          .filter(m => m.canEmbed() && m.name.toLowerCase().includes('small'))
          .sort((a, b) => (a.inputCost || 0) - (b.inputCost || 0))
          .slice(0, 2)
      },
      high_performance: {
        chat: allModels
          .filter(m => m.canChat() && m.name.toLowerCase().includes('gpt-4'))
          .sort((a, b) => this.getModelScore(b, 'performance') - this.getModelScore(a, 'performance'))
          .slice(0, 3),
        embedding: allModels
          .filter(m => m.canEmbed() && m.name.toLowerCase().includes('large'))
          .sort((a, b) => this.getModelScore(b, 'performance') - this.getModelScore(a, 'performance'))
          .slice(0, 2)
      }
    };

    return recommendations[useCase] || recommendations.general;
  }

  /**
   * Clear the model cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get default configuration for a provider
   */
  getDefaultConfigForProvider(providerName) {
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
   * Calculate a score for model ranking
   */
  getModelScore(model, criteria) {
    let score = 0;
    
    switch (criteria) {
      case 'general':
        // Prefer newer models with good capabilities
        if (model.name.includes('gpt-4')) score += 100;
        if (model.name.includes('mini')) score += 50;
        if (model.supports('function-calling')) score += 25;
        if (model.supports('vision')) score += 25;
        break;
        
      case 'performance':
        // Prefer models with higher token limits and capabilities
        score += model.maxTokens || 0;
        if (model.supports('function-calling')) score += 50;
        if (model.supports('vision')) score += 50;
        if (model.supports('json-mode')) score += 25;
        break;
        
      case 'embedding':
        // Prefer newer embedding models
        if (model.name.includes('3')) score += 100;
        if (model.name.includes('large')) score += 50;
        if (model.name.includes('small')) score += 25;
        break;
    }
    
    return score;
  }
}

module.exports = ModelDiscovery;
