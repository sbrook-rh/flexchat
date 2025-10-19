# Flex Chat - TODO List

## 📋 About This Document

This document tracks **future work and improvements**. For completed features and changes, see [CHANGELOG.md](CHANGELOG.md).

**Current Version**: 2.0.0 (Simplified Architecture)  
**Branch**: `redesign/simplified-architecture`  
**Last Updated**: October 19, 2025

---

## 🎯 Immediate Priorities

### Manual Testing & Validation ✅
- [x] End-to-end testing with real services
  - [x] Test Ollama + ChromaDB integration
  - [x] Test OpenAI provider
  - [x] Test Gemini provider
  - [x] Test all collection CRUD operations
  - [x] Test topic persistence across sessions
  - [x] Test pinned vs dynamic collections
  - [x] Test multi-service RAG with different embeddings
- [ ] Performance testing
  - [ ] Concurrent requests
  - [ ] Large document uploads
  - [ ] Query performance with large collections
- [x] Load configuration from different sources
  - [x] Test CLI `--config` flag
  - [x] Test FLEX_CHAT_CONFIG_FILE
  - [x] Test FLEX_CHAT_CONFIG_DIR
  - [x] Test default config.json

**Status**: Core functionality validated manually. System working well!

### Documentation Updates
- [ ] Update main README.md
  - [ ] Add architecture overview
  - [ ] Document new 4-phase flow
  - [ ] Update getting started guide
  - [ ] Add environment variables section
- [ ] Update ARCHITECTURE.md
  - [ ] Document simplified flow
  - [ ] Add sequence diagrams
  - [ ] Document Profile object pattern
- [ ] Create deployment guide
  - [ ] OpenShift deployment
  - [ ] Kubernetes deployment
  - [ ] Docker compose setup
- [ ] Create troubleshooting guide
  - [ ] Common configuration errors
  - [ ] RAG service connection issues
  - [ ] Collection management problems

---

## 🧪 Automated Testing (NEXT PRIORITY)

**Note**: Manual testing complete and system validated. Now need to write comprehensive automated tests to ensure stability and enable confident refactoring.

**Important**: Existing tests in `backend/chat/__tests__/` are for the **old strategy-based architecture** and need to be replaced with tests for the new simplified 4-phase flow.

### Setup Required
- [ ] Archive or remove old strategy detection tests
- [ ] Update test README for new architecture
- [ ] Set up test framework for new flow

### Unit Tests
- [ ] Collection Management
  - [ ] `collection-manager.js` functions
  - [ ] ChromaDBWrapperProvider CRUD methods
  - [ ] Validation and error handling
- [ ] Topic Detection
  - [ ] Stateful topic tracking
  - [ ] Conversation context building
  - [ ] Topic change detection
  - [ ] Smart compression logic
- [ ] RAG Flow
  - [ ] Threshold-based classification
  - [ ] Metadata override logic
  - [ ] Service/collection selection
- [ ] Response Matching
  - [ ] Sequential pattern matching
  - [ ] Match clause evaluation
  - [ ] Variable substitution

### Integration Tests
- [ ] Full request flow
  - [ ] Chat-only flow
  - [ ] RAG match flow
  - [ ] RAG partial flow
  - [ ] Intent detection
  - [ ] Response generation with context
- [ ] Collection Management
  - [ ] Create collection via API
  - [ ] Upload documents
  - [ ] Update metadata
  - [ ] Delete collection
  - [ ] List collections
- [ ] Error scenarios
  - [ ] Provider down
  - [ ] Rate limits
  - [ ] Timeouts
  - [ ] Invalid configurations

---

## 🎨 Frontend Improvements

### UI Enhancements
- [ ] Model selection improvements
  - [ ] Add "(default)" label next to default models
  - [ ] Show which models were used in response
  - [ ] Add model selection presets
- [ ] Reasoning model features
  - [ ] Real-time indicators ("🧠 Analyzing..." / "💬 Generating...")
  - [ ] Expandable section for raw reasoning output
  - [ ] Show `<think>` tags in debug mode
- [ ] Collection management
  - [ ] Search/filter collections
  - [ ] Bulk operations (import/export)
  - [ ] Collection usage statistics
  - [ ] Advanced metadata editor

### User Experience
- [ ] Loading states and progress indicators
- [ ] Error boundaries and better error messages
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Dark mode toggle
- [ ] Customizable themes

---

## 🔧 Backend Enhancements

### Chat History Management
- [ ] Design chat history storage abstraction
- [ ] Implement storage providers
  - [ ] SQLite provider
  - [ ] PostgreSQL provider
  - [ ] MongoDB provider
  - [ ] File-based provider (JSON/JSONL)
- [ ] Add configuration option to enable/disable
- [ ] Create conversation management API
  - [ ] List conversations
  - [ ] Search conversations
  - [ ] Delete conversations
  - [ ] Export conversations
- [ ] Frontend integration
  - [ ] Conversation list UI
  - [ ] Search and filtering
  - [ ] Load from backend

### LLM-based Summarization
- [ ] Detect when conversation exceeds token limit
- [ ] Summarize older messages
- [ ] Preserve chronological order and context
- [ ] Keep recent messages unsummarized
- [ ] Store original and summarized versions

### Configuration Management
- [ ] JSON schema validation at runtime
- [ ] Interactive configuration wizard CLI
  - [ ] Auto-detect local Ollama
  - [ ] Guide through provider selection
  - [ ] Configure embedding providers
  - [ ] Set up initial responses
- [ ] Configuration validation improvements
  - [ ] Better error messages
  - [ ] Suggestions for fixes
  - [ ] Warnings for suboptimal settings

---

## 🔌 Provider Implementations

### AI Providers
- [x] OpenAI provider (chat + embeddings)
- [x] Google Gemini provider (chat + embeddings)
- [x] Ollama provider (chat + embeddings)
- [ ] Anthropic Claude provider
- [ ] Azure OpenAI provider
- [ ] Cohere provider
- [ ] Hugging Face provider

### Retrieval Providers
- [x] ChromaDB wrapper (with Python service)
- [ ] ChromaDB direct (native JS client)
- [ ] Milvus provider
- [ ] Postgres/pgvector provider
- [ ] Pinecone provider
- [ ] Weaviate provider
- [ ] Qdrant provider

---

## 📄 Advanced RAG Features

### Document Ingestion
- [ ] Advanced document parsing
  - [ ] PDF parsing and chunking
  - [ ] HTML/web page extraction
  - [ ] Microsoft Word (.docx)
  - [ ] Markdown with structure preservation
  - [ ] URL fetching
- [ ] Smart chunking
  - [ ] Semantic boundary detection
  - [ ] Overlap strategies
  - [ ] Size optimization
- [ ] Metadata extraction
  - [ ] Title, author, date
  - [ ] Custom metadata fields
- [ ] Deduplication
  - [ ] Content hash comparison
  - [ ] Semantic similarity check
- [ ] Bulk operations
  - [ ] Bulk upload API
  - [ ] Progress tracking
  - [ ] Error recovery

### Query Enhancement
- [ ] Hybrid search (keyword + vector)
- [ ] Query expansion
- [ ] Reranking strategies
- [ ] Multi-vector retrieval
- [ ] Contextual embeddings

---

## 🚀 Future Features

### Toolbox & Workspace System
Reusable "toolbox" templates creating specialized workspaces:
- [ ] Core architecture
  - [ ] Toolbox definition schema
  - [ ] Workspace data model
  - [ ] Tool framework and executor
  - [ ] Safety and approval system
- [ ] Built-in toolboxes
  - [ ] 🗃️ Database Explorer
  - [ ] 📧 Email Manager
  - [ ] 📄 Document Analyzer
  - [ ] 🖥️ System Admin

### Configuration Management UI
- [ ] Runtime config selection with presets
- [ ] Initial configuration wizard (no-config mode)
- [ ] Edit existing configuration with live preview
- [ ] Configuration versioning and rollback
- [ ] Import/export configurations
- [ ] Secrets management integration

### Performance & Monitoring
- [ ] Prometheus/Grafana integration
- [ ] Request tracing and logging
- [ ] Performance profiling
- [ ] Caching layer for queries
- [ ] Rate limiting per user/API key
- [ ] Query analytics and insights

### Platform Features
- [ ] Multi-user support with authentication
- [ ] Role-based access control (RBAC)
- [ ] Team workspaces
- [ ] API key management
- [ ] Usage quotas and billing
- [ ] Audit logs

### Alternative Interfaces
- [ ] GraphQL API
- [ ] WebSocket support for real-time updates
- [ ] Streaming responses
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] CLI tool
- [ ] VS Code extension

---

## 🔨 Maintenance & Operations

### Regular Tasks
- [ ] Review and update dependencies (monthly)
- [ ] Security audit and updates (quarterly)
- [ ] Performance profiling and optimization (quarterly)
- [ ] Documentation review and updates (monthly)
- [ ] Example configurations validation (monthly)

### Technical Debt
- [ ] Add comprehensive error boundaries in React
- [ ] Implement proper logging framework (Winston/Pino)
- [ ] Add request tracing/correlation IDs
- [ ] Improve error messages for config validation
- [ ] Add configuration migration tool for version upgrades
- [ ] Refactor long functions (>100 lines)
- [ ] Add TypeScript types (gradual migration)

---

## 📚 Reference

For information about completed features, architecture decisions, and changes, see:
- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)** - Configuration guide
- **[config/examples/](config/examples/)** - Example configurations

### Key Environment Variables
- `FLEX_CHAT_CONFIG_FILE` - Full path to specific config file
- `FLEX_CHAT_CONFIG_FILE_PATH` - Alias for above
- `FLEX_CHAT_CONFIG_DIR` - Directory containing config.json
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `EMBEDDING_PROVIDER` - RAG wrapper embedding provider
- `OLLAMA_BASE_URL` - Ollama server URL

---

**Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.  
**Issues**: Report bugs and feature requests via GitHub Issues.
