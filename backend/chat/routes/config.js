const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * GET /api/config/export
 * Export the full raw configuration (with ${ENV_VAR} placeholders intact).
 * Used by the configuration builder to load current config for editing.
 * 
 * Response: Full raw configuration object
 */
router.get('/export', (req, res) => {
  try {
    // Get current config via getter (always up-to-date after hot-reload)
    const rawConfig = router.getConfig() || {};
    
    res.json(rawConfig);
  } catch (error) {
    console.error('Error exporting configuration:', error);
    res.status(500).json({ error: 'Failed to export configuration', message: error.message });
  }
});

/**
 * POST /api/config/reload
 * Apply new configuration at runtime (hot-reload).
 *
 * Request body: Full configuration object (raw with ${ENV_VAR} placeholders)
 * Response: { success: boolean, message: string, status?: object }
 */
router.post('/reload', async (req, res) => {
  try {
    const newConfig = req.body;
    console.log('🔄 Reloading configuration:', newConfig);
    
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a configuration object'
      });
    }
    
    // Access reloadFunction from router instance (set during creation)
    if (!router.reloadFunction) {
      return res.status(500).json({
        success: false,
        message: 'Hot-reload function not initialized'
      });
    }
    
    // Call the reinitializeProviders function from server.js
    const result = await router.reloadFunction(newConfig);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error reloading configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reload configuration', 
      error: error.message 
    });
  }
});

/**
 * POST /api/config/validate
 * Validate full configuration without applying it.
 *
 * Request body: raw configuration JSON (with ${ENV_VAR} placeholders allowed)
 * Response: { valid: boolean, errors?: string[], warnings?: string[] }
 */
router.post('/validate', (req, res) => {
  try {
    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        valid: false,
        errors: ['Request body must be a configuration object']
      });
    }

    const errors = [];
    const warnings = [];

    // Use the proper validateConfig from config-loader (throws on errors)
    try {
      const { validateConfig } = require('../lib/config-loader');
      validateConfig(config); // Throws if invalid (except zero-config)
    } catch (e) {
      // Validation threw - capture error message
      errors.push(e.message);
    }

    // Check for zero-config mode explicitly
    const hasLLMs = config.llms && typeof config.llms === 'object' && Object.keys(config.llms).length > 0;
    const hasResponses = config.responses && Array.isArray(config.responses) && config.responses.length > 0;
    const isZeroConfig = !hasLLMs && !hasResponses;

    // If zero-config, warn but don't error
    if (isZeroConfig) {
      warnings.push('Configuration is empty - chat will not be functional');
      warnings.push('Add at least one LLM provider and one response handler');
    }

    // Provider-specific validation (only if we have providers)
    if (!isZeroConfig && errors.length === 0) {
      try {
        const { getProcessedConfig } = require('../lib/config-loader');
        const processed = getProcessedConfig(config);

        const { registry: aiRegistry } = require('../ai-providers/providers');
        const { registry: ragRegistry } = require('../retrieval-providers/providers');

        // Get list of available LLM provider names for referential integrity checks
        const availableLLMs = Object.keys(processed.llms || {});

        // Validate LLM providers
        for (const [name, llmConfig] of Object.entries(processed.llms || {})) {
          const type = llmConfig.provider;
          try {
            const provider = aiRegistry.createProvider(type, llmConfig);
            const v = provider.validateConfig(llmConfig);
            if (!v.isValid) {
              errors.push(`LLM '${name}': ${v.errors.join(', ')}`);
            }
          } catch (e) {
            errors.push(`LLM '${name}': ${e.message}`);
          }
        }

        // Validate RAG services
        for (const [name, ragConfig] of Object.entries(processed.rag_services || {})) {
          const type = ragConfig.provider;
          try {
            const service = ragRegistry.createProvider(type, ragConfig);
            const v = service.validateConfig(ragConfig);
            if (!v.isValid) {
              errors.push(`RAG '${name}': ${v.errors.join(', ')}`);
            }
          } catch (e) {
            errors.push(`RAG '${name}': ${e.message}`);
          }
        }

        // Referential integrity checks: verify LLM references exist
        
        // Check topic.provider.llm reference
        if (config.topic?.provider?.llm) {
          const referencedLLM = config.topic.provider.llm;
          if (!availableLLMs.includes(referencedLLM)) {
            errors.push(`topic.provider.llm references non-existent LLM provider '${referencedLLM}'`);
          }
        }

        // Check intent.provider.llm reference
        if (config.intent?.provider?.llm) {
          const referencedLLM = config.intent.provider.llm;
          if (!availableLLMs.includes(referencedLLM)) {
            errors.push(`intent.provider.llm references non-existent LLM provider '${referencedLLM}'`);
          }
        }

        // Check responses[].llm references
        if (Array.isArray(config.responses)) {
          config.responses.forEach((response, index) => {
            if (response.llm && !availableLLMs.includes(response.llm)) {
              errors.push(`responses[${index}].llm references non-existent LLM provider '${response.llm}'`);
            }
          });
        }

      } catch (e) {
        // If deep validation fails, report as a top-level error
        errors.push(`Validation engine error: ${e.message}`);
      }
    }

    const valid = errors.length === 0;
    const status = valid ? 200 : 400;
    return res.status(status).json({ valid, errors, warnings });
  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({ valid: false, errors: [error.message] });
  }
});

module.exports = (getConfig, reloadFunction = null) => {
  // Store getter function for /export endpoint (always returns current config)
  router.getConfig = getConfig;
  // Store reload function for /reload endpoint
  router.reloadFunction = reloadFunction;
  return router;
};


