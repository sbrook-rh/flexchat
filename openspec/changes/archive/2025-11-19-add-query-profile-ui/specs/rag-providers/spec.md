# rag-providers Spec Deltas

## ADDED Requirements

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

