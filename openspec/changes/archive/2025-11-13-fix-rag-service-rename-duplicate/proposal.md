# Fix RAG Service Rename Duplicate Bug

## Why

Two critical bugs in RAG service management:

1. **Rename creates duplicates**: Editing a RAG service and changing its display name creates a duplicate entry instead of updating the existing service. Users must manually delete the old entry. This occurs because the service name is used as both the configuration key and display label.

2. **Silent orphaned handlers**: Deleting a RAG service doesn't trigger validation errors, leaving response handlers with broken references. This contrasts with LLM deletion, which correctly validates and prevents orphaned handlers.

These bugs make RAG service management unreliable and create data integrity issues in production configurations.

## What Changes

**Backend:**
- Add RAG service reference validation to `config-loader.js` (mirrors existing LLM validation pattern)

**Frontend:**
- Separate stable ID from user-editable display name in RAG service data model
- Generate kebab-case IDs from display names on creation
- Lock service IDs during edit (show read-only), allow display name changes
- Update `ConfigBuilder` to use service ID as configuration key
- Update `RAGWizard` to manage separate ID and description fields
- Display friendly names in UI while maintaining stable ID references

**Benefits:**
- Renaming services no longer creates duplicates
- Validation catches broken handler references before config is applied
- Backward compatible with existing configs (fallback to ID if no description)

## Impact

**Affected specs:**
- `config-builder` - RAG service UI and save logic
- `config-loader` - Backend validation rules

**Affected code:**
- `backend/chat/lib/config-loader.js` - Add 7 lines of validation after line 108
- `frontend/src/RAGWizard.jsx` - ID generation, dual-field UI, state management
- `frontend/src/ConfigBuilder.jsx` - Fix save logic (use ID as key), display logic

**Breaking changes:** None (backward compatible with existing configurations)

**Migration:** Existing configs without `description` field will display the service ID as fallback. On first edit, users can set a friendly description.

