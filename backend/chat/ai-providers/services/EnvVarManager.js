/**
 * EnvVarManager - Service for secure environment variable management
 * 
 * This service provides filtered access to environment variables for provider
 * configuration, using an allowlist pattern to prevent exposure of sensitive
 * system variables.
 */
class EnvVarManager {
  constructor() {
    // Allowlist patterns for environment variables that can be exposed
    // Only variables matching these patterns can be listed/suggested
    this.allowedPatterns = [
      // Flex Chat namespaced variables (explicit opt-in)
      /^FLEX_CHAT_.*/,
      /^FC_.*/,
      
      // Known AI/RAG provider patterns (match anywhere in name)
      /OPENAI/,
      /GEMINI/,
      /ANTHROPIC/,
      /OLLAMA/,
      /CHROMA/
    ];
  }

  /**
   * List available environment variables (filtered by allowlist)
   * @param {boolean} maskValues - Whether to mask sensitive values
   * @returns {Array} Array of env var objects with name and optionally value
   */
  listAvailableEnvVars(maskValues = true) {
    const envVars = [];

    for (const [name, value] of Object.entries(process.env)) {
      if (this.isAllowed(name)) {
        envVars.push({
          name,
          value: maskValues ? this.maskValue(name, value) : value,
          exists: true
        });
      }
    }

    // Sort alphabetically
    return envVars.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Check if an environment variable name is allowed
   * @param {string} name - Environment variable name
   * @returns {boolean} True if allowed
   */
  isAllowed(name) {
    return this.allowedPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Mask a sensitive value for display
   * @param {string} name - Variable name
   * @param {string} value - Variable value
   * @returns {string} Masked value
   */
  maskValue(name, value) {
    if (!value) return '';

    // Always mask API keys, tokens, and secrets
    if (name.includes('KEY') || name.includes('TOKEN') || name.includes('SECRET')) {
      // Show first 4 and last 4 characters
      if (value.length > 12) {
        return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
      }
      return '****';
    }

    // For URLs and endpoints, show them unmasked (they're not typically sensitive)
    if (name.includes('URL') || name.includes('ENDPOINT') || name.includes('HOST')) {
      return value;
    }

    // Default: mask middle portion
    if (value.length > 8) {
      return `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
    }

    return '****';
  }

  /**
   * Validate that a referenced environment variable exists
   * @param {string} varName - Environment variable name (without ${} wrapper)
   * @returns {Object} Validation result
   */
  validateEnvVar(varName) {
    const exists = varName in process.env;
    const isAllowed = this.isAllowed(varName);

    if (!exists) {
      return {
        valid: false,
        warning: `Environment variable ${varName} is not set`,
        suggestion: `Set ${varName} in your environment or .env file`
      };
    }

    if (!isAllowed) {
      return {
        valid: false,
        warning: `Environment variable ${varName} is not in the allowlist`,
        suggestion: 'Use a variable matching standard patterns (*_API_KEY, *_URL, etc.)'
      };
    }

    return {
      valid: true,
      exists: true
    };
  }

  /**
   * Get suggested environment variable names for a provider field
   * @param {string} providerName - Provider name (e.g., 'openai')
   * @param {string} fieldName - Field name (e.g., 'api_key')
   * @returns {Array} Array of suggested env var names
   */
  getSuggestions(providerName, fieldName) {
    const suggestions = [];
    const upperProvider = providerName.toUpperCase();
    const upperField = fieldName.toUpperCase();

    // Generate common patterns
    if (fieldName.includes('key') || fieldName.includes('token')) {
      suggestions.push(`${upperProvider}_API_KEY`);
      suggestions.push(`${upperProvider}_TOKEN`);
      suggestions.push(`${upperProvider}_KEY`);
    }

    if (fieldName.includes('url') || fieldName.includes('endpoint')) {
      suggestions.push(`${upperProvider}_URL`);
      suggestions.push(`${upperProvider}_BASE_URL`);
      suggestions.push(`${upperProvider}_ENDPOINT`);
    }

    if (fieldName.includes('host')) {
      suggestions.push(`${upperProvider}_HOST`);
    }

    if (fieldName.includes('port')) {
      suggestions.push(`${upperProvider}_PORT`);
    }

    // Check which suggestions actually exist
    return suggestions.map(name => ({
      name,
      exists: name in process.env,
      placeholder: `\${${name}}`
    }));
  }

  /**
   * Extract environment variable references from a configuration object
   * @param {Object} config - Configuration object
   * @returns {Array} Array of referenced env var names
   */
  extractEnvVarReferences(config) {
    const references = new Set();
    const jsonStr = JSON.stringify(config);
    const regex = /\$\{([^}]+)\}/g;
    let match;

    while ((match = regex.exec(jsonStr)) !== null) {
      references.add(match[1]);
    }

    return Array.from(references);
  }

  /**
   * Validate all environment variable references in a configuration
   * @param {Object} config - Configuration object
   * @returns {Object} Validation results with warnings
   */
  validateConfigReferences(config) {
    const references = this.extractEnvVarReferences(config);
    const results = {
      valid: true,
      warnings: [],
      missingVars: [],
      disallowedVars: []
    };

    for (const varName of references) {
      const validation = this.validateEnvVar(varName);
      
      if (!validation.valid) {
        results.valid = false;
        results.warnings.push(validation.warning);

        if (!validation.exists) {
          results.missingVars.push(varName);
        } else if (!validation.isAllowed) {
          results.disallowedVars.push(varName);
        }
      }
    }

    return results;
  }
}

// Export singleton instance
module.exports = new EnvVarManager();

