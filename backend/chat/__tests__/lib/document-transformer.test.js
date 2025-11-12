const { transformDocuments } = require('../../lib/document-transformer');

describe('transformDocuments', () => {
  describe('Basic Transformation', () => {
    it('should transform documents with all fields present', () => {
      const documents = [
        { id: 'doc-1', title: 'Hello', content: 'World' }
      ];
      const schema = {
        text_fields: ['title', 'content'],
        text_separator: ' - ',
        id_field: 'id'
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result).toEqual([
        {
          id: 'doc-1',
          text: 'Hello - World',
          metadata: {}
        }
      ]);
    });

    it('should use custom text separator', () => {
      const documents = [
        { title: 'Line 1', content: 'Line 2', summary: 'Line 3' }
      ];
      const schema = {
        text_fields: ['title', 'content', 'summary'],
        text_separator: '\n\n'
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('Line 1\n\nLine 2\n\nLine 3');
    });

    it('should use default text separator when not specified', () => {
      const documents = [
        { title: 'Title', content: 'Content' }
      ];
      const schema = {
        text_fields: ['title', 'content']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('Title\n\nContent');
    });
  });

  describe('Array Field Handling', () => {
    it('should flatten array fields to comma-separated strings', () => {
      const documents = [
        { ingredients: ['flour', 'sugar', 'eggs'] }
      ];
      const schema = {
        text_fields: ['ingredients']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('flour, sugar, eggs');
    });

    it('should preserve arrays in metadata', () => {
      const documents = [
        { title: 'Recipe', tags: ['dessert', 'quick', 'easy'] }
      ];
      const schema = {
        text_fields: ['title'],
        metadata_fields: ['tags']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].metadata.tags).toEqual(['dessert', 'quick', 'easy']);
    });
  });

  describe('Nested Object Handling', () => {
    it('should stringify nested objects in text fields', () => {
      const documents = [
        { author: { name: 'John', role: 'Chef' } }
      ];
      const schema = {
        text_fields: ['author']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('{"name":"John","role":"Chef"}');
    });

    it('should stringify nested objects in metadata', () => {
      const documents = [
        { title: 'Recipe', details: { prep: '10m', cook: '20m' } }
      ];
      const schema = {
        text_fields: ['title'],
        metadata_fields: ['details']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].metadata.details).toBe('{"prep":"10m","cook":"20m"}');
    });
  });

  describe('ID Generation', () => {
    it('should generate UUID when id_field not specified', () => {
      const documents = [{ title: 'Test' }];
      const schema = { text_fields: ['title'] };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate UUID when id_field specified but value missing', () => {
      const documents = [{ title: 'Test' }];
      const schema = {
        text_fields: ['title'],
        id_field: 'id'
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should use existing id when present', () => {
      const documents = [{ id: 'doc-123', title: 'Test' }];
      const schema = {
        text_fields: ['title'],
        id_field: 'id'
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].id).toBe('doc-123');
    });

    it('should generate unique UUIDs for multiple documents', () => {
      const documents = [
        { title: 'Doc 1' },
        { title: 'Doc 2' },
        { title: 'Doc 3' }
      ];
      const schema = { text_fields: ['title'] };
      
      const result = transformDocuments(documents, schema);
      
      const ids = result.map(doc => doc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Metadata Collection', () => {
    it('should extract dynamic metadata fields', () => {
      const documents = [
        { title: 'Recipe', category: 'dessert', author: 'John' }
      ];
      const schema = {
        text_fields: ['title'],
        metadata_fields: ['category', 'author']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].metadata).toEqual({
        category: 'dessert',
        author: 'John'
      });
    });

    it('should apply static metadata to all documents', () => {
      const documents = [
        { title: 'Doc 1' },
        { title: 'Doc 2' }
      ];
      const schema = {
        text_fields: ['title'],
        metadata_static: { doc_type: 'article', source: 'api' }
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].metadata).toEqual({ doc_type: 'article', source: 'api' });
      expect(result[1].metadata).toEqual({ doc_type: 'article', source: 'api' });
    });

    it('should merge static and dynamic metadata', () => {
      const documents = [
        { title: 'Recipe', category: 'dessert' }
      ];
      const schema = {
        text_fields: ['title'],
        metadata_fields: ['category'],
        metadata_static: { source: 'api' }
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].metadata).toEqual({
        source: 'api',
        category: 'dessert'
      });
    });

    it('should skip missing metadata fields', () => {
      const documents = [
        { title: 'Recipe', category: 'dessert' }
      ];
      const schema = {
        text_fields: ['title'],
        metadata_fields: ['category', 'author', 'rating']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].metadata).toEqual({ category: 'dessert' });
    });
  });

  describe('Graceful Missing Field Handling', () => {
    it('should skip missing text fields gracefully', () => {
      const documents = [
        { title: 'Hello' }
      ];
      const schema = {
        text_fields: ['title', 'content', 'summary']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('Hello');
    });

    it('should throw error when all text fields missing', () => {
      const documents = [
        { id: 'doc-1', unrelated: 'data' }
      ];
      const schema = {
        text_fields: ['title', 'content']
      };
      
      expect(() => transformDocuments(documents, schema))
        .toThrow('No text content generated from text_fields');
    });

    it('should skip null and undefined values', () => {
      const documents = [
        { title: 'Hello', content: null, summary: undefined }
      ];
      const schema = {
        text_fields: ['title', 'content', 'summary']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('Hello');
    });

    it('should skip empty and whitespace-only strings', () => {
      const documents = [
        { title: 'Hello', content: '', summary: '   ' }
      ];
      const schema = {
        text_fields: ['title', 'content', 'summary']
      };
      
      const result = transformDocuments(documents, schema);
      
      expect(result[0].text).toBe('Hello');
    });
  });

  describe('Schema Validation', () => {
    it('should throw error when text_fields missing', () => {
      const documents = [{ title: 'Test' }];
      const schema = {};
      
      expect(() => transformDocuments(documents, schema))
        .toThrow('Schema must include text_fields array');
    });

    it('should throw error when text_fields is empty', () => {
      const documents = [{ title: 'Test' }];
      const schema = { text_fields: [] };
      
      expect(() => transformDocuments(documents, schema))
        .toThrow('text_fields cannot be empty');
    });

    it('should throw error when text_fields is not an array', () => {
      const documents = [{ title: 'Test' }];
      const schema = { text_fields: 'title' };
      
      expect(() => transformDocuments(documents, schema))
        .toThrow('text_fields must be an array');
    });

    it('should throw error when metadata_fields is not an array', () => {
      const documents = [{ title: 'Test' }];
      const schema = {
        text_fields: ['title'],
        metadata_fields: 'category'
      };
      
      expect(() => transformDocuments(documents, schema))
        .toThrow('metadata_fields must be an array');
    });

    it('should accept valid minimal schema', () => {
      const documents = [{ title: 'Test' }];
      const schema = { text_fields: ['title'] };
      
      expect(() => transformDocuments(documents, schema)).not.toThrow();
    });
  });

  describe('Stateless Pure Function', () => {
    it('should produce identical output for same input (excluding UUIDs)', () => {
      const documents = [{ id: 'doc-1', title: 'Test' }];
      const schema = {
        text_fields: ['title'],
        id_field: 'id'
      };
      
      const result1 = transformDocuments(documents, schema);
      const result2 = transformDocuments(documents, schema);
      
      expect(result1).toEqual(result2);
    });

    it('should not mutate input documents', () => {
      const documents = [{ id: 'doc-1', title: 'Test' }];
      const originalDocs = JSON.parse(JSON.stringify(documents));
      const schema = {
        text_fields: ['title'],
        id_field: 'id'
      };
      
      transformDocuments(documents, schema);
      
      expect(documents).toEqual(originalDocs);
    });

    it('should not mutate input schema', () => {
      const documents = [{ title: 'Test' }];
      const schema = { text_fields: ['title'] };
      const originalSchema = JSON.parse(JSON.stringify(schema));
      
      transformDocuments(documents, schema);
      
      expect(schema).toEqual(originalSchema);
    });
  });
});

