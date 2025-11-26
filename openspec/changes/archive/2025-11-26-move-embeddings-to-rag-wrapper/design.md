# Move Embeddings to RAG Wrapper - Design Document

## Context

The current architecture (post-`refactor-embedding-architecture`) moved embedding generation to the Node backend to eliminate code duplication. However, this introduced performance overhead:
- Every document upload requires HTTP call to AI provider API for embeddings (2-5s for 100 docs)
- Every query requires HTTP call to AI provider API for embedding (200-500ms)
- Upcoming cross-encoder integration would add even more HTTP hops

The root issue wasn't duplication itself, but using AI provider APIs for embeddings. The solution is to load embedding models directly in the Python wrapper using HuggingFace's `sentence-transformers` library.

**Critical finding**: `backend/rag/server.py:278-279` references undefined variables `EMBEDDING_PROVIDER` and `embedding_config`, suggesting incomplete cleanup from previous refactor.

## Goals / Non-Goals

**Goals:**
- Eliminate API call overhead for embedding generation
- Co-locate embedding generation with vector storage (single HTTP request from Node)
- Simplify Node backend by removing embedding logic for RAG operations
- Support multiple embedding models loaded simultaneously
- Provide clear model discovery via `/health` endpoint
- Follow proven cross-encoder pattern (server.py lines 100-137)

**Non-Goals:**
- Not removing AI providers from Node backend (still used for chat completions)
- Not changing existing embedding models available (same HuggingFace models)
- Not optimizing embedding model performance (use models as-is)
- Not providing automatic migration for existing collections (manual backfill acceptable)

## Decisions

### Decision 1: Model Configuration Format
**Choice**: YAML config file with short aliases from the start

```yaml
embeddings:
  - id: mxbai-large
    path: mixedbread-ai/mxbai-embed-large-v1
  - id: nomic
    path: nomic-ai/nomic-embed-text-v1
```

**Rationale:**
- Short aliases provide better UX in UI dropdowns
- Multiple models from day one (users choose per collection)
- Consistent with project's config-driven design philosophy
- YAML is human-readable and supports comments

**Alternatives considered:**
- Single model via CLI arg: Too limiting, would need config file later anyway
- Full HuggingFace paths in metadata: Verbose, poor UX
- Auto-discovery: Too complex, explicit better than implicit

### Decision 2: Startup Requirements
**Choice**: Fail-hard at startup if no embedding models configured

**Rationale:**
- Prevents runtime errors from missing models
- Forces proper configuration upfront
- Clear contract: wrapper requires embeddings to function
- Matches cross-encoder pattern (fail if model can't load)

**Error message example:**
```
❌ FATAL: No embedding models configured
   
   Embedding models are required for document storage and querying.
   
   Create embeddings.yml:
   
   embeddings:
     - id: mxbai-large
       path: mixedbread-ai/mxbai-embed-large-v1
   
   Then start with: python server.py --embeddings-config embeddings.yml
```

### Decision 3: Dimension Validation
**Choice**: Trust that same model always produces same dimensions (no explicit validation)

**Rationale:**
- Same model ID = same model = same dimensions (guaranteed by model architecture)
- Simplest approach, least overhead
- Any dimension mismatch would indicate configuration error (wrong model loaded)
- Validation would be redundant

**Alternatives considered:**
- Store dimensions in config: Extra config burden, model already knows dimensions
- Validate per-request: Overhead for guaranteed property
- Store in collection metadata: Redundant, can query model for dimensions

### Decision 4: Batching Strategy
**Choice**: No batching in wrapper - caller handles batch size

**Rationale:**
- Document Upload Wizard already batches at 50 documents per request
- Node backend controls batch size and UI feedback
- Wrapper processes full batch in single `encode()` call (efficient)
- Separation of concerns: UI controls UX, wrapper focuses on embedding generation

**Alternatives considered:**
- Wrapper batching: Adds complexity, caller already batches appropriately
- No batching anywhere: Would hit memory/performance limits with large uploads

### Decision 5: Model Selection at Collection Creation
**Choice**: Require explicit `embedding_model` selection (no default)

**Rationale:**
- Makes model choice visible and intentional
- Prevents confusion about which model is used
- Clear error message lists available models if omitted
- Aligns with explicit-over-implicit philosophy

**Alternatives considered:**
- Default to first loaded model: Implicit, users might not notice
- Store all loaded models: Wasteful, collections use one model

## Architecture

### Model Loading (Startup)

**Pattern**: Follow cross-encoder implementation exactly (server.py:100-137)

```python
# Global state
embedding_models = {}  # Dict[str, dict] - keyed by model ID
embedding_model_configs = []  # List of configs from YAML

# Startup sequence (before FastAPI routes)
def load_embedding_models(config_path):
    """Load embedding models from YAML config"""
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    if not config.get('embeddings'):
        print("❌ FATAL: No embedding models configured")
        sys.exit(1)
    
    for model_config in config['embeddings']:
        model_id = model_config['id']
        model_path = model_config['path']
        
        print(f"Loading embedding model: {model_id} ({model_path})...")
        model = SentenceTransformer(model_path)
        
        embedding_models[model_id] = {
            'model': model,
            'name': model_path,
            'dimensions': model.get_sentence_embedding_dimension()
        }
        
        print(f"✓ Loaded: {model_id} ({embedding_models[model_id]['dimensions']} dimensions)")
```

**Positioning**: After cross-encoder loading, before FastAPI app creation

### Helper Function

```python
def get_embedding_model_for_collection(collection):
    """Retrieve the embedding model for a collection"""
    metadata = collection.metadata or {}
    model_id = metadata.get('embedding_model')
    
    if not model_id:
        raise HTTPException(
            status_code=400,
            detail=f"Collection '{collection.name}' has no embedding_model in metadata. "
                   f"This may be an older collection. Please update metadata with one of: "
                   f"{list(embedding_models.keys())}"
        )
    
    if model_id not in embedding_models:
        available = list(embedding_models.keys())
        raise HTTPException(
            status_code=503,
            detail=f"Embedding model '{model_id}' not loaded. Available models: {available}"
        )
    
    return embedding_models[model_id]['model']
```

### Request Model Changes

**Before:**
```python
class CreateCollectionRequest(BaseModel):
    name: str
    metadata: Optional[Dict[str, Any]] = {}
    embedding_provider: Optional[str] = None  # Remove
    embedding_model: Optional[str] = None     # Keep, make required in practice

class AddDocumentsRequest(BaseModel):
    documents: List[Dict[str, Any]]  # Each must have 'embedding' field
    embedding_provider: Optional[str] = None  # Remove
    embedding_model: Optional[str] = None     # Remove

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    collection: Optional[str] = None
    query_embedding: List[float]  # Remove - wrapper generates
    where: Optional[Dict[str, Any]] = None
```

**After:**
```python
class CreateCollectionRequest(BaseModel):
    name: str
    metadata: Optional[Dict[str, Any]] = {}
    embedding_model: Optional[str] = None  # Validated against loaded models

class AddDocumentsRequest(BaseModel):
    documents: List[Dict[str, Any]]  # Each: {text, metadata?, id?} - no embedding

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    collection: Optional[str] = None
    where: Optional[Dict[str, Any]] = None  # Keep filtering support
```

### Endpoint Flow Changes

**POST /collections/{name}/documents:**

Before:
```python
# Validate each document has embedding field
if 'embedding' not in doc:
    raise HTTPException(400, "All documents must include pre-computed embeddings")
```

After:
```python
# Get model and generate embeddings
model = get_embedding_model_for_collection(collection)
texts = [doc['text'] for doc in request.documents]
embeddings = model.encode(texts, convert_to_numpy=True).tolist()
```

**POST /query:**

Before:
```python
# Use pre-computed query embedding
query_embedding = request.query_embedding
results = collection.query(query_embeddings=[query_embedding], ...)
```

After:
```python
# Generate query embedding
model = get_embedding_model_for_collection(collection)
query_embedding = model.encode([request.query], convert_to_numpy=True).tolist()[0]
results = collection.query(query_embeddings=[query_embedding], ...)
```

## Node Backend Changes

### Files Modified

**1. routes/collections.js** (~10 lines removed)
- Line 281: Remove dimension probe
- Line 384: Remove document embedding generation
- Lines 632-637: Remove query embedding generation

**2. lib/rag-collector.js** (~40 lines removed)
- Remove embeddingCache Map
- Remove embedding generation logic
- Remove query_embedding from options
- Simplify to text-only queries

**3. retrieval-providers/providers/ChromaDBWrapperProvider.js** (~3 lines removed)
- Remove query_embedding conditional
- Add embedding_models parsing in health check

**Total code removed**: ~50-60 lines

## Risks / Trade-offs

### Risk 1: Model Loading Memory
**Risk**: Loading multiple embedding models consumes significant RAM (500MB-2GB per model)

**Mitigation:**
- Document memory requirements clearly
- Recommend 2-3 models maximum for typical deployments
- Provide size guidance in example config

### Risk 2: Startup Time
**Risk**: Loading models at startup adds 10-30 seconds to wrapper initialization

**Mitigation:**
- Document expected startup time
- Startup messages show progress
- One-time cost (models stay loaded)

### Risk 3: Existing Collections Incompatibility
**Risk**: Collections created before this change lack `embedding_model` metadata

**Mitigation:**
- Graceful error messages with clear migration instructions
- Helper function provides list of available models in error
- Manual backfill process documented
- Consider future migration script if needed

### Risk 4: Breaking Change Impact
**Risk**: Existing integrations expecting old API format will break

**Mitigation:**
- This is primarily internal (Node ↔ Python), not external API
- Document Upload Wizard is the main integration point (will be updated)
- Clear migration guide for any external consumers

## Migration Plan

### Phase 1: Preparation
1. Create `embeddings.yml` with desired models
2. Verify `sentence-transformers` in `requirements.txt`
3. Update environment files with `EMBEDDINGS_CONFIG`

### Phase 2: Python Wrapper Deployment
1. Deploy updated `server.py` with model loading
2. Start with `--embeddings-config embeddings.yml`
3. Verify `/health` shows loaded models
4. Test document upload and query endpoints

### Phase 3: Node Backend Deployment
1. Deploy updated routes/collectors/providers
2. Verify simplified requests work
3. Test Document Upload Wizard end-to-end
4. Test Collections testing tool

### Phase 4: Existing Collections
1. Identify collections without `embedding_model` metadata
2. Update metadata via UI or direct API call
3. Verify collections work after backfill

### Rollback Plan
- Keep previous version of both services available
- Revert wrapper deployment first (restore pre-computed embedding expectation)
- Revert Node backend second (restore embedding generation)
- Migration is forward-only (collections updated to new format stay updated)

## Open Questions

None - all design decisions validated during OpenPlan validation phase.

## Performance Expectations

**Document Upload (100 docs):**
- Before: 2-5 seconds (API call overhead)
- After: 1-3 seconds (in-process generation)
- **Improvement: ~40% faster**

**Query:**
- Before: 250-550ms (API call + search)
- After: 80-150ms (generate + search in one request)
- **Improvement: ~50-60% faster**

**Cross-encoder flow:**
- Embed + search + rerank all co-located in Python
- Eliminates 2 HTTP hops (Node → AI provider, Node → wrapper)
- Significant improvement for advanced RAG queries

