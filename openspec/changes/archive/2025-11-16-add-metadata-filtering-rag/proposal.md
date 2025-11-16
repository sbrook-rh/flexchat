# Add Metadata Filtering to RAG Service

## Why

The RAG service currently provides semantic search (`POST /query`) and document storage, but lacks the ability to query documents by metadata filters. This blocks validation of hierarchical documentation retrieval, specifically "sibling gathering" – fetching all documents with the same `section_id` to reconstruct complete sections after semantic search finds individual paragraphs.

**Evidence from experiments:**
- Semantic search returns fragmented paragraphs from the same section (e.g., "You CAN modify..." intro found, but missing HOW-TO steps)
- Both results share the same `section_id` metadata
- Manual metadata filtering via Node backend successfully retrieved all 3 paragraphs from a section
- Cannot complete sibling gathering validation without a GET endpoint for metadata queries

## What Changes

- Add `GET /collections/{collection_name}/documents` endpoint to RAG service
- Accept `where` query parameter (JSON string) for ChromaDB metadata filters
- Support pagination via `limit` and `offset` query parameters
- Return documents matching metadata criteria (no semantic search/embeddings)
- Follow existing error handling patterns (404, 400, 500)
- Support ChromaDB filter operators: equality, `$in`, `$and`, `$or`, `$ne`

**Key characteristics:**
- Deterministic queries (no LLM/embedding computation)
- Fast metadata-indexed lookups
- Enables sibling gathering for hierarchical documentation
- No breaking changes to existing endpoints

## Impact

- **Affected specs**: `rag-providers`
- **Affected code**: `backend/rag/server.py` (add ~60 lines after line 334)
- **Backward compatibility**: Yes - new endpoint, no changes to existing APIs
- **Dependencies**: None - uses existing ChromaDB client and FastAPI framework
- **Estimated effort**: 2-4 hours
- **Risk level**: Low - straightforward ChromaDB integration following existing patterns

