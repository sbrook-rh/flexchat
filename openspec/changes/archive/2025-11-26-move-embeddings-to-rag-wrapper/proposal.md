# Move Embeddings to RAG Wrapper - Proposal

## Why

Current architecture requires HTTP calls to AI provider APIs for embedding generation during every document upload and query. This creates unnecessary latency (2-5s uploads, 250-550ms queries) and complexity in the Node backend. The Python RAG wrapper should load embedding models directly from HuggingFace and handle all embedding generation internally, following the proven cross-encoder pattern already implemented.

## What Changes

- **Python RAG wrapper loads embedding models at startup** from YAML config file (`embeddings.yml`)
- **Collection creation validates embedding model** against loaded models, stores model ID in metadata
- **Document upload generates embeddings internally** using collection's embedding model (no pre-computed embeddings from Node)
- **Query endpoint generates query embeddings internally** using collection's embedding model
- **Health endpoint exposes available embedding models** for UI discovery
- **Node backend removes embedding generation** for RAG operations (~50-60 lines simplified)
- **Request models simplified** - remove `embedding_provider`, `embedding_model`, `query_embedding`, and document `embedding` fields

## Impact

**Affected specs:**
- `rag-providers` - Embedding model loading, endpoint behavior changes
- `collections` - Collection creation and document upload requirements change
- `document-upload` - Remove embedding generation requirements

**Affected code:**
- `backend/rag/server.py` - Model loading, 4 endpoints modified, new helper function
- `backend/chat/routes/collections.js` - 3 embedding call sites removed
- `backend/chat/lib/rag-collector.js` - Embedding cache and generation removed (~40 lines)
- `backend/chat/retrieval-providers/providers/ChromaDBWrapperProvider.js` - Query embedding parameter removed

**Performance impact:**
- 40% faster document uploads (eliminates HTTP hop to AI provider)
- 50-60% faster queries (single request: embed + search)
- Co-locates embed + search + cross-encoder operations in Python wrapper

**Breaking changes:**
- **BREAKING**: Collection creation requires explicit `embedding_model` selection
- **BREAKING**: Document upload no longer accepts pre-computed `embedding` field
- **BREAKING**: Query endpoint no longer accepts `query_embedding` field
- **BREAKING**: Existing collections without `embedding_model` metadata require backfill

**Migration:**
- Existing collections need `embedding_model` added to metadata (manual backfill or graceful error)
- Wrapper must be started with `embeddings.yml` config file
- At least one embedding model required at startup (fail-hard if missing)

## Relationships

- **Reverses aspects of**: `refactor-embedding-architecture` (archived 2025-11-08) - that change moved embeddings to Node to eliminate duplication, but introduced API overhead
- **Follows pattern from**: Cross-encoder implementation (server.py lines 100-137, 188-193) - proven approach for loading ML models at startup
- **Enables**: More efficient cross-encoder integration - all three operations (embed, search, rerank) co-located in Python wrapper

## References

- OpenPlan feature: `openplan/data/features/move-embeddings-to-rag-wrapper.md`
- Design document: `openplan/data/planning/move-embeddings-to-rag-wrapper-design.md` (1029 lines, complete endpoint audits)
- Validation checklist: `openplan/data/implementation/move-embeddings-to-rag-wrapper-tasks.md` (97 validation items)
- Cross-encoder reference: `backend/rag/server.py:100-137` (pattern to follow)

