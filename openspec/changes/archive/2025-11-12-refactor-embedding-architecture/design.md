# Embedding Architecture Refactoring Design

## Context

FlexChat uses embeddings to convert text documents into vectors for semantic search in RAG (Retrieval-Augmented Generation) workflows. Currently, embedding generation happens in the Python RAG wrapper service, requiring it to maintain duplicate LLM connection configuration.

**Current Architecture Pain Points:**
- RAG wrapper duplicates LLM connection logic (OpenAI API keys, Ollama URLs, etc.)
- Cannot reuse embedding generation for future features (ETL loading)
- Tight coupling between storage (ChromaDB operations) and embedding generation
- User cannot control embedding model through main UI
- Different embedding configs between Node backend and Python wrapper

**Stakeholders:**
- End users: Need consistent embedding model selection across features
- Developers: Want simpler architecture with less duplication
- Future ETL feature: Requires embedding generation in Node

## Goals / Non-Goals

### Goals
- Move embedding generation to Node backend (single source of truth for LLM connections)
- Make RAG wrapper a pure storage proxy (no LLM dependencies)
- Enable reusable embedding logic for manual uploads AND future ETL loading
- Store embedding metadata in collections to ensure consistency across config changes
- Validate embedding compatibility when adding documents to collections

### Non-Goals
- Change embedding models or algorithms (use existing provider capabilities)
- Optimize embedding performance (maintain current performance characteristics)
- Support multiple embedding models per collection (one model per collection)
- Support embedding model migration (user must create new collection)

## Decisions

### Decision 1: Embedding Generation in Node Backend
**What:** Create `backend/chat/lib/embedding-generator.js` that wraps existing LLM provider embedding methods.

**Why:**
- Node backend already has all LLM connections configured
- Eliminates duplication in RAG wrapper
- Enables reuse for ETL loading feature
- Consistent with FlexChat's architecture (Node backend orchestrates, Python provides storage)

**Alternatives Considered:**
- Keep embeddings in RAG wrapper: Rejected due to duplication and inability to reuse for ETL
- Create separate embedding service: Rejected as over-engineering (adds unnecessary complexity)

### Decision 2: Collection Embedding Metadata
**What:** Store `embedding_provider`, `embedding_model`, `embedding_dimensions`, and `embedding_connection_id` in collection metadata at creation time.

**Why:**
- User might change LLM connection IDs between sessions
- Need to find compatible connections even if config changes
- Provider + model pair is portable across configs
- Enables clear error messages when compatible connection unavailable

**Metadata Schema:**
```json
{
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "embedding_dimensions": 1536,
  "embedding_connection_id": "openai_primary",
  "created_at": "2025-11-06T10:30:00Z"
}
```

**Alternatives Considered:**
- Store only connection ID: Rejected (IDs may change across configs)
- Store full connection config: Rejected (sensitive data, too much duplication)
- No metadata: Rejected (cannot validate compatibility or find connections later)

### Decision 3: Embedding Compatibility Validation
**What:** When adding documents to a collection, validate that the `embedding_connection` matches the collection's stored embedding metadata (provider + model).

**Why:**
- Prevents silent embedding incompatibility issues
- Gives users clear error messages
- Ensures semantic search works correctly

**Implementation:**
```javascript
function validateEmbeddingCompatibility(collectionMetadata, connectionConfig) {
  if (collectionMetadata.embedding_provider !== connectionConfig.provider ||
      collectionMetadata.embedding_model !== connectionConfig.embeddingModel) {
    throw new Error(
      `Embedding model mismatch: Collection requires ` +
      `${collectionMetadata.embedding_provider}/${collectionMetadata.embedding_model}, ` +
      `but connection uses ${connectionConfig.provider}/${connectionConfig.embeddingModel}`
    );
  }
}
```

**Alternatives Considered:**
- No validation: Rejected (silent failures confuse users)
- Warn but allow: Rejected (creates corrupted collections)
- Auto-convert embeddings: Rejected (computationally expensive, requires all original documents)

### Decision 4: RAG Wrapper Interface Change
**What:** 
- RAG wrapper POST `/collections/{collection_name}/documents` endpoint now requires `embedding` field in each document (pre-computed).
- RAG wrapper POST `/collections` treats `embedding_provider` and `embedding_model` as metadata only and honors values sent by Node as top-level fields; no provider allowlist or default derivation.

**Why:**
- Simplifies RAG wrapper (pure storage operations)
- Makes embedding generation explicit and testable
- Consistent with architecture principle (Node orchestrates, Python stores)
- Prevents wrapper from overriding Node’s chosen provider/model during collection creation

**Breaking Change Mitigation:**
- Update both Node backend and RAG wrapper simultaneously
- Add clear error message if embedding missing: "All documents must include pre-computed embeddings"
- Document migration path in deployment guide

**Alternatives Considered:**
- Keep optional embedding field: Rejected (ambiguous behavior, harder to reason about)
- Support both modes: Rejected (increases complexity, delays cleanup)
- Validate provider type in wrapper: Rejected (storage-only; Node is the source of truth)

### Decision 5: Frontend Connection Resolution (Not Backend)
**What:** 
- Upload Documents modal resolves compatible connection client-side before submitting
- Backend requires explicit `embedding_connection` and `embedding_model` parameters (no server-side resolution)
- Resolution logic: 1) Try exact `embedding_connection_id` match, 2) Search via model discovery API

**Why:**
- UI provides better UX with real-time feedback (loading states, clear errors)
- Backend stays simple and predictable (no fallback logic)
- Model discovery already happens in UI for Create Collection
- Avoids server-side "magic" that's hard to debug

**Implementation (Frontend):**
```javascript
async function resolveCompatibleConnection(collection) {
  const meta = collection.metadata;
  
  // Step 1: Try exact connection ID match
  if (meta.embedding_connection_id && llms[meta.embedding_connection_id]) {
    return meta.embedding_connection_id;
  }
  
  // Step 2: Search all connections via model discovery
  for (const [connectionId, connectionConfig] of Object.entries(llms)) {
    if (connectionConfig.provider !== meta.embedding_provider) continue;
    
    const models = await discoverModels(connectionConfig);
    if (models.some(m => m.id === meta.embedding_model)) {
      return connectionId;
    }
  }
  
  throw new Error(`No compatible connection found for ${meta.embedding_provider}/${meta.embedding_model}`);
}
```

**Alternatives Considered:**
- Server-side resolution: Rejected (moves UX feedback away from user, harder to provide loading states)
- Fuzzy model matching (strip :latest): Rejected (dangerous - different versions could be incompatible)
- Auto-create missing connections: Rejected (too magical, security concerns)

### Decision 6: Query Embeddings in Node Backend
**What:**
- RAG collector (`rag-collector.js`) generates query embeddings before calling RAG wrapper
- Fetches collection metadata to determine embedding connection and model
- Passes pre-computed `query_embedding` to RAG provider query method
- Wrapper accepts optional `query_embedding` parameter (legacy fallback if not provided)

**Why:**
- Completes the embedding architecture refactoring (wrapper becomes pure storage)
- RAG wrapper no longer needs LLM provider configuration or API keys
- Consistent with document upload flow (Node generates embeddings)
- Enables full removal of embedding generation from wrapper in future

**Flow:**
```javascript
// rag-collector.js
1. Fetch collection metadata to get embedding_connection_id and embedding_model
2. Generate query embedding using generateEmbeddings(query, connectionId, config, model)
3. Pass query_embedding to provider.query(text, { query_embedding, ... })

// ChromaDBWrapperProvider.js
4. Forward query_embedding to wrapper in request payload

// server.py (wrapper)
5. Accept optional query_embedding parameter
6. Use pre-computed embedding if provided, otherwise generate (legacy support)
```

**Alternatives Considered:**
- Keep query embeddings in wrapper: Rejected (maintains LLM dependency, inconsistent with document flow)
- Generate embeddings in frontend: Rejected (embedding models too large for browser)
- Separate query service: Rejected (over-engineering)

## Risks / Trade-offs

### Risk: Breaking Change for Existing Deployments
**Impact:** Existing upload flows will break until updated.

**Mitigation:**
- Document clear deployment sequence
- Provide migration script for collection metadata backfill
- Add comprehensive error messages
- Test migration path before release

### Risk: Performance of Embedding Generation in Node
**Impact:** Node.js might be slower than Python for embedding generation.

**Mitigation:**
- Both call same underlying APIs (OpenAI REST API, Ollama REST API, Gemini REST API)
- Network latency dominates over language overhead
- Can add batching if needed
- Monitor performance in testing

**Trade-off Accepted:** Slight performance overhead (if any) is worth the architectural benefits.

### Risk: Collection Metadata Backfill
**Impact:** Existing collections created before this change won't have embedding metadata.

**Mitigation:**
- Create migration script that detects current embedding config from RAG wrapper
- Document manual backfill process
- Add validation that prompts user to add metadata if missing

## Migration Plan

### Phase 1: Preparation (Code Changes)
1. Implement embedding generation in Node backend
2. Update LLM providers with `generateEmbeddings()` methods
3. Add collection metadata system
4. Update frontend with:
   - Embedding selector as a default preset in Config Builder (no operational effect)
   - Modal-based Create Collection UI (name, service, description; Advanced: embedding preset)
   - Modal-based Edit Collection UI (description; Advanced: read-only embedding info)
   - Remove per‑RAG‑service embedding overrides UI

### Phase 2: Deployment (Coordinated Update)
1. Deploy updated Node backend (backward compatible - still works with old RAG wrapper)
2. Deploy updated RAG wrapper (requires pre-computed embeddings; honors top-level embedding fields on create; provides clear errors)
3. Deploy updated frontend (passes embedding_connection parameter)
4. Test end-to-end upload flow

### Phase 3: Cleanup
1. Remove embedding generation code from RAG wrapper
2. Remove embedding environment variables
3. Update documentation
4. Run metadata backfill script for existing collections

### Rollback Plan
If issues discovered after deployment:
1. Revert RAG wrapper to accept documents without embeddings (temporary)
2. Fix issues in Node backend
3. Redeploy coordinated update

## Open Questions

### Q1: How to handle collections created before this change?
**Answer:** Provide migration script that:
- Reads current RAG wrapper embedding config
- Writes metadata to all existing collections
- Validates metadata is correct
- Documents manual process for edge cases

### Q2: Should we validate embedding dimensions match?
**Answer:** Yes, store `embedding_dimensions` in metadata and validate when possible. Different models have different dimensions (OpenAI ada-002: 1536, nomic-embed-text: 768), so mismatches indicate configuration errors.

### Q3: Are metadata updates additive or replacements?
**Answer:** **Full replacement**. The RAG wrapper's `PUT /collections/{name}/metadata` endpoint replaces ALL metadata with the provided object. When updating one field, you must send the complete metadata object. This is documented in migration guide.

**Example (correct):**
```bash
# Fetch full metadata first
METADATA=$(curl /collections/my-collection | jq '.metadata')
# Update one field and send complete object
curl -X PUT /collections/my-collection/metadata -d "{\"metadata\": $METADATA_WITH_CHANGE}"
```

### Q4: How are model IDs matched (with/without :latest)?
**Answer:** **Exact match only**. Model IDs must match exactly, including version tags like `:latest`. 

**Rationale:** `nomic-embed-text` and `nomic-embed-text:latest` could theoretically be different versions. Fuzzy matching could cause subtle bugs where embeddings are incompatible.

**Impact on legacy collections:** Collections created before proper metadata schema may have stored `nomic-embed-text` without `:latest`. These require manual metadata updates to add the suffix.

**Migration:**
```bash
curl -X PUT /api/collections/my-collection/metadata \
  -d '{"service":"MyService","metadata":{...,"embedding_model":"nomic-embed-text:latest",...}}'
```

### Q5: What if user wants to change embedding model for a collection?
**Answer:** Not supported in this change. User must:
1. Create new collection with desired embedding model
2. Re-upload/reload documents
3. Delete old collection

Future enhancement could add "re-embed collection" feature, but not in scope for Phase 0.5.

### Q4: Should embedding_connection be required for collection creation?
**Answer:** Yes. Collection creation should capture embedding metadata immediately, even if empty. This ensures metadata is always present and reduces special cases.

