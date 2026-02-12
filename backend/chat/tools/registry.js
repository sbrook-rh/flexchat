'use strict';

/**
 * ToolRegistry - Central registry for tool definitions.
 *
 * Responsibilities:
 * - Stores tool definitions loaded from config
 * - Validates tool structure on registration
 * - Converts tool definitions to provider-specific formats
 * - Rejects unsupported tool types (e.g. HTTP - deferred to v2)
 */
class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Register a tool definition.
   *
   * @param {Object} tool - Tool definition
   * @param {string} tool.name - Unique tool name (used by models)
   * @param {string} tool.description - Human-readable description
   * @param {string} tool.type - Implementation type: 'mock' | 'builtin' | 'internal'
   * @param {Object} tool.parameters - JSON Schema for tool parameters
   * @throws {Error} If tool definition is invalid or type is unsupported
   */
  register(tool) {
    if (!tool || typeof tool !== 'object') {
      throw new Error('Tool definition must be an object');
    }

    const { name, description, type, parameters } = tool;

    if (!name || typeof name !== 'string') {
      throw new Error('Tool must have a non-empty string "name"');
    }

    if (!description || typeof description !== 'string') {
      throw new Error(`Tool "${name}" must have a non-empty string "description"`);
    }

    if (!parameters || typeof parameters !== 'object') {
      throw new Error(`Tool "${name}" must have a "parameters" object (JSON Schema)`);
    }

    // Reject HTTP tools - deferred to v2
    if (type === 'http') {
      throw new Error(
        `Tool "${name}": HTTP tool type is not supported in v1. ` +
        `Use type "mock" to simulate HTTP responses for testing. ` +
        `HTTP tool support (external API calls) is planned for v2.`
      );
    }

    const validTypes = ['mock', 'builtin', 'internal'];
    if (!type || !validTypes.includes(type)) {
      throw new Error(
        `Tool "${name}" has invalid type "${type}". Must be one of: ${validTypes.join(', ')}`
      );
    }

    this._tools.set(name, { ...tool });
  }

  /**
   * Get a tool definition by name.
   *
   * @param {string} name - Tool name
   * @returns {Object|undefined} Tool definition or undefined if not found
   */
  get(name) {
    return this._tools.get(name);
  }

  /**
   * Check if a tool is registered.
   *
   * @param {string} name - Tool name
   * @returns {boolean}
   */
  has(name) {
    return this._tools.has(name);
  }

  /**
   * List all registered tool definitions.
   *
   * @returns {Object[]} Array of tool definitions
   */
  list() {
    return Array.from(this._tools.values());
  }

  /**
   * Convert tool definitions to provider-specific format.
   *
   * @param {string} provider - Provider name: 'openai' | 'ollama' | 'gemini'
   * @param {string[]} [allowedTools] - Optional allowlist of tool names. If empty/omitted, all tools are included.
   * @returns {Object[]|Object} Provider-formatted tools array
   * @throws {Error} If provider is unsupported
   */
  toProviderFormat(provider, allowedTools) {
    let tools = this.list();

    if (allowedTools && allowedTools.length > 0) {
      tools = tools.filter(t => allowedTools.includes(t.name));
    }

    switch (provider) {
      case 'openai':
      case 'ollama':
        return tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }));

      case 'gemini':
        // Gemini uses functionDeclarations format
        return tools.map(t => ({
          functionDeclarations: [{
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }]
        }));

      default:
        throw new Error(`Unsupported provider for tool format conversion: "${provider}"`);
    }
  }
}

module.exports = ToolRegistry;
