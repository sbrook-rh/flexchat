const express = require('express');
const router = express.Router();
const { identifyTopic } = require('../lib/topic-detector');
const { collectRagResults } = require('../lib/rag-collector');
const { buildProfile } = require('../lib/profile-builder');
const { detectIntent } = require('../lib/intent-detector');
const { findResponseHandler } = require('../lib/response-matcher');
const { generateResponse } = require('../lib/response-generator');

/**
 * Create chat router with dependency injection
 * @param {Object} config - Server configuration
 * @param {Object} aiProviders - AI provider instances
 * @param {Object} ragProviders - RAG provider instances
 * @returns {express.Router} Configured chat router
 */
function createChatRouter(config, aiProviders, ragProviders) {
  /**
   * Main chat endpoint
   * POST /chat/api
   */
  router.post('/api', async (req, res) => {
    try {
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
      const topic = await identifyTopic(userMessage, previousMessages, currentTopic, config.intent, aiProviders);
      // const { topic, status } = await identifyTopic(...); // future enhancement
      // if (status === 'new_topic') clearRagCache();

      const normalizedTopic = topic.replace(/\s+/g, ' ').trim().toLowerCase();

      // Phase 2: RAG collection
      const rag = await collectRagResults(
        normalizedTopic,
        selectedCollections,
        config.rag_services || {},
        ragProviders
      );

      // Phase 3: Intent detection (with inline refinement on 'other' + partials)
      const intent = await detectIntent(topic, rag, config.intent, aiProviders);

      // Phase 4: Build profile
      const profile = buildProfile(topic, rag, intent);

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
