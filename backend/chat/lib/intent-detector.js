/**
 * Intent Detector - Phase 3 of request flow
 *
 * Provides intent detection and refinement.
 */

/**
 * Detect intent given the topic and optional RAG partial summaries.
 * Fast path: if rag.result === 'match', return `${service}/${collection}` without LLM.
 *
 * @param {string} topic
 * @param {{ result: 'match'|'partial'|'none', data: any }} rag
 * @param {Object} intentConfig
 * @param {Object} aiProviders
 * @returns {Promise<string|undefined>} intent string or undefined
 */
async function detectIntent(topic, rag, intentConfig, aiProviders) {
  console.log(`\n💭 Detecting intent of query`);
  if (rag && rag.result === 'match' && rag.data) {
    return `${rag.data.service}/${rag.data.collection}`;
  }

  const providerName = intentConfig?.provider?.llm;
  const modelName = intentConfig?.provider?.model;
  const provider = aiProviders[providerName];
  if (!provider) {
    console.warn(`⚠️ No AI provider found (${providerName}) Intent not detected`);
    return undefined;
  }

  const categories = [];

  if (intentConfig && intentConfig.detection) {
    for (const [key, description] of Object.entries(intentConfig.detection)) {
      categories.push({ name: key, description });
    }
  }

  function summarizeRagPartials(rag) {
    if (!rag || rag.result !== 'partial' || !Array.isArray(rag.data)) {
      return [];
    }
    return rag.data.map(p => ({
      name: `${p.service}/${p.collection}`,
      description: p.description,
      distance: p.distance
    }));
  }
  
  const partials = summarizeRagPartials(rag);
  for (const p of partials) {
    categories.push({ name: p.name, description: p.description });
  }

  if (categories.length === 0) {
    return undefined;
  }

  if (!intentConfig || !intentConfig.provider || !intentConfig.provider.llm || !intentConfig.provider.model) {
    return undefined;
  }

  const categoriesText = categories.map(c => `- "${c.name}": ${c.description || ''}`).join('\n');
  const prompt = `You are classifying the user's query.\n\nAvailable categories:\n${categoriesText}\n- other: Query doesn't fit any category\n\nCurrent query/topic: "${topic}"\n\nReply with ONLY one of the category names from the list above.\nDo NOT invent or modify categories.\nIf nothing fits exactly, reply: other.`;

  try {
    const messages = [{ role: 'user', content: prompt }];
    const response = await provider.generateChat(messages, modelName, {
      max_tokens: 50,
      temperature: 0.1
    });
    let detected = response.content.trim();

    // Inline refinement: if 'other' and we have partials, pick best partial by lowest distance
    if (detected === 'other' && rag && rag.result === 'partial' && Array.isArray(rag.data) && rag.data.length > 0) {
      const best = rag.data.reduce((a, b) => (a.distance < b.distance ? a : b));
      detected = `${best.service}/${best.collection}`;
    }
    console.log(`  ✅ Detected intent: ${detected}`);
    return detected;
  } catch (err) {
    console.error(`   ❌ Error during intent detection:`, err.message);
    return undefined;
  }
}

module.exports = {
  detectIntent
};


