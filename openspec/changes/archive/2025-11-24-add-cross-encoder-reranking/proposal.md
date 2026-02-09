# Add Cross-Encoder Reranking

## Why

Semantic search uses vector similarity for ranking, but cannot distinguish "generally related" from "directly answers query." Cross-encoders score query-document pairs contextually, enabling better ranking for specific questions.

**Example problem:**
- Query: "How do I configure X?"
- Semantic search ranks API specs higher than actual procedures
- Best answer chunks exist but rank below less-relevant fragments

This adds optional cross-encoder reranking as **infrastructure capability** (not automation). Other features will orchestrate when to use reranking based on query type, user intent, or collection characteristics.

## What Changes

**Python RAG Service (`backend/rag/server.py`):**
- Add `--cross-encoder` and `--cross-encoder-path` startup flags
- Load cross-encoder model at startup (fail-fast if specified but can't load)
- Extend health check to report cross-encoder status
- Add `POST /rerank` endpoint for scoring document relevance

**Node.js Provider (`ChromaDBWrapperProvider.js`):**
- Add `rerank()` method with graceful degradation
- Check health before calling /rerank (fallback if unavailable)
- Follow existing patterns (withRetry, auth headers, error handling)

**Core Principle:** Infrastructure, not automation. Provides capability; other features decide when to use it.

## Impact

**Affected specs:**
- `rag-providers` (ADDED requirements)

**Affected code:**
- `backend/rag/server.py` (~100 lines added)
- `backend/chat/retrieval-providers/providers/ChromaDBWrapperProvider.js` (~50 lines added)

**No breaking changes:**
- Cross-encoder is optional (service runs without it)
- Existing endpoints unchanged
- Graceful degradation when unavailable

**Performance:**
- Latency: ~100-500ms for 10 documents (model-dependent)
- Memory: +300MB-1.3GB (model-dependent)
- No impact when cross-encoder not loaded

## Scope

Infrastructure only - adds reranking capability but no automatic usage. Features like advanced RAG retrieval will explicitly call `provider.rerank()` when contextual ranking needed.

**Not included:**
- Automatic reranking in query pipeline
- Integration with existing features
- UI controls for reranking

Estimated effort: 4-6 hours

