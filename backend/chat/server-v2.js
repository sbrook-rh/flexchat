const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { loadConfig, resolveConfigPath } = require('./lib/config-loader');

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

// Global configuration
let config = null;

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    configPath: null,
    port: 5005
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      options.configPath = args[i + 1];
      i++;
    } else if (args[i] === '--port' && i + 1 < args.length) {
      options.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: node server-v2.js [options]

Options:
  --config <path>    Path to configuration file (default: config/config.json)
  --port <number>    Port to listen on (default: 5005)
  --help, -h         Show this help message

Examples:
  node server-v2.js
  node server-v2.js --config config/examples/new_config.json
  node server-v2.js --port 5006
      `);
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Initialize server
 */
async function initialize() {
  console.log('🚀 Starting Flex Chat Server v2.0...\n');
  
  const options = parseArguments();
  
  // Load configuration
  try {
    const configPath = resolveConfigPath(options.configPath);
    config = loadConfig(configPath);
    console.log(`   ✅ Loaded ${Object.keys(config.llms).length} LLM(s)`);
    console.log(`   ✅ Loaded ${Object.keys(config.rag_services || {}).length} RAG service(s)`);
    console.log(`   ✅ Loaded ${config.responses.length} response rule(s)`);
  } catch (error) {
    console.error(`\n❌ Configuration error: ${error.message}\n`);
    process.exit(1);
  }
  
  // TODO: Initialize AI providers
  // TODO: Initialize retrieval services
  
  console.log('\n✅ Server initialized successfully\n');
  
  // Start server
  const PORT = options.port;
  app.listen(PORT, () => {
    console.log(`🎯 Chat server listening on http://localhost:${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/api/chat`);
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
    llms: config ? Object.keys(config.llms) : [],
    rag_services: config ? Object.keys(config.rag_services || {}) : []
  });
});

/**
 * Main chat endpoint
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, selectedCollections, chatHistory } = req.body;
    
    // Validate request
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: message is required and must be a string'
      });
    }
    
    console.log(`\n📨 Received chat request:`);
    console.log(`   Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    console.log(`   Selected collections: ${JSON.stringify(selectedCollections || [])}`);
    
    // TODO: Phase 1 - Collect RAG results
    // TODO: Phase 1b - Build profile
    // TODO: Phase 2 - Intent detection (if needed)
    // TODO: Phase 3 - Match response rule
    // TODO: Phase 4 - Generate response
    
    // For now, return not implemented
    res.json({
      response: '🚧 Server v2.0 - Not implemented yet. This is just the skeleton!',
      status: 'not_implemented',
      debug: {
        message_received: message,
        selected_collections: selectedCollections,
        config_sections: Object.keys(config)
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

/**
 * Get available LLMs
 */
app.get('/api/config/llms', (req, res) => {
  if (!config || !config.llms) {
    return res.status(500).json({ error: 'Configuration not loaded' });
  }
  
  res.json({
    llms: Object.keys(config.llms).map(name => ({
      name,
      type: config.llms[name].type
    }))
  });
});

/**
 * Get available RAG services
 */
app.get('/api/config/rag-services', (req, res) => {
  if (!config) {
    return res.status(500).json({ error: 'Configuration not loaded' });
  }
  
  res.json({
    rag_services: Object.keys(config.rag_services || {}).map(name => ({
      name,
      type: config.rag_services[name].type,
      collection: config.rag_services[name].collection || 'dynamic'
    }))
  });
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

