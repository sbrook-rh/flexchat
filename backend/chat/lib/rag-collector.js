/**
 * RAG Collector - Phase 2 of request flow
 * 
 * Collects RAG query results from selected collections and returns a
 * normalized envelope describing the outcome.
 * Does NOT make routing decisions - just collects data.
 */

const { generateEmbeddings } = require('./embedding-generator');

/**
 * Collect RAG results from selected collections
 * 
 * @param {string} userMessage - The original user message
 * @param {string} topic - The detected topic (normalized, with accumulated context)
 * @param {string} currentTopic - The previous topic (empty string if first message)
 * @param {Array<Object>} selectedCollections - Array of { service, name, embedding_connection, embedding_model }
 * @param {Object} ragServicesConfig - RAG services configuration from config.rag_services
 * @param {Object} ragProviders - Map of initialized RAG provider instances
 * @param {Object} config - Full application config (for embedding generation)
 * @returns {Promise<{ result: 'match' | 'partial' | 'none', data: Object | Array | null }>} Normalized envelope
 */
async function collectRagResults(userMessage, topic, currentTopic, selectedCollections, ragServicesConfig, ragProviders, config) {
  console.log(`\n🔍 Collecting RAG results...`);
  
  const ragResults = [];
  
  // If no collections selected, return empty array
  if (!selectedCollections || selectedCollections.length === 0) {
    console.log(`   ℹ️  No collections selected, skipping RAG queries`);
    return { result: 'none', data: null };
  }
  
  // Choose query text: Use userMessage for first message (no context yet), topic for follow-ups
  const queryText = (!currentTopic || currentTopic.trim() === '') ? userMessage : topic;
  console.log(`   🔍 Query strategy: ${!currentTopic || currentTopic.trim() === '' ? 'first message (raw query)' : 'follow-up (contextualized topic)'}`);
  console.log(`   📝 Query text: "${queryText}"`);
  
  // Cache for query embeddings: Key = "connectionId:model", Value = embedding array
  const embeddingCache = new Map();
  
  // Iterate through selected collections
  for (const collection of selectedCollections) {
    const serviceName = collection.service;
    const collectionName = collection.name;
    
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
      // Generate query embedding (with caching for same connection+model)
      let queryEmbedding = null;
      
      if (collection.embedding_connection && collection.embedding_model) {
        const embeddingKey = `${collection.embedding_connection}:${collection.embedding_model}`;
        
        // Check cache first
        if (embeddingCache.has(embeddingKey)) {
          console.log(`   ♻️  Reusing cached embedding for ${embeddingKey}`);
          queryEmbedding = embeddingCache.get(embeddingKey);
        } else {
          // Generate new embedding
          console.log(`   🔧 Generating query embedding for ${embeddingKey}`);
          try {
            const embeddings = await generateEmbeddings(
              [queryText],
              collection.embedding_connection,
              config,
              collection.embedding_model
            );
            queryEmbedding = embeddings[0];
            embeddingCache.set(embeddingKey, queryEmbedding);
          } catch (error) {
            console.error(`   ❌ Failed to generate embedding for ${embeddingKey}:`, error.message);
            // Continue without embedding - will fail at wrapper level
          }
        }
      } else {
        console.warn(`   ⚠️  Collection ${collectionName} missing embedding connection info`);
      }
      
      // Query the collection
      const queryOptions = {
        collection: collectionName,
        top_k: 3  // TODO: make configurable
      };
      
      if (queryEmbedding) {
        queryOptions.query_embedding = queryEmbedding;
      }
      
      const response = await provider.query(queryText, queryOptions);
      
      if (!response || !response.results || response.results.length === 0) {
        console.log(`   📭 No results from ${serviceName}/${collectionName}`);
        continue;
      }
      
      const results = response.results;
      const collectionMetadata = response.collectionMetadata || {};
      // console.log(`   ⚙️ metadata: ${JSON.stringify(response.collectionMetadata)}`);

      // Get minimum distance from results
      const minDistance = Math.min(...results.map(r => r.distance));
      console.log(`   📊 Min distance: ${minDistance.toFixed(4)}`);
      
      function classifyResult(distance, serviceConfig, collectionMetadata) {
        const matchThreshold = collectionMetadata.match_threshold || serviceConfig.match_threshold;
        const partialThreshold = collectionMetadata.partial_threshold || serviceConfig.partial_threshold;
        
        if (distance < matchThreshold) {
          return 'match';
        }
        
        if (partialThreshold !== undefined && distance < partialThreshold) {
          return 'partial';
        }
        
        return 'none';
      }

      // Classify result based on thresholds
      const resultType = classifyResult(minDistance, serviceConfig, collectionMetadata);
      
      if (resultType === 'none') {
        console.log(`   ⏭️  Distance too high, skipping (match_threshold: ${serviceConfig.match_threshold})`);
        continue;
      }
      
      // Get description from collection metadata (if available)
      const description = collectionMetadata.description || `Information about ${collectionName}`;
      
      // Add to results array
      const ragResult = {
        result_type: resultType,
        service: serviceName,
        collection: collectionName,
        documents: results.map(r => ({
          text: r.text,
          title: r.metadata?.title,
          source: r.metadata?.source,
          metadata: r.metadata,
          collection: collectionName  // Add collection name to each document
        })),
        distance: minDistance,
        description
      };
      
      console.log(`   ✅ Result: ${resultType} (distance: ${minDistance.toFixed(4)})`);
      
      // If this is a match, return immediately (query_mode: "first")
      if (resultType === 'match') {
        console.log(`   🎯 Match found! Returning normalized envelope.`);
        return { result: 'match', data: ragResult };
      }
      
      // Otherwise, collect partial result
      ragResults.push(ragResult);
      
    } catch (error) {
      console.error(`   ❌ Error querying ${serviceName}/${collectionName}:`, error.message);
      // Continue to next collection on error
      // This allows the system to be resilient to individual provider failures
    }
  }
  
  console.log(`\n   📦 Collected ${ragResults.length} partial result(s)`);
  
  if (ragResults.length === 0) {
    return { result: 'none', data: null };
  }
  
  return { result: 'partial', data: ragResults };
}

module.exports = {
  collectRagResults
};
