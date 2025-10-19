# Configuration Guide

## Overview

The chat system uses two configuration files that must be kept in sync:

1. **`config/config.json`** - Main configuration for chat backend (providers, models, strategies)
2. **`backend/rag/.env`** - Credentials and connection details for RAG service

---

## Configuration Structure

### 1. Providers

Define AI providers for both LLM responses and embeddings:

```json
{
  "providers": {
    "ollama": {
      "type": "ollama",
      "base_url": "http://localhost:11434",
      "embedding_model": "nomic-embed-text"
    },
    "openai": {
      "type": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1",
      "embedding_model": "text-embedding-3-small"
    },
    "gemini": {
      "type": "gemini",
      "api_key": "${GEMINI_API_KEY}",
      "embedding_model": "models/text-embedding-004"
    }
  }
}
```

**Fields:**
- `type`: Provider type (`ollama`, `openai`, `gemini`)
- `base_url`: API endpoint URL
- `api_key`: API key (can use `${ENV_VAR}` syntax for environment variable substitution)
- `embedding_model`: Model name to use for vector embeddings

---

### 2. Knowledge Bases

Define vector databases for RAG:

```json
{
  "knowledge_bases": {
    "dynamic": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "embedding_provider": "ollama"
    },
    "docs": {
      "type": "chromadb",
      "url": "http://localhost:8000",
      "collection": "documentation",
      "embedding_provider": "openai"
    }
  }
}
```

**Fields:**
- `type`: Provider type
  - `chromadb-wrapper`: Python FastAPI wrapper (supports dynamic collections)
  - `chromadb`: Direct ChromaDB HTTP server
- `url`: Service URL
- `collection`: Collection name (optional for `chromadb-wrapper`)
- `embedding_provider`: **Must reference a provider name from the `providers` section**

**Optional Fields:**
- `top_k`: Default number of results (default: 3)
- `timeout`: Request timeout in ms (default: 30000)
- `default_threshold`: Distance threshold (default: 0.3)
- `max_distance`: Maximum distance to consider (default: 1.0)

---

### 3. Strategies

Define how the system detects and responds to different types of queries:

```json
{
  "strategies": [
    {
      "name": "DOCS_RAG",
      "detection": {
        "type": "rag",
        "knowledge_base": "docs",
        "threshold": 0.3
      },
      "response": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "max_tokens": 800,
        "temperature": 0.7,
        "system_prompt": "You are a helpful documentation assistant..."
      }
    },
    {
      "name": "GENERAL",
      "detection": {
        "type": "default"
      },
      "response": {
        "provider": "ollama",
        "model": "qwen2.5:7b-instruct",
        "max_tokens": 150,
        "system_prompt": "You are a helpful assistant..."
      }
    }
  ]
}
```

**Detection Types:**
- `rag`: Query knowledge base, use if distance < threshold
- `llm`: Use LLM to classify intent
- `default`: Fallback strategy (only one allowed)

**Detection Fields (for `rag`):**
- `knowledge_base`: Reference to knowledge base name
- `threshold`: Distance threshold for match (0-2, lower = stricter)
- `partial_threshold`: Optional upper threshold for LLM fallback
- `description`: Text for LLM detection (if using fallback)

**Response Fields:**
- `provider`: AI provider name (must reference a provider)
- `model`: Model name for this provider
- `max_tokens`: Maximum response length
- `temperature`: Creativity level (0-2)
- `system_prompt`: Instructions for the AI

---

## RAG Service Configuration

**File:** `backend/rag/.env`

```env
# Default provider (fallback if not specified)
EMBEDDING_PROVIDER=ollama

# Ollama Configuration
# Must match config.json: providers.ollama.base_url
OLLAMA_BASE_URL=http://localhost:11434
# Must match config.json: providers.ollama.embedding_model
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# OpenAI Configuration
# Required if config.json uses provider type "openai"
OPENAI_API_KEY=sk-your_key_here
# Must match config.json: providers.openai.embedding_model
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Gemini Configuration
# Required if config.json uses provider type "gemini"
GEMINI_API_KEY=your_key_here
# Must match config.json: providers.gemini.embedding_model
GEMINI_EMBEDDING_MODEL=models/text-embedding-004
```

**Important:** 
- Only configure providers you use in `config.json`
- Model names must match exactly between both files
- Base URLs must match between both files

---

## Quick Setup

### 1. Configure Chat Backend

Edit `config/config.json`:

```json
{
  "providers": {
    "ollama": {
      "type": "ollama",
      "base_url": "http://localhost:11434",
      "embedding_model": "nomic-embed-text"
    }
  },
  "knowledge_bases": {
    "dynamic": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "embedding_provider": "ollama"
    }
  },
  "strategies": [
    {
      "name": "DYNAMIC_RAG",
      "detection": {
        "type": "rag",
        "knowledge_base": "dynamic",
        "threshold": 0.3
      },
      "response": {
        "provider": "ollama",
        "model": "qwen2.5:7b-instruct",
        "max_tokens": 800,
        "temperature": 0.7,
        "system_prompt": "You are a helpful assistant..."
      }
    }
  ]
}
```

### 2. Configure RAG Service

Copy and edit `backend/rag/.env`:

```bash
cp backend/rag/env.example backend/rag/.env
```

Edit `backend/rag/.env`:

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### 3. Start Services

```bash
./start.sh
```

---

## Multiple Providers Example

**`config/config.json`:**
```json
{
  "providers": {
    "ollama": {
      "type": "ollama",
      "base_url": "http://localhost:11434",
      "embedding_model": "nomic-embed-text"
    },
    "openai": {
      "type": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "embedding_model": "text-embedding-3-small"
    }
  },
  "knowledge_bases": {
    "local_docs": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "embedding_provider": "ollama"
    },
    "cloud_docs": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "embedding_provider": "openai"
    }
  }
}
```

**`backend/rag/.env`:**
```env
EMBEDDING_PROVIDER=ollama

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

OPENAI_API_KEY=sk-your_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## Reference

### Supported Provider Types
- `ollama` - Local Ollama installation
- `openai` - OpenAI API
- `gemini` - Google Gemini API

### Supported Knowledge Base Types
- `chromadb-wrapper` - Python FastAPI wrapper (port 5006)
- `chromadb` - Direct ChromaDB server (port 8000)

### Supported Embedding Models

**Ollama:**
- `nomic-embed-text` (recommended)
- `all-minilm`
- Any model supporting embeddings

**OpenAI:**
- `text-embedding-3-small` (recommended)
- `text-embedding-3-large`
- `text-embedding-ada-002` (legacy)

**Gemini:**
- `models/text-embedding-004` (recommended)
- `models/embedding-001` (legacy)

---

## Troubleshooting

### Provider Not Configured Error
**Cause:** RAG service can't find credentials  
**Fix:** Add provider credentials to `backend/rag/.env`

### Model Mismatch Error
**Cause:** `config.json` and `.env` specify different models  
**Fix:** Ensure model names match exactly in both files

### High Distance Values (e.g., 260.63)
**Cause:** Collection created with wrong settings  
**Fix:** Delete collection and recreate (will use correct distance metric automatically)

### Connection Refused
**Cause:** Service not running or wrong URL  
**Fix:** 
- Verify services are running (`./start.sh`)
- Check URLs match in both config files

---

## See Also

- `config/examples/` - Example configurations
- `backend/rag/env.example` - Environment template
- `docs/ARCHITECTURE.md` - System architecture

