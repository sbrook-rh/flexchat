# ChromaDB Wrapper Service

A Python FastAPI service that provides a flexible HTTP interface to ChromaDB with multi-provider embedding support and persistent storage.

## Overview

The wrapper service acts as an intermediary between the Node.js chat server and ChromaDB, enabling:
- **Multi-provider embeddings**: OpenAI, Google Gemini, or Ollama
- **Dynamic collection management**: Create and manage collections via API
- **Persistent storage**: ChromaDB data stored locally in `chroma_db/`
- **Collection metadata**: Store custom settings (system prompts, thresholds) per collection
- **Embedding compatibility**: Automatically uses the same embedding provider/model for queries as was used during ingestion

## Quick Start

### 1. Install Dependencies

```bash
cd backend/rag
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `env.example` to `.env` and configure your embedding provider:

```bash
cp env.example .env
```

**For Ollama (local):**
```bash
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://localhost:11434
```

**For Gemini:**
```bash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=text-embedding-004
GEMINI_API_KEY=your_api_key_here
```

**For OpenAI:**
```bash
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=your_api_key_here
```

### 3. Start the Service

```bash
python server.py
```

The service will start on `http://localhost:5006`.

Or use the project-wide start script from the root:
```bash
./start.sh
```

## API Endpoints

### Collection Management

#### List Collections
```bash
GET /collections
```

Returns all collections with their document counts and metadata.

#### Get Collection Info
```bash
GET /collections/{name}
```

Returns details about a specific collection including metadata.

#### Create Collection
```bash
POST /collections
Content-Type: application/json

{
  "name": "my-collection",
  "metadata": {
    "description": "Description for LLM detection",
    "system_prompt": "Custom prompt for responses",
    "threshold": 0.3,
    "fallback_threshold": 0.5,
    "max_tokens": 800,
    "temperature": 0.7
  },
  "embedding_provider": "ollama",    // Optional: override default
  "embedding_model": "nomic-embed-text"  // Optional: override default
}
```

#### Delete Collection
```bash
DELETE /collections/{name}
```

### Document Management

#### Add Documents
```bash
POST /collections/{name}/documents
Content-Type: application/json

{
  "documents": [
    {
      "text": "Document content here",
      "metadata": {
        "source": "manual",
        "title": "Document Title"
      }
    }
  ],
  "embedding_provider": "ollama",    // Optional: override default
  "embedding_model": "nomic-embed-text"  // Optional: override default
}
```

### Query

#### Search Collection
```bash
POST /query
Content-Type: application/json

{
  "query": "What is InstructLab?",
  "collection": "openshift-ai",
  "top_k": 3
}
```

Returns relevant documents with distance scores.

## Embedding Configuration

The service uses a **hybrid configuration approach**:

1. **Node.js config** (`config/config.json`): Specifies which provider/model to use
2. **Python `.env`**: Contains API keys and connection details
3. **Collection metadata**: Stores the provider/model used for each collection

When querying, the service automatically uses the same embedding provider/model that was used when documents were added, ensuring compatibility.

## Storage

- **Database**: `chroma_db/` directory (persistent, excluded from git)
- **Distance metric**: Cosine distance (optimal for normalized text embeddings)
- **Metadata**: Stored per-collection including embedding provider/model

## Integration

The wrapper is designed to work with the Node.js chat server's `ChromaDBWrapperProvider`:

```javascript
// config/config.json
{
  "knowledge_bases": {
    "dynamic": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "embedding_provider": "ollama"
    }
  }
}
```

See `config/examples/rag-wrapper-ollama.json` for complete configuration examples.

## Files

- **`server.py`** - Main FastAPI service
- **`requirements.txt`** - Python dependencies
- **`env.example`** - Environment variable template
- **`chroma_db/`** - ChromaDB persistent storage (created automatically)
- **`.python-version`** - Pyenv version file (if using pyenv)

## Troubleshooting

### "Collection not found" errors
- The collection may not exist yet - create it via the UI or API
- Check that the collection name matches exactly

### Embedding errors
- Verify your API key is set correctly in `.env`
- For Ollama: ensure the model is pulled (`ollama pull nomic-embed-text`)
- Check that the embedding provider in `.env` matches your `config.json`

### Distance scores seem wrong
- Collections created with different embedding models are incompatible
- Delete and recreate the collection with the correct model
- Verify the `.env` file has the same model as your main config

For more troubleshooting, see the main project `TROUBLESHOOTING.md`.

## Development

The service is built with:
- **FastAPI**: Modern Python web framework
- **ChromaDB**: Vector database for embeddings
- **Multiple providers**: OpenAI, Gemini, Ollama support

For detailed architecture and implementation notes, see `docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md`.
