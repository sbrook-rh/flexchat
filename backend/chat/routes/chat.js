const express = require('express');
const router = express.Router();
const { identifyTopic } = require('../lib/topic-detector');
const { collectRagResults } = require('../lib/rag-collector');
const { buildProfile } = require('../lib/profile-builder');
const { detectIntent } = require('../lib/intent-detector');
const { findResponseHandler } = require('../lib/response-matcher');
const { generateResponse } = require('../lib/response-generator');

/**
 * Resolve LLM configuration for topic detection with cascading fallback
 * @param {Object} config - Full configuration object
 * @returns {Object|null} Object with { llm, model, prompt? } or null if no config found
 */
function resolveTopicLLMConfig(config) {
  // Priority 1: Explicit topic configuration
  if (config.topic?.provider?.llm && config.topic?.provider?.model) {
    return { 
      llm: config.topic.provider.llm, 
      model: config.topic.provider.model,
      prompt: config.topic.prompt // Optional custom prompt
    };
  }
  
  // Priority 2: Intent detection configuration
  if (config.intent?.provider?.llm && config.intent?.provider?.model) {
    return { llm: config.intent.provider.llm, model: config.intent.provider.model };
  }
  
  // Priority 3: Default/fallback response handler (first one with no match criteria)
  const defaultHandler = config.responses?.find(handler => !handler.match);
  if (defaultHandler?.llm && defaultHandler?.model) {
    return { llm: defaultHandler.llm, model: defaultHandler.model };
  }
  
  return null; // No valid config found
}

/**
 * Create chat router with dependency injection
 * @param {Function} getConfig - Getter for current config (always up-to-date)
 * @param {Function} getProviders - Getter for current providers (always up-to-date)
 * @returns {express.Router} Configured chat router
 */
function createChatRouter(getConfig, getProviders) {
  /**
   * Main chat endpoint
   * POST /chat/api
   */
  router.post('/api', async (req, res) => {
    try {
      // Get current state via getters (always up-to-date after hot-reload)
      const config = getConfig();
      const { aiProviders, ragProviders } = getProviders();
      
      const userMessage = req.body.prompt;
      const selectedCollections = req.body.selectedCollections || [];
      const previousMessages = req.body.previousMessages || [];
      const currentTopic = req.body.topic; 
      
      // Validate request
      if (!userMessage || typeof userMessage !== 'string') {
        return res.status(400).json({
          error: 'Invalid request: prompt is required and must be a string'
        });
      }

      console.log(`\n📨 Received chat request:`);
      console.log(`   Message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
      console.log(`   Selected collections: ${JSON.stringify(selectedCollections)}`);
      console.log(`   Latest topic: ${currentTopic}`);
      // console.log(`   previous Messages: ${JSON.stringify(previousMessages)}`);

      // Phase 1: Topic detection
      const topicLLMConfig = resolveTopicLLMConfig(config);
      const { topic, status } = await identifyTopic(userMessage, previousMessages, currentTopic, topicLLMConfig, aiProviders);
      // Future: if (status === 'new_topic') clearRagCache();

      const normalizedTopic = topic.replace(/\s+/g, ' ').trim().toLowerCase();

      // Phase 2: RAG collection
      const rag = await collectRagResults(
        userMessage,
        normalizedTopic,
        currentTopic,
        selectedCollections,
        config.rag_services || {},
        ragProviders,
        config  // Pass full config for embedding generation
      );

      // Phase 3: Intent detection (with inline refinement on 'other' + partials)
      const intent = await detectIntent(topic, rag, config.intent, aiProviders);

      // Phase 4: Build profile
      const profile = buildProfile(topic, rag, intent);
      // console.log(`🔍 Profile: ${JSON.stringify(profile)}`);

      // Phase 5: Match response rule
      const responseHandler = findResponseHandler(profile, config.responses);
      
      // Phase 6: Generate response
      const responseData = await generateResponse(profile, responseHandler, aiProviders, userMessage, previousMessages);

      res.json({
        response: responseData.content,
        status: 'success',
        topic,
        service: responseData.service,
        model: responseData.model
      });

    } catch (error) {
      console.error('❌ Error handling chat request:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = { createChatRouter };
