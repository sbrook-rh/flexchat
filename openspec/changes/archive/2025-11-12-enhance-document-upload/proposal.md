# Enhance Document Upload

## Why

The document upload endpoint currently requires documents in pre-formatted `{id, text, metadata}` structure. Users must manually transform their raw JSON data using external tools (jq, custom scripts) before uploading, creating friction in the upload workflow and blocking the Document Upload Wizard feature from providing a seamless user experience.

## What Changes

- Add `raw_documents` + `schema` parameter support to existing upload endpoint
- Integrate document transformer (from `add-document-transformer`) for server-side transformation
- Add optional `save_schema` flag to persist transformation schemas in collection metadata
- Maintain full backward compatibility with existing `documents` parameter
- Enforce mutual exclusivity between `documents` and `raw_documents` parameters
- Return transformation and schema persistence status in response

## Impact

**Affected Specs:**
- **NEW**: `document-upload` (capability being added to spec repository)
- **RELATED**: `document-transformer` (completed in `add-document-transformer`)

**Affected Code:**
- `backend/chat/routes/collections.js` (lines ~185-243) - Modify upload endpoint
- No changes to embedding generation or RAG upload logic

**Breaking Changes:** None (new parameters are optional, existing behavior unchanged)

**Dependencies:**
- `add-document-transformer` (✓ completed 2025-11-12)
- `backend/chat/lib/collection-manager.js` (existing - `updateCollectionMetadata` function)
- Existing upload infrastructure (embeddings, RAG providers)

## Architecture Decisions

**Inline Transformation vs Separate Endpoint:**
- **Decision**: Transform within existing upload endpoint
- **Rationale**: Simpler client code, atomic operation, better error handling
- **Trade-off**: Slightly larger endpoint, but more efficient overall

**Non-Fatal Schema Persistence:**
- **Decision**: Schema save failure doesn't block document upload
- **Rationale**: Upload is primary function, schema is enhancement for convenience
- **Trade-off**: Client must check `schema_saved` flag in response

