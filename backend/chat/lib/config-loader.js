const fs = require('fs');
const path = require('path');

/**
 * Load configuration file and validate structure
 * Returns RAW config with ${VAR} placeholders intact
 * 
 * @param {string} configPath - Path to configuration file
 * @returns {Object} Parsed and validated configuration (RAW with placeholders)
 * @throws {Error} If config is invalid or missing required sections
 */
function loadConfig(configPath) {
  // Zero-config mode: return empty config if no file specified
  if (!configPath) {
    console.log('⚠️  No configuration file found - starting in zero-config mode');
    console.log('   Use the Configuration Builder UI at /config to set up providers\n');
    return { llms: {}, rag_services: {}, responses: [] }; // Empty config
  }
  
  console.log(`📂 Loading configuration from: ${configPath}`);
  
  // Validate file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  // Read and parse config file
  let configContent;
  try {
    configContent = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read configuration file: ${error.message}`);
  }
  
  // Parse JSON WITHOUT substitution (keep ${VAR} placeholders intact)
  let config;
  try {
    config = JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Invalid JSON in configuration file: ${error.message}`);
  }
  
  // Validate configuration structure (on processed config)
  const processedConfig = getProcessedConfig(config);
  validateConfig(processedConfig);
  
  console.log(`✅ Configuration loaded successfully (raw with placeholders)`);
  return config; // Return RAW config
}

/**
 * Get processed configuration with environment variable substitution
 * This performs on-demand substitution without mutating the raw config
 * 
 * @param {Object} rawConfig - Raw configuration with ${VAR} placeholders
 * @returns {Object} Processed configuration with substituted values
 */
function getProcessedConfig(rawConfig) {
  // Convert to JSON string, substitute, and parse back
  const jsonStr = JSON.stringify(rawConfig);
  const processedStr = jsonStr.replace(/"\$\{([^}]+)\}"/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      // Keep original placeholder if env var not found
      return match;
    }
    // Return as JSON string value (with quotes)
    return JSON.stringify(value);
  });
  
  return JSON.parse(processedStr);
}

/**
 * Validate configuration structure
 * 
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  const errors = [];
  
  // Zero-config mode: allow empty config
  const hasLLMs = config.llms && typeof config.llms === 'object' && Object.keys(config.llms).length > 0;
  const hasResponses = config.responses && Array.isArray(config.responses) && config.responses.length > 0;
  
  // If completely empty, assume zero-config mode (valid)
  if (!hasLLMs && !hasResponses) {
    return; // Valid zero-config
  }
  
  // If partially configured, enforce normal validation rules
  if (!hasLLMs) {
    errors.push('Config must define at least one LLM in "llms" section');
  }
  
  if (!hasResponses) {
    errors.push('Config must define at least one response rule in "responses" array');
  }
  
  // Validate LLM references in responses
  if (config.responses && config.llms) {
    config.responses.forEach((response, idx) => {
      if (response.llm && !config.llms[response.llm]) {
        errors.push(`Response rule ${idx} references undefined LLM: "${response.llm}"`);
      }
    });
  }
  
  // Validate no duplicate LLM provider IDs
  // Note: JavaScript objects have unique keys by definition, but this validation
  // provides helpful errors for manual config editing (e.g., JSON syntax errors)
  if (config.llms) {
    const llmIds = Object.keys(config.llms);
    const seen = new Set();
    const duplicates = [];
    
    llmIds.forEach(id => {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    });
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate LLM provider IDs: ${duplicates.join(', ')}`);
    }
  }
  
  // Validate RAG service references in response handlers
  if (config.responses && config.rag_services) {
    config.responses.forEach((response, idx) => {
      if (response.match?.service && !config.rag_services[response.match.service]) {
        errors.push(`Response rule ${idx + 1} references undefined RAG service: "${response.match.service}"`);
      }
    });
  }
  
  // Validate intent detection LLM reference
  if (config.intent && config.intent.provider && config.intent.provider.llm) {
    if (config.llms && !config.llms[config.intent.provider.llm]) {
      errors.push(`Intent detection references undefined LLM: "${config.intent.provider.llm}"`);
    }
  }
  
  // Check for fallback response (at least one response with no match clause)
  if (config.responses) {
    const hasFallback = config.responses.some(r => !r.match || Object.keys(r.match).length === 0);
    if (!hasFallback) {
      console.warn('⚠️  Warning: No fallback response found (response with empty or no match clause)');
    }
  }
  
  // Throw error if any validation failed
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }
}

/**
 * Resolve config file path from CLI args or environment variables
 * 
 * Priority order:
 * 1. CLI argument (--config)
 * 2. FLEX_CHAT_CONFIG_FILE or FLEX_CHAT_CONFIG_FILE_PATH env var (full file path)
 * 3. FLEX_CHAT_CONFIG_DIR env var (directory containing config.json)
 * 4. Default: ./config/config.json from current working directory
 * 
 * @param {string|null} providedPath - Path provided via CLI argument (file or directory)
 * @returns {string} Resolved absolute path to config file
 */
function resolveConfigPath(providedPath) {
  let configPath;
  
  function resolveFileName() {
    return process.env.FLEX_CHAT_CONFIG_FILE || 'config.json';
  }
  
  if (providedPath) {
    // 1. CLI argument provided - can be file or directory
    let resolvedPath;
    
    if (path.isAbsolute(providedPath)) {
      // Absolute path - use as-is
      resolvedPath = providedPath;
    } else {
      // Relative path - resolve relative to FLEX_CHAT_CONFIG_DIR if set, otherwise process.cwd()
      const baseDir = process.env.FLEX_CHAT_CONFIG_DIR || process.cwd();
      resolvedPath = path.resolve(baseDir, providedPath);
    }

    // If it's a directory, look for config.json inside
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      configPath = path.join(resolvedPath, resolveFileName());
      console.log(`📝 Using config from CLI directory: ${resolvedPath}`);
    } else {
      configPath = resolvedPath;
      console.log(`📝 Using config from CLI argument: ${providedPath}`);
    }
  } else if (process.env.FLEX_CHAT_CONFIG_FILE_PATH) {
    // 2. Environment variable - full file path
    configPath = process.env.FLEX_CHAT_CONFIG_FILE_PATH;
    console.log(`📝 Using config from env var: ${configPath}`);
  } else if (process.env.FLEX_CHAT_CONFIG_DIR) {
    // 3. Environment variable - directory path
    configPath = path.join(process.env.FLEX_CHAT_CONFIG_DIR, resolveFileName());
    console.log(`📝 Using config from FLEX_CHAT_CONFIG_DIR: ${process.env.FLEX_CHAT_CONFIG_DIR}`);
  } else {
    // 4. Default: config/config.json relative to project root (cwd)
    configPath = path.join(process.cwd(), 'config', 'config.json');
    console.log(`📝 Using default config: config/config.json`);
  }
  
  // Zero-config mode: return null if file doesn't exist (instead of path that will fail)
  if (!fs.existsSync(configPath)) {
    console.log(`📝 Config file not found: ${configPath}`);
    return null; // Signal zero-config mode
  }
  
  return configPath;
}

module.exports = {
  loadConfig,
  getProcessedConfig,
  validateConfig,
  resolveConfigPath
};

