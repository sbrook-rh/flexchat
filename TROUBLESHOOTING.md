# Troubleshooting Guide

## Common Issues and Solutions

### Setup Issues

#### "Node.js is not installed"
**Error**: `command not found: node`
**Solution**: Install Node.js 18+ from [nodejs.org](https://nodejs.org/)

#### "Python 3 is not installed"
**Error**: `command not found: python3`
**Solution**: Install Python 3.8+ from [python.org](https://python.org/)

#### "pip3 is not installed"
**Error**: `command not found: pip3`
**Solution**: Install pip3 or use `python3 -m pip` instead

### Environment Issues

#### "CHAT_API_KEY is not defined"
**Error**: `Error: CHAT_API_KEY is not defined in environment variables`
**Solution**: 
1. Copy `backend/chat/env.example` to `backend/chat/.env`
2. Add your OpenAI API key: `CHAT_API_KEY=sk-your-key-here`

#### "OPENAI_API_KEY is not set"
**Error**: `❌ ERROR: OPENAI_API_KEY is not set in .env file!`
**Solution**:
1. Copy `backend/rag/env.example` to `backend/rag/.env`
2. Add your OpenAI API key: `OPENAI_API_KEY=sk-your-key-here`

### Service Connection Issues

#### "Network error. Please try again."
**Error**: Frontend shows network error
**Solutions**:
1. Check if chat API is running on port 5005
2. Verify proxy configuration in `frontend/src/setupProxy.js`
3. Check browser console for CORS errors

#### "No relevant information found in knowledge base"
**Error**: RAG service returns no results
**Solutions**:
1. Check if RAG service is running on port 5006
2. Verify knowledge base is loaded: `cd backend/rag && python load_data.py`
3. Check ChromaDB connection and data

#### "Error connecting to the AI"
**Error**: Chat API returns 500 error
**Solutions**:
1. Verify OpenAI API key is valid
2. Check API key has sufficient credits
3. Check network connectivity to OpenAI

### Port Issues

#### "Port 3000 is already in use"
**Error**: Frontend won't start
**Solutions**:
1. Kill process using port 3000: `lsof -ti:3000 | xargs kill`
2. Or change port in `frontend/package.json` scripts

#### "Port 5005 is already in use"
**Error**: Chat API won't start
**Solutions**:
1. Kill process using port 5005: `lsof -ti:5005 | xargs kill`
2. Or change port in `backend/chat/server.js`

#### "Port 5006 is already in use"
**Error**: RAG service won't start
**Solutions**:
1. Kill process using port 5006: `lsof -ti:5006 | xargs kill`
2. Or change port in `backend/rag/server.py`

### Dependency Issues

#### "Module not found" errors
**Error**: Various module not found errors
**Solutions**:
1. Run `./setup.sh` to install all dependencies
2. Or manually install:
   ```bash
   cd frontend && npm install
   cd backend/chat && npm install
   cd backend/rag && pip3 install -r requirements.txt
   ```

#### "ChromaDB connection failed"
**Error**: RAG service can't connect to ChromaDB
**Solutions**:
1. Check if `chroma_db` directory exists
2. Run `python load_data.py` to initialize database
3. Check file permissions for `chroma_db` directory

### Performance Issues

#### Slow responses
**Symptoms**: Chat responses take a long time
**Solutions**:
1. Check OpenAI API response times
2. Verify ChromaDB query performance
3. Check network latency
4. Consider reducing `top_k` parameter in RAG queries

#### High memory usage
**Symptoms**: Application uses too much memory
**Solutions**:
1. Limit conversation history length (currently 50 messages)
2. Optimize ChromaDB queries
3. Consider pagination for large knowledge bases

### API Issues

#### "Too many requests" errors
**Error**: 429 responses from OpenAI
**Solutions**:
1. Wait for rate limit to reset
2. Check OpenAI usage limits
3. Implement request queuing if needed
4. Consider using different OpenAI models

#### Invalid API responses
**Error**: Unexpected response format
**Solutions**:
1. Check OpenAI API key permissions
2. Verify model availability
3. Check request format and parameters

## Debugging Steps

### 1. Check Service Status
```bash
# Check if services are running
lsof -i :3000  # Frontend
lsof -i :5005  # Chat API
lsof -i :5006  # RAG service
```

### 2. Check Logs
```bash
# Start services individually to see logs
cd backend/rag && python server.py
cd backend/chat && npm start
cd frontend && npm start
```

### 3. Test API Endpoints
```bash
# Test chat API
curl -X GET http://localhost:5005/chat/api

# Test RAG service
curl -X GET http://localhost:5006/query

# Test chat with message
curl -X POST http://localhost:5005/chat/api \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

### 4. Check Environment Variables
```bash
# Check if .env files exist and have content
cat backend/chat/.env
cat backend/rag/.env
```

### 5. Verify Knowledge Base
```bash
# Check if knowledge base is loaded
cd backend/rag
python -c "import chromadb; client = chromadb.PersistentClient(path='./chroma_db'); collection = client.get_collection('knowledge_base'); print(collection.count())"
```

## Getting Help

### Check Logs
- Frontend: Browser console (F12)
- Chat API: Terminal where `npm start` is running
- RAG Service: Terminal where `python server.py` is running

### Common Log Messages
- `✅ OpenAI API key loaded` - API key is working
- `✅ ChromaDB initialized` - Database is ready
- `🎯 Detected intent: KNOWLEDGE` - Intent detection working
- `📊 Retrieved X results from ChromaDB` - RAG service working

### Error Patterns
- `❌ ERROR:` - Critical errors that stop the service
- `⚠️ Warning:` - Non-critical issues that might affect functionality
- `🔄` - Retry or fallback operations

If you're still having issues, check the logs for these patterns and include them when asking for help.
