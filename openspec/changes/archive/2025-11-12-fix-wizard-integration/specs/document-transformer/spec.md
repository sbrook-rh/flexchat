# document-transformer Spec Deltas

## MODIFIED Requirements

### Requirement: Array Field Handling
The system SHALL flatten array fields into comma-separated strings for text fields and JSON.stringify arrays for metadata fields to ensure ChromaDB compatibility.

#### Scenario: Array field flattening
- **GIVEN** a document with `{ingredients: ["flour", "sugar", "eggs"]}`
- **AND** a schema with `text_fields: ["ingredients"]`
- **WHEN** transformation is performed
- **THEN** the text field contains `"flour, sugar, eggs"`

#### Scenario: Array in metadata
- **GIVEN** a document with `{tags: ["dessert", "quick", "easy"]}`
- **AND** a schema with `metadata_fields: ["tags"]`
- **WHEN** transformation is performed
- **THEN** the metadata contains `{tags: '["dessert","quick","easy"]'}` (JSON stringified)
- **AND** the value is a string primitive compatible with ChromaDB

#### Scenario: Empty array in metadata
- **GIVEN** a document with `{tags: []}`
- **AND** a schema with `metadata_fields: ["tags"]`
- **WHEN** transformation is performed
- **THEN** the metadata contains `{tags: '[]'}` (JSON stringified empty array)

#### Scenario: Nested array in metadata
- **GIVEN** a document with `{matrix: [[1,2], [3,4]]}`
- **AND** a schema with `metadata_fields: ["matrix"]`
- **WHEN** transformation is performed
- **THEN** the metadata contains `{matrix: '[[1,2],[3,4]]'}` (JSON stringified)

