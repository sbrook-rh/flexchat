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

