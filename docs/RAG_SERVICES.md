# RAG Services Guide

**Version**: 2.0  
**Last Updated**: October 19, 2025  
**Formerly**: RETRIEVAL_PROVIDERS.md

This document explains how RAG (Retrieval Augmented Generation) services work in Flex Chat and how to configure them.

**See Also**: [CHROMADB_WRAPPER.md](CHROMADB_WRAPPER.md) for detailed ChromaDB Python service documentation.

---

## Table of Contents

1. [Overview](#overview)
2. [How RAG Services Work](#how-rag-services-work)
3. [Configuration](#configuration)
4. [Choosing a RAG Provider](#choosing-a-rag-provider)
5. [Supported Providers](#supported-providers)
6. [ChromaDB Wrapper (Recommended)](#chromadb-wrapper-recommended)
7. [Provider Architecture](#provider-architecture)
8. [Adding New Providers](#adding-new-providers)
9. [Troubleshooting](#troubleshooting)

---

## Overview

RAG services allow Flex Chat to retrieve relevant context from vector databases before generating responses. This enables:

- **Domain-specific knowledge**: Answer questions from your own documents
- **Accurate responses**: Ground answers in factual content
- **Source transparency**: Know which documents informed the response
- **Dynamic collections**: Create and manage knowledge bases through the UI

### What is a RAG Service?

A **RAG service** is a vector database backend that:
1. Stores documents as embeddings
2. Performs semantic search given a query
3. Returns relevant documents with distance scores
4. Supports collection management (create, delete, add documents)

---

## How RAG Services Work

### The Flow

```
User Query: "How do I make minestrone?"
    ↓
[Phase 1: Topic Detection]
    Topic: "minestrone soup recipe"
    ↓
[Phase 2: RAG Collection]
    Query RAG service with topic
    ↓
RAG Service (ChromaDB):
    - Convert topic to embedding
    - Search collection(s)
    - Return documents with distances
    ↓
[Threshold Classification]
    Distance: 0.18
    < match_threshold (0.25) → MATCH
    ↓
[Profile Building]
    Profile with RAG documents
    ↓
[Response Generation]
    LLM uses documents as context
```

### Distance-Based Matching

RAG services return a **distance** score for each result:
- **Lower distance = more similar**
- Distance typically ranges from 0.0 (identical) to 2.0 (completely different)

Flex Chat classifies results using thresholds:
- **`distance < match_threshold`**: **MATCH** - High confidence
- **`match_threshold ≤ distance < partial_threshold`**: **PARTIAL** - Candidate
- **`distance ≥ partial_threshold`**: **NONE** - Not relevant

---

## Configuration

RAG services are configured in the `rag_services` section of `config.json`.

### Basic Configuration

```json
{
  "rag_services": {
    "recipes": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25,
      "partial_threshold": 0.5
    }
  }
}
```

### Configuration Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `provider` | Yes | - | Provider type (currently only `chromadb-wrapper`) |
| `url` | Yes | - | RAG service endpoint URL |
| `match_threshold` | No | 0.25 | Distance threshold for confident match |
| `partial_threshold` | No | 0.5 | Distance threshold for partial match |
| `intent_identifier` | No | service name | Intent name when match found |

Embedding models are configured in the RAG wrapper and per collection (see [CHROMADB_WRAPPER.md](CHROMADB_WRAPPER.md) and [COLLECTION_MANAGEMENT.md](COLLECTION_MANAGEMENT.md)); they are not set in `rag_services` in the Node config.

### Thresholds Explained

**Match Threshold** (`match_threshold`):
- Results below this distance are considered confident matches
- Typically: 0.15 - 0.3
- Lower = stricter (fewer false positives)
- When matched: Skip intent detection, use result immediately

**Partial Threshold** (`partial_threshold`):
- Results below this but above match_threshold are candidates
- Typically: 0.4 - 0.6
- When matched: Perform intent detection with candidates as context
- Above this: Result ignored (not relevant)

**Choosing Values**:
- Start with defaults (0.25 / 0.5)
- Too many false positives? Lower thresholds
- Missing relevant results? Raise thresholds
- Test with sample queries and adjust

---

## Choosing a RAG Provider

Different RAG providers are optimized for different data structures and use cases.

### Data Structure Considerations

**Simple Text-Based (FAQ / Q&A Format):**
- **Best Provider**: ChromaDB Wrapper
- **Data Structure**: Single text field per entry with optional metadata
- **Example**: `{"text": "How do I reset password? Go to Settings...", "metadata": {...}}`
- **Use Cases**: Documentation, FAQs, articles, knowledge bases

**Structured Multi-Field Data:**
- **Best Provider**: Milvus (planned), Weaviate (planned), Qdrant (planned)
- **Data Structure**: Multiple fields with schema enforcement
- **Example** (Recipe Database):
  ```json
  {
    "id": "dessert-001",
    "title": "Sticky Toffee Pudding",
    "region": "British Classics",
    "ingredients": [
      "200g dates, chopped",
      "250ml boiling water",
      "100g butter",
      "150g brown sugar"
    ],
    "instructions": "### Sticky Toffee Pudding\n\nA rich British dessert...\n\n**Method:** Soak dates in hot water, mix with creamed butter and sugar..."
  }
  ```
- **Technical Considerations**:
  - **Chunking**: 512-1024 token chunks for long instructions field
  - **Metadata**: Index `title` and `region` as filterable fields
  - **ID Strategy**: Auto-generate UUID or accept user-provided IDs
  - **Embeddings**: Rich models like `text-embedding-3-large` or `instructor-xl` work well
  - **Markdown**: Instructions can use markdown for structure cues (`### Headers`, bullet points)
  - **Ingestion**: New wrapper service must transform/normalize structured data before indexing
- **Use Cases**: Recipe databases, product catalogs, structured knowledge graphs
- **Query Examples**: 
  - "British desserts" (filter by region)
  - "Quick recipes" (filter by prep_time if indexed)
  - Semantic search on instructions while filtering by structured fields

### Provider Comparison

| Provider | Data Complexity | Best For | Structure | Management |
|----------|----------------|----------|-----------|------------|
| **ChromaDB Wrapper** | Simple | FAQs, Docs | Text-focused | UI-driven, dynamic |
| **Milvus** (planned) | Complex | Recipes, Products | Multi-field | Schema-based, structured |
| **Weaviate** (planned) | Moderate | Mixed content | Flexible | Auto-schema |
| **Qdrant** (planned) | Moderate | General | Flexible | Payload-based |

**Current Recommendation**: Use ChromaDB wrapper for most use cases. It handles:
- Dynamic collection creation through UI
- Simple document upload
- Text-based knowledge bases
- FAQs and Q&A pairs

**Future**: When Milvus support is added, use it for:
- Structured data with multiple searchable fields
- Complex filtering (e.g., "British desserts with < 30 min prep")
- Schema-enforced data consistency
- High-scale production deployments

---

## Supported Providers

### Current

- **`chromadb-wrapper`**: ChromaDB via Python FastAPI wrapper ✅
  - **Recommended for**: FAQs, documentation, simple Q&A format
  - **Data model**: Text documents with optional metadata

### Planned

- **`chromadb`**: Direct ChromaDB HTTP client
- **`milvus`**: Milvus vector database
  - **Recommended for**: Structured data (recipes, products, catalogs)
  - **Data model**: Multi-field schema with typed fields
- **`pgvector`**: PostgreSQL with pgvector extension
- **`pinecone`**: Pinecone cloud vector database
- **`qdrant`**: Qdrant vector database
- **`weaviate`**: Weaviate vector database

---

## ChromaDB Wrapper (Recommended)

The ChromaDB wrapper is a Python FastAPI service that provides:
- Dynamic collection management
- Document upload and deletion
- Metadata storage and updates
- Multiple embedding providers
- Collection listing and info

### Architecture

```
Flex Chat (Node.js)
    ↓
ChromaDBWrapperProvider
    ↓ HTTP
Python FastAPI Service (backend/rag/server.py)
    ↓
ChromaDB
    ↓
Persistent Storage (chroma_db/)
```

### Starting the Service

```bash
cd backend/rag
pip install -r requirements.txt

# Default (port 5006, default chroma_db location)
python3 server.py

# Custom port and database location
python3 server.py --chroma-path ./chroma_db/recipes --port 5007
```

**Note**: See **[CHROMADB_WRAPPER.md](CHROMADB_WRAPPER.md)** for complete setup and configuration guide.

### API Endpoints

The Python service provides these endpoints:

**Collections:**
- `GET /collections` - List all collections
- `POST /collection` - Create collection
- `DELETE /collection/{name}` - Delete collection
- `PUT /collection/{name}/metadata` - Update metadata

**Documents:**
- `POST /collection/{name}/documents` - Add documents
- `POST /query` - Query for similar documents

**Health:**
- `GET /health` - Service health check

### Configuration

**In Flex Chat config:**
```json
{
  "rag_services": {
    "my_docs": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25
    }
  }
}
```

**Python service environment** (`.env`):
```
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://localhost:11434
```

Or for OpenAI embeddings:
```
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_API_KEY=sk-...
```

### Embedding Consistency

**Critical**: The embedding model used for indexing (adding documents) and for querying (searching) must be **identical** for each collection. Mismatched embeddings produce meaningless results.

**How it works**: The RAG wrapper loads embedding models (e.g. via `.env` or `--embeddings-config`). Each collection stores an `embedding_model` in its metadata. The wrapper uses that model for both document ingestion and query embedding for that collection.

### Data Persistence

ChromaDB stores data in `backend/rag/chroma_db/`:
```
chroma_db/
  ├── collection_name/
  │   ├── data_level0.bin
  │   ├── header.bin
  │   ├── length.bin
  │   └── link_lists.bin
  └── chroma.sqlite3
```

**Backup**: Copy entire `chroma_db/` directory

**Migration**: Move `chroma_db/` to new server

---

## Provider Architecture

### Provider Interface

All RAG providers implement the `RetrievalProvider` base class:

```javascript
class RetrievalProvider {
  // Initialize provider
  async initialize() { ... }
  
  // Query for similar documents
  async query(collectionName, queryText, options = {}) { ... }
  
  // Create collection
  async createCollection(collectionName, metadata = {}) { ... }
  
  // Delete collection
  async deleteCollection(collectionName) { ... }
  
  // Add documents to collection
  async addDocuments(collectionName, documents) { ... }
  
  // Update collection metadata
  async updateMetadata(collectionName, metadata) { ... }
  
  // List all collections
  async listCollections() { ... }
  
  // Validate configuration
  validateConfig(config) { ... }
  
  // Health check
  async healthCheck() { ... }
}
```

### Standard Query Response

All providers return results in this format:

```javascript
[
  {
    id: "doc-123",                    // Document ID
    text: "Document content...",      // Full text content
    distance: 0.18,                   // Similarity distance (lower = more similar)
    metadata: {                       // Optional metadata
      source: "recipe.pdf",
      page: 5,
      title: "Minestrone Recipe"
    }
  },
  // ... more results
]
```

### Provider Registry

Providers are registered in `backend/chat/retrieval-providers/providers/index.js`:

```javascript
class RetrievalProviderRegistry {
  registerDefaultProviders() {
    this.register('chromadb-wrapper', ChromaDBWrapperProvider);
    // Future providers registered here
  }
}
```

---

## Adding New Providers

### Step 1: Create Provider Class

Create a new file in `backend/chat/retrieval-providers/providers/`:

```javascript
// MyVectorDBProvider.js
const RetrievalProvider = require('../base/RetrievalProvider');
const axios = require('axios');

class MyVectorDBProvider extends RetrievalProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.url;
    this.apiKey = config.api_key;
  }

  async initialize() {
    // Setup connections, validate config
    const health = await this.healthCheck();
    if (!health.ok) {
      throw new Error('Failed to connect to MyVectorDB');
    }
  }

  async query(collectionName, queryText, options = {}) {
    // Convert to your provider's API format
    const response = await axios.post(`${this.baseUrl}/search`, {
      collection: collectionName,
      query: queryText,
      top_k: options.top_k || 5
    });
    
    // Convert to standard format
    return response.data.results.map(r => ({
      id: r.id,
      text: r.content,
      distance: r.distance,
      metadata: r.metadata
    }));
  }

  async createCollection(collectionName, metadata) {
    // Implement collection creation
  }

  // ... implement other methods
  
  validateConfig(config) {
    const errors = [];
    if (!config.url) errors.push('url is required');
    if (!config.api_key) errors.push('api_key is required');
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async healthCheck() {
    try {
      await axios.get(`${this.baseUrl}/health`);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
}

module.exports = MyVectorDBProvider;
```

### Step 2: Register Provider

Add to `backend/chat/retrieval-providers/providers/index.js`:

```javascript
const MyVectorDBProvider = require('./MyVectorDBProvider');

class RetrievalProviderRegistry {
  registerDefaultProviders() {
    this.register('chromadb-wrapper', ChromaDBWrapperProvider);
    this.register('myvectordb', MyVectorDBProvider);  // Add this
  }
}

module.exports = {
  RetrievalProviderRegistry,
  registry,
  ChromaDBWrapperProvider,
  MyVectorDBProvider  // Export this
};
```

### Step 3: Configure in config.json

```json
{
  "rag_services": {
    "my_knowledge": {
      "provider": "myvectordb",
      "url": "https://api.myvectordb.com",
      "api_key": "${MYVECTORDB_API_KEY}",
      "match_threshold": 0.3
    }
  }
}
```

### Step 4: Test

```bash
npm start
# Check logs for successful initialization
```

---

## Troubleshooting

### "Failed to initialize RAG service"

**Causes:**
- Service not running
- Wrong URL
- Network connectivity issues

**Solutions:**
```bash
# Check if service is running
curl http://localhost:5006/health

# Check logs
cd backend/rag
uvicorn server:app --reload --port 5006

# Verify URL in config
cat config/config.json | grep -A5 rag_services
```

### "No results found" but documents exist

**Causes:**
- Wrong embedding model
- Collection doesn't exist
- Documents not added
- Query too specific

**Solutions:**
```bash
# List collections
curl http://localhost:5006/collections

# Check collection has documents
# (Should show count > 0)

# Verify embedding model matches
# In Python service .env and collection metadata (embedding_model)
```

### High distances (> 0.5) for relevant queries

**Causes:**
- Embedding model mismatch
- Poor quality embeddings
- Documents don't match query style

**Solutions:**
1. **Check embedding consistency**: Indexing and querying must use same model
2. **Try better embedding model**: `text-embedding-3-large` > `text-embedding-ada-002`
3. **Improve document quality**: More context, better chunking
4. **Adjust thresholds**: Raise partial_threshold if needed

### Collections not showing in UI

**Causes:**
- Service not configured in `rag_services`
- Service health check failing
- Frontend can't reach backend

**Solutions:**
```bash
# Check backend can reach RAG service
curl http://localhost:5005/api/collections

# Check RAG service directly
curl http://localhost:5006/collections

# Verify config
cat config/config.json | jq '.rag_services'
```

### "Embedding model not found"

**Causes:**
- Model not available in provider
- Wrong model name
- Provider not initialized

**Solutions:**

**For Ollama:**
```bash
# List available models
ollama list

# Pull embedding model
ollama pull nomic-embed-text
```

**For OpenAI:**
- Verify model name: `text-embedding-ada-002` or `text-embedding-3-small`
- Check API key is valid

---

## Best Practices

### Embeddings

- ✅ **Do**: Use same embedding model for indexing and querying
- ✅ **Do**: Choose model based on language and domain
- ✅ **Do**: Use local models (Ollama) for privacy and cost
- ❌ **Don't**: Mix embedding models (produces meaningless results)
- ❌ **Don't**: Change embedding model without re-indexing

### Thresholds

- ✅ **Do**: Start with defaults (0.25 / 0.5)
- ✅ **Do**: Test with representative queries
- ✅ **Do**: Adjust based on false positive/negative rate
- ❌ **Don't**: Set thresholds too loose (many irrelevant results)
- ❌ **Don't**: Set thresholds too strict (miss relevant results)

### Collections

- ✅ **Do**: Organize by domain/topic (recipes, tech_docs, etc.)
- ✅ **Do**: Use descriptive collection names
- ✅ **Do**: Add meaningful metadata (source, date, author)
- ❌ **Don't**: Mix unrelated content in one collection
- ❌ **Don't**: Create too many tiny collections (hard to manage)

### Performance

- ✅ **Do**: Use local embeddings when possible (faster)
- ✅ **Do**: Limit `top_k` to reasonable number (3-5)
- ✅ **Do**: Use appropriate thresholds (reduce unnecessary processing)
- ❌ **Don't**: Query all collections for every request (use service selection)

---

## Related Documentation

- **[CHROMADB_WRAPPER.md](CHROMADB_WRAPPER.md)**: Complete ChromaDB Python service guide
- **[CONFIGURATION.md](CONFIGURATION.md)**: Complete configuration reference
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System architecture and RAG flow
- **[COLLECTION_MANAGEMENT.md](COLLECTION_MANAGEMENT.md)**: Managing collections via UI

---

## Version History

- **v2.0** (2025-10-19): Renamed from RETRIEVAL_PROVIDERS.md, updated for `rag_services`
- **v1.x**: Used `knowledge_bases` terminology

