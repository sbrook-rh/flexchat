# ChromaDB Provider Comparison

## Quick Reference

| Feature | chromadb-wrapper | chromadb (direct) |
|---------|------------------|-------------------|
| **Port** | **5006** | **8000** |
| **Service** | Python FastAPI wrapper | ChromaDB HTTP server |
| **Embeddings** | Wrapper handles | Client/server config |
| **Start Command** | `python server.py` | `chroma run --port 8000` |
| **Collection Management UI** | ✅ Yes | ❌ No |
| **Dynamic Collections** | ✅ Yes | ❌ No |
| **Best For** | Development, dynamic collections | Production, fixed collections |
| **Dependency** | Python + FastAPI | ChromaDB CLI |

## Configuration Examples

### chromadb-wrapper (Port 5006)

**Fixed Collection:**
```json
{
  "type": "chromadb-wrapper",
  "url": "http://localhost:5006",
  "collection": "openshift_docs"
}
```

**Dynamic Collections (no collection specified):**
```json
{
  "type": "chromadb-wrapper",
  "url": "http://localhost:5006"
}
```

### chromadb Direct (Port 8000)

```json
{
  "type": "chromadb",
  "url": "http://localhost:8000",
  "collection": "openshift_docs"
}
```

Embedding configuration for direct ChromaDB is on the ChromaDB server or the client that indexes/queries it, not in the Flex Chat Node config.

## When to Use Each

### Use `chromadb-wrapper` when:
- 🚀 Getting started quickly
- 🛠️ Developing locally
- 📚 Users need to create collections via UI
- 🔄 Collections change frequently
- 🐍 Python is available

### Use `chromadb` (direct) when:
- 🏢 Production deployment
- 📈 Need horizontal scaling
- 🔒 Want separation between services
- ⚡ Maximum performance
- 🎯 Fixed, well-defined collections

## Port Summary

**Default Ports:**
- `5006` - Python wrapper service (`backend/rag/server.py`)
- `8000` - ChromaDB HTTP server (`chroma run`)
- `5005` - Chat server (`backend/chat/server.js`)
- `3000` - Frontend (React dev server)

**In Config Files:**
```json
{
  "knowledge_bases": {
    "wrapper_kb": {
      "url": "http://localhost:5006"  // ← Wrapper
    },
    "direct_kb": {
      "url": "http://localhost:8000"  // ← Direct ChromaDB
    }
  }
}
```

## Example Configs by Port

### Port 5006 Examples (Wrapper)
- `redhat-complex.json`
- `chromadb-wrapper-example.json`
- `multi-domain.json`

### Port 8000 Examples (Direct)
- `chromadb-direct-server.json`

### Both Ports (Mixed)
- `mixed-chromadb-providers.json`

## Common Mistakes

### ❌ Wrong: Using chromadb type with port 5006
```json
{
  "type": "chromadb",           // Wrong type!
  "url": "http://localhost:5006" // Wrapper port
}
```

### ✅ Correct: Use chromadb-wrapper for port 5006
```json
{
  "type": "chromadb-wrapper",   // Correct!
  "url": "http://localhost:5006"
}
```

### ❌ Wrong: Using chromadb-wrapper with port 8000
```json
{
  "type": "chromadb-wrapper",   // Wrong type!
  "url": "http://localhost:8000" // Direct ChromaDB port
}
```

### ✅ Correct: Use chromadb for port 8000
```json
{
  "type": "chromadb",            // Correct!
  "url": "http://localhost:8000"
}
```

## Troubleshooting

**"Connection refused on port 5006"**
- Wrapper not running
- Solution: `cd backend/rag && python server.py`

**"Connection refused on port 8000"**
- ChromaDB server not running
- Solution: `chroma run --path ./chroma_db --port 8000`

**"Collections not showing in UI"**
- Not using `chromadb-wrapper` type
- Solution: Change to `chromadb-wrapper` for dynamic collections

**"Embeddings not working" (wrapper)**
- Wrapper embedding model not loaded or collection missing `embedding_model` in metadata
- Solution: Configure embedding models in the RAG wrapper (see [CHROMADB_WRAPPER.md](CHROMADB_WRAPPER.md)); create collections with a valid `embedding_model` from the wrapper health list

