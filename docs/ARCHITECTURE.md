# Flex Chat - Architecture Overview (v2.0)

**Version**: 2.0.0  
**Last Updated**: October 19, 2025  
**Architecture**: Simplified 4-Phase Flow

---

## System Vision

A flexible, configurable chat system that can be adapted for different use cases:

### **Core Philosophy**
- **Simple base**: Forward requests to any AI model service (OpenAI, Ollama, etc.)
- **Optional RAG**: Add knowledge base retrieval capabilities when needed
- **Configurable everything**: External configuration files, not hardcoded logic
- **Linear flow**: Predictable 4-phase request processing

### **System Layers**

```
Frontend (React) → Chat API (Node.js) → AI Provider Abstraction → Model Services
                                    ↓
                            RAG Service (Python) → ChromaDB
```

---

## Application Structure

```
Frontend (React/Vite)
    ↓
Chat API (Express/Node.js)
    ├→ AI Providers (OpenAI, Ollama)
    └→ RAG Providers (ChromaDB Wrapper)
           ↓
    RAG Service (Python/FastAPI)
           ↓
    ChromaDB Vector Database
```

---

## Core Architecture: 6-Phase Flow

All chat requests follow a predictable linear flow through 6 phases:

### **Phase 1: Topic Detection**
- **Module**: `lib/topic-detector.js`
- **Purpose**: Identify the conversation topic from user message and history
- **Input**: User message, previous messages (last 6 turns), current topic
- **Process**:
  - Builds conversation context with both user and bot messages
  - Compresses long assistant messages (>400 chars) to "...continues for N chars"
  - Uses LLM to detect topic (≤10 words summary)
  - Tracks topic changes across conversation
- **Output**: Topic string (e.g., "hearty vegetarian soups")

### **Phase 2: RAG Collection**
- **Module**: `lib/rag-collector.js`
- **Purpose**: Query selected collections for relevant documents
- **Input**: Topic, selected collections, RAG service configs
- **Process**:
  - Queries each selected collection with the topic
  - Classifies results based on distance thresholds:
    - `distance < match_threshold` → **MATCH** (single best result)
    - `distance < partial_threshold` → **PARTIAL** (candidate results)
    - `distance ≥ partial_threshold` → **NONE** (no relevant content)
  - Returns first MATCH found, or all PARTIAL candidates
- **Output**: Normalized envelope:
  ```javascript
  {
    result: "match" | "partial" | "none",
    data: {
      service: "recipes_wrapper",
      collection: "comfort_soups", 
      documents: [...],
      distance: 0.23,
      description: "..."
    } | [...] | null
  }
  ```

### **Phase 3: Intent Detection**
- **Module**: `lib/intent-detector.js`
- **Purpose**: Detect user intent with fast path for strong RAG matches
- **Input**: Topic, RAG envelope, intent config, AI providers
- **Process**:
  - **Fast path**: If RAG result is "match", return `${service}/${collection}`
  - **LLM path**: For "partial" or "none", classify using configured intents + partial summaries
  - **Inline refinement**: If LLM returns "other" and partials exist, pick best by distance
- **Output**: Intent string (e.g., "recipe", "recipes_wrapper/comfort_soups", "other")

### **Phase 4: Profile Building**
- **Module**: `lib/profile-builder.js`
- **Purpose**: Build canonical profile object for response generation
- **Input**: Topic, RAG envelope, intent
- **Process**:
  - **Match**: `{ rag_results: "match", service, collection, intent, documents }`
  - **Partial**: `{ rag_results: "partial", intent, documents: merged }`
  - **None**: `{ rag_results: "none", intent, documents: [] }`
- **Output**: Profile object with:
  ```javascript
  {
    rag_results: "match" | "partial" | "none",
    intent: "recipe",
    service: "recipes_wrapper",
    collection: "comfort_soups",
    documents: [...],  // RAG context documents
    // ... other metadata
  }
  ```

### **Phase 5: Response Handler Matching**
- **Module**: `lib/response-matcher.js`
- **Purpose**: Find the first matching response handler
- **Input**: Profile, response rules
- **Process**:
  - Sequential first-match pattern through response rules
  - Match clauses: `{ intent, service, collection, rag_results }`
  - First matching rule wins
- **Output**: Response handler object

### **Phase 6: Response Generation**
- **Module**: `lib/response-generator.js`
- **Purpose**: Generate final response using matched handler
- **Input**: Profile, response handler, AI providers, user message
- **Process**:
  1. **Template Substitution**:
     - Replace `{{rag_context}}` with formatted document text
     - Replace `{{intent}}`, `{{topic}}`, etc. from profile
  2. **LLM Call**:
     - Call configured LLM provider with system prompt + conversation history
- **Output**: 
  ```javascript
  {
    content: "Generated response text",
    service: "ollama",
    model: "llama3.2:3b"
  }
  ```

---

## System Components

### **1. Chat Server** (`backend/chat/`)

Main server implementation with Express API:

**Core Modules** (`lib/`):
- `config-loader.js` - Configuration file loading with flexible path resolution
- `topic-detector.js` - Stateful topic tracking across conversation
- `rag-collector.js` - RAG query orchestration with threshold classification
- `profile-builder.js` - Profile construction from RAG results
- `response-matcher.js` - Sequential pattern matching for response rules
- `response-generator.js` - Template-based response generation with LLM calls
- `collection-manager.js` - CRUD operations for RAG collections

**Provider Abstractions**:
- `ai-providers/` - AI/LLM provider implementations
  - `base/AIProvider.js` - Base class for all AI providers
  - `providers/OpenAIProvider.js` - OpenAI API implementation
  - `providers/OllamaProvider.js` - Ollama local model implementation
  - `providers/index.js` - Provider registry
- `retrieval-providers/` - RAG/vector database provider implementations
  - `base/RetrievalProvider.js` - Base class for retrieval providers
  - `providers/ChromaDBWrapperProvider.js` - ChromaDB via Python wrapper
  - `RetrievalService.js` - Service orchestration

**Main Files**:
- `server.js` - Express server with 4-phase flow implementation
- `package.json` - Node.js dependencies

### **2. RAG Service** (`backend/rag/`)

Python FastAPI service for ChromaDB operations:

**Files**:
- `server.py` - FastAPI endpoints for collection management and queries
- `requirements.txt` - Python dependencies
- `chroma_db/` - Persistent ChromaDB storage directory

**Key Features**:
- Dynamic collection creation/deletion
- Document upload with metadata
- Semantic search with configurable embeddings
- Distance-based relevance scoring

### **3. Frontend** (`frontend/`)

React application with Vite build system:

**Key Components**:
- `src/App.jsx` - Main app with routing and config management
- `src/Chat.jsx` - Chat interface with message handling
- `src/Collections.jsx` - Collection management UI
- `src/Home.jsx` - Landing page
- `src/LogoSection.jsx` - Branding/logo component

**Key Features**:
- CSS Grid responsive layout with collapsible sidebars
- Collection selection with visual feedback
- Topic tracking and display
- Service/model transparency (shows which AI generated each response)
- localStorage persistence for chat history

---

## Data Flow Diagrams

### **Complete Request Flow**

```
User Message
    ↓
┌─────────────────────────────────────────────┐
│  Phase 1: Topic Detection                  │
│  - Analyze message + history               │
│  - Generate topic (≤10 words)              │
│  → Output: "hearty vegetarian soups"       │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Phase 2: RAG Collection                   │
│  - Query selected collections              │
│  - Classify by distance thresholds         │
│  - Return normalized envelope              │
│  → Output: { result: "match", data: {...} }│
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Phase 3: Intent Detection                 │
│  - Fast path: match → service/collection   │
│  - LLM path: classify with intents         │
│  - Refine "other" with best partial        │
│  → Output: "recipe" or "service/collection"│
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Phase 4: Profile Building                 │
│  - Build profile from RAG + intent         │
│  - Set rag_results, documents, metadata    │
│  → Output: { rag_results, intent, ... }    │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Phase 5: Response Handler Matching        │
│  - Find first matching response rule       │
│  - Match on intent, service, rag_results   │
│  → Output: Response handler object         │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Phase 6: Response Generation              │
│  - Substitute template variables           │
│  - Call LLM with system prompt + history  │
│  → Output: { content, service, model }     │
└─────────────────────────────────────────────┘
    ↓
Response to User
```

### **RAG Flow - Match Scenario**

```
User: "How do I make minestrone?"
    ↓
Topic: "minestrone soup recipe"
    ↓
Query: "comfort_soups" collection
    ↓
Distance: 0.15 (< match_threshold 0.25)
    ↓
Result: MATCH → Single document returned
    ↓
Profile: { intent: "comfort_soups", rag_result: "match", documents: [...] }
    ↓
Response Rule Match: { rag_result: "match", collection: "comfort_soups" }
    ↓
LLM generates response with RAG context
```

### **RAG Flow - Partial Scenario**

```
User: "Tell me about vegetarian soups"
    ↓
Topic: "vegetarian soups"
    ↓
Query: Multiple collections
    ↓
Results:
  - "comfort_soups": 0.35 (partial)
  - "vegetarian_basics": 0.40 (partial)
    ↓
Result: PARTIAL → Array of candidates
    ↓
Intent Detection: Use LLM with partial collections as context
    ↓
Profile: { intent: "recipe", rag_result: "partial", documents: [...] }
    ↓
Response Rule Match: { rag_result: "partial", intent: "recipe" }
    ↓
LLM generates response with combined RAG context
```

### **No RAG Scenario**

```
User: "What's the weather today?"
    ↓
Topic: "current weather"
    ↓
Query: All selected collections
    ↓
Distance: All > partial_threshold
    ↓
Result: NONE → Empty array
    ↓
Intent Detection: Use LLM with configured intents only
    ↓
Profile: { intent: "other", rag_result: "none", documents: [] }
    ↓
Response Rule Match: { intent: "other" }
    ↓
LLM generates conversational response without RAG context
```

---

## Configuration System

### **Configuration Structure**

Single JSON configuration file with four main sections:

```json
{
  "llms": { ... },           // AI/LLM providers
  "rag_services": { ... },   // RAG/vector database services
  "intent": { ... },         // Intent detection config
  "responses": [ ... ]       // Response matching rules
}
```

### **1. LLM Configuration** (`llms`)

Define available AI providers:

```json
{
  "llms": {
    "ollama": {
      "provider": "ollama",
      "base_url": "http://localhost:11434",
      "models": {
        "chat": ["llama3.2:3b", "llama3.1:8b"],
        "reasoning": []
      }
    },
    "openai": {
      "provider": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1",
      "models": {
        "chat": ["gpt-4o-mini", "gpt-3.5-turbo"],
        "reasoning": []
      }
    }
  }
}
```

**Key Fields**:
- `provider`: Provider type (openai, ollama)
- `base_url`: API endpoint
- `api_key`: Authentication (supports env var substitution)
- `models.chat`: Available chat models
- `models.reasoning`: Reasoning models (future feature)

### **2. RAG Services Configuration** (`rag_services`)

Define RAG/vector database services:

```json
{
  "rag_services": {
    "recipes_wrapper": {
      "type": "chromadb_wrapper",
      "url": "http://localhost:5006",
      "embedding_provider": "ollama",
      "embedding_model": "nomic-embed-text",
      "match_threshold": 0.25,
      "partial_threshold": 0.5,
      "collections": [
        {
          "name": "comfort_soups",
          "metadata": {
            "display_name": "Comfort Soups from Around the World",
            "description": "Hearty soup recipes"
          }
        }
      ]
    }
  }
}
```

**Key Fields**:
- `type`: Provider type (chromadb_wrapper)
- `url`: RAG service endpoint
- `embedding_provider`/`embedding_model`: Embeddings config
- `match_threshold`: Distance threshold for confident matches
- `partial_threshold`: Distance threshold for candidate results
- `collections`: Pinned collections (optional, can be dynamic)

### **3. Intent Configuration** (`intent`)

Define intent detection settings:

```json
{
  "intent": {
    "llm": "ollama",
    "model": "llama3.2:3b",
    "intents": [
      {
        "name": "recipe",
        "description": "User is asking for cooking instructions, recipes, or food preparation"
      },
      {
        "name": "general",
        "description": "General conversation, greetings, or non-food related questions"
      }
    ]
  }
}
```

**Key Fields**:
- `llm`: Which LLM service to use for intent detection
- `model`: Which model to use
- `intents`: Array of possible intents with descriptions

**When Used**:
- Only when RAG result is PARTIAL or NONE
- Not called when RAG finds confident MATCH
- For PARTIAL: includes partial collections in prompt

### **4. Response Rules** (`responses`)

Define response matching and generation rules:

```json
{
  "responses": [
    {
      "match": {
        "rag_result": "match",
        "collection": "comfort_soups"
      },
      "llm": "ollama",
      "model": "llama3.2:3b",
      "max_tokens": 500,
      "prompt": "You are a cooking expert. Use this context:\n\n{{rag_context}}\n\nAnswer concisely."
    },
    {
      "match": {
        "rag_result": "partial",
        "intent": "recipe"
      },
      "llm": "ollama",
      "model": "llama3.2:3b",
      "max_tokens": 500,
      "prompt": "You are a helpful assistant. Use this context:\n\n{{rag_context}}"
    },
    {
      "match": {
        "intent": "general"
      },
      "llm": "ollama",
      "model": "llama3.2:3b",
      "max_tokens": 100,
      "prompt": "You are a friendly chatbot. Keep responses brief."
    }
  ]
}
```

**Match Clauses**:
- Sequential first-match pattern (order matters!)
- Available fields: `intent`, `service`, `collection`, `rag_result`
- First rule where all specified fields match wins

**Template Variables**:
- `{{rag_context}}`: Formatted RAG documents
- `{{intent}}`: Detected intent
- `{{topic}}`: Current topic
- `{{service.prompt}}`: Service-level prompt (if any)
- Nested paths: `{{metadata.display_name}}`

### **Configuration Path Resolution**

Multiple ways to specify config file location:

1. **CLI argument**: `--config /path/to/config.json`
2. **Environment variable**: `FLEX_CHAT_CONFIG_FILE=/path/to/config.json`
3. **Environment variable (alt)**: `FLEX_CHAT_CONFIG_FILE_PATH=/path/to/config.json`
4. **Directory env var**: `FLEX_CHAT_CONFIG_DIR=/path/to/dir` (looks for config.json)
5. **Default**: `./config/config.json` (from current working directory)

### **Example Configurations**

See `config/examples/`:
- `01-chat-only.json` - Simple chat without RAG
- `02-single-rag-dynamic.json` - Single RAG service with dynamic collections
- `03-single-rag-pinned.json` - Single RAG service with pinned collection
- `04-multi-rag-multi-llm.json` - Complex: multiple services, LLMs, intents

---

## API Endpoints

### **Chat Endpoints**

**`POST /chat/api`**
- Main chat endpoint
- Body: `{ prompt, previousMessages, selectedCollections, topic }`
- Returns: `{ response, status, topic, service, model }`

### **Collection Management**

**`GET /api/collections`**
- List all collections from all RAG services
- Returns: `{ collections, wrappers }`

**`GET /api/ui-config`**
- Get complete UI configuration (collections + wrappers + model selection)
- Returns: `{ collections, wrappers, modelSelection }`

**`POST /api/collections`**
- Create new collection
- Body: `{ name, metadata, service }`
- Requires: `service` parameter to specify which RAG service

**`POST /api/collections/:name/documents`**
- Add documents to collection
- Body: `{ documents: [...], service }`

**`PUT /api/collections/:name/metadata`**
- Update collection metadata
- Body: `{ metadata, service }`

**`DELETE /api/collections/:name?service=X`**
- Delete collection
- Requires: `service` query parameter

### **Health Check**

**`GET /health`**
- Returns server status, version, loaded providers

---

## Key Design Decisions

### **1. Simplified Linear Flow**

**Why**: Previous strategy-based architecture was complex and hard to reason about.

**v2.0 Approach**:
- Linear 4-phase flow: Topic → RAG → Profile → Response
- Each phase has single responsibility
- Predictable execution path
- Easier to debug and extend

### **2. Topic-First Approach**

**Why**: Topic provides valuable context for both RAG queries and LLM responses.

**Benefits**:
- RAG queries use normalized topic (better results)
- Topic tracking across conversation enables context awareness
- User can see and potentially override topic (future feature)
- Topics stored with messages for historical context

### **3. Threshold-Based RAG Classification**

**Why**: Simple distance thresholds are intuitive and configurable.

**Three-tier system**:
- **Match** (`< match_threshold`): High confidence, use immediately
- **Partial** (`< partial_threshold`): Candidate, needs intent detection
- **None** (`≥ partial_threshold`): Not relevant, pure intent detection

**Benefits**:
- Clear decision boundaries
- Per-collection threshold configuration
- Avoids complex multi-stage logic

### **4. Profile Object Pattern**

**Why**: Canonical data structure for passing context through phases.

**Contents**:
```javascript
{
  intent: string,           // Primary classification
  service: string,          // RAG service used (if any)
  collection: string,       // Collection matched (if any)
  documents: Array,         // RAG context documents
  rag_result: string,       // "match" | "partial" | "none"
  metadata: Object,         // Collection metadata
  // ... extensible for future features
}
```

**Benefits**:
- Single source of truth
- All downstream logic uses same data structure
- Easy to log and debug
- Extensible without breaking changes

### **5. Collection Management in Chat**

**Why**: Users need to manage collections without restarting server.

**Features**:
- Dynamic collection creation/deletion via API
- Metadata (display names, descriptions) for better UX
- Pinned collections (config-level) vs dynamic (runtime)
- Multi-service support (multiple RAG backends)

### **6. Provider Abstraction**

**Why**: Support multiple AI providers without changing core logic.

**Architecture**:
- Base classes define interface (`AIProvider`, `RetrievalProvider`)
- Concrete implementations (OpenAIProvider, OllamaProvider)
- Registry pattern for discovery
- Health checks and validation

**Benefits**:
- Easy to add new providers
- Swap providers without code changes (config only)
- Fallback and redundancy support

---

## State Management

### **Frontend State**
- **React state**: Current chat session, UI interactions
- **localStorage**: Message history (last 50), topic, sidebar preferences
- **API state**: Collections, wrappers, UI config (fetched on load)

### **Backend State**
- **Stateless API design**: Each request is independent
- **Configuration**: Loaded at startup, immutable during runtime
- **Providers**: Initialized once, reused across requests

### **Persistence**
- **ChromaDB**: Persistent vector database storage
- **LocalStorage**: Browser-side chat history
- **Future**: Backend chat history with database storage

---

## Error Handling

### **Network Errors**
- Retry with exponential backoff (frontend)
- Rate limit detection (429 responses)
- User-friendly error messages

### **Provider Failures**
- Health checks on initialization
- Validation of provider configuration
- Graceful error responses

### **RAG Errors**
- Handle missing collections
- Handle embedding failures
- Fall back to no-RAG mode when RAG unavailable

### **Configuration Errors**
- JSON schema validation (future)
- Helpful error messages with suggestions
- Exit on startup if critical config invalid

---

## Performance Considerations

### **RAG Query Optimization**
- Parallel collection queries where possible
- Short-circuit on first MATCH found
- Caching potential (future)

### **LLM Call Optimization**
- Intent detection skipped when RAG MATCH found
- Configurable max_tokens per response rule
- Conversation history truncation (last N messages)

### **Frontend Optimization**
- Single UI config fetch on load
- LocalStorage for offline message viewing
- Lazy loading of collection details

### **Memory Management**
- Provider instances reused across requests
- Message history capped at 50 (localStorage)
- Previous messages limited to last 4-6 turns

---

## Security Considerations

### **API Keys**
- Environment variable substitution in config
- Never commit .env files
- Separate .env files per service

### **CORS**
- Currently allows all origins (development)
- Production: Configure specific domains

### **Input Validation**
- Request body validation in endpoints
- Collection name validation (ChromaDB rules)
- Sanitization of user inputs

### **Authentication** (Future)
- No authentication currently
- Production deployment should add auth layer
- Consider API keys or OAuth

---

## Testing Strategy

### **Current State**
- Manual testing completed ✅
- Automated tests TODO

### **Testing Priorities**
1. **Unit Tests**:
   - Topic detection logic
   - RAG threshold classification
   - Profile building (match/partial/none scenarios)
   - Response rule matching
   - Template variable substitution

2. **Integration Tests**:
   - Full 4-phase flow with mocks
   - Collection CRUD operations
   - Multiple RAG services
   - Error scenarios

3. **E2E Tests** (Optional):
   - Real services validation
   - UI interactions
   - Performance testing

### **Mocking Strategy**
- Mock LLM responses (avoid API calls in tests)
- Mock RAG query results
- Mock provider health checks
- Test the flow logic, not external services

---

## Future Enhancements

### **Streaming Responses** (Planned)
- Server-Sent Events (SSE) for real-time streaming
- Reasoning model "thinking" phase visibility
- Progress indicators ("Detecting topic...", "Searching knowledge...")
- See `TODO.md` for detailed implementation plan

### **Source Attribution** (Planned)
- Format RAG context with collection headers
- Enable LLM citations ("According to X collection...")
- Clickable citations in UI
- See `TODO.md` for format options and implementation plan

### **Topic Interaction** (Planned)
- Edit and resubmit with topic override
- Conversation branching on topic edit
- Topic change visualization
- Topic history timeline

### **Advanced RAG Features**
- Hybrid search (semantic + keyword)
- Query expansion and rewriting
- Re-ranking strategies
- Citation extraction and display

### **Chat History Management**
- Backend persistence (DB storage)
- LLM-based summarization for long conversations
- Conversation search and filtering
- Export conversations

### **Additional Providers**
- Google Gemini provider
- Anthropic Claude provider
- Azure OpenAI provider
- Additional vector databases (Pinecone, Qdrant, etc.)

---

## Dependencies

### Frontend
```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "react-markdown": "^9.0.1",
  "tailwindcss": "^3.4.15"
}
```

### Chat API
```json
{
  "express": "^4.21.1",
  "commander": "^12.1.0",
  "dotenv": "^16.4.5",
  "axios": "^1.7.7"
}
```

### RAG Service
```
fastapi==0.115.5
chromadb==0.5.20
openai==1.54.4
pydantic==2.10.2
```

---

## Deployment Considerations

### **Development**
- Frontend: `npm run dev` (Vite dev server, port 3000)
- Chat API: `npm start` (Express, port 5005)
- RAG Service: `uvicorn server:app --reload` (FastAPI, port 5006)

### **Production** (Future)
- Containerization with Docker
- Environment-specific configurations
- Reverse proxy (nginx) for routing
- SSL/TLS certificates
- Monitoring and logging
- Database backups (ChromaDB)
- Load balancing for scale

### **OpenShift/Kubernetes** (Planned)
- Deployment manifests
- ConfigMaps for configuration
- Secrets for API keys
- Persistent volumes for ChromaDB
- Health checks and probes

---

## Common Issues & Solutions

### Configuration Issues
- **"Configuration error: ..."**: Check JSON syntax, ensure all required fields present
- **"AI provider not found"**: Verify provider name matches registered providers
- **"Service name is required"**: Collection operations need explicit `service` parameter

### Connection Issues
- **Frontend can't connect**: Check proxy config, ensure backend on port 5005
- **RAG service unreachable**: Verify Python service running on port 5006
- **"Failed to initialize RAG service"**: Check ChromaDB directory permissions

### RAG Issues
- **"No collections yet"**: Create collections via Collections page
- **No RAG results**: Check collection has documents, verify embedding model matches
- **High distances**: Try different embedding model or check document relevance

### Provider Issues
- **"Provider health check failed"**: Verify API keys, check provider endpoints
- **"Model not available"**: Check model name, verify provider supports model

---

## Additional Resources

- **[CHANGELOG.md](../CHANGELOG.md)**: Version history and changes
- **[TODO.md](../TODO.md)**: Planned features and improvements
- **[CONFIGURATION.md](CONFIGURATION.md)**: Detailed configuration guide
- **[COLLECTION_MANAGEMENT.md](COLLECTION_MANAGEMENT.md)**: Collection management guide
- **[RETRIEVAL_PROVIDERS.md](RETRIEVAL_PROVIDERS.md)**: RAG provider documentation
- **[REASONING_MODELS.md](REASONING_MODELS.md)**: Reasoning models (legacy, needs update)

---

## Version History

- **v2.0.0** (2025-10-19): Simplified architecture with 4-phase flow
- **v1.x**: Strategy-based architecture (deprecated)

For detailed changes, see [CHANGELOG.md](../CHANGELOG.md).
