const axios = require('axios');
const VectorProvider = require('../base/VectorProvider');

/**
 * ChromaDBProvider - Implementation for ChromaDB vector database
 */
class ChromaDBProvider extends VectorProvider {
  constructor(config, aiService) {
    super(config, aiService);
    this.baseUrl = config.url;
    this.collection = config.collection;
  }

  /**
   * Perform vector similarity search in ChromaDB
   */
  async vectorSearch(embedding, top_k, options = {}) {
    try {
      const response = await this.withRetry(async () => {
        return await axios.post(
          `${this.baseUrl}/query`,
          {
            query_embeddings: [embedding],
            n_results: top_k,
            collection: this.collection,
            include: ['metadatas', 'distances', 'documents']
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: this.config.timeout || 30000
          }
        );
      });

      // Parse ChromaDB response
      const data = response.data;
      
      if (!data || !data.metadatas || !data.metadatas[0]) {
        return [];
      }

      // Transform ChromaDB results to standard format
      const results = [];
      for (let i = 0; i < data.metadatas[0].length; i++) {
        const metadata = data.metadatas[0][i];
        const distance = data.distances[0][i];
        const document = data.documents ? data.documents[0][i] : null;
        
        results.push({
          text: metadata.text || document,
          distance: distance,
          score: this.distanceToScore(distance, 'cosine'),
          metadata: metadata
        });
      }

      return results;
    } catch (error) {
      console.error('Error querying ChromaDB:', error.message);
      throw error;
    }
  }

  /**
   * Add documents to ChromaDB
   */
  async addDocuments(documents) {
    try {
      // Generate embeddings for all documents
      const texts = documents.map(doc => doc.text);
      const embeddings = await this.generateEmbeddings(texts);
      
      // Prepare data for ChromaDB
      const ids = documents.map((doc, i) => doc.id || `doc_${Date.now()}_${i}`);
      const metadatas = documents.map(doc => ({
        text: doc.text,
        ...doc.metadata
      }));

      await axios.post(
        `${this.baseUrl}/add`,
        {
          collection: this.collection,
          ids: ids,
          embeddings: embeddings,
          metadatas: metadatas
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout || 60000
        }
      );

      return {
        success: true,
        count: documents.length
      };
    } catch (error) {
      console.error('Error adding documents to ChromaDB:', error.message);
      throw error;
    }
  }

  /**
   * Delete documents from ChromaDB
   */
  async deleteDocuments(ids) {
    try {
      await axios.post(
        `${this.baseUrl}/delete`,
        {
          collection: this.collection,
          ids: ids
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        count: ids.length
      };
    } catch (error) {
      console.error('Error deleting documents from ChromaDB:', error.message);
      throw error;
    }
  }

  /**
   * Get document count
   */
  async getDocumentCount() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/count`,
        {
          params: {
            collection: this.collection
          }
        }
      );

      return response.data.count || 0;
    } catch (error) {
      console.error('Error getting document count from ChromaDB:', error.message);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await axios.get(`${this.baseUrl}/heartbeat`, {
        timeout: 5000
      });

      return {
        status: 'healthy',
        provider: this.name,
        collection: this.collection,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // /**
  //  * Get configuration schema
  //  */
  // getConfigSchema() {
  //   return {
  //     type: 'object',
  //     properties: {
  //       url: {
  //         type: 'string',
  //         description: 'ChromaDB server URL'
  //       },
  //       collection: {
  //         type: 'string',
  //         description: 'Collection name'
  //       },
  //       embedding: {
  //         type: 'object',
  //         description: 'Embedding configuration',
  //         required: ['llm', 'model'],
  //         properties: {
  //           llm: {
  //             type: 'string',
  //             description: 'LLM provider name for embeddings'
  //           },
  //           model: {
  //             type: 'string',
  //             description: 'Model to use for embeddings'
  //           }
  //         }
  //       },
  //       timeout: {
  //         type: 'number',
  //         description: 'Request timeout in milliseconds',
  //         default: 30000
  //       },
  //       retries: {
  //         type: 'number',
  //         description: 'Number of retries for failed requests',
  //         default: 3
  //       }
  //     },
  //     required: ['url', 'collection', 'embedding']
  //   };
  // }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    
    if (!config.url) {
      errors.push('ChromaDB URL is required');
    } else if (!this.isValidUrl(config.url)) {
      errors.push('Invalid ChromaDB URL format');
    }
    
    if (!config.collection) {
      errors.push('Collection name is required');
    }
    
    if (!config.embedding || !config.embedding.llm) {
      errors.push('Embedding LLM is required (embedding.llm)');
    }
    
    if (!config.embedding || !config.embedding.model) {
      errors.push('Embedding model is required (embedding.model)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ChromaDBProvider;

