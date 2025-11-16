# document-upload-ui Specification

## Purpose
TBD - created by archiving change add-document-upload-wizard-shell. Update Purpose after archive.
## Requirements
### Requirement: Modal Wizard Shell
The system SHALL provide a modal-based wizard shell component for guided document upload with multi-step navigation.

#### Scenario: Open wizard from collections interface
- **GIVEN** a user is viewing a collection
- **WHEN** they click "Upload Documents" button
- **THEN** the Document Upload Wizard modal opens
- **AND** the wizard initializes with the collection name and service
- **AND** Step 1 (File Upload) is displayed

#### Scenario: Wizard modal structure
- **GIVEN** the wizard is open
- **WHEN** rendered
- **THEN** it displays a fixed overlay backdrop preventing background interaction
- **AND** a centered modal container with maximum width of 1024px (max-w-4xl)
- **AND** a sticky header showing "Upload Documents" title and close button
- **AND** a content area displaying the current step
- **AND** a sticky footer with navigation buttons

#### Scenario: Close wizard with confirmation
- **GIVEN** the wizard has uploaded data or entered field mappings
- **WHEN** user clicks Cancel or close button
- **THEN** a confirmation dialog appears asking "Discard changes?"
- **AND** if confirmed, the wizard closes and data is lost
- **AND** if cancelled, the wizard remains open

#### Scenario: Close empty wizard without confirmation
- **GIVEN** the wizard has no uploaded data
- **WHEN** user clicks Cancel or close button
- **THEN** the wizard closes immediately without confirmation

### Requirement: Multi-Step Navigation
The system SHALL provide linear step progression with validation-based navigation controls.

#### Scenario: Step 1 initial state
- **GIVEN** the wizard just opened
- **WHEN** Step 1 is displayed
- **THEN** the progress indicator shows "Step 1 of 3"
- **AND** the Back button is hidden
- **AND** the Next button is disabled (no file uploaded yet)
- **AND** the Cancel button is visible

#### Scenario: Advance from Step 1 to Step 2
- **GIVEN** user is on Step 1
- **AND** a file has been uploaded and parsed successfully
- **WHEN** user clicks Next button
- **THEN** the wizard advances to Step 2 (Field Mapping)
- **AND** the progress indicator updates to "Step 2 of 3"
- **AND** the Back button becomes visible
- **AND** uploaded data is preserved in wizard state

#### Scenario: Navigate back from Step 2 to Step 1
- **GIVEN** user is on Step 2
- **WHEN** user clicks Back button
- **THEN** the wizard returns to Step 1
- **AND** the progress indicator shows "Step 1 of 3"
- **AND** previously uploaded file and data are still present

#### Scenario: Advance from Step 2 to Step 3
- **GIVEN** user is on Step 2
- **AND** at least one text field has been selected in the schema
- **WHEN** user clicks Next button
- **THEN** the wizard advances to Step 3 (Preview & Upload)
- **AND** the Next button changes to Upload button
- **AND** schema configuration is preserved in wizard state

#### Scenario: Cannot advance without required data
- **GIVEN** user is on Step 1
- **AND** no file has been uploaded
- **WHEN** the Next button is rendered
- **THEN** it is disabled with gray styling
- **AND** cursor shows not-allowed on hover

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

### Requirement: Step Validation
The system SHALL validate step completion requirements before allowing navigation to the next step.

#### Scenario: Step 1 validation requirements
- **GIVEN** user is on Step 1
- **WHEN** validation check runs
- **THEN** step is valid if uploadedFile is not null
- **AND** rawDocuments array has length greater than 0
- **AND** Next button is enabled only when both conditions met

#### Scenario: Step 2 validation requirements
- **GIVEN** user is on Step 2
- **WHEN** validation check runs
- **THEN** step is valid if schema.text_fields array has length greater than 0
- **AND** Next button is enabled when condition met

#### Scenario: Step 3 validation (always valid)
- **GIVEN** user is on Step 3
- **WHEN** validation check runs
- **THEN** step is always considered valid (preview/upload step)
- **AND** Upload button is always enabled

### Requirement: Step Component Integration
The system SHALL provide a plugin framework for step components with consistent props and state access.

#### Scenario: Render current step component
- **GIVEN** wizard state has currentStep value
- **WHEN** content area is rendered
- **THEN** only the component matching currentStep is displayed
- **AND** other step components are not rendered
- **AND** the current step receives wizardState prop
- **AND** the current step receives onUpdate callback prop

#### Scenario: Step component receives wizard state
- **GIVEN** FileUploadStep is rendered
- **WHEN** the component accesses props
- **THEN** it receives complete wizardState object
- **AND** can read collectionName, serviceName, and all other state

#### Scenario: Step component updates state
- **GIVEN** FieldMappingStep needs to update schema
- **WHEN** it calls onUpdate callback
- **THEN** it passes a function that receives previous state
- **AND** returns updated state with modified values
- **AND** wizard state is updated via setWizardState

### Requirement: Visual Progress Indicator
The system SHALL display the current step number and total steps to provide progress feedback.

#### Scenario: Display step progress
- **GIVEN** wizard is on any step
- **WHEN** the header is rendered
- **THEN** it displays "Step X of 3" where X is the current step number
- **AND** the text is styled with gray color (text-gray-500)
- **AND** positioned below the main title

#### Scenario: Progress updates with navigation
- **GIVEN** user is on Step 1 ("Step 1 of 3")
- **WHEN** user clicks Next to advance
- **THEN** the progress indicator updates to "Step 2 of 3"
- **AND** updates are immediate without delay

### Requirement: Accessibility and Keyboard Navigation
The system SHALL support keyboard navigation and screen reader accessibility for the wizard interface.

#### Scenario: Keyboard focus management
- **GIVEN** the wizard modal opens
- **WHEN** it is displayed
- **THEN** focus is set to the close button or first interactive element
- **AND** Tab key cycles through interactive elements in logical order
- **AND** Escape key triggers cancel/close action

#### Scenario: Button aria labels
- **GIVEN** navigation buttons are rendered
- **WHEN** inspected for accessibility
- **THEN** Cancel button has clear label
- **AND** Back button has clear label
- **AND** Next button has clear label describing action
- **AND** disabled state is communicated to screen readers

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

### Requirement: Multi-Format File Parsing
The system SHALL parse both JSON array (.json) and JSONL (.jsonl) file formats with file size validation and clear error reporting.

#### Scenario: Parse JSON array format (existing behavior)
- **GIVEN** user uploads a `.json` file
- **WHEN** the file content is `[{"title": "Doc 1"}, {"title": "Doc 2"}]`
- **THEN** the file is parsed with `JSON.parse()`
- **AND** array validation confirms it contains 2 document objects
- **AND** documents are available in wizard state

#### Scenario: Parse JSONL format
- **GIVEN** user uploads a `.jsonl` file
- **WHEN** the file content is:
  ```
  {"title": "Doc 1"}
  {"title": "Doc 2"}
  ```
- **THEN** the file is parsed line-by-line
- **AND** each line is parsed as a separate JSON object
- **AND** the resulting array contains 2 document objects
- **AND** documents are available in wizard state

#### Scenario: Handle empty lines in JSONL
- **GIVEN** user uploads a `.jsonl` file
- **WHEN** the file contains empty lines or trailing newlines:
  ```
  {"title": "Doc 1"}
  
  {"title": "Doc 2"}
  
  ```
- **THEN** empty lines are filtered out silently
- **AND** an info message displays: "ℹ️ Skipped 2 empty lines. Parsed 2 documents."
- **AND** the resulting array contains only the 2 valid documents

#### Scenario: JSONL parse error with line number
- **GIVEN** user uploads a `.jsonl` file
- **WHEN** line 3 contains malformed JSON: `{"title": "Doc" broken}`
- **THEN** parsing stops at the malformed line
- **AND** error message displays: "Parse error at line 3: [specific JSON error]"
- **AND** wizard state is cleared (rawDocuments set to null)

#### Scenario: Small file (no warnings)
- **GIVEN** user uploads a file
- **WHEN** file size is less than 10MB
- **THEN** file is parsed without any size warnings
- **AND** normal parsing proceeds

#### Scenario: Large file warning
- **GIVEN** user uploads a file
- **WHEN** file size is between 10MB and 50MB (e.g., 15MB)
- **THEN** an info message displays: "⚠️ Large file detected (15.0MB). Parsing may take a few seconds."
- **AND** parsing proceeds normally after the warning

#### Scenario: Oversized file rejection
- **GIVEN** user uploads a file
- **WHEN** file size exceeds 50MB (e.g., 60MB)
- **THEN** an error message displays: "File too large (60.0MB). Maximum size is 50MB. Consider splitting your file or processing in batches."
- **AND** parsing does not proceed
- **AND** wizard state remains unchanged

#### Scenario: File input accepts both formats
- **GIVEN** the file input element is rendered
- **WHEN** inspecting the `accept` attribute
- **THEN** it includes `.json,.jsonl,application/json`
- **AND** file picker shows both JSON and JSONL files

#### Scenario: Help text mentions JSONL support
- **GIVEN** the file upload step is rendered
- **WHEN** viewing the format example section
- **THEN** help text shows JSON array format example
- **AND** includes a brief note: "JSONL (.jsonl) also supported - one JSON object per line."

#### Scenario: Format detection based on extension
- **GIVEN** a file is uploaded
- **WHEN** the filename ends with `.jsonl`
- **THEN** JSONL parsing is used (line-by-line)
- **WHEN** the filename ends with `.json` or any other extension
- **THEN** JSON array parsing is used (single JSON.parse)

#### Scenario: File validation requirements unchanged
- **GIVEN** a file is successfully parsed (either format)
- **WHEN** validation runs
- **THEN** the result must be an array
- **AND** the array must contain at least one document
- **AND** all items must be objects (not null, not primitives)
- **AND** same validation rules apply regardless of format

