## MODIFIED Requirements

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

## ADDED Requirements

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

