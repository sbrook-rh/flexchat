# Chat Starter - TODO List

## 🎯 Current Focus: Architecture Simplification Redesign

**Status**: Implementation Phase - Phases 1, 1b, 2 Complete ✅  
**Branch**: `redesign/simplified-architecture`  
**Document**: `docs/REDESIGN_SIMPLIFIED_ARCHITECTURE.md`  
**Session Log**: See `SESSION_LOG.md` (2025-10-17 entry)

### What We're Doing
Redesigning the configuration and request flow to eliminate overengineering:
- ❌ Remove: Complex nested strategy detection functions
- ❌ Remove: "Strategies" object with detection/response split  
- ✅ Add: Simple four-phase linear flow (RAG → Profile → Intent → Response)
- ✅ Add: Profile object pattern as key abstraction
- ✅ Add: Sequential response matching (responses array, first match wins)
- ✅ Add: Flat config structure (llms, rag_services, responses)
- ✅ Add: Topic detection for conversational context

### Implementation Progress

**Completed:**
- ✅ **Phase 0**: Topic Detection (`lib/topic-detector.js`)
  - Resolves conversational follow-ups ("it", "that", "them")
  - Detects topic changes naturally
  - Provides clear topic for RAG and intent
- ✅ **Phase 1**: RAG Collection (`lib/rag-collector.js`)
  - Returns single match object or array of partials
  - Classifies results by distance thresholds
  - Filters documents to minimal structure
- ✅ **Phase 1b**: Profile Building (`lib/profile-builder.js`)
  - Builds profile from match or partials
  - Sets initial intent from identifier
- ✅ **Phase 2**: Intent Detection (`lib/profile-builder.js`)
  - LLM-based classification when intent not set
  - Uses topic instead of raw message
  - Supports "other" category

**Completed:**
- ✅ **Phase 0**: Topic Detection (`lib/topic-detector.js`)
- ✅ **Phase 1**: RAG Collection (`lib/rag-collector.js`)
- ✅ **Phase 1b**: Profile Building (`lib/profile-builder.js`)
- ✅ **Phase 2**: Intent Detection (`lib/profile-builder.js`)
- ✅ **Phase 3**: Response Matching (`lib/response-matcher.js`)
- ✅ **Phase 4**: Response Generation (`lib/response-generator.js`)

**Files Created:**
- `backend/chat/server-v2.js` - New orchestrator with complete 4-phase flow
- `backend/chat/lib/config-loader.js` - Config loading + env substitution
- `backend/chat/lib/rag-collector.js` - RAG collection logic
- `backend/chat/lib/profile-builder.js` - Profile + intent detection
- `backend/chat/lib/topic-detector.js` - Conversational context handling
- `backend/chat/lib/response-matcher.js` - Response rule matching
- `backend/chat/lib/response-generator.js` - LLM response generation with variable substitution

**Key Design Decisions:**
- Variable syntax: `${ENV_VAR}` (load time), `{{template}}` (runtime)
- collectRagResults returns single object (match) or array (partials/none)
- Topic detection runs before RAG to resolve ambiguous references
- Intent detection simplified - no conversation history (topic handles it)
- Profile structure: match vs partial/none with different fields
- Match patterns: exact equality, `_contains` (substring), `_regexp` (regex), special `any`
- Profile fields: `rag_results`, `service`, `collection`, `intent`, `documents`, `user_message`, `topic`

### Next Steps
1. ✅ Design document complete
2. ✅ Initial implementation (Phases 0-2)
3. ✅ Complete Phase 3 (Response Matching)
4. ✅ Complete Phase 4 (Response Generation)
5. ⏳ End-to-end testing with real services
6. ⏳ Frontend integration with server-v2.js
7. ⏳ Documentation updates

**See SESSION_LOG.md (2025-10-17) for detailed implementation notes, testing scenarios, and gotchas.**

---

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

## Reasoning Models (Two-Stage Pipeline)
- [x] Design reasoning model feature architecture
- [x] Update model classification (OllamaProvider, OpenAIProvider) to detect reasoning models
- [x] Create `/api/config/model-selection` endpoint with reasoning model support
- [x] Implement reasoning detection (LLM-based with keyword fallback)
- [x] Implement two-stage generation pipeline (reasoning → response)
- [x] Add reasoning model selector in UI (separate dropdown per provider)
- [x] Configure dynamic timeouts for reasoning stages (2-3 minutes)
- [x] Add prompt size logging for debugging
- [x] Support `models` and `include_models` configuration options
- [x] Document reasoning feature in `docs/REASONING_MODELS.md`
- [ ] Show which models were used in chat response (display in UI)
- [ ] Add real-time reasoning indicators ("🧠 Analyzing..." and "💬 Generating...")
- [ ] Add expandable section to view raw reasoning output (including `<think>` tags)
- [ ] Add configurable reasoning prompts per strategy (UI or config)
- [ ] Implement reasoning output processing options (strip tags, extract sections, etc.)

## Frontend Updates
- [x] Update Chat.jsx to work with new backend API
- [x] Add model selection UI (response models)
- [x] Add reasoning model selection UI (separate dropdown per provider)
- [x] Add Clear Chat button
- [x] Fix scrolling with fixed sidebars
- [x] Add dynamic collection management UI (Collections page)
- [x] Smart JSON document parsing (arrays, Q&A format, etc.)
- [x] Markdown rendering in chat messages (code blocks, lists, headers, tables, links)
- [ ] Add "(default)" label next to default models in dropdowns
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

## Toolbox & Workspace System (Ambitious Feature) 🚀

**Concept:** Reusable "toolbox" templates that create specialized workspaces with:
- Toolbox-specific tools and capabilities
- Configuration wizard for setup (DB connection, OAuth, file upload, etc.)
- Specialized UI panels (results tables, email viewer, file browser, etc.)
- Isolated chat context per workspace
- Human-in-the-loop approval for dangerous operations

**Example Toolboxes:**
- 🗃️ Database Explorer (SQL queries for non-technical users)
- 📧 Email Manager (IMAP/Gmail integration, organize, search, follow-ups)
- 📄 Document Analyzer (PDF/Word analysis, Q&A over documents)
- 🖥️ System Admin (server management, log analysis, troubleshooting)

### Backend: Core Architecture
- [ ] **Toolbox System**
  - [ ] Design toolbox definition schema (metadata, tools, config schema, UI components)
  - [ ] Create toolbox registry and loading system
  - [ ] Define toolbox marketplace structure (built-in vs custom)
  - [ ] Support toolbox versioning and updates
  
- [ ] **Workspace Management**
  - [ ] Create workspace data model (id, toolbox, config, state, chat history)
  - [ ] Implement workspace CRUD API endpoints
  - [ ] Add workspace state persistence (database/files)
  - [ ] Support multiple workspaces per user
  - [ ] Add workspace switching and navigation
  
- [ ] **Tool Framework**
  - [ ] Design tool definition schema (name, description, parameters, safety level)
  - [ ] Create tool registry per workspace
  - [ ] Implement tool executor with result tracking
  - [ ] Add LangChain integration for tool orchestration
  - [ ] Support function calling in AI providers (OpenAI, Gemini, Ollama)
  - [ ] Create tool parameter validation
  
- [ ] **Backend: Safety & Approval System**
  - [ ] Classify tools by safety level (read-only, write, destructive)
  - [ ] Implement approval workflow (pause execution, await user confirmation)
  - [ ] Add tool execution state management (pending, approved, rejected, completed)
  - [ ] Create rollback/undo mechanism for failed operations
  - [ ] Add dry-run mode (show what would happen without executing)
  
- [ ] **Backend: Tool Call Tracking**
  - [ ] Store tool call history per conversation
  - [ ] Track tool call chain (sequence, dependencies, results)
  - [ ] Add API endpoints for retrieving tool execution history
  - [ ] Support parallel tool execution where possible
  
### Frontend: Workspace UI
- [ ] **Workspace Management**
  - [ ] Create workspace list/gallery view (show all workspaces)
  - [ ] Add "New Workspace" flow (select toolbox → configure → create)
  - [ ] Implement workspace navigation (switch between workspaces)
  - [ ] Add workspace settings/reconfigure option
  - [ ] Support workspace deletion with confirmation
  
- [ ] **Configuration Wizard**
  - [ ] Create dynamic form generator from toolbox config schema
  - [ ] Add connection testing (e.g., test database connection)
  - [ ] Support file uploads for configuration (CSV, SQLite, etc.)
  - [ ] Add OAuth flow integration (Gmail, Outlook, etc.)
  - [ ] Validate configuration before proceeding
  
- [ ] **Workspace Layout (Toolbox-Specific)**
  - [ ] Design flexible layout system (chat + custom panels)
  - [ ] Create layout templates (2-column, 3-column, tabbed, etc.)
  - [ ] Support panel resizing and rearranging
  - [ ] Add toolbox-specific components registry
  
- [ ] **Chat Interface (Per Workspace)**
  - [ ] Isolated chat history per workspace
  - [ ] Show tool execution in chat (inline results, status)
  - [ ] Display tool call cards (what was executed, with what params)
  - [ ] Add approval prompts inline (for write/destructive operations)
  
- [ ] **Frontend: Tool Call Visualization**
  - [ ] Integrate flowchart library (React Flow or Mermaid)
  - [ ] Generate visual diagram of tool execution flow
  - [ ] Show tool dependencies and data flow
  - [ ] Highlight current execution step
  - [ ] Color code by status (success, pending, error, needs approval)
  
- [ ] **Frontend: Human-in-the-Loop UI**
  - [ ] Create approval modal for dangerous operations
  - [ ] Show tool preview (what will happen if approved)
  - [ ] Add bulk approve/reject for multiple tools
  - [ ] Display safety warnings for destructive operations
  - [ ] Support editing tool parameters before approval
  
### Built-in Toolboxes (MVP)
- [ ] **🗃️ Database Explorer Toolbox**
  - [ ] Define toolbox schema and tools
  - [ ] Create configuration form (connection type, credentials, file upload)
  - [ ] Implement tools: query_database, export_results, get_schema
  - [ ] Create UI: results table, schema viewer, query history
  - [ ] Add safety: read-only by default, warn on writes
  
- [ ] **📧 Email Manager Toolbox** (Stretch Goal)
  - [ ] Define toolbox schema and tools
  - [ ] Implement OAuth flows (Gmail, Outlook)
  - [ ] Create tools: search_emails, read_email, send_email, organize, archive
  - [ ] Create UI: email list, preview pane, folder tree
  - [ ] Add safety: approval required for send/delete
  
- [ ] **📄 Document Analyzer Toolbox** (Stretch Goal)
  - [ ] Define toolbox schema and tools
  - [ ] Support file upload (PDF, Word, Markdown)
  - [ ] Create tools: extract_text, search_document, qa_over_document, summarize
  - [ ] Create UI: document viewer, highlights, Q&A panel
  - [ ] Integrate with existing RAG system

### Integration & Testing
  - [ ] Test workspace creation and configuration flow
  - [ ] Test Database Explorer with real database
  - [ ] Test tool execution and result display
  - [ ] Test approval workflow with write operations
  - [ ] Test workspace switching and state persistence
  - [ ] Test error handling and recovery
  - [ ] Test with complex multi-tool scenarios
  - [ ] Test custom toolbox creation

## Configuration Management UI & Multi-Config Support

### Stage 1: Runtime Config Selection ✅
- [x] Add CLI argument support for custom config file path
  - [x] Update backend/chat/server.js to accept `--config` argument
  - [x] Update start.sh to pass through config argument
  - [x] Default to `config/config.json` if not specified
  - [x] Add validation for config file existence and readability
  - [x] Document usage in README and startup scripts
- [x] Create config file presets directory (already exists in config/examples/)
- [x] Add config file validation on startup
  - [x] Clear error messages for invalid configs
  - [x] Suggestion system showing available example configs
- [ ] Additional enhancements (optional)
  - [ ] JSON schema validation against config-schema.json
  - [ ] Add quick-start wrapper scripts for common scenarios

### Stage 2: Initial Configuration Wizard (No Config Mode)
- [ ] Backend: Configuration API endpoints
  - [ ] POST `/api/config/initialize` - create new config from UI form data
  - [ ] GET `/api/config/providers/available` - list available provider types
  - [ ] GET `/api/config/providers/:type/schema` - get provider-specific config schema
  - [ ] POST `/api/config/validate` - validate config before saving
  - [ ] GET `/api/config/status` - check if valid config exists
- [ ] Frontend: Configuration Wizard UI
  - [ ] Detect missing/invalid config on app load
  - [ ] Show configuration wizard instead of chat interface
  - [ ] Multi-step form with progress indicator
  - [ ] **Step 1: Provider Setup**
    - [ ] Select AI providers (OpenAI, Ollama, Gemini)
    - [ ] Provider-specific forms (dynamic based on provider type)
    - [ ] Masked input fields for API keys and secrets
    - [ ] Connection testing (health check before proceeding)
  - [ ] **Step 2: Embedding Provider Setup**
    - [ ] Select embedding provider and model
    - [ ] Test embedding generation
  - [ ] **Step 3: Strategy Configuration**
    - [ ] Choose strategy type (chat-only, RAG, multi-strategy)
    - [ ] Configure strategy-specific options
    - [ ] Set up detection provider (for multi-strategy)
  - [ ] **Step 4: RAG Setup (if applicable)**
    - [ ] ChromaDB configuration
    - [ ] Initial collection setup (optional)
    - [ ] Retrieval parameters (k, threshold)
  - [ ] **Step 5: Review & Save**
    - [ ] Preview generated config.json
    - [ ] Edit JSON directly (advanced mode)
    - [ ] Save and initialize system
  - [ ] Form validation with helpful error messages
  - [ ] Tooltips and help text for each field
- [ ] Secrets Management
  - [ ] Store sensitive data separately (never in config.json)
  - [ ] Use environment variables or secure storage
  - [ ] Backend handles secret injection at runtime
  - [ ] UI indicates which fields are sensitive
  - [ ] Option to use existing .env file or create new one
- [ ] Configuration Templates
  - [ ] Pre-built templates for common setups
  - [ ] One-click configuration for simple scenarios
  - [ ] Template customization workflow

### Stage 3: Edit Existing Configuration
- [ ] Backend: Configuration Edit API
  - [ ] GET `/api/config/current` - load current config (sanitized, no secrets)
  - [ ] PUT `/api/config/update` - update config (with backup)
  - [ ] POST `/api/config/backup` - create backup of current config
  - [ ] GET `/api/config/backups` - list available backups
  - [ ] POST `/api/config/restore/:backup_id` - restore from backup
  - [ ] POST `/api/config/reload` - reload config without server restart
- [ ] Frontend: Configuration Editor UI
  - [ ] Settings page with "Edit Configuration" option
  - [ ] Load current config into form (same wizard structure)
  - [ ] Allow editing of any section
  - [ ] Real-time validation as user types
  - [ ] Side-by-side JSON preview (show what will be saved)
  - [ ] Diff view showing changes from current config
  - [ ] Confirm before saving with impact warnings
  - [ ] Option to restart services after save
- [ ] Advanced Features
  - [ ] Configuration versioning and rollback
  - [ ] Import/export configurations
  - [ ] Share configurations (sanitized, no secrets)
  - [ ] Configuration comparison tool
  - [ ] Hot-reload support (update without full restart)

### Considerations & Challenges
- [ ] **Secrets Handling**
  - Decide on storage mechanism (env vars, encrypted file, system keychain)
  - Never expose secrets in API responses
  - Secure transmission (HTTPS in production)
  - Password/key rotation workflow
- [ ] **Validation Strategy**
  - Client-side + server-side validation
  - Provider connectivity testing
  - Model availability checking
  - Embedding compatibility verification
- [ ] **State Management**
  - Handle config changes during active chat sessions
  - Queue management during config reload
  - User notification of config changes
  - Graceful degradation if provider becomes unavailable
- [ ] **Multi-Environment Support**
  - Development vs production configs
  - Environment-specific overrides
  - Config inheritance/merging
- [ ] **Documentation**
  - User guide for configuration wizard
  - API documentation for config endpoints
  - Best practices for production deployments
  - Troubleshooting guide for common config issues

## Future Enhancements
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
- **User-selectable models** (response and reasoning models)
- **Two-stage reasoning pipeline** (reasoning model → response model)
- **Markdown rendering** in chat messages
- Comprehensive documentation

### ✨ Recent Additions
- **Reasoning Models Feature**: Use specialized reasoning models (DeepSeek R1, etc.) for complex queries
  - Auto-detection of reasoning needs (LLM-based with keyword fallback)
  - Two-stage pipeline: reasoning stage → response formatting stage
  - User-configurable reasoning models in UI
  - Extended timeouts and prompt size monitoring
  - Documented in `docs/REASONING_MODELS.md`
- **Model Selection UI**: Choose both response and reasoning models per provider
- **Markdown Support**: Rich formatting with code blocks, lists, tables, headers

### 🚧 Remaining Work
- UI improvements (show models used, real-time indicators, expandable reasoning view)
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
- **Reasoning-enhanced responses** for complex analytical queries
