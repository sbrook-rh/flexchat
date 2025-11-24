# rag-providers Specification

## Purpose
TBD - created by archiving change config-builder-system. Update Purpose after archive.
## Requirements
### Requirement: RAG Provider Registry Integration
All RAG providers SHALL integrate with the provider registry system for discovery and management.

#### Scenario: RAG Provider Registration
- **WHEN** a new RAG provider is added to the system
- **THEN** it registers itself with the RAG provider registry and becomes discoverable

#### Scenario: RAG Provider Discovery
- **WHEN** the system needs to find available RAG providers
- **THEN** it queries the registry and returns all registered providers with their capabilities

#### Scenario: RAG Provider Selection
- **WHEN** a RAG provider is selected for use
- **THEN** the system loads the provider instance with proper configuration and error handling

### Requirement: Base RAG Provider Interface
All RAG providers SHALL implement a standardized interface that ensures consistent behavior across different RAG services, including configuration schema and testing capabilities.

#### Scenario: Provider Initialization with Schema
- **WHEN** a RAG provider is instantiated
- **THEN** it exposes its configuration schema via `getConnectionSchema()`
- **AND** validates provided configuration against the schema
- **AND** initializes successfully if configuration is valid

#### Scenario: Provider Capabilities Declaration
- **WHEN** querying a RAG provider's capabilities
- **THEN** it returns supported operations: `collections`, `search`, `embeddings`, `metadata_filtering`
- **AND** allows UI to show/hide features based on capabilities

#### Scenario: Health Check with Details
- **WHEN** the system checks RAG provider health
- **THEN** it returns standardized health status with timestamp and error details
- **AND** includes service-specific information (collection count, storage size, etc.)

### Requirement: Hybrid Query Strategy for Contextual Continuity
The RAG query system SHALL use an intelligent hybrid approach to balance semantic richness with conversational context continuity.

#### Scenario: First Message Query Strategy
- **WHEN** a user sends the first message in a conversation (no current topic exists)
- **THEN** the system uses the raw user message text for embedding generation and RAG query
- **AND** logs the query strategy as "first message (raw query)"
- **AND** achieves optimal semantic matching for standalone questions

#### Scenario: Follow-up Message Query Strategy
- **WHEN** a user sends a follow-up message (current topic exists from previous exchanges)
- **THEN** the system uses the accumulated contextualized topic for embedding generation and RAG query
- **AND** logs the query strategy as "follow-up (contextualized topic)"
- **AND** resolves pronouns and implicit references through topic accumulation

#### Scenario: Pronoun Resolution via Topic Context
- **WHEN** a user asks a follow-up question with pronouns (e.g., "Does it integrate with OpenShift AI?")
- **THEN** the accumulated topic maintains the subject context (e.g., "InstructLab and OpenShift AI integration")
- **AND** the query embedding includes the full context, preventing loss of domain specificity
- **AND** retrieves relevant documents that match the implicit subject

#### Scenario: Query Text Selection Logic
- **WHEN** the RAG collector determines which text to embed
- **THEN** it checks if `currentTopic` is empty or whitespace-only
- **AND** if empty, uses `userMessage` (first message strategy)
- **AND** if present, uses normalized `topic` (follow-up strategy)

#### Scenario: Embedding Cache Efficiency
- **WHEN** multiple collections use the same embedding connection and model
- **THEN** the system generates the embedding once and caches it with key `connectionId:model`
- **AND** reuses the cached embedding for subsequent collection queries
- **AND** logs cache hits for observability

### Requirement: RAG Wrapper Document Storage with Pre-computed Embeddings
The RAG wrapper service SHALL accept and store documents with pre-computed embeddings, functioning as a pure storage proxy without embedding generation responsibilities.

#### Scenario: Add Documents with Pre-computed Embeddings
- **WHEN** POST `/collections/{collection_name}/documents` is called with documents containing `text`, `metadata`, and `embedding` fields
- **THEN** it stores documents in ChromaDB with provided embeddings and returns success with document count

#### Scenario: Add Documents Without Embeddings
- **WHEN** POST `/collections/{collection_name}/documents` is called with documents missing `embedding` field
- **THEN** it returns 400 error: `All documents must include pre-computed embeddings`

#### Scenario: Add Documents with Invalid Embedding Format
- **WHEN** POST `/collections/{collection_name}/documents` is called with embedding field that is not an array of numbers
- **THEN** it returns 400 error describing the invalid format

#### Scenario: Add Documents with Mismatched Embedding Dimensions
- **WHEN** multiple documents in the same request have embeddings with different dimensions
- **THEN** it returns 400 error indicating dimension mismatch

#### Scenario: Empty Documents Array
- **WHEN** POST `/collections/{collection_name}/documents` is called with empty documents array
- **THEN** it returns 400 error: `Documents array is required`

### Requirement: Collection Metadata Storage
The RAG wrapper service SHALL store and retrieve collection metadata provided by the Node backend.

#### Scenario: Create Collection with Metadata
- **WHEN** POST `/collections` is called with `name`, optional top-level `embedding_provider` and `embedding_model`, and `metadata`
- **THEN** it creates the collection in ChromaDB, honors any top-level embedding fields as metadata, and stores all metadata without provider-type validation

#### Scenario: Retrieve Collection with Metadata
- **WHEN** GET `/collections/{collection_name}` is called
- **THEN** it returns collection information including stored metadata

#### Scenario: Update Collection Metadata
- **WHEN** PUT `/collections/{collection_name}/metadata` is called with new metadata
- **THEN** it updates the collection metadata and returns success

#### Scenario: Retrieve All Collections with Metadata
- **WHEN** GET `/collections` is called
- **THEN** it returns all collections with their metadata

### Requirement: Metadata-Based Document Querying
The RAG service SHALL provide an endpoint for querying documents by metadata filters without semantic search, enabling deterministic retrieval of document groups sharing common metadata attributes.

#### Scenario: Simple equality filter
- **GIVEN** a collection contains documents with `section_id` metadata
- **WHEN** client requests `GET /collections/{name}/documents?where={"section_id":"intro"}`
- **THEN** the endpoint returns all documents where `section_id` equals "intro"
- **AND** response includes `{documents: [...], count: N, total: N}`
- **AND** each document includes `{id, text, metadata}`

#### Scenario: Multiple field filter (implicit AND)
- **GIVEN** a collection contains documents with `chapter_id` and `doc_type` metadata
- **WHEN** client requests `GET /collections/{name}/documents?where={"chapter_id":"1","doc_type":"paragraph"}`
- **THEN** the endpoint returns documents matching both conditions
- **AND** all returned documents have `chapter_id="1"` AND `doc_type="paragraph"`

#### Scenario: Complex filter with operators
- **GIVEN** a collection with various document types
- **WHEN** client requests filter with `$in` operator: `{"doc_type":{"$in":["heading","paragraph"]}}`
- **THEN** the endpoint returns documents where `doc_type` is either "heading" or "paragraph"
- **AND** excludes other document types (e.g., "code", "list")

#### Scenario: Logical OR operator
- **GIVEN** a collection spanning multiple chapters
- **WHEN** client requests `{"$or":[{"chapter":"1"},{"chapter":"3"}]}`
- **THEN** the endpoint returns documents from chapter 1 OR chapter 3
- **AND** excludes documents from other chapters

#### Scenario: No filter provided
- **GIVEN** a collection with 500 documents
- **WHEN** client requests `GET /collections/{name}/documents` without `where` parameter
- **THEN** the endpoint returns first 100 documents (default limit)
- **AND** response includes `count: 100`

#### Scenario: Pagination with limit and offset
- **GIVEN** a metadata query matches 250 documents
- **WHEN** client requests `limit=50&offset=100`
- **THEN** the endpoint returns documents 101-150
- **AND** response includes `count: 50`

#### Scenario: Empty results
- **GIVEN** a metadata filter matches no documents
- **WHEN** client requests filter with non-existent metadata value
- **THEN** the endpoint returns `{documents: [], count: 0, total: 0}`
- **AND** HTTP status is 200 (not an error condition)

#### Scenario: Collection not found
- **GIVEN** the requested collection does not exist
- **WHEN** client requests `GET /collections/nonexistent/documents`
- **THEN** the endpoint returns HTTP 404
- **AND** error message: "Collection 'nonexistent' not found"

#### Scenario: Invalid JSON filter
- **GIVEN** client provides malformed JSON in `where` parameter
- **WHEN** client requests `where=invalid-json-string`
- **THEN** the endpoint returns HTTP 400
- **AND** error message: "Invalid 'where' filter: must be valid JSON"

#### Scenario: Limit enforcement
- **GIVEN** client requests documents with excessive limit
- **WHEN** client requests `limit=5000` (exceeds max of 1000)
- **THEN** the endpoint enforces max limit of 1000
- **AND** returns at most 1000 documents

#### Scenario: Sibling gathering use case
- **GIVEN** semantic search finds a paragraph fragment with `section_id="retention-config"`
- **WHEN** client extracts `section_id` and queries `GET /collections/{name}/documents?where={"section_id":"retention-config"}`
- **THEN** the endpoint returns complete section (heading + all paragraphs + code blocks)
- **AND** documents can be sorted by `doc_type` to reconstruct original section structure
- **AND** enables presenting complete context instead of isolated fragments

### Requirement: Metadata Field Values Endpoint
The RAG service SHALL provide an endpoint to retrieve unique values for metadata fields across all documents in a collection, enabling UI components to build categorical filter dropdowns.

#### Scenario: Get unique values for metadata field
- **GIVEN** a collection with documents containing metadata field "region" with values ["British Classics", "Asian & Middle Eastern Sweets", "British Classics", "French Pastries"]
- **WHEN** client requests `GET /collections/{name}/metadata-values?field=region`
- **THEN** the endpoint returns `{field: "region", values: ["British Classics", "Asian & Middle Eastern Sweets", "French Pastries"], count: 3}`
- **AND** duplicate values are deduplicated

#### Scenario: Get values for field with no documents
- **GIVEN** a collection with documents where no document has the requested metadata field
- **WHEN** client requests `GET /collections/{name}/metadata-values?field=nonexistent`
- **THEN** the endpoint returns `{field: "nonexistent", values: [], count: 0}`
- **AND** HTTP status is 200 (not an error)

#### Scenario: Collection not found
- **GIVEN** the requested collection does not exist
- **WHEN** client requests `GET /collections/nonexistent/metadata-values?field=region`
- **THEN** the endpoint returns HTTP 404
- **AND** error message: "Collection 'nonexistent' does not exist."

#### Scenario: Missing field parameter
- **GIVEN** a request to metadata-values endpoint
- **WHEN** the `field` query parameter is not provided
- **THEN** the endpoint returns HTTP 400
- **AND** error message indicates field parameter is required

#### Scenario: Values returned in consistent order
- **GIVEN** multiple calls to metadata-values for the same field
- **WHEN** documents haven't changed between calls
- **THEN** values array returns in same order (sorted alphabetically)
- **AND** UI can display consistent dropdowns

### Requirement: Collection Metadata Merge Mode
The RAG service SHALL support a merge mode for collection metadata updates, allowing partial updates without replacing all metadata fields.

#### Scenario: Merge mode preserves existing metadata
- **GIVEN** a collection with metadata `{"description": "Test", "match_threshold": 0.5, "custom_field": "value"}`
- **WHEN** client sends `PUT /collections/{name}/metadata?merge=true` with metadata `{"new_field": "new"}`
- **THEN** the collection metadata becomes `{"description": "Test", "match_threshold": 0.5, "custom_field": "value", "new_field": "new"}`
- **AND** all existing fields are preserved

#### Scenario: Replace mode overwrites metadata (default)
- **GIVEN** a collection with metadata `{"description": "Test", "match_threshold": 0.5, "custom_field": "value"}`
- **WHEN** client sends `PUT /collections/{name}/metadata` (no merge parameter) with metadata `{"new_field": "new"}`
- **THEN** the collection metadata becomes `{"new_field": "new"}`
- **AND** existing fields are discarded (current behavior)

#### Scenario: Explicit replace mode
- **GIVEN** a collection with existing metadata
- **WHEN** client sends `PUT /collections/{name}/metadata?merge=false` with metadata `{"new_field": "new"}`
- **THEN** the collection metadata is fully replaced
- **AND** behavior matches default (merge=false is default)

### Requirement: Empty Collection Endpoint
The system SHALL provide an API endpoint to delete all documents from a collection while preserving the collection and its metadata.

#### Scenario: Empty collection with documents
- **GIVEN** a collection "test-collection" exists with 100 documents
- **WHEN** client sends `DELETE /collections/test-collection/documents/all`
- **THEN** endpoint returns 200 status
- **AND** response body contains:
  ```json
  {
    "status": "emptied",
    "collection": "test-collection",
    "count_deleted": 100
  }
  ```
- **AND** collection still exists
- **AND** collection metadata is preserved
- **AND** collection now contains 0 documents

#### Scenario: Empty already-empty collection
- **GIVEN** a collection "test-collection" exists with 0 documents
- **WHEN** client sends `DELETE /collections/test-collection/documents/all`
- **THEN** endpoint returns 200 status
- **AND** response body contains:
  ```json
  {
    "status": "emptied",
    "collection": "test-collection",
    "count_deleted": 0
  }
  ```

#### Scenario: Empty non-existent collection
- **GIVEN** collection "missing-collection" does not exist
- **WHEN** client sends `DELETE /collections/missing-collection/documents/all`
- **THEN** endpoint returns 404 status
- **AND** error message indicates collection not found

#### Scenario: Empty large collection
- **GIVEN** a collection "large-collection" with 50,000 documents
- **WHEN** client sends `DELETE /collections/large-collection/documents/all`
- **THEN** endpoint successfully deletes all 50,000 documents
- **AND** returns `count_deleted: 50000`
- **AND** operation completes within reasonable time (< 30 seconds)

#### Scenario: Empty operation is transactional
- **GIVEN** a collection exists
- **WHEN** empty operation encounters an error during deletion
- **THEN** either all documents are deleted or none are deleted
- **AND** partial deletion does not leave collection in inconsistent state

#### Scenario: Metadata preserved after empty
- **GIVEN** a collection with metadata `{display_name: "Test", description: "Docs", query_profile: {...}}`
- **WHEN** collection is emptied
- **THEN** all metadata fields remain unchanged
- **AND** collection can be queried for metadata
- **AND** subsequent document uploads use existing metadata

#### Scenario: Empty through Node.js middleware
- **GIVEN** a collection exists in RAG service
- **WHEN** client sends `DELETE /api/collections/test-collection/documents/all?service=chroma_wrapper`
- **THEN** Node.js routes request to correct RAG provider
- **AND** RAG provider calls RAG service empty endpoint
- **AND** response is returned to client
- **AND** response format matches RAG service response

### Requirement: Cross-Encoder Model Discovery
The RAG service SHALL provide discoverability for available cross-encoder models through help text and a list command.

#### Scenario: Help text shows model examples
- **WHEN** user runs `python server.py --help`
- **THEN** `--cross-encoder` flag help text includes example models
- **AND** examples show model name, size, and use case
- **AND** examples include fast, recommended, and high-accuracy options

#### Scenario: List available models command
- **WHEN** user runs `python server.py --list-reranker-models`
- **THEN** it displays curated list of recommended models
- **AND** list shows model name, size, latency, and accuracy tier
- **AND** list groups by use case (fast, recommended, high-accuracy)
- **AND** includes note that any HuggingFace cross-encoder model works
- **AND** includes link to HuggingFace model hub for exploration
- **AND** exits after displaying list

#### Scenario: Startup banner when no model specified
- **WHEN** server starts without cross-encoder flags
- **THEN** it logs info message that cross-encoder is disabled
- **AND** logs hint showing how to enable with example model
- **AND** logs reference to --list-reranker-models for options

#### Scenario: Curated list includes metadata
- **WHEN** curated model list is displayed
- **THEN** each model includes name (HuggingFace identifier)
- **AND** each model includes size (MB or GB)
- **AND** each model includes approximate latency for 10 documents
- **AND** each model includes accuracy tier description

### Requirement: Cross-Encoder Model Initialization
The RAG service SHALL support optional cross-encoder model loading at startup for contextual document reranking.

#### Scenario: Load model from HuggingFace
- **WHEN** server started with `--cross-encoder BAAI/bge-reranker-base` flag
- **THEN** it downloads model from HuggingFace Hub to cache directory
- **AND** loads cross-encoder model into memory
- **AND** logs successful load with model name
- **AND** service becomes ready to handle /rerank requests

#### Scenario: Load model from local path
- **WHEN** server started with `--cross-encoder-path /models/bge-reranker-base` flag
- **THEN** it loads cross-encoder from specified local path
- **AND** skips HuggingFace download
- **AND** logs successful load with path
- **AND** service becomes ready to handle /rerank requests

#### Scenario: Load model from environment variable
- **WHEN** environment variable `CROSS_ENCODER_MODEL` set to model name
- **AND** no command-line flags provided
- **THEN** it loads model from HuggingFace using environment variable value
- **AND** behaves identically to `--cross-encoder` flag

#### Scenario: Priority order for model source
- **WHEN** multiple model sources specified (path flag, model flag, env vars)
- **THEN** it uses `--cross-encoder-path` if provided
- **AND** falls back to `--cross-encoder` if path not provided
- **AND** falls back to environment variables if neither flag provided

#### Scenario: Model load failure terminates startup
- **WHEN** server started with `--cross-encoder` flag but model cannot be loaded
- **THEN** it logs fatal error with failure details
- **AND** exits immediately with non-zero status code
- **AND** does not start serving requests

#### Scenario: No cross-encoder specified
- **WHEN** server started without cross-encoder flags or environment variables
- **THEN** it logs that cross-encoder is disabled
- **AND** starts successfully without loading model
- **AND** /rerank endpoint returns 503 when called

### Requirement: Cross-Encoder Health Reporting
The RAG service health check SHALL report cross-encoder availability and status when model is loaded.

#### Scenario: Health check with cross-encoder loaded
- **WHEN** GET /health called and cross-encoder model is loaded
- **THEN** response includes `cross_encoder` object in response
- **AND** object contains `model` field with model name or path
- **AND** object contains `status` field with value "loaded"

#### Scenario: Health check without cross-encoder
- **WHEN** GET /health called and cross-encoder not loaded at startup
- **THEN** response does not include `cross_encoder` field
- **AND** maintains backward compatibility with existing health check format

#### Scenario: Node.js provider detects availability
- **WHEN** Node.js provider calls healthCheck() method
- **AND** response includes `cross_encoder` field
- **THEN** provider knows reranking capability is available
- **AND** can call /rerank endpoint safely

### Requirement: Cross-Encoder Reranking Endpoint
The RAG service SHALL provide a /rerank endpoint that scores query-document pairs for relevance using the loaded cross-encoder model.

#### Scenario: Successful reranking request
- **WHEN** POST /rerank called with query and array of documents
- **AND** each document has `id` and `text` fields
- **AND** cross-encoder model is loaded
- **THEN** it creates query-document pairs for scoring
- **AND** scores all pairs using cross-encoder model
- **AND** returns documents sorted by score descending
- **AND** includes score and original_rank for each document

#### Scenario: Apply top_k limit
- **WHEN** POST /rerank called with `top_k: 3` parameter
- **AND** request includes 10 documents
- **THEN** it scores all 10 documents
- **AND** sorts by score descending
- **AND** returns only top 3 highest-scoring documents

#### Scenario: Rerank request without cross-encoder loaded
- **WHEN** POST /rerank called but cross-encoder not loaded at startup
- **THEN** endpoint returns 503 status
- **AND** error message states "Cross-encoder not loaded. Start server with --cross-encoder flag."

#### Scenario: Rerank with missing query
- **WHEN** POST /rerank called without query field
- **THEN** Pydantic validation returns 400 status
- **AND** error indicates query is required

#### Scenario: Rerank with missing documents
- **WHEN** POST /rerank called without documents field
- **THEN** Pydantic validation returns 400 status
- **AND** error indicates documents are required

#### Scenario: Rerank with empty documents array
- **WHEN** POST /rerank called with `documents: []`
- **THEN** endpoint returns 200 status
- **AND** response is `{"reranked": []}`
- **AND** no error is raised

#### Scenario: Rerank response format
- **WHEN** POST /rerank returns successfully
- **THEN** response contains `reranked` array
- **AND** each item has `id` field matching original document
- **AND** each item has `score` field (float) from cross-encoder
- **AND** each item has `original_rank` field (1-based position in input)
- **AND** items are sorted by score descending

#### Scenario: Cross-encoder scoring error
- **WHEN** cross-encoder model prediction raises exception
- **THEN** endpoint returns 500 status
- **AND** error message includes exception details
- **AND** error is logged for debugging

### Requirement: Cross-Encoder Reranking Method
Node.js RAG providers SHALL provide a rerank() method that calls the RAG service /rerank endpoint with graceful degradation.

#### Scenario: Successful reranking call
- **WHEN** provider.rerank() called with query and documents array
- **AND** cross-encoder available in RAG service (verified via health check)
- **THEN** it calls POST /rerank endpoint with query and documents
- **AND** maps documents to required format (id, text)
- **AND** uses configured timeout and auth headers
- **AND** uses withRetry wrapper for resilience
- **AND** returns reranked documents with scores

#### Scenario: Generate fallback document IDs
- **WHEN** provider.rerank() called with documents missing id field
- **THEN** it generates fallback IDs using document index or timestamp
- **AND** ensures all documents have valid id before calling endpoint

#### Scenario: Health check shows no cross-encoder
- **WHEN** provider.rerank() checks health endpoint
- **AND** response does not include cross_encoder field
- **THEN** it logs warning that cross-encoder unavailable
- **AND** returns original documents unchanged (graceful degradation)
- **AND** does not throw error

#### Scenario: RAG service unreachable
- **WHEN** provider.rerank() attempts health check
- **AND** health check fails (network error, timeout, etc)
- **THEN** it logs warning about connectivity issue
- **AND** returns original documents unchanged (graceful degradation)
- **AND** does not throw error

#### Scenario: Rerank endpoint returns error
- **WHEN** provider.rerank() calls /rerank endpoint
- **AND** endpoint returns 503, 500, or other error status
- **THEN** it logs error with details
- **AND** returns original documents unchanged (graceful degradation)
- **AND** does not throw error

#### Scenario: Optional top_k parameter
- **WHEN** provider.rerank() called with topK parameter
- **THEN** it passes top_k to /rerank endpoint
- **AND** endpoint limits results to specified count

#### Scenario: Reranking preserves document structure
- **WHEN** provider.rerank() receives reranked response
- **THEN** it returns documents with updated scores
- **AND** preserves all original document fields
- **AND** maintains compatibility with downstream processing

