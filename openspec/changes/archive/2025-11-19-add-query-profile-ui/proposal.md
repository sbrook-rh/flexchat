# Add Query Profile UI (Phase 1: Storage)

## Why

Categorical queries ("British desserts") fail completely without metadata filtering - semantic search doesn't understand category boundaries. This is Phase 1 of the solution: adding UI to configure `query_profile.categorical_filtering` in collection metadata.

**Evidence:** Experiment 0 validated that categorical queries fail without metadata filtering  
**Scope:** Storage-only layer (UI + backend merge fix), no query extraction implementation (Phase 2+)

**Current limitations:**
- No UI to configure categorical filtering for collections
- Backend metadata update does full replace (commented merge logic breaks partial updates)
- Old upload modal coexists with Document Upload Wizard (confusing UX)

## What Changes

### Backend Changes
- **Add new endpoint:** `GET /collections/{name}/metadata-values?field={field_name}` in RAG service
  - Queries all documents in collection
  - Returns unique values for specified metadata field
  - Used to populate categorical filter value dropdowns
- Uncomment and enhance metadata merge logic in RAG service (`backend/rag/server.py`)
- Add `merge` query parameter to `PUT /collections/{name}/metadata` (default `false` for backward compat)
- Pass `merge` flag through Node.js middleware layers:
  - `backend/chat/routes/collections.js` - Accept from request body
  - `backend/chat/lib/collection-manager.js` - Pass to provider
  - `backend/chat/retrieval-providers/providers/ChromaDBWrapperProvider.js` - Send as query param

### Frontend Changes  
- **Remove:** Old "Upload Docs" modal and related code (superseded by Document Upload Wizard)
- **Add:** "Search Settings" button and Profile modal for configuring categorical filtering
- Profile modal manages `query_profile` JSON structure:
  - Field selection (from `document_schema.metadata_fields`, not collection metadata)
  - Fetch unique values from collection documents (via new endpoint)
  - Multi-select from fetched values (not manual input)
  - Default value selector
  - Validation before save
- Use `merge=true` when saving profile to preserve other metadata fields

### Data Structure
**Stored in `collection.metadata.query_profile`** (stringified JSON, ChromaDB constraint):
```json
{
  "categorical_filtering": {
    "fields": {
      "region": {
        "type": "exact_match",
        "values": ["British Classics", "Asian & Middle Eastern Sweets"],
        "default": "British Classics"
      },
      "category": {
        "type": "exact_match",
        "values": ["Puddings", "Cakes"]
      }
    }
  }
}
```

## Impact

- **Affected specs**: `collections` (metadata management), `rag-providers` (new endpoint + merge changes)
- **Affected code**:
  - Backend: `backend/rag/server.py` (+60 lines for new endpoint, +15 lines for merge)
  - Node.js middleware (3 files, 10 lines each)
  - Frontend: `frontend/src/Collections.jsx` (remove ~200 lines, add ~300 lines with value fetching)
- **Backward compatibility**: Yes - `merge=false` default preserves current behavior
- **Dependencies**: Uses new metadata filtering endpoint (recently added)
- **Estimated effort**: 8-10 hours (increased for new endpoint + value fetching logic)
- **Risk level**: Low - well-scoped UI feature with clear data structure

**Note:** This is Phase 1 only. Future phases will add query extraction (Phase 2) and backend filtering implementation (Phase 3).

