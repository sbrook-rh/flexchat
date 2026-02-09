# Proposal: Add Wizard Schema Prefill

## Why

The Document Upload Wizard currently initializes with empty field selections on every upload, even when the collection has a saved schema. Users must manually re-map the same fields repeatedly, creating unnecessary friction for repeat uploads.

**Current state:** Wizard opens with all field radio buttons unchecked, requiring full manual configuration each time.

**Problem:** Poor UX for repeat uploads - users waste time repeating the same field mapping work.

**Gap in spec:** The `document-upload-ui` spec promises "future uploads can reuse the saved schema" (Schema Persistence Control requirement) but doesn't define HOW fields are pre-filled from saved schemas.

## What Changes

### Frontend State Initialization
- **MODIFY** wizard state initialization to parse `document_schema` from collection metadata
- **ADD** JSON.parse logic with error handling for malformed schemas
- **INITIALIZE** schema state with saved values (text_fields, id_field, metadata_fields)
- **SET** smart default for saveSchema checkbox based on schema existence

### Field Mapping UI
- **UPDATE** Step 2 (Field Mapping) radio buttons to pre-check based on saved schema
- **USE** `Array.includes()` to check if field exists in saved arrays
- **HANDLE** schema mismatches pragmatically (pre-fill what matches, ignore rest silently)

### Collections Refresh
- **ADD** `reloadConfig()` call in wizard completion handler
- **ENSURE** collections list shows updated metadata after upload

## Impact

### Affected Specs
- `document-upload-ui` - Added schema prefill requirements

### Affected Code
- `frontend/src/DocumentUploadWizard.jsx` - State initialization (~10 lines), field mapping logic (~5 lines)
- `frontend/src/Collections.jsx` - Add reloadConfig() call (~1 line)

### Breaking Changes
None - This is a pure enhancement. Existing behavior (no saved schema) works identically.

### Risk Assessment
**Low Risk**:
- Minimal code changes (~15 lines total)
- Graceful degradation (try/catch handles malformed JSON)
- No backend changes required
- Schema mismatches handled silently (fields that don't match are unchecked)
- Existing pattern reuse (useState initializer, reloadConfig())

### User Benefits
- **Faster repeat uploads** - Pre-filled field mappings save time
- **Reduced errors** - Consistent field mapping across uploads
- **Better UX** - Smart defaults based on saved schemas
- **Seamless experience** - Collections list updates automatically

### Estimated Effort
**Total: 1.5 hours**
- Schema parsing: 20 minutes
- Radio button logic: 30 minutes
- Edge case handling: 10 minutes  
- Collections refresh: 5 minutes
- Testing: 30 minutes

### Dependencies
All prerequisites complete:
- ✅ `wizard-backend-integration` - Backend saves/retrieves schemas
- ✅ Collections.jsx passes `collectionMetadata` prop to wizard
- ✅ Schema format validated (JSON string with text_fields, id_field, metadata_fields)

