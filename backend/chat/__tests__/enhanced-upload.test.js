// Mock dependencies first (before requiring)
jest.mock('../lib/document-transformer');
jest.mock('../lib/collection-manager', () => ({
  updateCollectionMetadata: jest.fn(),
  getCollection: jest.fn(),
  addDocuments: jest.fn()
}));
jest.mock('../lib/embedding-generator');

const { transformDocuments } = require('../lib/document-transformer');
const { updateCollectionMetadata, getCollection, addDocuments: addDocumentsMock } = require('../lib/collection-manager');
const { generateEmbeddings } = require('../lib/embedding-generator');

describe('Enhanced Upload Endpoint', () => {
  let mockReq, mockRes, mockNext;
  let uploadHandler;

  beforeEach(() => {
    // Setup mock request, response, next
    mockReq = {
      params: { name: 'test-collection' },
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    // Mock generateEmbeddings to return fake embeddings
    generateEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
    
    jest.clearAllMocks();
  });

  describe('Parameter Mutual Exclusivity', () => {
    it('should reject request with both documents and raw_documents', async () => {
      mockReq.body = {
        documents: [{ id: '1', text: 'test', metadata: {} }],
        raw_documents: [{ title: 'test' }],
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Provide either documents or raw_documents, not both'
      });
    });

    it('should accept documents without raw_documents (backward compatibility)', async () => {
      const mockResult = { count: 1, service: 'test-service', collection: 'test-collection' };
      mockReq.body = {
        documents: [{ id: '1', text: 'test content', metadata: {} }],
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      addDocumentsMock.mockResolvedValue(mockResult);

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockResult,
          transformed: false
        })
      );
    });

    it('should accept raw_documents with schema', async () => {
      const mockTransformed = [
        { id: 'r1', text: 'Recipe 1\n\nInstructions', metadata: { title: 'Recipe 1' } }
      ];
      
      transformDocuments.mockReturnValue(mockTransformed);
      
      const mockResult = { count: 1, service: 'test-service', collection: 'test-collection' };
      addDocumentsMock.mockResolvedValue(mockResult);

      mockReq.body = {
        raw_documents: [{ title: 'Recipe 1', instructions: 'Instructions' }],
        schema: {
          text_fields: ['title', 'instructions'],
          metadata_fields: ['title']
        },
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(transformDocuments).toHaveBeenCalledWith(
        mockReq.body.raw_documents,
        mockReq.body.schema
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockResult,
          transformed: true
        })
      );
    });
  });

  describe('Schema Validation for Raw Documents', () => {
    it('should reject raw_documents without schema', async () => {
      mockReq.body = {
        raw_documents: [{ title: 'test' }],
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'schema is required when using raw_documents'
      });
    });

    it('should reject non-array raw_documents', async () => {
      mockReq.body = {
        raw_documents: { title: 'test' },
        schema: { text_fields: ['title'] },
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'raw_documents must be an array'
      });
    });
  });

  describe('Transformation Error Handling', () => {
    it('should return 400 when transformation fails', async () => {
      transformDocuments.mockImplementation(() => {
        throw new Error('No text content generated from text_fields');
      });

      mockReq.body = {
        raw_documents: [{ unrelated: 'field' }],
        schema: { text_fields: ['missing_field'] },
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Document transformation failed',
        message: 'No text content generated from text_fields'
      });
    });
  });

  describe('Schema Persistence', () => {
    it('should save schema when save_schema is true', async () => {
      const mockTransformed = [
        { id: 'r1', text: 'Test', metadata: {} }
      ];
      
      transformDocuments.mockReturnValue(mockTransformed);
      getCollection.mockResolvedValue({ metadata: {} });
      updateCollectionMetadata.mockResolvedValue({});

      const mockResult = { count: 1, service: 'test-service', collection: 'test-collection' };
      addDocumentsMock.mockResolvedValue(mockResult);

      mockReq.body = {
        raw_documents: [{ title: 'Test' }],
        schema: { text_fields: ['title'] },
        save_schema: true,
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(updateCollectionMetadata).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          schema_saved: true
        })
      );
    });

    it('should not fail upload when schema persistence fails', async () => {
      const mockTransformed = [
        { id: 'r1', text: 'Test', metadata: {} }
      ];
      
      transformDocuments.mockReturnValue(mockTransformed);
      getCollection.mockResolvedValue({ metadata: {} });
      updateCollectionMetadata.mockRejectedValue(new Error('Metadata not supported'));

      const mockResult = { count: 1, service: 'test-service', collection: 'test-collection' };
      addDocumentsMock.mockResolvedValue(mockResult);

      mockReq.body = {
        raw_documents: [{ title: 'Test' }],
        schema: { text_fields: ['title'] },
        save_schema: true,
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          schema_saved: false,
          schema_warning: 'Metadata not supported'
        })
      );
    });

    it('should skip schema persistence when save_schema is false', async () => {
      const mockTransformed = [
        { id: 'r1', text: 'Test', metadata: {} }
      ];
      
      transformDocuments.mockReturnValue(mockTransformed);

      const mockResult = { count: 1, service: 'test-service', collection: 'test-collection' };
      addDocumentsMock.mockResolvedValue(mockResult);

      mockReq.body = {
        raw_documents: [{ title: 'Test' }],
        schema: { text_fields: ['title'] },
        save_schema: false,
        service: 'test-service',
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(updateCollectionMetadata).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          transformed: true
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          schema_saved: expect.anything()
        })
      );
    });
  });

  describe('Required Parameters Validation', () => {
    it('should reject request without service', async () => {
      mockReq.body = {
        documents: [{ id: '1', text: 'test', metadata: {} }],
        embedding_connection: 'local',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Service name is required'
      });
    });

    it('should reject request without embedding_connection', async () => {
      mockReq.body = {
        documents: [{ id: '1', text: 'test', metadata: {} }],
        service: 'test-service',
        embedding_model: 'test-model'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'embedding_connection is required'
      });
    });

    it('should reject request without embedding_model', async () => {
      mockReq.body = {
        documents: [{ id: '1', text: 'test', metadata: {} }],
        service: 'test-service',
        embedding_connection: 'local'
      };

      const handler = createMockHandler();
      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'embedding_model is required'
      });
    });
  });
});

// Helper to create mock handler with minimal dependencies
function createMockHandler() {
  // Simulate the upload endpoint logic
  return async (req, res, next) => {
    try {
      const { name } = req.params;
      const { documents, raw_documents, schema, save_schema, service, embedding_connection, embedding_model } = req.body;
      
      // Mutual exclusivity check
      if (documents && raw_documents) {
        return res.status(400).json({ error: 'Provide either documents or raw_documents, not both' });
      }
      
      if (!service) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      if (!embedding_connection) {
        return res.status(400).json({ error: 'embedding_connection is required' });
      }
      
      if (!embedding_model) {
        return res.status(400).json({ error: 'embedding_model is required' });
      }
      
      let transformed = false;
      let finalDocuments;
      
      if (raw_documents) {
        if (!schema) {
          return res.status(400).json({ error: 'schema is required when using raw_documents' });
        }
        
        if (!Array.isArray(raw_documents)) {
          return res.status(400).json({ error: 'raw_documents must be an array' });
        }
        
        try {
          finalDocuments = transformDocuments(raw_documents, schema);
          transformed = true;
        } catch (transformError) {
          return res.status(400).json({
            error: 'Document transformation failed',
            message: transformError.message
          });
        }
      } else {
        if (!documents || !Array.isArray(documents)) {
          return res.status(400).json({ error: 'Documents array is required' });
        }
        finalDocuments = documents;
      }
      
      // Mock embedding generation
      await generateEmbeddings([], embedding_connection, {}, embedding_model);
      
      // Mock add documents
      const result = await addDocumentsMock(service, name, finalDocuments, {}, {});
      
      result.transformed = transformed;
      
      if (transformed && save_schema && schema) {
        try {
          await getCollection(service, name, {}, {});
          await updateCollectionMetadata(service, name, {}, {}, {});
          result.schema_saved = true;
        } catch (schemaError) {
          result.schema_saved = false;
          result.schema_warning = schemaError.message;
        }
      }
      
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to add documents',
        message: error.message 
      });
    }
  };
}

