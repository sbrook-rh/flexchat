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
- **WHEN** the UI requests available models via `POST /api/connections/providers/:id/models` with connection details
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

### Requirement: Zero-Config Bootstrap Welcome Screen
The system SHALL display a welcome screen when no configuration exists, providing a user-friendly entry point to the configuration builder.

#### Scenario: No Configuration on Startup
- **WHEN** the application starts and no configuration file exists
- **THEN** the server starts successfully with empty configuration `{ llms: {}, rag_services: {}, responses: [] }`
- **AND** the UI displays a welcome screen (gradient background, centered card) explaining that configuration is needed
- **AND** shows "Build Configuration" button as primary action
- **AND** shows "Import Configuration File" button as secondary action
- **AND** displays recommended provider suggestions (Ollama, OpenAI, Gemini) with brief descriptions
- **AND** clicking "Build Configuration" navigates to the configuration builder (Phase 2.2+ Provider List)

Note: The welcome screen is purely a nicer entry point for first-time users. The actual configuration builder UI (Provider List, Connection Wizard, etc.) is the same whether creating a new config or editing an existing one.

#### Scenario: Configuration Exists
- **WHEN** the application starts with an existing configuration file
- **THEN** the `/config` route shows the configuration builder with current providers displayed
- **AND** users can add, edit, or remove providers using the same UI as zero-config mode

#### Scenario: Always-Accessible Configuration Builder
- **WHEN** a user navigates to `/config` manually at any time
- **THEN** the configuration builder is accessible regardless of configuration state
- **AND** shows welcome screen if `hasConfig: false`
- **AND** shows provider list/editor if `hasConfig: true`

#### Scenario: Home Page Configuration Link
- **WHEN** viewing the home page
- **THEN** a "Configuration" button is visible in the top-right corner
- **AND** clicking it navigates to `/config` for viewing or editing configuration
- **AND** when `!chatReady`, home page also shows a warning banner with a link to configure providers

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
 - **AND** the UI refreshes `/api/ui-config` and navigates to Home on success

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

### Requirement: Validation Workflow Gating
The system SHALL require explicit validation of the working configuration before enabling Apply or Export actions in the builder.

#### Scenario: Require Validate Before Apply/Export
- **WHEN** the user edits the working configuration
- **THEN** the builder sets validation status to `dirty` (not validated)
- **AND** the "Apply" and "Export" buttons are disabled
- **AND** the user can click "Validate" to send the working configuration to `POST /api/config/validate`
- **AND** if validation passes, buttons become enabled; if it fails, errors are displayed and buttons remain disabled

### Requirement: Secret Handling Policy
The system SHALL enforce that secret values are provided via environment variables in the UI and never entered or displayed as plaintext.

#### Scenario: Secrets via Environment Variables Only
- **WHEN** configuring a provider field that is marked as secret (e.g., API key)
- **THEN** the UI requires selecting an environment variable reference (e.g., `OPENAI_API_KEY`)
- **AND** plaintext entry is disallowed in the UI
- **AND** secret values are never exposed to the browser; only variable names are shown

### Requirement: Reusable Connection Payload (DRY)
The system SHALL use a shared connection payload structure and validation for both connection testing and model discovery.

#### Scenario: Shared Connection Payload
- **WHEN** calling either `POST /api/connections/test` or `POST /api/connections/providers/:id/models`
- **THEN** the request includes a `connection` object with `{ provider_id, type, fields }`
- **AND** the backend applies the same validation and normalization pipeline to this payload
- **AND** environment variable placeholders are resolved on-demand (without mutating stored configuration)

### Requirement: Builder Mode Navigation Guard
The system SHALL prevent accidental navigation away from the live configuration builder while there are unapplied changes, except for explicit export or cancel actions.

#### Scenario: Block Navigation Until Apply or Cancel
- **WHEN** the user is in the configuration builder with unapplied changes
- **THEN** route transitions are blocked with a guard
- **AND** the user can either Apply Changes (hot-reload) or Cancel (discard working changes and return to home)
- **AND** Export remains allowed and does not apply changes

### Requirement: Builder Initialization
The system SHALL initialize the configuration builder with the current applied configuration snapshot.

#### Scenario: Load Current Configuration for Editing
- **WHEN** the user opens the configuration builder
- **THEN** the UI loads the full raw configuration via `GET /api/config/export`
- **AND** initializes `workingConfig` from this snapshot (equal to applied configuration at entry)
- **AND** subsequent edits are kept in `workingConfig` until applied or cancelled

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

