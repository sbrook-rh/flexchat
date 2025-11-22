# Add Collection Testing

## Why

Users cannot empirically test or debug RAG collections. Testing requires using the full chat interface (not isolated) or executing manual curl commands (requires copying embeddings, parsing JSON). There is no way to determine optimal `match_threshold` and `fallback_threshold` values except through blind guessing.

This creates a significant debugging and calibration gap - users cannot validate collection quality, compare embedding models, or tune threshold settings without extensive manual work.

## What Changes

- Add embedding connection resolution to `/api/ui-config` endpoint
  - Resolves historical connection IDs to current connections
  - Matches on provider type and model availability
  - Handles config changes gracefully (connection renamed/removed)
  
- Add `POST /api/collections/:name/test-query` endpoint
  - Generates embeddings using collection's original model
  - Queries collection via RAG provider
  - Returns raw results with distances and metadata
  
- Add "Test / Calibrate" button and modal to Collections page
  - Input field for test query
  - Results table showing documents, distances, and metadata
  - Uses resolved embedding connection from collection metadata

## Impact

**Affected specs:**
- `collections` (ADDED requirements)

**Affected code:**
- `backend/chat/routes/collections.js` (~120 lines added)
- `frontend/src/Collections.jsx` (~250 lines added)

**No breaking changes** - purely additive functionality.

## Scope

This implements **Phase 1 only** (Quick Query Testing, 6-8 hours estimated effort). Phases 2-3 (threshold calibration, batch testing) are optional future enhancements not included in this change.

