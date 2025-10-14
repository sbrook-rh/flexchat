# Chat Starter - TODO List

## Configuration System
- [x] Design strategy-based configuration structure
- [x] Create JSON schema for configuration validation
- [x] Create example configurations for different use cases
- [x] Document configuration system
- [x] Hybrid embedding configuration (specify model in config.json, credentials in .env)
- [x] Support environment variable substitution in config files
- [ ] Add configuration validation at runtime (JSON schema validation)
- [ ] Interactive configuration wizard CLI (setup config.json and rag/.env)
  - [ ] Auto-detect local Ollama instance and available models
  - [ ] Guide user through provider selection and API key setup
  - [ ] Configure embedding providers and models
  - [ ] Set up initial strategies and knowledge bases

## AI Provider Abstraction
- [x] Create AI provider abstraction layer supporting multiple services (OpenAI, Ollama, etc.)
- [x] Implement model discovery - query available models from each provider
- [x] Build configuration system for provider selection and model choice
- [x] Create new chat server.js using AI provider abstraction
- [x] Add detection_provider configuration for LLM-based intent classification
- [x] Update documentation to reflect new multi-provider capabilities

## Retrieval Providers (RAG)
- [x] Create retrieval provider abstraction layer
- [x] Implement ChromaDB wrapper provider
- [x] Support for multiple knowledge bases
- [x] Multi-provider embedding support (OpenAI, Gemini, Ollama)
- [x] Create new RAG server.py with multi-provider embedding support
- [x] Add distance-based relevance scoring with cosine distance
- [x] Store embedding provider/model in collection metadata
- [ ] Support for additional vector databases (Milvus, Postgres/pgvector)
- [ ] Create additional ChromaDB direct provider (no Python wrapper)

## Architecture Improvements
- [x] Design provider interface with common methods (chat, embeddings, model list)
- [x] Create provider registry for easy addition of new services
- [x] Implement provider-specific configuration schemas
- [x] Add provider health checks and fallback mechanisms
- [x] Design strategy detection flow (RAG-first, LLM fallback)
- [x] Implement multi-stage RAG detection with fallback thresholds
- [x] Dynamic collection support (UI-created collections)
- [x] Unified response generation system

## Provider Implementations
- [x] OpenAI provider (chat + embeddings)
- [x] Google Gemini provider (chat + embeddings)
- [x] Ollama provider (chat + embeddings)
- [ ] Anthropic Claude provider (future)
- [ ] Azure OpenAI provider (future)

## Chat Server Implementation
- [x] Create new server.js with strategy-based routing
- [x] Implement RAG detection (query knowledge bases in order)
- [x] Implement LLM detection (single query with detection_provider)
- [x] Implement multi-stage detection with fallback logic
- [x] Support static response fallback
- [x] Handle context injection for RAG strategies
- [x] Support for dynamic collections (created via UI)
- [x] Add collection management API endpoints
- [x] Implement fallback_threshold for RAG candidate detection
- [x] Combine context from multiple selected collections (when all are candidates)
- [x] Add proper error handling throughout
- [x] Update package.json dependencies
- [ ] Backend chat history management (optional feature)
  - [ ] Create chat history storage abstraction (database/file-based)
  - [ ] Implement database provider (SQLite/PostgreSQL/MongoDB)
  - [ ] Implement file-based provider (JSON/JSONL)
  - [ ] Add configuration option to enable/disable backend storage
  - [ ] Update /chat endpoint to store incoming message and load context from storage
  - [ ] Add conversation management API (list, search, delete, export conversations)
  - Flow: Frontend sends message → Backend stores it → Backend loads context → Backend responds
  - Frontend saves both user message and AI reply to localStorage only after successful response
- [ ] LLM-based chat history summarization
  - [ ] Detect when conversation exceeds token limit
  - [ ] Summarize older messages while preserving chronological order
  - [ ] Maintain precedence and context of important statements
  - [ ] Keep recent messages unsummarized for context continuity
  - [ ] Store both original and summarized versions

## RAG Service Implementation
- [x] Create new server.py with multi-provider embedding support
- [x] Support multiple knowledge bases (collections)
- [x] Implement embedding generation via AI providers (OpenAI, Gemini, Ollama)
- [x] Add distance-based relevance scoring
- [x] Store embedding provider/model in collection metadata
- [x] Add health check endpoint
- [x] Use cosine distance for text embeddings
- [x] Add proper error handling and validation
- [ ] Support multiple vector database types (currently ChromaDB only)
- [ ] Advanced document ingestion pipeline
  - [ ] PDF document parsing and chunking
  - [ ] HTML/web page extraction and cleaning
  - [ ] URL fetching and content extraction
  - [ ] Microsoft Word (.docx) support
  - [ ] Markdown file parsing with structure preservation
  - [ ] Smart chunking with semantic boundaries
  - [ ] Metadata extraction (title, author, date, etc.)
  - [ ] Duplicate detection and deduplication
  - [ ] Bulk upload API endpoint
  - [ ] Progress tracking for large uploads

## Frontend Updates
- [x] Update Chat.jsx to work with new backend API
- [x] Add model selection UI
- [x] Add Clear Chat button
- [x] Fix scrolling with fixed sidebars
- [x] Add dynamic collection management UI (Collections page)
- [x] Smart JSON document parsing (arrays, Q&A format, etc.)
- [ ] Integrate with backend chat history (optional, when configured)
  - [ ] Update Chat.jsx to save messages to localStorage only after successful AI response
  - [ ] Display user message optimistically (before backend response)
  - [ ] On successful response: save both user message and AI reply to localStorage
  - [ ] On error: user message not saved, chat state preserved for retry
  - [ ] Add conversation list/selection UI (load from backend)
  - [ ] Add conversation search and filtering
  - [ ] Add conversation delete/export functionality
- [ ] Enhanced document upload UI
  - [ ] Support PDF, HTML, Word, Markdown file uploads
  - [ ] Show upload progress for large files
  - [ ] Preview document chunks before ingestion
  - [ ] URL input for web page ingestion
- [ ] Add configuration management UI (future)
- [ ] Add strategy selection/management UI (future)

## Testing & Validation
- [x] Test chat-only configuration (manual)
- [x] Test RAG-only configuration (LLM fallback) (manual)
- [x] Test dynamic collections with various embedding providers (manual)
- [ ] Test RAG-only configuration (static fallback) (manual)
- [ ] Test multi-domain configuration (manual)

### Automated Testing (HIGH PRIORITY)
- [x] Set up testing framework (Jest for Node.js)
  - [x] Configure Jest with coverage reporting
  - [x] Add test scripts (test, test:watch, test:coverage)
  - [x] Refactor server.js to export functions for testing
  - [x] Create comprehensive test plan (60+ test cases outlined)
  - [x] Create example test patterns with full documentation
- [ ] Unit Tests - AI Provider Abstraction
  - [ ] Test each provider interface (OpenAI, Gemini, Ollama)
  - [ ] Test model discovery
  - [ ] Test health checks
  - [ ] Test error handling and retries
- [ ] Unit Tests - Retrieval Providers
  - [ ] Test ChromaDB wrapper provider
  - [ ] Test query functionality
  - [ ] Test collection management
  - [ ] Test embedding generation
- [ ] Unit Tests - Strategy Detection (with mocked LLM/RAG)
  - [x] Test detectStrategyWithDynamicCollections with mock provider responses
  - [ ] Test detectStrategyWithRAG with mock retrieval results
  - [ ] Test detectStrategyWithLLM with mock LLM responses
  - [x] Test multi-candidate collection and combination logic (THE BUG WE FIXED!)
  - [x] Test threshold logic (lower, upper/fallback)
  - [x] Test edge cases (immediate match, no matches, multiple candidates)
  - [ ] Test remaining edge cases (errors, missing metadata, etc.)
- [ ] Integration Tests - Full Chat Flow (with mocked LLM/RAG)
  - [ ] Test chat-only flow (no RAG)
  - [ ] Test RAG immediate match (distance < lower threshold)
  - [ ] Test RAG with LLM fallback (lower < distance < upper threshold)
  - [ ] Test multiple selected collections with combined context
  - [ ] Test LLM-only intent detection
  - [ ] Test default fallback
  - [ ] Test static response strategies
  - [ ] Test error scenarios (provider down, rate limits, timeouts)
- [ ] Integration Tests - Collection Management
  - [ ] Test collection creation via API
  - [ ] Test document upload (JSON, plain text)
  - [ ] Test collection listing and deletion
  - [ ] Test embedding consistency
- [ ] End-to-End Tests (optional, with real services)
  - [ ] Test with actual Ollama instance
  - [ ] Test with actual ChromaDB
  - [ ] Test full user workflow
- [ ] Performance/Load Testing
  - [ ] Test concurrent requests
  - [ ] Test large document uploads
  - [ ] Test query performance with large collections

## Documentation
- [x] Create CONFIGURATION.md with practical guide
- [x] Create comprehensive example configurations
- [x] Create RAG service README
- [x] Document hybrid embedding configuration approach
- [x] Update CONTEXT.md
- [x] Update main README.md
- [x] Update API_REFERENCE.md
- [ ] Add deployment guide for OpenShift/Kubernetes
- [ ] Document environment variable substitution examples

## Deployment
- [x] Create .gitignore entry for config/config.json
- [x] Create example .env files
- [x] Add health check endpoints
- [ ] Document ConfigMap setup for OpenShift
- [ ] Document secrets management best practices
- [ ] Add readiness/liveness probes for Kubernetes

## Future Enhancements
- [ ] Tool calling support (function calling)
- [ ] Advanced RAG features (hybrid search, query expansion, reranking)
- [ ] Multiple vector database support (Milvus, Postgres/pgvector, Pinecone, Weaviate)
- [ ] Performance monitoring and metrics (Prometheus, Grafana)
- [ ] Automatic embedding model compatibility checking
- [ ] Collection search/filtering in UI
- [ ] Bulk collection operations (import/export)
- [ ] Advanced collection metadata editing
- [ ] Collection versioning and rollback
- [ ] Multi-user support with authentication
- [ ] Rate limiting per user/API key
- [ ] Caching layer for frequent queries
- [ ] Streaming responses with progressive context loading
- [ ] GraphQL API alternative
- [ ] WebSocket support for real-time updates
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)

## Summary

### ✅ Core System Complete
The chat system is fully functional with:
- Multi-provider AI support (OpenAI, Gemini, Ollama)
- Dynamic RAG with fallback detection
- UI-based collection management
- Hybrid embedding configuration
- Comprehensive documentation

### 🚧 Remaining Work
- Additional provider implementations (Claude, Azure)
- Formal test suites
- Kubernetes deployment documentation
- Advanced features (listed above)

### 🎯 Production Ready
The system is production-ready for:
- Chat-only deployments
- RAG with dynamic collections
- Multi-strategy configurations
- Multiple AI provider setups
