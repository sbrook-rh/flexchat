/**
 * Topic Detector - Phase 1 of request flow
 *
 * Discerns latest topic from recent user requests
 */

/**
 * Default topic detection prompt - optimized for small models
 */
const DEFAULT_TOPIC_PROMPT = `You are a topic-detection assistant.

Your job:
- Identify the main topic of the conversation based on recent exchanges.
- The latest message may continue the same topic, ask a related follow-up, or change to a new subject.
- If it's related, slightly refine the topic where appropriate ; if it's new, describe the new topic clearly.
- If the current topic is none, and the Recent conversation is blank infer a clear starting topic from the latest message.
- If the user's new question is still about the same general domain or goal, treat it as a continuation with a broadened topic summary

Current known topic: "{{currentTopic}}"

Recent conversation:
{{conversationContext}}

Latest user message: "{{userMessage}}"

Reply ONLY with valid JSON. Use short noun phrases (3-8 words max), not full sentences:

{ "topic_status": "continuation" | "new_topic", "topic_summary": "short topic phrase here" }`.trim();

/**
 * Substitute template variables in prompt
 *
 * @param {string} template - Prompt template with {{placeholder}} syntax
 * @param {Object} variables - Object with variable values
 * @returns {string} Prompt with variables substituted
 */
function substitutePromptVariables(template, variables) {
  if (!template) {
    return '';
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();

    // Handle special defaults
    if (trimmed === 'currentTopic') {
      return variables.currentTopic || 'none';
    }

    // Handle other variables
    const value = variables[trimmed];

    // Return value if found, otherwise keep placeholder
    return value !== undefined ? value : match;
  });
}

/**
 * Identify the current topic of conversation.
 *
 * @param {string} userMessage - The latest user message.
 * @param {Array<Object>} previousMessages - Full ordered conversation history [{ type: 'user' | 'bot', text: string }]
 * @param {string} currentTopic - Previously detected topic summary.
 * @param {Object} llmConfig - LLM configuration object with { llm, model, prompt? } properties.
 * @param {Object} aiProviders - Map of AI provider instances.
 * @returns {Promise<{topic: string, status: string}>} Object with topic summary and status ('continuation' | 'new_topic')
 */
async function identifyTopic(userMessage, previousMessages, currentTopic, llmConfig, aiProviders) {
  console.log(`\n🔎 Topic Detection: Identifying conversation topic from latest user message: "${userMessage}"`);

  // ---- Sanity checks -------------------------------------------------------
  const providerName = llmConfig?.llm;
  const modelName = llmConfig?.model;
  const provider = aiProviders?.[providerName];

  if (!provider) {
    console.warn(`⚠️ No AI provider found (${providerName}), using userMessage as fallback`);
    return { topic: userMessage, status: 'new_topic' };
  }

  // ---- Build context -------------------------------------------------------
  function buildContextFromMessages(messages, currentTopic) {
    const maxTurns = 6; // last ~6 turns total
    const sliced = messages.slice(-maxTurns);
    const contextLines = [];

    for (const msg of sliced) {
      if (msg.type === "user") {
        contextLines.push(`User: ${msg.text}`);
      } else if (msg.type === "bot") {
        if (!msg.text) continue;

        if (msg.text.length > 400) {
          // Compress long assistant messages
          const about = msg.topic || "a previous topic";
          contextLines.push(
            `Assistant: (summary) provided a detailed answer about ${about}.`
          );
        } else {
          // Keep shorter assistant replies verbatim
          contextLines.push(`Assistant: ${msg.text}`);
        }
      }
    }

    return contextLines.join("\n");
  }

  const conversationContext = buildContextFromMessages(previousMessages, currentTopic);

  // ---- Construct prompt ----------------------------------------------------
  const customPrompt = llmConfig?.prompt;
  const promptTemplate = customPrompt || DEFAULT_TOPIC_PROMPT;

  const prompt = substitutePromptVariables(promptTemplate, {
    currentTopic: currentTopic || '',
    conversationContext,
    userMessage
  });

  // console.log(`🧾 Topic detection prompt:\n${prompt}\n`);

  // ---- Model call ----------------------------------------------------------
  try {
    const messages = [{ role: "user", content: prompt }];

    const response = await provider.generateChat(messages, modelName, {
      max_tokens: 200,
      temperature: 0.1
    });

    const raw = response.content.trim();
    console.log(`🧾 Topic detection raw response:\n${raw}\n`);
    const match = raw.match(/\{[\s\S]*\}/); // extract JSON if wrapped in text

    let parsed;
    try {
      parsed = match ? JSON.parse(match[0]) : { topic_status: "continuation", topic_summary: raw };
    } catch (parseErr) {
      console.warn(`⚠️ Failed to parse JSON response from topic detection`);
      console.warn(`   Model output: ${raw.slice(0, 200)}`);
      console.warn(`   This may indicate the model is too small or the prompt needs adjustment`);
      parsed = { topic_status: "continuation", topic_summary: raw };
    }

    // The model might return "topic" instead of "topic_summary"
    if (parsed.topic) {
      parsed.topic_summary = parsed.topic;
    }

    // Fallback for invalid/generic topics
    if (!parsed.topic_summary || /^(none|general|conversation)$/i.test(parsed.topic_summary)) {
      parsed.topic_summary = currentTopic || userMessage.slice(0, 40);
    }

    // First message is always a new topic
    if (!currentTopic || currentTopic.trim() === '') {
      parsed.topic_status = 'new_topic';
    }

    console.log(`✅ Topic: "${parsed.topic_summary}" (${parsed.topic_status})`);

    return {
      topic: parsed.topic_summary,
      status: parsed.topic_status,
      parent_topic: parsed.parent_topic
    };

  } catch (err) {
    console.error(`❌ Topic detection failed: ${err.message}`);
    return {
      topic: userMessage,
      status: 'new_topic'
    };
  }
}

module.exports = {
  identifyTopic,
  DEFAULT_TOPIC_PROMPT
};
