const express = require('express');
const router = express.Router();
const { 
  listCollections, 
  createCollection, 
  deleteCollection, 
  updateCollectionMetadata,
  getCollection,
  addDocuments 
} = require('../lib/collection-manager');
const { generateEmbeddings } = require('../lib/embedding-generator');
const { getProcessedConfig } = require('../lib/config-loader');
const { DEFAULT_TOPIC_PROMPT } = require('../lib/topic-detector');
const { transformDocuments } = require('../lib/document-transformer');

/**
 * ChromaDB Metadata Constraints:
 * 
 * 1. Metadata values MUST be primitives: string, int, float, or boolean.
 *    Complex types (objects, arrays) are NOT supported.
 *    Solution: JSON.stringify complex values before storage, JSON.parse when reading.
 * 
 * 2. Special immutable keys (set at collection creation, cannot be updated):
 *    - 'hnsw:space' - Distance metric (cosine, l2, ip)
 *    Solution: Remove these keys before calling updateCollectionMetadata()
 * 
 * Examples:
 * - document_schema: JSON.stringify(schema)  // Store
 * - JSON.parse(metadata.document_schema)     // Read
 * - const { 'hnsw:space': _, ...updatable } = metadata  // Remove immutable keys
 */

/**
 * Create collections router with dependency injection
 * @param {Function} getConfig - Getter for current config (always up-to-date)
 * @param {Function} getProviders - Getter for current providers (always up-to-date)
 * @param {Function} getProviderStatus - Getter for current provider status (always up-to-date)
 * @returns {express.Router} Configured collections router
 */
function createCollectionsRouter(getConfig, getProviders, getProviderStatus) {
  /**
   * List all collections from all RAG services
   * Returns collections, wrapper info, and hasWrappers flag for frontend
   * GET /api/collections
   */
  router.get('/collections', async (req, res) => {
    try {
      const config = getConfig();
      const { ragProviders } = getProviders();
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
      // Get current state via getters (always up-to-date after hot-reload)
      const config = getConfig();
      const { ragProviders } = getProviders();
      const providerStatus = getProviderStatus();
      
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
      
      // Find the default response handler (the one without a "match" key)
      const defaultHandlerIndex = config.responses 
        ? config.responses.findIndex(r => !r.match)
        : -1;
      
      res.json({
        // Existing fields
        collections: collectionsData.collections,
        wrappers: collectionsData.wrappers,
        modelSelection,
        llms: config.llms || {},  // Add LLM connections for embedding resolution
        defaultHandlerIndex,  // Index of the default (fallback) handler, or -1 if none
        defaultTopicPrompt: DEFAULT_TOPIC_PROMPT,  // Default prompt for topic detection customization
        
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
      const { name, metadata, service, embedding_connection, embedding_model } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Collection name is required' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      if (!embedding_connection) {
        return res.status(400).json({ error: 'embedding_connection is required' });
      }
      
      // Resolve embedding provider/model and dimensions
      const rawConfig = getConfig();
      const processedConfig = getProcessedConfig(rawConfig);
      const llmConfig = processedConfig.llms?.[embedding_connection];
      if (!llmConfig) {
        return res.status(400).json({ error: `LLM connection "${embedding_connection}" not found` });
      }
      const provider = llmConfig.provider;
      
      // Require embedding_model from UI
      if (!embedding_model) {
        return res.status(400).json({ error: 'embedding_model is required' });
      }
      
      // Probe embedding dimensions (best-effort)
      let embeddingDimensions = undefined;
      try {
        const dimsProbe = await generateEmbeddings(['dimension-probe'], embedding_connection, processedConfig, embedding_model);
        if (Array.isArray(dimsProbe) && Array.isArray(dimsProbe[0])) {
          embeddingDimensions = dimsProbe[0].length;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to probe embedding dimensions for "${embedding_connection}": ${e.message}`);
      }
      
      const enrichedMetadata = {
        ...(metadata || {}),
        embedding_provider: provider,
        embedding_model: embedding_model,
        embedding_connection_id: embedding_connection,
        ...(embeddingDimensions ? { embedding_dimensions: embeddingDimensions } : {})
      };
      
      const { ragProviders } = getProviders();
      const result = await createCollection(service, name, enrichedMetadata, processedConfig.rag_services, ragProviders);
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
   * Supports both pre-formatted documents and raw documents with transformation
   * Requires service name to avoid ambiguity
   * POST /api/collections/:name/documents
   */
  router.post('/collections/:name/documents', async (req, res) => {
    try {
      const { name } = req.params;
      const { documents, raw_documents, schema, save_schema, service, embedding_connection, embedding_model } = req.body;
      
      // Mutual exclusivity check
      if (documents && raw_documents) {
        return res.status(400).json({ error: 'Provide either documents or raw_documents, not both' });
      }
      
      // Validate service and embedding parameters
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      if (!embedding_connection) {
        return res.status(400).json({ error: 'embedding_connection is required' });
      }
      
      if (!embedding_model) {
        return res.status(400).json({ error: 'embedding_model is required' });
      }
      
      // Track transformation status
      let transformed = false;
      let finalDocuments;
      
      // New path: raw documents with transformation
      if (raw_documents) {
        if (!schema) {
          return res.status(400).json({ error: 'schema is required when using raw_documents' });
        }
        
        if (!Array.isArray(raw_documents)) {
          return res.status(400).json({ error: 'raw_documents must be an array' });
        }
        
        // Transform documents
        try {
          finalDocuments = transformDocuments(raw_documents, schema);
          transformed = true;
        } catch (transformError) {
          return res.status(400).json({
            error: 'Document transformation failed',
            message: transformError.message
          });
        }
      } 
      // Existing path: pre-formatted documents
      else {
        if (!documents || !Array.isArray(documents)) {
          return res.status(400).json({ error: 'Documents array is required' });
        }
        finalDocuments = documents;
        transformed = false;
      }
      
      const rawConfig = getConfig();
      const processedConfig = getProcessedConfig(rawConfig);
      
      // Generate embeddings in Node
      const texts = finalDocuments
        .map(d => (d && typeof d.text === 'string' ? d.text : ''))
        .filter(t => t && t.length > 0);
      
      if (texts.length === 0) {
        return res.status(400).json({ error: 'No valid documents with text provided' });
      }
      
      const embeddings = await generateEmbeddings(texts, embedding_connection, processedConfig, embedding_model);
      
      // Attach embeddings to documents (skip empty-text docs)
      const documentsWithEmbeddings = [];
      let embIdx = 0;
      for (const doc of finalDocuments) {
        const text = doc && typeof doc.text === 'string' ? doc.text : '';
        if (!text) continue;
        documentsWithEmbeddings.push({
          ...doc,
          embedding: embeddings[embIdx++]
        });
      }
      
      const { ragProviders } = getProviders();
      const result = await addDocuments(service, name, documentsWithEmbeddings, rawConfig.rag_services, ragProviders);
      
      // Add transformation status to response
      result.transformed = transformed;
      
      // Schema persistence (non-fatal)
      if (transformed && save_schema && schema) {
        try {
          const collection = await getCollection(service, name, ragProviders, processedConfig.rag_services);
          const currentMetadata = collection.metadata || {};
          
          // Parse existing schema if it exists (it's stored as JSON string)
          const existingSchema = currentMetadata.document_schema 
            ? JSON.parse(currentMetadata.document_schema)
            : null;
          
          // ChromaDB metadata only accepts primitives (string, int, float, boolean)
          // Must stringify the schema object before storage
          const schemaWithTimestamps = {
            ...schema,
            created_at: existingSchema?.created_at || new Date().toISOString(),
            last_used: new Date().toISOString()
          };
          
          // Remove ChromaDB-specific keys that cannot be updated (immutable)
          // hnsw:space is set at collection creation and cannot be changed
          const { 'hnsw:space': _, ...updatableMetadata } = currentMetadata;
          
          await updateCollectionMetadata(
            service, 
            name, 
            {
              ...updatableMetadata,
              document_schema: JSON.stringify(schemaWithTimestamps)  // Store as JSON string
            },
            processedConfig.rag_services,
            ragProviders
          );
          
          result.schema_saved = true;
        } catch (schemaError) {
          console.warn(`⚠️  Schema persistence failed for collection ${name}:`, schemaError.message);
          result.schema_saved = false;
          result.schema_warning = schemaError.message;
        }
      }
      
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
      const { metadata, service, merge = false } = req.body;
      
      if (!metadata || typeof metadata !== 'object') {
        return res.status(400).json({ error: 'Metadata object is required' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      const config = getConfig();
      const { ragProviders } = getProviders();
      const result = await updateCollectionMetadata(service, name, metadata, config.rag_services, ragProviders, merge);
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
   * Get unique metadata values for a field
   * GET /api/collections/:name/metadata-values?field=...&service=...
   */
  router.get('/collections/:name/metadata-values', async (req, res) => {
    try {
      const { name } = req.params;
      const { field, service } = req.query;
      
      if (!field) {
        return res.status(400).json({ error: 'Field parameter is required' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required (query parameter)' });
      }
      
      const config = getConfig();
      const { ragProviders } = getProviders();
      
      // Get the provider
      const provider = ragProviders[service];
      if (!provider) {
        return res.status(404).json({ error: `Service "${service}" not found` });
      }
      
      // Call the provider's metadata-values endpoint if it exists
      if (typeof provider.getMetadataValues === 'function') {
        const result = await provider.getMetadataValues(name, field);
        res.json(result);
      } else {
        return res.status(501).json({ error: 'Metadata values not supported by this provider' });
      }
    } catch (error) {
      console.error(`❌ Error getting metadata values for ${req.params.name}:`, error);
      res.status(500).json({ 
        error: 'Failed to get metadata values',
        message: error.message 
      });
    }
  });

  /**
   * Empty a collection (delete all documents)
   * Preserves collection metadata and settings
   * DELETE /api/collections/:name/documents/all
   */
  router.delete('/collections/:name/documents/all', async (req, res) => {
    try {
      const { name } = req.params;
      const { service } = req.query;
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required (query parameter)' });
      }
      
      const { ragProviders } = getProviders();
      
      // Get the provider
      const provider = ragProviders[service];
      if (!provider) {
        return res.status(404).json({ error: `Service "${service}" not found` });
      }
      
      const result = await provider.emptyCollection(name);
      res.json(result);
    } catch (error) {
      console.error(`❌ Error emptying collection ${req.params.name}:`, error);
      res.status(500).json({ 
        error: 'Failed to empty collection',
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
      
      const config = getConfig();
      const { ragProviders } = getProviders();
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
