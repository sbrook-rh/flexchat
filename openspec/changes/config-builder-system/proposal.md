# Configuration Builder System Proposal

## Why

Flex Chat currently requires users to manually author JSON configuration files, which is error-prone and requires deep understanding of the configuration schema. This creates a significant barrier to entry for new users and makes it difficult to discover available providers, models, and configuration options.

The Configuration Builder System enables a **zero-config-to-full-config workflow** where users can:
- Start the application with no configuration file
- Build complete configurations through the UI
- Discover available providers and models dynamically
- Test connections before saving
- Export complete configuration JSON files

This fundamentally shifts Flex Chat from a "config-file-first" to a "UI-first" system while maintaining full backward compatibility with existing JSON-based workflows.

## What Changes

### New Capabilities
- **Configuration Builder UI** - Complete UI for authoring all aspects of configuration
  - **LLM Provider Management** - Separate workflow for adding/configuring LLM providers with model discovery and selection
  - **RAG Service Management** - Dedicated workflow for RAG providers with collection discovery
  - **Topic Detection Configuration** - Dedicated UI for configuring conversation topic detection with chat-only model filtering
  - **Embeddings Configuration** - Global and per-service embedding model configuration with validation
  - Intent detection configuration (pending)
  - Response handler builder with visual matching rules (pending)
- **Connection Management Infrastructure** - Backend foundation for provider discovery, connection testing, and environment variable management
  - Type-specific API endpoints for LLM and RAG operations
  - Connection testing with real-time feedback
  - Model discovery and collection listing
  - Referential integrity validation
- **Zero-Config Bootstrap** - Application starts with sensible defaults when no config exists
  - Auto-creates topic and intent configurations on first LLM
  - Auto-creates default response handler on first LLM
- **Live Configuration** - Changes can be made and tested without restarting the server
  - Hot-reload capability with validation gating
  - Chat UI guards prevent access without working configuration
  - Auto-create new chat session when providers change
- **Configuration Export/Import** - Save and load complete configurations as JSON files
- **Enhanced Chat UX** - Auto-updating chat titles, empty session cleanup, topic-based organization

### Modified Capabilities
- **config-loader** - Extended to support runtime configuration updates and zero-config mode
- **ai-providers** - Extended with schema interface for UI-driven configuration

### Architecture Changes
- Frontend becomes the primary configuration authoring tool
- Backend provides discovery APIs and connection testing services
- Configuration becomes mutable at runtime (with export capability)
- Provider schema-driven UI generation

## Impact

### Affected Specs
- `config-loader` - MODIFIED: Add runtime config updates, zero-config mode
- `ai-providers` - MODIFIED: Add provider schema interface for UI
- `config-builder` - NEW: Complete specification for UI and backend

### Affected Code
- **Frontend** (`frontend/src/`):
  - New: Config builder UI components
  - New: Connection testing UI
  - New: Response handler builder
  - Modified: App initialization for zero-config mode
- **Backend** (`backend/chat/`):
  - New: `routes/connections.js` - `/api/connections/*` endpoints
  - New: `routes/config.js` - `/api/config/*` endpoints (save, reload, export)
  - New: Connection testing service
  - New: Provider discovery service
  - Modified: Config loader for runtime updates
  - Modified: Provider base classes for schema interface
- **Documentation**:
  - New: `docs/CONFIGURATION_BUILDER.md`
  - Modified: `docs/CONFIGURATION.md` - Add UI workflow section
  - Modified: `README.md` - Update getting started guide

### Breaking Changes
**NONE** - All changes are additive. Existing JSON-based configuration workflows continue to work unchanged.

### Dependencies
- Requires React state management for configuration builder
- May benefit from form validation library (e.g., Zod, Yup)
- Backend provider schema interface must be implemented before UI can consume it

## Phases

### Phase 1: Connection Management Infrastructure (Foundation) ✅ COMPLETE
**Goal**: Backend foundation for provider discovery, connection testing, environment management

**Deliverables**:
- ✅ Provider `getConnectionSchema()` interface
- ✅ Backend API endpoints: `/api/connections/*`
  - ✅ `GET /api/connections/providers` - List all providers
  - ✅ `GET /api/connections/providers/:id/schema` - Get provider schema
  - ✅ `POST /api/connections/test` - Test a connection (split into LLM/RAG endpoints in Phase 3c)
  - ✅ `GET /api/connections/env-vars` - List available env vars (filtered)
- ✅ Connection testing service (ConnectionTester)
- ✅ Environment variable management (secure filtering, EnvVarManager)
- ✅ Provider discovery and registration (ProviderDiscovery service)
- ✅ Config loader updates (raw vs processed config, runtime reload)
- ✅ UI-config endpoint extensions (hasWorkingProviders, hasResponseHandlers, chatReady)

**Enables**: Phases 2-4

**Estimated Complexity**: Medium (2-3 weeks)

**Status**: Complete - Foundation established and tested

### Phase 2: Provider Configuration UI ✅ COMPLETE
**Goal**: UI for adding and configuring LLM and RAG providers

**Deliverables**:
- ✅ Provider list/add/edit/remove UI (separate LLM and RAG sections)
- ✅ Connection wizard (step-by-step provider setup) - separate LLMWizard and RAGWizard
- ✅ Connection testing UI with real-time feedback
- ✅ Model discovery and selection (LLM providers only)
- ✅ RAG collection discovery (display available collections after successful connection test)
- ✅ Environment variable configuration (secure, env-var-only for secrets)
- ✅ Zero-config bootstrap (default provider suggestions)
- ✅ Auto-create response handler when first LLM is added
- ✅ Auto-create topic and intent configurations when first LLM is added

**Depends On**: Phase 1

**Estimated Complexity**: Medium (2-3 weeks)

**Status**: Complete - All features implemented and tested

### Phase 3a: Embeddings Configuration UI ✅ COMPLETE
**Goal**: UI for configuring default embeddings and per-service overrides

**Deliverables**:
- ✅ Embeddings tab implementation (functional EmbeddingsSection component)
- ✅ Default embedding provider/model selection (from configured LLMs, filtered to embedding models)
- ✅ Per-service embedding overrides (with visual badges showing default vs custom)
- ✅ Visual indication of which services use default vs custom embeddings
- ✅ Validation (referential integrity checks, warning for RAG services without embeddings)
- ✅ Model caching integration (reuses ConfigBuilder's modelsCache)

**Depends On**: Phase 2 (needs providers configured first)

**Estimated Complexity**: Small (1 week)

**Status**: Complete - All embedding configuration features implemented

### Phase 3b: Intent Detection Configuration UI
**Goal**: UI for configuring intent detection and testing classifications

**Deliverables**:
- Intent tab implementation
- Intent detection provider/model selection
- Intent phrase editor (add/edit/remove/reorder intents)
- Intent name and description fields
- Intent testing UI (test query classification)
- Confidence/reasoning display for test results
- ✅ **Topic Detection Configuration** (separate tab with provider/model selector, chat-only model filtering, auto-correction)

**Depends On**: Phase 3a (logical progression, but technically independent)

**Estimated Complexity**: Small-Medium (1-2 weeks)

### Phase 3c: Backend & UX Enhancements ✅ COMPLETE
**Goal**: Refactor provider management, add validation, and improve chat UX

**Deliverables**:
- ✅ **Provider Abstraction Refactor** - Split LLM/RAG components and handlers into type-specific implementations
- ✅ **Dedicated API Endpoints** - Separate endpoints for LLM and RAG operations (`/api/connections/llm/*`, `/api/connections/rag/*`)
- ✅ **Referential Integrity Validation** - Validate topic/intent/response references to LLM providers in config validation
- ✅ **RAG Collection Discovery** - Display available collections after successful connection test
- ✅ **Chat UI Guards** - Prevent access to chat without working configuration (hasWorkingProviders, hasResponseHandlers)
- ✅ **Auto-Update Chat Titles** - Automatically update session titles from detected topic (for new chats < 5 messages)
- ✅ **New Chat on Config Change** - Create fresh chat session when LLM/RAG providers are added/removed/renamed
- ✅ **Backend Topic Detection Updates** - Implement 3-tier fallback for topic detection LLM (topic → intent → first response handler)
- ✅ **Model Caching** - Lift models cache to ConfigBuilder level to eliminate duplicate API calls

**Depends On**: Phase 2, Phase 3b.5 (Topic Detection)

**Estimated Complexity**: Medium (2 weeks)

**Status**: Complete - All features implemented, tested, and documented

### Phase 4: Response Handler Builder
**Goal**: Visual builder for response handlers with matching rules

**Deliverables**:
- Handlers tab implementation
- Response handler list/add/edit/remove/reorder UI (drag-and-drop)
- Match criteria builder (visual rule editor)
  - Service/collection matching
  - Intent matching (with regex support)
  - RAG results matching
  - Reasoning flag
- Prompt template editor with variable autocomplete
- LLM/model selection per handler
- Handler testing UI (test match criteria)
- Sequential ordering visualization (first-match wins)
- Catch-all handler highlighting

**Depends On**: Phase 3b (needs intents and embeddings available for matching)

**Estimated Complexity**: Large (3-4 weeks)

### Phase 5: Reasoning Configuration & Polish
**Goal**: Complete all configuration sections and polish the entire builder

**Deliverables**:
- Reasoning tab implementation (reasoning model configuration)
- Configuration validation refinements
- Configuration export/import polish
- Configuration diff/preview
- Live configuration updates refinement
- Configuration history/versioning (optional)
- Performance optimizations (frontend caching, etc.)
- UX improvements and polish
- Complete documentation

**Depends On**: Phase 4 (needs complete builder)

**Estimated Complexity**: Medium (2-3 weeks)

## Success Criteria

1. **Zero-Config Start**: User can start Flex Chat with no config file and build a complete configuration through the UI
2. **Provider Discovery**: All available providers and models are discoverable through the UI
3. **Connection Testing**: Users can test connections before saving
4. **Complete Authoring**: All configuration aspects (providers, embeddings, intents, response handlers) can be authored in the UI
5. **Export/Import**: Configurations can be exported to JSON and imported back
6. **Backward Compatibility**: Existing JSON-based workflows continue to work unchanged
7. **Documentation**: Complete documentation for UI-based configuration workflow

## Risks & Mitigations

### Risk: Complexity Creep
**Mitigation**: Strict phase boundaries, each phase delivers working functionality

### Risk: State Management Complexity
**Mitigation**: Use proven state management patterns, consider React Context or Zustand

### Risk: Configuration Validation
**Mitigation**: Reuse existing JSON schema validation, apply same rules in UI

### Risk: Breaking Existing Workflows
**Mitigation**: All changes are additive, comprehensive backward compatibility testing

## Open Questions

1. Should configuration updates require server restart or support live reload?
   - **Recommendation**: Support both - live preview in UI, explicit "apply" action
2. How to handle sensitive data (API keys) in UI?
   - **Recommendation**: Mask by default, allow reveal, use env vars where possible
3. Should we support configuration versioning/history?
   - **Recommendation**: Phase 5 optional feature, nice-to-have not required
4. How to handle migration of existing configs to UI?
   - **Recommendation**: Import existing config.json on first launch, or provide import button

