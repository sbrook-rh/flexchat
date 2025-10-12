# Chat Starter

A generic, reusable chat application with AI-powered responses, intent detection, and RAG (Retrieval-Augmented Generation) capabilities.

## Features

- **Generic Chat Interface**: Clean, responsive React-based chat UI
- **Intent Detection**: Automatically categorizes user queries (Knowledge, General, Support)
- **RAG Integration**: Uses ChromaDB for knowledge base queries with OpenAI embeddings
- **Rate Limiting**: Built-in retry logic for API rate limits
- **Configurable**: Easy to customize for different use cases

## Architecture

```
Frontend (React) → Chat API (Node.js) → RAG Service (Python/FastAPI) → ChromaDB
                                    ↓
                               OpenAI API
```

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Python 3.8+
- OpenAI API key

### 2. Setup

1. **Clone and navigate to the project:**
   ```bash
   cd chat-starter
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd ../backend/chat
   npm install
   ```

4. **Install RAG service dependencies:**
   ```bash
   cd ../rag
   pip install -r requirements.txt
   ```

5. **Configure environment variables:**
   ```bash
   # Copy example files
   cp backend/chat/env.example backend/chat/.env
   cp backend/rag/env.example backend/rag/.env
   
   # Edit the .env files with your OpenAI API key
   ```

6. **Load knowledge base:**
   ```bash
   cd backend/rag
   python load_data.py
   ```

### 3. Run the application

1. **Start the RAG service:**
   ```bash
   cd backend/rag
   python server.py
   ```

2. **Start the chat API:**
   ```bash
   cd backend/chat
   npm start
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

4. **Open your browser to:** `http://localhost:3000`

## Configuration

### Environment Variables

#### Chat API (`backend/chat/.env`)
- `CHAT_API_KEY`: Your OpenAI API key
- `CHROMADB_URL`: URL of the RAG service (default: http://localhost:5006/query)
- `ASSISTANT_NAME`: Name of your AI assistant (default: "AI Assistant")
- `KNOWLEDGE_BASE_TOPIC`: Topic description for the knowledge base (default: "general information")

#### RAG Service (`backend/rag/.env`)
- `OPENAI_API_KEY`: Your OpenAI API key

### Customizing the Knowledge Base

1. Edit `backend/rag/knowledge_base.json` with your content
2. Run `python load_data.py` to reload the knowledge base

### Customizing the Assistant

1. Update environment variables in `backend/chat/.env`
2. Modify the system prompts in `backend/chat/server.js`
3. Update the frontend components as needed

## Project Structure

```
chat-starter/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── Chat.jsx         # Main chat component
│   │   ├── Chat.css         # Chat styling
│   │   ├── LogoSection.jsx  # Logo/branding component
│   │   ├── NavBar.jsx       # Navigation component
│   │   └── setupProxy.js    # API proxy configuration
│   ├── package.json
│   └── tailwind.config.js
├── backend/
│   ├── chat/                # Chat API service
│   │   ├── server.js        # Main chat API
│   │   ├── package.json
│   │   └── env.example
│   └── rag/                 # RAG service
│       ├── server.py        # FastAPI RAG service
│       ├── load_data.py     # Knowledge base loader
│       ├── knowledge_base.json
│       ├── requirements.txt
│       └── env.example
└── README.md
```

## API Endpoints

### Chat API (Port 5005)
- `GET /chat/api` - Health check
- `POST /chat/api` - Send chat message

### RAG Service (Port 5006)
- `GET /query` - Health check
- `POST /query` - Query knowledge base

## Customization Examples

### Different Use Cases

1. **Customer Support Bot:**
   - Set `ASSISTANT_NAME="Customer Support Bot"`
   - Set `KNOWLEDGE_BASE_TOPIC="product support and troubleshooting"`
   - Add support documentation to knowledge base

2. **Technical Documentation Assistant:**
   - Set `ASSISTANT_NAME="Technical Assistant"`
   - Set `KNOWLEDGE_BASE_TOPIC="technical documentation"`
   - Add technical docs to knowledge base

3. **Company FAQ Bot:**
   - Set `ASSISTANT_NAME="Company Assistant"`
   - Set `KNOWLEDGE_BASE_TOPIC="company policies and procedures"`
   - Add company information to knowledge base

## Troubleshooting

### Common Issues

1. **"CHAT_API_KEY is not defined"**
   - Make sure you've created `.env` files and added your OpenAI API key

2. **"No relevant information found in knowledge base"**
   - Check that the RAG service is running
   - Verify the knowledge base has been loaded
   - Check the ChromaDB connection

3. **Frontend can't connect to backend**
   - Ensure both services are running on the correct ports
   - Check the proxy configuration in `setupProxy.js`

## License

MIT License - feel free to use this as a starting point for your own projects!
