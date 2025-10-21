# Flex Chat

A configuration-driven, AI-powered chat application with topic-aware RAG (Retrieval-Augmented Generation), dynamic knowledge base management, and transparent multi-model support.

## Key Features

### 🤖 **Multi-Provider AI Support**
- Support for multiple AI providers (OpenAI, Ollama)
- Switch models and providers via configuration
- Unified interface for all providers
- Per-message model and service transparency

### 📚 **Dynamic RAG Services**
- Topic-aware retrieval from multiple collections
- Create and manage collections via UI
- No configuration file changes needed
- Metadata-driven behavior (system prompts, thresholds)
- Upload documents through web interface

### 🎯 **6-Phase Processing Flow**
1. **Topic Detection** - Extract user intent as a topic
2. **RAG Collection** - Query relevant knowledge bases with normalized envelope
3. **Intent Detection** - Detect user intent with fast path for matches
4. **Profile Building** - Construct context from RAG results and intent
5. **Response Handler Matching** - Find first matching response rule
6. **Response Generation** - Generate final response using matched handler

### 🔧 **Configuration-Driven Architecture**
- All behavior controlled by JSON configuration
- Response handlers with flexible match criteria
- Environment variable substitution
- Multiple example configurations provided
- Full documentation in [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+ (for ChromaDB wrapper)
- OpenAI API key (or other AI provider)

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend/chat
npm install

# RAG Wrapper (optional, for dynamic collections)
cd ../rag
pip install -r requirements.txt
```

### 2. Configure

```bash
# Copy an example configuration
cp config/examples/01-chat-only.json config/config.json

# Edit config.json and add your API keys
# Or set environment variables:
export OPENAI_API_KEY="your-key-here"
export FLEX_CHAT_CONFIG_FILE="01-chat-only.json"
```

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for full configuration guide.

### 3. Start Services

**Option A - All-in-One (Recommended):**
```bash
# Start with default config
./start.sh

# Or with custom config
./start.sh --config config/examples/chat-only-ollama.json

# Get help
./start.sh --help
```

**Option B - Individual Services:**

**Terminal 1 - RAG Wrapper (if using RAG services):**
```bash
cd backend/rag
python3 server.py
# Runs on http://localhost:5006 by default
# Or specify custom port and data path:
python3 server.py --chroma-path ./chroma_db/my_data --port 5007
```

See [`docs/CHROMADB_WRAPPER.md`](docs/CHROMADB_WRAPPER.md) for full service documentation.

**Terminal 2 - Chat Server:**
```bash
cd backend/chat
node server.js
# Runs on http://localhost:5005

# Or with custom config:
node server.js --config ../../config/examples/chat-only-ollama.json

# Get help:
node server.js --help
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 4. Use the System

- **Home:** `http://localhost:5173/`
- **Chat:** `http://localhost:5173/chat`
- **Collections:** `http://localhost:5173/collections` (if wrapper configured)

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────┐
│      Frontend (React + Vite)            │
│  /        /chat       /collections      │
│  - Topic-aware UI                       │
│  - Model transparency per message       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│    Chat Server (Node.js + Express)      │
│  ┌───────────────────────────────────┐  │
│  │ 6-Phase Processing Flow:          │  │
│  │ 1. Topic Detection                │  │
│  │ 2. RAG Collection                 │  │
│  │ 3. Intent Detection               │  │
│  │ 4. Profile Building               │  │
│  │ 5. Response Handler Matching      │  │
│  │ 6. Response Generation            │  │
│  └───────────────────────────────────┘  │
│  - AI Provider Abstraction              │
│  - RAG Service Abstraction              │
│  - Collection Management API            │
└────────────┬────────────────────────────┘
             │
             ├─────────────────┐
             ▼                 ▼
    ┌──────────────┐  ┌───────────────────┐
    │ AI Providers │  │ ChromaDB Wrapper  │
    │ (OpenAI,     │  │ (Python FastAPI)  │
    │  Ollama)     │  │ - Collection Mgmt │
    └──────────────┘  │ - Embeddings      │
                      │ - Document Upload │
                      └─────────┬─────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   ChromaDB   │
                        │ (Persistent) │
                        └──────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Configuration

Flex Chat uses a JSON configuration file to define:
- **LLMs** - AI providers and their connection details
- **RAG Services** - Vector databases and embeddings
- **Embedding** - Default embedding configuration
- **Intent** - Intent detection settings
- **Responses** - Response handlers with match criteria

### Example Configurations

Located in `config/examples/`:
- **`01-chat-only.json`** - Simple conversational bot without RAG
- **`02-single-rag-dynamic.json`** - Single RAG service with dynamic collections
- **`03-single-rag-pinned.json`** - Single RAG service with pinned collection
- **`04-multi-rag-multi-llm.json`** - Multiple RAG services and LLMs

### Specifying Config File

```bash
# Via CLI argument
node server.js --config config/examples/01-chat-only.json

# Via environment variable (filename only, searches config/examples/)
export FLEX_CHAT_CONFIG_FILE="01-chat-only.json"

# Via environment variable (directory)
export FLEX_CHAT_CONFIG_DIR="/path/to/config/directory"
```

**📖 Full Configuration Guide:** See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for complete documentation.

## Key Concepts

### Response Handlers

Response handlers define how to match and respond to queries:

```json
{
  "match": {
    "service": "recipes",
    "intent_regexp": "/(recipe|cooking)/"
  },
  "llm": "local",
  "model": "llama3.2:3b",
  "prompt": "You are a helpful cooking assistant...\n\n{{rag_context}}\n\nUser: {{user_message}}",
  "max_tokens": 500
}
```

**Match Criteria:**
- `service` - RAG service name that provided context
- `intent_regexp` - Regular expression to match detected intent
- `reasoning` - Whether reasoning model should be used
- First matching handler wins

### RAG Services

RAG services connect to vector databases:

```json
{
  "rag_services": {
    "recipes": {
      "base_url": "http://localhost:5006",
      "match_threshold": 0.3,
      "partial_threshold": 0.5
    }
  }
}
```

**Thresholds:**
- `match_threshold` - Distance threshold for "match" result
- `partial_threshold` - Distance threshold for "partial" result
- Beyond partial: "none" (no RAG context provided)

### Dynamic Collections

**Create collections via UI:**
1. Navigate to `/collections`
2. Click "Create New Collection"
3. Define metadata (name, system prompt, thresholds)
4. Upload documents (text files, PDFs, etc.)
5. Collections are immediately available in chat!

**No config changes needed!** Collection metadata drives behavior.

See [`docs/COLLECTION_MANAGEMENT.md`](docs/COLLECTION_MANAGEMENT.md) and [`docs/RAG_SERVICES.md`](docs/RAG_SERVICES.md) for details.

## Documentation

### Core Documentation
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and 4-phase flow
- **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)** - Complete configuration guide
- **[docs/RAG_SERVICES.md](docs/RAG_SERVICES.md)** - RAG service configuration and providers
- **[docs/CHROMADB_WRAPPER.md](docs/CHROMADB_WRAPPER.md)** - Python ChromaDB wrapper service guide
- **[docs/REASONING_MODELS.md](docs/REASONING_MODELS.md)** - Using reasoning models (DeepSeek R1, etc.)

### Feature Documentation
- **[docs/COLLECTION_MANAGEMENT.md](docs/COLLECTION_MANAGEMENT.md)** - Dynamic collection management
- **[docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md](docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md)** - Implementation details
- **[docs/PROVIDER_COMPARISON.md](docs/PROVIDER_COMPARISON.md)** - Provider comparison and selection

### Project Documentation
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[TODO.md](TODO.md)** - Planned features and improvements
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

## Development

### Project Structure

```
flex-chat/
├── frontend/               # React frontend (Vite)
│   └── src/
│       ├── App.jsx        # Main app with routing
│       ├── Chat.jsx       # Chat interface (topic-aware)
│       ├── Collections.jsx # Collection management
│       └── Home.jsx       # Landing page
├── backend/
│   ├── chat/              # Node.js chat server
│   │   ├── server.js      # Main server with 6-phase flow
│   │   ├── lib/           # Core processing modules
│   │   │   ├── topic-detector.js      # Phase 1: Topic detection
│   │   │   ├── rag-collector.js       # Phase 2: RAG collection
│   │   │   ├── intent-detector.js     # Phase 3: Intent detection
│   │   │   ├── profile-builder.js     # Phase 4: Profile building
│   │   │   ├── response-matcher.js    # Phase 5: Handler matching
│   │   │   └── response-generator.js  # Phase 6: Response generation
│   │   ├── ai-providers/  # AI provider abstraction
│   │   └── retrieval-providers/ # RAG service abstraction
│   └── rag/               # Python ChromaDB wrapper
│       └── server.py      # FastAPI service
├── config/                # Configuration files
│   ├── examples/          # Example configurations
│   └── schema/            # JSON schema for validation
└── docs/                  # Documentation
```

### Adding New Providers

**AI Provider:**
1. Create provider class in `backend/chat/ai-providers/providers/`
2. Extend `AIProvider` base class
3. Implement `generateResponse()` and `generateEmbedding()` methods
4. Register in `providers/index.js`

**RAG Service Provider:**
1. Create provider class in `backend/chat/retrieval-providers/providers/`
2. Extend `RetrievalProvider` or `VectorProvider` base class
3. Implement `query()` and collection management methods
4. Register in `providers/index.js`

See [`docs/RAG_SERVICES.md`](docs/RAG_SERVICES.md) for detailed provider documentation.

## Testing

### End-to-End Test

1. Start all services (wrapper, chat server, frontend)
2. Create a test collection:
   - Name: "test_knowledge"
   - System Prompt: "You are a helpful test assistant"
   - Threshold: 0.3
3. Upload test document with known content
4. Go to chat, select the collection
5. Ask question about the document
6. Verify response uses your system prompt and document context

## Deployment

### Docker (Coming Soon)

### Kubernetes/OpenShift

1. **Build containers:**
   - Frontend: React build → nginx
   - Chat server: Node.js app
   - RAG wrapper: Python FastAPI

2. **Create ConfigMap:**
   ```bash
   kubectl create configmap chat-config --from-file=config.json
   ```

3. **Mount in deployments:**
   ```yaml
   volumes:
     - name: config
       configMap:
         name: chat-config
   ```

4. **Environment variables:**
   - `OPENAI_API_KEY`
   - `CHAT_CONFIG_PATH`

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for deployment patterns.

## Troubleshooting

### Collections not showing
- Verify RAG service configured in `rag_services` section
- Check wrapper service running: `python3 backend/rag/server.py`
- Check browser console for errors
- Verify `base_url` matches wrapper service port

### Connection refused errors
- **Port 5006:** Start RAG wrapper - `python3 backend/rag/server.py`
- **Port 5005:** Start chat server - `node backend/chat/server.js`
- **Port 5173:** Start frontend - `npm run dev` (in frontend/)
- Check firewall settings if running on different hosts

### No RAG results / Always fallback response
- Check collections have documents uploaded
- Lower `match_threshold` in RAG service config
- Verify embedding provider (Ollama/OpenAI) is accessible
- Check chat server logs for RAG query results

### LLM errors
- Verify API keys set correctly (env vars or config)
- Check provider is running (Ollama: `ollama list`)
- Review rate limits for commercial APIs
- Check chat server logs for detailed error messages

### Topic detection not working
- Verify intent detection is configured
- Check that LLM used for detection is accessible
- Review `intent` section in configuration

For more help, see [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

## License

MIT License - see LICENSE file for details.

## Support

- **Issues:** Open an issue on GitHub
- **Discussions:** Use GitHub Discussions
- **Documentation:** Check the `docs/` directory

## Acknowledgments

- OpenAI for GPT models and embeddings
- ChromaDB for vector database
- React and Vite for frontend framework
- FastAPI for Python wrapper service
