# config-builder Specification

## Purpose
TBD - created by archiving change config-builder-system. Update Purpose after archive.
## Requirements
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
The system SHALL provide a complete UI for adding, editing, and removing AI and RAG providers with separate workflows for LLM and RAG providers, using stable IDs separate from display names for both LLM providers and RAG services.

#### Scenario: Sectioned Provider Lists
- **WHEN** viewing the configuration builder
- **THEN** the system displays separate sections for "LLM Providers" and "RAG Services"
- **AND** each section has its own "Add" button ("Add LLM Provider", "Add RAG Service")
- **AND** each section shows only relevant provider cards
- **AND** LLM providers display their description as primary label with ID as secondary gray text
- **AND** RAG services display their description as primary label with ID as secondary gray text

#### Scenario: Add New LLM Provider
- **WHEN** a user clicks "Add LLM Provider"
- **THEN** the system opens a wizard without provider type selection (LLM is implicit)
- **AND** proceeds through: Select Provider → Configure → Test & Discover Models → Select Default Model → Name & Save
- **AND** generates a stable kebab-case ID from the entered description
- **AND** stores both ID (as config key) and description (as display name)
- **AND** if this is the first LLM, creates a default response handler using the selected model

#### Scenario: Edit LLM Provider Name Without Duplication
- **WHEN** a user edits an LLM provider's display name
- **THEN** the system updates only the `description` field in the provider config
- **AND** keeps the provider ID unchanged (used as the configuration key)
- **AND** does NOT create a duplicate entry
- **AND** shows the ID as read-only/locked with explanation tooltip
- **AND** all response handler, embedding, intent, and topic references remain valid

#### Scenario: Add New RAG Service
- **WHEN** a user clicks "Add RAG Service"
- **THEN** the system opens a wizard without provider type selection (RAG is implicit)
- **AND** proceeds through: Select Provider → Configure → Test → Name & Save
- **AND** generates a stable kebab-case ID from the entered description
- **AND** stores both ID (as config key) and description (as display name)

#### Scenario: Edit RAG Service Name Without Duplication
- **WHEN** a user edits a RAG service's display name
- **THEN** the system updates only the `description` field in the service config
- **AND** keeps the service ID unchanged (used as the configuration key)
- **AND** does NOT create a duplicate entry
- **AND** shows the ID as read-only/locked with explanation tooltip
- **AND** all response handler references remain valid

#### Scenario: First LLM Creates Default Response Handler
- **WHEN** a user adds their first LLM provider and selects a default model
- **THEN** the system automatically creates a response handler with:
  - LLM reference set to the new provider ID
  - Model set to the user's selected model
  - A default prompt template suitable for general chat
- **AND** subsequent LLM additions do not auto-create handlers

#### Scenario: Edit Existing Provider
- **WHEN** a user edits a provider's configuration
- **THEN** the system updates the configuration
- **AND** re-validates dependent configurations (response handlers using this provider)

#### Scenario: Remove Provider
- **WHEN** a user removes a provider
- **THEN** the system checks for dependencies (response handlers, embeddings, intent detection)
- **AND** warns if removal would break configuration
- **AND** requires confirmation before removal
- **AND** uses the provider's description (not ID) in confirmation message

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
  - Variable insertion buttons ({{rag_context}}, {{reasoning}}, {{topic}}, {{intent}})
  - Available variables reference
  - Multiline text input

#### Scenario: Handler Ordering
- **WHEN** a user reorders response handlers using up/down arrow buttons
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

### Requirement: Configuration Export with Clipboard Support
The system SHALL provide export functionality to generate JSON configuration files and copy to clipboard.

#### Scenario: Export as File
- **WHEN** a user clicks "Export" button (requires validated config)
- **THEN** the system prompts for a filename with timestamped default (e.g., `flex-chat-config-2025-11-08T14-30-00.json`)
- **AND** triggers browser download of the JSON file
- **AND** automatically appends `.json` extension if not provided

#### Scenario: Copy to Clipboard
- **WHEN** a user clicks "Copy" button (requires validated config)
- **THEN** the system copies the JSON configuration to clipboard using `navigator.clipboard.writeText()`
- **AND** shows success alert "Configuration copied to clipboard!"
- **AND** falls back to `document.execCommand('copy')` for older browsers

#### Scenario: Export Validation Gating
- **WHEN** attempting to export or copy configuration
- **THEN** the system checks if `validationState === 'valid'`
- **AND** if not valid, displays alert "Please validate your configuration before exporting"
- **AND** keeps Export/Copy buttons disabled until validation passes

### Requirement: Configuration Import from File
The system SHALL provide import functionality to load JSON configuration files into the UI via file upload.

#### Scenario: Import from File (Replace Mode)
- **WHEN** a user clicks "Import" button in header and selects a `.json` file
- **THEN** the system reads the file using `FileReader`
- **AND** parses the JSON content
- **AND** validates that it's a valid configuration object
- **AND** shows confirmation dialog: "This will replace your current configuration. Continue?"
- **AND** if user confirms, loads the config into `workingConfig` and sets `validationState` to 'dirty'
- **AND** displays alert "Configuration imported successfully! Please validate before applying."

#### Scenario: Import with Unsaved Changes Warning
- **WHEN** importing a file while `hasUnsavedChanges` is true
- **THEN** the system shows warning dialog: "You have unsaved changes. Importing will replace your current configuration. Continue?"
- **AND** only proceeds if user confirms

#### Scenario: Import JSON Parsing Errors
- **WHEN** an uploaded file contains invalid JSON
- **THEN** the system catches the parse error
- **AND** displays alert with error message: "Failed to import configuration: [error]. Please ensure the file is valid JSON."
- **AND** does not modify the current `workingConfig`

#### Scenario: Import File Read Errors
- **WHEN** the file cannot be read (permissions, corruption, etc.)
- **THEN** the system displays alert "Failed to read file. Please try again."
- **AND** does not modify the current `workingConfig`

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

#### Scenario: Auto-Wrap User Input with ${} Syntax
- **WHEN** a user types an environment variable name without `${}` syntax (e.g., types "OPENAI_API_KEY")
- **AND** the user tabs away or clicks out of the field
- **THEN** the system automatically wraps the input with `${}` syntax (becomes `${OPENAI_API_KEY}`)
- **AND** displays a tooltip explaining the auto-wrap behavior

#### Scenario: Dynamic Environment Variable Suggestions
- **WHEN** a secret field is displayed in the connection wizard
- **THEN** the system fetches available environment variables from `GET /api/connections/env-vars`
- **AND** displays quick-fill buttons for relevant env vars (matching field name or provider name)
- **AND** shows both static schema suggestions (blue) and dynamic available vars (green with checkmark)
- **AND** limits display to top 3 most relevant suggestions to avoid UI clutter

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

### Requirement: Configuration Builder UI Layout
The Configuration Builder UI SHALL provide structured navigation for multiple configuration sections, allowing users to focus on one aspect of configuration at a time while maintaining awareness of overall system state.

#### Scenario: Vertical Tab Navigation
- **WHEN** the Configuration Builder is displayed
- **THEN** a vertical tab sidebar is rendered on the left side
- **AND** the sidebar contains tabs for: Providers, Embeddings, Intent, Handlers, Reasoning
- **AND** each tab displays an icon, label, and optional badge count
- **AND** clicking a tab switches the content area to that section
- **AND** the active tab is visually highlighted

#### Scenario: Tab Badge Indicators
- **WHEN** configuration items are added or removed
- **THEN** tab badges update to reflect current counts
- **AND** the Providers tab shows combined LLM + RAG count
- **AND** the Handlers tab shows response handler count
- **AND** empty sections show no badge

#### Scenario: Content Area Rendering
- **WHEN** a tab is active
- **THEN** the corresponding section component is rendered in the content area
- **AND** the section displays its title and description
- **AND** the section provides relevant configuration controls
- **AND** other tabs' content is unmounted (not just hidden)

#### Scenario: Action Bar Placement
- **WHEN** any tab is active
- **THEN** the action bar (Validate, Apply, Export, Cancel) remains visible at the bottom
- **AND** actions apply to the entire configuration, not individual sections
- **AND** validation status is displayed above the action bar

### Requirement: Conditional Tab Enabling
Configuration sections with dependencies SHALL be conditionally enabled based on prerequisite configuration, preventing user confusion and invalid configurations.

#### Scenario: Embeddings Tab Enabling
- **WHEN** no RAG services are configured
- **THEN** the Embeddings tab is disabled
- **AND** hovering over the disabled tab shows a tooltip: "Configure RAG Services first"
- **AND** clicking the disabled tab has no effect
- **WHEN** at least one RAG service is configured
- **THEN** the Embeddings tab becomes enabled
- **AND** clicking the tab switches to the Embeddings section

#### Scenario: Intent Tab Enabling
- **WHEN** no LLM providers are configured
- **THEN** the Intent tab is disabled
- **AND** hovering over the disabled tab shows a tooltip: "Configure at least one LLM Provider first"
- **WHEN** at least one LLM provider is configured
- **THEN** the Intent tab becomes enabled

#### Scenario: Handlers Tab Always Enabled
- **WHEN** the Configuration Builder is displayed
- **THEN** the Handlers tab is always enabled
- **AND** the Handlers section allows defining response handlers even if no LLMs exist yet
- **AND** validation will fail if handlers reference non-existent LLMs

#### Scenario: Reasoning Tab Enabling
- **WHEN** no response handlers are configured
- **THEN** the Reasoning tab is disabled
- **AND** hovering over the disabled tab shows a tooltip: "Configure at least one Response Handler first"
- **WHEN** at least one response handler is configured
- **THEN** the Reasoning tab becomes enabled

---

### Requirement: Tab State Management
The Configuration Builder SHALL maintain tab state within the component, preserving user context and unsaved changes when navigating between sections.

#### Scenario: Tab Switching Preserves State
- **GIVEN** user has made changes in the Providers section (unsaved)
- **WHEN** user switches to the Handlers tab
- **THEN** the Providers section unmounts
- **AND** the `workingConfig` state preserves unsaved provider changes
- **WHEN** user switches back to the Providers tab
- **THEN** the unsaved changes are still present
- **AND** the user can continue editing

#### Scenario: Tab State Does Not Persist Across Sessions
- **GIVEN** user is viewing the Intent tab
- **WHEN** user closes and reopens the Configuration Builder
- **THEN** the default tab (Providers) is active
- **AND** no tab state is restored from previous session

**Note:** Future enhancement (Phase 5) may add localStorage persistence.

---

### Requirement: Placeholder Sections for Future Phases
Tabs for unimplemented configuration sections SHALL be present but display placeholder content, providing visibility into planned features.

#### Scenario: Placeholder Section Display
- **WHEN** a placeholder tab (Intent, Embeddings, or Reasoning) is clicked
- **THEN** the content area displays the section title
- **AND** shows a message: "Coming in Phase X"
- **AND** optionally shows a mockup or description of planned functionality
- **AND** the section does not allow configuration yet

#### Scenario: Providers Section Fully Functional
- **WHEN** the Providers tab is active
- **THEN** the existing ProviderList component is rendered
- **AND** all Phase 2 functionality (add/edit/delete LLM and RAG) works unchanged
- **AND** the LLMWizard and RAGWizard continue to function as before

---

### Requirement: Visual Hierarchy and Affordances
The Configuration Builder navigation SHALL provide clear visual cues for tab state, section focus, and user actions.

#### Scenario: Active Tab Styling
- **WHEN** a tab is active
- **THEN** it has a distinct background color
- **AND** the tab label is bold or highlighted
- **AND** a visual indicator (border, accent) clearly marks the active tab
- **AND** inactive tabs have normal weight text and muted colors

#### Scenario: Disabled Tab Styling
- **WHEN** a tab is disabled
- **THEN** it has reduced opacity (50-60%)
- **AND** the cursor changes to "not-allowed" on hover
- **AND** the tab label is gray
- **AND** the badge (if present) is also muted

#### Scenario: Tab Hover States
- **WHEN** user hovers over an enabled, inactive tab
- **THEN** the tab background lightens or highlights
- **AND** the cursor changes to "pointer"
- **WHEN** user hovers over a disabled tab
- **THEN** a tooltip appears explaining the prerequisite
- **AND** the cursor changes to "not-allowed"

#### Scenario: Badge Visual Treatment
- **WHEN** a tab has a count badge
- **THEN** the badge is a small circle or rounded rectangle
- **AND** the badge displays the count as white text on a gray background
- **AND** the badge is positioned to the right of the tab label
- **AND** empty sections (count = 0) show no badge

---

### Requirement: RAG Service ID Generation
The system SHALL generate stable, URL-safe identifiers from user-provided display names for RAG services.

#### Scenario: Generate ID from Description
- **WHEN** a user creates a new RAG service with description "Red Hat Products"
- **THEN** the system generates service ID `red-hat-products`
- **AND** stores ID as configuration key in `rag_services` object
- **AND** stores description in `rag_services[id].description` field

#### Scenario: ID Generation Rules
- **WHEN** generating a service ID from a description
- **THEN** the system applies the following transformations:
  - Convert to lowercase
  - Replace non-alphanumeric characters with hyphens
  - Remove leading and trailing hyphens
  - Collapse multiple consecutive hyphens into one
- **AND** produces valid kebab-case identifiers

#### Scenario: Prevent Duplicate IDs
- **WHEN** a user creates a RAG service with a description that would generate an existing ID
- **THEN** the system displays error: "A service with ID '{id}' already exists. Please choose a different name."
- **AND** prevents saving until the user provides a unique description
- **AND** wizard remains open for correction

#### Scenario: Edit Mode Shows Locked ID
- **WHEN** editing an existing RAG service
- **THEN** the wizard displays service ID in a read-only/disabled input field
- **AND** shows lock icon or "cannot be changed" indicator
- **AND** displays tooltip: "This ID is used by response handlers and cannot be changed after creation."
- **AND** allows editing the description field freely

### Requirement: RAG Service Display Names
The system SHALL use descriptive display names throughout the UI while maintaining stable ID references in configuration.

#### Scenario: Display Service Description in Lists
- **WHEN** viewing the RAG services list in configuration builder
- **THEN** the system displays each service's description as the primary label
- **AND** shows the service ID below in smaller gray text
- **AND** format: "Description" on first line, "ID: service-id" on second line

#### Scenario: Display Service Description in Handler Criteria
- **WHEN** configuring a response handler's match criteria
- **THEN** the service dropdown shows service descriptions (not IDs)
- **AND** stores the service ID in `match.service` field
- **AND** displays the description when viewing existing handler criteria

#### Scenario: Backward Compatibility Fallback
- **WHEN** loading a RAG service configuration without a `description` field
- **THEN** the system uses the service ID as the display name
- **AND** on first edit, pre-fills the description field with the service ID
- **AND** allows user to update to a friendly description

#### Scenario: Empty Description Validation
- **WHEN** a user attempts to save a RAG service with empty description
- **THEN** the system prevents save
- **AND** displays inline validation error: "Description is required"
- **AND** keeps the wizard open for correction

### Requirement: LLM Provider ID Generation
The system SHALL generate stable, URL-safe identifiers from user-provided display names for LLM providers.

#### Scenario: Generate ID from Description
- **WHEN** a user creates a new LLM provider with description "My Local Ollama"
- **THEN** the system generates provider ID `my-local-ollama`
- **AND** stores ID as configuration key in `llms` object
- **AND** stores description in `llms[id].description` field

#### Scenario: ID Generation Rules
- **WHEN** generating a provider ID from a description
- **THEN** the system applies the following transformations:
  - Convert to lowercase
  - Replace non-alphanumeric characters with hyphens
  - Remove leading and trailing hyphens
  - Collapse multiple consecutive hyphens into one
- **AND** produces valid kebab-case identifiers

#### Scenario: Prevent Duplicate IDs
- **WHEN** a user creates an LLM provider with a description that would generate an existing ID
- **THEN** the system displays error: "A provider with ID '{id}' already exists. Please choose a different name."
- **AND** prevents saving until the user provides a unique description
- **AND** wizard remains open for correction

#### Scenario: Edit Mode Shows Locked ID
- **WHEN** editing an existing LLM provider
- **THEN** the wizard displays provider ID in a read-only/disabled input field
- **AND** shows lock icon or "cannot be changed" indicator
- **AND** displays tooltip: "This ID is used by response handlers and configuration references and cannot be changed after creation."
- **AND** allows editing the description field freely

### Requirement: LLM Provider Display Names
The system SHALL use descriptive display names throughout the UI while maintaining stable ID references in configuration.

#### Scenario: Display Provider Description in Lists
- **WHEN** viewing the LLM providers list in configuration builder
- **THEN** the system displays each provider's description as the primary label
- **AND** shows the provider ID below in smaller gray text
- **AND** format: "Description" on first line, "ID: provider-id" on second line

#### Scenario: Display Provider Description in References
- **WHEN** configuring response handlers, embeddings, intent detection, or topic detection
- **THEN** dropdowns show provider descriptions (not IDs)
- **AND** stores the provider ID in the configuration field
- **AND** displays the description when viewing existing configurations

#### Scenario: Backward Compatibility Fallback
- **WHEN** loading an LLM provider configuration without a `description` field
- **THEN** the system uses the provider ID as the display name
- **AND** on first edit, pre-fills the description field with the provider ID
- **AND** allows user to update to a friendly description

#### Scenario: Empty Description Validation
- **WHEN** a user attempts to save an LLM provider with empty description
- **THEN** the system prevents save
- **AND** displays inline validation error: "Description is required"
- **AND** keeps the wizard open for correction

### Requirement: Smart Port Defaults for RAG Services
The RAG wizard SHALL suggest the next available sequential port when configuring ChromaDB Wrapper services to avoid port conflicts in multi-service setups.

#### Scenario: First ChromaDB Wrapper service
- **WHEN** user selects "ChromaDB Wrapper" provider in RAG wizard
- **AND** no existing RAG services are configured with localhost URLs
- **THEN** the URL field defaults to `http://localhost:5006`

#### Scenario: Port already in use
- **WHEN** user selects "ChromaDB Wrapper" provider
- **AND** an existing RAG service is configured with `http://localhost:5006`
- **THEN** the URL field defaults to `http://localhost:5007`

#### Scenario: Multiple ports in use (sequential)
- **WHEN** user selects "ChromaDB Wrapper" provider
- **AND** existing services use ports 5006 and 5007
- **THEN** the URL field defaults to `http://localhost:5008`

#### Scenario: Multiple ports with gap
- **WHEN** user selects "ChromaDB Wrapper" provider
- **AND** existing services use ports 5006 and 5008 (gap at 5007)
- **THEN** the URL field defaults to `http://localhost:5007` (fills the gap)

#### Scenario: Edit mode preserves original URL
- **WHEN** user opens RAG wizard in edit mode for an existing service
- **THEN** the URL field shows the existing service's URL
- **AND** smart port defaulting does NOT override the existing value

#### Scenario: Only applies to ChromaDB Wrapper
- **WHEN** user selects a different provider (e.g., "ChromaDB" direct)
- **THEN** smart port detection does not apply
- **AND** the provider's original default from `getConnectionSchema()` is used

#### Scenario: Non-localhost URLs ignored
- **WHEN** existing RAG services use non-localhost URLs (e.g., `https://remote-server.com`)
- **THEN** those URLs are excluded from port detection
- **AND** only localhost URLs contribute to the smart default calculation

