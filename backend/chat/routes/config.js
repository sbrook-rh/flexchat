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
    // Access raw config from the closure (passed during router creation)
    const rawConfig = router.rawConfig || {};
    
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
 * Response: { success: boolean, message: string }
 */
router.post('/reload', (req, res) => {
  try {
    const newConfig = req.body;
    
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a configuration object'
      });
    }
    
    // TODO Phase 5.1.2: Implement actual hot-reload logic
    // For now, just validate and return placeholder
    res.status(501).json({
      success: false,
      message: 'Hot-reload not yet implemented (Phase 5.1.2)'
    });
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

module.exports = (rawConfig = {}) => {
  // Store rawConfig on router instance for /export endpoint
  router.rawConfig = rawConfig;
  return router;
};


