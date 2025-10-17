/**
 * Topic Detector - Phase 1 of request flow
 *
 * Discerns latest topic from recent user requests
 */

/**
 * Identify topic from recent queries
 *
 * @param {string} userMessage - The latest user's query
 * @param {Array<string>} recentUserMessages - Recent user messages for context (already filtered)
 * @param {Object} intentConfig - Intent detection configuration
 * @param {Object} aiProviders - Map of AI provider instances
 * @returns {string} Succinct description of the topic
 */
async function identifyTopic(userMessage, recentUserMessages, intentConfig, aiProviders) {
  console.log(`\n🔎 Topic Detection: Identifying conversation topic...`);
  
  // If no conversation history, just use the user's message
  if (!recentUserMessages || recentUserMessages.length === 0) {
    console.log(`   ℹ️  No conversation history, using query as-is`);
    return userMessage;
  }
  
  // Check if LLM is available for topic detection
  if (!intentConfig || !intentConfig.provider || !intentConfig.provider.llm || !intentConfig.provider.model) {
    console.log(`   ⚠️  No intent detection config, using query as-is`);
    return userMessage;
  }

  const providerName = intentConfig.provider.llm;
  const modelName = intentConfig.provider.model;

  const provider = aiProviders[providerName];
  if (!provider) {
    console.error(`   ❌ AI provider not found: ${providerName}, using query as-is`);
    return userMessage;
  }

  const prompt = `You are identifying the current topic of a conversation. The user's latest question may:
- Continue the previous topic
- Ask a follow-up using unclear references (it, that, this)
- Change to a completely new topic

Previous questions:
${recentUserMessages.map(msg => `- ${msg}`).join('\n')}

Latest question:
- ${userMessage}

Reply with a short, clear description of what the user is currently asking about. This will be used to search for relevant documents.`;

  console.log(`   🔍 Topic detection prompt:\n${prompt}\n`);

  try {
    const messages = [{ role: 'user', content: prompt }];
    const response = await provider.generateChat(messages, modelName, {
      max_tokens: 100,
      temperature: 0.1  // Low temperature for deterministic classification
    });

    const topic = response.content.trim();
    console.log(`   ✅ Detected topic: "${topic}"`);
    return topic;

  } catch (error) {
    console.error(`   ❌ Error during topic detection:`, error.message);
    return userMessage;  // Fallback to original query
  }
}

module.exports = {
  identifyTopic
};
