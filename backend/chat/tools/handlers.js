'use strict';

const { evaluate } = require('mathjs');

/**
 * ToolHandlers - Registry of built-in and internal tool handler functions.
 *
 * Handlers are plain async functions: (params) => result
 * The result should be a plain object that will be JSON-serialized as the tool result.
 */
class ToolHandlers {
  constructor() {
    this._handlers = new Map();
    this._registerBuiltins();
  }

  /**
   * Register the built-in handlers.
   */
  _registerBuiltins() {
    this.register('math_eval', this._mathEval);
    this.register('echo', this._echo);
  }

  /**
   * Register a handler function for a tool name.
   *
   * @param {string} name - Tool name
   * @param {Function} fn - Handler function: async (params) => result
   */
  register(name, fn) {
    if (typeof fn !== 'function') {
      throw new Error(`Handler for "${name}" must be a function`);
    }
    this._handlers.set(name, fn);
  }

  /**
   * Get a handler function by tool name.
   *
   * @param {string} name - Tool name
   * @returns {Function|undefined} Handler function or undefined if not found
   */
  get(name) {
    return this._handlers.get(name);
  }

  /**
   * Check if a handler is registered.
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._handlers.has(name);
  }

  /**
   * Built-in: math_eval
   * Evaluates a mathematical expression using mathjs (safe, no eval()).
   *
   * @param {Object} params
   * @param {string} params.expression - Math expression to evaluate
   * @returns {Object} { result, expression }
   */
  async _mathEval(params) {
    const { expression } = params;
    if (!expression || typeof expression !== 'string') {
      throw new Error('math_eval requires a non-empty string "expression" parameter');
    }
    const result = evaluate(expression);
    return {
      expression,
      result: typeof result === 'object' ? result.toString() : result
    };
  }

  /**
   * Built-in: echo
   * Returns the input parameters as-is. Useful for testing tool calling.
   *
   * @param {Object} params - Any parameters
   * @returns {Object} { echoed: params }
   */
  async _echo(params) {
    return { echoed: params };
  }
}

module.exports = ToolHandlers;
