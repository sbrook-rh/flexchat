# Fix Edit Collection Display Name

## Why

The Edit Collection modal currently shows the immutable collection `name` (technical ID like `red-hat-openshift-ai`) instead of the user-friendly `display_name` (like "Red Hat OpenShift AI"). This is confusing because:

1. Users entered a display name when creating the collection, but can't see or edit it later
2. The technical ID is implementation detail, not user-facing
3. Users may want to update the display name (fix typos, clarify naming) without recreating the collection

**Current behavior:** Edit modal shows "Collection Name: red-hat-openshift-ai" (disabled field)  
**Expected behavior:** Edit modal shows "Display Name: Red Hat OpenShift AI" (editable field)

## What Changes

### Frontend Changes
- Update `startEditing()` to load `display_name` from `collection.metadata.display_name` into `editForm` state
- Add `display_name` field to `editForm` state (alongside existing `description`, `threshold`, `partial_threshold`)
- Replace the disabled "Collection Name" field with an editable "Display Name" field in Edit modal
- Update modal title to show display name: `Edit Collection: {display_name}`
- Add help text clarifying that display name is for UI purposes (collection ID remains unchanged)
- Update `updateCollection()` to include `display_name` in the metadata update payload

### Validation
- Display name should remain required (cannot be empty)
- Display name can be changed to any non-empty string
- Collection `name` (ID) remains immutable - not sent in update, not shown as editable

## Impact

- **Affected specs**: `collections` (Collection Edit UI)
- **Affected code**: `frontend/src/Collections.jsx` (~50 lines modified)
- **Backward compatibility**: Yes - existing collections without `display_name` will show the collection `name` as fallback
- **Dependencies**: None - purely UI change
- **Estimated effort**: 30-45 minutes
- **Risk level**: Very low - isolated UI change, no backend modifications

