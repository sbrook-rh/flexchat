/**
 * Response Generator - Phase 6 of request flow
 *
 * Generates the final response by:
 * 1. Substituting template variables {{var}} in prompt
 * 2. Calling the LLM with the constructed prompt
 * 3. (Phase 6b) If tools enabled: iteratively execute tool calls until done or max_iterations reached
 */


/**
 * Substitute {{variable}} placeholders in a template string.
 *
 * @param {string} template - Template with {{var}} placeholders
 * @param {Object} profile - Profile object to resolve paths from
 * @returns {string} Template with substitutions applied
 */
function substituteVariables(template, profile) {
  if (!template) {
    return '';
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();

    // Special case: rag_context should format documents with source attribution
    if (trimmedPath === 'rag_context') {
      if (!profile.documents || profile.documents.length === 0) {
        return '[No relevant documents found]';
      }
      const formattedContext = profile.documents.map(doc => {
        const title = doc.metadata?.title || 'Untitled';
        const source = doc.collection ? ` (from ${doc.collection})` : '';
        return `### ${title}${source}\n\n${doc.text}`;
      }).join("\n\n---\n\n");

      console.log(`   🔧 RAG Context Assembly:`);
      console.log(`      📄 Documents in context: ${profile.documents.length}`);
      console.log(`      📏 Total context length: ${formattedContext.length} chars`);

      return formattedContext;
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

    // Warn and return placeholder unchanged if variable not resolved
    if (value === undefined) {
      console.warn(`   ⚠️  Unresolved template variable: {{${trimmedPath}}} — this placeholder will appear as literal text in the prompt. Valid variables: {{rag_context}}, or any field from the profile object.`);
      return match;
    }
    return value;
  });
}


/**
 * Execute the Phase 6b tool calling loop.
 *
 * Iteratively calls the provider, executes any tool calls, and continues
 * until the model signals `finish_reason: 'stop'` or `'end_turn'`,
 * or until max_iterations is reached.
 *
 * @param {Object} provider - AI provider instance
 * @param {Object} responseRule - The matched response rule
 * @param {Array} messages - Conversation messages array (mutated in place)
 * @param {Object} options - LLM call options (max_tokens, tools, etc.)
 * @param {Object} toolManager - ToolManager instance
 * @returns {Promise<Object>} { content, toolCalls, max_iterations_reached }
 */
async function _generateWithTools(provider, responseRule, messages, options, toolManager) {
  const globalMax = toolManager.getMaxIterations();
  const handlerMax = responseRule.tools?.max_iterations;
  const maxIterations = handlerMax || globalMax;

  const allowedTools = responseRule.tools?.allowed_tools || [];
  const providerName = provider.constructor.name.toLowerCase().replace('provider', '');
  const formattedTools = toolManager.registry.toProviderFormat(providerName, allowedTools);

  const callOptions = {
    ...options,
    tools: formattedTools
  };

  const allToolCalls = [];
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`   🔧 Tool loop iteration ${iteration}/${maxIterations}`);

    const result = await provider.generateChat(messages, responseRule.model, callOptions);
    const finishReason = result.finish_reason;

    if (finishReason === 'stop' || finishReason === 'end_turn' || !finishReason) {
      // Model finished - return final response
      console.log(`   ✅ Tool loop complete (finish_reason: ${finishReason || 'none'})`);
      return {
        content: result.content,
        toolCalls: allToolCalls,
        max_iterations_reached: false
      };
    }

    if (finishReason === 'tool_calls') {
      const toolCalls = result.tool_calls || [];
      console.log(`   🔧 Model requested ${toolCalls.length} tool call(s)`);

      // Add assistant message with tool_calls to conversation
      messages.push({
        role: 'assistant',
        content: result.content || null,
        tool_calls: toolCalls
      });

      // Execute each tool call and add results to messages
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name || toolCall.name;
        let params;
        try {
          params = typeof toolCall.function?.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : (toolCall.function?.arguments || toolCall.arguments || {});
        } catch (parseErr) {
          params = {};
        }

        console.log(`      🛠  Executing tool: ${toolName}`, params);
        const toolResult = await toolManager.executor.execute(toolName, params);
        console.log(`      ${toolResult.success ? '✅' : '❌'} ${toolName} (${toolResult.execution_time_ms}ms)`);

        // Track all tool calls
        allToolCalls.push({
          tool_name: toolName,
          params,
          result: toolResult,
          iteration,
          execution_time_ms: toolResult.execution_time_ms
        });

        // Add tool result message to conversation
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id || `call_${allToolCalls.length}`,
          name: toolName,
          content: JSON.stringify(toolResult)
        });
      }

      // Continue loop for next iteration
      continue;
    }

    // Unexpected finish_reason
    console.warn(`   ⚠️  Unexpected finish_reason: "${finishReason}" - returning partial response`);
    return {
      content: result.content || '',
      toolCalls: allToolCalls,
      max_iterations_reached: false
    };
  }

  // Max iterations reached
  console.warn(`   ⚠️  Max tool iterations (${maxIterations}) reached`);
  return {
    content: `I reached the maximum number of tool calling iterations (${maxIterations}). Here is what I found so far based on the tool results.`,
    toolCalls: allToolCalls,
    max_iterations_reached: true
  };
}


/**
 * Generate final response using LLM
 *
 * @param {Object} profile - The profile object from previous phases
 * @param {Object} responseRule - The matched response rule
 * @param {Object} aiProviders - Map of AI provider instances
 * @param {string} userMessage - The user's message/question
 * @param {Array} previousMessages - Previous conversation messages
 * @param {Object} [toolManager] - Optional ToolManager instance for tool calling
 * @returns {Promise<Object>} Object with { content, service, model, toolCalls?, max_iterations_reached? }
 */
async function generateResponse(profile, responseRule, aiProviders, userMessage, previousMessages, toolManager) {
  console.log(`\n💬 Generating response...`);

  // Get LLM provider
  const providerName = responseRule.llm;
  const provider = aiProviders[providerName];

  if (!provider) {
    throw new Error(`AI provider not found: ${providerName}`);
  }

  console.log(`   🤖 Using LLM: ${providerName} / ${responseRule.model}`);

  // Substitute variables in prompt (this becomes the system message)
  const systemPrompt = substituteVariables(responseRule.prompt, profile);
  console.log(`   📝 System prompt length: ${systemPrompt.length} characters`);
  console.log(`   📝 System prompt: ${systemPrompt}`);

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

  // Prepare options
  const options = {
    max_tokens: responseRule.max_tokens || 500
  };

  // Phase 6b: Tool calling path
  const toolsEnabled = toolManager &&
    toolManager.isEnabled() &&
    responseRule.tools?.enabled === true;

  if (toolsEnabled) {
    console.log(`   🔧 Tool calling enabled for this handler`);
    try {
      const toolResult = await _generateWithTools(provider, responseRule, messages, options, toolManager);
      console.log(`   ✅ Response generated with tools (${toolResult.content.length} characters, ${toolResult.toolCalls.length} tool calls)`);
      return {
        content: toolResult.content,
        service: providerName,
        model: responseRule.model,
        toolCalls: toolResult.toolCalls,
        max_iterations_reached: toolResult.max_iterations_reached
      };
    } catch (error) {
      console.error(`   ❌ Error in tool calling loop:`, error.message);
      throw error;
    }
  }

  // Standard path (no tools)
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
  generateResponse,
  _generateWithTools,
  substituteVariables
};
