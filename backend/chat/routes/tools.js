'use strict';

const express = require('express');
const { generateResponse } = require('../lib/response-generator');
const ModelValidationTracker = require('../models/validation-tracker');
const { registry: aiRegistry } = require('../ai-providers/providers');
const BUILTINS_MANIFEST = require('../tools/builtins-manifest');
const ToolManager = require('../tools/manager');

// Build manifest lookup for fast inline-mode resolution
const MANIFEST_BY_NAME = new Map(BUILTINS_MANIFEST.map(t => [t.name, t]));

// Shared validation tracker instance (persists across requests)
const validationTracker = new ModelValidationTracker();

/**
 * Create tools router.
 *
 * Endpoints:
 *   GET  /api/tools/list        - List all active (configured) tools
 *   GET  /api/tools/available   - List all available builtin tools from manifest
 *   POST /api/tools/test        - Test tool calling (named-provider or inline mode)
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
   * Returns all active (configured) tool definitions.
   */
  router.get('/list', (req, res) => {
    const toolManager = getToolManager();

    if (!toolManager) {
      return res.json({ tools: [], count: 0, message: 'Tool manager not initialized' });
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
      apply_globally: toolManager.isGlobal(),
      max_iterations: toolManager.getMaxIterations()
    });
  });

  /**
   * GET /api/tools/available
   * Returns all builtin tools from the manifest, regardless of configuration.
   * Always returns HTTP 200, even in zero-config mode.
   */
  router.get('/available', (req, res) => {
    const tools = BUILTINS_MANIFEST.map(t => ({
      name: t.name,
      description: t.description,
      type: t.type,
      parameters: t.parameters
    }));

    return res.json({ tools, count: tools.length });
  });

  /**
   * POST /api/tools/test
   * Test tool calling with a specific model and query.
   *
   * Inline mode (works against working config, no apply needed):
   *   Body: { provider_config, model, query, registry? }
   *   - provider_config: full LLM provider config object
   *   - registry: array of { name, description? } entries (defaults to all manifest tools if omitted)
   *
   * Named-provider mode (uses registered providers):
   *   Body: { llm, model, query }
   *   - llm: LLM provider name from applied config
   */
  router.post('/test', async (req, res) => {
    const { query, model, llm, provider_config, registry } = req.body;

    if (!query || !model) {
      return res.status(400).json({
        error: 'Missing required parameters: query, model'
      });
    }

    const isInlineMode = !!provider_config;

    // --- Inline mode ---
    if (isInlineMode) {
      if (!provider_config.provider) {
        return res.status(400).json({ error: 'provider_config must include a "provider" field' });
      }

      // Resolve registry entries against manifest
      const registryEntries = registry || [];
      const resolvedTools = [];
      for (const entry of registryEntries) {
        const manifestDef = MANIFEST_BY_NAME.get(entry.name);
        if (!manifestDef) {
          console.warn(`⚠️  tools/test inline: unknown builtin "${entry.name}", skipping`);
          continue;
        }
        const toolDef = { ...manifestDef };
        if (entry.description) toolDef.description = entry.description;
        resolvedTools.push(toolDef);
      }

      // Build a temporary tool manager from resolved tools
      const inlineToolsConfig = {
        max_iterations: 5,
        registry: resolvedTools.map(t => ({ name: t.name, description: t.description }))
      };

      // We need a full ToolManager with the resolved tools loaded
      // Build it directly by registering tools manually
      const tempToolManager = new ToolManager(inlineToolsConfig);
      for (const toolDef of resolvedTools) {
        try {
          tempToolManager.registry.register(toolDef);
        } catch (err) {
          console.warn(`⚠️  tools/test inline: failed to register "${toolDef.name}": ${err.message}`);
        }
      }
      // Override isEnabled to always return true for test
      tempToolManager.isEnabled = () => true;

      // Instantiate temporary provider
      let tempProvider;
      try {
        tempProvider = aiRegistry.createProvider(provider_config.provider, provider_config);
      } catch (err) {
        return res.status(400).json({ error: `Failed to create provider: ${err.message}` });
      }

      const tempProviders = { [provider_config.provider]: tempProvider };
      const providerName = provider_config.provider;

      const testResponseRule = {
        llm: providerName,
        model,
        prompt: 'You are a helpful assistant with access to tools. Use them when appropriate to answer accurately.',
        max_tokens: 1000,
        tools: {
          enabled: true,
          allowed_tools: [],
          max_iterations: tempToolManager.getMaxIterations()
        }
      };

      const modelKey = `${providerName}/${model}`;

      try {
        const result = await generateResponse(
          {},
          testResponseRule,
          tempProviders,
          query,
          [],
          tempToolManager
        );

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
        console.error('Tool test error (inline):', error.message);
        validationTracker.recordFailure(modelKey, error);

        const statusCode = error.response?.status;
        const providerMessage = error.response?.data?.error || error.response?.data?.message;
        let userMessage;
        if (statusCode === 400) {
          userMessage = `Model "${model}" rejected the request (HTTP 400). This usually means the model does not support tool/function calling.${providerMessage ? ` Provider said: ${providerMessage}` : ''}`;
        } else if (statusCode === 404) {
          userMessage = `Model "${model}" was not found on provider "${providerName}". Check the model name is correct.`;
        } else {
          userMessage = providerMessage || error.message;
        }

        return res.status(500).json({
          error: userMessage,
          model,
          llm: providerName,
          validation: validationTracker.getStatus(modelKey)
        });
      }
    }

    // --- Named-provider mode ---
    if (!llm) {
      return res.status(400).json({
        error: 'Missing required parameters: query, model, llm (or use provider_config for inline mode)'
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

    const testResponseRule = {
      llm,
      model,
      prompt: 'You are a helpful assistant with access to tools. Use them when appropriate to answer accurately.',
      max_tokens: 1000,
      tools: {
        enabled: true,
        allowed_tools: [],
        max_iterations: toolManager.getMaxIterations()
      }
    };

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
      validationTracker.recordFailure(modelKey, error);

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
