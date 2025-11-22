# Implementation Tasks

## 1. Backend - Add Metadata Values Endpoint
- [x] 1.1 Add `GET /collections/{name}/metadata-values` endpoint to `backend/rag/server.py`
- [x] 1.2 Accept `field` query parameter (metadata field name)
- [x] 1.3 Use recently-added metadata filtering endpoint to query all documents
- [x] 1.4 Extract unique values for specified field from document metadata
- [x] 1.5 Return `{field: string, values: string[], count: number}` format
- [x] 1.6 Handle errors: collection not found (404), field not found (empty array)
- [x] 1.7 Test with various fields (region, category, doc_type, etc.)

## 2. Backend - Add Metadata Merge Support
- [x] 2.1 Add `Query` import to `backend/rag/server.py` if not present
- [x] 2.2 Modify `PUT /collections/{name}/metadata` endpoint to accept `merge` query parameter
- [x] 2.3 Implement merge logic: if `merge=true`, merge with existing metadata; if `merge=false`, replace (current behavior)
- [x] 2.4 Update endpoint logging to show merge mode
- [x] 2.5 Test merge behavior: verify existing fields preserved when `merge=true`

## 3. Backend - Pass Merge Flag Through Node.js Layers
- [x] 3.1 Update `backend/chat/routes/collections.js` - Accept `merge` from request body
- [x] 3.2 Update `backend/chat/lib/collection-manager.js` - Add `merge` parameter to `updateCollectionMetadata()`
- [x] 3.3 Update `backend/chat/retrieval-providers/providers/ChromaDBWrapperProvider.js` - Add `merge` parameter and pass as query param
- [x] 3.4 Test backward compatibility: Edit form works with `merge=false` (default)

## 4. Frontend - Remove Old Upload Modal
- [x] 3.1 Remove upload modal state variables from `Collections.jsx` (showUploadModal, uploadTargetCollection, etc.)
- [x] 3.2 Remove `openUploadModal()` function
- [x] 3.3 Remove `closeUploadModal()` function
- [x] 3.4 Remove `uploadDocuments()` function
- [x] 3.5 Remove `resolveCompatibleConnection()` function (kept: used by wizard)
- [x] 3.6 Remove "Upload Docs" button from collection cards
- [x] 3.7 Remove Upload Documents Modal JSX (lines ~1049-1123)

## 5. Frontend - Add Profile Modal State and Functions
- [x] 4.1 Add profile modal state variables (`showProfileModal`, `profileTargetCollection`, `profileForm`)
- [x] 4.2 Implement `openProfileModal()` - Load and parse existing `query_profile` JSON
- [x] 4.3 Implement `closeProfileModal()` - Reset state
- [x] 4.4 Implement `saveProfile()` - Stringify and save with `merge=true`
- [x] 4.5 Handle JSON parse errors gracefully (invalid query_profile)

## 6. Frontend - Build Profile Modal UI
- [x] 6.1 Add "Search Settings" button to collection cards (conditional on `document_schema.metadata_fields` existence)
- [x] 6.2 Create modal shell (similar structure to Edit modal)
- [x] 6.3 Add "Category Filters" section header
- [x] 6.4 Implement field selector (dropdown from parsed `document_schema.metadata_fields`)
- [x] 6.5 Fetch available values from backend when field selected
- [x] 6.6 Implement multi-select from fetched values (checkboxes or multi-select dropdown)
- [x] 6.7 Show loading state while fetching values
- [x] 6.8 Implement default value selector (radio buttons from selected values)
- [x] 6.9 Add "Remove field" button for each configured field
- [x] 6.10 Add "+ Add another field" button
- [x] 6.11 Add Cancel and Save buttons

## 7. Frontend - Validation
- [x] 7.1 Validate field name exists in `document_schema.metadata_fields` before adding
- [x] 7.2 Validate at least one value selected before saving field config
- [x] 7.3 Validate default value (if set) exists in selected values
- [x] 7.4 Show validation errors to user (inline messages)
- [x] 7.5 Disable Save button when validation fails
- [x] 7.6 Handle case where field has no values in documents (show message)

## 8. Testing
- [x] 8.1 Test metadata-values endpoint: returns unique values for field
- [x] 8.2 Test metadata-values endpoint: handles non-existent field gracefully
- [x] 8.3 Test backend merge: partial update preserves other metadata fields
- [x] 8.4 Test backend backward compat: Edit form works with `merge=false`
- [x] 8.5 Test Profile modal: fetch and display values for field
- [x] 8.6 Test Profile modal: add single field with selected values
- [x] 8.7 Test Profile modal: add multiple fields
- [x] 8.8 Test Profile modal: set default value
- [x] 8.9 Test Profile modal: remove field
- [x] 8.10 Test JSON round-trip: save → reload → display correctly
- [x] 8.11 Test collections without `document_schema.metadata_fields`: button hidden
- [x] 8.12 Test collections without existing `query_profile`: loads empty form
- [x] 8.13 Test invalid JSON in `query_profile`: graceful degradation

## 9. Documentation
- [x] 8.1 Update inline comments explaining `query_profile` structure
- [x] 8.2 Add JSDoc comments for profile modal functions
- [x] 8.3 Document merge parameter in backend endpoint docstrings
- [x] 8.4 Update any relevant user-facing documentation

