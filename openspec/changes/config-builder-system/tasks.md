# Configuration Builder System - Implementation Tasks

## Key Learnings & Discoveries

### Hierarchical Intent Detection (Phase 3b)
Through extensive testing, we discovered that the system naturally supports **intelligent hierarchical intent matching**:
- General intents (e.g., "cooking") act as catch-all categories
- RAG collection descriptions provide specificity when selected
- LLMs naturally prioritize the most specific match available
- System is self-organizing: more specific categories "win" when present

**Example**: Query "I need a tofu recipe for dinner"
- Without collections → matches general intent "cooking"
- With tofu-magic collection → matches specific "recipes/tofu-magic"

**Implication**: Users should configure broad intents and rely on RAG collection descriptions for specificity.

### Optimized Classification Prompts (Phase 3b.6)
Systematically tested 4 prompt formats across 3 models (gemma:1b, qwen2.5:1.5b, phi3:mini):
- **Winner**: "Task: Select the matching category" format with bullet points (•)
- **Results**: Universal compatibility, instant responses, no invented categories
- **Updated**: Test endpoint, production intent-detector.js, and profile-builder.js

### Improved Model Classification (Phase 3b.2.5)
Fixed lightning bolt (⚡) detection using regex instead of hardcoded strings:
- Now catches: 0.5b, 1b, 1.5b, 3b models (previously missed 1b)
- Foundation for future comprehensive model classification system
- See `docs/MODEL_CLASSIFICATION_ENHANCEMENT.md` for future roadmap

---

## Phase 1: Connection Management Infrastructure

### 1.1 Provider Schema Interface
- [x] 1.1.1 Define `getConnectionSchema()` interface in BaseAIProvider
- [x] 1.1.2 Implement schema method in OllamaProvider
- [x] 1.1.3 Implement schema method in OpenAIProvider
- [x] 1.1.4 Implement schema method in GeminiProvider
- [x] 1.1.5 Define schema format (JSON Schema or custom format)
- [ ] 1.1.6 Add schema validation tests

### 1.2 Provider Discovery Service
- [x] 1.2.1 Create ProviderDiscovery service class
- [x] 1.2.2 Implement provider enumeration logic
- [x] 1.2.3 Implement capability detection
- [x] 1.2.4 Add caching for discovered providers
- [ ] 1.2.5 Write unit tests for discovery service

### 1.3 Connection Testing Service
- [x] 1.3.1 Create ConnectionTester service class
- [x] 1.3.2 Implement test connection logic for LLM providers
- [x] 1.3.3 Implement test connection logic for RAG providers
- [x] 1.3.4 Add timeout and error handling
- [x] 1.3.5 Return standardized test results
- [ ] 1.3.6 Write unit tests for connection testing

### 1.4 Environment Variable Management
- [x] 1.4.1 Create EnvVarManager service class
- [x] 1.4.2 Implement secure env var filtering (allowlist pattern)
- [x] 1.4.3 Implement env var validation
- [x] 1.4.4 Add env var suggestion logic
- [ ] 1.4.5 Write unit tests for env var management

### 1.5 Backend API Endpoints
- [x] 1.5.1 Create `backend/chat/routes/connections.js` route module
- [x] 1.5.2 Implement `GET /api/connections/providers` endpoint (list all providers)
- [x] 1.5.3 Implement `GET /api/connections/providers/:id/schema` endpoint (get schema)
- [x] 1.5.4 Implement `POST /api/connections/providers/:id/models` endpoint (discover models)
- [x] 1.5.5 Implement `POST /api/connections/test` endpoint (test connection)
- [x] 1.5.6 Implement `GET /api/connections/env-vars` endpoint (list available env vars)
- [x] 1.5.7 Register connections routes in `server.js`
- [ ] 1.5.8 Add request validation middleware
- [ ] 1.5.9 Add error handling middleware
- [ ] 1.5.10 Write integration tests for all endpoints

### 1.8 Shared Connection Payload (DRY)
- [x] 1.8.1 Define shared `connection` payload shape `{ provider_id, type, fields }`
- [x] 1.8.2 Add server-side validator/normalizer for the payload
- [x] 1.8.3 Update `/api/connections/test` to use shared validator
- [x] 1.8.4 Update `/api/connections/providers/:id/models` to use shared validator
- [ ] 1.8.5 Add unit tests for shared validator

### 1.6 Configuration Loader Updates
- [x] 1.6.1 Modify `loadConfig()` to return raw config (no env var substitution)
- [x] 1.6.2 Create `getProcessedConfig()` helper function for on-demand substitution
- [x] 1.6.3 Update provider initialization to use `getProcessedConfig()`
- [x] 1.6.4 Track provider connection status globally
- [x] 1.6.5 Modify `/api/ui-config` endpoint to include:
  - `hasConfig`, `isZeroConfig`, `providerStatus`
  - `hasWorkingProviders`, `hasResponseHandlers`, `chatReady`
- [ ] 1.6.6 Write unit tests for raw/processed config handling

### 1.7 Documentation
- [ ] 1.7.1 Document provider schema interface
- [x] 1.7.2 Document API endpoints (TESTING.md created)
- [x] 1.7.3 Add examples for each endpoint (TESTING.md includes curl examples)
- [ ] 1.7.4 Update ARCHITECTURE.md with new services
- [x] 1.7.5 Document raw vs processed config pattern (added to design.md and CONFIGURATION.md)

## Phase 2: Provider Configuration UI

### 2.1 Zero-Config Bootstrap
- [x] 2.1.1 Detect missing configuration on app start
- [x] 2.1.2 Show welcome screen with "Build Configuration" option
- [x] 2.1.3 Initialize empty configuration structure
- [x] 2.1.4 Suggest default providers (Ollama if local, OpenAI prompt)

### 2.2 Provider List UI
- [x] 2.2.1 Create ProviderList component
- [x] 2.2.2 Display configured LLM providers
- [x] 2.2.3 Display configured RAG providers
- [x] 2.2.4 Add "Add Provider" button
- [x] 2.2.5 Add edit/delete actions per provider
- [x] 2.2.6 Show connection status indicators
 - [x] 2.2.7 Enforce env-var-only for secret fields across UI (displays ${ENV_VAR} references)

### 2.3 Connection Wizard (Decision 15: Refactored to separate LLM/RAG wizards)
- [x] 2.3.1 Create LLMWizard component (5 steps, with model selection)
- [x] 2.3.2 Create RAGWizard component (4 steps, simpler)
- [x] 2.3.3 LLM Step 1: Select provider (Ollama, OpenAI, Gemini)
- [x] 2.3.4 LLM Step 2: Configure connection (URL, API key, etc.)
 - [x] 2.3.4.1 Secret fields only accept environment variable references
- [x] 2.3.5 LLM Step 3: Test connection & discover models
- [x] 2.3.6 LLM Step 4: Select default model for chat
- [x] 2.3.7 LLM Step 5: Name and save
- [x] 2.3.8 RAG Step 1-4: Similar flow without model selection
- [x] 2.3.9 Add form validation (canProceed checks required fields)
- [x] 2.3.10 Add back/next navigation
- [x] 2.3.11 Delete old ConnectionWizard component

### 2.4 Connection Testing UI (Integrated in Wizard Step 4)
- [x] 2.4.1 Create ConnectionTest component (integrated in wizard)
- [x] 2.4.2 Show "Test Connection" button
- [x] 2.4.3 Display loading state during test (spinner animation)
- [x] 2.4.4 Show success/failure results (green/red panels)
- [x] 2.4.5 Display error messages with suggestions
- [x] 2.4.6 Add retry logic (Try Again button on failure)
- [x] 2.4.7 Display discovered RAG collections after successful test (added in Phase 3c.3)

### 2.5 Model Discovery UI (Integrated in Wizard Step 4)
- [x] 2.5.1 Create ModelSelector component (integrated in wizard)
- [x] 2.5.2 Fetch available models from provider (auto after successful test)
- [x] 2.5.3 Display model list with metadata (scrollable list with type badges)
- [ ] 2.5.4 Add model search/filter (deferred - not critical for MVP)
- [x] 2.5.5 Show model capabilities (chat, embeddings, reasoning) as type badges

### 2.6 Environment Variable UI (Integrated in Wizard Step 3)
- [x] 2.6.1 Create EnvVarInput component (integrated in wizard config step)
- [x] 2.6.2 Show available env vars as suggestions (button to use suggested var)
- [x] 2.6.3 Add "Use Environment Variable" toggle (button sets ${VAR_NAME})
- [x] 2.6.4 Mask sensitive values (shows ${ENV_VAR} references, not actual values)
- [ ] 2.6.5 Add reveal/hide toggle (not needed - env vars are references, not secrets)
- [x] 2.6.6 Auto-wrap user input with ${} on blur (Decision 14)
- [x] 2.6.7 Fetch dynamic env vars from GET /api/connections/env-vars
- [x] 2.6.8 Display static (blue) and dynamic (green) suggestions with filtering
- [x] 2.6.9 Add tooltip explaining auto-wrap behavior

### 2.7 State Management
- [x] 2.7.1 Add "Unsaved Changes" banner (shows when workingConfig differs from applied)
- [x] 2.7.2 Add Apply/Export/Cancel buttons to ConfigBuilder
- [x] 2.7.3 Implement validation state tracking (dirty/validating/valid/invalid)
- [x] 2.7.4 Add "Validate" button (calls POST /api/config/validate)
- [x] 2.7.5 Disable Apply/Export until validation passes (Decision 13: Validation Gating)
- [x] 2.7.6 Display validation errors/warnings in UI
- [x] 2.7.7 Implement "Cancel" (discard changes, navigate away with confirmation)
- [x] 2.7.8 Implement "Export" (download JSON file with workingConfig)
- [x] 2.7.9 Implement "Apply" (POST /api/config/reload, refresh /api/ui-config, navigate to Home)
- [x] 2.7.10 Add builder mode guard (confirms before navigating with unsaved changes)

## Phase 3a: Embeddings Configuration UI ✅ COMPLETE

### 3a.1 Embeddings Tab Implementation
- [x] 3a.1.1 Update EmbeddingsSection.jsx from placeholder to functional component
- [x] 3a.1.2 Display current embedding configuration summary
- [x] 3a.1.3 Show which RAG services are using embeddings (with default/custom badges)
- [x] 3a.1.4 Add "Configure Embeddings" button

### 3a.2 Default Embedding Configuration
- [x] 3a.2.1 Create GlobalEmbeddingConfig component (integrated in EmbeddingsSection)
- [x] 3a.2.2 Provider selector (dropdown of LLMs with embedding capability)
- [x] 3a.2.3 Model selector (filtered to embedding models only)
- [x] 3a.2.4 Show provider capability badges (embedding-only models are filtered in)
- [x] 3a.2.5 Save default embedding config to workingConfig.embedding (global, not .default)

### 3a.3 Per-Service Embedding Overrides
- [x] 3a.3.1 Create ServiceEmbeddingRow component (integrated in EmbeddingsSection)
- [x] 3a.3.2 List all configured RAG services
- [x] 3a.3.3 Show which use default vs custom embeddings (with visual badges)
- [x] 3a.3.4 Add "Add Override" / "Edit Override" button per service
- [x] 3a.3.5 Override editor (select different provider/model for specific service)
- [x] 3a.3.6 Save overrides to workingConfig.rag_services[name].embedding

### 3a.4 Embedding Validation
- [x] 3a.4.1 Validate selected provider exists (referential integrity in backend)
- [x] 3a.4.2 Filter to embedding models only (frontend filtering by model type)
- [x] 3a.4.3 Show warning if RAG services configured but no embeddings (backend validation endpoint)
- [x] 3a.4.4 Update validation state in ConfigBuilder (handleEmbeddingsUpdate sets dirty state)

## Phase 3b: Intent Detection Configuration UI ✅ COMPLETE

### 3b.1 Intent Tab Implementation
- [x] 3b.1.1 Update IntentSection.jsx from placeholder to functional component
- [x] 3b.1.2 Display current intent configuration summary
- [x] 3b.1.3 Show list of defined intents
- [x] 3b.1.4 Add "Add Intent" button (inline in section)

### 3b.2 Intent Detection Provider Configuration
- [x] 3b.2.1 Implement provider config (integrated in IntentSection)
- [x] 3b.2.2 Provider selector (dropdown of configured LLMs)
- [x] 3b.2.3 Model selector for intent detection (chat models only, with ⚡ for fast models)
- [x] 3b.2.4 Save to workingConfig.intent.provider.llm and .model
- [x] 3b.2.5 Improved fast model detection (regex-based, catches 0.5b-3b params including 1b)

### 3b.3 Intent Definition Editor
- [x] 3b.3.1 Implement intent editor (integrated in IntentSection)
- [x] 3b.3.2 List existing intents with add/edit/delete actions
- [x] 3b.3.3 Inline intent form (name, description fields)
- [x] 3b.3.4 Intent saved as name:description pairs in config.intent.detection
- [x] 3b.3.5 Drag-and-drop reordering (deferred - not critical for MVP)
- [x] 3b.3.6 Save to workingConfig.intent.detection object

### 3b.4 Intent Testing UI (Modal-Based)
- [x] 3b.4.1 Implement modal-based intent tester with collection selection
- [x] 3b.4.2 Modal header shows configured provider/model being tested
- [x] 3b.4.3 Test query input field with Enter key support
- [x] 3b.4.4 Optional RAG collection inclusion (from applied config)
- [x] 3b.4.5 Collection selector with checkboxes (fetches from /api/ui-config)
- [x] 3b.4.6 Informational tip explaining applied-config-only limitation
- [x] 3b.4.7 Test results display with breakdown (intent_count, collection_count)
- [x] 3b.4.8 Show detected intent, available categories, and prompt used
- [x] 3b.4.9 Simple "Test" button in main section (non-intrusive UI)

### 3b.5 Backend Intent Test Endpoint
- [x] 3b.5.1 Create POST /api/connections/intent/test endpoint
- [x] 3b.5.2 Accept provider_config, model, working_config, selected_collections
- [x] 3b.5.3 Use normalizeConnectionPayload for temporary provider instance
- [x] 3b.5.4 Build categories from configured intents + selected collections
- [x] 3b.5.5 Extract collection descriptions from metadata.description
- [x] 3b.5.6 Call LLM with optimized classification prompt (temperature 0.1)
- [x] 3b.5.7 Return detected_intent, available_intents, intent_count, collection_count, prompt_used

### 3b.6 Prompt Optimization
- [x] 3b.6.1 Test multiple prompt formats with various models (gemma:1b, qwen2.5:1.5b, phi3:mini)
- [x] 3b.6.2 Implement "Task: Select the matching category" format (Option 4)
- [x] 3b.6.3 Use bullet points (•) instead of dashes for cleaner formatting
- [x] 3b.6.4 Update production intent-detector.js to use optimized prompt
- [x] 3b.6.5 Update profile-builder.js to use optimized prompt
- [x] 3b.6.6 Verify instant/accurate results across all small models

### 3b.5 Topic Detection Configuration
- [x] 3b.5.1 Add separate "Topic Detection" navigation tab (changed from subsection to separate tab)
- [x] 3b.5.2 Show current topic provider with auto-correction if provider deleted
- [x] 3b.5.3 Warning banner if configured provider no longer exists
- [x] 3b.5.4 Provider/model selector with chat-only model filtering (excludes reasoning/audio/video/embedding)
- [x] 3b.5.5 Save to workingConfig.topic.provider
- [x] 3b.5.6 Model caching at ConfigBuilder level (prevents duplicate API calls)
- [x] 3b.5.7 Auto-create topic.provider when first LLM is added
- [x] 3b.5.8 Static hint for recommended model characteristics

## Phase 3c: Backend & UX Enhancements

### 3c.1 Provider Abstraction Refactor
- [x] 3c.1.1 Split ProviderList into LLMProviderList and RAGProviderList components
- [x] 3c.1.2 Split ConfigBuilder handlers into type-specific functions (handleEditLLMProvider, handleDeleteRAGService, etc.)
- [x] 3c.1.3 Update LLMProvidersSection to use LLMProviderList with type-specific handlers
- [x] 3c.1.4 Update RAGServicesSection to use RAGProviderList with type-specific handlers
- [x] 3c.1.5 Create dedicated backend endpoints: POST /api/connections/llm/test
- [x] 3c.1.6 Create dedicated backend endpoints: POST /api/connections/llm/discovery/models
- [x] 3c.1.7 Create dedicated backend endpoints: POST /api/connections/rag/test
- [x] 3c.1.8 Update normalizeConnectionPayload to handle dedicated endpoint formats with implicitType
- [x] 3c.1.9 Delete old ProviderList and ProvidersSection components

### 3c.2 Referential Integrity Validation
- [x] 3c.2.1 Add validation check for config.topic.provider.llm references in POST /api/config/validate
- [x] 3c.2.2 Add validation check for config.intent.provider.llm references
- [x] 3c.2.3 Add validation check for config.responses[].llm references
- [x] 3c.2.4 Return clear error messages for invalid references

### 3c.3 RAG Collection Discovery
- [x] 3c.3.1 Modify ConnectionTester to call both healthCheck() and listCollections() for RAG providers
- [x] 3c.3.2 Return collections array with count and metadata in test results
- [x] 3c.3.3 Display collections in RAGWizard after successful connection test
- [x] 3c.3.4 Show collection names, document counts, and descriptions

### 3c.4 Chat UI Guards
- [x] 3c.4.1 Add page-level guard in Chat.jsx to check hasWorkingProviders
- [x] 3c.4.2 Add page-level guard to check hasResponseHandlers
- [x] 3c.4.3 Display informative message when guards fail
- [x] 3c.4.4 Add "Go to Configuration" button to guide users

### 3c.5 Auto-Update Chat Titles
- [x] 3c.5.1 Add titleManuallyEdited flag to session storage
- [x] 3c.5.2 Set flag when user manually renames a session
- [x] 3c.5.3 Auto-update session.title from topic if not manually edited
- [x] 3c.5.4 Only auto-update for new conversations (messageCount < 5)
- [x] 3c.5.5 Respect manual edits over auto-updates

### 3c.6 New Chat on Config Change
- [x] 3c.6.1 Add hasProviderChanges helper to detect LLM/RAG provider changes
- [x] 3c.6.2 Set createNewChat flag in sessionStorage when providers change during Apply
- [x] 3c.6.3 Check flag in Chat.jsx on mount and create new session if set
- [x] 3c.6.4 Add cleanupEmptySession utility to delete sessions with no messages
- [x] 3c.6.5 Call cleanupEmptySession when switching sessions in ChatHistory

### 3c.7 Backend Topic Detection Updates
- [x] 3c.7.1 Change identifyTopic function signature to use generic llmConfig instead of intentConfig
- [x] 3c.7.2 Implement resolveTopicLLMConfig with 3-tier fallback (topic → intent → first response handler)
- [x] 3c.7.3 Update chat.js to call identifyTopic with resolved llmConfig
- [x] 3c.7.4 Add formal topic section to config-schema.json

## Phase 3d: Chat Intelligence & History Enhancements ✅ COMPLETE

### 3d.1 Hybrid RAG Query Strategy
- [x] 3d.1.1 Update collectRagResults signature to accept userMessage, topic, and currentTopic
- [x] 3d.1.2 Implement query text selection logic (first message → raw query, follow-up → contextualized topic)
- [x] 3d.1.3 Add logging for query strategy selection
- [x] 3d.1.4 Update chat.js to pass all three parameters
- [x] 3d.1.5 Test with real queries to verify improved semantic matching

### 3d.2 Topic Detection Improvements
- [x] 3d.2.1 Modify identifyTopic to return structured object `{ topic, status }`
- [x] 3d.2.2 Add first message detection (always returns new_topic status)
- [x] 3d.2.3 Improve prompt with explicit examples of good/bad summaries
- [x] 3d.2.4 Add robust JSON parsing with fallbacks
- [x] 3d.2.5 Update chat.js to destructure returned object
- [x] 3d.2.6 Update topic test endpoint to reuse identifyTopic function

### 3d.3 Topic Detection UI Updates
- [x] 3d.3.1 Remove client-side topic change detection in TopicSection
- [x] 3d.3.2 Trust backend topicStatus for "new topic" badge
- [x] 3d.3.3 Update isSmallModel helper to use regex for parameter detection

### 3d.4 Chat History Message Management
- [x] 3d.4.1 Implement removeLastMessageFromSnapshot in sessionStorage.js
- [x] 3d.4.2 Export and integrate into SessionManager context
- [x] 3d.4.3 Add hover-based delete button (🗑️) on last message
- [x] 3d.4.4 Add confirmation dialog before deletion
- [x] 3d.4.5 Update topic state when message is deleted
- [x] 3d.4.6 Add hover-based resend button (↻) for last user message
- [x] 3d.4.7 Implement resend logic (delete message, populate input field)

## Phase 4: Response Handler Builder ✅ COMPLETE

**Enhancements added during implementation:**
- Model filtering: Only show chat-capable models (exclude embedding/audio/image/video)
- Model badges: ⚡ fast, 🎨 vision, 🔧 function-calling, 📚 large context
- Alphabetical model sorting across all dropdowns
- Export filename prompt for custom naming
- Model metadata display (max tokens, capabilities)
- Atomic state updates for collection matching to prevent UI bugs

### 4.1 Response Handler List UI
- [x] 4.1.1 Create ResponseHandlerList component (integrated into HandlersSection)
- [x] 4.1.2 Display all handlers in order
- [x] 4.1.3 Show match criteria summary per handler
- [x] 4.1.4 Add up/down arrows for reordering (drag-and-drop deferred as not essential)
- [x] 4.1.5 Add "Add Handler" button
- [x] 4.1.6 Add edit/delete/duplicate actions
- [x] 4.1.7 Highlight catch-all handler (no match criteria)

### 4.2 Match Criteria Builder
- [x] 4.2.1 Create MatchCriteriaBuilder component (integrated into HandlerModal MatchTab)
- [x] 4.2.2 Add service selector (dropdown of configured RAG services)
- [x] 4.2.3 Add collection matcher (exact/contains)
- [x] 4.2.4 Add intent selector (dropdown of configured intents)
- [x] 4.2.5 Add intent regex input (text input with hint for regex patterns)
- [x] 4.2.6 Add RAG results selector (match/partial/none/any)
- [x] 4.2.7 Add reasoning toggle
- [x] 4.2.8 Show visual preview of match criteria (displayed in HandlerCard)

### 4.3 Prompt Template Editor
- [x] 4.3.1 Create PromptEditor component (integrated into HandlerModal PromptTab)
- [x] 4.3.2 Add multiline text input
- [x] 4.3.3 Add variable insertion (click to insert {{rag_context}}, {{reasoning}}, etc.)
- [x] 4.3.4 Show available variables as hints
- [ ] 4.3.5 Add syntax highlighting for variables (deferred - plain textarea is sufficient)
- [ ] 4.3.6 Add prompt templates library (deferred - optional enhancement)

### 4.4 LLM/Model Selection
- [x] 4.4.1 Create LLMSelector component for response handlers (integrated into HandlerModal BasicTab)
- [x] 4.4.2 Select provider from configured LLMs
- [x] 4.4.3 Select model from provider's available models
- [x] 4.4.4 Set max_tokens
- [ ] 4.4.5 Add reasoning configuration (deferred to Phase 5 - Reasoning Tab)

### 4.5 Handler Testing UI (DEFERRED - Optional Enhancement)
- [ ] 4.5.1 Create HandlerTester component
- [ ] 4.5.2 Input test query
- [ ] 4.5.3 Simulate RAG results
- [ ] 4.5.4 Show which handler would match
- [ ] 4.5.5 Display match reasoning
- [ ] 4.5.6 Add "Test All Handlers" mode

### 4.6 Sequential Ordering Visualization
- [x] 4.6.1 Show handler execution order clearly (numbered cards)
- [x] 4.6.2 Highlight "first-match wins" behavior (info tip at top)
- [x] 4.6.3 Add warnings for unreachable handlers (catch-all positioning, multiple catch-alls)
- [x] 4.6.4 Suggest reordering if issues detected (warnings with actionable messages)

## Phase 5: Reasoning Configuration & Polish

### 5.1 Reasoning Tab Implementation
- [ ] 5.1.1 Update ReasoningSection.jsx from placeholder to functional component
- [ ] 5.1.2 Display current reasoning configuration summary
- [ ] 5.1.3 Show which response handlers use reasoning
- [ ] 5.1.4 Add "Configure Reasoning" button

### 5.1a Reasoning Provider Configuration
- [ ] 5.1a.1 Create ReasoningConfig component
- [ ] 5.1a.2 Provider selector (dropdown of LLMs with reasoning capability)
- [ ] 5.1a.3 Model selector (filtered to reasoning-capable models)
- [ ] 5.1a.4 Reasoning parameters editor (thinking_budget, etc.)
- [ ] 5.1a.5 Save to workingConfig.reasoning
- [ ] 5.1a.6 Add reasoning model capability detection

### 5.2 Backend Config API Endpoints (Continued)
- [x] 5.2.1 Create `backend/chat/routes/config.js` route module
- [x] 5.2.2 Implement `POST /api/config/reload` endpoint (hot-reload config)
  - [x] 5.2.2.1 Refactor server.js to use getter functions for state
  - [x] 5.2.2.2 Update all route factories to accept getters
  - [x] 5.2.2.3 Implement reinitializeProviders() in server.js
  - [x] 5.2.2.4 Connect POST /api/config/reload to reinitializeProviders
- [x] 5.2.3 Implement `GET /api/config/export` endpoint (export current config as JSON)
- [x] 5.2.4 Implement `POST /api/config/validate` endpoint (validate config)
 - [x] 5.2.4.1 Use proper validateConfig from config-loader
 - [x] 5.2.4.2 Enforce: LLM + response handler required (except zero-config)
 - [x] 5.2.4.3 Return errors for partial configs (LLM without responses, or vice versa)
- [x] 5.2.5 Register config routes in `server.js`
- [ ] 5.2.6 Add authorization/security checks
- [ ] 5.2.7 Write integration tests for config endpoints

### 5.3 Configuration Export UI (Polish)
- [x] 5.3.1 Export functionality in ConfigBuilder (no separate component needed)
- [x] 5.3.2 Generate JSON from current configuration (workingConfig)
- [x] 5.3.3 Add "Export JSON" button (with download functionality)
- [ ] 5.3.4 Add "Copy to Clipboard" button (future enhancement)
- [ ] 5.3.5 Show formatted JSON preview (future enhancement)
- [x] 5.3.6 Fixed filename: 'flex-chat-config.json'
- [ ] 5.3.7 Add timestamp to exported filename (config-2025-10-29.json)
- [ ] 5.3.8 Add metadata to exported JSON (export date, version)

### 5.4 Configuration Import UI (Polish)
- [ ] 5.4.1 Create ImportConfig component
- [ ] 5.4.2 Add file upload input
- [ ] 5.4.3 Parse and validate uploaded JSON
- [ ] 5.4.4 Show import preview/diff before loading
- [ ] 5.4.5 Add "Replace" vs "Merge" options
- [ ] 5.4.6 Handle import errors gracefully with actionable messages
- [ ] 5.4.7 Add confirmation dialog before loading imported config

### 5.5 Configuration Validation UI (Polish)
- [ ] 5.5.1 Enhance validation error categorization
- [ ] 5.5.2 Add "Fix" suggestions for common validation errors
- [ ] 5.5.3 Add validation progress indicator
- [ ] 5.5.4 Improve validation error messages with actionable guidance
- [ ] 5.5.5 Add validation warnings (non-blocking issues)
- [ ] 5.5.6 Link validation errors to problematic sections

### 5.6 Live Configuration Updates (Complete)
- [x] 5.6.1 Add "Apply Changes" button in UI (calls `/api/config/reload`)
- [x] 5.6.2 Show "Unsaved Changes" indicator (yellow banner)
- [x] 5.6.3 Add confirmation before applying (Cancel button with confirm dialog)
- [x] 5.6.4 Handle apply errors gracefully (error alerts)
- [x] 5.6.5 Display success confirmation with reload status (auto-navigate to Home)
- [x] 5.6.6 Add global route guard when `hasUnappliedChanges` (except Export/Cancel)
- [x] 5.6.7 Add Validate button and gating logic (Apply/Export disabled until valid)

### 5.7 Configuration Diff/Preview
- [ ] 5.7.1 Create ConfigDiff component
- [ ] 5.7.2 Show side-by-side diff (appliedConfig vs workingConfig)
- [ ] 5.7.3 Highlight added/removed/modified sections with color coding
- [ ] 5.7.4 Add "Review Changes" modal before apply
- [ ] 5.7.5 Show summary stats (X providers added, Y handlers modified, etc.)
- [ ] 5.7.6 Add "Revert" option to discard specific changes

### 5.8 Performance Optimizations
- [ ] 5.8.1 Implement frontend static data caching (Decision 16 from design.md)
- [ ] 5.8.2 Cache provider list at ConfigBuilder level
- [ ] 5.8.3 Cache environment variables at ConfigBuilder level
- [ ] 5.8.4 Pass cached data as props to wizards/sections
- [ ] 5.8.5 Add cache invalidation on config reload
- [ ] 5.8.6 Optimize re-renders with React.memo where appropriate
- [ ] 5.8.7 Add debouncing to validation triggers

### 5.9 Configuration History (Optional)
- [ ] 5.9.1 Store config versions in localStorage
- [ ] 5.9.2 Create ConfigHistory component
- [ ] 5.9.3 Show list of past configurations with timestamps
- [ ] 5.9.4 Add restore/revert functionality
- [ ] 5.9.5 Add diff view between any two versions
- [ ] 5.9.6 Add config snapshot naming/descriptions

### 5.10 UX Polish
- [ ] 5.10.1 Add loading states throughout (spinners, skeletons)
- [ ] 5.10.2 Add success/error toasts for all actions
- [ ] 5.10.3 Improve form validation messages with actionable guidance
- [ ] 5.10.4 Add keyboard shortcuts (Ctrl+S to validate, etc.)
- [ ] 5.10.5 Improve mobile responsiveness for all components
- [ ] 5.10.6 Add help tooltips/documentation links throughout
- [ ] 5.10.7 Add onboarding tour (optional)
- [ ] 5.10.8 Polish animations and transitions
- [ ] 5.10.9 Add accessibility improvements (ARIA labels, keyboard navigation)

### 5.11 Documentation
- [ ] 5.11.1 Create `docs/CONFIGURATION_BUILDER.md` (comprehensive guide)
- [ ] 5.11.2 Update `docs/CONFIGURATION.md` with UI workflow
- [ ] 5.11.3 Update `README.md` getting started guide
- [ ] 5.11.4 Add screenshots/GIFs to documentation
- [ ] 5.11.5 Update `CHANGELOG.md` with config-builder-system feature summary
- [ ] 5.11.6 Document all configuration options and their UI locations
- [ ] 5.11.7 Create video walkthrough (optional)

## Testing & Quality Assurance

### Unit Tests
- [ ] Write unit tests for all new services
- [ ] Write unit tests for all new React components
- [ ] Achieve 80%+ code coverage

### Integration Tests
- [ ] Test all new API endpoints
- [ ] Test configuration export/import flow
- [ ] Test zero-config bootstrap flow
- [ ] Test connection testing flow

### End-to-End Tests
- [ ] Test complete zero-config-to-export workflow
- [ ] Test configuration import and modification
- [ ] Test backward compatibility with existing configs

### Manual Testing
- [ ] Test with Ollama (local provider)
- [ ] Test with OpenAI
- [ ] Test with Gemini
- [ ] Test with multiple RAG services
- [ ] Test error scenarios
- [ ] Test on different browsers
- [ ] Test on mobile devices

