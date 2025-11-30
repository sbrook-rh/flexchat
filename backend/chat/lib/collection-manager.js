/**
 * Collection Manager
 * 
 * Handles collection management operations across all RAG services.
 * Provides a unified interface for listing, creating, updating, and deleting collections.
 */

/**
 * List all collections from all RAG services
 * 
 * Iterates through configured RAG services and retrieves collections based on provider type:
 * - chromadb-wrapper: Fetches dynamic collections via listCollections()
 * - chromadb (direct): No listing capability (collections specified at query time)
 * 
 * @param {Object} ragServices - RAG services from config (config.rag_services)
 * @param {Object} ragProviders - Initialized RAG provider instances
 * @returns {Promise<Object>} Object with collections array and wrapper service info
 */
async function listCollections(ragServices, ragProviders) {
  const collections = [];
  const wrappers = [];
  
  // Iterate through all RAG services from config
  for (const [serviceName, serviceConfig] of Object.entries(ragServices || {})) {
    const provider = ragProviders[serviceName];
    
    if (!provider) {
      console.warn(`⚠️  RAG service "${serviceName}" configured but provider not initialized`);
      continue;
    }
    
    // Check if this is a wrapper provider (supports dynamic collections)
    if (serviceConfig.provider === 'chromadb-wrapper') {
      try {
        // Get all collections from this wrapper
        const providerCollections = await provider.listCollections();
        
        // Add to our list with service name and metadata
        const serviceCollections = providerCollections.map(c => ({
          name: c.name,
          service: serviceName,  // Which rag_service this belongs
          metadata: c.metadata || {},
          count: c.count || 0
        }));
        
        collections.push(...serviceCollections);
        
        // Track this wrapper service
        const wrapperInfo = {
          name: serviceName,
          description: serviceConfig.description,
          url: serviceConfig.url,
          collectionCount: providerCollections.length
        };
        
        // Add collection field if this service is pinned to a specific collection
        if (serviceConfig.collection) {
          wrapperInfo.collection = serviceConfig.collection;
        }
        
        wrappers.push(wrapperInfo);
        
        console.log(`   ✅ Found ${providerCollections.length} collections from "${serviceName}"`);
      } catch (error) {
        console.error(`   ❌ Error listing collections from "${serviceName}":`, error.message);
        // Don't throw - allow other services to be queried
      }
    }
    // Note: Direct chromadb providers don't have a collection list endpoint
    // Collections are specified at query time via selectedCollections parameter
  }
  
  console.log(`📚 Returning ${collections.length} total collection(s) from ${wrappers.length} wrapper service(s)`);
  
  return {
    collections,
    wrappers,
    hasWrappers: wrappers.length > 0
  };
}

/**
 * Create a new collection in a wrapper service
 * 
 * @param {string} serviceName - Name of the RAG service to create collection in
 * @param {string} collectionName - Name of the new collection
 * @param {Object} metadata - Collection metadata (description, threshold, etc.)
 * @param {Object} ragServices - RAG services from config
 * @param {Object} ragProviders - Initialized RAG provider instances
 * @returns {Promise<Object>} Created collection info
 */
async function createCollection(serviceName, collectionName, metadata, ragServices, ragProviders) {
  // Validate service exists and is a wrapper
  const serviceConfig = ragServices[serviceName];
  if (!serviceConfig) {
    throw new Error(`RAG service "${serviceName}" not found in configuration`);
  }
  
  if (serviceConfig.provider !== 'chromadb-wrapper') {
    throw new Error(`RAG service "${serviceName}" does not support collection creation (not a wrapper)`);
  }
  
  const provider = ragProviders[serviceName];
  if (!provider) {
    throw new Error(`RAG service "${serviceName}" provider not initialized`);
  }
  
  // Create collection via provider
  return await provider.createCollection(collectionName, metadata);
}

/**
 * Delete a collection from a wrapper service
 * 
 * @param {string} serviceName - Name of the RAG service
 * @param {string} collectionName - Name of collection to delete
 * @param {Object} ragServices - RAG services from config
 * @param {Object} ragProviders - Initialized RAG provider instances
 * @returns {Promise<void>}
 */
async function deleteCollection(serviceName, collectionName, ragServices, ragProviders) {
  // Validate service exists and is a wrapper
  const serviceConfig = ragServices[serviceName];
  if (!serviceConfig) {
    throw new Error(`RAG service "${serviceName}" not found in configuration`);
  }
  
  if (serviceConfig.provider !== 'chromadb-wrapper') {
    throw new Error(`RAG service "${serviceName}" does not support collection deletion (not a wrapper)`);
  }
  
  const provider = ragProviders[serviceName];
  if (!provider) {
    throw new Error(`RAG service "${serviceName}" provider not initialized`);
  }
  
  // Delete collection via provider
  return await provider.deleteCollection(collectionName);
}

/**
 * Update collection metadata
 * 
 * @param {string} serviceName - Name of the RAG service
 * @param {string} collectionName - Name of collection to update
 * @param {Object} metadata - New metadata values
 * @param {Object} ragServices - RAG services from config
 * @param {Object} ragProviders - Initialized RAG provider instances
 * @returns {Promise<Object>} Updated collection info
 */
async function updateCollectionMetadata(serviceName, collectionName, metadata, ragServices, ragProviders, merge = false) {
  // Validate service exists and is a wrapper
  const serviceConfig = ragServices[serviceName];
  if (!serviceConfig) {
    throw new Error(`RAG service "${serviceName}" not found in configuration`);
  }
  console.log('serviceConfig', serviceConfig);
  if (serviceConfig.provider !== 'chromadb-wrapper') {
    throw new Error(`RAG service "${serviceName}" does not support metadata updates (not a wrapper)`);
  }
  
  const provider = ragProviders[serviceName];
  if (!provider) {
    throw new Error(`RAG service "${serviceName}" provider not initialized`);
  }
  
  // Update metadata via provider
  return await provider.updateCollectionMetadata(collectionName, metadata, merge);
}

/**
 * Get collection details including metadata
 * 
 * @param {string} serviceName - Name of the RAG service
 * @param {string} collectionName - Name of collection
 * @param {Object} ragProviders - Initialized RAG provider instances
 * @param {Object} ragServices - RAG services from config
 * @returns {Promise<Object>} Collection details with name, count, metadata
 */
async function getCollection(serviceName, collectionName, ragProviders, ragServices) {
  // Validate service exists and is a wrapper
  const serviceConfig = ragServices[serviceName];
  if (!serviceConfig) {
    throw new Error(`RAG service "${serviceName}" not found in configuration`);
  }
  
  if (serviceConfig.provider !== 'chromadb-wrapper') {
    throw new Error(`RAG service "${serviceName}" does not support collection info (not a wrapper)`);
  }
  
  const provider = ragProviders[serviceName];
  if (!provider) {
    throw new Error(`RAG service "${serviceName}" provider not initialized`);
  }
  
  // Get collection info via provider
  return await provider.getCollectionInfo(collectionName);
}

/**
 * Add documents to a collection
 * 
 * @param {string} serviceName - Name of the RAG service
 * @param {string} collectionName - Name of collection to add documents to
 * @param {Array} documents - Array of document objects with text and metadata
 * @param {Object} ragServices - RAG services from config
 * @param {Object} ragProviders - Initialized RAG provider instances
 * @returns {Promise<Object>} Upload result with count
 */
async function addDocuments(serviceName, collectionName, documents, ragServices, ragProviders) {
  // Validate service exists and is a wrapper
  const serviceConfig = ragServices[serviceName];
  if (!serviceConfig) {
    throw new Error(`RAG service "${serviceName}" not found in configuration`);
  }
  
  if (serviceConfig.provider !== 'chromadb-wrapper') {
    throw new Error(`RAG service "${serviceName}" does not support document upload (not a wrapper)`);
  }
  
  const provider = ragProviders[serviceName];
  if (!provider) {
    throw new Error(`RAG service "${serviceName}" provider not initialized`);
  }
  
  // Add documents via provider
  return await provider.addDocuments(collectionName, documents);
}

module.exports = {
  listCollections,
  createCollection,
  deleteCollection,
  updateCollectionMetadata,
  getCollection,
  addDocuments
};

