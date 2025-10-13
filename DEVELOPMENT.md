# Development Guide

## Quick Start for Developers

### Prerequisites
- Node.js 18+
- Python 3.8+
- OpenAI API key

### Setup
```bash
./setup.sh  # Installs dependencies and creates .env files
```

### Run
```bash
./start.sh  # Starts all three services
```

## File Structure Deep Dive

```
chat-starter/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app - simplified routing
│   │   ├── Chat.jsx             # Core chat component
│   │   │                        # - Message state management
│   │   │                        # - API communication with retry logic
│   │   │                        # - Error handling and loading states
│   │   ├── Chat.css             # Tailwind-based chat styling
│   │   ├── LogoSection.jsx      # Configurable branding component
│   │   ├── NavBar.jsx           # Simple navigation (Home/Chat)
│   │   ├── setupProxy.js        # Development proxy configuration
│   │   ├── index.js             # React entry point
│   │   └── index.css            # Global styles with Tailwind
│   ├── package.json             # React dependencies
│   ├── tailwind.config.js       # Tailwind configuration
│   └── postcss.config.js        # PostCSS configuration
├── backend/
│   ├── chat/
│   │   ├── server.js            # Main chat API
│   │   │                        # - Intent detection (hybrid ChromaDB + OpenAI)
│   │   │                        # - Response generation based on intent
│   │   │                        # - Rate limiting and error handling
│   │   ├── package.json         # Node.js dependencies
│   │   └── env.example          # Environment variables template
│   └── rag/
│       ├── server.py            # FastAPI RAG service
│       │                        # - ChromaDB integration
│       │                        # - OpenAI embeddings
│       │                        # - Semantic search with distance scoring
│       ├── load_data.py         # Knowledge base loader
│       ├── knowledge_base.json  # Sample knowledge base data
│       ├── requirements.txt     # Python dependencies
│       └── env.example          # Environment variables template
├── README.md                    # User documentation
├── ARCHITECTURE.md              # Technical architecture overview
├── DEVELOPMENT.md               # This file - developer guide
├── setup.sh                     # Automated setup script
└── start.sh                     # One-command startup script
```

## Key Components Explained

### Frontend: Chat.jsx
**Purpose**: Main chat interface component
**Key State**:
- `messages` - Array of chat messages (persisted to localStorage)
- `input` - Current user input
- `isLoading` - Loading state for API calls
- `retryTracker` - Retry attempt counter for rate limiting

**Key Functions**:
- `handleSend()` - Sends message to API with retry logic
- Message persistence and error handling

### Backend: server.js
**Purpose**: Chat API with intent detection and response generation
**Key Functions**:
- `detectIntentHybrid()` - ChromaDB + OpenAI intent detection
- `generateRAGResponse()` - Knowledge base queries with context
- `generateGeneralResponse()` - Simple chat responses
- `generateSupportResponse()` - Help-focused responses

**Intent Categories**:
- `KNOWLEDGE` - Uses RAG service for knowledge base queries
- `GENERAL` - Simple conversational responses
- `SUPPORT` - Help and assistance focused responses

### RAG Service: server.py
**Purpose**: Knowledge base query service using vector embeddings
**Key Functions**:
- `query_db()` - Semantic search using OpenAI embeddings
- ChromaDB integration for vector storage
- Distance-based relevance scoring

## Development Workflow

### Making Changes

1. **Frontend Changes**:
   - Edit files in `frontend/src/`
   - React will hot-reload automatically
   - Test in browser at http://localhost:3000

2. **Backend Changes**:
   - Edit `backend/chat/server.js`
   - Restart chat service: `cd backend/chat && npm start`
   - Test API directly or through frontend

3. **RAG Service Changes**:
   - Edit `backend/rag/server.py`
   - Restart RAG service: `cd backend/rag && python server.py`
   - Test with: `curl -X POST http://localhost:5006/query -d '{"query":"test"}'`

### Adding New Features

1. **New Intent Category**:
   - Add detection logic in `detectIntentHybrid()`
   - Create response function (e.g., `generateNewIntentResponse()`)
   - Add case in main chat endpoint

2. **New Knowledge Base Content**:
   - Edit `knowledge_base.json`
   - Run `python load_data.py` to reload
   - Test with knowledge-based queries

3. **UI Changes**:
   - Modify `Chat.jsx` for functionality
   - Update `Chat.css` for styling
   - Use Tailwind classes for responsive design

## Debugging

### Common Debug Points

1. **API Communication**:
   - Check browser Network tab for API calls
   - Verify proxy configuration in `setupProxy.js`
   - Check backend logs for request/response

2. **Intent Detection**:
   - Add console.log in `detectIntentHybrid()`
   - Check ChromaDB distance scores
   - Verify OpenAI API responses

3. **RAG Service**:
   - Test direct API calls to port 5006
   - Check ChromaDB data with `collection.peek()`
   - Verify OpenAI embeddings are working

### Logging

- **Frontend**: Browser console for React logs
- **Chat API**: Terminal output with request/response logs
- **RAG Service**: Terminal output with query processing logs

## Testing

### Manual Testing Checklist

1. **Basic Chat**:
   - Send general message → Should get general response
   - Send knowledge question → Should use RAG service
   - Send help request → Should get support response

2. **Error Handling**:
   - Test with invalid API key → Should show error message
   - Test network disconnection → Should show retry logic
   - Test rate limiting → Should show retry attempts

3. **Persistence**:
   - Refresh page → Messages should persist
   - Close/reopen browser → Messages should persist

### API Testing

```bash
# Test chat API
curl -X POST http://localhost:5005/chat/api \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello", "previousMessages":[]}'

# Test RAG service
curl -X POST http://localhost:5006/query \
  -H "Content-Type: application/json" \
  -d '{"query":"test question", "top_k":3}'
```

## Production Considerations

### Environment Variables
- Set production API keys
- Configure production URLs for services
- Set appropriate logging levels

### Security
- Add CORS configuration for production domains
- Consider adding authentication if needed
- Validate and sanitize all inputs

### Performance
- Consider caching for frequently asked questions
- Optimize ChromaDB queries for large knowledge bases
- Add monitoring and health checks

### Deployment
- Containerize services with Docker
- Use environment-specific configurations
- Set up proper logging and monitoring
