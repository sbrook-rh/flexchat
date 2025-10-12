/**
 * ProviderConfig - Base configuration class for AI providers
 */
class ProviderConfig {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Validate the configuration
   */
  validate() {
    const errors = [];
    
    if (!this.apiKey) {
      errors.push('API key is required');
    }
    
    if (this.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }
    
    if (this.retries < 0) {
      errors.push('Retries must be non-negative');
    }
    
    if (this.temperature < 0 || this.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration as environment variables
   */
  toEnvVars(prefix) {
    return {
      [`${prefix}_API_KEY`]: this.apiKey,
      [`${prefix}_BASE_URL`]: this.baseUrl,
      [`${prefix}_TIMEOUT`]: this.timeout.toString(),
      [`${prefix}_RETRIES`]: this.retries.toString(),
      [`${prefix}_RETRY_DELAY`]: this.retryDelay.toString(),
      [`${prefix}_MAX_TOKENS`]: this.maxTokens.toString(),
      [`${prefix}_TEMPERATURE`]: this.temperature.toString()
    };
  }

  /**
   * Create from environment variables
   */
  static fromEnv(prefix, env = process.env) {
    return new ProviderConfig({
      apiKey: env[`${prefix}_API_KEY`],
      baseUrl: env[`${prefix}_BASE_URL`],
      timeout: parseInt(env[`${prefix}_TIMEOUT`]) || 30000,
      retries: parseInt(env[`${prefix}_RETRIES`]) || 3,
      retryDelay: parseInt(env[`${prefix}_RETRY_DELAY`]) || 1000,
      maxTokens: parseInt(env[`${prefix}_MAX_TOKENS`]) || 1000,
      temperature: parseFloat(env[`${prefix}_TEMPERATURE`]) || 0.7
    });
  }
}

module.exports = ProviderConfig;
