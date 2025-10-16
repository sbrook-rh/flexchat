const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { loadConfig, resolveConfigPath } = require('./lib/config-loader');
const { registry: aiRegistry } = require('./ai-providers/providers');
const { registry: ragRegistry } = require('./retrieval-providers/providers');
const { collectRagResults } = require('./lib/rag-collector');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(bodyParser.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Global services
let config = null;
let aiProviders = {};
let ragProviders = {};

/**
 * Parse command line arguments
 */
const { Command } = require('commander');

function parseArguments() {
  const program = new Command();

  program
    .option('--config <path>', 'Path to configuration file', 'config/config.json')
    .option('--port <number>', 'Port to listen on', 5005)
    .helpOption('-h, --help', 'Display help for command')

  program.parse();

  const options = program.opts();
  
  return options;
}

/**
 * Initialize server
 */
async function initialize() {
  console.log('🚀 Starting Flex Chat Server v2.0...\n');
  
  const options = parseArguments();
  console.log(options);
  
  // Load configuration
  try {
    const configPath = resolveConfigPath(options.config);
    config = loadConfig(configPath);
    console.log(`   ✅ Loaded ${Object.keys(config.llms || {}).length} LLM(s)`);
    console.log(`   ✅ Loaded ${Object.keys(config.rag_services || {}).length} RAG service(s)`);
    console.log(`   ✅ Loaded ${(config.responses || []).length} response rule(s)`);
  } catch (error) {
    console.error(`\n❌ Configuration error: ${error.message}\n`);
    process.exit(1);
  }
  
  // Initialize AI providers
  console.log('\n🤖 Initializing AI providers...');
  for (const [name, llmConfig] of Object.entries(config.llms)) {
    try {
      const providerType = llmConfig.provider;
      console.log(`   Initializing ${name} (${providerType})...`);
      
      // Debug: check if API key is substituted
      // if (llmConfig.api_key) {
      //   const keyPreview = llmConfig.api_key.substring(0, 10) + '...';
      //   console.log(`      API key: ${keyPreview}`);
      // }
      
      const provider = aiRegistry.createProvider(providerType, llmConfig);
      
      // Validate config
      const validation = provider.validateConfig(llmConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      // Health check
      const health = await provider.healthCheck();
      if (health.status !== 'healthy') {
        console.error(`   ❌ Health check failed for ${name}:`);
        console.error(`      Status: ${health.status}`);
        console.error(`      Error: ${health.error || 'Unknown error'}`);
        throw new Error(`Health check failed`);
      }
      
      aiProviders[name] = provider;
      console.log(`   ✅ ${name} initialized successfully`);
    } catch (error) {
      console.error(`   ❌ Failed to initialize AI provider ${name}: ${error.message}`);
      console.error(`\n❌ Cannot start server with failed AI provider\n`);
      process.exit(1);
    }
  }
  
  // Initialize RAG services
  if (config.rag_services && Object.keys(config.rag_services).length > 0) {
    console.log('\n📚 Initializing RAG services...');
    for (const [name, ragConfig] of Object.entries(config.rag_services)) {
      try {
        const providerType = ragConfig.provider;
        console.log(`   Initializing ${name} (${providerType})...`);
        
        // Use global embedding config if service doesn't have its own
        if (config.embedding && !ragConfig.embedding) {
          ragConfig.embedding = config.embedding;
        }
        
        const provider = ragRegistry.createProvider(providerType, ragConfig);
        
        // Validate config
        const validation = provider.validateConfig(ragConfig);
        if (!validation.isValid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
        
        // Health check
        const health = await provider.healthCheck();
        if (health.status !== 'healthy') {
          console.error(`   ❌ Health check failed for ${name}:`);
          console.error(`      Status: ${health.status}`);
          console.error(`      Error: ${health.error || health.message || 'Unknown error'}`);
          if (health.details) {
            console.error(`      Details: ${JSON.stringify(health.details, null, 2)}`);
          }
          throw new Error(`Health check failed`);
        }
        
        ragProviders[name] = provider;
        console.log(`   ✅ ${name} initialized successfully`);
      } catch (error) {
        console.error(`   ❌ Failed to initialize RAG service ${name}: ${error.message}`);
        console.error(`\n❌ Cannot start server with failed RAG service\n`);
        process.exit(1);
      }
    }
  } else {
    console.log('\n   ℹ️  No RAG services configured (chat-only mode)');
  }
  
  console.log('\n✅ Server initialized successfully\n');
  
  // Start server
  const PORT = options.port;
  app.listen(PORT, () => {
    console.log(`🎯 Chat server listening on http://localhost:${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/chat/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
  });
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    config_loaded: config !== null,
    ai_providers: Object.keys(aiProviders),
    rag_providers: Object.keys(ragProviders)
  });
});

/**
 * Main chat endpoint
 */
app.post('/chat/api', async (req, res) => {
  try {
    const userMessage = req.body.prompt;
    const selectedCollections = req.body.selectedCollections || [];
    const previousMessages = req.body.previousMessages || [];
    
    // Validate request
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: prompt is required and must be a string'
      });
    }
    
    console.log(`\n📨 Received chat request:`);
    console.log(`   Message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
    console.log(`   Selected collections: ${JSON.stringify(selectedCollections)}`);
    
    // Phase 1: Collect RAG results
    const ragResults = await collectRagResults(
      userMessage,
      selectedCollections,
      config.rag_services || {},
      ragProviders
    );
    
    // TODO: Phase 1b - Build profile
    // TODO: Phase 2 - Intent detection (if needed)
    // TODO: Phase 3 - Match response rule
    // TODO: Phase 4 - Generate response
    
    // For now, return RAG results for debugging
    res.json({
      response: '🚧 Server v2.0 - Phase 1 (RAG Collection) complete!',
      status: 'rag_collection_complete',
      debug: {
        message_received: userMessage,
        selected_collections: selectedCollections,
        previous_messages_count: previousMessages.length,
        rag_results: ragResults,
        ai_providers_available: Object.keys(aiProviders),
        rag_providers_available: Object.keys(ragProviders)
      }
    });
    
  } catch (error) {
    console.error('❌ Error handling chat request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// Start Server
// ============================================================================

initialize().catch(error => {
  console.error('❌ Failed to initialize server:', error);
  process.exit(1);
});

// Export for testing
module.exports = { app, config };

