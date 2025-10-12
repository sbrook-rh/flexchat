const RetrievalProvider = require('./RetrievalProvider');

/**
 * VectorProvider - Abstract base class for vector database providers
 * Extends RetrievalProvider with embedding and vector search capabilities
 */
class VectorProvider extends RetrievalProvider {
  constructor(config, aiService) {
    super(config);
    if (this.constructor === VectorProvider) {
      throw new Error('VectorProvider is an abstract class and cannot be instantiated directly');
    }
    this.aiService = aiService;
  }

  /**
   * Generate embeddings for text
   * @param {string|Array} text - Text or array of texts to embed
   * @returns {Promise<Array>} Array of embedding vectors
   */
  async generateEmbeddings(text) {
    if (!this.aiService) {
      throw new Error('AIService is required for embedding generation');
    }

    const embeddingProvider = this.config.embedding_provider;
    const embeddingModel = this.config.embedding_model;

    // Set the active provider for embeddings
    await this.aiService.setActiveProvider(embeddingProvider);
    
    // Generate embeddings
    return await this.aiService.generateEmbeddings(text, { model: embeddingModel });
  }

  /**
   * Query the vector database with similarity search
   * @param {string} text - Query text
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of results with text, distance/score, and metadata
   */
  async query(text, options = {}) {
    const top_k = options.top_k || this.config.top_k || 3;
    
    // Generate embedding for query text
    const embeddings = await this.generateEmbeddings(text);
    const queryEmbedding = Array.isArray(embeddings) ? embeddings[0] : embeddings;
    
    // Perform vector search
    return await this.vectorSearch(queryEmbedding, top_k, options);
  }

  /**
   * Perform vector similarity search
   * @param {Array} embedding - Query embedding vector
   * @param {number} top_k - Number of results to return
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} Array of results
   */
  async vectorSearch(embedding, top_k, options = {}) {
    throw new Error('vectorSearch() must be implemented by subclass');
  }

  /**
   * Add documents to the vector database
   * @param {Array} documents - Array of documents to add
   * @returns {Promise<Object>} Result of the operation
   */
  async addDocuments(documents) {
    throw new Error('addDocuments() must be implemented by subclass');
  }

  /**
   * Delete documents from the vector database
   * @param {Array} ids - Array of document IDs to delete
   * @returns {Promise<Object>} Result of the operation
   */
  async deleteDocuments(ids) {
    throw new Error('deleteDocuments() must be implemented by subclass');
  }

  /**
   * Get document count in the collection
   * @returns {Promise<number>} Number of documents
   */
  async getDocumentCount() {
    throw new Error('getDocumentCount() must be implemented by subclass');
  }

  /**
   * Convert distance to similarity score (0-1 range where 1 is most similar)
   * @param {number} distance - Distance value
   * @param {string} metric - Distance metric (euclidean, cosine, etc.)
   * @returns {number} Similarity score
   */
  distanceToScore(distance, metric = 'cosine') {
    // Different metrics need different conversions
    switch (metric.toLowerCase()) {
      case 'cosine':
        // Cosine distance: 0 = identical, 2 = opposite
        return 1 - (distance / 2);
      case 'euclidean':
        // Euclidean: smaller is better, no fixed upper bound
        return 1 / (1 + distance);
      case 'dot':
        // Dot product: higher is better
        return distance;
      default:
        // Default: assume smaller distance = more similar
        return 1 / (1 + distance);
    }
  }

  /**
   * Normalize results to standard format
   * @param {Array} results - Raw results from vector database
   * @returns {Array} Normalized results
   */
  normalizeResults(results) {
    return results.map(result => ({
      text: result.text || result.content || result.document,
      distance: result.distance || result.score,
      score: this.distanceToScore(result.distance || result.score),
      metadata: result.metadata || {}
    }));
  }
}

module.exports = VectorProvider;

