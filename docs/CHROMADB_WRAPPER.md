# ChromaDB Wrapper Service

**Version**: 2.0  
**Location**: `backend/rag/`  
**Language**: Python + FastAPI

This document explains how to set up and run the ChromaDB wrapper service.

---

## Overview

The ChromaDB wrapper is a Python FastAPI service that provides:
- Vector database storage with ChromaDB
- Embedding models loaded from a YAML config (HuggingFace or local paths)
- Optional cross-encoder reranking for relevance
- RESTful API for collection management, document upload, and querying
- Multiple isolated instances (different ports/databases)

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend/rag
pip install -r requirements.txt
```

### 2. Embedding Models (Required)

Embedding models are configured via a **YAML file** and passed with `--embeddings-config`. The server will not start without it. Example configs in this repo: `embeddings-fast.yml`, `embeddings-standard.yml`, `embeddings.yml.example`.

Copy or edit one, then pass it when starting:

```bash
python server.py --embeddings-config embeddings-fast.yml
```

### 3. Start the Service

**Minimal** (default port 5006, default `./chroma_db`):
```bash
python server.py --embeddings-config embeddings-fast.yml
```

**Typical** (custom path, port, cross-encoder reranker):
```bash
python server.py --chroma-path chroma_db/cooking --port 5007 \
  --cross-encoder cross-encoder/ms-marco-MiniLM-L-6-v2 \
  --embeddings-config embeddings-fast.yml
```

**All options:** run `python server.py --help`:
- `--chroma-path` — ChromaDB storage directory (default: `./chroma_db`)
- `--port` — Server port (default: 5006)
- `--cross-encoder` — HuggingFace cross-encoder model for reranking (optional)
- `--cross-encoder-path` — Local path to cross-encoder (overrides `--cross-encoder`)
- `--embeddings-config` — Path to embeddings YAML (required)
- `--list-reranker-models` — List suggested reranker models and exit
- `--download-models` — Download embedding models from config and exit (no server)

### 4. Verify It's Running

```bash
curl http://localhost:5007/health
# Returns status, collection count, and loaded embedding_models when present
```

---

## Command-Line Arguments

Run `python server.py --help` for the full list. Summary:

| Argument | Default | Description |
|----------|---------|-------------|
| `--chroma-path` | `./chroma_db` | Path to ChromaDB storage directory (each path is a separate instance). |
| `--port` | `5006` | Server port. |
| `--embeddings-config` | *(required)* | Path to YAML file defining embedding models (e.g. `embeddings-fast.yml`). |
| `--cross-encoder` | — | HuggingFace model name for reranking (e.g. `cross-encoder/ms-marco-MiniLM-L-6-v2`, `BAAI/bge-reranker-base`). |
| `--cross-encoder-path` | — | Local path to cross-encoder model (overrides `--cross-encoder`). |
| `--list-reranker-models` | — | List suggested reranker models and exit. |
| `--download-models` | — | Download embedding models from config and exit (no server start). |

**Examples**:
```bash
# Custom path and port
python server.py --embeddings-config embeddings-fast.yml --chroma-path ./chroma_db/recipes --port 5007

# With cross-encoder; pre-download models only
python server.py --download-models --embeddings-config embeddings-fast.yml
python server.py --chroma-path chroma_db/cooking --port 5007 \
  --cross-encoder cross-encoder/ms-marco-MiniLM-L-6-v2 --embeddings-config embeddings-fast.yml
```

---

## Embedding Models (YAML Config)

The file passed to `--embeddings-config` defines which models the wrapper loads. Each entry has an `id` (alias used in collection metadata and health) and a `path` (HuggingFace model ID or local path). Example:

```yaml
embeddings:
  - id: minilm
    path: sentence-transformers/all-MiniLM-L6-v2
  - id: nomic
    path: nomic-ai/nomic-embed-text-v1
```

See `embeddings-fast.yml`, `embeddings-standard.yml`, and `embeddings.yml.example` in `backend/rag/`. Models are downloaded from HuggingFace on first use and cached; use `--download-models` to pre-download without starting the server.

---

## Optional Environment Variables

You can override or supply config via environment variables instead of CLI:

- **`EMBEDDINGS_CONFIG`** — Path to embeddings YAML (if not using `--embeddings-config`).
- **`CROSS_ENCODER_MODEL`** — HuggingFace cross-encoder model name.
- **`CROSS_ENCODER_PATH`** — Local path to cross-encoder model.

Example: `EMBEDDINGS_CONFIG=embeddings-fast.yml python server.py --port 5007`

See `env.example` in `backend/rag/` for a template. No `.env` is required for embedding provider/model; those are defined in the YAML.

---

## Running Multiple Instances

Run multiple wrapper instances for different databases or ports. Each must have its own `--chroma-path` and `--port`; each can use the same or a different `--embeddings-config`.

**Terminal 1** (recipes on port 5007):
```bash
cd backend/rag
python server.py --chroma-path ./chroma_db/recipes --port 5007 \
  --embeddings-config embeddings-fast.yml
```

**Terminal 2** (technical docs on port 5006):
```bash
cd backend/rag
python server.py --chroma-path ./chroma_db/red_hat_products --port 5006 \
  --embeddings-config embeddings-fast.yml
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

- **Isolation**: Separate databases for different domains
- **Performance**: Distribute load across instances
- **Different embedding configs**: Each instance can use a different `--embeddings-config` if needed
- **Development**: Test configurations without affecting production

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

## Cross-Encoder Reranking (Optional)

The wrapper service supports optional cross-encoder reranking for improved relevance scoring. This is **infrastructure capability** only - features must explicitly call the `/rerank` endpoint.

### Enabling Cross-Encoder

**List available models**:
```bash
python server.py --embeddings-config embeddings-fast.yml --list-reranker-models
```

Output:
```
📋 Available Cross-Encoder Reranking Models:

Development/Testing:
  Model: cross-encoder/ms-marco-MiniLM-L-6-v2
  Size: 90MB  |  Latency: ~100ms (10 docs, CPU)  |  Accuracy: Good

Production (recommended):
  Model: BAAI/bge-reranker-base
  Size: 300MB  |  Latency: ~200ms (10 docs, CPU)  |  Accuracy: Excellent

High-accuracy requirements:
  Model: BAAI/bge-reranker-large
  Size: 1.3GB  |  Latency: ~500ms (10 docs, CPU)  |  Accuracy: Best
```

**Start with cross-encoder from HuggingFace**:
```bash
python server.py --embeddings-config embeddings-fast.yml --cross-encoder BAAI/bge-reranker-base
```

**Start with local cross-encoder model**:
```bash
python server.py --embeddings-config embeddings-fast.yml --cross-encoder-path /models/bge-reranker-base
```

**Using environment variables** (optional override for cross-encoder):
```bash
export CROSS_ENCODER_MODEL=BAAI/bge-reranker-base
python server.py --embeddings-config embeddings-fast.yml
```

### Command-Line Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--cross-encoder` | HuggingFace model name | `--cross-encoder BAAI/bge-reranker-base` |
| `--cross-encoder-path` | Local model path (overrides `--cross-encoder`) | `--cross-encoder-path /models/bge-reranker` |
| `--list-reranker-models` | Display recommended models and exit | `--list-reranker-models` |

### Model Download Behavior

**First run** (HuggingFace model):
```bash
python server.py --embeddings-config embeddings-fast.yml --cross-encoder cross-encoder/ms-marco-MiniLM-L-6-v2
```

Output:
```
🔄 Connecting to ChromaDB at ./chroma_db...
✅ ChromaDB initialized.
🔄 Loading cross-encoder model: cross-encoder/ms-marco-MiniLM-L-6-v2
Downloading: 100% |██████████| 90.9M/90.9M [00:12<00:00, 7.36MB/s]
✅ Cross-encoder loaded: cross-encoder/ms-marco-MiniLM-L-6-v2
🚀 Starting server on port 5006...
```

**Subsequent runs**:
- Model cached in `~/.cache/huggingface/hub/`
- Loads instantly from cache
- No network required after first download

**Fail-fast behavior**:
- If model specified but fails to load → service exits immediately
- If no model specified → service runs without reranking capability

### Health Check with Cross-Encoder

```bash
curl http://localhost:5006/health | jq
```

Without cross-encoder:
```json
{
  "status": "healthy",
  "collections_count": 2
}
```

With cross-encoder loaded:
```json
{
  "status": "healthy",
  "collections_count": 2,
  "cross_encoder": {
    "model": "BAAI/bge-reranker-base",
    "status": "loaded"
  }
}
```

### Rerank Endpoint

**`POST /rerank`**

Rerank documents using cross-encoder model.

```bash
curl -X POST http://localhost:5006/rerank \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I configure pod security?",
    "documents": [
      {
        "id": "doc1",
        "text": "Kubernetes networking options..."
      },
      {
        "id": "doc2",
        "text": "To configure pod security standards, use pod-security admission controller..."
      }
    ],
    "top_k": 2
  }'
```

Response:
```json
{
  "reranked": [
    {
      "id": "doc2",
      "score": 8.186,
      "original_rank": 2
    },
    {
      "id": "doc1",
      "score": -3.762,
      "original_rank": 1
    }
  ]
}
```

**Error response** (cross-encoder not loaded):
```json
{
  "detail": "Cross-encoder not loaded. Start server with --cross-encoder flag."
}
```
HTTP status: 503

### Performance Characteristics

| Model | Size | Memory | Latency (10 docs, CPU) | Throughput |
|-------|------|--------|------------------------|------------|
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 90MB | ~500MB | ~100ms | ~10 req/s |
| `BAAI/bge-reranker-base` | 300MB | ~800MB | ~200ms | ~5 req/s |
| `BAAI/bge-reranker-large` | 1.3GB | ~2GB | ~500ms | ~2 req/s |

**Notes**:
- Latency scales linearly with document count
- GPU deployment significantly improves throughput (10-100x)
- Concurrent requests are serialized (CPU-bound)
- Memory overhead is per-instance (not per-request)

### Production Deployment

#### Docker with Cross-Encoder

**Option 1: Download at runtime**

`Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY embeddings-fast.yml .

EXPOSE 5006

# Model downloads on first run
CMD ["python3", "server.py", \
     "--embeddings-config", "embeddings-fast.yml", \
     "--chroma-path", "/data/chromadb", \
     "--cross-encoder", "BAAI/bge-reranker-base"]
```

Build and run:
```bash
docker build -t chromadb-wrapper .
docker run -d \
  -p 5006:5006 \
  -v /data/chromadb:/data/chromadb \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  chromadb-wrapper
```

**Volume mount** for HuggingFace cache:
- Persists model downloads across container restarts
- Shared cache for multiple containers
- Faster startup after first run

**Option 2: Pre-download during build** (recommended)

`Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download cross-encoder model
RUN python3 -c "from sentence_transformers import CrossEncoder; CrossEncoder('BAAI/bge-reranker-base')"

COPY server.py .
COPY embeddings-fast.yml .

EXPOSE 5006

CMD ["python3", "server.py", \
     "--embeddings-config", "embeddings-fast.yml", \
     "--chroma-path", "/data/chromadb", \
     "--cross-encoder", "BAAI/bge-reranker-base"]
```

**Benefits**:
- Faster startup (no download wait)
- Works in airgapped environments
- Image size increases by model size

#### Kubernetes/OpenShift Deployment

**Option 1: Shared cache volume (multi-pod)**

`deployment.yaml`:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: huggingface-cache
spec:
  accessModes:
    - ReadWriteMany  # Multiple pods can read
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chromadb-wrapper
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: chromadb-wrapper
        image: chromadb-wrapper:latest
        args:
          - "--cross-encoder"
          - "BAAI/bge-reranker-base"
        volumeMounts:
          - name: huggingface-cache
            mountPath: /root/.cache/huggingface
          - name: chromadb-data
            mountPath: /data/chromadb
        env:
          - name: HF_HOME
            value: "/root/.cache/huggingface"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
      volumes:
        - name: huggingface-cache
          persistentVolumeClaim:
            claimName: huggingface-cache
        - name: chromadb-data
          persistentVolumeClaim:
            claimName: chromadb-data
```

**Behavior**:
- First pod downloads model to shared cache
- Subsequent pods use cached model (instant startup)
- All pods share same model files

**Option 2: InitContainer (pre-load)**

```yaml
spec:
  template:
    spec:
      initContainers:
      - name: download-model
        image: chromadb-wrapper:latest
        command:
          - python3
          - -c
          - "from sentence_transformers import CrossEncoder; CrossEncoder('BAAI/bge-reranker-base')"
        volumeMounts:
          - name: huggingface-cache
            mountPath: /root/.cache/huggingface
      containers:
      - name: chromadb-wrapper
        # ... (same as above)
```

**Behavior**:
- Model downloads before main container starts
- Ensures model available on first request
- Adds ~10-30s to pod startup time

**Option 3: Baked into image** (recommended for production)

Use Dockerfile with pre-download (Option 2 above):
- No runtime downloads
- Predictable startup time
- Works in airgapped clusters
- Larger image size (~300MB-1.3GB extra)

#### systemd with Cross-Encoder

`/etc/systemd/system/chromadb-wrapper.service`:
```ini
[Unit]
Description=ChromaDB Wrapper with Cross-Encoder Reranking
After=network.target

[Service]
Type=simple
User=flexchat
WorkingDirectory=/opt/flex-chat/backend/rag
Environment="PATH=/opt/flex-chat/venv/bin"
Environment="HF_HOME=/var/cache/huggingface"
ExecStart=/opt/flex-chat/venv/bin/python3 server.py \
  --embeddings-config /opt/flex-chat/backend/rag/embeddings-fast.yml \
  --chroma-path /data/chromadb \
  --port 5006 \
  --cross-encoder BAAI/bge-reranker-base
Restart=always
RestartSec=10

# Resource limits
MemoryMax=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
# Create cache directory
sudo mkdir -p /var/cache/huggingface
sudo chown flexchat:flexchat /var/cache/huggingface

# Enable and start
sudo systemctl enable chromadb-wrapper
sudo systemctl start chromadb-wrapper
sudo systemctl status chromadb-wrapper
```

### Troubleshooting Cross-Encoder

**"ModuleNotFoundError: No module named 'sentence_transformers'"**

**Cause**: Missing dependency

**Solution**:
```bash
pip install sentence-transformers
```

**"FATAL: Failed to load cross-encoder"**

**Cause**: Model download failed or invalid model name

**Solutions**:
```bash
# Check network connectivity
curl https://huggingface.co

# Verify model exists
# Browse: https://huggingface.co/models?pipeline_tag=text-classification&search=cross-encoder

# Try different model
python server.py --embeddings-config embeddings-fast.yml --cross-encoder cross-encoder/ms-marco-MiniLM-L-6-v2
```

**Slow startup (model download)**

**Cause**: Downloading large model on first run

**Solutions**:
- Use smaller model (`cross-encoder/ms-marco-MiniLM-L-6-v2` = 90MB)
- Pre-download model (see Docker Option 2 above)
- Use local path after download: `--cross-encoder-path ~/.cache/huggingface/hub/...`

**High memory usage**

**Cause**: Cross-encoder model loaded in memory

**Solutions**:
- Use smaller model (MiniLM = ~500MB, base = ~800MB, large = ~2GB)
- Increase server RAM
- Run without cross-encoder if reranking not needed

**503 when calling /rerank**

**Cause**: Service started without `--cross-encoder` flag

**Solution**:
```bash
# Restart with cross-encoder enabled
python server.py --embeddings-config embeddings-fast.yml --cross-encoder BAAI/bge-reranker-base
```

---

## Data Storage

### Directory Structure

```
backend/rag/
  ├── chroma_db/              # Default storage (or path given by --chroma-path)
  │   ├── recipes/            # Collection data
  │   │   ├── data_level0.bin
  │   │   ├── header.bin
  │   │   ├── length.bin
  │   │   └── link_lists.bin
  │   ├── red_hat_products/
  │   └── chroma.sqlite3      # ChromaDB metadata
  ├── server.py
  ├── requirements.txt
  ├── embeddings-fast.yml    # Example embeddings config (required at runtime)
  └── env.example            # Optional env overrides (e.g. EMBEDDINGS_CONFIG)
```

### Custom Paths

When using `--chroma-path`, the structure is the same:

```bash
python server.py --embeddings-config embeddings-fast.yml --chroma-path /data/my_chromadb
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
python server.py --embeddings-config embeddings-fast.yml --chroma-path /path/backend/rag/chroma_db
```

---

## Embedding Consistency

**Critical**: The embedding model must be **identical** for adding documents and for querying. The wrapper loads models from the `--embeddings-config` YAML; each collection stores an `embedding_model` (one of the YAML `id` values) in its metadata. Indexing and querying for that collection both use that model.

### Example Configuration

**Python service** (start with embeddings YAML):
```bash
python server.py --embeddings-config embeddings-fast.yml --chroma-path ./chroma_db/recipes --port 5006
```

**Flex Chat** (`config.json`): only RAG service connection; no embedding section in Node config:
```json
{
  "rag_services": {
    "recipes": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006"
    }
  }
}
```

Collections specify which embedding model from the wrapper to use (via collection metadata `embedding_model`). Indexing and querying for a collection both use that collection's model.

### Changing Embedding Models

If you need to change embedding models:

1. **Create new collection** with new name and the desired `embedding_model` from the wrapper health list
2. **Re-index all documents** into the new collection
3. **Delete old collection** when confident

**Don't**: Change embedding model on an existing collection that already has documents (results will be meaningless)

---

## Troubleshooting

### "Connection refused" when starting

**Cause**: Port already in use

**Solution**:
```bash
# Check what's using the port
lsof -i :5006

# Kill the process or use different port
python server.py --embeddings-config embeddings-fast.yml --port 5007
```

### "FATAL: No embeddings config specified"

**Cause**: Server requires an embeddings YAML file.

**Solution**:
```bash
python server.py --embeddings-config embeddings-fast.yml
# Or set env: EMBEDDINGS_CONFIG=embeddings-fast.yml python server.py
```

### "Embedding model failed to load"

**Cause**: Model in YAML not found or download failed (e.g. HuggingFace).

**Solution**: Check network; use `--download-models` to pre-download; verify `path` in YAML (HuggingFace ID or valid local path).

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
🔄 Loading embedding models from embeddings-fast.yml...
✅ Loaded embedding model: minilm (sentence-transformers/all-MiniLM-L6-v2)
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
ExecStart=/opt/flex-chat/venv/bin/python3 server.py --embeddings-config /opt/flex-chat/backend/rag/embeddings-fast.yml --chroma-path /data/chromadb/recipes --port 5007
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
COPY embeddings-fast.yml .

EXPOSE 5006

CMD ["python3", "server.py", "--embeddings-config", "embeddings-fast.yml", "--chroma-path", "/data/chromadb"]
```

Build and run:
```bash
docker build -t chromadb-wrapper .
docker run -d \
  -p 5006:5006 \
  -v /data/chromadb:/data/chromadb \
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

