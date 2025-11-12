# Embedding Architecture Refactoring Proposal

## Why

Currently, embedding generation happens in the Python RAG wrapper, which creates several architectural problems:
- The RAG wrapper duplicates LLM connection configuration solely for embedding generation
- Tight coupling between storage operations and embedding generation
- Cannot reuse embedding logic for future ETL loading features
- Node backend already has all LLM connections configured and managed

This refactoring moves embedding generation to the Node backend, making the RAG wrapper a pure storage proxy while enabling reusable embedding logic for both manual uploads and future ETL data loading workflows.

## What Changes

### New Capabilities
- **Embedding Generation in Node Backend** - New module (`backend/chat/lib/embedding-generator.js`) that generates embeddings using existing LLM connections
- **Provider Embedding Support** - All LLM providers (OpenAI, Ollama, Gemini) implement `generateEmbeddings()` method
- **Collection Embedding Metadata** - Collections store embedding provider and model information to ensure consistency across config changes
- **Embedding Compatibility Validation** - System validates that documents added to collections use compatible embedding models

### Modified Capabilities
- **Document Upload Flow** - Upload endpoint now requires `embedding_connection` parameter and generates embeddings before sending to RAG wrapper
- **Query Flow** - RAG collector now generates query embeddings in Node before sending to wrapper (wrapper receives pre-computed embeddings)
- **Collection Creation** - Collections store embedding metadata at creation time
- **RAG Wrapper** - Simplified to accept only pre-computed embeddings for both documents AND queries, removing all embedding generation code
- **UI Upload Forms** - Updated to include embedding model selector (uses current LLM connections)
- **Collections UI (Create/Edit) uses Modals** - Move create/edit collection forms into modals to reduce page clutter and make embedding preset selection clearer. The "Default Embedding" in Config Builder acts only as a preset when creating a collection; per-collection metadata remains the source of truth. Per‑RAG‑service overrides are removed.
- **Wrapper Behavior (Storage-Only)** - The wrapper honors `embedding_provider` and `embedding_model` as metadata only, with no LLM provider configuration or embedding generation

### Removed Capabilities
- **RAG Wrapper Embedding Generation** - Remove ALL embedding generation (documents and queries) and LLM provider configuration from Python RAG service
- **RAG Wrapper Environment Configuration** - Remove EMBEDDING_PROVIDER, EMBEDDING_MODEL, and API key environment variables

### Architecture Changes

**Before:**
```
UI → Node Backend → RAG Wrapper [generates embeddings] → ChromaDB
```

**After:**
```
UI → Node Backend [generates embeddings] → RAG Wrapper [storage only] → ChromaDB
```

### Breaking Changes
- **BREAKING**: Document upload endpoint now requires `embedding_connection` parameter
- **BREAKING**: RAG wrapper now requires all documents to include pre-computed embeddings
- **BREAKING**: Collection creation now requires `embedding_connection` to set metadata
  - Wrapper create accepts top-level `embedding_provider`/`embedding_model` without validating provider type

## Impact

### Affected Specs
- `ai-providers` - Add detailed embedding generation requirements
- New spec needed: `collections` - Document collection management with embedding metadata
- New spec needed: `rag-providers` - RAG wrapper service interface

### Affected Code
- `backend/chat/lib/embedding-generator.js` - NEW: Core embedding generation module
- `backend/chat/routes/collections.js` - MODIFIED: Add embedding generation to upload/create endpoints
- `backend/chat/ai-providers/services/OpenAIProvider.js` - MODIFIED: Add `generateEmbeddings()` method
- `backend/chat/ai-providers/services/OllamaProvider.js` - MODIFIED: Add `generateEmbeddings()` method  
- `backend/chat/ai-providers/services/GeminiProvider.js` - MODIFIED: Add `generateEmbeddings()` method
- `backend/rag/server.py` - MODIFIED: Accept pre-computed embeddings, remove generation logic
- `backend/rag/.env.example` - MODIFIED: Remove embedding-related environment variables
- Frontend upload components - MODIFIED: Add embedding model selector

### Migration Path
1. Update all LLM provider implementations to support embedding generation
2. Deploy new Node backend with embedding generation capability
3. Update RAG wrapper to accept pre-computed embeddings (backward compatible initially)
4. Update frontend to pass `embedding_connection` parameter
5. Remove embedding generation from RAG wrapper once all clients updated

### Benefits
- ✅ Single source of truth for LLM connections
- ✅ Simplified RAG wrapper (pure storage proxy)
- ✅ Enables future ETL loading feature (reuses same embedding logic)
- ✅ User controls embedding model through UI
- ✅ Different collections can use different embedding models
- ✅ Embedding consistency enforced via collection metadata
- ✅ Cleaner UX with modal-based collection creation/editing

### Risks
- Breaking change requires coordinated deployment
- Existing collections may need metadata backfill
- Performance implications of generating embeddings in Node vs Python (minimal expected)

