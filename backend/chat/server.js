const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { AIService } = require('./ai-providers');
const { RetrievalService } = require('./retrieval-providers');

const app = express();
app.use(bodyParser.json());

// Global services
let config = null;
let aiService = null;
let retrievalService = null;

/**
 * Load and parse configuration file
 */
function loadConfiguration() {
  const configPath = process.env.CHAT_CONFIG_PATH || path.join(__dirname, '../../config/config.json');
  
  console.log(`📝 Loading configuration from: ${configPath}`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace environment variables in config
  const processedContent = configContent.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
  
  return JSON.parse(processedContent);
}

/**
 * Initialize AI providers from configuration
 */
async function initializeAIProviders(config) {
  console.log('🤖 Initializing AI providers...');
  
  aiService = new AIService();
  
  // Initialize all configured providers
  for (const [name, providerConfig] of Object.entries(config.providers || {})) {
    try {
      await aiService.setActiveProvider(name, providerConfig);
      console.log(`   ✅ Initialized AI provider: ${name}`);
    } catch (error) {
      console.error(`   ❌ Failed to initialize provider ${name}:`, error.message);
    }
  }
  
  // Set detection provider as active if specified
  if (config.detection_provider) {
    const detectionProviderName = config.detection_provider.provider;
    await aiService.setActiveProvider(detectionProviderName);
    console.log(`   🎯 Set detection provider: ${detectionProviderName}`);
  }
}

/**
 * Initialize retrieval/knowledge bases from configuration
 */
async function initializeKnowledgeBases(config) {
  console.log('📚 Initializing knowledge bases...');
  
  retrievalService = new RetrievalService(aiService);
  
  if (config.knowledge_bases) {
    // Pass both knowledge bases and providers config for embedding resolution
    await retrievalService.initializeKnowledgeBases(config.knowledge_bases, config.providers);
  } else {
    console.log('   ℹ️  No knowledge bases configured');
  }
}

/**
 * Detect strategy using RAG (knowledge base queries)
 * 
 * Queries RAG strategies IN ORDER until one passes the lower threshold.
 * Collects "candidates" that are between lower and upper thresholds for LLM fallback.
 */
async function detectStrategyWithRAG(strategies, userQuery, skipKnowledgeBases = new Set()) {
  const candidates = [];
  
  // Query each RAG strategy in order
  for (const strategy of strategies) {
    if (strategy.detection.type === 'rag') {
      const knowledgeBase = strategy.detection.knowledge_base;
      
      // Skip if this knowledge base was already checked via selected collections
      if (skipKnowledgeBases.has(knowledgeBase)) {
        console.log(`   ⏭️  Skipping ${knowledgeBase} (already checked via selected collections)`);
        continue;
      }
      
      const lowerThreshold = strategy.detection.threshold;
      const upperThreshold = strategy.detection.fallback_threshold;
      
      console.log(`   🔍 Querying knowledge base: ${knowledgeBase}`);
      
      try {
        const results = await retrievalService.query(knowledgeBase, userQuery, { top_k: 3 });
        
        if (results.length > 0) {
          const minDistance = Math.min(...results.map(r => r.distance));
          console.log(`      📊 Min distance: ${minDistance.toFixed(4)} (threshold: ${lowerThreshold}${upperThreshold ? `, fallback: ${upperThreshold}` : ''})`);
          
          // Check if lower threshold met - IMMEDIATE MATCH
          if (minDistance < lowerThreshold) {
            console.log(`      ✅ Strategy detected: ${strategy.name}`);
            return {
              matched: true,
              strategy: strategy,
              context: results.map(r => r.text),
              ragResults: results
            };
          }
          
          // Check if within fallback threshold - CANDIDATE for LLM detection
          if (upperThreshold && minDistance < upperThreshold) {
            console.log(`      📋 Added to candidates: ${strategy.name}`);
            candidates.push({
              strategy: strategy,
              distance: minDistance,
              results: results
            });
          } else {
            console.log(`      ❌ No match: ${strategy.name}`);
          }
        }
      } catch (error) {
        console.error(`      ❌ Error querying ${knowledgeBase}:`, error.message);
      }
    }
  }
  
  return { matched: false, candidates };
}

/**
 * Detect strategy using LLM
 * 
 * @param {Array} candidates - RAG strategies that are within fallback threshold (with their results)
 */
async function detectStrategyWithLLM(strategies, userQuery, chatHistory, candidates = []) {
  // Build intent detection prompt
  const intentDescriptions = [];
  const strategyNames = [];
  
  // Add RAG candidates (these already passed the fallback threshold check)
  for (const candidate of candidates) {
    const strategy = candidate.strategy;
    // For candidates, description may be stored directly in candidate object
    const description = candidate.description || 
                       (strategy.detection && strategy.detection.description) || 
                       `if the query is about ${strategy.name}`;
    intentDescriptions.push(`- "${strategy.name}" ${description}`);
    strategyNames.push(strategy.name);
  }
  
  // Add LLM strategies
  for (const strategy of strategies) {
    if (strategy.detection.type === 'llm') {
      const description = strategy.detection.description || `if the query is about ${strategy.name}`;
      intentDescriptions.push(`- "${strategy.name}" ${description}`);
      strategyNames.push(strategy.name);
    }
  }
  
  // Find default strategy
  const defaultStrategy = strategies.find(s => s.detection.type === 'default');
  if (defaultStrategy) {
    intentDescriptions.push(`- "${defaultStrategy.name}" for anything else`);
    strategyNames.push(defaultStrategy.name);
  }
  
  if (intentDescriptions.length === 0) {
    console.log('   ℹ️  No strategies available for LLM detection');
    return null;
  }
  
  // Skip LLM detection if only default strategy exists
  if (intentDescriptions.length === 1 && defaultStrategy) {
    console.log('   ℹ️  Only default strategy available, skipping LLM detection');
    return null;
  }
  
  // Build prompt
  const intentNamesStr = strategyNames.join('", "');
  const historyText = chatHistory.map(m => `${m.type}: ${m.text}`).join('\n');
  
  const intentPrompt = `You are an intent classifier for a chatbot.

Classify the user's query into one of these categories:
${intentDescriptions.join('\n')}

Previous conversation history:
${historyText}

Query: ${userQuery}
Answer with only one word: "${intentNamesStr}".`;

  console.log('   🤖 Calling LLM for intent detection...');
  
  try {
    // Use detection provider
    const detectionProvider = config.detection_provider.provider;
    const detectionModel = config.detection_provider.model;
    
    await aiService.setActiveProvider(detectionProvider);
    
    const response = await aiService.generateChat(
      [{ role: 'system', content: intentPrompt }],
      { model: detectionModel, max_tokens: 10 }
    );
    
    const detectedIntent = response.content.trim().toUpperCase();
    console.log(`   🎯 LLM detected: ${detectedIntent}`);
    
    // Find the strategy
    const strategy = strategies.find(s => s.name === detectedIntent);
    if (strategy) {
      // Check if this was a RAG candidate with stored context
      const candidate = candidates.find(c => c.strategy.name === strategy.name);
      if (candidate) {
        console.log(`   📚 Using RAG context from candidate: ${strategy.name}`);
        return {
          strategy: strategy,
          context: candidate.results.map(r => r.text),
          ragResults: candidate.results
        };
      }
      
      return { strategy: strategy };
    }
    
  } catch (error) {
    console.error('   ❌ Error in LLM detection:', error.message);
  }
  
  return null;
}

/**
 * Detect strategy using selected collections
 */
async function detectStrategyWithDynamicCollections(selectedCollections, userQuery) {
  console.log('   🔍 Trying selected collections...');
  
  // Query each selected collection
  for (const selCollection of selectedCollections) {
    const { knowledgeBase, collection: collectionName } = selCollection;
    console.log(`      Checking ${knowledgeBase}/${collectionName}`);
    
    try {
      // Find strategy that matches this knowledge base
      const matchedStrategy = config.strategies.find(s => 
        s.detection?.type === 'rag' && s.detection?.knowledge_base === knowledgeBase
      );
      
      if (!matchedStrategy) {
        console.log(`      ⚠️ No RAG strategy configured for knowledge base '${knowledgeBase}'`);
        continue;
      }
      
      // Get the provider for this knowledge base
      const provider = retrievalService.providers.get(knowledgeBase);
      
      if (!provider) {
        console.log(`      ⚠️ Knowledge base provider '${knowledgeBase}' not found`);
        continue;
      }
      
      // Check if this is a wrapper (dynamic) or fixed collection
      const isWrapper = provider.getName() === 'ChromaDBWrapper';
      
      let collectionMetadata = {};
      let lowerThreshold = matchedStrategy.detection?.threshold || 0.3;
      let upperThreshold = matchedStrategy.detection?.fallback_threshold;
      
      if (isWrapper) {
        // Dynamic collection - get metadata from ChromaDB
        try {
          const collectionInfo = await provider.getCollectionInfo(collectionName);
          collectionMetadata = collectionInfo.metadata || {};
          // Use metadata thresholds if available, otherwise use strategy thresholds
          lowerThreshold = collectionMetadata.threshold || lowerThreshold;
          upperThreshold = collectionMetadata.fallback_threshold || upperThreshold;
        } catch (error) {
          console.log(`      ⚠️ Collection '${collectionName}' not found in ${knowledgeBase}`);
          continue;
        }
      }
      
      // Query the collection
      const results = await provider.query(userQuery, {
        collection: collectionName,
        top_k: 3
      });
      
      if (results.length > 0) {
        const minDistance = Math.min(...results.map(r => r.distance));
        console.log(`      📊 Min distance: ${minDistance.toFixed(4)} (threshold: ${lowerThreshold}${upperThreshold ? `, fallback: ${upperThreshold}` : ''})`);
        
        // Check if lower threshold met - IMMEDIATE MATCH
        if (minDistance < lowerThreshold) {
          console.log(`      ✅ Collection match: ${knowledgeBase}/${collectionName}`);
          
          // Build final response config by merging strategy with collection metadata
          const responseConfig = {
            ...matchedStrategy.response,
            system_prompt: collectionMetadata.system_prompt || 
                          matchedStrategy.response.system_prompt || 
                          'You are a helpful assistant. Answer the user\'s question based on the context provided from the knowledge base.',
            max_tokens: collectionMetadata.max_tokens || matchedStrategy.response.max_tokens || 800,
            temperature: collectionMetadata.temperature || matchedStrategy.response.temperature || 0.7
          };
          
          const finalStrategy = {
            name: matchedStrategy.name,
            response: responseConfig
          };
          
          return {
            matched: true,
            strategy: finalStrategy,
            context: results.map(r => r.text),
            ragResults: results
          };
        }
        
        // Check if within fallback threshold - CANDIDATE for LLM detection
        if (upperThreshold && minDistance < upperThreshold) {
          console.log(`      📋 Added to candidates: ${knowledgeBase}/${collectionName}`);
          
          // Get description from metadata or generate default
          const description = collectionMetadata.description || 
                            `if the query is about ${collectionName}`;
          
          // Build merged strategy for this candidate
          const responseConfig = {
            ...matchedStrategy.response,
            system_prompt: collectionMetadata.system_prompt || 
                          matchedStrategy.response.system_prompt || 
                          'You are a helpful assistant.',
            max_tokens: collectionMetadata.max_tokens || matchedStrategy.response.max_tokens || 800,
            temperature: collectionMetadata.temperature || matchedStrategy.response.temperature || 0.7
          };
          
          const candidateStrategy = {
            name: matchedStrategy.name,
            response: responseConfig
          };
          
          // Return candidate immediately for now (we'll collect multiple candidates later if needed)
          return {
            matched: false,
            candidates: [{
              strategy: candidateStrategy,
              distance: minDistance,
              results: results,
              description: description
            }]
          };
        } else {
          console.log(`      ❌ No match: ${knowledgeBase}/${collectionName}`);
        }
      }
    } catch (error) {
      console.error(`      ❌ Error querying ${knowledgeBase}/${collectionName}:`, error.message);
      continue;
    }
  }
  
  return { matched: false, candidates: [] };
}

/**
 * Detect which strategy to use
 */
async function detectStrategy(userQuery, chatHistory, selectedCollections = []) {
  console.log('🔍 Detecting strategy...');
  
  const strategies = config.strategies;
  
  // Check if only one strategy with type "default"
  if (strategies.length === 1 && strategies[0].detection.type === 'default') {
    console.log('   ℹ️  Single default strategy');
    
    // Still query selected collections for context
    if (selectedCollections.length > 0) {
      console.log('   🔍 Querying selected collections for context...');
      const dynamicDetection = await detectStrategyWithDynamicCollections(
        selectedCollections,
        userQuery
      );
      // Use the default strategy but with context from collections
      if (dynamicDetection.context) {
        return { strategy: strategies[0], context: dynamicDetection.context };
      }
    }
    
    return { strategy: strategies[0] };
  }
  
  // Step 1: Try dynamic collection detection (if collections are selected)
  let dynamicCandidates = [];
  const checkedKnowledgeBases = new Set();
  
  if (selectedCollections.length > 0) {
    const dynamicDetection = await detectStrategyWithDynamicCollections(
      selectedCollections,
      userQuery
    );
    if (dynamicDetection.matched) {
      // Found a match in selected collections
      return {
        strategy: dynamicDetection.strategy,
        context: dynamicDetection.context,
        ragResults: dynamicDetection.ragResults
      };
    }
    // Store candidates for LLM detection
    dynamicCandidates = dynamicDetection.candidates || [];
    
    // Track which knowledge bases we already checked via selected collections
    selectedCollections.forEach(col => checkedKnowledgeBases.add(col.knowledgeBase));
  }
  
  // Step 2: Try RAG detection (queries all RAG strategies in order)
  // Skip knowledge bases that were already checked via selected collections
  const ragDetection = await detectStrategyWithRAG(strategies, userQuery, checkedKnowledgeBases);
  if (ragDetection.matched) {
    // Found a strategy that passed the lower threshold
    return {
      strategy: ragDetection.strategy,
      context: ragDetection.context,
      ragResults: ragDetection.ragResults
    };
  }
  
  // Step 3: Try LLM detection (with all candidates from dynamic collections and RAG strategies)
  const allCandidates = [...dynamicCandidates, ...(ragDetection.candidates || [])];
  const llmDetection = await detectStrategyWithLLM(
    strategies,
    userQuery,
    chatHistory,
    allCandidates
  );
  
  if (llmDetection && llmDetection.strategy) {
    return llmDetection;
  }
  
  // Step 3: Fall back to default strategy
  const defaultStrategy = strategies.find(s => s.detection.type === 'default');
  if (defaultStrategy) {
    console.log('   ⚠️  No strategy detected, using default');
    return { strategy: defaultStrategy };
  }
  
  throw new Error('No strategy detected and no default strategy configured');
}

/**
 * Generate response using detected strategy
 */
async function generateResponse(strategy, userQuery, chatHistory, context = null) {
  console.log(`💬 Generating response with strategy: ${strategy.name}`);
  
  // Check for static response
  if (strategy.response.static_response) {
    console.log('   📝 Using static response');
    return strategy.response.static_response;
  }
  
  // Build system prompt
  let systemPrompt = strategy.response.system_prompt;
  
  // Inject context if available
  if (context && context.length > 0) {
    const contextText = context.join('\n\n');
    systemPrompt = `${systemPrompt}\n\nContext from knowledge base:\n${contextText}`;
    console.log(`   📚 Injected ${context.length} context chunks`);
  }
  
  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add chat history
  chatHistory.forEach(message => {
    messages.push({
      role: message.type === 'user' ? 'user' : 'assistant',
      content: message.text
    });
  });
  
  // Add current query
  messages.push({
    role: 'user',
    content: userQuery
  });
  
  // Set the response provider
  const responseProvider = strategy.response.provider;
  const responseModel = strategy.response.model;
  const maxTokens = strategy.response.max_tokens;
  
  console.log(`   🤖 Using provider: ${responseProvider}, model: ${responseModel}`);
  
  await aiService.setActiveProvider(responseProvider);
  
  // Generate response
  try {
    const response = await aiService.generateChat(messages, {
      model: responseModel,
      max_tokens: maxTokens
    });
    
    console.log(`   ✅ Response generated (${response.usage?.total_tokens || 'unknown'} tokens)`);
    
    return response.content.trim();
  } catch (error) {
    console.error('   ❌ Error generating response:', error.message);
    throw error;
  }
}

// Health check endpoint
app.get('/chat/api', async (req, res) => {
  res.json({
    status: 'ready',
    config: {
      strategies: config?.strategies?.length || 0,
      providers: Object.keys(config?.providers || {}).length,
      knowledgeBases: retrievalService?.listKnowledgeBases().length || 0
    }
  });
});

// Chat endpoint
app.post('/chat/api', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📨 Received chat request');
  
  const userInput = req.body.prompt;
  const retryCount = req.body.retryCount || 0;
  const selectedCollections = req.body.selectedCollections || [];
  
  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid input.' });
  }
  
  const previousMessages = req.body.previousMessages || [];
  
  console.log(`   User: "${userInput}"`);
  console.log(`   History: ${previousMessages.length} messages`);
  if (selectedCollections.length > 0) {
    console.log(`   Collections: [${selectedCollections.map(c => `${c.knowledgeBase}/${c.collection}`).join(', ')}]`);
  }
  
  try {
    // Detect strategy
    const detection = await detectStrategy(userInput, previousMessages, selectedCollections);
    
    // Generate response
    const response = await generateResponse(
      detection.strategy,
      userInput,
      previousMessages,
      detection.context
    );
    
    console.log('✅ Request completed successfully');
    console.log('='.repeat(80) + '\n');
    
    return res.json({ success: true, response });
    
  } catch (error) {
    console.error('❌ Error processing request:', error.message);
    console.error(error.stack);
    console.log('='.repeat(80) + '\n');
    
    // Handle rate limiting
    if (error.response && error.response.status === 429) {
      const backoffFactor = 2;
      const defaultRetryAfter = 5;
      const apiRetryAfter = error.response.headers['retry-after']
        ? parseInt(error.response.headers['retry-after'], 10)
        : defaultRetryAfter;
      
      const retryAfter = apiRetryAfter * Math.pow(backoffFactor, retryCount);
      
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait before retrying.',
        retryAfter
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error processing your request.'
    });
  }
});

// Collection management endpoints

// Check if wrapper providers are available
app.get('/api/collections/available', (req, res) => {
  try {
    const hasWrapper = Array.from(retrievalService.providers.values())
      .some(p => p.getName() === 'ChromaDBWrapper');
    
    res.json({ hasWrapper });
  } catch (error) {
    console.error('Error checking wrapper availability:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all collections from all sources (dynamic wrapper + fixed config)
app.get('/api/collections', async (req, res) => {
  try {
    const collections = [];
    
    // 1. Get dynamic collections from chromadb-wrapper providers
    for (const [name, provider] of retrievalService.providers.entries()) {
      if (provider.getName() === 'ChromaDBWrapper') {
        try {
          const providerCollections = await provider.listCollections();
          // Only include name, knowledgeBase, and count - no metadata or internal details
          collections.push(...providerCollections.map(c => ({
            name: c.name,
            knowledgeBase: name,
            count: c.count || 0
          })));
        } catch (error) {
          console.error(`Error listing collections from ${name}:`, error.message);
        }
      }
    }
    
    // 2. Get fixed collections from config strategies
    for (const strategy of config.strategies) {
      if (strategy.detection?.type === 'rag' && strategy.detection.knowledge_base) {
        const kbName = strategy.detection.knowledge_base;
        const kb = config.knowledge_bases[kbName];
        
        if (kb && kb.collection) {
          // Check if we already have this collection from a dynamic source
          const existing = collections.find(c => 
            c.knowledgeBase === kbName && c.name === kb.collection
          );
          
          if (!existing) {
            // Try to get count from provider
            let count = 0;
            const provider = retrievalService.providers.get(kbName);
            if (provider) {
              try {
                const info = await provider.getCollectionInfo(kb.collection);
                count = info.count || 0;
              } catch (error) {
                // Can't get count, leave as 0
              }
            }
            
            collections.push({
              name: kb.collection,
              knowledgeBase: kbName,
              count
            });
          }
        }
      }
    }
    
    res.json({ collections });
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific collection info
app.get('/api/collections/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { provider } = req.query; // Optional provider name
    
    // If provider specified, use that one
    if (provider) {
      const providerInstance = retrievalService.providers.get(provider);
      if (!providerInstance || providerInstance.getName() !== 'ChromaDBWrapper') {
        return res.status(404).json({ error: 'Provider not found or not a wrapper' });
      }
      
      const info = await providerInstance.getCollectionInfo(name);
      return res.json(info);
    }
    
    // Otherwise, search all wrapper providers
    for (const [providerName, providerInstance] of retrievalService.providers.entries()) {
      if (providerInstance.getName() === 'ChromaDBWrapper') {
        try {
          const info = await providerInstance.getCollectionInfo(name);
          return res.json({ ...info, provider_name: providerName });
        } catch (error) {
          // Collection not found in this provider, try next
          continue;
        }
      }
    }
    
    res.status(404).json({ error: `Collection '${name}' not found` });
  } catch (error) {
    console.error(`Error getting collection ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new collection
app.post('/api/collections', async (req, res) => {
  try {
    const { name, metadata, provider } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }
    
    // Find wrapper provider to use (use specified or first available)
    let targetProvider = null;
    if (provider) {
      targetProvider = retrievalService.providers.get(provider);
      if (!targetProvider || targetProvider.getName() !== 'ChromaDBWrapper') {
        return res.status(404).json({ error: 'Specified provider not found or not a wrapper' });
      }
    } else {
      // Use first available wrapper
      for (const providerInstance of retrievalService.providers.values()) {
        if (providerInstance.getName() === 'ChromaDBWrapper') {
          targetProvider = providerInstance;
          break;
        }
      }
    }
    
    if (!targetProvider) {
      return res.status(400).json({ error: 'No wrapper provider available' });
    }
    
    // Get embedding provider configuration from the wrapper's config
    // The config was enriched by RetrievalService with embedding provider details
    const embeddingProvider = targetProvider.config?.embedding_provider_type || null;
    const embeddingModel = targetProvider.config?.embedding_model || null;
    
    console.log(`🔧 Creating collection "${name}" with embedding: ${embeddingProvider}/${embeddingModel}`);
    
    // Create collection via provider's API with embedding info
    const axios = require('axios');
    const requestBody = {
      name,
      metadata: metadata || {}
    };
    
    // Add embedding provider info if available
    if (embeddingProvider) {
      requestBody.embedding_provider = embeddingProvider;
    }
    if (embeddingModel) {
      requestBody.embedding_model = embeddingModel;
    }
    
    const response = await axios.post(
      `${targetProvider.baseUrl}/collections`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add documents to a collection
app.post('/api/collections/:name/documents', async (req, res) => {
  try {
    const { name } = req.params;
    const { documents, provider } = req.body;
    
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }
    
    // Find wrapper provider
    let targetProvider = null;
    if (provider) {
      targetProvider = retrievalService.providers.get(provider);
    } else {
      // Use first wrapper that has this collection
      for (const providerInstance of retrievalService.providers.values()) {
        if (providerInstance.getName() === 'ChromaDBWrapper') {
          try {
            await providerInstance.getCollectionInfo(name);
            targetProvider = providerInstance;
            break;
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    if (!targetProvider) {
      return res.status(404).json({ error: 'No suitable provider found for this collection' });
    }
    
    // Get embedding provider configuration from the wrapper's config
    // The config was enriched by RetrievalService with embedding provider details
    const embeddingProvider = targetProvider.config?.embedding_provider_type || null;
    const embeddingModel = targetProvider.config?.embedding_model || null;
    
    // Add documents via provider's API with embedding info
    const axios = require('axios');
    const requestBody = {
      documents
    };
    
    // Add embedding provider info if available (for consistency)
    if (embeddingProvider) {
      requestBody.embedding_provider = embeddingProvider;
    }
    if (embeddingModel) {
      requestBody.embedding_model = embeddingModel;
    }
    
    const response = await axios.post(
      `${targetProvider.baseUrl}/collections/${name}/documents`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // Longer timeout for document uploads
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error(`Error adding documents to collection ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a collection
app.delete('/api/collections/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { provider } = req.query;
    
    // Find wrapper provider
    let targetProvider = null;
    if (provider) {
      targetProvider = retrievalService.providers.get(provider);
    } else {
      // Find first wrapper that has this collection
      for (const providerInstance of retrievalService.providers.values()) {
        if (providerInstance.getName() === 'ChromaDBWrapper') {
          try {
            await providerInstance.getCollectionInfo(name);
            targetProvider = providerInstance;
            break;
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    if (!targetProvider) {
      return res.status(404).json({ error: 'Collection or provider not found' });
    }
    
    // Delete via provider's API
    const axios = require('axios');
    const response = await axios.delete(
      `${targetProvider.baseUrl}/collections/${name}`,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error(`Error deleting collection ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Starting Chat Server...\n');
    
    // Load configuration
    config = loadConfiguration();
    console.log(`   ✅ Configuration loaded: ${config.strategies.length} strategies\n`);
    
    // Initialize AI providers
    await initializeAIProviders(config);
    console.log();
    
    // Initialize knowledge bases
    await initializeKnowledgeBases(config);
    console.log();
    
    // Start server
    const port = process.env.CHAT_PORT || 5005;
    app.listen(port, () => {
      console.log(`✅ Chat server running on port ${port}\n`);
      console.log('Ready to accept requests! 🎉\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Start the server
startServer();


