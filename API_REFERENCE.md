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

## Integration Notes

### Frontend Integration
- Uses `fetch()` API for HTTP requests
- Implements retry logic for 429 responses
- Stores conversation history in localStorage
- Handles loading states and error messages

### Service Communication
- Chat API calls RAG service for KNOWLEDGE intents
- All services use JSON for data exchange
- CORS configured for localhost development
- Proxy configuration in `setupProxy.js` for development
