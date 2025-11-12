# document-upload-ui Spec Deltas

## ADDED Requirements

### Requirement: Schema Prefill from Saved Metadata
The system SHALL pre-populate field mappings when a collection has a saved document schema, reducing manual configuration for repeat uploads.

#### Scenario: Initialize with saved schema
- **GIVEN** a collection has `document_schema` in metadata with `{ text_fields: ["title"], id_field: "id", metadata_fields: ["category"] }`
- **WHEN** the wizard initializes
- **THEN** the wizard state is initialized with the saved schema values
- **AND** `wizardState.schema.text_fields` contains `["title"]`
- **AND** `wizardState.schema.id_field` is `"id"`
- **AND** `wizardState.schema.metadata_fields` contains `["category"]`

#### Scenario: Initialize without saved schema
- **GIVEN** a collection has no `document_schema` in metadata
- **WHEN** the wizard initializes
- **THEN** the wizard state is initialized with empty defaults
- **AND** `wizardState.schema.text_fields` is an empty array
- **AND** `wizardState.schema.id_field` is null
- **AND** `wizardState.schema.metadata_fields` is an empty array

#### Scenario: Pre-check radio buttons for matching fields
- **GIVEN** wizard initialized with saved schema `{ text_fields: ["title"], metadata_fields: ["region"] }`
- **AND** user uploads a file with fields `["title", "description", "region"]`
- **WHEN** Step 2 (Field Mapping) is displayed
- **THEN** the "title" field's text radio button is pre-checked
- **AND** the "region" field's metadata radio button is pre-checked
- **AND** the "description" field has no pre-checked radio buttons
- **AND** user can still change any selections via onChange handlers

#### Scenario: Handle schema mismatch pragmatically
- **GIVEN** wizard initialized with saved schema `{ text_fields: ["instructions", "recipe"] }`
- **AND** user uploads a file with fields `["name", "description"]`
- **WHEN** Step 2 (Field Mapping) is displayed
- **THEN** all radio buttons are unchecked (no matching fields)
- **AND** no warning messages are displayed
- **AND** wizard functions normally

#### Scenario: Handle malformed schema JSON
- **GIVEN** collection metadata has malformed `document_schema`: `"{ broken json"`
- **WHEN** the wizard initializes
- **THEN** JSON.parse fails and is caught by try/catch
- **AND** a warning is logged to console: `"Failed to parse document_schema:"`
- **AND** wizard initializes with empty defaults (fallback behavior)
- **AND** wizard functions normally without errors

#### Scenario: Smart checkbox default based on schema existence
- **GIVEN** wizard is initializing
- **WHEN** no saved schema exists
- **THEN** `wizardState.saveSchema` is initialized to `true` (encourage saving)
- **WHEN** a saved schema exists
- **THEN** `wizardState.saveSchema` is initialized to `false` (avoid overwrite unless user chooses)

## MODIFIED Requirements

### Requirement: Wizard State Management
The system SHALL maintain wizard-level state across all steps and provide state update mechanism for step components, initializing from saved schemas when available.

#### Scenario: Initialize wizard state
- **GIVEN** the wizard component mounts
- **WHEN** initialization occurs
- **THEN** wizard state is created with currentStep: 1
- **AND** collectionName and serviceName from props
- **AND** empty values for uploadedFile, rawDocuments, schema
- **AND** default schema with text_separator: "\n\n"
- **AND** `saveSchema` initialized based on whether `collectionMetadata.document_schema` exists (true if no schema, false if schema exists)
- **AND** if `collectionMetadata.document_schema` exists and is valid JSON, schema fields are initialized with parsed values

#### Scenario: Step component updates wizard state
- **GIVEN** user is on Step 1 (File Upload)
- **WHEN** the step component calls onUpdate with new data
- **THEN** the wizard state is updated with the new values
- **AND** other state properties remain unchanged
- **AND** state update triggers re-render

#### Scenario: State persists across step navigation
- **GIVEN** user uploads a file on Step 1
- **AND** advances to Step 2
- **AND** configures field mappings
- **WHEN** user navigates back to Step 1
- **THEN** the uploaded file is still present
- **AND** when returning to Step 2, the field mappings are still configured

#### Scenario: Wizard state structure
- **GIVEN** the wizard is managing state
- **WHEN** state is accessed
- **THEN** it contains currentStep (number 1-3)
- **AND** collectionName and serviceName (strings)
- **AND** uploadedFile (File object or null)
- **AND** rawDocuments (array of objects)
- **AND** schema object with text_fields, text_separator, metadata_fields, id_field
- **AND** detectedFields (array of field names)
- **AND** previewDocuments (array of transformed documents)
- **AND** uploadProgress (number 0-100 or null)
- **AND** saveSchema (boolean indicating whether to persist schema)

### Requirement: Integration with Parent Component
The system SHALL integrate with the Collections interface through prop-based communication and use the existing document upload endpoint, refreshing the collections list after successful uploads.

#### Scenario: Open wizard with collection context
- **GIVEN** parent component (Collections) wants to open wizard
- **AND** parent has resolved a compatible embedding connection
- **WHEN** it renders DocumentUploadWizard
- **THEN** wizard receives `collectionName`, `serviceName`, `collectionMetadata`, and `resolvedConnection` as props
- **AND** wizard initializes with this context

#### Scenario: Complete wizard successfully
- **GIVEN** user completes all steps and clicks Upload button
- **WHEN** upload request is sent to `/api/collections/${collectionName}/documents`
- **THEN** the request body includes `raw_documents`, `schema`, `save_schema` (wizard-specific)
- **AND** the request body includes `service`, `embedding_connection`, `embedding_model` (from props)
- **AND** on success, wizard calls `onComplete` callback with upload result
- **AND** parent component calls `reloadConfig()` to refresh collections list
- **AND** parent component displays success message

#### Scenario: Upload request format matches existing endpoint
- **GIVEN** wizard is ready to upload documents
- **WHEN** the upload request is constructed
- **THEN** it uses endpoint `/api/collections/${collectionName}/documents` (not `/api/collections/:service/:name/upload`)
- **AND** `service` parameter comes from `serviceName` prop
- **AND** `embedding_connection` parameter comes from `resolvedConnection` prop
- **AND** `embedding_model` parameter comes from `collectionMetadata.embedding_model`
- **AND** the request format matches the existing "Upload Docs" button implementation

#### Scenario: Cancel wizard
- **GIVEN** user clicks Cancel button (and confirms if needed)
- **WHEN** cancel action completes
- **THEN** wizard calls `onClose` callback
- **AND** parent component resets wizard visibility state
- **AND** wizard is unmounted

#### Scenario: Parent resolves connection before opening wizard
- **GIVEN** parent component wants to open the wizard for a collection
- **WHEN** it calls connection resolution logic
- **THEN** it searches configured LLM connections for one matching collection's embedding provider and model
- **AND** if found, it stores the connection ID and opens the wizard
- **AND** if not found, it displays an error message and does not open the wizard
- **AND** wizard only renders after connection resolution succeeds

#### Scenario: Error handling during upload
- **GIVEN** upload request fails (network error, validation error, or backend error)
- **WHEN** the error is caught
- **THEN** wizard displays error message to user
- **AND** wizard exits uploading state (re-enables Upload button)
- **AND** wizard does not call `onComplete` callback
- **AND** wizard remains open for user to retry or cancel

#### Scenario: Collections list refreshes after upload
- **GIVEN** wizard upload completes successfully
- **WHEN** `onComplete` callback is invoked
- **THEN** parent component calls `reloadConfig()` function
- **AND** collections list is refreshed with latest metadata
- **AND** updated `document_schema` is available for next upload

