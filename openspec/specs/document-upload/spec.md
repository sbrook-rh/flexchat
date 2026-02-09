# document-upload Specification

## Purpose
TBD - created by archiving change enhance-document-upload. Update Purpose after archive.
## Requirements
### Requirement: Raw Document Upload with Transformation
The system SHALL accept raw JSON documents with a transformation schema, convert them to standardized `{id, text, metadata}` format, and send text-only documents to RAG wrapper for embedding generation.

#### Scenario: Upload raw documents with transformation schema
- **GIVEN** a POST request to `/api/collections/:name/documents` with `raw_documents` array and `schema` object
- **AND** the schema contains `text_fields`, optional `text_separator`, `metadata_fields`, `metadata_static`, and `id_field`
- **WHEN** the endpoint processes the request
- **THEN** the documents are transformed using `transformDocuments(raw_documents, schema)`
- **AND** transformed documents are sent to RAG wrapper as text-only (no embedding generation in Node)
- **AND** wrapper generates embeddings internally
- **AND** the response includes `transformed: true`

#### Scenario: Transformation with custom schema
- **GIVEN** raw documents with nested fields
- **AND** a schema specifying how to extract and format these fields
- **WHEN** transformation occurs
- **THEN** arrays are flattened, objects are stringified, and text fields are concatenated
- **AND** the result matches `{id, text, metadata}` format expected by wrapper
- **AND** no `embedding` field is generated

#### Scenario: Transformation error handling
- **GIVEN** raw documents that fail transformation
- **WHEN** `transformDocuments()` throws an error
- **THEN** the endpoint returns 400 Bad Request
- **AND** the response includes `error: "Document transformation failed"` and original error message

### Requirement: Schema Persistence
The system SHALL optionally persist transformation schemas in collection metadata for reuse.

#### Scenario: Save schema when requested
- **GIVEN** a request with `raw_documents`, `schema`, and `save_schema: true`
- **WHEN** documents are successfully uploaded
- **THEN** the schema is saved to `metadata.document_schema` field via `updateCollectionMetadata()`
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
The system SHALL enforce mutual exclusivity between `documents` and `raw_documents` parameters without requiring embedding parameters.

#### Scenario: Reject both parameters provided
- **GIVEN** a request with both `documents` and `raw_documents` in body
- **WHEN** the endpoint validates parameters
- **THEN** the request is rejected with 400 Bad Request
- **AND** error message is "Provide either documents or raw_documents, not both"

#### Scenario: Accept documents parameter
- **GIVEN** a request with `documents` array and no `raw_documents`
- **WHEN** the endpoint processes the request
- **THEN** documents are sent to wrapper as text-only
- **AND** no transformation occurs
- **AND** no embedding generation in Node
- **AND** the response includes `transformed: false`

#### Scenario: Accept raw_documents parameter
- **GIVEN** a request with `raw_documents` array, `schema`, and no `documents`
- **WHEN** the endpoint processes the request
- **THEN** transformation occurs via `transformDocuments()`
- **AND** transformed documents sent to wrapper as text-only
- **AND** no embedding generation in Node
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
The system SHALL maintain document upload API structure while removing embedding generation from Node backend.

#### Scenario: Existing upload format works with simplified requirements
- **GIVEN** a request with `documents` array containing `{id, text, metadata}` objects
- **AND** required `service` parameter (no embedding parameters needed)
- **WHEN** the endpoint processes the request
- **THEN** documents are sent to wrapper without embeddings
- **AND** wrapper generates embeddings internally
- **AND** the response format matches original (with `transformed: false` added)

#### Scenario: No embedding generation in Node
- **GIVEN** any valid documents (transformed or pre-formatted)
- **WHEN** upload to RAG service occurs
- **THEN** Node backend does not call `generateEmbeddings()` function
- **AND** documents sent with only `text` and `metadata` fields
- **AND** wrapper handles all embedding generation

#### Scenario: RAG upload payload simplified
- **GIVEN** documents ready for upload
- **WHEN** upload to RAG wrapper occurs
- **THEN** payload includes only documents array with text and metadata
- **AND** no `embedding_provider`, `embedding_model`, or `embedding` fields
- **AND** wrapper determines model from collection metadata

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
The system SHALL accept simplified request format without embedding parameters for RAG operations.

#### Scenario: Traditional request format simplified
- **GIVEN** a POST request to `/api/collections/:name/documents`
- **WHEN** the body contains `documents` and `service`
- **THEN** all required parameters are validated
- **AND** no `embedding_connection` or `embedding_model` parameters needed
- **AND** the request is processed successfully

#### Scenario: Enhanced request format simplified
- **GIVEN** a POST request to `/api/collections/:name/documents`
- **WHEN** the body contains `raw_documents`, `schema`, `service`
- **AND** optionally `save_schema: true`
- **THEN** all parameters are validated
- **AND** transformation occurs before sending to wrapper
- **AND** no embedding generation in Node
- **AND** schema is optionally persisted

#### Scenario: Validate required parameters
- **GIVEN** any request (documents or raw_documents)
- **WHEN** `service` is missing
- **THEN** the request is rejected with 400 Bad Request and error "Service name is required"
- **AND** no embedding-related parameters are required

