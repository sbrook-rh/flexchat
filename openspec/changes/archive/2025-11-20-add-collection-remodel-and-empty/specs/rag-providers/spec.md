# RAG Providers Spec Delta

## ADDED Requirements

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

