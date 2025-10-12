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
    await retrievalService.initializeKnowledgeBases(config.knowledge_bases);
  } else {
    console.log('   ℹ️  No knowledge bases configured');
  }
}

/**
 * Detect strategy using RAG (knowledge base queries)
 */
async function detectStrategyWithRAG(strategies, userQuery) {
  const ragResults = [];
  
  // Query each RAG strategy in order
  for (const strategy of strategies) {
    if (strategy.detection.type === 'rag') {
      const knowledgeBase = strategy.detection.knowledge_base;
      const threshold = strategy.detection.threshold;
      
      console.log(`   🔍 Querying knowledge base: ${knowledgeBase}`);
      
      try {
        const results = await retrievalService.query(knowledgeBase, userQuery, { top_k: 3 });
        
        if (results.length > 0) {
          const minDistance = Math.min(...results.map(r => r.distance));
          console.log(`      📊 Min distance: ${minDistance.toFixed(4)} (threshold: ${threshold})`);
          
          // Check if threshold met
          if (minDistance < threshold) {
            console.log(`      ✅ Strategy detected: ${strategy.name}`);
            return {
              strategy: strategy,
              context: results.map(r => r.text),
              ragResults: results
            };
          }
          
          // Store for potential LLM fallback
          ragResults.push({
            strategy: strategy,
            distance: minDistance,
            results: results
          });
        }
      } catch (error) {
        console.error(`      ❌ Error querying ${knowledgeBase}:`, error.message);
      }
    }
  }
  
  return { ragResults };
}

/**
 * Detect strategy using LLM
 */
async function detectStrategyWithLLM(strategies, userQuery, chatHistory, ragResults = []) {
  // Build intent detection prompt
  const intentDescriptions = [];
  
  // Add RAG strategies that are within fallback threshold
  for (const ragResult of ragResults) {
    const strategy = ragResult.strategy;
    const fallbackThreshold = strategy.detection.fallback_threshold;
    
    if (fallbackThreshold && ragResult.distance < fallbackThreshold) {
      intentDescriptions.push(`- "${strategy.name}" ${strategy.detection.description}`);
    }
  }
  
  // Add LLM strategies
  for (const strategy of strategies) {
    if (strategy.detection.type === 'llm') {
      intentDescriptions.push(`- "${strategy.name}" ${strategy.detection.description}`);
    }
  }
  
  // Find default strategy
  const defaultStrategy = strategies.find(s => s.detection.type === 'default');
  if (defaultStrategy) {
    intentDescriptions.push(`- "${defaultStrategy.name}" for anything else`);
  }
  
  if (intentDescriptions.length === 0) {
    return null;
  }
  
  // Build prompt
  const intentNames = strategies.map(s => s.name).join('", "');
  const historyText = chatHistory.map(m => `${m.type}: ${m.text}`).join('\n');
  
  const intentPrompt = `You are an intent classifier for a chatbot.

Classify the user's query into one of these categories:
${intentDescriptions.join('\n')}

Previous conversation history:
${historyText}

Query: ${userQuery}
Answer with only one word: "${intentNames}".`;

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
      // Check if this was a RAG strategy with context
      const ragResult = ragResults.find(r => r.strategy.name === strategy.name);
      if (ragResult) {
        return {
          strategy: strategy,
          context: ragResult.results.map(r => r.text),
          ragResults: ragResult.results
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
 * Detect which strategy to use
 */
async function detectStrategy(userQuery, chatHistory) {
  console.log('🔍 Detecting strategy...');
  
  const strategies = config.strategies;
  
  // Check if only one strategy with type "default"
  if (strategies.length === 1 && strategies[0].detection.type === 'default') {
    console.log('   ℹ️  Single default strategy, skipping detection');
    return { strategy: strategies[0] };
  }
  
  // Step 1: Try RAG detection
  const ragDetection = await detectStrategyWithRAG(strategies, userQuery);
  if (ragDetection.strategy) {
    return ragDetection;
  }
  
  // Step 2: Try LLM detection
  const llmDetection = await detectStrategyWithLLM(
    strategies,
    userQuery,
    chatHistory,
    ragDetection.ragResults || []
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
  
  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid input.' });
  }
  
  const previousMessages = req.body.previousMessages || [];
  
  console.log(`   User: "${userInput}"`);
  console.log(`   History: ${previousMessages.length} messages`);
  
  try {
    // Detect strategy
    const detection = await detectStrategy(userInput, previousMessages);
    
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

