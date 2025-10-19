# Configuration System

This directory contains the configuration system for the flexible chat application.

## Structure

```
config/
├── examples/           # Sample configurations for different use cases
├── schema/            # JSON schemas for validation
└── README.md          # This file
```

## Configuration Files

### Main Configuration

The main configuration file defines:
- AI providers and their credentials
- Knowledge bases (vector databases)
- Response strategies with detection and response configuration

**Location**: `config/config.json` (or specify via environment variable)
**Note**: This file is NOT version controlled - mount as ConfigMap in deployment

**Schema**: See `schema/config-schema.json`

### Example Configurations

**Simple Examples:**
- **`chat-only.json`** - Simple conversational bot without RAG
- **`ollama-chat-only.json`** - Local Ollama models (no cloud APIs)

**RAG Examples:**
- **`rag-only-llm-fallback.json`** - RAG-only with LLM fallback
- **`rag-only-static-fallback.json`** - RAG-only with static fallback

**ChromaDB Wrapper (Python service on port 5006):**
- **`redhat-complex.json`** - Complex multi-domain Red Hat support bot
- **`chromadb-wrapper-example.json`** - Using Python wrapper with fixed collections
- **`multi-domain.json`** - Multi-domain bot (cooking, travel, tech, weather)

**Direct ChromaDB (HTTP server on port 8000):**
- **`chromadb-direct-server.json`** - Direct ChromaDB HTTP server connections

**Mixed Providers:**
- **`mixed-chromadb-providers.json`** - Mix of wrapper (5006) and direct (8000) ChromaDB

## Configuration Structure

### Top Level

- **`detection_provider`**: Provider/model for intent detection (required unless only one strategy with type "default")
- **`providers`**: AI provider configurations (OpenAI, Ollama, Gemini, etc.)
- **`knowledge_bases`**: Vector database configurations (ChromaDB, Milvus, etc.)
- **`strategies`**: Array of response strategies

### Strategy Structure

Each strategy has:
- **`name`**: Unique identifier (e.g., "OPENSHIFT", "CODING")
- **`detection`**: How to detect this strategy
  - `type`: "rag", "llm", or "default"
  - `knowledge_base`: Knowledge base name (for RAG)
  - `match_threshold`: Distance threshold for immediate detection
  - `partial_threshold`: Optional upper threshold for hybrid detection
  - `description`: Text used in LLM intent detection
- **`response`**: How to generate responses
  - `provider`: AI provider name
  - `model`: Model to use
  - `max_tokens`: Token limit
  - `system_prompt`: System prompt OR
  - `static_response`: Static text response

## Detection Types

### RAG Detection (`"rag"`)
- Queries knowledge base directly
- If distance < threshold → strategy detected
- If partial_threshold specified and distance in range → include in LLM detection
- If distance > partial_threshold → exclude from LLM detection

### LLM Detection (`"llm"`)
- Included in LLM intent detection query
- Uses description field in prompt

### Default (`"default"`)
- Catch-all strategy when nothing else matches
- No detection needed

## Knowledge Base Providers

**Important:** The two ChromaDB provider types use **different ports** by default:
- **`chromadb-wrapper`** → Port **5006** (Python wrapper service)
- **`chromadb`** (direct) → Port **8000** (ChromaDB HTTP server)

### ChromaDB Wrapper (`"chromadb-wrapper"`)

Connects to a Python FastAPI wrapper service that handles embeddings and ChromaDB access.

**When to use:**
- Development/testing environments
- Don't want to run full ChromaDB server
- Simple setup with persistent ChromaDB
- Want dynamic collection management via UI

**Configuration:**
```json
{
  "type": "chromadb-wrapper",
  "url": "http://localhost:5006",
  "collection": "my_docs",     // Optional: omit for dynamic collections
  "top_k": 3,                   // Optional: default results to return
  "timeout": 30000,             // Optional: request timeout (ms)
  "default_threshold": 0.3,     // Optional: distance threshold
  "max_distance": 1.0           // Optional: max distance to consider
}
```

**Start wrapper service:**
```bash
cd backend/rag
python server.py  # Runs on port 5006
```

**Required wrapper endpoints:**
- `POST /query` - Query with text (wrapper handles embeddings)
- `GET /collections` - List collections (for UI)
- `POST /collections` - Create collections (for UI)

### Direct ChromaDB (`"chromadb"`)

Connects directly to ChromaDB HTTP server (requires embeddings in Node.js).

**When to use:**
- Production environments
- Separate ChromaDB server deployment
- Full control over embedding generation
- No Python wrapper dependency

**Configuration:**
```json
{
  "type": "chromadb",
  "url": "http://localhost:8000",
  "collection": "my_docs",
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "top_k": 3,
  "timeout": 30000
}
```

**Start ChromaDB server:**
```bash
chroma run --path ./chroma_db --port 8000
```

### Future Providers

The system is designed to support additional providers:
- **Milvus** - High-performance vector database
- **Postgres + pgvector** - PostgreSQL with vector extensions
- **Pinecone** - Managed vector database
- **Elasticsearch** - Full-text + vector search
- **Custom APIs** - Any REST API that returns context

## Environment Variables

- `CHAT_CONFIG_PATH` - Path to main configuration file (default: `config/config.json`)
- Use `${VARIABLE_NAME}` in config files for environment variable substitution

## Usage

1. Choose an example configuration that matches your use case
2. Copy it to `config/config.json`
3. Replace `${OPENAI_API_KEY}` and other placeholders with actual values
4. Configure knowledge bases and providers for your setup
5. Start the chat server

## Validation

Use the JSON schema to validate your configuration:

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate configuration
ajv validate -s schema/config-schema.json -d config.json
```

## Deployment

In OpenShift/Kubernetes:
1. Create ConfigMap from config.json (with secrets replaced)
2. Mount ConfigMap at `/app/config/config.json`
3. Or use environment variable `CHAT_CONFIG_PATH` to point to mounted location
