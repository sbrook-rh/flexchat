/**
 * Profile Builder - Phase 1b of request flow
 * 
 * Builds a normalized profile object from RAG results.
 * The profile is used for response matching and variable substitution.
 */

/**
 * Build profile from a single match result
 * 
 * @param {Object} matchResult - Single match result from collectRagResults
 * @returns {Object} Profile object for response matching and generation
 */
function buildProfileFromMatch(matchResult) {
  return {
    rag_results: 'match',
    service: matchResult.service,
    collection: matchResult.collection,
    intent: matchResult.identifier,
    documents: matchResult.documents
  };
}

/**
 * Build profile from partial results or no results
 * Performs intent detection via LLM call.
 * 
 * @param {Array} partialResults - Array of partial results (or empty array)
 * @param {string} topic - The detected conversation topic (from topic detector)
 * @param {Object} intentConfig - Intent detection configuration
 * @param {Object} aiProviders - Map of AI provider instances
 * @returns {Promise<Object>} Profile object with intent detected
 */
async function buildProfileFromPartials(partialResults, topic, intentConfig, aiProviders) {
  console.log(`\n🧠 Phase 2: Intent Detection...`);
  
  // Step 1: Build initial profile structure
  const hasPartials = Array.isArray(partialResults) && partialResults.length > 0;
  const profile = {
    rag_results: hasPartials ? 'partial' : 'none',
    documents: hasPartials ? partialResults.flatMap(r => r.documents) : []
  };
  
  // Step 2: Build intent detection prompt
  const categories = [];
  
  // Add general categories from config
  if (intentConfig && intentConfig.detection) {
    for (const [key, description] of Object.entries(intentConfig.detection)) {
      categories.push({ name: key, description });
    }
  }
  
  // Add partial match collections as additional categories
  if (hasPartials) {
    for (const result of partialResults) {
      categories.push({
        name: result.identifier,
        description: result.description
      });
    }
  }
  
  // Build the classification prompt
  const categoriesText = categories.map(c => `- "${c.name}": ${c.description}`).join('\n');
  
  const prompt = `You are classifying user queries.

Available categories:
${categoriesText}
- "other": Query doesn't fit any category

Current query: "${topic}"

Reply with ONLY the category name that best matches. If nothing fits, reply "other".`;

  console.log(`   📋 ${categories.length} categories available for classification`);
  // console.log(`   🔍 Intent detection prompt:\n${prompt}\n`);
  
  // Step 3: Call LLM for intent classification
  if (!intentConfig || !intentConfig.provider || !intentConfig.provider.llm || !intentConfig.provider.model) {
    console.log(`   ⚠️  No intent detection config, setting intent to undefined`);
    profile.intent = undefined;
    return profile;
  }
  
  const providerName = intentConfig.provider.llm;
  const modelName = intentConfig.provider.model;
  
  const provider = aiProviders[providerName];
  if (!provider) {
    console.error(`   ❌ AI provider not found: ${providerName}`);
    profile.intent = undefined;
    return profile;
  }
  
  try {
    const messages = [{ role: 'user', content: prompt }];
    const response = await provider.generateChat(messages, modelName, {
      max_tokens: 50,
      temperature: 0.1  // Low temperature for deterministic classification
    });
    
    // Step 4: Parse response and set intent
    const detectedIntent = response.content.trim();
    console.log(`   ✅ Detected intent: "${detectedIntent}"`);
    profile.intent = detectedIntent;
    
    // If intent is a service/collection identifier, parse and set service/collection
    if (detectedIntent && detectedIntent.includes('/')) {
      const parts = detectedIntent.split('/');
      if (parts.length === 2) {
        profile.service = parts[0];
        profile.collection = parts[1];
        console.log(`   📍 Parsed as service/collection: ${profile.service}/${profile.collection}`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error during intent detection:`, error.message);
    profile.intent = undefined;
  }
  
  return profile;
}

module.exports = {
  buildProfileFromMatch,
  buildProfileFromPartials
};

