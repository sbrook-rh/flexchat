# document-transformer Specification

## Purpose
TBD - created by archiving change add-document-transformer. Update Purpose after archive.
## Requirements
### Requirement: Document Transformation Function
The system SHALL provide a pure transformation function that converts raw JSON documents to the standardized RAG format `{id, text, metadata}[]` based on a configurable schema.

#### Scenario: Basic transformation with all fields present
- **GIVEN** a raw document with `{id: "doc-1", title: "Hello", content: "World"}`
- **AND** a schema with `text_fields: ["title", "content"]`, `text_separator: " - "`, `id_field: "id"`
- **WHEN** `transformDocuments(documents, schema)` is called
- **THEN** the function returns `[{id: "doc-1", text: "Hello - World", metadata: {}}]`

#### Scenario: Custom text separator
- **GIVEN** a document with multiple text fields
- **AND** a schema with `text_separator: "\n\n"`
- **WHEN** transformation is performed
- **THEN** text fields are concatenated with double newline separator

#### Scenario: Default text separator
- **GIVEN** a schema without `text_separator` field
- **WHEN** transformation is performed
- **THEN** text fields are concatenated with `"\n\n"` (default)

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

### Requirement: Nested Object Handling
The system SHALL serialize nested objects using JSON.stringify for both text and metadata fields.

#### Scenario: Nested object in text field
- **GIVEN** a document with `{author: {name: "John", role: "Chef"}}`
- **AND** a schema with `text_fields: ["author"]`
- **WHEN** transformation is performed
- **THEN** the text contains `'{"name":"John","role":"Chef"}'`

#### Scenario: Nested object in metadata
- **GIVEN** a document with nested object in `metadata_fields`
- **WHEN** transformation is performed
- **THEN** the metadata value is JSON stringified

### Requirement: ID Generation
The system SHALL generate UUIDs for documents missing ID fields using Node.js native `crypto.randomUUID()`.

#### Scenario: Missing id_field configuration
- **GIVEN** a schema without `id_field` property
- **WHEN** transformation is performed
- **THEN** each document receives a unique UUID

#### Scenario: id_field specified but value missing
- **GIVEN** a schema with `id_field: "id"`
- **AND** a document without the `id` property
- **WHEN** transformation is performed
- **THEN** the document receives a generated UUID

#### Scenario: id_field present with value
- **GIVEN** a schema with `id_field: "id"`
- **AND** a document with `{id: "doc-123"}`
- **WHEN** transformation is performed
- **THEN** the document retains `"doc-123"` as its id

#### Scenario: Generated UUIDs are unique
- **GIVEN** multiple documents without IDs
- **WHEN** transformation is performed
- **THEN** each document receives a distinct UUID

### Requirement: Metadata Collection
The system SHALL collect metadata from specified fields and merge with static metadata.

#### Scenario: Dynamic metadata extraction
- **GIVEN** a document with `{category: "dessert", author: "John"}`
- **AND** a schema with `metadata_fields: ["category", "author"]`
- **WHEN** transformation is performed
- **THEN** metadata contains `{category: "dessert", author: "John"}`

#### Scenario: Static metadata application
- **GIVEN** a schema with `metadata_static: {doc_type: "article", source: "api"}`
- **WHEN** transformation is performed
- **THEN** all documents include static metadata in their metadata object

#### Scenario: Static and dynamic metadata merge
- **GIVEN** a schema with both `metadata_fields` and `metadata_static`
- **WHEN** transformation is performed
- **THEN** resulting metadata contains both static and dynamic fields

#### Scenario: Missing metadata fields are skipped
- **GIVEN** a document missing some fields listed in `metadata_fields`
- **WHEN** transformation is performed
- **THEN** only present fields are included in metadata

### Requirement: Graceful Missing Field Handling
The system SHALL skip missing or empty text fields gracefully without throwing errors, unless ALL text fields are missing.

#### Scenario: Some text fields missing
- **GIVEN** a document with `{title: "Hello"}`
- **AND** a schema with `text_fields: ["title", "content", "summary"]`
- **WHEN** transformation is performed
- **THEN** only `"Hello"` appears in the text field

#### Scenario: All text fields missing
- **GIVEN** a document with `{id: "doc-1", unrelated: "data"}`
- **AND** a schema with `text_fields: ["title", "content"]`
- **WHEN** transformation is performed
- **THEN** the function throws an error: "No text content generated from text_fields"

#### Scenario: Null and undefined values are skipped
- **GIVEN** a document with `{title: "Hello", content: null, summary: undefined}`
- **AND** a schema with `text_fields: ["title", "content", "summary"]`
- **WHEN** transformation is performed
- **THEN** only `"Hello"` appears in the text

#### Scenario: Empty string values are skipped
- **GIVEN** a document with `{title: "Hello", content: "", summary: "   "}`
- **WHEN** transformation is performed
- **THEN** only `"Hello"` appears in the text (empty and whitespace-only strings are filtered)

### Requirement: Schema Validation
The system SHALL validate the transformation schema on function entry and fail fast with clear error messages for invalid schemas.

#### Scenario: Missing text_fields
- **GIVEN** a schema without `text_fields` property
- **WHEN** `transformDocuments()` is called
- **THEN** the function throws an error: "Schema must include text_fields array"

#### Scenario: Empty text_fields array
- **GIVEN** a schema with `text_fields: []`
- **WHEN** `transformDocuments()` is called
- **THEN** the function throws an error: "text_fields cannot be empty"

#### Scenario: Invalid text_fields type
- **GIVEN** a schema with `text_fields: "title"`
- **WHEN** `transformDocuments()` is called
- **THEN** the function throws an error indicating text_fields must be an array

#### Scenario: Invalid metadata_fields type
- **GIVEN** a schema with `metadata_fields: "category"`
- **WHEN** `transformDocuments()` is called
- **THEN** the function throws an error indicating metadata_fields must be an array

#### Scenario: Valid minimal schema
- **GIVEN** a schema with only `text_fields: ["title"]`
- **WHEN** `transformDocuments()` is called
- **THEN** the function proceeds without validation errors

### Requirement: Stateless Pure Function
The system SHALL implement the transformation as a pure function with no side effects, I/O operations, or external state dependencies.

#### Scenario: Same input produces same output
- **GIVEN** identical documents and schema
- **WHEN** `transformDocuments()` is called multiple times
- **THEN** the output is identical each time (excluding generated UUIDs)

#### Scenario: No file system access
- **WHEN** `transformDocuments()` is called
- **THEN** the function performs no file system operations

#### Scenario: No network calls
- **WHEN** `transformDocuments()` is called
- **THEN** the function makes no network requests

#### Scenario: No global state mutation
- **WHEN** `transformDocuments()` is called
- **THEN** no global variables or objects are modified

