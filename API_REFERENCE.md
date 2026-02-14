# API Reference

## Chat API (Port 5005)

### Endpoints

#### GET /chat/api
**Purpose**: Health check endpoint
**Response**: `"Ready"`

#### POST /chat/api
**Purpose**: Send chat message and get AI response
**Request Body**:
```json
{
  "prompt": "string",           // User's message
  "previousMessages": [         // Optional: conversation history
    {
      "type": "user|bot",
      "text": "string"
    }
  ],
  "retryCount": 0               // Optional: retry attempt number
}
```

**Response**:
```json
{
  "success": true,
  "response": "AI response text"
}
```

**Error Response (429 - Rate Limited)**:
```json
{
  "success": false,
  "message": "Too many requests. Please wait before retrying.",
  "retryAfter": 10
}
```

**Error Response (500 - Server Error)**:
```json
{
  "success": false,
  "message": "Error connecting to the AI"
}
```

### Intent Detection

The chat API automatically detects user intent and routes to appropriate response handlers:

- **KNOWLEDGE**: Queries RAG service for knowledge base information
- **GENERAL**: Simple conversational responses
- **SUPPORT**: Help and assistance focused responses

### Rate Limiting

- Implements exponential backoff for OpenAI API rate limits
- Retry-After header support
- Maximum 3 retry attempts before giving up

## RAG Service (Port 5006)

### Endpoints

#### GET /query
**Purpose**: Health check endpoint
**Response**:
```json
{
  "status": "ready"
}
```

#### POST /query
**Purpose**: Query knowledge base using semantic search
**Request Body**:
```json
{
  "query": "string",    // Search query
  "top_k": 3           // Optional: number of results (default: 3)
}
```

**Response**:
```json
{
  "results": [
    {
      "text": "Relevant text from knowledge base",
      "distance": 0.25
    }
  ]
}
```

**Error Response**:
```json
{
  "error": "Error message"
}
```

### Distance Scoring

- Lower distance = more relevant
- Typical thresholds:
  - < 0.2: High confidence match
  - 0.2 - 0.45: Medium confidence match
  - > 0.45: Low confidence match

#### GET /health
**Purpose**: Health check with optional cross-encoder status
**Response**:
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

**Notes**:
- `cross_encoder` field only present when model loaded at startup
- Use this to check if reranking capability is available

#### POST /rerank
**Purpose**: Rerank documents using cross-encoder model for improved relevance scoring
**Request Body**:
```json
{
  "query": "How do I configure pod security?",
  "documents": [
    {
      "id": "doc1",
      "text": "Document text to rerank..."
    },
    {
      "id": "doc2", 
      "text": "Another document..."
    }
  ],
  "top_k": 3  // Optional: limit returned results
}
```

**Response**:
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

**Notes**:
- Requires cross-encoder model loaded at startup (see Startup Configuration below)
- Documents are re-scored and reordered by relevance to query
- Higher scores indicate better relevance
- `original_rank` preserves input order for debugging
- Returns 503 if cross-encoder not loaded

**Error Responses**:
- `503`: Cross-encoder not loaded. Start server with `--cross-encoder` flag
- `400`: Invalid input (missing query or documents)
- `500`: Reranking failed

### Startup Configuration

The RAG service supports optional cross-encoder reranking capability:

```bash
# Basic usage
python server.py --chroma-path ./chroma_db --port 5006

# With cross-encoder from HuggingFace
python server.py --cross-encoder BAAI/bge-reranker-base

# With local cross-encoder model
python server.py --cross-encoder-path /path/to/model

# List available models
python server.py --list-reranker-models
```

**Command-line Flags**:
- `--chroma-path PATH`: ChromaDB storage directory (default: `./chroma_db`)
- `--port PORT`: Server port (default: `5006`)
- `--cross-encoder MODEL`: HuggingFace cross-encoder model name
- `--cross-encoder-path PATH`: Local path to cross-encoder model (overrides `--cross-encoder`)
- `--list-reranker-models`: Display recommended models and exit

**Environment Variables** (fallback):
- `CROSS_ENCODER_MODEL`: Cross-encoder model name
- `CROSS_ENCODER_PATH`: Local model path

**Recommended Models**:

| Model | Size | Latency | Use Case |
|-------|------|---------|----------|
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 90MB | ~100ms | Development/Testing |
| `BAAI/bge-reranker-base` | 300MB | ~200ms | **Production (recommended)** |
| `BAAI/bge-reranker-large` | 1.3GB | ~500ms | High-accuracy requirements |

*Latency measured for 10 documents on CPU*

**Model Download Behavior**:
- First run downloads model from HuggingFace (~90MB-1.3GB depending on model)
- Cached in `~/.cache/huggingface/hub/` for subsequent runs
- Startup fails immediately if model specified but cannot load (fail-fast)
- Service runs normally without cross-encoder if not specified

## Environment Variables

### Chat API (.env)
```bash
CHAT_API_KEY=your_openai_api_key_here
CHROMADB_URL=http://localhost:5006/query
ASSISTANT_NAME=AI Assistant
KNOWLEDGE_BASE_TOPIC=general information
```

### RAG Service (.env)
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Knowledge Base Format

### knowledge_base.json Structure
```json
[
  {
    "text": "Content to be indexed and searched",
    "source": "Document or source name",
    "category": "Content category or topic"
  }
]
```

### Loading Knowledge Base
```bash
cd backend/rag
python load_data.py
```

## Error Codes

### Chat API
- `400`: Invalid input (missing or invalid prompt)
- `429`: Rate limited (too many requests)
- `500`: Server error (API or service unavailable)

### RAG Service
- `503`: Service unavailable (ChromaDB not ready)

## Request/Response Examples

### Basic Chat
```bash
curl -X POST http://localhost:5005/chat/api \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how can you help me?",
    "previousMessages": []
  }'
```

### Knowledge Query
```bash
curl -X POST http://localhost:5005/chat/api \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is machine learning?",
    "previousMessages": []
  }'
```

### RAG Service Query
```bash
curl -X POST http://localhost:5006/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "top_k": 5
  }'
```

## Collections API (Port 5173)

### Collection Management

#### POST /api/collections
**Purpose**: Create a new collection with embedding configuration
**Request Body**:
```json
{
  "name": "string",                    // Collection ID (kebab-case, 3-63 chars)
  "service": "string",                 // RAG service name
  "embedding_connection": "string",    // LLM connection ID for embeddings
  "embedding_model": "string",         // Exact model ID (e.g., "nomic-embed-text:latest")
  "metadata": {
    "display_name": "string",          // Human-readable name
    "description": "string",           // Collection purpose/detection hint
    "match_threshold": 0.3,            // Direct match threshold
    "partial_threshold": 0.5          // Fallback threshold
  }
}
```

**Response**:
```json
{
  "name": "collection-id",
  "metadata": {
    "embedding_provider": "ollama",
    "embedding_model": "nomic-embed-text:latest",
    "embedding_dimensions": 768,
    "embedding_connection_id": "ollama-local",
    "display_name": "Collection Name",
    "description": "Collection description",
    "match_threshold": 0.3,
    "partial_threshold": 0.5,
    "created_at": "2025-01-01T00:00:00.000Z",
    "hnsw:space": "cosine"
  }
}
```

**Notes**:
- `embedding_connection` and `embedding_model` are required
- Backend probes embedding dimensions automatically
- Model ID must match exactly (including version tags like `:latest`)
- Collection metadata is immutable after creation

#### GET /api/collections
**Purpose**: List all collections across all RAG services
**Response**:
```json
{
  "collections": [
    {
      "name": "collection-id",
      "service": "ServiceName",
      "count": 42,
      "metadata": { ... }
    }
  ],
  "wrappers": [
    {
      "name": "ServiceName",
      "url": "http://localhost:5006",
      "collection": null
    }
  ],
  "hasWrappers": true
}
```

#### GET /api/ui-config
**Purpose**: Get complete UI configuration including collections with resolved embedding connections
**Response**:
```json
{
  "collections": [
    {
      "name": "collection-id",
      "service": "ServiceName",
      "count": 42,
      "metadata": {
        "embedding_provider": "ollama",
        "embedding_model": "all-minilm:latest",
        "embedding_connection_id": "my-ollama",  // Historical connection ID
        "embedding_connection": "prod-ollama",   // ✨ Resolved current connection ID
        ...
      }
    }
  ],
  "wrappers": [...],
  "llms": { ... },
  "providerStatus": { ... },
  "chatReady": true,
  ...
}
```

**Embedding Connection Resolution**:
The `embedding_connection` field is automatically resolved from the historical `embedding_connection_id`:
- **Strategy 1**: Tries exact ID match with provider/model verification
- **Strategy 2**: Finds any connection with matching provider + model  
- Returns `null` if no compatible connection found (model unavailable)
- Handles config changes gracefully (connection renamed/removed)
- Caches embedding model fetching per provider type (not per connection) for performance

**Use Cases**:
- Test / Calibrate feature needs resolved connection for query testing
- Frontend can check if collection is testable via `metadata.embedding_connection !== null`
- Disabled test button shows helpful tooltip when connection is unavailable

#### POST /api/collections/:name/documents
**Purpose**: Upload documents to a collection (embeddings generated automatically)
**Request Body**:
```json
{
  "documents": [
    {
      "text": "Document content",
      "metadata": {
        "source": "file",
        "filename": "example.txt",
        "uploaded_at": "2025-01-01T00:00:00.000Z"
      }
    }
  ],
  "service": "ServiceName",
  "embedding_connection": "ollama-local",  // Required
  "embedding_model": "nomic-embed-text:latest"  // Required
}
```

**Response**:
```json
{
  "count": 1,
  "message": "Added 1 document(s)"
}
```

**Notes**:
- Backend generates embeddings using specified connection and model
- Must match collection's embedding configuration
- RAG wrapper validates pre-computed embeddings

#### POST /api/collections/:name/test-query
**Purpose**: Test a query against a collection and view raw results with distances
**Request Body**:
```json
{
  "query": "bare metal installation",
  "top_k": 10,                          // Optional: default 10
  "service": "ServiceName",             // Required
  "embedding_connection": "ollama-local", // Required (from collection metadata)
  "embedding_model": "all-minilm:latest"  // Required (from collection metadata)
}
```

**Response**:
```json
{
  "query": "bare metal installation",
  "collection": "ocp-with-all-minillm",
  "service": "red-hat-product-documentation",
  "results": [
    {
      "rank": 1,
      "distance": 0.296,
      "metadata": {
        "chapter_id": "chapter_2",
        "chapter_title": "Installing OpenShift",
        "section_heading": "2.5.1. Installation parameters"
      },
      "content": "Available installation configuration parameters..."
    },
    {
      "rank": 2,
      "distance": 0.412,
      "metadata": {
        "chapter_id": "chapter_1"
      },
      "content": "OpenShift requires..."
    }
  ],
  "embedding_model": "all-minilm:latest",
  "embedding_dimensions": 384,
  "execution_time_ms": 156
}
```

**Notes**:
- Uses collection's original embedding model for query embedding
- Returns raw distances (lower is better match)
- Execution time includes embedding generation and query
- Embedding connection must be resolved via `/api/ui-config` endpoint first
- Distance interpretation: < 0.3 (excellent), 0.3-0.5 (good), > 0.5 (poor match)

**Error Responses**:
- `400`: Missing required parameters (query, service, embedding_connection, embedding_model)
- `404`: Service not found
- `500`: Embedding generation or query execution failed

#### PUT /api/collections/:name/metadata
**Purpose**: Update collection metadata (**full replacement**)
**Request Body**:
```json
{
  "service": "ServiceName",
  "metadata": {
    // Complete metadata object - partial updates NOT supported
    "description": "Updated description",
    "match_threshold": 0.25,
    "partial_threshold": 0.5,
    "embedding_provider": "ollama",
    "embedding_model": "nomic-embed-text:latest",
    "embedding_dimensions": 768,
    "embedding_connection_id": "ollama-local",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-02T00:00:00.000Z"
  }
}
```

**⚠️ Important**: This endpoint performs a **full replacement** of metadata. You must send the complete metadata object, not just the fields you want to update.

#### DELETE /api/collections/:name?service=ServiceName
**Purpose**: Delete a collection
**Response**:
```json
{
  "success": true,
  "message": "Collection collection-id deleted"
}
```

### Connection Discovery

#### POST /api/connections/llm/discovery/models
**Purpose**: Discover available models from an LLM provider
**Request Body**:
```json
{
  "provider": "ollama",              // Provider type (ollama, openai, gemini)
  "config": {
    "baseUrl": "http://localhost:11434",
    "provider": "ollama"
  }
}
```

**Response**:
```json
{
  "provider": "ollama",
  "count": 12,
  "models": [
    {
      "id": "nomic-embed-text:latest",
      "name": "nomic-embed-text:latest",
      "type": "embedding",
      "capabilities": ["embedding"],
      "maxTokens": "137M",
      "description": "Ollama model: nomic-embed-text:latest"
    }
  ]
}
```

### Embedding Metadata Schema

Collections store complete embedding configuration in metadata:

```typescript
interface CollectionMetadata {
  // Required embedding fields
  embedding_provider: string;      // e.g., "ollama", "openai", "gemini"
  embedding_model: string;         // e.g., "nomic-embed-text:latest"
  embedding_dimensions: number;    // e.g., 768, 1536, 384
  embedding_connection_id: string; // LLM connection used at creation
  
  // Collection configuration
  display_name: string;
  description: string;
  match_threshold: number;
  partial_threshold: number;
  
  // Timestamps
  created_at: string;              // ISO 8601
  updated_at?: string;
  
  // ChromaDB fields
  "hnsw:space": "cosine";
}
```

**Key Points**:
- Embedding metadata is immutable (set at collection creation)
- `embedding_connection_id` may differ from current config (connections can be renamed)
- Model IDs must match exactly (no fuzzy matching on version tags)
- Dimensions are auto-detected by probing the model

## Integration Notes

### Frontend Integration
- Uses `fetch()` API for HTTP requests
- Implements retry logic for 429 responses
- Stores conversation history in localStorage
- Handles loading states and error messages
- Modal-based collection create/edit/upload workflows
- Smart connection resolution for document uploads

### Service Communication
- Chat API calls RAG service for KNOWLEDGE intents
- All services use JSON for data exchange
- CORS configured for localhost development
- Proxy configuration in `setupProxy.js` for development

### Phase 0.5 Architecture
- **Node backend** generates embeddings (not RAG wrapper)
- **UI** resolves compatible embedding connections via model discovery
- **RAG wrapper** is storage-only (validates pre-computed embeddings)
- **Collections** lock embedding configuration at creation time

## Backend Libraries

### Document Transformer

**Module**: `lib/document-transformer.js`  
**Purpose**: Transform raw JSON documents to standardized RAG format `{id, text, metadata}[]`

#### `transformDocuments(documents, schema)`

Pure transformation function that converts raw JSON documents based on a configurable schema.

**Parameters**:
- `documents` (Array\<Object\>): Raw JSON documents to transform
- `schema` (Object): Transformation schema with the following properties:
  - `text_fields` (string[]): **Required**. Fields to concatenate into text
  - `text_separator` (string): Optional. Separator between text fields (default: `"\n\n"`)
  - `metadata_fields` (string[]): Optional. Fields to extract as metadata (default: `[]`)
  - `metadata_static` (Object): Optional. Static metadata to apply to all documents (default: `{}`)
  - `id_field` (string): Optional. Field to use as document ID (generates UUID if missing)

**Returns**: Array\<Object\> - Transformed documents with `{id, text, metadata}` structure

**Throws**: Error if schema is invalid or transformation fails

**Example**:
```javascript
const { transformDocuments } = require('./lib/document-transformer');

const documents = [
  {
    title: "Crispy Tofu Stir-Fry",
    recipe: "Press tofu, cut into cubes...",
    category: "dinner",
    tags: ["vegan", "quick"]
  }
];

const schema = {
  text_fields: ["title", "recipe"],
  text_separator: "\n\n",
  metadata_fields: ["category", "tags"],
  metadata_static: { source: "recipe_api", doc_type: "recipe" },
  id_field: "title"
};

const transformed = transformDocuments(documents, schema);
// Result:
// [{
//   id: "Crispy Tofu Stir-Fry",
//   text: "Crispy Tofu Stir-Fry\n\nPress tofu, cut into cubes...",
//   metadata: {
//     source: "recipe_api",
//     doc_type: "recipe",
//     category: "dinner",
//     tags: ["vegan", "quick"]
//   }
// }]
```

**Behavior**:
- **Array fields**: Flattened to comma-separated strings in text, preserved as arrays in metadata
- **Nested objects**: JSON stringified for both text and metadata
- **Missing fields**: Skipped gracefully (throws error only if ALL text fields missing)
- **Null/undefined/empty values**: Filtered out automatically
- **ID generation**: Uses `crypto.randomUUID()` when `id_field` missing or field value absent
- **Pure function**: No side effects, I/O operations, or external state dependencies

## Tools API

These endpoints are served by the chat server (port 5005).

### GET /api/tools/list

**Purpose**: Return the tools active in the currently running configuration.

**Response**:
```json
{
  "tools": [
    { "name": "calculator", "description": "Evaluate mathematical expressions." },
    { "name": "get_current_datetime", "description": "Return current date and time." }
  ],
  "count": 2,
  "enabled": true,
  "apply_globally": false,
  "max_iterations": 5
}
```

**Notes**:
- Reflects the live running config (not any unsaved draft in the Config Builder).
- `enabled` is `false` and `tools` is empty when no tools are registered.

---

### GET /api/tools/available

**Purpose**: Return all builtin tools defined in the server manifest, regardless of config.

**Response**:
```json
{
  "tools": [
    {
      "name": "calculator",
      "description": "Evaluate mathematical expressions.",
      "parameters": { ... }
    },
    {
      "name": "get_current_datetime",
      "description": "Return the current date and time in the specified timezone.",
      "parameters": { ... }
    },
    {
      "name": "generate_uuid",
      "description": "Generate a random UUID v4.",
      "parameters": { ... }
    }
  ],
  "count": 3
}
```

**Notes**:
- Always returns HTTP 200 — does not depend on config state.
- Use this to populate the Config Builder's Tools tab or build custom tool pickers.

---

### POST /api/tools/test

**Purpose**: Test tool calling without applying config changes. Supports two request modes.

#### Mode 1 — Inline provider config (no apply needed)

**Request Body**:
```json
{
  "provider_config": {
    "provider": "openai",
    "api_key": "${OPENAI_API_KEY}",
    "base_url": "https://api.openai.com/v1"
  },
  "model": "gpt-4o-mini",
  "query": "What is 42 * 7?",
  "registry": [
    { "name": "calculator" }
  ]
}
```

#### Mode 2 — Named provider from running config

**Request Body**:
```json
{
  "llm": "local",
  "model": "qwen2.5:7b-instruct",
  "query": "What time is it in Tokyo?"
}
```

**Response**:
```json
{
  "content": "The result is 294.",
  "model": "gpt-4o-mini",
  "service": "openai",
  "tool_calls": [
    {
      "tool": "calculator",
      "input": { "expression": "42 * 7" },
      "output": "294",
      "duration_ms": 12
    }
  ],
  "max_iterations_reached": false,
  "validation": {
    "supported": true,
    "model": "gpt-4o-mini",
    "provider": "openai"
  }
}
```

**Notes**:
- Mode 1 uses `provider_config` inline — useful for testing before applying config.
- Mode 2 requires the named `llm` to be present in the running config.
- `registry` defaults to all tools in the running config when omitted in Mode 2.
- Returns `max_iterations_reached: true` when the tool loop hit the iteration cap.

**Error Responses**:
- `400`: Missing required fields or invalid request body.
- `422`: Model does not support function calling.
- `500`: Provider connection failed or tool execution error.

---

### GET /api/tools/validation

**Purpose**: Return per-model tool-calling validation history from this server session.

**Response**:
```json
{
  "statuses": {
    "gpt-4o-mini": { "supported": true, "provider": "openai", "checked_at": "2026-02-14T10:00:00.000Z" },
    "llama3.2:3b": { "supported": false, "provider": "ollama", "checked_at": "2026-02-14T10:01:00.000Z" }
  }
}
```

**Notes**:
- Populated as models are tested via the Tools test panel or `POST /api/tools/test`.
- Resets on server restart.
- Used by the Config Builder to show the 🔧 badge on compatible models.
