const express = require('express');
const router = express.Router();
const ProviderDiscovery = require('../ai-providers/discovery');
const { ConnectionTester, EnvVarManager } = require('../ai-providers/services');
const { normalizeConnectionPayload } = require('../lib/connection-payload');
const { identifyTopic } = require('../lib/topic-detector');

/**
 * GET /api/connections/providers
 * List all available providers grouped by type
 */
router.get('/providers', (req, res) => {
  try {
    const providers = ProviderDiscovery.listProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error listing providers:', error);
    res.status(500).json({
      error: 'Failed to list providers',
      message: error.message
    });
  }
});

/**
 * GET /api/connections/providers/:id/schema
 * Get configuration schema for a specific provider
 */
router.get('/providers/:id/schema', (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // Optional type hint

    const provider = ProviderDiscovery.getProvider(id, type);
    
    if (!provider) {
      return res.status(404).json({
        error: 'Provider not found',
        message: `Provider '${id}' not found`
      });
    }

    res.json(provider.schema);
  } catch (error) {
    console.error(`Error getting schema for provider ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get provider schema',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/providers/:id/models
 * Discover available models from a provider
 * 
 * Request body:
 * {
 *   "config": { ... provider configuration with ${ENV_VAR} placeholders ... }
 * }
 */
router.post('/providers/:id/models', async (req, res) => {
  try {
    const { provider: id, processedConfig, type } = normalizeConnectionPayload(req);

    // Dynamically load the provider class
    const ProviderClass = loadProviderClass(type || 'llm', id);
    
    // Create temporary instance (not added to global aiProviders)
    const tempProvider = new ProviderClass(processedConfig);
    
    // Discover models
    const models = await tempProvider.listModels();
    
    // Return sanitized model list
    res.json({
      provider: id,
      count: models.length,
      models: models.map(m => ({
        id: m.id,
        name: m.name || m.id,
        type: m.type,
        capabilities: m.capabilities || [],
        maxTokens: m.maxTokens,
        description: m.description
      }))
    });
  } catch (error) {
    console.error(`Error discovering models for provider ${req.params.id}:`, error);
    res.status(400).json({
      error: 'Model discovery failed',
      message: error.message,
      provider: req.params.id
    });
  }
});

/**
 * Helper function to load provider class dynamically
 */
function loadProviderClass(type, providerId) {
  // Convert provider ID to class file name
  // 'openai' -> 'OpenAIProvider'
  const parts = providerId.split(/[-_]/);
  const className = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const filename = `${className}Provider`;
  
  if (type === 'llm') {
    return require(`../ai-providers/providers/${filename}`);
  } else if (type === 'rag') {
    return require(`../retrieval-providers/${filename}`);
  } else {
    throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * POST /api/connections/test
 * Test a provider connection
 * 
 * Request body:
 * {
 *   "type": "llm" | "rag",
 *   "provider": "openai" | "ollama" | etc.,
 *   "config": { ... provider configuration ... }
 * }
 */
router.post('/test', async (req, res) => {
  try {
    const { type, provider, processedConfig } = normalizeConnectionPayload(req);

    if (!['llm', 'rag'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid provider type',
        message: 'Type must be either "llm" or "rag"'
      });
    }

    // Test the connection
    const result = await ConnectionTester.testConnection(type, provider, processedConfig);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/llm/test
 * Test an LLM provider connection (dedicated endpoint, no type switching)
 * 
 * Request body:
 * {
 *   "provider": "openai" | "ollama" | etc.,
 *   "config": { ... provider configuration ... }
 * }
 */
router.post('/llm/test', async (req, res) => {
  try {
    const { provider, processedConfig } = normalizeConnectionPayload(req, 'llm');

    // Test the LLM connection
    const result = await ConnectionTester.testConnection('llm', provider, processedConfig);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error testing LLM connection:', error);
    res.status(500).json({
      error: 'LLM connection test failed',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/llm/discovery/models
 * Discover available models from an LLM provider configuration
 * 
 * Request body:
 * {
 *   "provider": "openai" | "ollama" | "gemini",
 *   "config": { ... provider configuration with ${ENV_VAR} placeholders ... }
 * }
 */
router.post('/llm/discovery/models', async (req, res) => {
  try {
    const { provider, processedConfig } = normalizeConnectionPayload(req, 'llm');

    // Dynamically load the LLM provider class
    const ProviderClass = loadProviderClass('llm', provider);
    
    // Create temporary instance (not added to global aiProviders)
    const tempProvider = new ProviderClass(processedConfig);
    
    // Discover models
    const models = await tempProvider.listModels();
    
    // Return sanitized model list
    res.json({
      provider,
      count: models.length,
      models: models.map(m => ({
        id: m.id,
        name: m.name || m.id,
        type: m.type,
        capabilities: m.capabilities || [],
        maxTokens: m.maxTokens,
        description: m.description
      }))
    });
  } catch (error) {
    console.error(`Error discovering models for LLM provider:`, error);
    res.status(400).json({
      error: 'LLM model discovery failed',
      message: error.message,
      provider: req.body?.provider || 'unknown'
    });
  }
});

/**
 * POST /api/connections/rag/test
 * Test a RAG service connection (dedicated endpoint, no type switching)
 * 
 * Request body:
 * {
 *   "provider": "chromadb-wrapper" | etc.,
 *   "config": { ... provider configuration ... }
 * }
 */
router.post('/rag/test', async (req, res) => {
  try {
    const { provider, processedConfig } = normalizeConnectionPayload(req, 'rag');

    // Test the RAG connection
    const result = await ConnectionTester.testConnection('rag', provider, processedConfig);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error testing RAG connection:', error);
    res.status(500).json({
      error: 'RAG connection test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/connections/env-vars
 * List available environment variables (filtered and masked)
 */
router.get('/env-vars', (req, res) => {
  try {
    const maskValues = req.query.mask !== 'false'; // Default to true
    const envVars = EnvVarManager.listAvailableEnvVars(maskValues);
    
    res.json({
      variables: envVars,
      count: envVars.length
    });
  } catch (error) {
    console.error('Error listing env vars:', error);
    res.status(500).json({
      error: 'Failed to list environment variables',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/env-vars/validate
 * Validate environment variable references in a configuration
 * 
 * Request body:
 * {
 *   "config": { ... configuration with ${VAR} references ... }
 * }
 */
router.post('/env-vars/validate', (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request must include config object'
      });
    }

    const validation = EnvVarManager.validateConfigReferences(config);
    res.json(validation);
  } catch (error) {
    console.error('Error validating env vars:', error);
    res.status(500).json({
      error: 'Failed to validate environment variables',
      message: error.message
    });
  }
});

/**
 * GET /api/connections/env-vars/suggestions
 * Get environment variable suggestions for a provider field
 */
router.get('/env-vars/suggestions', (req, res) => {
  try {
    const { provider, field } = req.query;

    if (!provider || !field) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request must include provider and field query parameters'
      });
    }

    const suggestions = EnvVarManager.getSuggestions(provider, field);
    res.json({
      provider,
      field,
      suggestions
    });
  } catch (error) {
    console.error('Error getting env var suggestions:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * POST /api/connections/intent/test
 * Test intent detection with a query
 * Uses the same pattern as other test endpoints - receives connection config in payload
 * 
 * Body:
 * {
 *   query: string,
 *   provider_config: { provider, ...fields },
 *   model: string
 * }
 */
router.post('/intent/test', async (req, res) => {
  try {
    const { query, provider_config, model } = req.body;

    if (!query || !provider_config || !model) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['query', 'provider_config', 'model']
      });
    }

    // Use the same normalization pattern as other test endpoints
    const normalizedPayload = {
      body: {
        provider: provider_config.provider,
        config: provider_config
      }
    };
    
    const { provider, processedConfig } = normalizeConnectionPayload(normalizedPayload, 'llm');

    // Dynamically load the LLM provider class (same as model discovery)
    const ProviderClass = loadProviderClass('llm', provider);
    
    // Create temporary instance
    const tempProvider = new ProviderClass(processedConfig);

    // Get current working config to extract configured intents
    const workingConfig = req.body.working_config || {};
    
    // Build categories from configured intents
    const categories = [];
    if (workingConfig.intent && workingConfig.intent.detection) {
      for (const [name, description] of Object.entries(workingConfig.intent.detection)) {
        categories.push({ name, description });
      }
    }

    // Add selected RAG collections (from applied config)
    // User can optionally include collections from the applied configuration
    const selectedCollections = req.body.selected_collections || [];
    for (const col of selectedCollections) {
      categories.push({
        name: `${col.service}/${col.name}`,
        description: col.metadata?.description || 'No description available'
      });
    }

    if (categories.length === 0) {
      return res.status(400).json({
        error: 'No intents or RAG collections configured'
      });
    }

    // Build the classification prompt (Option 4: Concise Instruction-First)
    const categoriesText = categories.map(c => `• ${c.name}: ${c.description || ''}`).join('\n');
    const prompt = `Task: Select the matching category.

Query: "${query}"

Categories:
${categoriesText}
• other: Query doesn't fit any category

Reply with one category name only.`;

    console.log(`🧪 Testing intent detection for query: "${query}"`);
    console.log(`   Categories: ${categories.length} (${categories.map(c => c.name).join(', ')})`);

    // Call the LLM
    const messages = [{ role: 'user', content: prompt }];
    const response = await tempProvider.generateChat(messages, model, {
      max_tokens: 50,
      temperature: 0.1  // Low temperature for deterministic classification
    });

    const detectedIntent = response.content.trim();
    
    console.log(`  📥 Raw model response: "${response.content}"`);
    console.log(`  ✅ Detected intent: "${detectedIntent}"`);

    res.json({
      query,
      detected_intent: detectedIntent,
      available_intents: categories.map(c => c.name),
      intent_count: Object.keys(workingConfig.intent?.detection || {}).length,
      collection_count: selectedCollections.length,
      provider,
      model,
      prompt_used: prompt
    });

  } catch (error) {
    console.error('Error testing intent detection:', error);
    res.status(500).json({
      error: 'Intent detection test failed',
      message: error.message
    });
  }
});

/**
 * Test topic detection with conversation evolution
 * POST /api/connections/topic/test
 * 
 * Body: {
 *   provider_config: { provider, baseUrl, apiKey, ... },
 *   model: string,
 *   messages: [{ type: 'user'|'bot', text: string }]  // Full conversation history
 * }
 * 
 * Returns: {
 *   evolution: [{
 *     messageIndex: number,
 *     userMessage: string,
 *     detectedTopic: string,
 *     topicStatus: 'continuation'|'new_topic'
 *   }],
 *   provider: string,
 *   model: string
 * }
 */
router.post('/topic/test', async (req, res) => {
  try {
    const { provider_config, model, messages, custom_prompt } = req.body;

    // Validation
    if (!provider_config || !model) {
      return res.status(400).json({
        error: 'Missing required fields: provider_config, model'
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'messages must be a non-empty array'
      });
    }

    console.log(`🧪 Testing topic detection evolution`);
    console.log(`   Provider/Model: ${provider_config.provider} / ${model}`);
    console.log(`   Message count: ${messages.length}`);
    if (custom_prompt) {
      console.log(`   Using custom prompt (${custom_prompt.length} chars)`);
    }

    // Normalize and create temporary provider instance
    const normalizedPayload = {
      body: {
        provider: provider_config.provider,
        config: provider_config
      }
    };

    const { provider, processedConfig } = normalizeConnectionPayload(normalizedPayload, 'llm');
    const ProviderClass = loadProviderClass('llm', provider);
    const tempProvider = new ProviderClass(processedConfig);

    // Create mock aiProviders map with temporary provider
    const mockProviders = {
      [provider]: tempProvider
    };

    // Create llmConfig for identifyTopic (include custom prompt if provided)
    const llmConfig = {
      llm: provider,
      model: model,
      prompt: custom_prompt // Optional custom prompt for testing
    };

    // Process messages incrementally to show topic evolution
    const evolution = [];
    let currentTopic = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Only process user messages for topic detection
      if (msg.type !== 'user') continue;

      // Build history up to this point
      const previousMessages = messages.slice(0, i);
      
      // Use the actual identifyTopic function (same as production)
      const { topic, status, parent_topic } = await identifyTopic(
        msg.text,
        previousMessages,
        currentTopic,
        llmConfig,
        mockProviders
      );

      // Update current topic
      currentTopic = topic;

      // Record evolution step
      evolution.push({
        messageIndex: i,
        userMessage: msg.text.length > 100 ? msg.text.slice(0, 100) + '...' : msg.text,
        detectedTopic: topic,
        parentTopic: parent_topic,
        topicStatus: status
      });

      console.log(`   [${i}] ${status}: "${topic}"`);
    }

    res.json({
      evolution,
      provider,
      model,
      messageCount: messages.length,
      userMessageCount: messages.filter(m => m.type === 'user').length
    });

  } catch (error) {
    console.error('Error testing topic detection:', error);
    res.status(500).json({
      error: 'Topic detection test failed',
      message: error.message
    });
  }
});

module.exports = router;

