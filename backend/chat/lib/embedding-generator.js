const { registry } = require('../ai-providers/providers');

/**
 * Resolve embedding model to use for a given LLM connection.
 * Priority:
 * 1) Explicit embeddingModel on the LLM connection config (if present)
 * 2) Global embedding preset when it references this connection (config.embedding.llm === connectionId)
 * 3) Provider default embedding model
 */
function resolveEmbeddingModel(connectionId, llmConfig, fullConfig) {
  // 1) Connection-scoped embedding model (preferred if present)
  if (llmConfig && llmConfig.embeddingModel) {
    return llmConfig.embeddingModel;
  }

  // 2) Global embedding preset if it targets this connection
  if (
    fullConfig &&
    fullConfig.embedding &&
    fullConfig.embedding.llm === connectionId &&
    fullConfig.embedding.model
  ) {
    return fullConfig.embedding.model;
  }

  // 3) Provider default embedding model
  try {
    const provider = registry.createProvider(llmConfig.provider, llmConfig);
    const defaults = provider.getDefaultModels ? provider.getDefaultModels() : null;
    if (defaults && defaults.embedding) {
      return defaults.embedding;
    }
  } catch {
    // fall through to null
  }

  return null;
}

/**
 * Generate embeddings using the configured LLM connection.
 * @param {string[]} texts - Array of texts to embed
 * @param {string} connectionId - Key of LLM connection in config.llms
 * @param {object} config - Full processed config object
 * @param {string} [explicitModel] - Optional: explicitly specify the model (bypasses resolution)
 * @returns {Promise<number[][]>} embeddings
 */
async function generateEmbeddings(texts, connectionId, config, explicitModel = null) {
  if (!Array.isArray(texts)) {
    throw new Error('texts must be an array of strings');
  }
  if (!connectionId) {
    throw new Error('connectionId is required');
  }
  if (!config || !config.llms || !config.llms[connectionId]) {
    throw new Error(`LLM connection "${connectionId}" not found`);
  }

  const llmConfig = config.llms[connectionId];
  const providerName = llmConfig.provider;
  if (!providerName) {
    throw new Error(`LLM connection "${connectionId}" is missing provider`);
  }

  // Create provider instance
  const provider = registry.createProvider(providerName, llmConfig);

  // Use explicit model if provided, otherwise resolve
  let embeddingModel = explicitModel;
  if (!embeddingModel) {
    embeddingModel = resolveEmbeddingModel(connectionId, llmConfig, config);
    if (!embeddingModel) {
      throw new Error(
        `No embedding model resolved for connection "${connectionId}" (${providerName}). ` +
        `Configure an embedding model on the connection or set a default in config.embedding.`
      );
    }
  }

  // Delegate to provider
  const embeddings = await provider.generateEmbeddings(texts, embeddingModel);
  return embeddings;
}

module.exports = {
  generateEmbeddings,
  resolveEmbeddingModel,
};


