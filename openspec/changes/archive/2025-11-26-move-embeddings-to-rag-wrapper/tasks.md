# Move Embeddings to RAG Wrapper - Implementation Tasks

## 1. Python Wrapper: Config and Model Loading
- [ ] 1.1 Add `--embeddings-config` argument to argparse
- [ ] 1.2 Add `EMBEDDINGS_CONFIG` environment variable support
- [ ] 1.3 Add `--download-models` flag to download without starting server
- [ ] 1.4 Load YAML config file with `embeddings:` array structure
- [ ] 1.5 Validate at least one embedding model configured (fail-hard if empty)
- [ ] 1.6 Import `SentenceTransformer` from sentence-transformers library
- [ ] 1.7 Create global `embedding_models = {}` dict and `embedding_model_configs = []` list
- [ ] 1.8 Load each model using `SentenceTransformer(config['path'])`
- [ ] 1.9 Store model instances with metadata: `{model, name, dimensions}`
- [ ] 1.10 Print startup message for each loaded model (follow cross-encoder pattern)
- [ ] 1.11 Fail-hard at startup if any model fails to load
- [ ] 1.12 If `--download-models` flag set, exit after loading models (don't start server)
- [ ] 1.13 Create example `embeddings.yml` config file

## 2. Python Wrapper: Helper Function
- [ ] 2.1 Create `get_embedding_model_for_collection(collection)` helper
- [ ] 2.2 Read `embedding_model` from collection.metadata
- [ ] 2.3 Validate model exists in `embedding_models` dict
- [ ] 2.4 Return model instance if found
- [ ] 2.5 Raise HTTPException(400) if embedding_model not in metadata
- [ ] 2.6 Raise HTTPException(503) if model not loaded
- [ ] 2.7 Include helpful error messages with available model list

## 3. Python Wrapper: Health Endpoint
- [ ] 3.1 Add `embedding_models` array to `/health` response
- [ ] 3.2 Format: `[{id, name, status: "loaded", dimensions}]` for each model
- [ ] 3.3 Conditionally include (only if models loaded, like cross-encoder)
- [ ] 3.4 Test endpoint returns expected structure

## 4. Python Wrapper: Collection Creation
- [ ] 4.1 Remove undefined `EMBEDDING_PROVIDER` variable reference (line 278)
- [ ] 4.2 Remove undefined `embedding_config` variable reference (line 279)
- [ ] 4.3 Validate `request.embedding_model` against loaded models
- [ ] 4.4 Require explicit model selection (fail if not specified, list available)
- [ ] 4.5 Store `embedding_model` in collection metadata
- [ ] 4.6 Update CreateCollectionRequest: remove `embedding_provider` field
- [ ] 4.7 Test collection creation with valid model
- [ ] 4.8 Test collection creation without model (verify error)
- [ ] 4.9 Test collection creation with invalid model (verify error lists available)

## 5. Python Wrapper: Document Upload
- [ ] 5.1 Call `get_embedding_model_for_collection(collection)` to get model
- [ ] 5.2 Remove embedding field requirement from document validation (lines 393-398)
- [ ] 5.3 Extract texts: `[doc['text'] for doc in request.documents]`
- [ ] 5.4 Generate embeddings: `model.encode(texts, convert_to_numpy=True).tolist()`
- [ ] 5.5 Store embeddings with documents in ChromaDB
- [ ] 5.6 Update AddDocumentsRequest: remove embedding requirement from documents
- [ ] 5.7 Update AddDocumentsRequest: remove unused `embedding_provider` and `embedding_model` fields
- [ ] 5.8 Test document upload with text-only documents
- [ ] 5.9 Test batch upload (50+ documents)
- [ ] 5.10 Verify dimension consistency validation still works

## 6. Python Wrapper: Query Endpoint
- [ ] 6.1 Call `get_embedding_model_for_collection(collection)` to get model
- [ ] 6.2 Generate query embedding: `model.encode([request.query], convert_to_numpy=True).tolist()[0]`
- [ ] 6.3 Use generated embedding for ChromaDB query
- [ ] 6.4 Update QueryRequest: remove `query_embedding` field
- [ ] 6.5 Keep metadata filtering support (`where` parameter)
- [ ] 6.6 Test query with text-only request
- [ ] 6.7 Test query with metadata filtering
- [ ] 6.8 Verify cross-encoder reranking still works

## 7. Node Backend: Collections Route Cleanup
- [ ] 7.1 Remove dimension probe embedding generation (line 281)
- [ ] 7.2 Remove document upload embedding generation (line 384)
- [ ] 7.3 Remove query test embedding generation (lines 632-637)
- [ ] 7.4 Verify `generateEmbeddings` import can be removed (check other usages)

## 8. Node Backend: RAG Collector Simplification
- [ ] 8.1 Remove `generateEmbeddings` import (line 9)
- [ ] 8.2 Remove `embeddingCache` Map (line 40)
- [ ] 8.3 Remove embedding generation and caching logic (lines 62-101)
- [ ] 8.4 Remove `query_embedding` from queryOptions (lines 99-101)
- [ ] 8.5 Simplify to: `await provider.query(queryText, {collection, top_k})`

## 9. Node Backend: Provider Updates
- [ ] 9.1 Update ChromaDBWrapperProvider health check to parse `embedding_models` array
- [ ] 9.2 Store embedding_models in health details for UI
- [ ] 9.3 Remove `query_embedding` conditional from query payload (lines 562-564)
- [ ] 9.4 Verify document payload doesn't include embedding field

## 10. Configuration and Documentation
- [ ] 10.1 Create example `backend/rag/embeddings.yml` with 2-3 models
- [ ] 10.2 Update `backend/rag/env.example` with `EMBEDDINGS_CONFIG` variable
- [ ] 10.3 Verify `sentence-transformers` in `requirements.txt`
- [ ] 10.4 Update README with new embedding architecture

## 11. Integration Testing
- [ ] 11.1 Start wrapper with embeddings.yml, verify models load
- [ ] 11.2 Test /health endpoint shows embedding_models
- [ ] 11.3 Create collection with embedding model selection
- [ ] 11.4 Upload documents via Document Upload Wizard
- [ ] 11.5 Verify no embedding generation in Node logs
- [ ] 11.6 Query collection via Collections testing tool
- [ ] 11.7 Test chat flow with RAG integration
- [ ] 11.8 Test cross-encoder reranking flow

## 12. Edge Case Testing
- [ ] 12.1 Start wrapper without embeddings.yml (verify fail-hard with helpful error)
- [ ] 12.2 Collection without embedding_model metadata (verify graceful error)
- [ ] 12.3 Collection with non-loaded model (verify error lists available)
- [ ] 12.4 Concurrent uploads to different collections with different models
- [ ] 12.5 Large batch upload (1000+ documents, monitor memory)

## 13. Performance Validation
- [ ] 13.1 Measure upload time before/after (expect 40% improvement)
- [ ] 13.2 Measure query time before/after (expect 50-60% improvement)
- [ ] 13.3 Document actual performance gains
- [ ] 13.4 Verify no memory issues with loaded models

## 14. Migration Support
- [ ] 14.1 Document metadata backfill process for existing collections
- [ ] 14.2 Test graceful error messages for missing embedding_model
- [ ] 14.3 Provide clear migration instructions in error messages

