const { getProcessedConfig } = require('./config-loader');

/**
 * Validate and normalize a shared connection payload.
 * Supports new shared format and gracefully falls back to legacy shapes.
 *
 * New shared format:
 *   { connection: { provider_id, type: 'llm'|'rag', fields: { ... } } }
 * Legacy (models):
 *   { config: { ... } } with req.params.id as provider_id, type defaults to 'llm'
 * Legacy (test):
 *   { type, provider, config }
 *
 * Returns: { type, provider, processedConfig }
 */
function normalizeConnectionPayload(req) {
  // New shared format first
  if (req.body && req.body.connection) {
    const { provider_id, type, fields } = req.body.connection || {};
    if (!provider_id || !type || !fields) {
      throw new Error('connection payload must include provider_id, type, and fields');
    }
    const processedConfig = processFields(fields);
    return { type, provider: provider_id, processedConfig };
  }

  // Legacy models endpoint: /providers/:id/models { config }
  if (req.params && req.params.id && req.body && req.body.config) {
    const provider = req.params.id;
    const type = (req.query && req.query.type) || 'llm';
    const processedConfig = processFields(req.body.config);
    return { type, provider, processedConfig };
  }

  // Legacy test endpoint: { type, provider, config }
  if (req.body && req.body.type && req.body.provider && req.body.config) {
    const { type, provider, config } = req.body;
    const processedConfig = processFields(config);
    return { type, provider, processedConfig };
  }

  throw new Error('Invalid connection payload');
}

function processFields(rawFields) {
  // Reuse on-demand substitution without mutating input
  const processed = getProcessedConfig({ temp: rawFields }).temp;
  return processed;
}

module.exports = {
  normalizeConnectionPayload,
};


