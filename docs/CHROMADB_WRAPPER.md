# ChromaDB Wrapper Service

**Version**: 2.0  
**Location**: `backend/rag/`  
**Language**: Python + FastAPI

This document explains how to set up and run the ChromaDB wrapper service.

---

## Overview

The ChromaDB wrapper is a Python FastAPI service that provides:
- Vector database storage with ChromaDB
- Multiple embedding providers (Ollama, OpenAI, Gemini)
- RESTful API for collection management
- Document upload and querying
- Multiple isolated instances (different ports/databases)

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend/rag
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file in `backend/rag/`:

```bash
# Embedding provider: ollama, openai, or gemini
EMBEDDING_PROVIDER=ollama

# Ollama configuration (if using ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# OpenAI configuration (if using openai)
# OPENAI_API_KEY=sk-...
# OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Gemini configuration (if using gemini)
# GEMINI_API_KEY=AI...
# GEMINI_EMBEDDING_MODEL=models/embedding-001
```

### 3. Start the Service

**Default** (port 5006, default chroma_db location):
```bash
python3 server.py
```

**Custom port and database**:
```bash
python3 server.py --chroma-path ./chroma_db/recipes --port 5007
```

### 4. Verify It's Running

```bash
curl http://localhost:5006/health
# Should return: {"status": "healthy"}
```

---

## Command-Line Arguments

### `--chroma-path`

Path to ChromaDB storage directory.

**Default**: `./chroma_db`

**Examples**:
```bash
# Use default location
python3 server.py

# Use custom location
python3 server.py --chroma-path ./chroma_db/recipes

# Use absolute path
python3 server.py --chroma-path /data/chromadb/tech_docs
```

**Note**: Each path is a separate ChromaDB instance with its own collections.

### `--port`

Server port number.

**Default**: `5006`

**Examples**:
```bash
# Default port
python3 server.py

# Custom port
python3 server.py --port 5007

# Different databases on different ports
python3 server.py --chroma-path ./chroma_db/recipes --port 5007 &
python3 server.py --chroma-path ./chroma_db/tech_docs --port 5008 &
```

---

## Running Multiple Instances

You can run multiple wrapper instances for different purposes:

### Example: Two Separate Databases

**Terminal 1** (recipes on port 5007):
```bash
cd backend/rag
python3 server.py --chroma-path ./chroma_db/recipes --port 5007
```

**Terminal 2** (technical docs on port 5006):
```bash
cd backend/rag
python3 server.py --chroma-path ./chroma_db/red_hat_products --port 5006
```

### Configure in Flex Chat

```json
{
  "rag_services": {
    "recipes": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5007",
      "match_threshold": 0.2
    },
    "tech_docs": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25
    }
  }
}
```

### Why Multiple Instances?

- **Different embedding models**: Each instance can use a different embedding provider
- **Isolation**: Separate databases for different domains
- **Performance**: Distribute load across instances
- **Development**: Test configurations without affecting production

---

## Environment Variables

### Embedding Provider Selection

**`EMBEDDING_PROVIDER`**

Which embedding provider to use.

**Options**: `ollama`, `openai`, `gemini`  
**Default**: `ollama`

```bash
EMBEDDING_PROVIDER=ollama
```

### Ollama Configuration

**`OLLAMA_BASE_URL`**

Ollama server endpoint.

**Default**: `http://localhost:11434`

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

**`OLLAMA_EMBEDDING_MODEL`**

Ollama embedding model name.

**Default**: `nomic-embed-text`

**Popular models**:
- `nomic-embed-text` - Good quality, fast
- `mxbai-embed-large` - Higher quality, slower
- `all-minilm` - Lightweight, fast

```bash
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### OpenAI Configuration

**`OPENAI_API_KEY`**

OpenAI API key (**required** for OpenAI).

```bash
OPENAI_API_KEY=sk-...
```

**`OPENAI_EMBEDDING_MODEL`**

OpenAI embedding model name.

**Default**: `text-embedding-ada-002`

**Options**:
- `text-embedding-ada-002` - Standard, cost-effective
- `text-embedding-3-small` - Newer, efficient
- `text-embedding-3-large` - Highest quality

```bash
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Gemini Configuration

**`GEMINI_API_KEY`**

Google Gemini API key (**required** for Gemini).

```bash
GEMINI_API_KEY=AI...
```

**`GEMINI_EMBEDDING_MODEL`**

Gemini embedding model name.

**Default**: `models/embedding-001`

```bash
GEMINI_EMBEDDING_MODEL=models/embedding-001
```

---

## API Endpoints

The wrapper service provides these endpoints:

### Health Check

**`GET /health`**

Check if service is running.

```bash
curl http://localhost:5006/health
```

Response:
```json
{
  "status": "healthy"
}
```

### List Collections

**`GET /collections`**

Get all collections in this ChromaDB instance.

```bash
curl http://localhost:5006/collections
```

Response:
```json
{
  "collections": [
    {
      "name": "recipes",
      "count": 42,
      "metadata": {
        "display_name": "Soup Recipes",
        "description": "Collection of soup recipes"
      }
    }
  ]
}
```

### Create Collection

**`POST /collection`**

Create a new collection.

```bash
curl -X POST http://localhost:5006/collection \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_collection",
    "metadata": {
      "display_name": "My Collection",
      "description": "Description here"
    }
  }'
```

### Add Documents

**`POST /collection/{name}/documents`**

Add documents to a collection.

```bash
curl -X POST http://localhost:5006/collection/recipes/documents \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "text": "Recipe: Minestrone soup is a hearty Italian vegetable soup...",
        "metadata": {
          "source": "italian_cookbook.pdf",
          "page": 42
        }
      }
    ]
  }'
```

### Query Collection

**`POST /query`**

Search for similar documents.

```bash
curl -X POST http://localhost:5006/query \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "recipes",
    "text": "vegetarian soup recipe",
    "top_k": 5
  }'
```

Response:
```json
{
  "results": [
    {
      "text": "Recipe: Minestrone soup...",
      "distance": 0.18,
      "metadata": {
        "source": "italian_cookbook.pdf",
        "page": 42
      }
    }
  ]
}
```

### Update Collection Metadata

**`PUT /collection/{name}/metadata`**

Update collection metadata.

```bash
curl -X PUT http://localhost:5006/collection/recipes/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Updated Name",
    "description": "Updated description"
  }'
```

### Delete Collection

**`DELETE /collection/{name}`**

Delete a collection and all its documents.

```bash
curl -X DELETE http://localhost:5006/collection/recipes
```

---

## Data Storage

### Directory Structure

```
backend/rag/
  ├── chroma_db/              # Default storage directory
  │   ├── recipes/            # Collection data
  │   │   ├── data_level0.bin
  │   │   ├── header.bin
  │   │   ├── length.bin
  │   │   └── link_lists.bin
  │   ├── red_hat_products/
  │   └── chroma.sqlite3      # ChromaDB metadata
  ├── server.py
  ├── requirements.txt
  └── .env
```

### Custom Paths

When using `--chroma-path`, the structure is the same:

```bash
python3 server.py --chroma-path /data/my_chromadb
```

Creates:
```
/data/my_chromadb/
  ├── collection_name/
  └── chroma.sqlite3
```

### Backup

To backup your collections:

```bash
# Stop the service first
# Then copy the entire directory
cp -r backend/rag/chroma_db /backup/chroma_db_20251019

# Or specific collection
cp -r backend/rag/chroma_db/recipes /backup/recipes_20251019
```

### Migration

To move to a different server:

```bash
# On old server
tar -czf chroma_backup.tar.gz backend/rag/chroma_db

# Transfer to new server
scp chroma_backup.tar.gz user@newserver:/path/

# On new server
tar -xzf chroma_backup.tar.gz
python3 server.py --chroma-path /path/backend/rag/chroma_db
```

---

## Embedding Consistency

**Critical**: The embedding model must be **identical** for:
1. Adding documents (indexing)
2. Querying documents (search)

### Example Configuration

**Python service** (`.env`):
```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

**Flex Chat** (`config.json`):
```json
{
  "rag_services": {
    "recipes": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006"
    }
  },
  "embedding": {
    "llm": "local",
    "model": "nomic-embed-text"
  }
}
```

**Both must use**: `nomic-embed-text` via Ollama

### Changing Embedding Models

If you need to change embedding models:

1. **Create new collection** with new name
2. **Re-index all documents** with new embedding model
3. **Update Flex Chat config** to use new collection
4. **Delete old collection** when confident

**Don't**: Change embedding model on existing collection (results will be meaningless)

---

## Troubleshooting

### "Connection refused" when starting

**Cause**: Port already in use

**Solution**:
```bash
# Check what's using the port
lsof -i :5006

# Kill the process or use different port
python3 server.py --port 5007
```

### "OPENAI_API_KEY is not set"

**Cause**: Missing API key when using OpenAI embeddings

**Solution**:
```bash
# Add to .env file
echo "OPENAI_API_KEY=sk-..." >> .env

# Or set in environment
export OPENAI_API_KEY=sk-...
python3 server.py
```

### "Ollama model not found"

**Cause**: Embedding model not pulled in Ollama

**Solution**:
```bash
# Pull the model
ollama pull nomic-embed-text

# Verify it's available
ollama list
```

### High memory usage

**Cause**: Large collections or many collections

**Solutions**:
- Use smaller embedding models
- Split collections across multiple instances
- Increase server RAM
- Reduce collection sizes

### Slow queries

**Causes**: Large collections, slow embedding generation

**Solutions**:
- Use faster embedding models (nomic-embed-text vs mxbai-embed-large)
- Use local embeddings (Ollama) instead of API calls
- Reduce `top_k` in queries
- Add indexes (ChromaDB handles this automatically)

---

## Development Tips

### Logging

The server logs all operations to console:

```
🔧 Embedding provider: ollama
✅ Ollama configured at http://localhost:11434 with model: nomic-embed-text
🚀 Starting server on port 5006...
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:5006
```

### Testing

Test endpoints with curl:

```bash
# Health check
curl http://localhost:5006/health

# List collections
curl http://localhost:5006/collections

# Query
curl -X POST http://localhost:5006/query \
  -H "Content-Type: application/json" \
  -d '{"collection": "test", "text": "hello", "top_k": 3}'
```

### Auto-Reload (Development)

For development with auto-reload on code changes:

```bash
# Install watchdog
pip install watchdog

# Run with reload
uvicorn server:app --reload --port 5006
```

**Note**: You'll lose command-line argument parsing with this method. Better to restart manually during development.

---

## Production Deployment

### Using systemd (Linux)

Create `/etc/systemd/system/chromadb-wrapper-recipes.service`:

```ini
[Unit]
Description=ChromaDB Wrapper - Recipes
After=network.target

[Service]
Type=simple
User=flexchat
WorkingDirectory=/opt/flex-chat/backend/rag
Environment="PATH=/opt/flex-chat/venv/bin"
ExecStart=/opt/flex-chat/venv/bin/python3 server.py --chroma-path /data/chromadb/recipes --port 5007
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl enable chromadb-wrapper-recipes
sudo systemctl start chromadb-wrapper-recipes
sudo systemctl status chromadb-wrapper-recipes
```

### Using Docker

Create `Dockerfile` in `backend/rag/`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY .env .

EXPOSE 5006

CMD ["python3", "server.py", "--chroma-path", "/data/chromadb"]
```

Build and run:
```bash
docker build -t chromadb-wrapper .
docker run -d \
  -p 5006:5006 \
  -v /data/chromadb:/data/chromadb \
  -e EMBEDDING_PROVIDER=ollama \
  chromadb-wrapper
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name rag.example.com;

    location / {
        proxy_pass http://localhost:5006;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Related Documentation

- **[RAG_SERVICES.md](RAG_SERVICES.md)**: RAG services configuration in Flex Chat
- **[CONFIGURATION.md](CONFIGURATION.md)**: Complete Flex Chat configuration
- **[COLLECTION_MANAGEMENT.md](COLLECTION_MANAGEMENT.md)**: Managing collections via UI

---

## Version History

- **v2.0** (2025-10-19): Documented for v2.0, clarified command-line usage
- **v1.x**: Undocumented

