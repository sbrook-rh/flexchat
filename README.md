# Flexible Chat System

A configuration-driven, AI-powered chat application with dynamic knowledge base management, intent detection, and RAG (Retrieval-Augmented Generation) capabilities.

## Key Features

### 🤖 **AI Provider Abstraction**
- Support for multiple AI providers (OpenAI, Ollama, Gemini, etc.)
- Switch models and providers via configuration
- Unified interface for all providers

### 📚 **Dynamic Knowledge Bases**
- Create and manage collections via UI
- No configuration file changes needed
- Metadata-driven behavior (system prompts, thresholds)
- Upload documents through web interface

### 🎯 **Strategy-Based Detection**
- RAG-first detection (query knowledge bases)
- LLM-based fallback detection
- Hybrid detection modes
- Configurable thresholds and fallbacks

### 🔧 **Configuration-First**
- All behavior driven by JSON configuration
- No code changes for new strategies
- Environment variable substitution
- Multiple example configurations provided

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
# Copy example configuration
cp config/examples/chromadb-wrapper-example.json config/config.json

# Edit config.json and add your API keys
# Or set environment variables:
export OPENAI_API_KEY="your-key-here"
```

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

**Terminal 1 - RAG Wrapper (if using chromadb-wrapper):**
```bash
cd backend/rag
python server.py
# Runs on http://localhost:5006
```

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

```
┌─────────────────────────────────────────┐
│      Frontend (React + Vite)            │
│  /        /chat       /collections      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│    Chat Server (Node.js + Express)      │
│  - Strategy Detection                   │
│  - AI Provider Abstraction              │
│  - Collection Management API            │
└────────────┬────────────────────────────┘
             │
             ├─────────────────┐
             ▼                 ▼
    ┌──────────────┐  ┌───────────────────┐
    │ AI Providers │  │ ChromaDB Wrapper  │
    │ (OpenAI,     │  │ (Python FastAPI)  │
    │  Ollama,     │  │ - Collection Mgmt │
    │  etc.)       │  │ - Embeddings      │
    └──────────────┘  └─────────┬─────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   ChromaDB   │
                        │ (Persistent) │
                        └──────────────┘
```

## Configuration

### Provider Types

**ChromaDB Wrapper (Port 5006):**
- Python wrapper service
- Handles embeddings automatically
- Supports dynamic collection management
- Best for development and user-managed content

**Direct ChromaDB (Port 8000):**
- Direct ChromaDB HTTP server
- Chat server generates embeddings
- Fixed collections only
- Best for production

See [`docs/PROVIDER_COMPARISON.md`](docs/PROVIDER_COMPARISON.md) for detailed comparison.

### Example Configurations

- **`chat-only.json`** - Simple conversational bot without RAG
- **`chromadb-wrapper-example.json`** - Using Python wrapper with multiple collections
- **`chromadb-direct-server.json`** - Direct ChromaDB HTTP server
- **`redhat-complex.json`** - Complex multi-domain support bot
- **`ollama-chat-only.json`** - Using local Ollama models

See [`config/README.md`](config/README.md) for full configuration guide.

## Key Concepts

### Strategies

Each strategy defines:
- **Detection:** How to identify this type of query (RAG, LLM, or default)
- **Response:** How to generate the response (provider, model, system prompt)

```json
{
  "name": "KUBERNETES",
  "detection": {
    "type": "rag",
    "knowledge_base": "k8s_docs",
    "threshold": 0.3
  },
  "response": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "system_prompt": "You are a Kubernetes expert...",
    "max_tokens": 800
  }
}
```

### Knowledge Bases

Reference different data sources:

```json
{
  "knowledge_bases": {
    "k8s_docs": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "collection": "kubernetes_docs"
    }
  }
}
```

### Dynamic Collections

**Create collections via UI:**
1. Go to `/collections`
2. Click "Create New Collection"
3. Define metadata (name, system prompt, threshold)
4. Upload documents
5. Use in chat immediately!

**No config changes needed!** Collection metadata drives behavior.

See [`docs/COLLECTION_MANAGEMENT.md`](docs/COLLECTION_MANAGEMENT.md) for details.

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[docs/COLLECTION_MANAGEMENT.md](docs/COLLECTION_MANAGEMENT.md)** - Dynamic collection management guide
- **[docs/RETRIEVAL_PROVIDERS.md](docs/RETRIEVAL_PROVIDERS.md)** - Retrieval provider abstraction details
- **[docs/PROVIDER_COMPARISON.md](docs/PROVIDER_COMPARISON.md)** - ChromaDB provider comparison
- **[config/README.md](config/README.md)** - Configuration system guide
- **[docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md](docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md)** - Implementation details
- **[SESSION_LOG.md](SESSION_LOG.md)** - Session history and decisions

## Development

### Project Structure

```
flex-chat/
├── frontend/               # React frontend (Vite)
│   └── src/
│       ├── App.jsx        # Main app with routing
│       ├── Chat.jsx       # Chat interface
│       ├── Collections.jsx # Collection management
│       └── Home.jsx       # Landing page
├── backend/
│   ├── chat/              # Node.js chat server
│   │   ├── server.js      # Main server
│   │   ├── ai-providers/  # AI provider abstraction
│   │   └── retrieval-providers/ # Retrieval abstraction
│   └── rag/               # Python ChromaDB wrapper
│       └── server.py      # FastAPI service
└── config/                # Configuration files
    ├── examples/          # Example configurations
    └── schema/            # JSON schema for validation
```

### Adding New Providers

**AI Provider:**
1. Create provider class in `backend/chat/ai-providers/providers/`
2. Extend `AIProvider` base class
3. Implement required methods
4. Register in `providers/index.js`

**Retrieval Provider:**
1. Create provider class in `backend/chat/retrieval-providers/providers/`
2. Extend `RetrievalProvider` or `VectorProvider`
3. Implement required methods
4. Register in `providers/index.js`

See [`docs/RETRIEVAL_PROVIDERS.md`](docs/RETRIEVAL_PROVIDERS.md) for details.

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
- Verify `chromadb-wrapper` provider configured
- Check wrapper service running on port 5006
- Check browser console for errors

### Connection refused errors
- **Port 5006:** Start wrapper - `python backend/rag/server.py`
- **Port 5005:** Start chat server - `node backend/chat/server.js`
- **Port 8000:** Start ChromaDB - `chroma run --port 8000`

### No RAG results
- Check collection has documents
- Lower threshold value
- Verify OpenAI API key set

### LLM errors
- Verify API keys set correctly
- Check rate limits
- Review chat server logs

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
