# Implementation Tasks

## 1. Python RAG Service - Startup Configuration

- [x] 1.1 Create curated model list
  - Define RECOMMENDED_MODELS dictionary with metadata
  - Include cross-encoder/ms-marco-MiniLM-L-6-v2 (fast)
  - Include BAAI/bge-reranker-base (recommended)
  - Include BAAI/bge-reranker-large (high-accuracy)
  - Store size, latency, and accuracy tier for each

- [x] 1.2 Add --list-reranker-models command
  - Check for flag before other argument processing
  - Display curated models in formatted table
  - Group by use case (fast, recommended, high-accuracy)
  - Include note about any HuggingFace model working
  - Include link to HuggingFace model hub
  - Exit after displaying list

- [x] 1.3 Add argument parser flags
  - Add `--cross-encoder` with help text showing examples
  - Add `--cross-encoder-path` for local model path
  - Add `--list-reranker-models` for model discovery
  - Support environment variables as fallback
  - Priority: path > model name > env vars

- [x] 1.4 Add model loading logic
  - Create global variables for model and model name
  - Load from local path if specified (fail-fast on error)
  - Load from HuggingFace if model name specified (fail-fast on error)
  - Log info message when no cross-encoder specified
  - Log hint with example model and reference to --list-reranker-models
  - Exit immediately if load fails (fail-fast principle)

## 2. Python RAG Service - Health Check Extension

- [x] 2.1 Extend /health endpoint
  - Add cross_encoder field to response when model loaded
  - Include model name and status
  - Maintain backward compatibility (field only present when loaded)

## 3. Python RAG Service - Rerank Endpoint

- [x] 3.1 Create Pydantic request model
  - RerankRequest with query, documents, optional top_k
  - Documents as List[Dict] with id and text fields
  - Proper type validation

- [x] 3.2 Implement POST /rerank endpoint
  - Check if cross-encoder loaded (return 503 if not)
  - Prepare query-document pairs for cross-encoder
  - Call cross_encoder_model.predict() to score pairs
  - Combine scores with document IDs and original ranks
  - Sort by score descending
  - Apply top_k limit if specified
  - Return scored, reordered documents

- [x] 3.3 Add error handling
  - Return 503 if cross-encoder not loaded
  - Return 400 for invalid input (Pydantic handles)
  - Return 500 for scoring errors with clear message
  - Log all errors for debugging

## 4. Node.js Provider - Rerank Method

- [x] 4.1 Add rerank() method to ChromaDBWrapperProvider
  - Accept query, documents, optional topK parameters
  - Check initialization state
  - Check health endpoint for cross-encoder availability
  - Gracefully return original documents if unavailable

- [x] 4.2 Implement HTTP call to /rerank
  - Use withRetry wrapper (existing pattern)
  - Include configured timeout and auth headers
  - Map documents to required format (id, text)
  - Handle missing document IDs (generate fallback)

- [x] 4.3 Add error handling
  - Catch health check failures (log warning, return original)
  - Catch /rerank endpoint errors (log warning, return original)
  - Never throw errors (graceful degradation)
  - Log all degradation events for observability

## 5. Testing

**DEFERRED** - Test requirements tracked in OpenPlan epic: `testing`

See `openplan/data/epics/testing.md` (section "From Cross-Encoder Reranking Service") for consolidated test strategy.

Manual testing completed:
- ✅ Model loads from HuggingFace (cross-encoder/ms-marco-MiniLM-L-6-v2)
- ✅ Health endpoint reports cross-encoder status
- ✅ `/rerank` endpoint returns scored, reordered results
- ✅ Reranking quality verified (correct answer moved to top)
- ✅ 503 error when cross-encoder not loaded

Automated test suites deferred to testing epic:
- [x] 5.1 Model loading tests (deferred)
- [x] 5.2 Health check tests (deferred)
- [x] 5.3 Endpoint validation tests (deferred)
- [x] 5.4 Integration tests (deferred)
- [x] 5.5 Quality validation tests (deferred)

## 6. Documentation

- [x] 6.1 Update requirements.txt
  - Add sentence-transformers dependency
  - Document version compatibility if needed

- [x] 6.2 Update API documentation
  - Document POST /rerank endpoint with examples
  - Document health check cross-encoder field
  - Document startup flags and environment variables
  - Include model recommendations and size/latency tradeoffs

- [x] 6.3 Update deployment documentation
  - Document model download behavior
  - Document container pre-loading strategy
  - Document Kubernetes/OpenShift volume mount approach
  - Include performance characteristics

