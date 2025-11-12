# Implementation Tasks

## 1. Backend Transformer Fix
- [x] 1.1 Modify `collectMetadata()` in `backend/chat/lib/document-transformer.js` to stringify arrays
- [x] 1.2 Update test expectation in `backend/chat/__tests__/lib/document-transformer.test.js`
- [x] 1.3 Run Jest tests to verify fix: `npm test document-transformer.test.js`
- [x] 1.4 Manual validation: Upload document with array metadata field

## 2. Wizard Request Integration
- [x] 2.1 Fix endpoint URL to `/api/collections/${collectionName}/documents` in DocumentUploadWizard.jsx
- [x] 2.2 Add props: `serviceName`, `resolvedConnection`, `collectionMetadata` to wizard component
- [x] 2.3 Update request body to include `service`, `embedding_connection`, `embedding_model`
- [x] 2.4 Change `save_schema: true` to `save_schema: wizardState.saveSchema`

## 3. Save Schema Checkbox
- [x] 3.1 Add `saveSchema` to wizard state (default based on existing schema)
- [x] 3.2 Create checkbox in PreviewUploadStep component
- [x] 3.3 Set label text based on whether collection has existing schema
- [x] 3.4 Wire checkbox to wizard state updates

## 4. Parent Component Integration
- [x] 4.1 Import DocumentUploadWizard in Collections.jsx
- [x] 4.2 Add wizard state management (showWizard, uploadTarget)
- [x] 4.3 Create `openUploadWizard()` handler (resolve connection before opening)
- [x] 4.4 Add wizard conditional render with all required props
- [x] 4.5 Implement `onComplete` handler (show success message, call `reloadConfig()`)
- [x] 4.6 Implement `onClose` handler (reset wizard state)
- [x] 4.7 Add "Upload Documents (Wizard)" button to collection actions (button already exists as "Upload JSON")

## 5. Testing & Validation
- [x] 5.1 Test backend: Upload document with array in text field → CSV string
- [x] 5.2 Test backend: Upload document with array in metadata → JSON string
- [x] 5.3 Test wizard: Upload recipes with `ingredients` array field (54 documents uploaded successfully!)
- [x] 5.4 Test wizard: Save schema checkbox persists schema to collection metadata
- [x] 5.5 Test wizard: Collection refresh after successful upload
- [x] 5.6 Test wizard: Error handling for failed uploads
- [x] 5.7 Test wizard: Connection resolution before opening
- [x] 5.8 Verify no console errors or warnings

