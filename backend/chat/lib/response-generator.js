/**
 * Response Generator - Phase 6 of request flow
 * 
 * Generates the final response by:
 * 1. Substituting template variables {{var}} in prompt
 * 2. Calling the LLM with the constructed prompt
 */


/**
 * Generate final response using LLM
 * 
 * @param {Object} profile - The profile object from previous phases
 * @param {Object} responseRule - The matched response rule
 * @param {Object} aiProviders - Map of AI provider instances
 * @param {string} userMessage - The user's message/question
 * @param {Array} previousMessages - Previous conversation messages
 * @returns {Promise<Object>} Object with { content, service, model }
 */
async function generateResponse(profile, responseRule, aiProviders, userMessage, previousMessages) {
  console.log(`\n💬 Generating response...`);
  
  // Get LLM provider
  const providerName = responseRule.llm;
  const provider = aiProviders[providerName];
  
  if (!provider) {
    throw new Error(`AI provider not found: ${providerName}`);
  }
  
  console.log(`   🤖 Using LLM: ${providerName} / ${responseRule.model}`);
  
  function substituteVariables(template, profile) {
    if (!template) {
      return '';
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      
      // Special case: rag_context should format documents
      if (trimmedPath === 'rag_context') {
        return (profile.documents.map(doc => doc.text).join("\n"));
      }
      
      // Handle nested paths like "service.prompt"
      const parts = trimmedPath.split('.');
      let value = profile;
      
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }
      
      // Return value if found, otherwise keep placeholder
      return value !== undefined ? value : match;
    });
  }

  // Substitute variables in prompt (this becomes the system message)
  const systemPrompt = substituteVariables(responseRule.prompt, profile);
  console.log(`   📝 System prompt length: ${systemPrompt.length} characters`);
  
  // Build messages array: system + history + user
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Transform and add conversation history
  if (previousMessages && previousMessages.length > 0) {
    previousMessages.forEach(message => {
      messages.push({
        role: message.type === 'user' ? 'user' : 'assistant',
        content: message.text
      });
    });
  }
  
  // Add current user message
  messages.push({ role: 'user', content: userMessage });
  
  console.log(`   💬 Message structure: 1 system + ${previousMessages?.length || 0} history + 1 user`);
  // console.log(messages);
  
  // Prepare options
  const options = {
    max_tokens: responseRule.max_tokens || 500
  };
  
  // Call LLM
  try {
    const result = await provider.generateChat(messages, responseRule.model, options);
    
    console.log(`   ✅ Response generated (${result.content.length} characters)`);
    
    // Return response with metadata about which service/model was used
    return {
      content: result.content,
      service: providerName,
      model: responseRule.model
    };
    
  } catch (error) {
    console.error(`   ❌ Error generating response:`, error.message);
    throw error;
  }
}

module.exports = {
  generateResponse
};

