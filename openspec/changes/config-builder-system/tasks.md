# Configuration Builder System - Implementation Tasks

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

### 2.3 Connection Wizard
- [x] 2.3.1 Create ConnectionWizard component
- [x] 2.3.2 Step 1: Select provider type (LLM/RAG)
- [x] 2.3.3 Step 2: Select provider (Ollama, OpenAI, Gemini, ChromaDB)
- [x] 2.3.4 Step 3: Configure connection (URL, API key, etc.)
 - [x] 2.3.4.1 Secret fields only accept environment variable references
- [x] 2.3.5 Step 4: Test connection
- [x] 2.3.6 Step 5: Name and save
- [x] 2.3.7 Add form validation (canProceed checks required fields)
- [x] 2.3.8 Add back/next navigation
 - [ ] 2.3.9 Block navigation away while unapplied (builder mode guard) - Phase 2.7

### 2.4 Connection Testing UI (Integrated in Wizard Step 4)
- [x] 2.4.1 Create ConnectionTest component (integrated in wizard)
- [x] 2.4.2 Show "Test Connection" button
- [x] 2.4.3 Display loading state during test (spinner animation)
- [x] 2.4.4 Show success/failure results (green/red panels)
- [x] 2.4.5 Display error messages with suggestions
- [x] 2.4.6 Add retry logic (Try Again button on failure)

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
- [x] 5.1.1 Create `backend/chat/routes/config.js` route module
- [ ] 5.1.2 Implement `POST /api/config/reload` endpoint (hot-reload config) - placeholder added
- [x] 5.1.3 Implement `GET /api/config/export` endpoint (export current config as JSON)
- [x] 5.1.4 Implement `POST /api/config/validate` endpoint (validate config)
 - [x] 5.1.4.1 Use proper validateConfig from config-loader
 - [x] 5.1.4.2 Enforce: LLM + response handler required (except zero-config)
 - [x] 5.1.4.3 Return errors for partial configs (LLM without responses, or vice versa)
- [x] 5.1.5 Register config routes in `server.js`
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
 - [ ] 5.5.6 Add global route guard when `hasUnappliedChanges` (except Export/Cancel)
 - [ ] 5.5.7 Add Validate button and gating logic (Apply/Export disabled until valid)

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

