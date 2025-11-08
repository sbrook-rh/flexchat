# Config Loader Specification

## Purpose
The config loader is responsible for loading and validating configuration files for the Flex Chat system. It handles path resolution, environment variable substitution, and configuration validation.
## Requirements
### Requirement: Config Path Resolution
The system SHALL resolve configuration file paths correctly regardless of the current working directory, respecting environment variables and providing proper fallback behavior.

**Environment Variables:**
- `FLEX_CHAT_CONFIG_FILE` - Custom filename (defaults to 'config.json')
- `FLEX_CHAT_CONFIG_FILE_PATH` - Full file path to config file
- `FLEX_CHAT_CONFIG_DIR` - Directory containing config file

**Precedence Order:**
1. CLI argument (--config)
2. FLEX_CHAT_CONFIG_FILE_PATH (full file path)
3. FLEX_CHAT_CONFIG_DIR + FLEX_CHAT_CONFIG_FILE (directory + filename)
4. Default: ./config/config.json from current working directory

#### Scenario: Relative Path from Project Root
- **WHEN** the server is started from the project root with `--config config/examples/05-gemini-multi-llm.json`
- **THEN** the system resolves the path to `{PROJECT_ROOT}/config/examples/05-gemini-multi-llm.json`
- **AND** the configuration loads successfully

#### Scenario: Relative Path from Backend Directory
- **WHEN** the server is started from `backend/chat` directory with `--config config/examples/05-gemini-multi-llm.json`
- **THEN** the system resolves the path to `{PROJECT_ROOT}/backend/chat/config/examples/05-gemini-multi-llm.json` (relative to current working directory)
- **AND** the configuration loads successfully

#### Scenario: FLEX_CHAT_CONFIG_DIR Environment Variable
- **WHEN** `FLEX_CHAT_CONFIG_DIR` is set to `{PROJECT_ROOT}/config`
- **AND** a relative path `examples/05-gemini-multi-llm.json` is provided
- **THEN** the system resolves the path to `{PROJECT_ROOT}/config/examples/05-gemini-multi-llm.json`
- **AND** the configuration loads successfully

#### Scenario: Custom Config Filename
- **WHEN** `FLEX_CHAT_CONFIG_FILE` is set to a custom filename like `my-config.json`
- **AND** `FLEX_CHAT_CONFIG_DIR` is set to `{PROJECT_ROOT}/config`
- **AND** no CLI argument is provided
- **THEN** the system resolves the path to `{PROJECT_ROOT}/config/my-config.json`
- **AND** the configuration loads successfully

#### Scenario: Custom Filename with CLI Directory
- **WHEN** `FLEX_CHAT_CONFIG_FILE` is set to `production.json`
- **AND** a directory path is provided via CLI argument
- **THEN** the system looks for `production.json` inside that directory
- **AND** the configuration loads successfully

#### Scenario: Absolute Path Handling
- **WHEN** an absolute path is provided via CLI argument
- **THEN** the system uses the absolute path directly without modification
- **AND** existing behavior is preserved

#### Scenario: Directory Argument Handling
- **WHEN** a directory path is provided via CLI argument
- **THEN** the system looks for `config.json` inside that directory
- **AND** the directory path is resolved relative to `FLEX_CHAT_CONFIG_DIR` if set

#### Scenario: Environment Variable Precedence
- **WHEN** both CLI argument and environment variables are provided
- **THEN** the CLI argument takes precedence
- **AND** the environment variables are used as fallback when no CLI argument is provided

#### Scenario: FLEX_CHAT_CONFIG_FILE_PATH Environment Variable
- **WHEN** `FLEX_CHAT_CONFIG_FILE_PATH` is set to a full file path
- **AND** no CLI argument is provided
- **THEN** the system uses the full file path directly
- **AND** the configuration loads successfully

#### Scenario: Fallback Behavior
- **WHEN** no `FLEX_CHAT_CONFIG_DIR` is set and a relative path is provided
- **THEN** the system determines the project root and resolves the path relative to it
- **AND** the configuration loads successfully

### Requirement: Backward Compatibility
The system SHALL maintain backward compatibility with existing usage patterns and not break existing deployments.

#### Scenario: Existing Absolute Path Usage
- **WHEN** existing code uses absolute paths for configuration
- **THEN** the behavior remains unchanged
- **AND** no regression occurs

#### Scenario: Existing Environment Variable Usage
- **WHEN** existing deployments rely on `FLEX_CHAT_CONFIG_FILE` or `FLEX_CHAT_CONFIG_FILE_PATH`
- **THEN** these environment variables continue to work as before
- **AND** the precedence order is preserved

### Requirement: Environment Variable Substitution
The system SHALL substitute environment variables in configuration files using the pattern `${VAR_NAME}` and support default values.

#### Scenario: Basic Environment Variable Substitution
- **WHEN** a config file contains `${API_KEY}` and the environment variable is set
- **THEN** the system replaces `${API_KEY}` with the actual value
- **AND** the configuration loads successfully

#### Scenario: Default Value Substitution
- **WHEN** a config file contains `${BASE_URL:https://api.example.com}` and the variable is not set
- **THEN** the system uses the default value `https://api.example.com`
- **AND** the configuration loads successfully

### Requirement: Configuration Validation
The system SHALL validate loaded configurations and provide clear error messages for invalid configurations.

#### Scenario: Required Sections Validation
- **WHEN** a configuration is missing the `llms` section
- **THEN** the system throws an error with message "Config must define at least one LLM in 'llms' section"
- **AND** the server fails to start

#### Scenario: LLM Reference Validation
- **WHEN** a response rule references a non-existent LLM
- **THEN** the system throws an error with message "Response rule X references undefined LLM: 'nonexistent'"
- **AND** the server fails to start

### Requirement: Error Handling
The system SHALL handle configuration errors gracefully and provide clear error messages.

#### Scenario: File Not Found
- **WHEN** a non-existent config file path is provided
- **THEN** the system throws an error with message "Configuration file not found: [path]"
- **AND** the server fails to start

#### Scenario: Invalid JSON
- **WHEN** a config file contains invalid JSON
- **THEN** the system throws an error with message "Invalid JSON in configuration file: [error]"
- **AND** the server fails to start

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

