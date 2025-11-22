# collections Spec Deltas

## ADDED Requirements

### Requirement: Collection Edit UI
The system SHALL provide a user interface for editing collection metadata, with the display name as the primary editable field.

#### Scenario: Edit modal shows display name
- **GIVEN** a collection with `metadata.display_name` set to "Red Hat OpenShift AI" and `name` set to "red-hat-openshift-ai"
- **WHEN** user clicks "Edit" button for the collection
- **THEN** the Edit modal opens
- **AND** modal title shows "Edit Collection: Red Hat OpenShift AI" (using display_name)
- **AND** an editable "Display Name" field is shown with current value "Red Hat OpenShift AI"
- **AND** collection ID (name) is NOT shown as an editable field

#### Scenario: Edit display name
- **GIVEN** the Edit modal is open for a collection
- **WHEN** user changes the "Display Name" field from "Red Hat OpenShift AI" to "Red Hat OpenShift AI Platform"
- **AND** clicks "Save Changes"
- **THEN** the collection's `metadata.display_name` is updated to "Red Hat OpenShift AI Platform"
- **AND** collection `name` (ID) remains unchanged
- **AND** other metadata fields are preserved (merge mode)
- **AND** success message shows "Collection 'Red Hat OpenShift AI Platform' updated successfully!"

#### Scenario: Display name validation
- **GIVEN** the Edit modal is open
- **WHEN** user clears the "Display Name" field (empty string)
- **AND** attempts to save
- **THEN** validation error prevents save
- **AND** user is prompted to enter a display name

#### Scenario: Backward compatibility with missing display name
- **GIVEN** a collection created before display_name was added (no `metadata.display_name`)
- **WHEN** user opens the Edit modal
- **THEN** the "Display Name" field shows the collection `name` as fallback
- **AND** user can edit it to set a proper display name
- **AND** after save, `metadata.display_name` is populated

#### Scenario: Edit modal shows immutable fields as read-only
- **GIVEN** the Edit modal is open
- **WHEN** viewing the modal
- **THEN** embedding settings (provider, model, dimensions, connection ID) are displayed as read-only
- **AND** help text clarifies "Embedding settings are fixed for this collection"
- **AND** only metadata fields (display_name, description, thresholds) are editable

