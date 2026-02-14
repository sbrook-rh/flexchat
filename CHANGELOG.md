# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Builtin Tool Calling**
  - Builtin tools manifest — tool schemas defined in server code; config uses name-only activation via `tools.registry`
  - Builtins: `calculator`, `get_current_datetime` (IANA timezone-aware), `generate_uuid`
  - `tools.apply_globally` — offer all enabled tools to every response handler without per-handler config
  - Per-handler `tools.enabled`, `allowed_tools`, and `max_iterations` overrides
  - Phase 6b tool loop — model invokes tools and iterates until final response or `max_iterations` cap
  - Config Builder Tools tab: toggle cards, optional description overrides, inline test panel (test without applying)
  - Tools API: `GET /api/tools/list`, `GET /api/tools/available`, `POST /api/tools/test`, `GET /api/tools/validation`

### Changed

- `reinitializeProviders()` now reloads ToolManager on config apply

### Removed

- Standalone Tool Testing page (`/tools-testing` route and `ToolTesting.jsx`) — replaced by Config Builder inline test panel

- **Configuration Builder System** ✅ COMPLETE
  - **Zero-Config Startup**: Start Flex Chat without any configuration file
  - **Visual Configuration Management**: Complete UI for creating and managing configurations
    - LLM Provider Management: Add/edit/remove providers with guided wizards
    - RAG Service Management: Configure RAG services with connection testing
    - Embeddings Configuration: Global defaults and per-service overrides
    - Topic Detection Configuration: Select provider/model with testing UI
    - Intent Detection Configuration: Define intents with modal-based tester
    - Response Handler Builder: Visual builder with match criteria and prompt templates
  - **Connection Testing**: Test providers before saving with real-time feedback
  - **Model Discovery**: Automatically fetch available models from providers
  - **Import/Export**: Load/save configurations with browser download or clipboard copy
  - **Live Configuration**: Hot-reload without restarting server
  - **Validation Gating**: Validate before applying changes
  - **Chat UI Guards**: Prevent access to chat without working configuration
  - **Enhanced Chat UX**: Auto-updating titles, topic management, message history controls
  - **Documentation**: Comprehensive guides in `docs/CONFIGURATION_BUILDER.md`

- **Configuration Viewer UI** 🆕 NEW FEATURE DOCUMENTED - Easy Win!
  - **Phase 1: Display Only** (read-only, high priority)
    - Backend endpoint: `GET /config/api` and `/config/api/:section`
    - Returns deep clone of config (env vars already resolved)
    - **Critical**: Verify global config object isn't being mutated at runtime
    - Section-specific queries: llms, rag_services, embedding, intent, responses
    - Frontend `/config` route with tab/accordion UI
    - JSON viewer with syntax highlighting
    - Search/filter capabilities
    - Copy to clipboard, reload config button
    - NavBar integration (Configuration link)
  - **Phase 2: Live Editing** (future)
    - Architecture decision: Config mutation vs. file write + reload
    - Investigate current config lifecycle and mutability
    - Safety filters, validation, preview impact
    - Test response handler matching (dry-run)
    - Hot reload if safe mutation approach chosen
    - Audit log of config changes
  - **Phase 3**: Advanced features
    - **Configuration Presets & Snapshots**: Save current config as named preset
      - Store in config/presets/ directory with metadata
      - List, preview, and load presets from UI
      - Duplicate and edit existing presets
      - Use cases: dev/staging/prod configs, experiments, team sharing
    - Configuration wizard, versioning, import/export
    - Visual response handler builder

- **Connection Builder Interface** (`docs/CONNECTION_BUILDER.md`) 🆕
  - **Goal**: UI wizard for creating LLM/RAG connections without exposing API keys
  - **Security**: Environment variable references only, never actual secrets in browser
  - **Schema-Driven**: Forms generated from provider `getConnectionSchema()` method
  - **Phase 1**: Core infrastructure
    - Provider schema interface (fields, types, hints, UI display names)
    - **Pattern-based env var handling**: Schema defines `env_var_pattern: "FLEX_CHAT_OPENAI_*"`
    - Dropdown filtered by pattern (only shows matching vars per provider)
    - Validation: Custom env var names must match provider's pattern
    - Backend endpoints: providers list, test connection, validate name, merge config, filtered env vars
    - Dynamic form generation from schema
    - Config snippet + instructions output
  - **Phase 2**: Enhanced UX
    - Model discovery and selection (saves startup query)
    - Connection name auto-suggest with clash detection
    - Full config merge and download
    - Connection testing with status feedback
  - **Phase 3**: Advanced features
    - Reconfigure/refresh existing connections
    - Connection health monitoring and latency tracking
    - Batch operations and templates
  - **Key Innovation**: Provider-agnostic wizard. New providers implement schema interface → Connection Builder "just works"
  - **Use Cases**: Onboarding, dev/staging/prod setups, troubleshooting, team collaboration
  - **Benefits**:
    - **Security**: No API keys in browser/localStorage/UI state
    - **Organization**: Provider-specific env var patterns (`OPENAI_*`, `ANTHROPIC_*`)
    - **Safety**: Can't accidentally use wrong provider's key (pattern validation)
    - **Discovery**: Set `FLEX_CHAT_OPENAI_PROD_KEY` → auto-appears in OpenAI wizard
    - **Portability**: Generated configs shareable (no embedded secrets)
    - **Flexibility**: Works with any provider (schema-driven)
    - **User-friendly**: Guided wizard vs. manual JSON editing
    - **Team collaboration**: Share configs, teammates set their own env vars
  - Documented in TODO.md and dedicated `docs/CONNECTION_BUILDER.md`

- **Provider Data Structure Specialization concept** 🆕 NEW FEATURE DOCUMENTED
  - Added "Choosing a RAG Provider" section to RAG_SERVICES.md
  - Documents which providers are best for different data structures:
    - ChromaDB Wrapper: Simple text-based, FAQ/Q&A format
    - Milvus (planned): Structured multi-field data (recipes, products, catalogs)
    - Weaviate (planned): Flexible schema, multi-modal content
    - Qdrant (planned): Flexible payload-based approach
  - Comparison table by data complexity, structure type, and management approach
  - Examples showing simple text vs. structured JSON data models
  - **Technical guidance for structured data**:
    - Chunking strategy: 512-1024 token chunks for long text fields
    - Metadata fields: Index title, region, etc. as filterable fields
    - ID strategy: Auto-generate UUID or accept user-provided IDs
    - Embedding recommendations: text-embedding-3-large, instructor-xl for rich content
    - Markdown support: Preserve structure cues (headers, bullets) in instructions
    - Data transformation: New wrapper service must normalize/transform structured JSON
    - Query examples: Filtered semantic search ("British desserts"), hybrid queries
  - Use case recommendations for each provider type
  - Updated TODO.md with detailed implementation tasks:
    - Chunking strategy implementation
    - Schema management for typed fields
    - Data transformation pipeline
    - Embedding configuration per field
    - Filtered and hybrid query support
  - References example structured data: `logs/recipe_data_for_structured_db.json`
  - Ready for implementation when Milvus/Qdrant providers are added

**Frontend - Topic Transparency:**
- Current topic indicator next to "Clear Chat" button
  - Shows the active conversation topic in real-time
  - Only appears when a topic has been detected
  - Automatically updates with each response
- Per-message topic badges on bot responses
  - Displays the topic that was active when that response was generated
  - Subtle styling with top border separator
  - Provides historical view of topic evolution throughout conversation

**Backend - Response Metadata:**
- `generateResponse()` now returns structured object: `{ content, service, model }`
- `/chat/api` endpoint includes `service` and `model` in response payload
- Updated JSDoc comments to reflect new return type

**Frontend - Service/Model Display:**
- Each bot message shows which AI service and model generated the response
- Displayed in message footer: `[topic] · via [service] / [model]`
- Stored with each message for full conversation transparency
- Very subtle styling (lighter gray) to not distract from content

**Documentation:**
- Added "Topic Interaction Features" section to TODO.md
- Documented comprehensive streaming response implementation plan
  - Server-Sent Events (SSE) architecture
  - Reasoning model "thinking" phase streaming
  - 6-phase implementation roadmap
  - Technical considerations and testing strategy
- Documented conversation branching for topic editing feature
- Documented RAG source attribution and context formatting
  - Three format options (section headers, inline tags, numbered references)
  - 5-phase implementation plan from basic formatting to clickable citations
  - Benefits for trust, transparency, and multi-collection scenarios
  - Configuration options for per-response-rule customization
- **Completed ARCHITECTURE.md rewrite for v2.0** ✅
  - Removed all references to old strategy-based architecture
  - Documented complete 4-phase flow (Topic → RAG → Profile → Response)
  - Added data flow diagrams for Match, Partial, and None scenarios
  - Documented all lib/ modules and their responsibilities
  - Updated configuration structure (llms, rag_services, intent, responses)
  - Added API endpoints documentation
  - Included key design decisions and rationale
  - Added future enhancements section
- **Completed REASONING_MODELS.md rewrite** ✅
  - Removed all old strategy-based references
  - Documented as opt-in feature per response handler
  - Shows two-stage architecture: reasoning prompt → response prompt
  - Template variable `{{reasoning}}` for including analysis in response
  - Match criteria can include `reasoning: true/false`
  - Marked as planned feature for v2.1+
  - Integrated with streaming response vision
  - Updated all examples to match realistic configuration patterns
- **Completed CONFIGURATION.md rewrite** ✅
  - Complete rewrite for v2.0 configuration structure
  - "How to specify config file" section (CLI args, env vars, defaults)
  - Detailed breakdown of all 5 sections (llms, rag_services, embedding, intent, responses)
  - Thresholds explained (match vs partial with typical values)
  - Response handler matching (first-match wins, execution order)
  - Template variables reference table
  - Complete realistic example configuration
  - Environment variables documentation
  - Troubleshooting section with common issues
- **Completed RAG_SERVICES.md (renamed from RETRIEVAL_PROVIDERS.md)** ✅
  - Renamed to match `rag_services` configuration terminology
  - Complete rewrite for v2.0 architecture
  - Explained distance-based matching with threshold classification
  - Documented ChromaDB wrapper as recommended provider
  - Corrected Python service startup (python3 server.py, not uvicorn)
  - Embedding consistency explained (critical for correct results)
  - Provider architecture and interface documentation
  - Step-by-step guide for adding new providers
  - Comprehensive troubleshooting section
  - Best practices for embeddings, thresholds, collections, performance
- **Created CHROMADB_WRAPPER.md** ✅ NEW
  - Complete guide for Python ChromaDB wrapper service
  - Command-line arguments: --chroma-path and --port
  - Running multiple instances (different databases on different ports)
  - Environment variables for all embedding providers (Ollama, OpenAI, Gemini)
  - API endpoints reference
  - Data storage and backup procedures
  - Embedding consistency requirements
  - Troubleshooting common issues
  - Production deployment (systemd, Docker, nginx)
  - Development tips and testing
- **Documented UI-Driven Configuration System vision** 🎨
  - Long-term goal: zero-config start, build everything through UI
  - Response Handler Builder as core feature
  - Visual rule builder with drag-and-drop
  - LLM provider and RAG service management UIs
  - Configuration import/export and templates
  - 4-phase implementation plan (v2.x → v4.0+)
  - Makes Flex Chat accessible to non-technical users
- **Documented Per-Message Model Switching feature** 🔄 NEW APPROACH
  - Replaces problematic sidebar model pre-selection concept
  - Retroactive model switching: try different models on existing responses
  - Compare model outputs side-by-side
  - New `/chat/api/regenerate` endpoint (bypasses topic detection)
  - Lightweight storage: topic + rag_result per message
  - Frontend reconstructs conversation context from UI
  - Backend re-queries RAG service with stored topic
  - Will automatically benefit from RAG caching if implemented
  - Overlay UI for model selection and comparison
  - 5-phase implementation plan
  - Enables model experimentation and quality comparison
  - Foundation for ensemble responses and A/B testing
- **Identified terminology issue**: `service` field ambiguous
  - Currently used for both RAG services and LLM services
  - Should rename LLM reference to `llm` instead of `service`
  - Affects message metadata, response payload
  - Marked for future cleanup
- **Updated main README.md to v2.0** 📖 COMPLETE REWRITE
  - Updated architecture diagram with 4-phase processing flow
  - Fixed all outdated terminology throughout
    - strategies → response handlers
    - knowledge bases → RAG services
  - Updated configuration section with actual example files
  - Added links to all v2.0 documentation (CONFIGURATION.md, RAG_SERVICES.md, etc.)
  - Updated Quick Start with correct config files and env vars
  - Fixed Python service command (python3 server.py, not uvicorn)
  - Rewrote Key Concepts with v2.0 examples (response handlers, RAG services)
  - Reorganized documentation links by category
  - Updated project structure showing lib/ modules
  - Enhanced troubleshooting with v2.0-specific issues
  - README now acts as concise overview, pointing to detailed docs
- **Updated CONTEXT.md (session instructions)** 📋 IMPROVED GUIDELINES
  - Added "Documentation Guidelines" section
    - Document what we DO, not what we DON'T (prevents confusion)
    - Be concise, link liberally, update systematically
  - Added "Code Comment Guidelines" section
    - Comments should describe WHAT, not WHY or HISTORY
    - No bug fix mentions or change history in comments
    - Use commit messages for historical context
    - JSDoc for APIs, inline comments for complex logic only
  - Added "Project Architecture (v2.0)" overview
    - 4-phase flow summary with module references
    - Key terminology clarifications
    - Configuration structure overview
  - Updated "Testing Strategy" to v2.0 terminology
    - Removed "strategy detection" references
    - Added 4-phase flow testing priorities
  - Updated example to mention atomic commits and clean code
  - **Improved "How We Use the Session Log" section**
    - Enhanced template with better guidelines
    - Focus on decisions and rationale (not just file lists)
    - Keep entries scannable and concise (30-60 lines, not 100+)
    - Group changes by type, link to commits for details
    - Added specific guidelines on what to include/exclude
- **Added 2025-10-19 session to SESSION_LOG.md** 📝
  - Followed new improved template format
  - Captured documentation philosophy decisions
  - Documented Per-Message Model Switching architecture rationale
  - Grouped changes by type for scannability
  - ~80 lines (vs. previous 100-200+ line entries)
- Identified additional outdated documentation requiring updates
  - COLLECTION_MANAGEMENT.md - references "Configured Strategies" (still needs update)
  - DYNAMIC_COLLECTIONS_IMPLEMENTATION.md - needs review
  - All marked in TODO with specific update requirements
- Corrected provider implementation status
  - Gemini provider NOT implemented (was incorrectly marked as complete)
  - Only OpenAI and Ollama currently available

### Changed

**Frontend:**
- Bot messages now include metadata (topic, service, model) in localStorage
- Message badge component renders combined topic and service/model info
- Updated message storage format to include new metadata fields

### Benefits

- **Transparency**: Users can see exactly which AI and topic context produced each response
- **Debugging**: Easy to identify if wrong model or topic was used
- **Historical Context**: Topic evolution visible throughout conversation
- **Multi-Model Support**: Clear when different models are used for different queries

---

## [2.0.0] - 2025-10-19

### Major Architecture Redesign

Complete rewrite of core architecture from complex strategy-based system to simplified linear flow.

### Added

**Backend - Core Architecture:**
- Implemented 4-phase linear request flow (Topic → RAG → Profile → Intent → Response)
- Added `lib/collection-manager.js` for centralized collection CRUD operations
- Added `lib/topic-detector.js` with stateful conversation tracking
  - Tracks topic across conversation turns with currentTopic parameter
  - Includes both user and bot messages in context (last 6 turns)
  - Smart compression of long assistant responses (>400 chars)
  - Returns structured JSON with topic_status and topic_summary
- Enhanced `lib/rag-collector.js` with threshold-based classification
  - Changed selectedCollections from strings to objects {service, name}
  - Allow collection metadata to override service-level thresholds
  - Moved classifyResult inline for better context
- Enhanced `lib/profile-builder.js` with improved profile construction
- Enhanced `lib/response-matcher.js` for sequential response rule matching
- Enhanced `lib/response-generator.js` with template-based generation

**Backend - API Endpoints:**
- `/api/ui-config` - Consolidated UI configuration (collections, wrappers, model selection)
- `/api/collections` - List all collections from all RAG services
- `POST /api/collections` - Create collection (requires service parameter)
- `POST /api/collections/:name/documents` - Add documents (requires service parameter)
- `PUT /api/collections/:name/metadata` - Update metadata (requires service parameter)
- `DELETE /api/collections/:name?service=X` - Delete collection (requires service parameter)

**Backend - Configuration:**
- Flexible config path resolution with multiple methods
- `FLEX_CHAT_CONFIG_FILE` / `FLEX_CHAT_CONFIG_FILE_PATH` - Full path to specific file
- `FLEX_CHAT_CONFIG_DIR` - Directory containing config.json
- CLI `--config` accepts both file and directory paths
- Replaced `__dirname` path traversal with `process.cwd()` for cleaner defaults

**Backend - Retrieval Providers:**
- `ChromaDBWrapperProvider.createCollection()` - Create new collections
- `ChromaDBWrapperProvider.deleteCollection()` - Delete collections
- `ChromaDBWrapperProvider.addDocuments()` - Enhanced with backward-compatible signatures

**Frontend - Layout & UX:**
- CSS Grid responsive layout replacing flexbox
- Dynamic sidebar widths (RAIL=48px, FULL=256px)
- Edge-positioned toggle buttons with elegant ‹ › icons
- Fixed input position that adjusts with sidebar state
- Removed bottom NavBar in favor of contextual navigation
- Added "← Home" link to LogoSection
- Added "→ Manage" and "✏️ Edit" buttons per collection

**Frontend - Collections:**
- Display names with auto-generated ChromaDB-compliant IDs
  - User enters friendly name (e.g., "Tofu Magic")
  - System generates valid ID (e.g., "tofu-magic")
  - Real-time validation with visual feedback
  - ChromaDB naming rules enforced client-side
- Pinned collections support
  - Hide Create/Delete for config-level pinned collections
  - Edit functionality still available for pinned collections
- Centralized config management at App level
  - Single `/api/ui-config` fetch
  - `reloadConfig()` callback for mutations
  - Removed local collection fetching

**Frontend - Chat:**
- Topic state with localStorage persistence
  - Persists across navigation
  - Sent to/received from backend
  - Cleared with chat history
- Display names shown throughout UI
- Changed collection format from strings to objects

**Configuration:**
- Progressive example series:
  - `01-chat-only.json` - Simplest: just LLM, no RAG
  - `02-single-rag-dynamic.json` - Single service with dynamic collections
  - `03-single-rag-pinned.json` - Single service with pinned collection
  - `04-multi-rag-multi-llm.json` - Complete: multiple services, LLMs, intent detection
- Working `config/config.json` as default (full-featured multi-service)

**Documentation:**
- Enhanced debug logging in RAG wrapper (`backend/rag/server.py`)
  - Log query text, collection name, top_k, and full request
  - Show explicit error when no collection specified
  - List available collections when requested collection not found
- Updated ARCHITECTURE.md for new collection system
- Updated CONFIGURATION.md for pinned collections
- Updated config schema and README files

### Changed

**Backend:**
- Replaced `server.js` with simplified architecture (formerly `server-v2.js`)
- Changed field names for consistency (`knowledgeBase` → `service`)
- Topic detection now uses full conversation history instead of just user messages
- Response matching changed to sequential first-match pattern
- Collection operations now require explicit service parameter
- Removed commander default for `--config` to allow env var fallback

**Frontend:**
- App.jsx now manages all UI configuration state
- Collections.jsx uses callback pattern instead of local fetch
- Chat.jsx sends collection selections as objects not strings
- Improved code organization, removed unnecessary comments

**Configuration:**
- Flat structure: `llms`, `rag_services`, `embedding`, `intent`, `responses`
- Removed old architecture examples (strategies, providers, knowledge_bases)
- Renamed examples for clarity and progressive complexity

### Removed

- Old strategy-based server.js implementation
- Complex nested strategy detection functions
- `strategies` and `providers` configuration sections
- Old example configs:
  - `chat-only-ollama.json` (old architecture)
  - `chat-only-gemini.json` (old architecture)
  - `multiple_rag.json` (redundant)
- `CHAT_CONFIG_PATH` environment variable (replaced with FLEX_CHAT_* variants)
- Bottom navigation bar (NavBar component usage)
- Unused state variables and redundant code
- `docs/REDESIGN_SIMPLIFIED_ARCHITECTURE.md` (implementation complete)

### Fixed

- 400 error when querying collections (backend now receives correct format)
- Data refresh issue - collections now update across pages after mutations
- Field consistency throughout codebase
- Config path resolution with environment variables
- Collection management bootstrap problem (added "→ Manage" links per service)

### Technical Details

**Breaking Changes:**
- Configuration file format completely changed (old configs incompatible)
- API endpoint `/chat/api` now expects different selectedCollections format
- Environment variable `CHAT_CONFIG_PATH` replaced with `FLEX_CHAT_CONFIG_*`

**Migration Guide:**
- Update config files to new format (see examples in `config/examples/`)
- Frontend: selectedCollections changed from `Set<string>` to `Array<{service, name}>`
- Backend: Remove old `providers` and `strategies` sections
- Environment: Replace `CHAT_CONFIG_PATH` with `FLEX_CHAT_CONFIG_FILE` or `FLEX_CHAT_CONFIG_DIR`

**Performance Improvements:**
- Reduced frontend API calls from 3+ to 1 with `/api/ui-config`
- Removed unnecessary RAG provider lookups with explicit service parameters
- Optimized topic detection with smart context compression

**Commit History:**
- `8b3ee3c` - Backend collection management system
- `5e0e177` - Backend simplified architecture + stateful topic tracking
- `bdd42ce` - Frontend complete redesign with improved UX
- `479ba38` - Documentation and debug logging
- `ea3b0ad` - Configuration examples reorganization
- `61aef54` - Config path resolution improvements

### Known Issues
- None currently tracked

---

## [1.x] - Prior to 2025-10-19

Previous versions used strategy-based architecture. See git history for details.

### Notable Features (Pre-2.0)
- Multi-provider AI support (OpenAI, Gemini, Ollama)
- Strategy-based routing with detection functions
- Dynamic RAG with fallback detection
- UI-based collection management
- Hybrid embedding configuration
- User-selectable models (response and reasoning)
- Two-stage reasoning pipeline
- Markdown rendering in chat messages

---

## Versioning

- **Major version (2.0)**: Breaking changes, architectural redesign
- **Minor version (2.x)**: New features, backward compatible
- **Patch version (2.x.x)**: Bug fixes, backward compatible

## Links

- [Configuration Examples](config/examples/)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Configuration Guide](docs/CONFIGURATION.md)

