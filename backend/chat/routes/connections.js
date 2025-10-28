const express = require('express');
const router = express.Router();
const ProviderDiscovery = require('../ai-providers/discovery');
const { ConnectionTester, EnvVarManager } = require('../ai-providers/services');
const { normalizeConnectionPayload } = require('../lib/connection-payload');

/**
 * GET /api/connections/providers
 * List all available providers grouped by type
 */
router.get('/providers', (req, res) => {
  try {
    const providers = ProviderDiscovery.listProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error listing providers:', error);
    res.status(500).json({
      error: 'Failed to list providers',
      message: error.message
    });
  }
});

/**
 * GET /api/connections/providers/:id/schema
 * Get configuration schema for a specific provider
 */
router.get('/providers/:id/schema', (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // Optional type hint

    const provider = ProviderDiscovery.getProvider(id, type);
    
    if (!provider) {
      return res.status(404).json({
        error: 'Provider not found',
        message: `Provider '${id}' not found`
      });
    }

    res.json(provider.schema);
  } catch (error) {
    console.error(`Error getting schema for provider ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get provider schema',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/providers/:id/models
 * Discover available models from a provider
 * 
 * Request body:
 * {
 *   "config": { ... provider configuration with ${ENV_VAR} placeholders ... }
 * }
 */
router.post('/providers/:id/models', async (req, res) => {
  try {
    const { provider: id, processedConfig, type } = normalizeConnectionPayload(req);

    // Dynamically load the provider class
    const ProviderClass = loadProviderClass(type || 'llm', id);
    
    // Create temporary instance (not added to global aiProviders)
    const tempProvider = new ProviderClass(processedConfig);
    
    // Discover models
    const models = await tempProvider.listModels();
    
    // Return sanitized model list
    res.json({
      provider: id,
      count: models.length,
      models: models.map(m => ({
        id: m.id,
        name: m.name || m.id,
        type: m.type,
        capabilities: m.capabilities || [],
        maxTokens: m.maxTokens,
        description: m.description
      }))
    });
  } catch (error) {
    console.error(`Error discovering models for provider ${req.params.id}:`, error);
    res.status(400).json({
      error: 'Model discovery failed',
      message: error.message,
      provider: req.params.id
    });
  }
});

/**
 * Helper function to load provider class dynamically
 */
function loadProviderClass(type, providerId) {
  // Convert provider ID to class file name
  // 'openai' -> 'OpenAIProvider'
  const parts = providerId.split(/[-_]/);
  const className = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const filename = `${className}Provider`;
  
  if (type === 'llm') {
    return require(`../ai-providers/providers/${filename}`);
  } else if (type === 'rag') {
    return require(`../retrieval-providers/${filename}`);
  } else {
    throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * POST /api/connections/test
 * Test a provider connection
 * 
 * Request body:
 * {
 *   "type": "llm" | "rag",
 *   "provider": "openai" | "ollama" | etc.,
 *   "config": { ... provider configuration ... }
 * }
 */
router.post('/test', async (req, res) => {
  try {
    const { type, provider, processedConfig } = normalizeConnectionPayload(req);

    if (!['llm', 'rag'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid provider type',
        message: 'Type must be either "llm" or "rag"'
      });
    }

    // Test the connection
    const result = await ConnectionTester.testConnection(type, provider, processedConfig);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/connections/env-vars
 * List available environment variables (filtered and masked)
 */
router.get('/env-vars', (req, res) => {
  try {
    const maskValues = req.query.mask !== 'false'; // Default to true
    const envVars = EnvVarManager.listAvailableEnvVars(maskValues);
    
    res.json({
      variables: envVars,
      count: envVars.length
    });
  } catch (error) {
    console.error('Error listing env vars:', error);
    res.status(500).json({
      error: 'Failed to list environment variables',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/env-vars/validate
 * Validate environment variable references in a configuration
 * 
 * Request body:
 * {
 *   "config": { ... configuration with ${VAR} references ... }
 * }
 */
router.post('/env-vars/validate', (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request must include config object'
      });
    }

    const validation = EnvVarManager.validateConfigReferences(config);
    res.json(validation);
  } catch (error) {
    console.error('Error validating env vars:', error);
    res.status(500).json({
      error: 'Failed to validate environment variables',
      message: error.message
    });
  }
});

/**
 * GET /api/connections/env-vars/suggestions
 * Get environment variable suggestions for a provider field
 */
router.get('/env-vars/suggestions', (req, res) => {
  try {
    const { provider, field } = req.query;

    if (!provider || !field) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request must include provider and field query parameters'
      });
    }

    const suggestions = EnvVarManager.getSuggestions(provider, field);
    res.json({
      provider,
      field,
      suggestions
    });
  } catch (error) {
    console.error('Error getting env var suggestions:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

module.exports = router;

