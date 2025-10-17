/**
 * RAG Collector - Phase 1 of request flow
 * 
 * Collects RAG query results from selected collections.
 * Does NOT make routing decisions - just collects data.
 */

/**
 * Collect RAG results from selected collections
 * 
 * @param {string} userMessage - The user's query
 * @param {Array<string>} selectedCollections - Array of collection identifiers (e.g., ["service/collection"])
 * @param {Object} ragServicesConfig - RAG services configuration from config.rag_services
 * @param {Object} ragProviders - Map of initialized RAG provider instances
 * @returns {Promise<Object|Array>} Single match object, or array of partial results, or empty array
 */
async function collectRagResults(userMessage, selectedCollections, ragServicesConfig, ragProviders) {
  console.log(`\n🔍 Phase 1: Collecting RAG results...`);
  
  const ragResults = [];
  
  // If no collections selected, return empty array
  if (!selectedCollections || selectedCollections.length === 0) {
    console.log(`   ℹ️  No collections selected, skipping RAG queries`);
    return ragResults;
  }
  
  // Iterate through selected collections
  for (const identifier of selectedCollections) {
    console.log(`\n   📚 Querying: ${identifier}`);
    
    // Parse identifier into service + collection
    const parts = identifier.split('/');
    if (parts.length !== 2) {
      console.warn(`   ⚠️  Invalid collection identifier: ${identifier} (expected format: service/collection)`);
      continue;
    }
    
    const [serviceName, collectionName] = parts;
    
    // Get service configuration
    const serviceConfig = ragServicesConfig[serviceName];
    if (!serviceConfig) {
      console.warn(`   ⚠️  RAG service not found in config: ${serviceName}`);
      continue;
    }
    
    // Get provider instance
    const provider = ragProviders[serviceName];
    if (!provider) {
      console.warn(`   ⚠️  RAG provider not initialized: ${serviceName}`);
      continue;
    }
    
    try {
      // Query the collection
      const queryOptions = {
        collection: collectionName,
        top_k: 3  // TODO: make configurable
      };
      
      const response = await provider.query(userMessage, queryOptions);
      
      if (!response || !response.results || response.results.length === 0) {
        console.log(`   📭 No results from ${identifier}`);
        continue;
      }
      
      const results = response.results;
      const collectionMetadata = response.collectionMetadata || {};
      
      // Get minimum distance from results
      const minDistance = Math.min(...results.map(r => r.distance));
      console.log(`   📊 Min distance: ${minDistance.toFixed(4)}`);
      
      // Classify result based on thresholds
      const resultType = classifyResult(minDistance, serviceConfig);
      
      if (resultType === 'none') {
        console.log(`   ⏭️  Distance too high, skipping (match_threshold: ${serviceConfig.match_threshold})`);
        continue;
      }
      
      // Get description from collection metadata (if available)
      const description = collectionMetadata.description || `Information about ${collectionName}`;
      
      // Add to results array
      const ragResult = {
        identifier,
        result_type: resultType,
        service: serviceName,
        collection: collectionName,
        documents: results.map(r => ({
          text: r.text,
          title: r.metadata?.title,
          source: r.metadata?.source
        })),
        distance: minDistance,
        description
      };
      
      console.log(`   ✅ Result: ${resultType} (distance: ${minDistance.toFixed(4)})`);
      
      // If this is a match, return immediately (query_mode: "first")
      if (resultType === 'match') {
        console.log(`   🎯 Match found! Returning single match object.`);
        return ragResult;
      }
      
      // Otherwise, collect partial result
      ragResults.push(ragResult);
      
    } catch (error) {
      console.error(`   ❌ Error querying ${identifier}:`, error.message);
      // Continue to next collection on error
      // This allows the system to be resilient to individual provider failures
    }
  }
  
  console.log(`\n   📦 Collected ${ragResults.length} partial result(s)`);
  
  // Return array of partial results (or empty array if none)
  return ragResults;
}

/**
 * Classify a result based on distance and service thresholds
 * 
 * @param {number} distance - The similarity distance
 * @param {Object} serviceConfig - RAG service configuration
 * @returns {string} "match" | "partial" | "none"
 */
function classifyResult(distance, serviceConfig) {
  const matchThreshold = serviceConfig.match_threshold;
  const partialThreshold = serviceConfig.partial_threshold;
  
  if (distance < matchThreshold) {
    return 'match';
  }
  
  if (partialThreshold !== undefined && distance < partialThreshold) {
    return 'partial';
  }
  
  return 'none';
}

module.exports = {
  collectRagResults,
  classifyResult
};
