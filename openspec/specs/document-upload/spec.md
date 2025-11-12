# document-upload Specification

## Purpose
TBD - created by archiving change enhance-document-upload. Update Purpose after archive.
## Requirements
### Requirement: Raw Document Upload with Transformation
The system SHALL accept raw JSON documents with a transformation schema and convert them to the standardized `{id, text, metadata}` format before processing.

#### Scenario: Upload raw documents with transformation schema
- **GIVEN** a POST request to `/api/collections/:name/documents` with `raw_documents` array and `schema` object
- **AND** the schema contains `text_fields`, optional `text_separator`, `metadata_fields`, `metadata_static`, and `id_field`
- **WHEN** the endpoint processes the request
- **THEN** the documents are transformed using `transformDocuments(raw_documents, schema)`
- **AND** the transformed documents are processed through the existing embedding pipeline
- **AND** the response includes `transformed: true`

#### Scenario: Transformation with custom schema
- **GIVEN** raw documents with nested fields like `{title, ingredients: [], instructions}`
- **AND** a schema specifying how to extract and format these fields
- **WHEN** transformation occurs
- **THEN** arrays are flattened, objects are stringified, and text fields are concatenated
- **AND** the result matches the `{id, text, metadata}` format expected by embedding generation

#### Scenario: Transformation error handling
- **GIVEN** raw documents that fail transformation (e.g., all text_fields missing)
- **WHEN** `transformDocuments()` throws an error
- **THEN** the endpoint returns 400 Bad Request
- **AND** the response includes `error: "Document transformation failed"` and the original error message

### Requirement: Schema Persistence
The system SHALL optionally persist transformation schemas in collection metadata for reuse.

#### Scenario: Save schema when requested
- **GIVEN** a request with `raw_documents`, `schema`, and `save_schema: true`
- **WHEN** documents are successfully uploaded
- **THEN** the schema is saved to collection metadata via `updateCollectionMetadata()`
- **AND** the schema includes `created_at` timestamp (if new) and `last_used` timestamp
- **AND** the response includes `schema_saved: true`

#### Scenario: Schema persistence failure is non-fatal
- **GIVEN** a request with `save_schema: true`
- **AND** the RAG service doesn't support metadata or persistence fails
- **WHEN** `updateCollectionMetadata()` throws an error
- **THEN** the document upload still succeeds (200 OK)
- **AND** the response includes `schema_saved: false`
- **AND** the response includes `schema_warning` with the error message
- **AND** a warning is logged to console

#### Scenario: Skip schema persistence when not requested
- **GIVEN** a request with `raw_documents` and `schema` but `save_schema` is false or omitted
- **WHEN** documents are uploaded
- **THEN** the schema is not persisted
- **AND** the response does not include `schema_saved` field

### Requirement: Parameter Mutual Exclusivity
The system SHALL enforce mutual exclusivity between `documents` and `raw_documents` parameters.

#### Scenario: Reject both parameters provided
- **GIVEN** a request with both `documents` and `raw_documents` in the body
- **WHEN** the endpoint validates parameters
- **THEN** the request is rejected with 400 Bad Request
- **AND** the error message is "Provide either documents or raw_documents, not both"

#### Scenario: Accept documents parameter (existing behavior)
- **GIVEN** a request with `documents` array and no `raw_documents`
- **WHEN** the endpoint processes the request
- **THEN** the existing validation and processing flow is used
- **AND** no transformation occurs
- **AND** the response includes `transformed: false`

#### Scenario: Accept raw_documents parameter (new behavior)
- **GIVEN** a request with `raw_documents` array, `schema`, and no `documents`
- **WHEN** the endpoint processes the request
- **THEN** transformation occurs via `transformDocuments()`
- **AND** the result is passed to the existing pipeline
- **AND** the response includes `transformed: true`

### Requirement: Schema Validation for Raw Documents
The system SHALL validate that a schema is provided when raw_documents are used.

#### Scenario: Reject raw_documents without schema
- **GIVEN** a request with `raw_documents` but no `schema` parameter
- **WHEN** the endpoint validates parameters
- **THEN** the request is rejected with 400 Bad Request
- **AND** the error message is "schema is required when using raw_documents"

#### Scenario: Validate raw_documents is an array
- **GIVEN** a request with `raw_documents` as a non-array value
- **WHEN** the endpoint validates parameters
- **THEN** the request is rejected with 400 Bad Request
- **AND** the error message is "raw_documents must be an array"

### Requirement: Backward Compatibility
The system SHALL maintain full backward compatibility with the existing document upload API.

#### Scenario: Existing upload format works unchanged
- **GIVEN** a request with the traditional `documents` array containing `{id, text, metadata}` objects
- **AND** required parameters `service`, `embedding_connection`, `embedding_model`
- **WHEN** the endpoint processes the request
- **THEN** the documents are processed exactly as before
- **AND** embeddings are generated and documents are uploaded
- **AND** the response format matches the original (with `transformed: false` added)

#### Scenario: No changes to embedding generation
- **GIVEN** any valid documents (transformed or pre-formatted)
- **WHEN** embedding generation occurs
- **THEN** the existing `generateEmbeddings()` function is used unchanged
- **AND** text is extracted from `doc.text` field
- **AND** embeddings are generated using the specified connection and model

#### Scenario: No changes to RAG upload
- **GIVEN** documents with embeddings attached
- **WHEN** upload to RAG service occurs
- **THEN** the existing `addDocuments()` function is used unchanged
- **AND** documents are sent to the configured RAG service
- **AND** the service returns count, service name, and collection name

### Requirement: Enhanced Response Format
The system SHALL include transformation and schema persistence status in the response.

#### Scenario: Response for transformed documents with saved schema
- **GIVEN** a successful upload with `raw_documents`, `schema`, and `save_schema: true`
- **WHEN** the response is returned
- **THEN** it includes `transformed: true`, `schema_saved: true`
- **AND** it includes existing fields: `count`, `service`, `collection`

#### Scenario: Response for traditional documents
- **GIVEN** a successful upload with `documents` parameter
- **WHEN** the response is returned
- **THEN** it includes `transformed: false`
- **AND** it includes existing fields: `count`, `service`, `collection`
- **AND** no `schema_saved` field is present

#### Scenario: Response for schema persistence failure
- **GIVEN** transformation succeeded but schema persistence failed
- **WHEN** the response is returned
- **THEN** it includes `transformed: true`, `schema_saved: false`
- **AND** it includes `schema_warning` with the error message
- **AND** HTTP status is 200 OK (upload succeeded)

### Requirement: Request Parameter Structure
The system SHALL accept both traditional and enhanced request formats with clear validation.

#### Scenario: Traditional request format
- **GIVEN** a POST request to `/api/collections/:name/documents`
- **WHEN** the body contains `documents`, `service`, `embedding_connection`, `embedding_model`
- **THEN** all required parameters are validated as before
- **AND** the request is processed successfully

#### Scenario: Enhanced request format
- **GIVEN** a POST request to `/api/collections/:name/documents`
- **WHEN** the body contains `raw_documents`, `schema`, `service`, `embedding_connection`, `embedding_model`
- **AND** optionally `save_schema: true`
- **THEN** all parameters are validated
- **AND** transformation occurs before processing
- **AND** schema is optionally persisted

#### Scenario: Validate required parameters regardless of format
- **GIVEN** any request (documents or raw_documents)
- **WHEN** `service` is missing
- **THEN** the request is rejected with 400 Bad Request and error "Service name is required"
- **WHEN** `embedding_connection` is missing
- **THEN** the request is rejected with 400 Bad Request and error "embedding_connection is required"
- **WHEN** `embedding_model` is missing
- **THEN** the request is rejected with 400 Bad Request and error "embedding_model is required"

