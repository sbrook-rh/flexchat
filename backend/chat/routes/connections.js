const express = require('express');
const router = express.Router();
const ProviderDiscovery = require('../ai-providers/discovery');
const { ConnectionTester, EnvVarManager } = require('../ai-providers/services');

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
 * GET /api/connections/providers/:id/models
 * Discover available models from a provider (requires connection details)
 */
router.get('/providers/:id/models', async (req, res) => {
  try {
    const { id } = req.params;
    const config = req.query; // Config params passed as query string

    // TODO: Implement model discovery
    // This will require instantiating the provider with the given config
    // and calling listModels()
    
    res.status(501).json({
      error: 'Not implemented',
      message: 'Model discovery endpoint not yet implemented'
    });
  } catch (error) {
    console.error(`Error discovering models for provider ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to discover models',
      message: error.message
    });
  }
});

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
    const { type, provider, config } = req.body;

    // Validate request
    if (!type || !provider || !config) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request must include type, provider, and config'
      });
    }

    if (!['llm', 'rag'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid provider type',
        message: 'Type must be either "llm" or "rag"'
      });
    }

    // Test the connection
    const result = await ConnectionTester.testConnection(type, provider, config);

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

