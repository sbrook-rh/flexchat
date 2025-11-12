# collections Specification

## Purpose
TBD - created by archiving change refactor-embedding-architecture. Update Purpose after archive.
## Requirements
### Requirement: Collection Creation with Embedding Metadata
Collections SHALL be created with embedding metadata that captures the embedding model used for all documents in the collection.

#### Scenario: Create Collection with Embedding Connection
- **WHEN** POST `/api/collections` is called with `name`, `service`, `embedding_connection`, and optional `embedding_model`
- **THEN** it resolves embedding model (prefer explicit `embedding_model`, otherwise connection/default), creates the collection, passes top-level `embedding_provider` and `embedding_model` to the wrapper, and stores metadata with `embedding_provider`, `embedding_model`, `embedding_dimensions`, and `embedding_connection_id`

#### Scenario: Create Collection Without Embedding Connection
- **WHEN** POST `/api/collections` is called without `embedding_connection` parameter
- **THEN** it returns 400 error: `embedding_connection is required`

#### Scenario: Create Collection with Invalid Embedding Connection
- **WHEN** POST `/api/collections` is called with non-existent `embedding_connection` ID
- **THEN** it returns 400 error: `LLM connection "[id]" not found`

#### Scenario: Retrieve Collection Metadata
- **WHEN** collection information is requested
- **THEN** it includes embedding metadata (provider, model, dimensions, connection_id, created_at)

### Requirement: Document Upload with Embedding Generation
Documents uploaded to a collection SHALL have embeddings generated in the Node backend before being stored in the RAG service.

#### Scenario: Upload Documents with Embedding Connection
- **WHEN** POST `/api/collections/:name/documents` is called with `documents`, `service`, and `embedding_connection` parameters
- **THEN** it generates embeddings using the specified connection, validates compatibility with collection metadata, and adds documents with embeddings to the collection

#### Scenario: Upload Documents Without Embedding Connection
- **WHEN** POST `/api/collections/:name/documents` is called without `embedding_connection` parameter
- **THEN** it returns 400 error: `embedding_connection is required`

#### Scenario: Upload Documents with Incompatible Embedding Model
- **WHEN** POST `/api/collections/:name/documents` is called with `embedding_connection` that uses different provider or model than collection metadata
- **THEN** it returns 400 error describing the mismatch: `Embedding model mismatch: Collection requires [provider]/[model], but you're using [other_provider]/[other_model]`

#### Scenario: Upload Documents with Compatible Embedding Model
- **WHEN** POST `/api/collections/:name/documents` is called with `embedding_connection` matching collection's embedding metadata
- **THEN** it generates embeddings, adds documents to collection, and returns success with document count

#### Scenario: Empty Document Array
- **WHEN** POST `/api/collections/:name/documents` is called with empty documents array
- **THEN** it returns 400 error: `Documents array is required`

### Requirement: Embedding Compatibility Validation
The system SHALL validate embedding compatibility when documents are added to collections.

#### Scenario: Validate Compatible Embedding Connection
- **WHEN** collection has metadata `{embedding_provider: "openai", embedding_model: "text-embedding-3-small"}` and upload uses connection with same provider and model
- **THEN** validation passes and upload proceeds

#### Scenario: Validate Incompatible Provider
- **WHEN** collection has metadata `{embedding_provider: "openai", ...}` and upload uses connection with `embedding_provider: "ollama"`
- **THEN** validation fails with clear error message

#### Scenario: Validate Incompatible Model
- **WHEN** collection has metadata `{embedding_model: "text-embedding-3-small"}` and upload uses connection with `embedding_model: "text-embedding-ada-002"`
- **THEN** validation fails with clear error message

### Requirement: Compatible Embedding Connection Discovery
The system SHALL find compatible embedding connections for collections even when connection IDs change across configurations.

#### Scenario: Find Compatible Connection by Provider and Model
- **WHEN** `findCompatibleEmbeddingConnection(collectionMetadata, config)` is called with collection requiring "openai/text-embedding-3-small"
- **THEN** it searches all configured LLM connections and returns the ID of any connection with matching provider and model

#### Scenario: No Compatible Connection Found
- **WHEN** `findCompatibleEmbeddingConnection()` is called but no LLM connection matches the required provider and model
- **THEN** it throws error: `No compatible embedding connection found for [provider]/[model]`

#### Scenario: Multiple Compatible Connections
- **WHEN** multiple LLM connections match the required provider and model
- **THEN** it returns the first matching connection ID

### Requirement: Collection Metadata Schema
Collections SHALL store embedding metadata in a standardized schema.

#### Scenario: Metadata Schema Fields
- **WHEN** collection metadata is stored
- **THEN** it includes: `embedding_provider` (string), `embedding_model` (string), `embedding_dimensions` (integer), `embedding_connection_id` (string), `created_at` (ISO 8601 timestamp)

#### Scenario: Metadata Persistence
- **WHEN** collection is created with embedding metadata
- **THEN** metadata persists across server restarts and configuration changes

#### Scenario: Metadata Immutability
- **WHEN** documents are added to existing collection
- **THEN** the embedding metadata cannot be changed (embedding model is locked for the collection)

