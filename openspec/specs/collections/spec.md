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
The system SHALL provide a user interface for editing collection metadata, with the display name as the primary editable field and support for changing embedding models when the collection is empty.

#### Scenario: Re-model empty collection
- **GIVEN** a collection with `count === 0` and current embedding settings `{connection: "openai", model: "text-embedding-ada-002"}`
- **WHEN** user opens the Edit modal
- **THEN** an "Embedding (Re-model)" section appears below the basic metadata fields
- **AND** section shows embedding connection dropdown (populated from available LLM connections)
- **AND** section shows embedding model dropdown (initially empty)
- **AND** current embedding connection is pre-selected
- **AND** when user selects a connection, embedding models are fetched and displayed
- **AND** user can select a different embedding model

#### Scenario: Save re-model changes
- **GIVEN** Edit modal is open for an empty collection
- **WHEN** user changes embedding connection to "gemini" and model to "text-embedding-004"
- **AND** clicks "Save Changes"
- **THEN** collection metadata is updated with new embedding settings
- **AND** success message shows "Collection '{display_name}' updated successfully!"
- **AND** collection list refreshes showing updated metadata

#### Scenario: Re-model section hidden for non-empty collections
- **GIVEN** a collection with `count > 0`
- **WHEN** user opens the Edit modal
- **THEN** the "Embedding (Re-model)" section is NOT visible
- **AND** embedding settings cannot be changed

#### Scenario: Re-model validation
- **GIVEN** Edit modal is open for an empty collection
- **WHEN** user selects an embedding connection but leaves model unselected
- **AND** attempts to save
- **THEN** validation error prevents save
- **AND** user is prompted to select an embedding model

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

### Requirement: Embedding Connection Resolution
The system SHALL resolve collection embedding connections to current configuration, handling cases where connection IDs change across config reloads.

#### Scenario: Exact connection ID match with verification
- **WHEN** collection has `embedding_connection_id: "my-ollama"` and current config contains connection "my-ollama" with matching provider and model
- **THEN** resolution returns "my-ollama"
- **AND** embedding model availability is verified via provider.listModels()

#### Scenario: Connection ID changed but provider and model available
- **WHEN** collection has `embedding_connection_id: "my-ollama"` (no longer exists) with `embedding_provider: "ollama"` and `embedding_model: "all-minilm:latest"`
- **AND** current config has connection "prod-ollama" with same provider and model
- **THEN** resolution returns "prod-ollama"
- **AND** uses first matching connection found

#### Scenario: No compatible connection found
- **WHEN** collection requires embedding model not available in any current connection
- **THEN** resolution returns null
- **AND** UI displays warning about unavailable embedding model

#### Scenario: Multiple connections with same provider and model
- **WHEN** multiple LLM connections match required provider and model
- **THEN** resolution returns first matching connection ID
- **AND** connections are interchangeable (same provider + model)

#### Scenario: Collection with no embedding metadata
- **WHEN** collection has no `embedding_provider` or `embedding_model` in metadata (no documents uploaded yet)
- **THEN** resolution returns null
- **AND** test functionality is disabled in UI

#### Scenario: Provider offline during resolution
- **WHEN** provider.listModels() throws error (provider unavailable)
- **THEN** error is caught and logged
- **AND** provider model list returned as empty array
- **AND** collections using that provider get null resolved connection

### Requirement: UI Config Embedding Connection Resolution
The `/api/ui-config` endpoint SHALL include resolved embedding connections for all collections to enable frontend testing capabilities.

#### Scenario: UI config includes resolved connections
- **WHEN** GET `/api/ui-config` is called
- **THEN** response includes collections array
- **AND** each collection has `metadata.embedding_connection` field with resolved connection ID or null

#### Scenario: Model fetching is cached per provider type
- **WHEN** config has 3 Ollama connections and 2 OpenAI connections
- **THEN** `listModels()` is called once for Ollama provider
- **AND** `listModels()` is called once for OpenAI provider
- **AND** results are reused across connections of same provider type

#### Scenario: UI config performance overhead
- **WHEN** UI config endpoint resolves embedding connections
- **THEN** total overhead is ~250-600ms depending on provider count
- **AND** caching minimizes redundant provider calls

### Requirement: Collection Test Query Endpoint
The system SHALL provide an endpoint for testing queries against collections using the collection's original embedding model.

#### Scenario: Test query with valid parameters
- **WHEN** POST `/api/collections/:name/test-query` is called with `query`, `service`, `embedding_connection`, `embedding_model`, and optional `top_k`
- **THEN** it generates embedding for query using specified connection and model
- **AND** queries collection via RAG provider
- **AND** returns results with distances, metadata, and execution time

#### Scenario: Test query response format
- **WHEN** test query executes successfully
- **THEN** response includes: `query` (text), `collection` (name), `service` (name), `results` (array with rank, distance, content, metadata), `embedding_model`, `embedding_dimensions`, `execution_time_ms`

#### Scenario: Missing query parameter
- **WHEN** POST `/api/collections/:name/test-query` is called without `query` field
- **THEN** returns 400 error: "Query text is required"

#### Scenario: Missing service parameter
- **WHEN** POST `/api/collections/:name/test-query` is called without `service` field
- **THEN** returns 400 error: "Service name is required"

#### Scenario: Missing embedding connection parameter
- **WHEN** POST `/api/collections/:name/test-query` is called without `embedding_connection` field
- **THEN** returns 400 error: "embedding_connection is required"
- **AND** includes hint: "Collection may not have embeddings configured yet"

#### Scenario: Missing embedding model parameter
- **WHEN** POST `/api/collections/:name/test-query` is called without `embedding_model` field
- **THEN** returns 400 error: "embedding_model is required"

#### Scenario: Invalid service name
- **WHEN** POST `/api/collections/:name/test-query` is called with non-existent service
- **THEN** returns 404 error: "Service '[name]' not found"

#### Scenario: Default top_k value
- **WHEN** POST `/api/collections/:name/test-query` is called without `top_k` parameter
- **THEN** defaults to 10 results

#### Scenario: Query execution timing
- **WHEN** test query is executed
- **THEN** execution time is measured from embedding generation start to results return
- **AND** included in response as `execution_time_ms`

#### Scenario: Empty results
- **WHEN** query returns no matching documents (collection empty or no matches)
- **THEN** returns successful response with empty results array
- **AND** HTTP status is 200 (not an error)

### Requirement: Collection Testing UI
The Collections page SHALL provide an interactive testing interface for querying collections with the collection's original embedding model.

#### Scenario: Test button visibility
- **WHEN** collection has `metadata.embedding_connection` not null and `count > 0`
- **THEN** "Test / Calibrate" button is visible on collection card

#### Scenario: Test button disabled states
- **WHEN** collection has `count === 0` or `metadata.embedding_connection === null`
- **THEN** "Test / Calibrate" button is disabled
- **AND** tooltip explains why (no documents or no embedding connection)

#### Scenario: Open test modal
- **WHEN** user clicks "Test / Calibrate" button
- **THEN** test modal opens
- **AND** modal displays collection name as title
- **AND** query input field is empty and focused

#### Scenario: Submit test query
- **WHEN** user enters query text and clicks "Test Query" button
- **THEN** API call is made to `/api/collections/:name/test-query`
- **AND** request includes service, embedding_connection, embedding_model from collection metadata
- **AND** loading indicator is displayed during API call

#### Scenario: Display test results
- **WHEN** test query returns successfully
- **THEN** results are displayed in sortable table
- **AND** table shows columns: Rank, Distance, Content (truncated), Metadata
- **AND** execution time and embedding dimensions displayed above table

#### Scenario: Empty query validation
- **WHEN** user attempts to submit test query with empty query text
- **THEN** validation error is displayed
- **AND** API call is not made

#### Scenario: Test query error handling
- **WHEN** test query API call fails
- **THEN** error message is displayed to user
- **AND** error details from API response are shown
- **AND** results table is cleared

#### Scenario: Results table sorting
- **WHEN** test results are displayed
- **THEN** user can sort by distance (ascending/descending)
- **AND** default sort is by rank (ascending, same as distance ascending)

#### Scenario: Content truncation
- **WHEN** document content exceeds 200 characters in results table
- **THEN** content is truncated with ellipsis
- **AND** user can click to expand full content

#### Scenario: Metadata display
- **WHEN** results include document metadata
- **THEN** metadata is displayed as formatted JSON or key-value pairs
- **AND** metadata is readable and not overwhelming

#### Scenario: No results message
- **WHEN** test query returns empty results array
- **THEN** message displayed: "No results found for this query"
- **AND** suggestions provided (try different query, check collection contents)

#### Scenario: Top K configuration
- **WHEN** user can adjust top_k value in test modal
- **THEN** default is 10
- **AND** valid range is 1-100
- **AND** value is included in API request

