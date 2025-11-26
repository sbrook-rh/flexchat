# Fix Collection Create Embedding UI - Proposal

## Why

After moving embedding generation to the RAG wrapper (`move-embeddings-to-rag-wrapper`), the collection creation UI was never updated. The archived change:
- ✅ Updated backend API to require `embedding_model` parameter
- ✅ Added Edit UI requirement for re-modeling empty collections  
- ❌ **Never added a Create UI requirement** - left legacy UI code in place

The UI still shows "Embedding Connection" dropdown (LLM connections) instead of "Embedding Model" dropdown (wrapper models). The backend expects `embedding_model` but UI sends `embedding_connection`, breaking collection creation.

## What Changes

**Spec:**
- **Add "Collection Create UI" requirement** (was missing from collections spec)
- **Update "Collection Edit UI" requirement** to clarify read-only display removes Provider/Connection ID fields

**Code:**
- Remove "Embedding Connection" dropdown from collection create form
- Add "Embedding Model" dropdown populated from `providerStatus.rag_services[currentWrapper].details.embedding_models`
- Use `currentWrapper` from URL (no service selection needed)
- Update form state to remove `embedding_connection` field
- Update validation and API calls to use only `embedding_model`
- Update edit modal read-only display to remove Provider and Connection ID fields

## Impact

**Affected specs:**
- `collections` - UI requirements for collection creation

**Affected code:**
- `frontend/src/Collections.jsx` - Collection creation form and state management

**Breaking changes:**
None - this fixes a broken UI after backend refactor

**Migration:**
None - UI fix only, backend already supports new format

## Relationships

- **Fixes**: Incomplete UI update from `move-embeddings-to-rag-wrapper` (archived 2025-11-26)
- **Depends on**: RAG wrapper exposing `embedding_models` in health check (already implemented)

