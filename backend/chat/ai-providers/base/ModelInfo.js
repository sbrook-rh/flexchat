/**
 * ModelInfo - Represents metadata about an AI model
 */
class ModelInfo {
  constructor({
    id,
    name,
    provider,
    type, // 'chat', 'embedding', or 'both'
    maxTokens,
    inputCost,
    outputCost,
    description,
    capabilities = []
  }) {
    this.id = id;
    this.name = name;
    this.provider = provider;
    this.type = type;
    this.maxTokens = maxTokens;
    this.inputCost = inputCost;
    this.outputCost = outputCost;
    this.description = description;
    this.capabilities = capabilities; // e.g., ['function-calling', 'vision', 'json-mode']
  }

  /**
   * Check if this model supports a specific capability
   */
  supports(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Check if this model can handle chat completions
   */
  canChat() {
    return this.type === 'chat' || this.type === 'both';
  }

  /**
   * Check if this model can generate embeddings
   */
  canEmbed() {
    return this.type === 'embedding' || this.type === 'both';
  }

  /**
   * Get a human-readable description
   */
  toString() {
    return `${this.name} (${this.provider}) - ${this.description}`;
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      provider: this.provider,
      type: this.type,
      maxTokens: this.maxTokens,
      inputCost: this.inputCost,
      outputCost: this.outputCost,
      description: this.description,
      capabilities: this.capabilities
    };
  }
}

module.exports = ModelInfo;
