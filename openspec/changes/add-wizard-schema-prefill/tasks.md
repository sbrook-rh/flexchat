# Implementation Tasks

## 1. Parse Schema on Initialization
- [ ] 1.1 Modify `useState` initializer in DocumentUploadWizard.jsx
- [ ] 1.2 Add JSON.parse logic for `collectionMetadata.document_schema`
- [ ] 1.3 Add try/catch to handle malformed JSON (console.warn fallback)
- [ ] 1.4 Initialize schema state with parsed values or empty defaults
- [ ] 1.5 Set smart default for saveSchema: `!savedSchema`

## 2. Pre-Check Field Radio Buttons
- [ ] 2.1 Locate radio button rendering in FileUploadStep (Step 2)
- [ ] 2.2 Add `checked` prop for text field radios using `wizardState.schema.text_fields.includes(field)`
- [ ] 2.3 Add `checked` prop for metadata field radios using `wizardState.schema.metadata_fields.includes(field)`
- [ ] 2.4 Add `checked` prop for id field radio using `wizardState.schema.id_field === field`
- [ ] 2.5 Verify onChange handlers still allow user to override selections

## 3. Collections List Refresh
- [ ] 3.1 Add `reloadConfig()` call to `handleWizardComplete()` in Collections.jsx

## 4. Testing & Validation
- [ ] 4.1 Test Scenario 1: First upload (no schema) - all unchecked, checkbox checked
- [ ] 4.2 Test Scenario 2: Subsequent upload (schema exists) - fields pre-checked matching saved schema
- [ ] 4.3 Test Scenario 3: Schema mismatch - partial pre-check, no errors
- [ ] 4.4 Test Scenario 4: Malformed JSON - console.warn, wizard works with defaults
- [ ] 4.5 Verify user can override pre-checked selections
- [ ] 4.6 Verify collections list refreshes after upload
- [ ] 4.7 Verify no console errors (except expected console.warn)
- [ ] 4.8 Verify save schema checkbox shows smart default

