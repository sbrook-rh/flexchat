# collections Spec Deltas

## ADDED Requirements

### Requirement: Metadata Merge Mode
The system SHALL provide a merge mode for collection metadata updates, allowing partial updates without replacing all metadata fields.

#### Scenario: Merge mode preserves existing fields
- **GIVEN** a collection with metadata `{"description": "Test", "match_threshold": 0.5, "existing_field": "value"}`
- **WHEN** client updates with `merge=true` and metadata `{"new_field": "new_value"}`
- **THEN** the collection metadata becomes `{"description": "Test", "match_threshold": 0.5, "existing_field": "value", "new_field": "new_value"}`
- **AND** existing fields are preserved

#### Scenario: Replace mode overwrites all fields (backward compat)
- **GIVEN** a collection with metadata `{"description": "Test", "match_threshold": 0.5, "existing_field": "value"}`
- **WHEN** client updates with `merge=false` (or omitted) and metadata `{"new_field": "new_value"}`
- **THEN** the collection metadata becomes `{"new_field": "new_value"}`
- **AND** existing fields are discarded (current behavior preserved)

#### Scenario: Merge mode default is false
- **GIVEN** a metadata update request without merge parameter specified
- **WHEN** the update is processed
- **THEN** the system treats it as `merge=false` (full replace)
- **AND** backward compatibility is maintained

### Requirement: Query Profile Configuration UI
The system SHALL provide a user interface for configuring query profiles on collections, specifically categorical filtering rules.

#### Scenario: Search Settings button visibility
- **GIVEN** a collection with `document_schema.metadata_fields` defined (parsed from stringified JSON in collection metadata)
- **WHEN** viewing the collection in the UI
- **THEN** a "Search Settings" button is displayed
- **AND** clicking opens the Profile modal

#### Scenario: Search Settings button hidden when no document metadata fields
- **GIVEN** a collection without `document_schema` or with empty `metadata_fields` array
- **WHEN** viewing the collection in the UI
- **THEN** the "Search Settings" button is NOT displayed
- **AND** categorical filtering is not available (no fields to filter on)

#### Scenario: Load existing query profile
- **GIVEN** a collection with `query_profile` JSON in metadata
- **WHEN** user opens the Profile modal
- **THEN** the form loads the parsed `query_profile` structure
- **AND** displays configured fields, values, and defaults

#### Scenario: Load empty profile for new configuration
- **GIVEN** a collection without existing `query_profile`
- **WHEN** user opens the Profile modal
- **THEN** the form loads with empty categorical filtering structure
- **AND** user can add new field configurations

#### Scenario: Fetch available values for field
- **GIVEN** the Profile modal is open and user selects a field
- **WHEN** field is selected from `document_schema.metadata_fields`
- **THEN** the system fetches unique values from collection documents via metadata-values endpoint
- **AND** displays loading state while fetching
- **AND** shows fetched values as multi-select options

#### Scenario: Add categorical filter field with selected values
- **GIVEN** the Profile modal has fetched values for a field
- **WHEN** user selects one or more values from the fetched list
- **THEN** the field appears in `categorical_filtering.fields` with type "exact_match"
- **AND** values array contains only the selected values (not all available values)

#### Scenario: Set default value for categorical field
- **GIVEN** a categorical filter field with multiple values
- **WHEN** user selects one value as default
- **THEN** the field's `default` property is set to that value
- **AND** future queries will use this default if not overridden

#### Scenario: Remove categorical filter field
- **GIVEN** a configured categorical filter field
- **WHEN** user clicks remove button for that field
- **THEN** the field is removed from `categorical_filtering.fields`
- **AND** the field no longer appears in the form

#### Scenario: Save query profile with merge
- **GIVEN** changes made in the Profile modal
- **WHEN** user clicks Save
- **THEN** the system stringifies the `query_profile` structure
- **AND** sends update with `merge=true` to preserve other metadata
- **AND** only `query_profile` and `updated_at` are modified

#### Scenario: Query profile JSON round-trip
- **GIVEN** a saved `query_profile` with categorical filtering
- **WHEN** page reloads and collection data is fetched
- **THEN** the `query_profile` string is parsed correctly
- **AND** displays in Profile modal with all fields/values intact

#### Scenario: Invalid query profile JSON degrades gracefully
- **GIVEN** a collection with malformed `query_profile` JSON
- **WHEN** user opens the Profile modal
- **THEN** the system logs parse error to console
- **AND** loads empty profile structure (does not crash)

### Requirement: Query Profile Data Structure
The system SHALL store query profiles as stringified JSON in collection metadata, following ChromaDB's primitive-value constraint.

#### Scenario: Query profile storage format
- **GIVEN** a categorical filtering configuration
- **WHEN** saved to collection metadata
- **THEN** `query_profile` is stored as JSON string (not object)
- **AND** satisfies ChromaDB primitive value requirement

#### Scenario: Categorical filtering structure
- **GIVEN** a configured categorical filter with field "region" having selected values ["British Classics", "Asian & Middle Eastern Sweets"] (from fetched document values) and default "British Classics"
- **WHEN** stored in `query_profile`
- **THEN** the structure is `{"categorical_filtering": {"fields": {"region": {"type": "exact_match", "values": [...], "default": "British Classics"}}}}`
- **AND** values are subset of actual document metadata values
- **AND** follows the documented query profile format specification
