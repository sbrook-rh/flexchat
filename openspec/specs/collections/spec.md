# collections Specification

## Purpose
TBD - created by archiving change refactor-embedding-architecture. Update Purpose after archive.
## Requirements
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

### Requirement: Metadata Merge Mode
The system SHALL provide a merge mode for collection metadata updates, allowing partial updates without replacing all metadata fields.

#### Scenario: Merge mode preserves existing fields
- **GIVEN** a collection with metadata `{"description": "Test", "match_threshold": 0.5, "existing_field": "value"}`
- **WHEN** client updates with `merge=true` and metadata `{"new_field": "new_value"}`
- **THEN** the collection metadata becomes `{"description": "Test", "match_threshold": 0.5, "existing_field": "value", "new_field": "new_value"}`
- **AND** existing fields are preserved

#### Scenario: Replace mode overwrites all fields (backward compat)
- **GIVEN** a collection with metadata `{"description": "Test", "match_threshold": 0.5, "existing_field": "value"}`
- **WHEN** client updates with `merge=false` (or omitted) and metadata `{"new_field": "new_value"}`
- **THEN** the collection metadata becomes `{"new_field": "new_value"}`
- **AND** existing fields are discarded (current behavior preserved)

#### Scenario: Merge mode default is false
- **GIVEN** a metadata update request without merge parameter specified
- **WHEN** the update is processed
- **THEN** the system treats it as `merge=false` (full replace)
- **AND** backward compatibility is maintained

### Requirement: Query Profile Configuration UI
The system SHALL provide a user interface for configuring query profiles on collections, specifically categorical filtering rules.

#### Scenario: Search Settings button visibility
- **GIVEN** a collection with `document_schema.metadata_fields` defined (parsed from stringified JSON in collection metadata)
- **WHEN** viewing the collection in the UI
- **THEN** a "Search Settings" button is displayed
- **AND** clicking opens the Profile modal

#### Scenario: Search Settings button hidden when no document metadata fields
- **GIVEN** a collection without `document_schema` or with empty `metadata_fields` array
- **WHEN** viewing the collection in the UI
- **THEN** the "Search Settings" button is NOT displayed
- **AND** categorical filtering is not available (no fields to filter on)

#### Scenario: Load existing query profile
- **GIVEN** a collection with `query_profile` JSON in metadata
- **WHEN** user opens the Profile modal
- **THEN** the form loads the parsed `query_profile` structure
- **AND** displays configured fields, values, and defaults

#### Scenario: Load empty profile for new configuration
- **GIVEN** a collection without existing `query_profile`
- **WHEN** user opens the Profile modal
- **THEN** the form loads with empty categorical filtering structure
- **AND** user can add new field configurations

#### Scenario: Fetch available values for field
- **GIVEN** the Profile modal is open and user selects a field
- **WHEN** field is selected from `document_schema.metadata_fields`
- **THEN** the system fetches unique values from collection documents via metadata-values endpoint
- **AND** displays loading state while fetching
- **AND** shows fetched values as multi-select options

#### Scenario: Add categorical filter field with selected values
- **GIVEN** the Profile modal has fetched values for a field
- **WHEN** user selects one or more values from the fetched list
- **THEN** the field appears in `categorical_filtering.fields` with type "exact_match"
- **AND** values array contains only the selected values (not all available values)

#### Scenario: Set default value for categorical field
- **GIVEN** a categorical filter field with multiple values
- **WHEN** user selects one value as default
- **THEN** the field's `default` property is set to that value
- **AND** future queries will use this default if not overridden

#### Scenario: Remove categorical filter field
- **GIVEN** a configured categorical filter field
- **WHEN** user clicks remove button for that field
- **THEN** the field is removed from `categorical_filtering.fields`
- **AND** the field no longer appears in the form

#### Scenario: Save query profile with merge
- **GIVEN** changes made in the Profile modal
- **WHEN** user clicks Save
- **THEN** the system stringifies the `query_profile` structure
- **AND** sends update with `merge=true` to preserve other metadata
- **AND** only `query_profile` and `updated_at` are modified

#### Scenario: Query profile JSON round-trip
- **GIVEN** a saved `query_profile` with categorical filtering
- **WHEN** page reloads and collection data is fetched
- **THEN** the `query_profile` string is parsed correctly
- **AND** displays in Profile modal with all fields/values intact

#### Scenario: Invalid query profile JSON degrades gracefully
- **GIVEN** a collection with malformed `query_profile` JSON
- **WHEN** user opens the Profile modal
- **THEN** the system logs parse error to console
- **AND** loads empty profile structure (does not crash)

### Requirement: Query Profile Data Structure
The system SHALL store query profiles as stringified JSON in collection metadata, following ChromaDB's primitive-value constraint.

#### Scenario: Query profile storage format
- **GIVEN** a categorical filtering configuration
- **WHEN** saved to collection metadata
- **THEN** `query_profile` is stored as JSON string (not object)
- **AND** satisfies ChromaDB primitive value requirement

#### Scenario: Categorical filtering structure
- **GIVEN** a configured categorical filter with field "region" having selected values ["British Classics", "Asian & Middle Eastern Sweets"] (from fetched document values) and default "British Classics"
- **WHEN** stored in `query_profile`
- **THEN** the structure is `{"categorical_filtering": {"fields": {"region": {"type": "exact_match", "values": [...], "default": "British Classics"}}}}`
- **AND** values are subset of actual document metadata values
- **AND** follows the documented query profile format specification

### Requirement: Collection Edit UI
The system SHALL provide a user interface for editing collection metadata, with embedding model selection from the RAG wrapper's available models for empty collections.

#### Scenario: Re-model empty collection with wrapper models
- **GIVEN** a collection with `count === 0` and current `embedding_model: "mxbai-large"`
- **WHEN** user opens the Edit modal
- **THEN** an "Embedding (Re-model)" section appears
- **AND** section shows embedding model dropdown populated from RAG service's `embedding_models`
- **AND** current embedding model is pre-selected if available
- **AND** user can select a different embedding model from available options
- **AND** no embedding connection dropdown is shown

#### Scenario: Embedding Models from Service Health
- **WHEN** Edit modal loads for empty collection
- **THEN** embedding models are fetched from `providerStatus.rag_services[collection.service].details.embedding_models`
- **AND** dropdown shows model IDs and names with dimensions: `{id} - {name} ({dimensions}d)`
- **AND** unavailable models are not selectable

#### Scenario: Read-only embedding display for non-empty collections
- **GIVEN** a collection with `count > 0`
- **WHEN** user opens the Edit modal
- **THEN** "Embedding Model" section shows read-only fields
- **AND** displays: Model (ID), Dimensions
- **AND** no longer displays: Provider, Connection ID
- **AND** help text clarifies: "Embedding model is fixed for collections with documents"

### Requirement: Empty Collection Action
The system SHALL provide a UI action to remove all documents from a collection while preserving collection metadata and settings.

#### Scenario: Empty button visibility
- **GIVEN** a collection with `count > 0`
- **WHEN** viewing the collection card
- **THEN** an "Empty" button is visible alongside Edit/Delete buttons
- **AND** button is styled with warning colors (similar to Delete)

#### Scenario: Empty button hidden when empty
- **GIVEN** a collection with `count === 0`
- **WHEN** viewing the collection card
- **THEN** the "Empty" button is NOT visible

#### Scenario: Empty confirmation dialog
- **GIVEN** a collection "Red Hat Docs" with 5000 documents
- **WHEN** user clicks the "Empty" button
- **THEN** a confirmation dialog appears
- **AND** dialog shows "Empty collection 'Red Hat Docs'?"
- **AND** dialog shows "This will delete all 5000 document(s)."
- **AND** dialog shows "The collection settings and metadata will be preserved."
- **AND** dialog shows "This action cannot be undone."
- **AND** dialog provides "Cancel" and "Confirm" options

#### Scenario: Empty cancelled
- **GIVEN** the empty confirmation dialog is open
- **WHEN** user clicks "Cancel"
- **THEN** dialog closes
- **AND** no documents are deleted
- **AND** collection state is unchanged

#### Scenario: Empty confirmed
- **GIVEN** confirmation dialog for collection with 5000 documents
- **WHEN** user clicks "Confirm"
- **THEN** backend endpoint is called to empty the collection
- **AND** on success, message shows "Emptied 'Red Hat Docs' - deleted 5000 documents"
- **AND** collection list is refreshed
- **AND** collection now shows `count: 0`
- **AND** "Empty" button is no longer visible
- **AND** "Re-model" section appears in Edit modal

#### Scenario: Empty already-empty collection
- **GIVEN** a collection with `count === 0`
- **WHEN** backend receives an empty request (via direct API call)
- **THEN** endpoint returns success with `count_deleted: 0`
- **AND** no errors are raised

#### Scenario: Empty error handling
- **GIVEN** user attempts to empty a collection
- **WHEN** backend returns an error (e.g., collection not found, network failure)
- **THEN** error message is displayed to user
- **AND** collection state remains unchanged

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

### Requirement: Collection Create UI
The system SHALL provide a user interface for creating collections with embedding model selection from the current RAG service.

#### Scenario: Open create collection form
- **GIVEN** user is viewing collections for a specific service (e.g., `/collections?wrapper=red-hat-product-documentation`)
- **WHEN** user clicks "Create New Collection" button
- **THEN** modal appears with create form
- **AND** form includes: Display Name, Description, Match Threshold, Fallback Threshold, Embedding Model
- **AND** service is implicitly set from URL query parameter (no service dropdown shown)

#### Scenario: Embedding model dropdown population
- **WHEN** create form opens
- **THEN** embedding model dropdown is populated from `providerStatus.rag_services[currentWrapper].details.embedding_models`
- **AND** each option displays: `{id} - {name} ({dimensions}d)`
- **AND** dropdown is enabled immediately (no dependency on other fields)

#### Scenario: Create collection with selected model
- **WHEN** user fills in collection details
- **AND** selects embedding model "mxbai-large"
- **AND** clicks "Create Collection"
- **THEN** POST `/api/collections` is called with `service` (from URL), `embedding_model`, and metadata
- **AND** no `embedding_connection` parameter is sent

#### Scenario: No embedding models available
- **WHEN** create form opens but selected RAG service has no `embedding_models` in health details
- **THEN** embedding model dropdown shows: "No embedding models loaded in this service"
- **AND** warning displays: "⚠ No embedding models loaded. Check wrapper configuration."
- **AND** create button remains enabled (backend will validate)

#### Scenario: Form validation
- **WHEN** user attempts to create collection without selecting embedding model
- **THEN** validation error appears: "Please select an embedding model"
- **AND** form submission is prevented

