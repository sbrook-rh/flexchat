const crypto = require('crypto');

/**
 * Transform raw JSON documents to {id, text, metadata} format
 * @param {Array<Object>} documents - Raw JSON documents
 * @param {Object} schema - Transformation schema
 * @param {string[]} schema.text_fields - Fields to concatenate into text
 * @param {string} [schema.text_separator='\n\n'] - Separator between text fields
 * @param {string[]} [schema.metadata_fields=[]] - Fields to extract as metadata
 * @param {Object} [schema.metadata_static={}] - Static metadata to apply to all documents
 * @param {string} [schema.id_field] - Field to use as document ID (generates UUID if missing)
 * @returns {Array<Object>} Transformed documents with {id, text, metadata} structure
 * @throws {Error} If schema is invalid or transformation fails
 */
function transformDocuments(documents, schema) {
  validateSchema(schema);
  
  const textSeparator = schema.text_separator || '\n\n';
  const metadataFields = schema.metadata_fields || [];
  const staticMetadata = schema.metadata_static || {};
  
  return documents.map(doc => {
    const id = extractId(doc, schema.id_field);
    const text = composeText(doc, schema.text_fields, textSeparator);
    const metadata = collectMetadata(doc, metadataFields, staticMetadata);
    
    return { id, text, metadata };
  });
}

/**
 * Validate transformation schema
 * @param {Object} schema - Schema to validate
 * @throws {Error} If schema is invalid
 */
function validateSchema(schema) {
  if (!schema.text_fields) {
    throw new Error('Schema must include text_fields array');
  }
  
  if (!Array.isArray(schema.text_fields)) {
    throw new Error('text_fields must be an array');
  }
  
  if (schema.text_fields.length === 0) {
    throw new Error('text_fields cannot be empty');
  }
  
  if (schema.metadata_fields !== undefined && !Array.isArray(schema.metadata_fields)) {
    throw new Error('metadata_fields must be an array');
  }
}

/**
 * Extract or generate document ID
 * @param {Object} doc - Source document
 * @param {string} idField - Field name to use as ID
 * @returns {string} Document ID
 */
function extractId(doc, idField) {
  if (!idField || !doc[idField]) {
    return crypto.randomUUID();
  }
  return String(doc[idField]);
}

/**
 * Format a value for text or metadata
 * @param {*} value - Value to format
 * @returns {string|null} Formatted value or null if empty
 */
function formatValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value).trim();
}

/**
 * Compose text field from document fields
 * @param {Object} doc - Source document
 * @param {string[]} textFields - Fields to extract
 * @param {string} separator - Separator between fields
 * @returns {string} Composed text
 * @throws {Error} If no text content can be generated
 */
function composeText(doc, textFields, separator) {
  const parts = textFields
    .map(field => formatValue(doc[field]))
    .filter(value => value !== null && value !== '');
  
  if (parts.length === 0) {
    throw new Error('No text content generated from text_fields');
  }
  
  return parts.join(separator);
}

/**
 * Collect metadata from document
 * @param {Object} doc - Source document
 * @param {string[]} metadataFields - Fields to extract
 * @param {Object} staticMetadata - Static metadata to merge
 * @returns {Object} Collected metadata
 */
function collectMetadata(doc, metadataFields, staticMetadata) {
  const metadata = { ...staticMetadata };
  
  for (const field of metadataFields) {
    if (doc[field] !== undefined && doc[field] !== null) {
      const value = doc[field];
      
      if (Array.isArray(value)) {
        metadata[field] = JSON.stringify(value);
      } else if (typeof value === 'object') {
        metadata[field] = JSON.stringify(value);
      } else {
        metadata[field] = value;
      }
    }
  }
  
  return metadata;
}

module.exports = { transformDocuments };

