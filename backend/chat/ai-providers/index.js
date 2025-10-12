// Main AI Service
const AIService = require('./AIService');

// Base classes
const AIProvider = require('./base/AIProvider');
const ModelInfo = require('./base/ModelInfo');
const ProviderConfig = require('./base/ProviderConfig');

// Discovery services
const ModelDiscovery = require('./discovery/ModelDiscovery');
const HealthChecker = require('./discovery/HealthChecker');

// Providers
const { registry, OpenAIProvider } = require('./providers');

module.exports = {
  // Main service
  AIService,
  
  // Base classes
  AIProvider,
  ModelInfo,
  ProviderConfig,
  
  // Discovery services
  ModelDiscovery,
  HealthChecker,
  
  // Providers
  registry,
  OpenAIProvider,
  
  // Convenience function to create a service instance
  createAIService: (config) => new AIService(config)
};
