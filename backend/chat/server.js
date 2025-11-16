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
const createConfigRouter = require('./routes/config');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

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

// Track provider connection status (Phase 1.6.4)
let providerStatus = {
  llms: {},
  rag_services: {}
};

/**
 * Getter functions for current server state
 * These allow routes to always access the latest values after hot-reload
 */
const getConfig = () => config;
const getProviders = () => ({ aiProviders, ragProviders });
const getProviderStatus = () => providerStatus;

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
 * Reinitialize providers with new configuration (hot-reload)
 * @param {Object} newRawConfig - Raw configuration with ${ENV_VAR} placeholders
 * @returns {Promise<Object>} - { success: boolean, message: string, status?: object }
 */
async function reinitializeProviders(newRawConfig) {
  console.log('\n🔄 Hot-reloading configuration...');

  try {
    // Get processed config (resolve env vars)
    const processedConfig = getProcessedConfig(newRawConfig);

    // Clear existing providers
    aiProviders = {};
    ragProviders = {};
    providerStatus.llms = {};
    providerStatus.rag_services = {};

    // Initialize AI providers
    if (Object.keys(processedConfig.llms || {}).length > 0) {
      console.log('   🤖 Reinitializing AI providers...');
    }

    for (const [name, llmConfig] of Object.entries(processedConfig.llms || {})) {
      try {
        const providerType = llmConfig.provider;
        console.log(`      Initializing ${name} (${providerType})...`);

        const provider = aiRegistry.createProvider(providerType, llmConfig);

        // Validate config
        const validation = provider.validateConfig(llmConfig);
        if (!validation.isValid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        // Health check
        const health = await provider.healthCheck();
        if (health.status !== 'healthy') {
          throw new Error(`Health check failed: ${health.error || 'Unknown error'}`);
        }

        aiProviders[name] = provider;
        providerStatus.llms[name] = { connected: true };
        console.log(`      ✅ ${name} initialized successfully`);
      } catch (error) {
        console.error(`      ❌ Failed to initialize ${name}: ${error.message}`);
        throw new Error(`Failed to initialize LLM '${name}': ${error.message}`);
      }
    }

    // Initialize RAG services
    if (Object.keys(processedConfig.rag_services || {}).length > 0) {
      console.log('   📚 Reinitializing RAG services...');
    }

    for (const [name, ragConfig] of Object.entries(processedConfig.rag_services || {})) {
      try {
        const providerType = ragConfig.provider;
        console.log(`      Initializing ${name} (${providerType})...`);

        // Use global embedding config if service doesn't have its own
        if (processedConfig.embedding && !ragConfig.embedding) {
          ragConfig.embedding = processedConfig.embedding;
        }

        const service = ragRegistry.createProvider(providerType, ragConfig);

        // Validate config
        const validation = service.validateConfig(ragConfig);
        if (!validation.isValid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        // Health check
        const health = await service.healthCheck();
        if (health.status !== 'healthy') {
          throw new Error(`Health check failed: ${health.error || 'Unknown error'}`);
        }

        ragProviders[name] = service;
        providerStatus.rag_services[name] = { connected: true };
        console.log(`      ✅ ${name} initialized successfully`);
      } catch (error) {
        console.error(`      ❌ Failed to initialize ${name}: ${error.message}`);
        throw new Error(`Failed to initialize RAG service '${name}': ${error.message}`);
      }
    }

    // Update global config reference
    config = newRawConfig;

    console.log('   ✅ Configuration reloaded successfully\n');

    return {
      success: true,
      message: 'Configuration reloaded successfully',
      status: providerStatus
    };
  } catch (error) {
    console.error(`   ❌ Hot-reload failed: ${error.message}\n`);
    
    return {
      success: false,
      message: error.message
    };
  }
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
    config = loadConfig(configPath); // Raw config (may be empty for zero-config mode)
    
    const llmCount = Object.keys(config.llms || {}).length;
    const ragCount = Object.keys(config.rag_services || {}).length;
    const responseCount = (config.responses || []).length;
    
    if (llmCount === 0 && ragCount === 0 && responseCount === 0) {
      console.log('   ⚠️  Zero-config mode: No providers or responses configured');
      console.log('   ℹ️  Visit http://localhost:5005/config to set up the system\n');
    } else {
      console.log(`   ✅ Loaded ${llmCount} LLM(s)`);
      console.log(`   ✅ Loaded ${ragCount} RAG service(s)`);
      console.log(`   ✅ Loaded ${responseCount} response rule(s)`);
    }
  } catch (error) {
    console.error(`\n❌ Configuration error: ${error.message}\n`);
    process.exit(1);
  }

  // Get processed config for provider initialization
  const processedConfig = getProcessedConfig(config);

  // Initialize AI providers (skip if zero-config mode)
  if (Object.keys(processedConfig.llms || {}).length > 0) {
    console.log('\n🤖 Initializing AI providers...');
  }
  
  for (const [name, llmConfig] of Object.entries(processedConfig.llms || {})) {
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
      providerStatus.llms[name] = { connected: true };
      console.log(`   ✅ ${name} initialized successfully`);
    } catch (error) {
      console.error(`   ❌ Failed to initialize AI provider ${name}: ${error.message}`);
      providerStatus.llms[name] = { connected: false, error: error.message };
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
        providerStatus.rag_services[name] = { connected: true };
        console.log(`   ✅ ${name} initialized successfully`);
      } catch (error) {
        console.error(`   ❌ Failed to initialize RAG service ${name}: ${error.message}`);
        providerStatus.rag_services[name] = { connected: false, error: error.message };
        console.error(`\n❌ Cannot start server with failed RAG service\n`);
        process.exit(1);
      }
    }
  } else {
    console.log('\n   ℹ️  No RAG services configured (chat-only mode)');
  }

  console.log('\n✅ Server initialized successfully\n');

  // Mount route modules (pass getters for hot-reload support)
  app.use('/', createHealthRouter(getConfig, getProviders));
  app.use('/api', createCollectionsRouter(getConfig, getProviders, getProviderStatus));
  app.use('/api/connections', connectionsRouter);
  app.use('/api/config', createConfigRouter(getConfig, reinitializeProviders));
  app.use('/chat', createChatRouter(getConfig, getProviders));

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

