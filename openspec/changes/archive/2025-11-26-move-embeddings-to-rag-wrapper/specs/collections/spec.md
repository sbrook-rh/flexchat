# collections Spec Delta

## MODIFIED Requirements

### Requirement: Collection Creation with Embedding Metadata
Collections SHALL be created with embedding model metadata that captures the specific embedding model loaded in the RAG wrapper.

#### Scenario: Create Collection with Embedding Model
- **WHEN** POST `/api/collections` is called with `name`, `service`, and `embedding_model`
- **THEN** it validates embedding model is available in RAG wrapper (via health check)
- **AND** creates the collection
- **AND** passes `embedding_model` to the wrapper for validation and storage
- **AND** stores metadata with `embedding_model`, `created_at`, and any custom metadata

#### Scenario: Create Collection Without Embedding Model
- **WHEN** POST `/api/collections` is called without `embedding_model` parameter
- **THEN** it returns 400 error: `embedding_model is required. Available models: [list from wrapper health]`

#### Scenario: Create Collection with Invalid Embedding Model
- **WHEN** POST `/api/collections` is called with `embedding_model` not available in wrapper
- **THEN** it returns 400 error: `Embedding model '[id]' not available. Available models: [list]`

#### Scenario: Retrieve Collection Metadata
- **WHEN** collection information is requested
- **THEN** it includes `embedding_model` in metadata
- **AND** no longer includes `embedding_provider`, `embedding_dimensions`, or `embedding_connection_id`

### Requirement: Document Upload with Embedding Generation
Documents uploaded to a collection SHALL be sent as text-only to the RAG wrapper, which generates embeddings internally.

#### Scenario: Upload Documents as Text Only
- **WHEN** POST `/api/collections/:name/documents` is called with `documents` (each containing `text`, optional `metadata` and `id`)
- **AND** `service` parameter
- **THEN** it sends documents to RAG wrapper without generating embeddings
- **AND** wrapper generates embeddings using collection's stored embedding model
- **AND** returns success with document count

#### Scenario: Upload Documents Without Service
- **WHEN** POST `/api/collections/:name/documents` is called without `service` parameter
- **THEN** it returns 400 error: `Service name is required`

#### Scenario: Upload Documents with Empty Array
- **WHEN** POST `/api/collections/:name/documents` is called with empty documents array
- **THEN** it returns 400 error: `Documents array is required`

#### Scenario: Upload Documents to Collection Without Embedding Model
- **WHEN** POST `/api/collections/:name/documents` is called
- **AND** collection metadata does not include `embedding_model` (older collection)
- **THEN** RAG wrapper returns 400 error with migration instructions
- **AND** error lists available embedding models
- **AND** Node backend passes error to frontend

### Requirement: Embedding Compatibility Validation
The system SHALL validate that RAG wrapper has the required embedding model loaded for collection operations.

#### Scenario: Validate Embedding Model Available in Wrapper
- **WHEN** collection is created or documents are uploaded
- **AND** RAG wrapper health check shows embedding models
- **THEN** Node backend validates requested model is in available list
- **AND** proceeds if available
- **AND** returns clear error if not available

#### Scenario: Validate Wrapper Health Before Operations
- **WHEN** collection creation or document upload occurs
- **THEN** Node backend uses cached health check results
- **AND** validates embedding_models array exists
- **AND** fails gracefully if wrapper unreachable

### Requirement: Collection Metadata Schema
Collections SHALL store embedding model ID in metadata for use by RAG wrapper.

#### Scenario: Metadata Schema Fields
- **WHEN** collection metadata is stored
- **THEN** it includes: `embedding_model` (string - model ID), `created_at` (ISO 8601 timestamp)
- **AND** no longer includes: `embedding_provider`, `embedding_dimensions`, `embedding_connection_id`

#### Scenario: Metadata Persistence
- **WHEN** collection is created with embedding_model
- **THEN** metadata persists across server restarts
- **AND** RAG wrapper uses stored model ID for all operations

#### Scenario: Metadata Immutability Guidance
- **WHEN** collection has documents
- **AND** user attempts to change `embedding_model` in metadata
- **THEN** system allows the change (no validation)
- **AND** documents should be re-indexed to use new model (warning in documentation)

### Requirement: Collection Test Query Endpoint
The system SHALL provide an endpoint for testing queries against collections using the RAG wrapper's embedding generation.

#### Scenario: Test query with valid parameters
- **WHEN** POST `/api/collections/:name/test-query` is called with `query`, `service`, and optional `top_k`
- **THEN** it sends query text to RAG wrapper without generating embeddings
- **AND** wrapper generates query embedding using collection's model
- **AND** returns results with distances, metadata, and execution time

#### Scenario: Test query response format
- **WHEN** test query executes successfully
- **THEN** response includes: `query` (text), `collection` (name), `service` (name), `results` (array with rank, distance, content, metadata), `embedding_model` (from collection metadata), `execution_time_ms`
- **AND** no longer includes `embedding_dimensions` or `embedding_connection`

#### Scenario: Missing query parameter
- **WHEN** POST `/api/collections/:name/test-query` is called without `query` field
- **THEN** returns 400 error: "Query text is required"

#### Scenario: Missing service parameter
- **WHEN** POST `/api/collections/:name/test-query` is called without `service` field
- **THEN** returns 400 error: "Service name is required"

#### Scenario: Invalid service name
- **WHEN** POST `/api/collections/:name/test-query` is called with non-existent service
- **THEN** returns 404 error: "Service '[name]' not found"

#### Scenario: Default top_k value
- **WHEN** POST `/api/collections/:name/test-query` is called without `top_k` parameter
- **THEN** defaults to 10 results

#### Scenario: Query execution timing
- **WHEN** test query is executed
- **THEN** execution time is measured from wrapper request start to results return
- **AND** included in response as `execution_time_ms`
- **AND** includes embedding generation time (now part of wrapper request)

#### Scenario: Empty results
- **WHEN** query returns no matching documents
- **THEN** returns successful response with empty results array
- **AND** HTTP status is 200

### Requirement: Collection Edit UI
The system SHALL provide a user interface for editing collection metadata, with embedding model selection based on available models from RAG wrapper.

#### Scenario: Re-model empty collection
- **GIVEN** a collection with `count === 0` and current `embedding_model: "mxbai-large"`
- **WHEN** user opens the Edit modal
- **THEN** an "Embedding (Re-model)" section appears
- **AND** section shows embedding model dropdown populated from wrapper health endpoint
- **AND** current embedding model is pre-selected
- **AND** user can select a different embedding model from available options

#### Scenario: Save re-model changes
- **GIVEN** Edit modal is open for an empty collection
- **WHEN** user changes embedding model to "nomic"
- **AND** clicks "Save Changes"
- **THEN** collection metadata is updated with new `embedding_model`
- **AND** success message shows "Collection '[display_name]' updated successfully!"
- **AND** collection list refreshes showing updated metadata

#### Scenario: Re-model section hidden for non-empty collections
- **GIVEN** a collection with `count > 0`
- **WHEN** user opens the Edit modal
- **THEN** the "Embedding (Re-model)" section is NOT visible
- **AND** embedding model cannot be changed (requires re-indexing)

#### Scenario: Re-model validation
- **GIVEN** Edit modal is open for an empty collection
- **WHEN** user leaves embedding model unselected
- **AND** attempts to save
- **THEN** validation error prevents save
- **AND** user is prompted to select an embedding model

### Requirement: Collection Testing UI
The Collections page SHALL provide an interactive testing interface for querying collections without embedding connection parameters.

#### Scenario: Test button visibility
- **WHEN** collection has `metadata.embedding_model` and `count > 0`
- **THEN** "Test / Calibrate" button is visible on collection card

#### Scenario: Test button disabled states
- **WHEN** collection has `count === 0` or `metadata.embedding_model` is missing
- **THEN** "Test / Calibrate" button is disabled
- **AND** tooltip explains why (no documents or no embedding model configured)

#### Scenario: Submit test query
- **WHEN** user enters query text and clicks "Test Query" button
- **THEN** API call is made to `/api/collections/:name/test-query`
- **AND** request includes only `service` and `query` (no embedding parameters)
- **AND** loading indicator is displayed during API call

#### Scenario: Display test results
- **WHEN** test query returns successfully
- **THEN** results are displayed with embedding model from metadata
- **AND** execution time includes embedding generation
- **AND** no embedding dimensions displayed (not relevant to user)

## REMOVED Requirements

### Requirement: Compatible Embedding Connection Discovery
**Reason**: Embedding connections no longer used for RAG operations

**Migration**: Remove connection resolution logic from Node backend

#### Scenario: Find Compatible Connection by Provider and Model
- **Removed**: Connection discovery no longer needed
- **Migration**: UI shows available models from wrapper health endpoint

#### Scenario: No Compatible Connection Found
- **Removed**: Connection-based errors no longer apply
- **Migration**: Model availability errors come from wrapper

#### Scenario: Multiple Compatible Connections
- **Removed**: Connection selection no longer relevant
- **Migration**: Model selection is direct (no connection resolution)

### Requirement: Embedding Connection Resolution
**Reason**: Collections no longer reference embedding connections, only model IDs

**Migration**: Remove resolution logic, update UI to use model IDs from wrapper

#### Scenario: Exact connection ID match with verification
- **Removed**: Connection ID matching no longer used
- **Migration**: Direct model ID from collection metadata

#### Scenario: Connection ID changed but provider and model available
- **Removed**: Connection resolution no longer needed
- **Migration**: Model ID is stable (not tied to connection)

#### Scenario: No compatible connection found
- **Removed**: Connection-based resolution removed
- **Migration**: Model availability checked via wrapper health

#### Scenario: Multiple connections with same provider and model
- **Removed**: Connection selection logic removed
- **Migration**: Single model ID, no connection ambiguity

#### Scenario: Collection with no embedding metadata
- **Removed**: Connection resolution logic removed
- **Migration**: Missing embedding_model triggers error from wrapper

#### Scenario: Provider offline during resolution
- **Removed**: Connection-based provider checks removed
- **Migration**: Wrapper health check shows model availability

### Requirement: UI Config Embedding Connection Resolution
**Reason**: UI no longer needs embedding connection resolution for RAG operations

**Migration**: Remove connection resolution from `/api/ui-config`, use embedding_model from metadata

#### Scenario: UI config includes resolved connections
- **Removed**: Embedding connection resolution no longer needed
- **Migration**: UI reads `embedding_model` directly from collection metadata

#### Scenario: Model fetching is cached per provider type
- **Removed**: Provider model fetching no longer used for RAG
- **Migration**: Wrapper health endpoint provides available models

#### Scenario: UI config performance overhead
- **Removed**: Connection resolution overhead eliminated
- **Migration**: Single health check to wrapper for model discovery

