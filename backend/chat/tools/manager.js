'use strict';

const ToolRegistry = require('./registry');
const ToolExecutor = require('./executor');
const ToolHandlers = require('./handlers');
const BUILTINS_MANIFEST = require('./builtins-manifest');

// Build a lookup map from the manifest for fast name resolution
const MANIFEST_BY_NAME = new Map(BUILTINS_MANIFEST.map(t => [t.name, t]));

/**
 * ToolManager - Coordinates tool registry, handlers, and executor.
 *
 * Responsibilities:
 * - Loads tool definitions from the builtins manifest, activated by name in config
 * - Applies optional description overrides from config
 * - Exposes global tool settings (max_iterations, timeout)
 * - Provides a single entry point for tool operations
 *
 * Always initialises (even with no config) so /api/tools/available is always available.
 */
class ToolManager {
  /**
   * @param {Object} toolsConfig - The `tools` section from the processed config (may be empty)
   */
  constructor(toolsConfig) {
    this._config = toolsConfig || {};
    this.registry = new ToolRegistry();
    this.handlers = new ToolHandlers();
    this.executor = new ToolExecutor(this.registry, this.handlers);
  }

  /**
   * Load tools from the config's registry array.
   * Each entry is a name-only activation: { name, description? }.
   * Full schema is resolved from the builtins manifest.
   * Skips unknown names with a warning. Warns on deprecated extra fields.
   */
  loadTools() {
    const configEntries = this._config.registry || [];
    let loaded = 0;

    for (const entry of configEntries) {
      const { name, description, ...extra } = entry;

      if (!name) {
        console.warn('⚠️  ToolManager: Skipping registry entry with no name');
        continue;
      }

      const manifestDef = MANIFEST_BY_NAME.get(name);
      if (!manifestDef) {
        console.warn(`⚠️  ToolManager: Unknown builtin "${name}" — not in manifest, skipping`);
        continue;
      }

      // Warn about deprecated extra fields (old full-definition format)
      const extraKeys = Object.keys(extra);
      if (extraKeys.length > 0) {
        console.warn(`⚠️  ToolManager: Registry entry "${name}" contains deprecated fields: ${extraKeys.join(', ')}. These are ignored — schemas come from the manifest.`);
      }

      // Build the tool definition: manifest base + optional description override
      const toolDef = { ...manifestDef };
      if (description) {
        toolDef.description = description;
      }

      try {
        this.registry.register(toolDef);
        loaded++;
      } catch (err) {
        console.warn(`⚠️  ToolManager: Failed to register tool "${name}": ${err.message}`);
      }
    }

    if (loaded > 0) {
      console.log(`🔧 ToolManager: Loaded ${loaded} tool(s): ${this.registry.list().map(t => t.name).join(', ')}`);
    }

    return loaded;
  }

  /**
   * Check if tool calling is enabled (at least one tool registered).
   *
   * @returns {boolean}
   */
  isEnabled() {
    return this.registry.list().length > 0;
  }

  /**
   * Check if global opt-in is active.
   * When true, all configured tools are offered to every response rule
   * regardless of whether the rule has tools.enabled: true.
   *
   * @returns {boolean}
   */
  isGlobal() {
    return this._config.apply_globally === true;
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
