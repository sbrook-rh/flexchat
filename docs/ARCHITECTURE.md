# Chat Starter - Architecture Overview

## System Vision

A flexible, configurable chat system that can be adapted for different use cases:

### **Core Philosophy**
- **Simple base**: Forward requests to any AI model service (OpenAI, Gemini, Ollama, etc.)
- **Optional RAG**: Add knowledge base retrieval capabilities when needed
- **Configurable everything**: External configuration files, not hardcoded logic
- **One thing at a time**: Build incrementally, don't solve everything at once

### **System Layers**

```
Frontend (React) → Chat API (Node.js) → AI Provider Abstraction → Model Services
                                    ↓
                              RAG Service (Optional) → Vector Database
```

## Application Structure

This is a generic chat application with AI-powered responses, built with a microservices architecture:

```
Frontend (React) → Chat API (Node.js) → RAG Service (Python/FastAPI) → ChromaDB
                                    ↓
                               AI Provider Abstraction → OpenAI/Gemini/Ollama
```

## System Components

### **1. Core Chat System**
- **Purpose**: Simple request forwarding to AI model services
- **Configurable options**: max_tokens, chat history handling, model selection
- **AI Provider Abstraction**: Support for OpenAI, Gemini, Ollama, etc.
- **Location**: `backend/ai-providers/`

### **2. Optional RAG Layer**
- **Purpose**: Add knowledge base retrieval capabilities
- **Configurable**: One or more knowledge bases in vector databases
- **Intent Detection**: Configurable via prompt lines and thresholds
- **Location**: `backend/rag/` (existing) + `backend/ai-providers/intent/` (new)

### **3. Frontend Interface**
- **Purpose**: Chat interface for user interaction
- **Current**: Handles chat history in localStorage
- **Future**: Backend might handle chat history (configurable)
- **Location**: `frontend/`

## Service Details

### Frontend (Port 3000)
- **Technology**: React 18.3.1 with Tailwind CSS
- **Location**: `frontend/`
- **Key Files**:
  - `src/App.jsx` - Main app with routing (simplified to just chat)
  - `src/Chat.jsx` - Core chat component with message handling and retry logic
  - `src/Chat.css` - Chat-specific styling
  - `src/LogoSection.jsx` - Configurable logo/branding component
  - `src/NavBar.jsx` - Simplified navigation (Home/Chat only)
  - `src/setupProxy.js` - Proxies `/chat/api` to backend on port 5005

### Chat API (Port 5005)
- **Technology**: Node.js with Express
- **Location**: `backend/chat/`
- **Key Files**:
  - `server.js` - Main API with configurable intent detection and response generation
- **Key Features**:
  - AI Provider abstraction for multiple model services
  - Configurable intent detection (via external config)
  - Optional RAG integration for knowledge queries
  - Rate limiting with exponential backoff

### RAG Service (Port 5006)
- **Technology**: Python with FastAPI
- **Location**: `backend/rag/`
- **Key Files**:
  - `server.py` - FastAPI service for knowledge base queries
  - `load_data.py` - Script to load knowledge base into ChromaDB
  - `knowledge_base.json` - Sample knowledge base data
- **Key Features**:
  - ChromaDB vector database integration
  - Configurable embedding providers
  - Distance-based relevance scoring

## Data Flow

### **Simple Chat Mode** (No RAG)
1. **User sends message** → Frontend `Chat.jsx`
2. **Frontend calls** → `/chat/api` (proxied to port 5005)
3. **Chat API** → Forwards to AI Provider (OpenAI/Gemini/Ollama)
4. **AI Provider** → Returns response to Chat API
5. **Chat API** → Returns response to Frontend
6. **Frontend displays** → Message in chat UI

### **RAG-Enabled Mode** (With Knowledge Base)
1. **User sends message** → Frontend `Chat.jsx`
2. **Frontend calls** → `/chat/api` (proxied to port 5005)
3. **Chat API** → Configurable intent detection (via external config)
4. **If KNOWLEDGE intent** → Calls RAG service on port 5006
5. **RAG service** → Queries vector database with embeddings
6. **RAG returns** → Relevant context to Chat API
7. **Chat API** → Sends context + conversation to AI Provider
8. **AI Provider** → Returns response to Chat API
9. **Chat API** → Returns response to Frontend
10. **Frontend displays** → Message in chat UI

## Configuration System

### **External Configuration Files**
- **Intent Detection**: `config/intents.yaml` - Configurable intent types, prompts, and thresholds
- **RAG Settings**: `config/rag.yaml` - Knowledge base configurations and retrieval settings
- **AI Providers**: `config/providers.yaml` - Model service configurations
- **Use Case Examples**: `config/examples/` - Pre-configured setups for different scenarios

### **Configuration Philosophy**
- **External configs**: No hardcoded logic in code
- **YAML-based**: Human-readable and easy to modify
- **Example configs**: Documented examples for common use cases
- **Environment overrides**: Environment variables can override config values

### **Configuration Structure**

The system uses a single configuration file with three main sections:

#### **1. Providers Configuration**
```json
{
  "providers": {
    "openai": {
      "type": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1"
    },
    "ollama": {
      "type": "ollama",
      "base_url": "http://localhost:11434"
    }
  }
}
```

#### **2. Knowledge Bases Configuration**
```json
{
  "knowledge_bases": {
    "openshift": {
      "type": "chromadb",
      "url": "http://localhost:5006",
      "collection": "openshift_docs",
      "embedding_provider": "openai",
      "embedding_model": "text-embedding-3-small"
    }
  }
}
```

#### **3. Strategies Configuration**
```json
{
  "detection_provider": {
    "provider": "openai",
    "model": "gpt-3.5-turbo"
  },
  "strategies": [
    {
      "name": "OPENSHIFT",
      "detection": {
        "type": "rag",
        "knowledge_base": "openshift",
        "threshold": 0.2,
        "fallback_threshold": 0.45,
        "description": "if it's about Red Hat OpenShift..."
      },
      "response": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "max_tokens": 400,
        "system_prompt": "You are an expert..."
      }
    },
    {
      "name": "GENERAL",
      "detection": {
        "type": "default"
      },
      "response": {
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "max_tokens": 50,
        "system_prompt": "Provide a brief, polite response..."
      }
    }
  ]
}
```

#### **Detection Types**

**RAG Detection (`"rag"`)**
- Queries knowledge base directly
- If distance < threshold → strategy detected immediately
- If fallback_threshold specified and distance in range → include in LLM detection
- If distance > fallback_threshold → exclude from LLM detection

**LLM Detection (`"llm"`)**
- Included in single LLM intent detection query
- Uses description field in prompt

**Default (`"default"`)**
- Catch-all strategy when nothing else matches
- No detection needed

### **RAG Configuration**
```yaml
# Example: config/rag.yaml
knowledge_bases:
  - name: "main"
    vector_db: "chromadb"
    collection: "knowledge_base"
    embedding_model: "text-embedding-3-small"
    retrieval:
      top_k: 3
      confidence_threshold: 0.45
```

### Environment Variables

**Chat API** (`backend/chat/.env`):
- `AI_PROVIDER` - Which AI provider to use (openai, ollama, etc.)
- `AI_PROVIDER_API_KEY` - API key for the selected provider
- `INTENT_CONFIG_PATH` - Path to intent configuration file
- `RAG_CONFIG_PATH` - Path to RAG configuration file

**RAG Service** (`backend/rag/.env`):
- `EMBEDDING_PROVIDER` - Which embedding provider to use
- `EMBEDDING_API_KEY` - API key for embeddings

## Key Design Decisions

### **Configuration-First Approach**
- **External configs**: All behavior controlled by YAML configuration files
- **No hardcoded logic**: Intent detection, response strategies, and thresholds are configurable
- **Example-driven**: Documented configuration examples for common use cases
- **Environment overrides**: Environment variables can override config values

### **Flexible Intent Detection**
- **Configurable strategies**: Hybrid (ChromaDB + AI), AI-only, or skip detection
- **Configurable thresholds**: Distance thresholds defined in config, not code
- **Configurable prompts**: Intent detection prompts defined in config
- **Dynamic intent types**: Easy to add new intent types via configuration

### **AI Provider Abstraction**
- **Multiple providers**: Support for OpenAI, Gemini, Ollama, etc.
- **Unified interface**: Same API regardless of underlying provider
- **Model discovery**: Dynamic model listing and selection
- **Health monitoring**: Provider health checks and fallback

### **Optional RAG Layer**
- **Configurable retrieval**: One or more knowledge bases via configuration
- **Multiple vector DBs**: Support for different vector database backends
- **Configurable embeddings**: Different embedding providers and models
- **Intent-driven**: RAG only used when configured intent is detected

### Error Handling
- **Rate limiting**: Exponential backoff with retry logic
- **Network errors**: Graceful degradation with user-friendly messages
- **API failures**: Fallback responses when services unavailable
- **Provider fallback**: Switch to backup providers if primary fails

### State Management
- **Frontend**: React state + localStorage for message persistence (current)
- **Backend**: Stateless API design
- **Knowledge**: Persistent vector database storage
- **Future**: Backend chat history management (configurable)

## Use Case Examples

### **1. Simple Chat Bot** (No RAG)
- **Configuration**: `config/examples/chat-only.yaml`
- **Intent Detection**: Skip detection, all queries go to GENERAL
- **Response**: Simple conversational responses
- **Use Case**: Generic chatbot, customer service, general Q&A

### **2. RAG-Only Bot** (On-Topic Focus)
- **Configuration**: `config/examples/rag-only.yaml`
- **Intent Detection**: Hybrid (ChromaDB + AI fallback)
- **Response**: KNOWLEDGE gets full RAG treatment, GENERAL gets short "off-topic" response
- **Use Case**: Domain-specific knowledge base, technical documentation

### **3. RAG + Chat Bot** (Flexible)
- **Configuration**: `config/examples/rag-and-chat.yaml`
- **Intent Detection**: Hybrid for KNOWLEDGE, AI-only for GENERAL
- **Response**: KNOWLEDGE uses RAG, GENERAL gets full conversational response
- **Use Case**: Mixed use cases, customer support with knowledge base

### **4. Multi-Provider Bot** (Future)
- **Configuration**: `config/examples/multi-provider.yaml`
- **AI Providers**: Multiple providers with fallback
- **Use Case**: High availability, cost optimization, different models for different intents

## Customization Points

### **Configuration-Based Customization**:
1. **Intent types**: Add new intents via `config/intents.yaml`
2. **Response strategies**: Configure response types and prompts
3. **AI providers**: Switch between OpenAI, Ollama, Gemini, etc.
4. **Knowledge bases**: Configure multiple vector databases
5. **Thresholds**: Adjust detection and retrieval thresholds

### **Code-Based Customization**:
1. **UI styling**: Update `Chat.css` and Tailwind classes
2. **Frontend logic**: Modify React components
3. **New response types**: Add new response strategies (e.g., tool calling)
4. **New providers**: Add new AI provider implementations

### **For Production**:
1. **Environment variables**: Set production API keys and URLs
2. **Configuration files**: Use production-specific config files
3. **CORS**: Configure for production domains
4. **Logging**: Add proper logging and monitoring
5. **Security**: Add authentication if needed
6. **Scaling**: Consider containerization and load balancing

## Dependencies

### Frontend
- React 18.3.1, React Router, Axios, Tailwind CSS

### Chat API
- Express, Axios, dotenv, yaml (for config parsing)

### AI Provider Abstraction
- Axios (for HTTP requests), dotenv (for environment variables)

### RAG Service
- FastAPI, ChromaDB, OpenAI, Pydantic

## Future Enhancements

### **Tool Calling Support** (TODO)
- **Configuration**: Add tool calling intents and response strategies
- **Implementation**: Extend response generator to handle tool calls
- **Use Cases**: Function calling, API integrations, external service calls

### **Backend Chat History** (TODO)
- **Configuration**: Enable/disable backend chat history management
- **Features**: LLM-based conversation summarization, context optimization
- **Storage**: Database-backed conversation storage

### **Advanced RAG Features** (TODO)
- **Multiple Knowledge Bases**: Support for multiple vector databases
- **Hybrid Search**: Combine semantic and keyword search
- **Query Expansion**: Automatic query enhancement for better retrieval

## Common Issues & Solutions

1. **"AI_PROVIDER_API_KEY is not defined"** → Check `.env` files exist and have valid API keys
2. **"No relevant information found"** → Verify RAG service running and knowledge base loaded
3. **Frontend can't connect** → Check proxy configuration and backend services running
4. **Configuration errors** → Validate YAML configuration files
5. **Provider health issues** → Check AI provider health and fallback configuration
