# Implementation Tasks

## 1. Parse Schema on Initialization
- [x] 1.1 Modify `useState` initializer in DocumentUploadWizard.jsx
- [x] 1.2 Add JSON.parse logic for `collectionMetadata.document_schema`
- [x] 1.3 Add try/catch to handle malformed JSON (console.warn fallback)
- [x] 1.4 Initialize schema state with parsed values or empty defaults
- [x] 1.5 Set smart default for saveSchema: `!savedSchema`

## 2. Pre-Check Field Radio Buttons
- [x] 2.1 Locate radio button rendering in FieldMappingStep (Step 2)
- [x] 2.2 `checked` prop already uses `wizardState.schema.text_fields.includes(field)` (line 499)
- [x] 2.3 `checked` prop already uses `wizardState.schema.metadata_fields.includes(field)` (line 515)
- [x] 2.4 `checked` prop already uses `wizardState.schema.id_field === field` (line 507)
- [x] 2.5 onChange handlers allow user override (toggleTextField, setIdField, toggleMetadataField)

## 3. Collections List Refresh
- [x] 3.1 `reloadConfig()` call already present in `handleWizardComplete()` (line 399)

## 4. Testing & Validation
- [x] 4.1 Test Scenario 1: First upload (no schema) - all unchecked, checkbox checked
- [x] 4.2 Test Scenario 2: Subsequent upload (schema exists) - fields pre-checked matching saved schema
- [x] 4.3 Test Scenario 3: Schema mismatch - partial pre-check, no errors
- [x] 4.4 Test Scenario 4: Malformed JSON - console.warn, wizard works with defaults
- [x] 4.5 Verify user can override pre-checked selections
- [x] 4.6 Verify collections list refreshes after upload
- [x] 4.7 Verify no console errors (except expected console.warn)
- [x] 4.8 Verify save schema checkbox shows smart default

