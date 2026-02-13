'use strict';

/**
 * Builtins Manifest — static source of truth for all available builtin tool definitions.
 *
 * Config files activate tools by name only. The full schema (description, parameters,
 * handler, type) lives here. This ensures no duplication and no drift between code and config.
 *
 * To add a new builtin:
 *   1. Add its entry here
 *   2. Register its handler in handlers.js
 */
const BUILTINS_MANIFEST = [
  {
    name: 'calculator',
    description: 'Evaluate a mathematical expression and return the result. Supports arithmetic, algebra, trigonometry, and basic statistics.',
    type: 'builtin',
    handler: 'math_eval',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "The mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', 'sin(pi/2)')"
        }
      },
      required: ['expression']
    }
  },
  {
    name: 'get_current_datetime',
    description: 'Get the current date and time. The model has a training cutoff and cannot know the real current time — use this tool when the user asks about the current date, time, or day of the week.',
    type: 'builtin',
    handler: 'get_current_datetime',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: "IANA timezone name (e.g., 'Europe/London', 'America/New_York', 'Asia/Tokyo'). Defaults to UTC if omitted or unrecognised."
        }
      },
      required: []
    }
  },
  {
    name: 'generate_uuid',
    description: 'Generate a cryptographically random UUID (version 4). Models can produce plausible-looking UUIDs but they are not truly random — use this tool when a real unique identifier is needed.',
    type: 'builtin',
    handler: 'generate_uuid',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

module.exports = BUILTINS_MANIFEST;
