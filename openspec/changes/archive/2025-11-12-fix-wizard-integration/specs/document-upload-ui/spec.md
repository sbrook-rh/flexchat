# document-upload-ui Spec Deltas

## ADDED Requirements

### Requirement: Schema Persistence Control
The system SHALL provide a checkbox in the Preview step allowing users to control whether the schema is persisted to collection metadata.

#### Scenario: First upload to collection (no existing schema)
- **GIVEN** user is on Step 3 (Preview & Upload)
- **AND** the collection has no `document_schema` in its metadata
- **WHEN** the Preview step is rendered
- **THEN** a checkbox is displayed with label "Save this configuration for future uploads"
- **AND** the checkbox is checked by default

#### Scenario: Subsequent upload to collection (existing schema)
- **GIVEN** user is on Step 3 (Preview & Upload)
- **AND** the collection already has a `document_schema` in its metadata
- **WHEN** the Preview step is rendered
- **THEN** a checkbox is displayed with label "Update existing schema"
- **AND** the checkbox is unchecked by default

#### Scenario: User toggles schema persistence
- **GIVEN** the save schema checkbox is displayed
- **WHEN** user clicks the checkbox
- **THEN** `wizardState.saveSchema` is updated with the checkbox value
- **AND** the value is sent in the upload request as `save_schema` parameter

#### Scenario: Upload with schema persistence enabled
- **GIVEN** user has checked the save schema checkbox
- **WHEN** upload completes successfully
- **THEN** the request includes `save_schema: true`
- **AND** the schema is persisted to collection metadata
- **AND** future uploads can reuse the saved schema

#### Scenario: Upload with schema persistence disabled
- **GIVEN** user has unchecked the save schema checkbox
- **WHEN** upload completes successfully
- **THEN** the request includes `save_schema: false`
- **AND** the schema is not persisted to collection metadata
- **AND** the upload is a one-off operation

## MODIFIED Requirements

### Requirement: Integration with Parent Component
The system SHALL integrate with the Collections interface through prop-based communication and use the existing document upload endpoint.

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
- **AND** parent component refreshes collections list via `reloadConfig()`
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

### Requirement: Wizard State Management
The system SHALL maintain wizard-level state across all steps and provide state update mechanism for step components.

#### Scenario: Initialize wizard state
- **GIVEN** the wizard component mounts
- **WHEN** initialization occurs
- **THEN** wizard state is created with currentStep: 1
- **AND** collectionName and serviceName from props
- **AND** empty values for uploadedFile, rawDocuments, schema
- **AND** default schema with text_separator: "\n\n"
- **AND** `saveSchema` initialized based on whether `collectionMetadata.document_schema` exists (true if no schema, false if schema exists)

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

