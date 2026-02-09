# document-upload Spec Delta

## MODIFIED Requirements

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

## REMOVED Requirements

None - requirements are modified to remove embedding generation, but structure remains

