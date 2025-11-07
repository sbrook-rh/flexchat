# Implementation Tasks

## ✅ STATUS: All Tasks Complete

The embedding architecture refactoring is fully implemented and tested. Key achievements:
- ✅ Node.js backend generates all embeddings (documents + queries)
- ✅ Storage-only RAG wrapper with zero LLM dependencies  
- ✅ Per-collection embedding metadata ensures consistency
- ✅ UI-side connection resolution for maximum flexibility
- ✅ ChromaDB properly returns documents array for query results
- ✅ Improved RAG context formatting with source attribution

## 1. Backend: Embedding Generation Infrastructure
- [x] 1.1 Create `backend/chat/lib/embedding-generator.js` module
- [x] 1.2 Implement `generateEmbeddings(texts, connectionId, config, explicitModel)` function with optional explicit model parameter
- [x] 1.3 Add error handling for missing/invalid connections
- [x] 1.4 Keep `resolveEmbeddingModel()` as internal fallback for API calls without explicit model

## 2. Backend: LLM Provider Updates
- [x] 2.1 Add `generateEmbeddings(texts, model)` method to OpenAI provider
- [x] 2.2 Configure OpenAI embedding model (text-embedding-3-small or ada-002)
- [x] 2.3 Add `generateEmbeddings(texts, model)` method to Ollama provider
- [x] 2.4 Configure Ollama embedding model (nomic-embed-text)
- [x] 2.5 Add `generateEmbeddings(texts, model)` method to Gemini provider
- [x] 2.6 Configure Gemini embedding model (text-embedding-004)
- [x] 2.7 Update base provider interface documentation

## 3. Backend: Collection Metadata System
- [x] 3.1 Define collection metadata schema (embedding_provider, embedding_model, embedding_dimensions, embedding_connection_id, created_at)
- [x] 3.2 Frontend implements compatible connection resolution via model discovery (not server-side utility)
- [x] 3.3 Backend requires explicit embedding_connection and embedding_model from UI (no server-side resolution)
- [x] 3.4 Collections store complete embedding metadata at creation time

## 4. Backend: Collections Endpoint Updates
- [x] 4.1 Modify POST `/api/collections` to require embedding_connection and embedding_model, store complete metadata
- [x] 4.2 Modify POST `/api/collections/:name/documents` to require embedding_connection and embedding_model parameters
- [x] 4.3 Remove server-side auto-resolution logic (UI resolves connections)
- [x] 4.4 Integrate embedding generation into upload flow with explicit model parameter
- [x] 4.5 Backend validates required parameters are present (no fallback resolution)
- [x] 4.6 Collection metadata includes embedding_connection_id for legacy compatibility
- [x] 4.7 Update rag-collector.js to generate query embeddings before calling RAG provider
- [x] 4.8 Resolve embedding connection from collection metadata for queries
- [x] 4.9 Pass pre-computed embeddings to RAG provider query method

## 5. Backend: RAG Wrapper Refactoring
- [x] 5.1 Update `/collections/{collection_name}/documents` endpoint to require pre-computed embeddings
- [x] 5.2 Add validation to reject documents without embeddings (validates array format and dimension consistency)
- [x] 5.3 Honor top-level `embedding_provider` and `embedding_model` on `/collections` create (stored as metadata, no defaults)
- [x] 5.4 Remove provider allowlist validation on create (treat as metadata only)
- [x] 5.5 Update `/query` endpoint to accept optional pre-computed query embeddings
- [x] 5.6 Mark embedding generation code and provider initialization as deprecated (kept for legacy support)
- [x] 5.7 Update env.example to mark embedding environment variables as deprecated/optional
- [x] 5.8 Update RAG wrapper to storage-only semantics for collection create/update

## 6. Frontend: UI Updates
- [x] 6.1 Convert Create Collection to modal (name, description, thresholds; Embedding preset section with connection + model selectors)
- [x] 6.2 Convert Edit Collection to modal (description, thresholds; read-only embedding metadata display)
- [x] 6.3 Add embedding connection + model selectors to Create Collection modal with auto-preselect from global default
- [x] 6.4 Convert Upload Documents to modal triggered from collection card; auto-resolve connection via model discovery
- [x] 6.5 Display collection embedding metadata in Edit Collection modal (provider, model, dimensions, connection_id)
- [x] 6.6 Show connection resolution status in Upload modal (loading, success with connection name, or clear error)
- [x] 6.7 Add validation for required embedding fields (connection and model) in Create Collection
- [x] 6.8 Upload modal validates resolved connection exists before enabling submit
- [x] 6.9 Remove per‑RAG‑service embedding overrides UI from EmbeddingsSection
- [x] 6.10 Implement smart connection resolution in Upload modal: exact ID match first, then model discovery fallback
- [x] 6.11 Handle legacy collections (missing embedding_connection_id) via model discovery

## 7. Testing
- [x] 7.1 Test document upload with OpenAI embeddings
- [x] 7.2 Test document upload with Ollama embeddings (verified with all-minilm:latest and nomic-embed-text:latest)
- [x] 7.3 Test document upload with Gemini embeddings
- [x] 7.4 Test collection creation with embedding metadata storage (verified metadata includes all fields)
- [x] 7.5 Backend requires explicit connection + model from UI (no compatibility validation needed server-side)
- [x] 7.6 Test that different collections can use different models (tofu-magic: all-minilm, comfort-soups: nomic-embed-text)
- [x] 7.7 Test RAG wrapper rejects documents without embeddings (validated via curl)
- [x] 7.8 Test query flow with compatible embedding connection selection (Phase 3)
- [x] 7.9 Test UI error messages for missing/incompatible connections (verified connection resolution errors display correctly)
- [x] 7.10 Test legacy collection upload (comfort-soups-of-the-world metadata updated, upload successful)
- [x] 7.11 Test model name exact matching (nomic-embed-text vs nomic-embed-text:latest - requires exact match)

## 8. Documentation
- [x] 8.1 Update API documentation for collections endpoints (added Collections API section to API_REFERENCE.md)
- [x] 8.2 Document embedding metadata schema (included in API_REFERENCE.md with TypeScript interface)
- [x] 8.3 Update RAG wrapper README (backend/rag/README.md updated for Phase 0.5 storage-only semantics)
- [x] 8.4 Add migration guide for existing deployments (docs/PHASE_05_MIGRATION.md created with full procedures)
- [x] 8.5 Document embedding model compatibility requirements (covered in migration guide and API reference)

## 9. Migration Support
- [x] 9.1 Manual process for updating legacy collection metadata (demonstrated with comfort-soups-of-the-world)
- [x] 9.2 Document deployment sequence (detailed in PHASE_05_MIGRATION.md)
- [x] 9.3 Create rollback plan (included in migration guide)

