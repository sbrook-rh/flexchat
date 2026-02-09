# Cross-Encoder Reranking Design

## Context

Semantic search (vector similarity) retrieves lexically/semantically related documents but struggles with ranking precision. Cross-encoders evaluate query-document pairs jointly, providing superior relevance scores for focused questions.

**Use case:** User asks procedural question. Semantic search returns related reference material ranked higher than actual answer. Cross-encoder reranking moves procedural answer to top.

## Goals

- Add cross-encoder reranking capability to RAG service
- Enable Node.js providers to request reranking
- Support multiple model sizes (performance vs accuracy tradeoffs)
- Fail-fast if model specified but cannot load
- Graceful degradation when cross-encoder unavailable

## Non-Goals

- Automatic reranking in existing query flows
- Configuration UI for model selection
- Integration with specific features (that comes later)
- Custom cross-encoder training

## Architecture

### Model Loading Strategy

**Three options (priority order):**

1. **Local path** (`--cross-encoder-path /models/bge-reranker-base`)
   - For containerized deployments with volume mounts
   - Fastest startup (no download)
   - Enables airgapped environments

2. **HuggingFace model** (`--cross-encoder BAAI/bge-reranker-base`)
   - Downloads to `~/.cache/huggingface/hub/`
   - Good for development
   - First run slow, subsequent runs fast

3. **Environment variables** (fallback)
   - `CROSS_ENCODER_PATH` or `CROSS_ENCODER_MODEL`
   - Container-friendly

**No default model** - user must explicitly specify.

### Fail-Fast Philosophy

If cross-encoder specified but fails to load → **exit immediately**.

**Why:** Silent failures in production are dangerous. If user configured cross-encoder, they expect it to work. Better to fail startup than serve degraded results silently.

### API Design

**Request:**
```json
POST /rerank
{
  "query": "How do I reset my password?",
  "documents": [
    {"id": "doc-001", "text": "Password security best practices..."},
    {"id": "doc-002", "text": "To reset your password, go to Settings..."}
  ],
  "top_k": 3
}
```

**Response:**
```json
{
  "reranked": [
    {"id": "doc-002", "score": 0.92, "original_rank": 2},
    {"id": "doc-001", "score": 0.67, "original_rank": 1}
  ]
}
```

**Why this format:**
- Client provides IDs for matching results back to source
- Scores are explicit (enables threshold filtering later)
- Original rank preserved (enables debugging)
- top_k optional (client controls result count)

### Node.js Integration Pattern

**Check-before-call:**
```javascript
// Check health to see if cross-encoder available
const health = await this.healthCheck();
if (!health.details?.cross_encoder) {
  return documents; // Graceful fallback
}

// Call rerank endpoint
const response = await axios.post('/rerank', { query, documents });
```

**Why:** Prevents 503 errors when cross-encoder not loaded. Degradation is silent (logs warning) rather than throwing error.

## Model Options

| Model | Size | Latency | Use Case |
|-------|------|---------|----------|
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 90MB | ~100ms | Development |
| `BAAI/bge-reranker-base` | 300MB | ~200ms | **Recommended** |
| `BAAI/bge-reranker-large` | 1.3GB | ~500ms | High accuracy |

Latency for 10 documents on CPU.

### Model Discovery

**Curated list approach:**
- Hardcoded list of quality-tested models
- Displayed via `--list-reranker-models` flag
- Works offline (no API calls)
- Includes metadata (size, latency, accuracy)

**Advanced users:**
- Any HuggingFace cross-encoder model works
- Link to model hub provided for exploration
- No validation of model names (fail at runtime if invalid)

## Error Handling

### Model Not Loaded

**Situation:** `/rerank` called but `--cross-encoder` not specified at startup

**Response:** `503 Service Unavailable` with message: "Cross-encoder not loaded. Start server with --cross-encoder flag."

**Why 503:** Service is running but lacks capability. Not client error (400), not server crash (500).

### Model Load Failure

**Situation:** `--cross-encoder` specified but model download/load fails

**Response:** Service exits immediately with error message

**Why:** Fail-fast principle. User expects cross-encoder to work.

### Invalid Input

**Situation:** Missing query or malformed documents array

**Response:** `400 Bad Request` (Pydantic validation)

**Why:** Standard REST error handling.

### Graceful Degradation (Node.js)

**Situation:** RAG service down or cross-encoder unavailable

**Response:** Return original documents unchanged, log warning

**Why:** Reranking is enhancement, not requirement. Better to serve semantic results than error.

## Performance Targets

- **Latency:** < 200ms for 10 documents (base model)
- **Memory:** Acceptable overhead (< 2GB for base model)
- **Throughput:** Linear scaling with document count
- **Concurrency:** sentence-transformers handles thread safety

## Deployment

### Development
```bash
python server.py --cross-encoder BAAI/bge-reranker-base
```
Model downloads automatically (~300MB).

### Container
```dockerfile
RUN pip install sentence-transformers
RUN python -c "from sentence_transformers import CrossEncoder; CrossEncoder('BAAI/bge-reranker-base')"
```
Pre-download during build → faster startup.

### Kubernetes/OpenShift
```yaml
volumes:
  - name: models
    persistentVolumeClaim:
      claimName: huggingface-cache
env:
  - name: HF_HOME
    value: /models/huggingface
```
First pod downloads, subsequent pods use cache.

## Risks

**Large memory footprint:** Base model adds ~500MB RAM. Large model adds ~2GB.
- **Mitigation:** Document model size options, let users choose tradeoff.

**Slow startup:** Model download can take 30s-2min on first run.
- **Mitigation:** Container pre-loading, persistent volume cache.

**Concurrent request bottleneck:** CPU-bound model inference.
- **Mitigation:** Document performance characteristics, consider GPU deployment for high-load scenarios (future).

**Silent degradation:** Callers might not notice reranking isn't happening.
- **Mitigation:** Health check reports status, callers check before using.

## Migration Plan

**N/A** - This is new capability, no migration needed.

Existing deployments continue working without cross-encoder. Users opt-in by adding `--cross-encoder` flag.

## Open Questions

**None** - Implementation is straightforward given sentence-transformers library handles heavy lifting.

## Validation

**Test ranking improvement:**

1. Create collection with counter-intuitive semantic ranking
2. Query: "How do I reset my password?"
3. Documents ranked by semantic similarity (wrong order)
4. Call `/rerank` endpoint
5. Verify procedural answer moves to top

**Success criteria:**
- Cross-encoder loads without errors
- Health check reports status accurately
- `/rerank` returns scored, reordered results
- Node.js `rerank()` works end-to-end
- Graceful degradation when unavailable
- Latency within bounds (< 200ms for 10 docs with base model)

