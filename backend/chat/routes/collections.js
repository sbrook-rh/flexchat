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
 * @param {Object} config - Server configuration
 * @param {Object} ragProviders - RAG provider instances
 * @returns {express.Router} Configured collections router
 */
function createCollectionsRouter(config, ragProviders) {
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
   * Returns collections, wrappers, and model selection config in one call
   * GET /api/ui-config
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
      
      res.json({
        collections: collectionsData.collections,
        wrappers: collectionsData.wrappers,
        modelSelection
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
