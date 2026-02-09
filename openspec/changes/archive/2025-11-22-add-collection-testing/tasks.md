# Implementation Tasks

## 1. Backend - Embedding Connection Resolution

- [x] 1.1 Add `resolveEmbeddingConnection()` helper function
  - Matches historical connection ID to current config
  - Strategy 1: Try exact ID match with provider/model verification
  - Strategy 2: Find any connection with matching provider + model
  - Returns null if no compatible connection found

- [x] 1.2 Add `fetchProviderEmbeddingModels()` helper function
  - Fetches available embedding models from provider with error handling
  - Filters to embedding-capable models only
  - Returns empty array on provider errors (graceful degradation)

- [x] 1.3 Modify `/api/ui-config` endpoint
  - Fetch models per provider type (cached per provider, not per connection)
  - Resolve embedding connections for all collections
  - Add `embedding_connection` field to collection metadata
  - Handle offline providers gracefully

## 2. Backend - Test Query Endpoint

- [x] 2.1 Create `POST /api/collections/:name/test-query` route
  - Validate required parameters: query, service, embedding_connection, embedding_model
  - Follow existing service parameter pattern from document upload
  - Return helpful error messages for missing parameters

- [x] 2.2 Implement query execution logic
  - Reuse `generateEmbeddings()` from embedding-generator.js
  - Call `provider.query()` with collection name and embedding
  - Track execution time for performance visibility

- [x] 2.3 Format response with metadata
  - Include query text, collection name, service
  - Include results array with distances
  - Include embedding model, dimensions, execution time

## 3. Frontend - Test Modal UI

- [x] 3.1 Add "Test / Calibrate" button to collection cards
  - Position alongside Edit/Upload/Delete buttons
  - Disable if collection has no documents or no resolved embedding connection
  - Open test modal on click

- [x] 3.2 Create TestModal component
  - Query input field (textarea or text input)
  - Top K selector (default: 10)
  - Submit button with loading state
  - Error display for API failures

- [x] 3.3 Implement query submission
  - Extract collection metadata (service, embedding_connection, embedding_model)
  - Call test-query endpoint with POST request
  - Handle loading, success, and error states

- [x] 3.4 Create results display table
  - Columns: Rank, Distance, Content (truncated), Metadata
  - Sortable by distance
  - Expandable rows for full content
  - Display embedding dimensions and execution time

## 4. Edge Case Handling

- [x] 4.1 Handle collections with no embeddings
  - Check for missing embedding_provider or embedding_model
  - Disable test button with tooltip message
  - Display warning in UI

- [x] 4.2 Handle unavailable embedding models
  - Resolution returns null for missing models
  - Show warning message to user
  - Suggest re-uploading documents with available model

- [x] 4.3 Handle provider offline during resolution
  - Catch errors in fetchProviderEmbeddingModels()
  - Return empty array, log warning
  - Collections using that provider get null connection

## 5. Testing & Documentation

- [x] 5.1 Manual testing
  - Test with collection using available embedding model
  - Test with collection using unavailable model
  - Test with empty collection
  - Test with provider offline

- [x] 5.2 Test query endpoint validation
  - Missing query parameter
  - Missing service parameter
  - Missing embedding_connection parameter
  - Invalid collection name

- [x] 5.3 UI edge cases
  - No results returned
  - Very long query text
  - Very long document content in results
  - Network errors during query

- [x] 5.4 Update API documentation
  - Document test-query endpoint in API_REFERENCE.md
  - Include request/response examples
  - Note embedding connection resolution behavior

