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
The system SHALL maintain wizard-level state across all steps and provide state update mechanism for step components.

#### Scenario: Initialize wizard state
- **GIVEN** the wizard component mounts
- **WHEN** initialization occurs
- **THEN** wizard state is created with currentStep: 1
- **AND** collectionName and serviceName from props
- **AND** empty values for uploadedFile, rawDocuments, schema
- **AND** default schema with text_separator: "\n\n"

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
The system SHALL integrate with the Collections interface through prop-based communication.

#### Scenario: Open wizard with collection context
- **GIVEN** parent component (Collections) wants to open wizard
- **WHEN** it sets showUploadWizard to true
- **THEN** wizard renders with provided collectionName and serviceName
- **AND** wizard initializes with this context

#### Scenario: Complete wizard successfully
- **GIVEN** user completes all steps and uploads successfully
- **WHEN** upload finishes
- **THEN** wizard calls onComplete callback with upload result
- **AND** parent component can refresh collections list
- **AND** parent component can show success message

#### Scenario: Cancel wizard
- **GIVEN** user clicks Cancel button (and confirms if needed)
- **WHEN** cancel action completes
- **THEN** wizard calls onClose callback
- **AND** parent component can reset showUploadWizard state
- **AND** wizard is unmounted

