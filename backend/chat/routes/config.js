const express = require('express');
const router = express.Router();

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

    // Basic shape checks
    const errors = [];
    const warnings = [];

    if (!config.llms || typeof config.llms !== 'object') {
      warnings.push('No LLM providers configured');
    }
    if (!Array.isArray(config.responses)) {
      warnings.push('No response handlers configured');
    }

    // Delegate to provider-specific validators when possible (best-effort)
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

    const valid = errors.length === 0;
    const status = valid ? 200 : 400;
    return res.status(status).json({ valid, errors, warnings });
  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({ valid: false, errors: [error.message] });
  }
});

module.exports = (/* config, aiProviders, ragProviders */) => router;


