# rag-providers Spec Deltas

## ADDED Requirements

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

