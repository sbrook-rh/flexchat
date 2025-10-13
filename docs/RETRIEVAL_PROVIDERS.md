# Retrieval Provider System

This document explains how the retrieval provider abstraction works in the flexible chat system.

## Overview

The retrieval provider system allows the chat server to query multiple knowledge bases from different sources (vector databases, APIs, files) through a unified interface.

## Architecture

```
Chat Server (server.js)
    ↓
RetrievalService
    ↓
RetrievalProviderRegistry
    ↓
├─ ChromaDBProvider (direct to ChromaDB HTTP server)
├─ ChromaDBWrapperProvider (via Python wrapper service)
├─ MilvusProvider (future)
├─ PostgresVectorProvider (future)
└─ ElasticsearchProvider (future)
```

## How It Works

### 1. Configuration

Each knowledge base is defined in `config.json`:

```json
{
  "knowledge_bases": {
    "openshift": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "collection": "openshift_docs",
      "top_k": 3
    },
    "ansible": {
      "type": "chromadb",
      "url": "http://chromadb:8000",
      "collection": "ansible_docs",
      "embedding_provider": "openai",
      "embedding_model": "text-embedding-3-small"
    }
  }
}
```

### 2. Initialization

On startup, the `RetrievalService` initializes all knowledge bases:

```javascript
const retrievalService = new RetrievalService(aiService);
await retrievalService.initializeKnowledgeBases(config.knowledge_bases);
```

For each knowledge base:
1. Get provider class from registry based on `type`
2. Create provider instance with config
3. Validate configuration
4. Initialize provider (setup connections, health check)
5. Store in providers map

### 3. Querying

When a user query arrives:

```javascript
// In strategy detection
const results = await retrievalService.query('openshift', userQuery, { top_k: 3 });
```

The `RetrievalService`:
1. Looks up the provider by name ("openshift")
2. Calls `provider.query(text, options)`
3. Returns standardized results

### 4. Standard Result Format

All providers return results in this format:

```javascript
[
  {
    text: "The actual content/document text",
    distance: 0.15,      // Lower = more similar
    score: 0.85,         // Higher = more similar (1 - distance/2)
    metadata: { ... }    // Optional additional data
  },
  // ... more results
]
```

## Provider Types

### ChromaDBWrapperProvider

**Purpose:** Connect to a Python FastAPI service that wraps ChromaDB

**When to use:**
- Development/testing
- Simple deployments
- Don't want to run full ChromaDB server

**How it works:**
1. Sends text query to Python service
2. Python service generates embeddings via OpenAI
3. Python service queries ChromaDB persistent client
4. Returns results

**Config:**
```json
{
  "type": "chromadb-wrapper",
  "url": "http://localhost:5006",
  "collection": "my_docs",
  "top_k": 3,
  "timeout": 30000,
  "max_distance": 1.0
}
```

### ChromaDBProvider

**Purpose:** Connect directly to ChromaDB HTTP server

**When to use:**
- Production deployments
- Need horizontal scaling
- Full control over embeddings

**How it works:**
1. Generates embeddings using AIService (OpenAI, etc.)
2. Sends embedding vector to ChromaDB HTTP API
3. ChromaDB performs vector similarity search
4. Returns results

**Config:**
```json
{
  "type": "chromadb",
  "url": "http://chromadb-server:8000",
  "collection": "my_docs",
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "top_k": 3
}
```

## Key Features

### 1. Multiple Knowledge Bases

Query different knowledge bases in one config:

```json
{
  "knowledge_bases": {
    "openshift": { "type": "chromadb-wrapper", ... },
    "ansible": { "type": "chromadb-wrapper", ... },
    "rhel": { "type": "milvus", ... },
    "docs": { "type": "elasticsearch", ... }
  }
}
```

### 2. Per-KB Configuration

Each knowledge base can have its own settings:

```json
{
  "large_kb": {
    "type": "chromadb-wrapper",
    "url": "http://localhost:5006",
    "collection": "large_docs",
    "top_k": 10,           // More results for large KB
    "timeout": 60000,      // Longer timeout
    "max_distance": 0.7    // Stricter threshold
  },
  "small_kb": {
    "type": "chromadb-wrapper",
    "url": "http://localhost:5006",
    "collection": "small_docs",
    "top_k": 3,
    "timeout": 30000,
    "max_distance": 1.0
  }
}
```

### 3. Runtime Query Options

Override defaults per query:

```javascript
await retrievalService.query('openshift', userQuery, {
  top_k: 5,              // Override default
  max_distance: 0.5,     // Stricter threshold for this query
  filters: { ... }       // Provider-specific filters
});
```

### 4. Health Checking

Check all knowledge bases:

```javascript
const health = await retrievalService.checkHealth();
// Returns:
// {
//   overall: 'healthy',
//   healthyCount: 3,
//   totalCount: 3,
//   knowledgeBases: {
//     openshift: { status: 'healthy', ... },
//     ansible: { status: 'healthy', ... },
//     rhel: { status: 'healthy', ... }
//   }
// }
```

### 5. Retry Logic

Providers include automatic retry with exponential backoff:

```json
{
  "type": "chromadb-wrapper",
  "url": "http://localhost:5006",
  "retry": {
    "max_attempts": 3,
    "delay": 1000
  }
}
```

### 6. Authentication

Support for various auth methods:

```json
{
  "type": "chromadb-wrapper",
  "url": "https://api.company.com",
  "auth": {
    "type": "bearer",
    "token": "${API_TOKEN}"
  }
}
```

## Integration with Strategy Detection

The retrieval system integrates seamlessly with strategy detection:

```json
{
  "strategies": [
    {
      "name": "OPENSHIFT",
      "detection": {
        "type": "rag",
        "knowledge_base": "openshift",  // ← References KB name
        "threshold": 0.3
      },
      "response": { ... }
    }
  ]
}
```

During detection:
1. Server queries the "openshift" knowledge base
2. If distance < 0.3, strategy is detected
3. Retrieved text is passed as context to response generation
4. LLM generates response with context injected

## Adding New Providers

To add a new provider (e.g., Milvus):

### 1. Create Provider Class

```javascript
// backend/chat/retrieval-providers/providers/MilvusProvider.js
const VectorProvider = require('../base/VectorProvider');

class MilvusProvider extends VectorProvider {
  constructor(config, aiService) {
    super(config, aiService);
    this.uri = config.uri;
    this.collection = config.collection;
  }

  async vectorSearch(embedding, top_k, options) {
    // Implement Milvus-specific search
    const client = new MilvusClient(this.uri);
    const results = await client.search({
      collection_name: this.collection,
      vectors: [embedding],
      limit: top_k
    });
    return this.transformResults(results);
  }

  // Implement other required methods...
}

module.exports = MilvusProvider;
```

### 2. Register Provider

```javascript
// backend/chat/retrieval-providers/providers/index.js
const MilvusProvider = require('./MilvusProvider');

registerDefaultProviders() {
  this.register('chromadb', ChromaDBProvider);
  this.register('chromadb-wrapper', ChromaDBWrapperProvider);
  this.register('milvus', MilvusProvider);  // ← Add this
}
```

### 3. Use in Config

```json
{
  "knowledge_bases": {
    "my_kb": {
      "type": "milvus",
      "uri": "tcp://milvus-server:19530",
      "collection": "my_collection",
      "embedding_provider": "openai"
    }
  }
}
```

## Base Classes

### RetrievalProvider

Abstract base class for all providers. Must implement:
- `query(text, options)` - Query for relevant context
- `healthCheck()` - Check provider health
- `validateConfig(config)` - Validate configuration
- `getConfigSchema()` - Return JSON schema
- `initialize()` - Setup connections
- `cleanup()` - Cleanup resources

### VectorProvider

Extends `RetrievalProvider` for vector databases. Adds:
- `generateEmbeddings(text)` - Generate embeddings via AIService
- `vectorSearch(embedding, top_k, options)` - Vector similarity search
- `distanceToScore(distance, metric)` - Convert distance to score

## Benefits

1. **Flexibility** - Use different databases for different knowledge domains
2. **Configurability** - Tune settings per knowledge base
3. **Extensibility** - Easy to add new provider types
4. **Consistency** - All providers use same interface
5. **Testability** - Mock providers for testing
6. **Observability** - Health checks and logging built-in

## Examples

See `config/examples/` for:
- `chromadb-wrapper-example.json` - Using wrapper service
- `mixed-chromadb-providers.json` - Mix of wrapper and direct
- `redhat-complex.json` - Multiple knowledge bases

## Future Enhancements

- **Elasticsearch provider** - Full-text + vector search
- **Postgres+pgvector provider** - SQL database with vectors
- **Pinecone provider** - Managed cloud vector DB
- **Custom API provider** - Generic REST API wrapper
- **File-based provider** - Query local files/documents
- **Hybrid search** - Combine multiple providers
- **Caching layer** - Cache frequent queries
- **Analytics** - Track query performance and usage

