# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

