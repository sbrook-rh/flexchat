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
    this.register('get_current_datetime', this._getCurrentDatetime);
    this.register('generate_uuid', this._generateUuid);
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
   * Built-in: get_current_datetime
   * Returns the current date and time, optionally in a requested timezone.
   *
   * @param {Object} params
   * @param {string} [params.timezone] - IANA timezone name (e.g. "Europe/London"). Defaults to UTC.
   * @returns {Object} { iso, date, time, timezone }
   */
  async _getCurrentDatetime(params) {
    const { timezone } = params || {};
    const tz = timezone || 'UTC';

    let resolvedTz = 'UTC';
    try {
      // Validate timezone by attempting to use it — throws RangeError if invalid
      Intl.DateTimeFormat('en', { timeZone: tz });
      resolvedTz = tz;
    } catch {
      // Fall back to UTC silently
    }

    const now = new Date();

    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: resolvedTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);

    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: resolvedTz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);

    const date = `${dateParts.find(p => p.type === 'year').value}-${dateParts.find(p => p.type === 'month').value}-${dateParts.find(p => p.type === 'day').value}`;
    const time = `${timeParts.find(p => p.type === 'hour').value}:${timeParts.find(p => p.type === 'minute').value}:${timeParts.find(p => p.type === 'second').value}`;

    return {
      iso: now.toISOString(),
      date,
      time,
      timezone: resolvedTz
    };
  }

  /**
   * Built-in: generate_uuid
   * Returns a cryptographically random UUID v4.
   *
   * @returns {Object} { uuid }
   */
  async _generateUuid() {
    return { uuid: crypto.randomUUID() };
  }
}

module.exports = ToolHandlers;
