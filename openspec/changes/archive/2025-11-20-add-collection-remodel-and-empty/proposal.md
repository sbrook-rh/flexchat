# Add Collection Re-model and Empty Actions

## Why

Users need two additional collection management capabilities:

**1. Change Embedding Model (Re-model)**
- Collections are locked to their initial embedding model, even when empty
- If a user creates a collection with the wrong embedding model, they must delete and recreate it
- This is particularly frustrating when the collection has no documents yet

**2. Empty Collection**
- Users may want to clear all documents from a collection and start fresh
- Currently, they must delete the entire collection (losing metadata, settings) and recreate it
- Common use case: testing different document sets, fixing bad uploads, resetting for new data

## What Changes

### Frontend Changes

**Edit Modal - Re-model Section (when count === 0)**
- Add conditional "Embedding" section in Edit modal
- Show embedding connection + model selectors (same as create modal)
- Only display when `collection.count === 0`
- Copy model selection logic from create modal (`fetchEmbeddingModelsForConnection`)
- Update metadata with new embedding settings

**Collections List - Empty Button**
- Add "Empty" button next to Edit/Upload/Delete buttons
- Only display when `collection.count > 0`
- Button styled similar to Delete (warning color)
- Click triggers confirmation dialog: "Empty collection '{display_name}'? This will delete all {count} documents. This action cannot be undone."
- On confirm, call empty endpoint and reload

### Backend Changes

**Node.js (routes/collections.js)**
- Add `DELETE /api/collections/:name/documents/all` route
- Route to provider's `emptyCollection()` method

**Node.js (ChromaDBWrapperProvider.js)**
- Add `emptyCollection(collectionName)` method
- Calls RAG service's empty endpoint

**RAG Service (server.py)**
- Add `DELETE /collections/{name}/documents/all` endpoint
- Get all document IDs from collection
- Delete all documents using `collection.delete(ids=all_ids)`
- Return count of deleted documents

## Impact

- **Affected specs**: `collections` (Edit UI, Empty action), `rag-providers` (Empty endpoint)
- **Affected code**: 
  - Frontend: `Collections.jsx` (~120 lines)
  - Node.js: `routes/collections.js` (~30 lines), `ChromaDBWrapperProvider.js` (~25 lines)
  - Python: `server.py` (~25 lines)
- **Backward compatibility**: Yes - new features, no breaking changes
- **Dependencies**: None
- **Estimated effort**: 2-3 hours
- **Risk level**: Low-medium
  - Re-model: Low risk (metadata update only, guarded by count check)
  - Empty: Medium risk (destructive action, requires confirmation)

