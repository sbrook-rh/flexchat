const express = require('express');
const router = express.Router();
const { 
  listCollections, 
  createCollection, 
  deleteCollection, 
  updateCollectionMetadata, 
  addDocuments 
} = require('../lib/collection-manager');

/**
 * Create collections router with dependency injection
 * @param {Object} config - Server configuration (raw with placeholders)
 * @param {Object} ragProviders - RAG provider instances
 * @param {Object} aiProviders - AI provider instances (Phase 1.6.5)
 * @param {Object} providerStatus - Provider connection status (Phase 1.6.5)
 * @returns {express.Router} Configured collections router
 */
function createCollectionsRouter(config, ragProviders, aiProviders = {}, providerStatus = null) {
  /**
   * List all collections from all RAG services
   * Returns collections, wrapper info, and hasWrappers flag for frontend
   * GET /api/collections
   */
  router.get('/collections', async (req, res) => {
    try {
      const result = await listCollections(config.rag_services, ragProviders);
      res.json(result);  // Returns { collections, wrappers }
    } catch (error) {
      console.error('❌ Error listing collections:', error);
      res.status(500).json({ 
        error: 'Failed to list collections',
        message: error.message 
      });
    }
  });

  /**
   * Get complete UI configuration
   * Returns collections, wrappers, model selection, and provider status
   * GET /api/ui-config
   * 
   * Phase 1.6.5: Extended with provider status tracking
   */
  router.get('/ui-config', async (req, res) => {
    try {
      // Get collections and wrappers
      const collectionsData = await listCollections(config.rag_services, ragProviders);
      
      // TODO: Build model selection config
      // For now, return empty structure
      const modelSelection = {
        enabled: false,
        providers: {}
      };
      
      // Phase 1.6.5: Add provider status fields
      const hasConfig = Boolean(config && Object.keys(config).length > 0);
      const isZeroConfig = !hasConfig; // TODO: Update when zero-config mode is implemented
      
      // Check if we have at least one working LLM provider
      const hasWorkingProviders = providerStatus && 
        Object.values(providerStatus.llms || {}).some(p => p.connected);
      
      // Check if we have at least one response handler configured
      const hasResponseHandlers = Boolean(
        config.responses && 
        Array.isArray(config.responses) && 
        config.responses.length > 0
      );
      
      // Chat is ready if we have both working providers AND response handlers
      const chatReady = hasWorkingProviders && hasResponseHandlers;
      
      res.json({
        // Existing fields
        collections: collectionsData.collections,
        wrappers: collectionsData.wrappers,
        modelSelection,
        
        // Phase 1.6.5: New fields for Configuration Builder
        hasConfig,
        isZeroConfig,
        providerStatus: providerStatus || { llms: {}, rag_services: {} },
        hasWorkingProviders,
        hasResponseHandlers,
        chatReady
      });
    } catch (error) {
      console.error('❌ Error getting UI config:', error);
      res.status(500).json({ 
        error: 'Failed to get UI configuration',
        message: error.message 
      });
    }
  });

  /**
   * Create a new collection
   * Requires service name to avoid ambiguity
   * POST /api/collections
   */
  router.post('/collections', async (req, res) => {
    try {
      const { name, metadata, service } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Collection name is required' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      const result = await createCollection(service, name, metadata, config.rag_services, ragProviders);
      res.json(result);
    } catch (error) {
      console.error('❌ Error creating collection:', error);
      res.status(500).json({ 
        error: 'Failed to create collection',
        message: error.message 
      });
    }
  });

  /**
   * Add documents to a collection
   * Requires service name to avoid ambiguity
   * POST /api/collections/:name/documents
   */
  router.post('/collections/:name/documents', async (req, res) => {
    try {
      const { name } = req.params;
      const { documents, service } = req.body;
      
      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({ error: 'Documents array is required' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      const result = await addDocuments(service, name, documents, config.rag_services, ragProviders);
      res.json(result);
    } catch (error) {
      console.error(`❌ Error adding documents to collection ${req.params.name}:`, error);
      res.status(500).json({ 
        error: 'Failed to add documents',
        message: error.message 
      });
    }
  });

  /**
   * Update collection metadata
   * Requires service name to avoid ambiguity
   * PUT /api/collections/:name/metadata
   */
  router.put('/collections/:name/metadata', async (req, res) => {
    try {
      const { name } = req.params;
      const { metadata, service } = req.body;
      
      if (!metadata || typeof metadata !== 'object') {
        return res.status(400).json({ error: 'Metadata object is required' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      const result = await updateCollectionMetadata(service, name, metadata, config.rag_services, ragProviders);
      res.json(result);
    } catch (error) {
      console.error(`❌ Error updating metadata for collection ${req.params.name}:`, error);
      res.status(500).json({ 
        error: 'Failed to update metadata',
        message: error.message 
      });
    }
  });

  /**
   * Delete a collection
   * Requires service name to avoid ambiguity
   * DELETE /api/collections/:name
   */
  router.delete('/collections/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const { service } = req.query;
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required (query parameter)' });
      }
      
      await deleteCollection(service, name, config.rag_services, ragProviders);
      res.json({ success: true, message: `Collection ${name} deleted` });
    } catch (error) {
      console.error(`❌ Error deleting collection ${req.params.name}:`, error);
      res.status(500).json({ 
        error: 'Failed to delete collection',
        message: error.message 
      });
    }
  });

  return router;
}

module.exports = { createCollectionsRouter };
