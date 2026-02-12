'use strict';

const ToolRegistry = require('./registry');
const ToolExecutor = require('./executor');
const ToolHandlers = require('./handlers');

/**
 * ToolManager - Coordinates tool registry, handlers, and executor.
 *
 * Responsibilities:
 * - Loads tool definitions from config.tools.registry
 * - Exposes global tool settings (enabled, max_iterations, timeout)
 * - Provides a single entry point for tool operations
 */
class ToolManager {
  /**
   * @param {Object} toolsConfig - The `tools` section from the processed config
   */
  constructor(toolsConfig) {
    this._config = toolsConfig || {};
    this.registry = new ToolRegistry();
    this.handlers = new ToolHandlers();
    this.executor = new ToolExecutor(this.registry, this.handlers);
  }

  /**
   * Load tools from the config's registry array.
   * Skips tools with errors and logs warnings.
   */
  loadTools() {
    const toolDefs = this._config.registry || [];
    let loaded = 0;

    for (const toolDef of toolDefs) {
      try {
        this.registry.register(toolDef);
        loaded++;
      } catch (err) {
        console.warn(`⚠️  ToolManager: Failed to register tool "${toolDef.name || '(unnamed)'}": ${err.message}`);
      }
    }

    if (loaded > 0) {
      console.log(`🔧 ToolManager: Loaded ${loaded} tool(s): ${this.registry.list().map(t => t.name).join(', ')}`);
    }

    return loaded;
  }

  /**
   * Check if tool calling is globally enabled.
   *
   * @returns {boolean}
   */
  isEnabled() {
    return this._config.enabled === true;
  }

  /**
   * Get the global maximum tool calling iterations.
   *
   * @returns {number} Default: 5
   */
  getMaxIterations() {
    return this._config.max_iterations || 5;
  }

  /**
   * Get the default tool execution timeout in milliseconds.
   *
   * @returns {number} Default: 30000 (30 seconds)
   */
  getDefaultTimeout() {
    return this._config.default_timeout_ms || 30000;
  }
}

module.exports = ToolManager;
