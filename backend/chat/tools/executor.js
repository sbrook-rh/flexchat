'use strict';

const ToolHandlers = require('./handlers');

/**
 * ToolExecutor - Validates parameters and executes tool calls.
 *
 * Responsibilities:
 * - Validate tool parameters against JSON Schema before execution
 * - Execute tools by type: mock, builtin, internal
 * - Track execution time
 * - Return consistent result objects (success or failure)
 *
 * All public methods return: { success, tool_name, execution_time_ms, ...result or error }
 */
class ToolExecutor {
  /**
   * @param {ToolRegistry} registry - Tool registry for looking up definitions
   * @param {ToolHandlers} [handlers] - Handler registry (defaults to new ToolHandlers)
   */
  constructor(registry, handlers) {
    this._registry = registry;
    this._handlers = handlers || new ToolHandlers();
  }

  /**
   * Execute a tool by name with the given parameters.
   *
   * @param {string} name - Tool name
   * @param {Object} params - Tool parameters
   * @returns {Object} { success, tool_name, execution_time_ms, ...result or error }
   */
  async execute(name, params) {
    const startTime = Date.now();

    // Tool not found
    if (!this._registry.has(name)) {
      return {
        success: false,
        error: `Tool '${name}' not found in registry`,
        tool_name: name,
        execution_time_ms: Date.now() - startTime
      };
    }

    const tool = this._registry.get(name);

    // Validate parameters
    const validationError = this._validateParameters(tool, params);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        tool_name: name,
        execution_time_ms: Date.now() - startTime
      };
    }

    // Execute by type
    try {
      let result;
      switch (tool.type) {
        case 'mock':
          result = this._executeMock(tool, params);
          break;
        case 'builtin':
          result = await this._executeBuiltin(tool, params);
          break;
        case 'internal':
          result = await this._executeInternal(tool, params);
          break;
        default:
          throw new Error(`Unknown tool type: ${tool.type}`);
      }

      return {
        success: true,
        tool_name: name,
        execution_time_ms: Date.now() - startTime,
        ...result
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || String(err),
        tool_name: name,
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Validate tool parameters against the tool's parameter schema.
   *
   * Checks:
   * - Required fields are present
   * - Field types match schema types
   * - Enum constraints are satisfied
   *
   * @param {Object} tool - Tool definition
   * @param {Object} params - Parameters to validate
   * @returns {string|null} Error message or null if valid
   */
  _validateParameters(tool, params) {
    const schema = tool.parameters;
    if (!schema || !schema.properties) {
      return null; // No schema = no validation
    }

    const safeParams = params || {};

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (safeParams[field] === undefined || safeParams[field] === null) {
          return `Missing required parameter "${field}" for tool "${tool.name}"`;
        }
      }
    }

    // Check types and enums
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (safeParams[field] === undefined) continue; // Optional field not provided

      const value = safeParams[field];

      // Type check
      if (fieldSchema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== fieldSchema.type) {
          return `Parameter "${field}" for tool "${tool.name}" must be of type "${fieldSchema.type}", got "${actualType}"`;
        }
      }

      // Enum check
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        return `Parameter "${field}" for tool "${tool.name}" must be one of: ${fieldSchema.enum.join(', ')}`;
      }
    }

    return null;
  }

  /**
   * Execute a mock tool by returning its static mock_response.
   *
   * @param {Object} tool - Tool definition with mock_response
   * @returns {Object} The mock_response
   */
  _executeMock(tool, _params) {
    return tool.mock_response || {};
  }

  /**
   * Execute a builtin tool via the handlers registry.
   *
   * @param {Object} tool - Tool definition
   * @param {Object} params - Validated parameters
   * @returns {Promise<Object>} Handler result
   */
  async _executeBuiltin(tool, params) {
    // tool.handler maps tool name to its handler (e.g. "calculator" -> "math_eval")
    // Falls back to tool.name for backward compatibility
    const handlerName = tool.handler || tool.name;
    const handler = this._handlers.get(handlerName);
    if (!handler) {
      throw new Error(`No builtin handler registered for tool "${tool.name}" (handler: "${handlerName}")`);
    }
    return await handler(params);
  }

  /**
   * Execute an internal tool (Flex Chat service) via the handlers registry.
   * Internal tools use the same handler mechanism as builtins.
   *
   * @param {Object} tool - Tool definition
   * @param {Object} params - Validated parameters
   * @returns {Promise<Object>} Handler result
   */
  async _executeInternal(tool, params) {
    // internal tools are registered by tool.name at server startup
    const handler = this._handlers.get(tool.name);
    if (!handler) {
      throw new Error(`No internal handler registered for tool "${tool.name}"`);
    }
    return await handler(params);
  }
}

module.exports = ToolExecutor;
