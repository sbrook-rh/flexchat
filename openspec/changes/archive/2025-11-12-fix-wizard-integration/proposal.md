# Proposal: Fix Wizard Integration

## Why

The Document Upload Wizard UI (completed in previous work) is not functional because:

1. **Backend Bug**: The `document-transformer.js` metadata collection function preserves arrays unchanged, but ChromaDB only accepts primitive types (`string | int | float | boolean`) in metadata. Uploads with array fields mapped to metadata fail with ChromaDB validation errors.

2. **Missing Integration**: The wizard sends requests to a non-existent endpoint (`/api/collections/:service/:name/upload`) and lacks required parameters (`service`, `embedding_connection`, `embedding_model`), causing all upload attempts to fail.

These issues prevent users from using the wizard feature entirely.

## What Changes

### Part 1: Backend Transformer Fix
- **MODIFY** `backend/chat/lib/document-transformer.js` `collectMetadata()` function to JSON.stringify arrays (matching object handling)
- **UPDATE** test expectations in `backend/chat/__tests__/lib/document-transformer.test.js` to verify array stringification

### Part 2: Wizard Integration
- **FIX** endpoint URL from `/api/collections/:service/:name/upload` to `/api/collections/:name/documents` (existing, working endpoint)
- **ADD** required parameters: `service`, `embedding_connection`, `embedding_model` (from parent component props)
- **ADD** `saveSchema` checkbox in Preview step (default checked for new uploads, unchecked for updates)
- **INTEGRATE** wizard with Collections.jsx parent component:
  - Pass `serviceName`, `resolvedConnection`, `collectionMetadata` as props
  - Call `reloadConfig()` on successful upload
  - Handle `onComplete` and `onClose` callbacks

## Impact

### Affected Specs
- `document-transformer` - Modified array handling in metadata collection
- `document-upload-ui` - Modified wizard integration and upload behavior
- `document-upload` - No changes (endpoint already supports required parameters)

### Affected Code
- `backend/chat/lib/document-transformer.js` - Fix `collectMetadata()` function (1 conditional change)
- `backend/chat/__tests__/lib/document-transformer.test.js` - Update test expectation (1 assertion)
- `frontend/src/DocumentUploadWizard.jsx` - Fix endpoint, add props, update request body, add checkbox (~30 lines)
- `frontend/src/Collections.jsx` - Add wizard integration logic (~40 lines for wizard open/close handlers)

### Breaking Changes
None - This restores intended functionality and follows existing patterns.

### Risk Assessment
**Low Risk**:
- Backend fix is localized to one function with existing tests
- Wizard follows proven pattern from existing "Upload Docs" button
- All backend dependencies are complete and tested
- No API changes (using existing endpoint)

### User Benefits
- Users can upload documents with array fields without errors
- Document Upload Wizard becomes fully functional
- Consistent upload behavior between wizard and manual upload button
- Schema persistence enables reusable upload configurations

