# Config Loader Specification

## Purpose
The config loader is responsible for loading and validating configuration files for the Flex Chat system. It handles path resolution, environment variable substitution, and configuration validation.
## Requirements
### Requirement: Config Path Resolution
The system SHALL resolve configuration file paths correctly regardless of the current working directory, respecting the `FLEX_CHAT_CONFIG_DIR` environment variable and providing proper fallback behavior.

#### Scenario: Relative Path from Project Root
- **WHEN** the server is started from the project root with `--config config/examples/05-gemini-multi-llm.json`
- **THEN** the system resolves the path to `{PROJECT_ROOT}/config/examples/05-gemini-multi-llm.json`
- **AND** the configuration loads successfully

#### Scenario: Relative Path from Backend Directory
- **WHEN** the server is started from `backend/chat` directory with `--config config/examples/05-gemini-multi-llm.json`
- **THEN** the system resolves the path to `{PROJECT_ROOT}/config/examples/05-gemini-multi-llm.json` (not relative to backend/chat)
- **AND** the configuration loads successfully

#### Scenario: FLEX_CHAT_CONFIG_DIR Environment Variable
- **WHEN** `FLEX_CHAT_CONFIG_DIR` is set to `{PROJECT_ROOT}/config`
- **AND** a relative path `examples/05-gemini-multi-llm.json` is provided
- **THEN** the system resolves the path to `{PROJECT_ROOT}/config/examples/05-gemini-multi-llm.json`
- **AND** the configuration loads successfully

#### Scenario: Flexible Config Filename
- **WHEN** `FLEX_CHAT_CONFIG_FILE` is set to a custom filename like `my-config.json`
- **AND** a directory path is provided via CLI or `FLEX_CHAT_CONFIG_DIR`
- **THEN** the system uses the custom filename instead of defaulting to `config.json`
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

