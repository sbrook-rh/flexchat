# Implementation Tasks

## 1. Backend - Add Empty Collection Endpoint (RAG Service)
- [x] 1.1 Add `DELETE /collections/{name}/documents/all` endpoint to `backend/rag/server.py`
- [x] 1.2 Get collection and retrieve all document IDs
- [x] 1.3 Delete all documents using `collection.delete(ids=all_ids)`
- [x] 1.4 Return `{status, collection, count_deleted}` format
- [x] 1.5 Handle errors: collection not found (404), empty collection (200 with count=0)

## 2. Backend - Add Empty Collection Route (Node.js)
- [x] 2.1 Add `DELETE /api/collections/:name/documents/all` route in `backend/chat/routes/collections.js`
- [x] 2.2 Extract collection name and service from request
- [x] 2.3 Call provider's `emptyCollection()` method
- [x] 2.4 Return result to client

## 3. Backend - Add Provider Method
- [x] 3.1 Add `emptyCollection(collectionName)` method to `ChromaDBWrapperProvider.js`
- [x] 3.2 Make HTTP DELETE request to RAG service's empty endpoint
- [x] 3.3 Return response data

## 4. Frontend - Add Empty Button
- [x] 4.1 Add "Empty" button next to other action buttons in collection card
- [x] 4.2 Only show when `collection.count > 0`
- [x] 4.3 Style with warning colors (similar to Delete)
- [x] 4.4 Add `onClick` handler to trigger `emptyCollection()` function

## 5. Frontend - Implement Empty Logic
- [x] 5.1 Create `emptyCollection(collection)` function
- [x] 5.2 Show confirmation dialog with collection display_name and document count
- [x] 5.3 On cancel, do nothing
- [x] 5.4 On confirm, call `DELETE /api/collections/{name}/documents/all?service={service}`
- [x] 5.5 Handle success: show success message, reload config
- [x] 5.6 Handle error: show error message

## 6. Frontend - Add Re-model Section to Edit Modal
- [x] 6.1 Add conditional section in Edit modal (only when `collection.count === 0`)
- [x] 6.2 Add section header "Embedding (Re-model)" with explanation
- [x] 6.3 Copy embedding connection selector from create modal
- [x] 6.4 Copy embedding model selector from create modal
- [x] 6.5 Add `embedding_connection` and `embedding_model` to `editForm` state
- [x] 6.6 Load current embedding settings into form on `startEditing()`
- [x] 6.7 Implement `fetchEmbeddingModelsForEdit()` for edit modal
- [x] 6.8 Update `updateCollection()` to include new embedding fields in metadata

## 7. Frontend - Validation
- [x] 7.1 Empty button: validate collection exists and has documents (UI conditional rendering)
- [x] 7.2 Re-model: validate collection count is 0 before allowing changes (UI conditional rendering)
- [x] 7.3 Re-model: validate connection and model are selected before save
- [x] 7.4 Show appropriate error messages for invalid states

## 8. Testing
- [ ] 8.1 Test empty on collection with documents (success path)
- [ ] 8.2 Test empty confirmation cancel (no-op)
- [ ] 8.3 Test empty on collection with 0 documents (should show count=0)
- [ ] 8.4 Test empty button hidden when count === 0
- [ ] 8.5 Test re-model section visible only when count === 0
- [ ] 8.6 Test re-model: change embedding model and save
- [ ] 8.7 Test re-model section hidden when count > 0
- [ ] 8.8 Test that collection list refreshes after empty action

## 9. Documentation
- [x] 9.1 Add inline comments explaining re-model constraint (count === 0)
- [x] 9.2 Add inline comments explaining empty action and confirmation
- [x] 9.3 Update endpoint docstrings in server.py
