## ADDED Requirements

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

