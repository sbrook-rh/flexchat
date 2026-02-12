'use strict';

const express = require('express');
const { generateResponse } = require('../lib/response-generator');
const ModelValidationTracker = require('../models/validation-tracker');

// Shared validation tracker instance (persists across requests)
const validationTracker = new ModelValidationTracker();

/**
 * Create tools router.
 *
 * Endpoints:
 *   GET  /api/tools/list        - List all registered tools
 *   POST /api/tools/test        - Test tool calling with a model
 *   GET  /api/tools/validation  - Get model validation statuses
 *
 * @param {Function} getToolManager - Getter for current ToolManager instance
 * @param {Function} getProviders   - Getter for { aiProviders } map
 * @returns {express.Router}
 */
function createToolsRouter(getToolManager, getProviders) {
  const router = express.Router();

  /**
   * GET /api/tools/list
   * Returns all registered tool definitions.
   */
  router.get('/list', (req, res) => {
    const toolManager = getToolManager();

    if (!toolManager) {
      return res.json({ tools: [], message: 'Tool manager not initialized (no tools config)' });
    }

    const tools = toolManager.registry.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      type: tool.type,
      parameters: tool.parameters
    }));

    return res.json({
      tools,
      count: tools.length,
      enabled: toolManager.isEnabled(),
      max_iterations: toolManager.getMaxIterations()
    });
  });

  /**
   * POST /api/tools/test
   * Test tool calling with a specific model and query.
   *
   * Request body: { query: string, model: string, llm: string }
   * - query: The user message to send
   * - model: Model identifier (e.g., 'gpt-4o')
   * - llm: LLM provider name from config (e.g., 'chatgpt')
   */
  router.post('/test', async (req, res) => {
    const { query, model, llm } = req.body;

    if (!query || !model || !llm) {
      return res.status(400).json({
        error: 'Missing required parameters: query, model, llm'
      });
    }

    const toolManager = getToolManager();
    if (!toolManager) {
      return res.status(400).json({
        error: 'Tool manager not initialized. Add a "tools" section to your config.'
      });
    }

    const { aiProviders } = getProviders();
    if (!aiProviders[llm]) {
      return res.status(400).json({
        error: `LLM provider "${llm}" not found. Available: ${Object.keys(aiProviders).join(', ')}`
      });
    }

    // Create a test response rule allowing all tools
    const testResponseRule = {
      llm,
      model,
      prompt: 'You are a helpful assistant with access to tools. Use them when appropriate to answer accurately.',
      max_tokens: 1000,
      tools: {
        enabled: true,
        allowed_tools: [], // Empty = all tools allowed
        max_iterations: toolManager.getMaxIterations()
      }
    };

    // Create a minimal test tool manager with enabled=true (test always runs tools)
    const testToolManager = Object.create(toolManager);
    testToolManager.isEnabled = () => true;

    const modelKey = `${llm}/${model}`;

    try {
      const result = await generateResponse(
        {},
        testResponseRule,
        aiProviders,
        query,
        [],
        testToolManager
      );

      // Record success in validation tracker
      validationTracker.recordSuccess(modelKey, {
        query,
        toolsUsed: (result.toolCalls || []).map(tc => tc.tool_name),
        iterationsUsed: (result.toolCalls || []).length
      });

      return res.json({
        content: result.content,
        model: result.model,
        service: result.service,
        tool_calls: result.toolCalls || [],
        max_iterations_reached: result.max_iterations_reached || false,
        validation: validationTracker.getStatus(modelKey)
      });
    } catch (error) {
      console.error('Tool test error:', error.message);

      // Record failure in validation tracker
      validationTracker.recordFailure(modelKey, error);

      // Extract more detail from axios errors
      const statusCode = error.response?.status;
      const providerMessage = error.response?.data?.error || error.response?.data?.message;

      let userMessage;
      if (statusCode === 400) {
        userMessage = `Model "${model}" rejected the request (HTTP 400). This usually means the model does not support tool/function calling.${providerMessage ? ` Provider said: ${providerMessage}` : ''}`;
      } else if (statusCode === 404) {
        userMessage = `Model "${model}" was not found on provider "${llm}". Check the model name is correct.`;
      } else {
        userMessage = providerMessage || error.message;
      }

      return res.status(500).json({
        error: userMessage,
        model,
        llm,
        validation: validationTracker.getStatus(modelKey)
      });
    }
  });

  /**
   * GET /api/tools/validation
   * Returns validation statuses for all tested models.
   */
  router.get('/validation', (req, res) => {
    const statuses = validationTracker.getAllStatuses();
    return res.json({ statuses });
  });

  return router;
}

module.exports = { createToolsRouter };
