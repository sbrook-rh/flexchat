const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { loadConfig, getProcessedConfig, resolveConfigPath } = require('./lib/config-loader');
const { registry: aiRegistry } = require('./ai-providers/providers');
const { registry: ragRegistry } = require('./retrieval-providers/providers');
const { createHealthRouter } = require('./routes/health');
const { createCollectionsRouter } = require('./routes/collections');
const { createChatRouter } = require('./routes/chat');
const connectionsRouter = require('./routes/connections');

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
    .option('--config <path>', 'Path to configuration file (file or directory)')
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

  // Load configuration (raw with placeholders)
  try {
    const configPath = resolveConfigPath(options.config);
    config = loadConfig(configPath); // Raw config
    console.log(`   ✅ Loaded ${Object.keys(config.llms || {}).length} LLM(s)`);
    console.log(`   ✅ Loaded ${Object.keys(config.rag_services || {}).length} RAG service(s)`);
    console.log(`   ✅ Loaded ${(config.responses || []).length} response rule(s)`);
  } catch (error) {
    console.error(`\n❌ Configuration error: ${error.message}\n`);
    process.exit(1);
  }

  // Get processed config for provider initialization
  const processedConfig = getProcessedConfig(config);

  // Initialize AI providers
  console.log('\n🤖 Initializing AI providers...');
  for (const [name, llmConfig] of Object.entries(processedConfig.llms)) {
    try {
      const providerType = llmConfig.provider;
      console.log(`   Initializing ${name} (${providerType})...`);

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
  if (processedConfig.rag_services && Object.keys(processedConfig.rag_services).length > 0) {
    console.log('\n📚 Initializing RAG services...');
    for (const [name, ragConfig] of Object.entries(processedConfig.rag_services)) {
      try {
        const providerType = ragConfig.provider;
        console.log(`   Initializing ${name} (${providerType})...`);

        // Use global embedding config if service doesn't have its own
        if (processedConfig.embedding && !ragConfig.embedding) {
          ragConfig.embedding = processedConfig.embedding;
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

  // Mount route modules
  app.use('/', createHealthRouter(config, aiProviders, ragProviders));
  app.use('/api', createCollectionsRouter(config, ragProviders));
  app.use('/api/connections', connectionsRouter);
  app.use('/chat', createChatRouter(config, aiProviders, ragProviders));

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




// ============================================================================
// Start Server
// ============================================================================

initialize().catch(error => {
  console.error('❌ Failed to initialize server:', error);
  process.exit(1);
});

// Export for testing
module.exports = { app, config };

