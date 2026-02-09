# Collections Spec Delta

## MODIFIED Requirements

### Requirement: Collection Edit UI
The system SHALL provide a user interface for editing collection metadata, with the display name as the primary editable field and support for changing embedding models when the collection is empty.

#### Scenario: Re-model empty collection
- **GIVEN** a collection with `count === 0` and current embedding settings `{connection: "openai", model: "text-embedding-ada-002"}`
- **WHEN** user opens the Edit modal
- **THEN** an "Embedding (Re-model)" section appears below the basic metadata fields
- **AND** section shows embedding connection dropdown (populated from available LLM connections)
- **AND** section shows embedding model dropdown (initially empty)
- **AND** current embedding connection is pre-selected
- **AND** when user selects a connection, embedding models are fetched and displayed
- **AND** user can select a different embedding model

#### Scenario: Save re-model changes
- **GIVEN** Edit modal is open for an empty collection
- **WHEN** user changes embedding connection to "gemini" and model to "text-embedding-004"
- **AND** clicks "Save Changes"
- **THEN** collection metadata is updated with new embedding settings
- **AND** success message shows "Collection '{display_name}' updated successfully!"
- **AND** collection list refreshes showing updated metadata

#### Scenario: Re-model section hidden for non-empty collections
- **GIVEN** a collection with `count > 0`
- **WHEN** user opens the Edit modal
- **THEN** the "Embedding (Re-model)" section is NOT visible
- **AND** embedding settings cannot be changed

#### Scenario: Re-model validation
- **GIVEN** Edit modal is open for an empty collection
- **WHEN** user selects an embedding connection but leaves model unselected
- **AND** attempts to save
- **THEN** validation error prevents save
- **AND** user is prompted to select an embedding model

## ADDED Requirements

### Requirement: Empty Collection Action
The system SHALL provide a UI action to remove all documents from a collection while preserving collection metadata and settings.

#### Scenario: Empty button visibility
- **GIVEN** a collection with `count > 0`
- **WHEN** viewing the collection card
- **THEN** an "Empty" button is visible alongside Edit/Delete buttons
- **AND** button is styled with warning colors (similar to Delete)

#### Scenario: Empty button hidden when empty
- **GIVEN** a collection with `count === 0`
- **WHEN** viewing the collection card
- **THEN** the "Empty" button is NOT visible

#### Scenario: Empty confirmation dialog
- **GIVEN** a collection "Red Hat Docs" with 5000 documents
- **WHEN** user clicks the "Empty" button
- **THEN** a confirmation dialog appears
- **AND** dialog shows "Empty collection 'Red Hat Docs'?"
- **AND** dialog shows "This will delete all 5000 document(s)."
- **AND** dialog shows "The collection settings and metadata will be preserved."
- **AND** dialog shows "This action cannot be undone."
- **AND** dialog provides "Cancel" and "Confirm" options

#### Scenario: Empty cancelled
- **GIVEN** the empty confirmation dialog is open
- **WHEN** user clicks "Cancel"
- **THEN** dialog closes
- **AND** no documents are deleted
- **AND** collection state is unchanged

#### Scenario: Empty confirmed
- **GIVEN** confirmation dialog for collection with 5000 documents
- **WHEN** user clicks "Confirm"
- **THEN** backend endpoint is called to empty the collection
- **AND** on success, message shows "Emptied 'Red Hat Docs' - deleted 5000 documents"
- **AND** collection list is refreshed
- **AND** collection now shows `count: 0`
- **AND** "Empty" button is no longer visible
- **AND** "Re-model" section appears in Edit modal

#### Scenario: Empty already-empty collection
- **GIVEN** a collection with `count === 0`
- **WHEN** backend receives an empty request (via direct API call)
- **THEN** endpoint returns success with `count_deleted: 0`
- **AND** no errors are raised

#### Scenario: Empty error handling
- **GIVEN** user attempts to empty a collection
- **WHEN** backend returns an error (e.g., collection not found, network failure)
- **THEN** error message is displayed to user
- **AND** collection state remains unchanged

