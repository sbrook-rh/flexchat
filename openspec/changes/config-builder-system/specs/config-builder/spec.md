# config-builder Specification (NEW)

## Purpose
The Configuration Builder capability provides a complete UI-driven system for authoring, testing, and managing Flex Chat configurations without requiring manual JSON editing. It enables zero-config startup, provider discovery, connection testing, and visual configuration building.

## ADDED Requirements

### Requirement: UI Configuration Status
The system SHALL extend the existing `/api/ui-config` endpoint to provide configuration and provider status for UI decision-making.

#### Scenario: Configuration Status in UI Config
- **WHEN** the UI requests `/api/ui-config` at application startup
- **THEN** the system returns extended configuration including:
  - Existing fields: `collections`, `wrappers`, `modelSelection`
  - New field: `hasConfig` - boolean indicating if config file exists
  - New field: `isZeroConfig` - boolean indicating zero-config mode
  - New field: `providerStatus` - object with connection status per provider
  - New field: `hasWorkingProviders` - boolean indicating at least one LLM connected
  - New field: `hasResponseHandlers` - boolean indicating at least one response handler
  - New field: `chatReady` - boolean indicating chat is usable (providers AND handlers)

#### Scenario: Provider Status Tracking
- **WHEN** providers are initialized at startup or reload
- **THEN** the system tracks connection status for each provider
- **AND** includes status in `/api/ui-config` response: `{ connected: true }` or `{ connected: false, error: "message" }`

#### Scenario: Chat Readiness Check
- **WHEN** determining if chat functionality is available
- **THEN** the system checks for at least one working LLM provider
- **AND** checks for at least one configured response handler
- **AND** sets `chatReady: true` only if both conditions met

### Requirement: Provider Discovery
The system SHALL provide APIs for discovering available AI and RAG providers with their capabilities and configuration requirements.

#### Scenario: List Available Providers
- **WHEN** the UI requests available providers via `GET /api/connections/providers`
- **THEN** the system returns providers grouped by type (`llm`, `rag`) with each provider including `id`, `display_name`, `description`, and complete `schema` object
- **AND** the response structure enables single API call at app initialization without repeated fetches

#### Scenario: Get Provider Schema
- **WHEN** the UI requests a provider's configuration schema via `GET /api/connections/providers/:id/schema`
- **THEN** the system returns the provider's `getConnectionSchema()` output with required fields, optional fields, and field types

#### Scenario: Discover Provider Models
- **WHEN** the UI requests available models via `GET /api/connections/providers/:id/models` with connection details
- **THEN** the system connects to the provider and returns available models with metadata (type, capabilities, context length)

### Requirement: Connection Testing
The system SHALL provide connection testing capabilities for validating provider configurations before saving.

#### Scenario: Test LLM Connection
- **WHEN** a user tests an LLM connection via `POST /api/connections/test` with provider details
- **THEN** the system attempts to connect and perform a simple operation (list models or simple completion)
- **AND** returns success/failure status with error details if failed

#### Scenario: Test RAG Connection
- **WHEN** a user tests a RAG connection via `POST /api/connections/test` with service details
- **THEN** the system attempts to connect and perform a health check or simple query
- **AND** returns success/failure status with error details if failed

#### Scenario: Connection Test Timeout
- **WHEN** a connection test takes longer than 10 seconds
- **THEN** the system times out and returns a timeout error with helpful message

### Requirement: Environment Variable Management
The system SHALL provide secure environment variable discovery and management for provider configuration.

#### Scenario: List Available Environment Variables
- **WHEN** the UI requests available env vars via `GET /api/connections/env-vars`
- **THEN** the system returns a filtered list of environment variables matching allowed patterns (e.g., `*_API_KEY`, `*_URL`, `*_TOKEN`)
- **AND** masks sensitive values

#### Scenario: Environment Variable Validation
- **WHEN** a configuration references an environment variable
- **THEN** the system validates that the variable exists or provides a warning

#### Scenario: Environment Variable Suggestions
- **WHEN** configuring a provider that requires an API key
- **THEN** the system suggests relevant environment variables (e.g., `OPENAI_API_KEY` for OpenAI provider)

### Requirement: Zero-Config Bootstrap
The system SHALL support starting with no configuration file and building configuration through the UI.

#### Scenario: No Configuration on Startup
- **WHEN** the application starts and no configuration file exists
- **THEN** the system initializes with an empty configuration structure
- **AND** displays a welcome screen prompting the user to build configuration

#### Scenario: Default Provider Suggestions
- **WHEN** starting with zero configuration
- **THEN** the system suggests default providers based on detected environment (e.g., Ollama if running locally)

#### Scenario: Minimal Viable Configuration
- **WHEN** a user adds their first provider
- **THEN** the system creates a minimal viable configuration with sensible defaults

### Requirement: Provider Configuration UI
The system SHALL provide a complete UI for adding, editing, and removing AI and RAG providers.

#### Scenario: Add New Provider
- **WHEN** a user clicks "Add Provider" and completes the wizard
- **THEN** the system adds the provider to the configuration
- **AND** validates the configuration
- **AND** optionally tests the connection

#### Scenario: Edit Existing Provider
- **WHEN** a user edits a provider's configuration
- **THEN** the system updates the configuration
- **AND** re-validates dependent configurations (response handlers using this provider)

#### Scenario: Remove Provider
- **WHEN** a user removes a provider
- **THEN** the system checks for dependencies (response handlers, embeddings, intent detection)
- **AND** warns if removal would break configuration
- **AND** requires confirmation before removal

#### Scenario: Provider Connection Status
- **WHEN** viewing the provider list
- **THEN** each provider shows connection status (connected, disconnected, error)
- **AND** provides quick actions (test, edit, remove)

### Requirement: Embedding Configuration UI
The system SHALL provide UI for configuring default embeddings and per-service overrides.

#### Scenario: Configure Default Embedding
- **WHEN** a user selects default embedding provider and model
- **THEN** the system updates the `embedding` section in configuration
- **AND** shows which RAG services will use this default

#### Scenario: Per-Service Embedding Override
- **WHEN** a user configures a RAG service with custom embeddings
- **THEN** the system adds service-specific embedding configuration
- **AND** indicates this service uses custom embeddings (not default)

#### Scenario: Embedding Model Compatibility Warning
- **WHEN** a user changes embedding configuration for a service with existing collections
- **THEN** the system warns that existing collections were embedded with a different model
- **AND** suggests re-embedding or keeping previous configuration

### Requirement: Intent Detection Configuration UI
The system SHALL provide UI for configuring intent detection provider and defining intent phrases.

#### Scenario: Configure Intent Detection Provider
- **WHEN** a user selects intent detection provider and model
- **THEN** the system updates the `intent.provider` section
- **AND** validates the selected provider supports chat completion

#### Scenario: Add Intent Definition
- **WHEN** a user adds a new intent with name and description
- **THEN** the system adds it to `intent.detection`
- **AND** validates the intent name is unique
- **AND** makes it available for response handler matching

#### Scenario: Edit Intent Definition
- **WHEN** a user edits an intent's name or description
- **THEN** the system updates the configuration
- **AND** updates references in response handlers if name changed

#### Scenario: Remove Intent Definition
- **WHEN** a user removes an intent
- **THEN** the system checks for response handlers using this intent
- **AND** warns if removal would affect handlers
- **AND** requires confirmation

#### Scenario: Test Intent Classification
- **WHEN** a user enters a test query in the intent tester
- **THEN** the system sends it to the intent detection provider
- **AND** displays the detected intent with confidence/reasoning

### Requirement: Response Handler Builder
The system SHALL provide a visual builder for creating and managing response handlers with match criteria.

#### Scenario: Add Response Handler
- **WHEN** a user creates a new response handler
- **THEN** the system adds it to the `responses` array
- **AND** allows configuration of match criteria, LLM, model, prompt, and max_tokens

#### Scenario: Configure Match Criteria
- **WHEN** a user builds match criteria for a handler
- **THEN** the system provides UI for selecting:
  - Service (dropdown of configured RAG services)
  - Collection matching (exact name or contains substring)
  - Intent (dropdown of configured intents or regex pattern)
  - RAG results (match/partial/none/any)
  - Reasoning flag
- **AND** shows visual preview of the criteria

#### Scenario: Prompt Template Editor
- **WHEN** a user edits a response handler prompt
- **THEN** the system provides a text editor with:
  - Variable autocomplete ({{rag_context}}, {{reasoning}}, {{topic}}, {{intent}})
  - Syntax highlighting for variables
  - Available variables reference

#### Scenario: Handler Ordering
- **WHEN** a user reorders response handlers via drag-and-drop
- **THEN** the system updates the `responses` array order
- **AND** warns if reordering creates unreachable handlers

#### Scenario: Unreachable Handler Detection
- **WHEN** a response handler's match criteria are fully covered by an earlier handler
- **THEN** the system highlights the unreachable handler
- **AND** suggests reordering or refining criteria

#### Scenario: Test Handler Matching
- **WHEN** a user tests a query in the handler tester
- **THEN** the system simulates the matching process
- **AND** shows which handler would be selected
- **AND** displays the matching reasoning

### Requirement: Configuration Export
The system SHALL provide export functionality to generate JSON configuration files.

#### Scenario: Export Current Configuration
- **WHEN** a user clicks "Export Configuration"
- **THEN** the system generates a valid JSON configuration file from current state
- **AND** provides download or copy-to-clipboard options

#### Scenario: Export with Filename
- **WHEN** a user specifies a filename for export
- **THEN** the system saves the configuration with the specified name
- **AND** suggests `.json` extension if not provided

#### Scenario: Export Validation
- **WHEN** exporting configuration
- **THEN** the system validates the configuration before export
- **AND** shows validation errors if any exist
- **AND** allows export anyway with warning

### Requirement: Configuration Import
The system SHALL provide import functionality to load JSON configuration files into the UI.

#### Scenario: Import Configuration File
- **WHEN** a user uploads a JSON configuration file
- **THEN** the system parses and validates the JSON
- **AND** displays a preview of the configuration

#### Scenario: Import with Replace
- **WHEN** a user imports with "Replace" option
- **THEN** the system replaces the entire current configuration
- **AND** requires confirmation before replacing

#### Scenario: Import with Merge
- **WHEN** a user imports with "Merge" option
- **THEN** the system merges imported configuration with current
- **AND** shows conflicts if any exist
- **AND** allows user to resolve conflicts

#### Scenario: Import Validation Errors
- **WHEN** an imported configuration file is invalid
- **THEN** the system displays specific validation errors
- **AND** prevents import until errors are resolved
- **AND** provides suggestions for fixing errors

### Requirement: Live Configuration Updates
The system SHALL support applying configuration changes without restarting the server.

#### Scenario: Apply Configuration Changes
- **WHEN** a user clicks "Apply Changes" after modifying configuration
- **THEN** the system sends the updated configuration to the backend
- **AND** the backend hot-reloads the configuration
- **AND** displays success confirmation or error details

#### Scenario: Unsaved Changes Indicator
- **WHEN** configuration is modified but not applied
- **THEN** the system shows an "Unsaved Changes" indicator
- **AND** prompts for confirmation if user attempts to navigate away

#### Scenario: Apply Failure Rollback
- **WHEN** applying configuration changes fails
- **THEN** the system keeps the previous working configuration active
- **AND** displays error details
- **AND** allows user to fix and retry

### Requirement: Configuration Validation UI
The system SHALL provide real-time validation feedback for configuration changes.

#### Scenario: Real-Time Validation
- **WHEN** a user modifies any configuration field
- **THEN** the system validates the change immediately
- **AND** displays inline error messages if invalid

#### Scenario: Cross-Reference Validation
- **WHEN** a configuration references another entity (e.g., provider, intent)
- **THEN** the system validates the reference exists
- **AND** highlights broken references

#### Scenario: Validation Summary
- **WHEN** viewing the configuration
- **THEN** the system displays a validation summary showing:
  - Number of errors
  - Number of warnings
  - Links to problematic sections

#### Scenario: Fix Suggestions
- **WHEN** a validation error occurs
- **THEN** the system provides actionable suggestions for fixing
- **AND** offers "Quick Fix" buttons where possible

### Requirement: Backward Compatibility
The system SHALL maintain full backward compatibility with existing JSON-based configuration workflows.

#### Scenario: Existing Config File on Startup
- **WHEN** the application starts with an existing config.json file
- **THEN** the system loads the configuration normally
- **AND** makes it available for editing in the UI

#### Scenario: CLI Config Argument
- **WHEN** the application is started with `--config` CLI argument
- **THEN** the system loads the specified configuration
- **AND** respects the CLI argument over UI changes (unless explicitly saved)

#### Scenario: Environment Variable Config
- **WHEN** configuration path is specified via environment variables
- **THEN** the system loads from that path
- **AND** maintains existing precedence rules

#### Scenario: Manual JSON Editing
- **WHEN** a user manually edits config.json while the app is running
- **THEN** the system detects the change
- **AND** prompts to reload or keep current UI state

