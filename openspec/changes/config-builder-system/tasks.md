# Configuration Builder System - Implementation Tasks

## Phase 1: Connection Management Infrastructure

### 1.1 Provider Schema Interface
- [ ] 1.1.1 Define `getConnectionSchema()` interface in BaseAIProvider
- [ ] 1.1.2 Implement schema method in OllamaProvider
- [ ] 1.1.3 Implement schema method in OpenAIProvider
- [ ] 1.1.4 Implement schema method in GeminiProvider
- [ ] 1.1.5 Define schema format (JSON Schema or custom format)
- [ ] 1.1.6 Add schema validation tests

### 1.2 Provider Discovery Service
- [ ] 1.2.1 Create ProviderDiscovery service class
- [ ] 1.2.2 Implement provider enumeration logic
- [ ] 1.2.3 Implement capability detection
- [ ] 1.2.4 Add caching for discovered providers
- [ ] 1.2.5 Write unit tests for discovery service

### 1.3 Connection Testing Service
- [ ] 1.3.1 Create ConnectionTester service class
- [ ] 1.3.2 Implement test connection logic for LLM providers
- [ ] 1.3.3 Implement test connection logic for RAG providers
- [ ] 1.3.4 Add timeout and error handling
- [ ] 1.3.5 Return standardized test results
- [ ] 1.3.6 Write unit tests for connection testing

### 1.4 Environment Variable Management
- [ ] 1.4.1 Create EnvVarManager service class
- [ ] 1.4.2 Implement secure env var filtering (allowlist pattern)
- [ ] 1.4.3 Implement env var validation
- [ ] 1.4.4 Add env var suggestion logic
- [ ] 1.4.5 Write unit tests for env var management

### 1.5 Backend API Endpoints
- [ ] 1.5.1 Create `backend/chat/routes/connections.js` route module
- [ ] 1.5.2 Implement `GET /api/connections/providers` endpoint (list all providers)
- [ ] 1.5.3 Implement `GET /api/connections/providers/:id/schema` endpoint (get schema)
- [ ] 1.5.4 Implement `GET /api/connections/providers/:id/models` endpoint (discover models)
- [ ] 1.5.5 Implement `POST /api/connections/test` endpoint (test connection)
- [ ] 1.5.6 Implement `GET /api/connections/env-vars` endpoint (list available env vars)
- [ ] 1.5.7 Register connections routes in `server.js`
- [ ] 1.5.8 Add request validation middleware
- [ ] 1.5.9 Add error handling middleware
- [ ] 1.5.10 Write integration tests for all endpoints

### 1.6 Configuration Loader Updates
- [ ] 1.6.1 Modify `loadConfig()` to return raw config (no env var substitution)
- [ ] 1.6.2 Create `getProcessedConfig()` helper function for on-demand substitution
- [ ] 1.6.3 Update provider initialization to use `getProcessedConfig()`
- [ ] 1.6.4 Track provider connection status globally
- [ ] 1.6.5 Modify `/api/ui-config` endpoint to include:
  - `hasConfig`, `isZeroConfig`, `providerStatus`
  - `hasWorkingProviders`, `hasResponseHandlers`, `chatReady`
- [ ] 1.6.6 Write unit tests for raw/processed config handling

### 1.7 Documentation
- [ ] 1.7.1 Document provider schema interface
- [ ] 1.7.2 Document API endpoints
- [ ] 1.7.3 Add examples for each endpoint
- [ ] 1.7.4 Update ARCHITECTURE.md with new services
- [ ] 1.7.5 Document raw vs processed config pattern

## Phase 2: Provider Configuration UI

### 2.1 Zero-Config Bootstrap
- [ ] 2.1.1 Detect missing configuration on app start
- [ ] 2.1.2 Show welcome screen with "Build Configuration" option
- [ ] 2.1.3 Initialize empty configuration structure
- [ ] 2.1.4 Suggest default providers (Ollama if local, OpenAI prompt)

### 2.2 Provider List UI
- [ ] 2.2.1 Create ProviderList component
- [ ] 2.2.2 Display configured LLM providers
- [ ] 2.2.3 Display configured RAG providers
- [ ] 2.2.4 Add "Add Provider" button
- [ ] 2.2.5 Add edit/delete actions per provider
- [ ] 2.2.6 Show connection status indicators

### 2.3 Connection Wizard
- [ ] 2.3.1 Create ConnectionWizard component
- [ ] 2.3.2 Step 1: Select provider type (LLM/RAG)
- [ ] 2.3.3 Step 2: Select provider (Ollama, OpenAI, Gemini, ChromaDB)
- [ ] 2.3.4 Step 3: Configure connection (URL, API key, etc.)
- [ ] 2.3.5 Step 4: Test connection
- [ ] 2.3.6 Step 5: Name and save
- [ ] 2.3.7 Add form validation
- [ ] 2.3.8 Add back/next navigation

### 2.4 Connection Testing UI
- [ ] 2.4.1 Create ConnectionTest component
- [ ] 2.4.2 Show "Test Connection" button
- [ ] 2.4.3 Display loading state during test
- [ ] 2.4.4 Show success/failure results
- [ ] 2.4.5 Display error messages with suggestions
- [ ] 2.4.6 Add retry logic

### 2.5 Model Discovery UI
- [ ] 2.5.1 Create ModelSelector component
- [ ] 2.5.2 Fetch available models from provider
- [ ] 2.5.3 Display model list with metadata
- [ ] 2.5.4 Add model search/filter
- [ ] 2.5.5 Show model capabilities (chat, embeddings, reasoning)

### 2.6 Environment Variable UI
- [ ] 2.6.1 Create EnvVarInput component
- [ ] 2.6.2 Show available env vars as suggestions
- [ ] 2.6.3 Add "Use Environment Variable" toggle
- [ ] 2.6.4 Mask sensitive values
- [ ] 2.6.5 Add reveal/hide toggle

### 2.7 State Management
- [ ] 2.7.1 Set up configuration state management (Context/Zustand)
- [ ] 2.7.2 Implement add/edit/delete provider actions
- [ ] 2.7.3 Implement configuration persistence
- [ ] 2.7.4 Add undo/redo support (optional)

## Phase 3: Embedding & Intent Configuration UI

### 3.1 Embedding Configuration UI
- [ ] 3.1.1 Create EmbeddingConfig component
- [ ] 3.1.2 Select default embedding provider (from configured LLMs)
- [ ] 3.1.3 Select default embedding model
- [ ] 3.1.4 Add per-service embedding overrides
- [ ] 3.1.5 Show which services use default vs custom embeddings

### 3.2 Intent Detection Configuration UI
- [ ] 3.2.1 Create IntentConfig component
- [ ] 3.2.2 Select intent detection provider/model
- [ ] 3.2.3 Create IntentPhraseEditor component
- [ ] 3.2.4 Add/edit/delete intent definitions
- [ ] 3.2.5 Show intent name and description fields
- [ ] 3.2.6 Add intent reordering (if needed)

### 3.3 Intent Testing UI
- [ ] 3.3.1 Create IntentTester component
- [ ] 3.3.2 Input test query
- [ ] 3.3.3 Show detected intent
- [ ] 3.3.4 Display confidence/reasoning
- [ ] 3.3.5 Add "Test All Intents" mode

## Phase 4: Response Handler Builder

### 4.1 Response Handler List UI
- [ ] 4.1.1 Create ResponseHandlerList component
- [ ] 4.1.2 Display all handlers in order
- [ ] 4.1.3 Show match criteria summary per handler
- [ ] 4.1.4 Add drag-and-drop reordering
- [ ] 4.1.5 Add "Add Handler" button
- [ ] 4.1.6 Add edit/delete/duplicate actions
- [ ] 4.1.7 Highlight catch-all handler (no match criteria)

### 4.2 Match Criteria Builder
- [ ] 4.2.1 Create MatchCriteriaBuilder component
- [ ] 4.2.2 Add service selector (dropdown of configured RAG services)
- [ ] 4.2.3 Add collection matcher (exact/contains)
- [ ] 4.2.4 Add intent selector (dropdown of configured intents)
- [ ] 4.2.5 Add intent regex input
- [ ] 4.2.6 Add RAG results selector (match/partial/none/any)
- [ ] 4.2.7 Add reasoning toggle
- [ ] 4.2.8 Show visual preview of match criteria

### 4.3 Prompt Template Editor
- [ ] 4.3.1 Create PromptEditor component
- [ ] 4.3.2 Add multiline text input
- [ ] 4.3.3 Add variable autocomplete ({{rag_context}}, {{reasoning}}, etc.)
- [ ] 4.3.4 Show available variables as hints
- [ ] 4.3.5 Add syntax highlighting for variables
- [ ] 4.3.6 Add prompt templates library (optional)

### 4.4 LLM/Model Selection
- [ ] 4.4.1 Create LLMSelector component for response handlers
- [ ] 4.4.2 Select provider from configured LLMs
- [ ] 4.4.3 Select model from provider's available models
- [ ] 4.4.4 Set max_tokens
- [ ] 4.4.5 Add reasoning configuration (if enabled)

### 4.5 Handler Testing UI
- [ ] 4.5.1 Create HandlerTester component
- [ ] 4.5.2 Input test query
- [ ] 4.5.3 Simulate RAG results
- [ ] 4.5.4 Show which handler would match
- [ ] 4.5.5 Display match reasoning
- [ ] 4.5.6 Add "Test All Handlers" mode

### 4.6 Sequential Ordering Visualization
- [ ] 4.6.1 Show handler execution order clearly
- [ ] 4.6.2 Highlight "first-match wins" behavior
- [ ] 4.6.3 Add warnings for unreachable handlers
- [ ] 4.6.4 Suggest reordering if issues detected

## Phase 5: Configuration Export/Import & Polish

### 5.1 Backend Config API Endpoints
- [ ] 5.1.1 Create `backend/chat/routes/config.js` route module
- [ ] 5.1.2 Implement `POST /api/config/reload` endpoint (hot-reload config)
- [ ] 5.1.3 Implement `GET /api/config/export` endpoint (export current config as JSON)
- [ ] 5.1.4 Implement `GET /api/config/validate` endpoint (validate config)
- [ ] 5.1.5 Register config routes in `server.js`
- [ ] 5.1.6 Add authorization/security checks
- [ ] 5.1.7 Write integration tests for config endpoints

### 5.2 Configuration Export UI
- [ ] 5.2.1 Create ExportConfig component
- [ ] 5.2.2 Generate JSON from current configuration
- [ ] 5.2.3 Add "Download JSON" button
- [ ] 5.2.4 Add "Copy to Clipboard" button
- [ ] 5.2.5 Show formatted JSON preview
- [ ] 5.2.6 Add filename input

### 5.3 Configuration Import UI
- [ ] 5.3.1 Create ImportConfig component
- [ ] 5.3.2 Add file upload input
- [ ] 5.3.3 Parse and validate uploaded JSON
- [ ] 5.3.4 Show import preview/diff
- [ ] 5.3.5 Add "Replace" vs "Merge" options
- [ ] 5.3.6 Handle import errors gracefully

### 5.4 Configuration Validation UI
- [ ] 5.4.1 Create ConfigValidator component
- [ ] 5.4.2 Run validation on current config
- [ ] 5.4.3 Display validation errors/warnings
- [ ] 5.4.4 Link to problematic sections
- [ ] 5.4.5 Add "Fix" suggestions where possible

### 5.5 Live Configuration Updates
- [ ] 5.5.1 Add "Apply Changes" button in UI (calls `/api/config/reload`)
- [ ] 5.5.2 Show "Unsaved Changes" indicator
- [ ] 5.5.3 Add confirmation before applying
- [ ] 5.5.4 Handle apply errors gracefully
- [ ] 5.5.5 Display success confirmation with reload status

### 5.6 Configuration Diff/Preview
- [ ] 5.6.1 Create ConfigDiff component
- [ ] 5.6.2 Show before/after comparison
- [ ] 5.6.3 Highlight added/removed/modified sections
- [ ] 5.6.4 Add "Revert" option

### 5.7 UX Polish
- [ ] 5.7.1 Add loading states throughout
- [ ] 5.7.2 Add success/error toasts
- [ ] 5.7.3 Improve form validation messages
- [ ] 5.7.4 Add keyboard shortcuts
- [ ] 5.7.5 Improve mobile responsiveness
- [ ] 5.7.6 Add help tooltips/documentation links
- [ ] 5.7.7 Add onboarding tour (optional)

### 5.8 Documentation
- [ ] 5.8.1 Create `docs/CONFIGURATION_BUILDER.md`
- [ ] 5.8.2 Update `docs/CONFIGURATION.md` with UI workflow
- [ ] 5.8.3 Update `README.md` getting started guide
- [ ] 5.8.4 Add screenshots/GIFs to documentation
- [ ] 5.8.5 Create video walkthrough (optional)

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

