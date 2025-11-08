# config-loader Specification Deltas

## ADDED Requirements

### Requirement: Raw Configuration Storage
The system SHALL store configuration with environment variable placeholders intact for security and portability.

#### Scenario: Load Configuration Without Substitution
- **WHEN** `loadConfig()` is called with a valid config file path
- **THEN** the system reads the file and returns configuration with `${ENV_VAR}` placeholders intact
- **AND** does not substitute environment variables at load time

#### Scenario: On-Demand Environment Variable Substitution
- **WHEN** `getProcessedConfig()` is called on the raw configuration
- **THEN** the system substitutes all `${ENV_VAR}` placeholders with actual environment variable values
- **AND** returns a processed copy without mutating the raw configuration

#### Scenario: Provider Initialization Uses Processed Config
- **WHEN** initializing providers at startup or reload
- **THEN** the system calls `getProcessedConfig()` to get config with real values
- **AND** initializes providers with the processed configuration

#### Scenario: UI APIs Receive Raw Config
- **WHEN** UI requests current configuration via `/api/config/export`
- **THEN** the system returns the raw configuration with placeholders intact
- **AND** never exposes actual environment variable values to the UI

### Requirement: Zero-Config Mode Support
The system SHALL support starting with no configuration file and initializing with sensible defaults.

#### Scenario: No Config File Present
- **WHEN** the application starts and no configuration file exists at any checked location
- **THEN** the system initializes with an empty configuration structure: `{ "llms": {}, "rag_services": {}, "responses": [] }`
- **AND** logs a message indicating zero-config mode
- **AND** continues startup successfully

#### Scenario: Zero-Config Validation
- **WHEN** running in zero-config mode
- **THEN** the system skips validation that requires providers or responses
- **AND** allows the application to start for configuration building

#### Scenario: Zero-Config to Configured Transition
- **WHEN** a user builds configuration in the UI and applies it
- **THEN** the system transitions from zero-config to configured mode
- **AND** applies normal validation rules

### Requirement: Runtime Configuration Updates
The system SHALL support updating configuration at runtime without requiring a server restart.

#### Scenario: Hot-Reload Configuration
- **WHEN** a new configuration is provided via API endpoint `POST /api/config/reload`
- **THEN** the system validates the new configuration
- **AND** if valid, replaces the current configuration
- **AND** reinitializes affected services (providers, RAG services)
- **AND** returns success confirmation

#### Scenario: Hot-Reload Validation Failure
- **WHEN** a hot-reload is attempted with invalid configuration
- **THEN** the system returns validation errors
- **AND** keeps the current working configuration active
- **AND** does not restart or reinitialize services

#### Scenario: Hot-Reload Partial Failure
- **WHEN** a hot-reload succeeds validation but a provider fails to initialize
- **THEN** the system logs the specific provider error
- **AND** continues with other providers
- **AND** returns partial success status with error details

#### Scenario: Configuration Change Notification
- **WHEN** configuration is hot-reloaded successfully
- **THEN** the system emits a configuration change event
- **AND** dependent services can react to the change
- **AND** logs the configuration update

### Requirement: Configuration Export API
The system SHALL provide APIs for exporting current configuration in various formats.

#### Scenario: Export Current Configuration
- **WHEN** the UI requests current configuration via `GET /api/config/export`
- **THEN** the system returns the complete current configuration as JSON
- **AND** includes all sections (llms, rag_services, embedding, intent, responses)

#### Scenario: Export with Environment Variable Expansion
- **WHEN** exporting with `?expand_env=true` query parameter
- **THEN** the system returns configuration with environment variables expanded to their values
- **AND** masks sensitive values (shows `***` for API keys)

#### Scenario: Export Minimal Configuration
- **WHEN** exporting with `?minimal=true` query parameter
- **THEN** the system returns configuration with default values omitted
- **AND** includes only explicitly configured values

