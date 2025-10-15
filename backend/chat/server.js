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
  // Deduplicate strategy names for the "Answer with only one word" part
  const uniqueStrategyNames = [...new Set(strategyNames)];
  const intentNamesStr = uniqueStrategyNames.join('", "');
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
      // Find ALL candidates that match this strategy name
      const matchedCandidates = candidates.filter(c => c.strategy.name === strategy.name);
      
      if (matchedCandidates.length > 0) {
        console.log(`   📚 Using RAG context from ${matchedCandidates.length} candidate(s): ${strategy.name}`);
        
        // Sort candidates by distance (best first)
        matchedCandidates.sort((a, b) => a.distance - b.distance);
        
        // Combine context from ALL matched candidates
        const combinedContext = matchedCandidates.flatMap(c => c.results.map(r => r.text));
        const combinedRagResults = matchedCandidates.flatMap(c => c.results);
        
        // Use the closest candidate's strategy config (for system_prompt, etc.)
        const primaryStrategy = matchedCandidates[0].strategy;
        
        return {
          strategy: primaryStrategy,
          context: combinedContext,
          ragResults: combinedRagResults
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
  
  const candidates = [];
  
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
          
          // Add to candidates array and continue checking other collections
          candidates.push({
            strategy: candidateStrategy,
            distance: minDistance,
            results: results,
            description: description
          });
        } else {
          console.log(`      ❌ No match: ${knowledgeBase}/${collectionName}`);
        }
      }
    } catch (error) {
      console.error(`      ❌ Error querying ${knowledgeBase}/${collectionName}:`, error.message);
      continue;
    }
  }
  
  return { matched: false, candidates };
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
 * Detect if reasoning should be used for this query
 */
async function detectReasoningNeeded(userQuery) {
  // If detection_provider configured, use LLM detection
  if (config.detection_provider) {
    try {
      const detectionPrompt = 
        "Does this query require deep reasoning, step-by-step analysis, or " +
        "complex problem-solving? Answer only YES or NO.\n\n" +
        `Query: ${userQuery}`;
      
      await aiService.setActiveProvider(config.detection_provider.provider);
      const response = await aiService.generateChat([
        { role: 'system', content: 'You are a query classifier.' },
        { role: 'user', content: detectionPrompt }
      ], {
        model: config.detection_provider.model,
        max_tokens: 10
      });
      
      const result = response.content.trim().toUpperCase().includes('YES');
      console.log(`   🔍 Reasoning detection: ${result ? 'YES' : 'NO'} (LLM-based)`);
      return result;
    } catch (error) {
      console.error(`   ❌ Error in reasoning detection:`, error.message);
      // Fall through to keyword detection
    }
  }
  
  // Fallback: keyword detection
  const keywords = ['explain', 'why', 'how does', 'how do', 'how can', 'guide me', 
                    'walk me through', 'analyze', 'step by step', 'reasoning', 
                    'what are the steps', 'teach me'];
  const result = keywords.some(kw => userQuery.toLowerCase().includes(kw));
  console.log(`   🔍 Reasoning detection: ${result ? 'YES' : 'NO'} (keyword-based)`);
  return result;
}

/**
 * Generate response using detected strategy
 */
async function generateResponse(strategy, userQuery, chatHistory, context = null, selectedModels = {}) {
  console.log(`💬 Generating response with strategy: ${strategy.name}`);
  
  // Check for static response
  if (strategy.response.static_response) {
    console.log('   📝 Using static response');
    return strategy.response.static_response;
  }
  
  const responseProvider = strategy.response.provider;
  
  // Check if reasoning should be used
  const reasoningKey = `${responseProvider}_reasoning`;
  const reasoningModel = selectedModels[reasoningKey];
  const reasoningEnabled = strategy.response.reasoning?.enabled && reasoningModel && reasoningModel !== '';
  const needsReasoning = reasoningEnabled && await detectReasoningNeeded(userQuery);
  
  let reasoningOutput = null;
  let finalResponseModel = strategy.response.model;
  
  // Override response model if user selected one
  if (strategy.response.allow_model_selection && selectedModels[responseProvider]) {
    finalResponseModel = selectedModels[responseProvider];
    console.log(`   🎯 User-selected response model: ${finalResponseModel}`);
  }
  
  // ===== STAGE 1: REASONING (if needed) =====
  if (needsReasoning) {
    console.log(`   🧠 Starting reasoning stage with model: ${reasoningModel}`);
    
    const reasoningPrompt = strategy.response.reasoning.system_prompt ||
      "Think through this step-by-step. Break down the problem, analyze each part, " +
      "and show your reasoning process clearly.";
    
    const reasoningMessages = [
      { role: 'system', content: reasoningPrompt },
      { role: 'user', content: userQuery }
    ];
    
    await aiService.setActiveProvider(responseProvider);
    
    try {
      const reasoningResponse = await aiService.generateChat(reasoningMessages, {
        model: reasoningModel,
        max_tokens: 2000,
        timeout: 120000  // 2 minutes for reasoning stage
      });
      
      reasoningOutput = reasoningResponse.content.trim();
      console.log(`   ✅ Reasoning complete (${reasoningResponse.usage?.total_tokens || 'unknown'} tokens)`);
      console.log(`\n   📋 REASONING OUTPUT:\n${'-'.repeat(80)}`);
      console.log(reasoningOutput);
      console.log(`${'-'.repeat(80)}\n`);
    } catch (error) {
      console.error('   ❌ Error in reasoning stage:', error.message);
      // Continue without reasoning
      needsReasoning = false;
    }
  }
  
  // ===== STAGE 2: RESPONSE GENERATION =====
  console.log(`   💬 Generating final response with model: ${finalResponseModel}`);
  
  // Build system prompt
  let systemPrompt = strategy.response.system_prompt;
  
  // Inject RAG context if available
  if (context && context.length > 0) {
    const contextText = context.join('\n\n');
    systemPrompt = `${systemPrompt}\n\nContext from knowledge base:\n${contextText}`;
    console.log(`   📚 Injected ${context.length} RAG context chunks`);
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
  
  // If we have reasoning output, use special template
  if (needsReasoning && reasoningOutput) {
    const responseTemplate = strategy.response.reasoning.response_prompt_template ||
      "Based on the following analysis:\n\n{reasoning}\n\n" +
      "Provide a clear, concise answer to the user's question: {query}";
    
    const promptWithReasoning = responseTemplate
      .replace('{reasoning}', reasoningOutput)
      .replace('{query}', userQuery);
    
    messages.push({
      role: 'user',
      content: promptWithReasoning
    });
    
    // Log prompt size for debugging
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4); // Rough estimate: 1 token ≈ 4 chars
    console.log(`   🔗 Chaining reasoning output to response generation`);
    console.log(`   📊 Prompt size: ${totalChars} chars (~${estimatedTokens} tokens estimated)`);
    console.log(`   📝 Reasoning output: ${reasoningOutput.length} chars`);
  } else {
    // Normal query without reasoning
    messages.push({
      role: 'user',
      content: userQuery
    });
    
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    console.log(`   📊 Prompt size: ${totalChars} chars (~${estimatedTokens} tokens estimated)`);
  }
  
  await aiService.setActiveProvider(responseProvider);
  
  // Generate final response
  try {
    // Use longer timeout for reasoning responses (they take longer due to larger context)
    const timeout = needsReasoning ? 180000 : 60000; // 3 minutes vs 1 minute
    
    // Use more tokens for reasoning responses (need space for detailed answer based on reasoning)
    const maxTokens = needsReasoning && reasoningOutput 
      ? (strategy.response.reasoning?.response_max_tokens || strategy.response.max_tokens * 2 || 1600)
      : strategy.response.max_tokens;
    
    if (needsReasoning && reasoningOutput) {
      console.log(`   📏 Using extended max_tokens: ${maxTokens} (reasoning mode)`);
    }
    
    const response = await aiService.generateChat(messages, {
      model: finalResponseModel,
      max_tokens: maxTokens,
      timeout: timeout
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
  const selectedModels = req.body.selectedModels || {};
  
  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid input.' });
  }
  
  const previousMessages = req.body.previousMessages || [];
  
  console.log(`   User: "${userInput}"`);
  console.log(`   History: ${previousMessages.length} messages`);
  if (selectedCollections.length > 0) {
    console.log(`   Collections: [${selectedCollections.map(c => `${c.knowledgeBase}/${c.collection}`).join(', ')}]`);
  }
  if (Object.keys(selectedModels).length > 0) {
    console.log(`   Selected models: ${JSON.stringify(selectedModels)}`);
  }
  
  try {
    // Detect strategy
    const detection = await detectStrategy(userInput, previousMessages, selectedCollections);
    
    // Generate response
    const response = await generateResponse(
      detection.strategy,
      userInput,
      previousMessages,
      detection.context,
      selectedModels
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

// Get model selection configuration with available models
app.get('/api/config/model-selection', async (req, res) => {
  try {
    const selectableProviders = {};
    
    // Find all providers with strategies that allow model selection
    for (const strategy of config.strategies) {
      const provider = strategy.response.provider;
      
      // Initialize provider object if not exists
      if (!selectableProviders[provider]) {
        selectableProviders[provider] = {
          defaultModel: null,
          models: [],
          reasoningModels: [],
          reasoningEnabled: false
        };
      }
      
      // Check for response model selection
      if (strategy.response.allow_model_selection === true) {
        if (!selectableProviders[provider].defaultModel) {
          selectableProviders[provider].defaultModel = strategy.response.model;
        }
      }
      
      // Check for reasoning model selection
      if (strategy.response.reasoning?.enabled === true) {
        selectableProviders[provider].reasoningEnabled = true;
        // No default - user must select or leave as (None)
      }
    }
    
    // Remove providers that have neither selection enabled
    Object.keys(selectableProviders).forEach(provider => {
      const config = selectableProviders[provider];
      if (!config.defaultModel && !config.reasoningDefaultModel) {
        delete selectableProviders[provider];
      }
    });
    
    // If no providers allow selection, return early
    if (Object.keys(selectableProviders).length === 0) {
      return res.json({ enabled: false, providers: {} });
    }
    
    // Fetch available models for each provider
    for (const provider of Object.keys(selectableProviders)) {
      try {
        const models = await aiService.getModels(provider);
        console.log(`   🤖 Retrieved ${models.length} models for ${provider}`);
        
        // Separate chat and reasoning models
        const providerConfig = selectableProviders[provider];
        
        if (providerConfig.defaultModel) {
          // Filter models that have chat capability
          providerConfig.models = models
            .filter(m => m.type === 'chat' || (m.capabilities && m.capabilities.includes('chat')))
            .map(m => ({
              id: m.id,
              name: m.name,
              type: m.type,
              capabilities: m.capabilities,
              maxTokens: m.maxTokens
            }));
          console.log(`   💬 Found ${providerConfig.models.length} chat-capable models for ${provider}`);
        }
        
        if (providerConfig.reasoningEnabled) {
          // Get reasoning config from first strategy that has it enabled
          const reasoningConfig = config.strategies
            .find(s => s.response.provider === provider && s.response.reasoning?.enabled)
            ?.response.reasoning;
          
          let reasoningModels = [];
          
          if (reasoningConfig?.models) {
            // Explicit list overrides auto-detection
            reasoningModels = models.filter(m => reasoningConfig.models.includes(m.id));
            console.log(`   🧠 Using explicit reasoning models list (${reasoningModels.length} models)`);
          } else {
            // Auto-detect reasoning models
            reasoningModels = models.filter(m => 
              m.type === 'reasoning' || (m.capabilities && m.capabilities.includes('reasoning'))
            );
            console.log(`   🧠 Auto-detected ${reasoningModels.length} reasoning-capable models`);
            
            // Add include_models if specified
            if (reasoningConfig?.include_models) {
              const additionalModels = models.filter(m => 
                reasoningConfig.include_models.includes(m.id) && 
                !reasoningModels.find(rm => rm.id === m.id)
              );
              reasoningModels.push(...additionalModels);
              console.log(`   ➕ Added ${additionalModels.length} explicitly included models`);
            }
          }
          
          providerConfig.reasoningModels = reasoningModels.map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            capabilities: m.capabilities,
            maxTokens: m.maxTokens
          }));
          
          console.log(`   🧠 Total reasoning models for ${provider}: ${providerConfig.reasoningModels.length}`);
        }
      } catch (error) {
        console.error(`   ❌ Error fetching models for provider ${provider}:`, error.message);
        // Keep empty arrays on error
      }
    }
    
    res.json({
      enabled: true,
      providers: selectableProviders
    });
  } catch (error) {
    console.error('Error getting model selection config:', error);
    res.status(500).json({ error: error.message, enabled: false, providers: {} });
  }
});

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

// Start the server only if this file is run directly (not imported for testing)
if (require.main === module) {
  startServer();
}

// Export functions for testing
module.exports = {
  detectStrategyWithDynamicCollections,
  detectStrategyWithRAG,
  detectStrategyWithLLM,
  detectStrategy,
  generateResponse,
  app, // For testing HTTP endpoints
  // Export these for mocking in tests
  setConfigForTesting: (newConfig) => { config = newConfig; },
  setRetrievalServiceForTesting: (newService) => { retrievalService = newService; },
  setAIServiceForTesting: (newService) => { aiService = newService; }
};
