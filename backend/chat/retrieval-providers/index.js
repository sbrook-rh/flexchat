// Main Retrieval Service
const RetrievalService = require('./RetrievalService');

// Base classes
const RetrievalProvider = require('./base/RetrievalProvider');
const VectorProvider = require('./base/VectorProvider');

// Providers
const { registry, ChromaDBProvider } = require('./providers');

module.exports = {
  // Main service
  RetrievalService,
  
  // Base classes
  RetrievalProvider,
  VectorProvider,
  
  // Providers
  registry,
  ChromaDBProvider,
  
  // Convenience function to create a service instance
  createRetrievalService: (aiService) => new RetrievalService(aiService)
};

