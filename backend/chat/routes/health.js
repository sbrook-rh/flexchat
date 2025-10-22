const express = require('express');
const router = express.Router();

/**
 * Create health router with dependency injection
 * @param {Object} config - Server configuration
 * @param {Object} aiProviders - AI provider instances
 * @param {Object} ragProviders - RAG provider instances
 * @returns {express.Router} Configured health router
 */
function createHealthRouter(config, aiProviders, ragProviders) {
  /**
   * Health check endpoint
   * GET /health
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '2.0.0',
      config_loaded: config !== null,
      ai_providers: Object.keys(aiProviders),
      rag_providers: Object.keys(ragProviders)
    });
  });

  return router;
}

module.exports = { createHealthRouter };
