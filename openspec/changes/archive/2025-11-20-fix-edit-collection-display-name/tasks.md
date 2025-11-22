# Implementation Tasks

## 1. Update Edit Form State
- [x] 1.1 Add `display_name` field to `editForm` state initialization
- [x] 1.2 Update `startEditing()` to load `display_name` from `collection.metadata.display_name`
- [x] 1.3 Add fallback: use collection `name` if `display_name` is missing (backward compat)

## 2. Update Edit Modal UI
- [x] 2.1 Change modal title from `Edit Collection: {editingCollection}` to use display name
- [x] 2.2 Replace disabled "Collection Name" field with editable "Display Name" field
- [x] 2.3 Update field label to "Display Name"
- [x] 2.4 Make field editable (remove `disabled` attribute)
- [x] 2.5 Bind field to `editForm.display_name`
- [x] 2.6 Update help text to clarify purpose: "Human-readable name shown in UI"
- [x] 2.7 Add validation: require non-empty display name

## 3. Update Save Logic
- [x] 3.1 Include `display_name` in metadata payload sent to `updateCollection()`
- [x] 3.2 Verify metadata is merged (not replaced) so other fields are preserved
- [x] 3.3 Update success message to show display name: `Collection "{display_name}" updated successfully!`

## 4. Testing
- [x] 4.1 Test editing display name on existing collection
- [x] 4.2 Test with collection that has no display_name (backward compat)
- [x] 4.3 Test validation: empty display name shows error
- [x] 4.4 Test that collection ID (name) remains unchanged after edit
- [x] 4.5 Test that other metadata fields are preserved (merge mode works)
- [x] 4.6 Test that display name appears correctly in collection list after save

## 5. Documentation
- [x] 5.1 Update inline comments explaining display_name vs name distinction

