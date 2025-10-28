const express = require('express');
const router = express.Router();

/**
 * Create health router with dependency injection
 * @param {Function} getConfig - Getter for current config (always up-to-date)
 * @param {Function} getProviders - Getter for current providers (always up-to-date)
 * @returns {express.Router} Configured health router
 */
function createHealthRouter(getConfig, getProviders) {
  /**
   * Health check endpoint
   * GET /health
   */
  router.get('/health', (req, res) => {
    const config = getConfig();
    const { aiProviders, ragProviders } = getProviders();
    
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
