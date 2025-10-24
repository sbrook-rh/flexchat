# Config Loader Specification

## MODIFIED Requirements

### Requirement: Config Path Resolution
The system SHALL resolve configuration file paths correctly regardless of the current working directory, respecting the `FLEX_CHAT_CONFIG_DIR` environment variable and providing proper fallback behavior.

#### Scenario: Relative Path from Project Root
- **WHEN** the server is started from the project root with `--config config/examples/05-gemini-multi-llm.json`
- **THEN** the system resolves the path to `/Users/sbrook/Projects/flex-chat/config/examples/05-gemini-multi-llm.json`
- **AND** the configuration loads successfully

#### Scenario: Relative Path from Backend Directory
- **WHEN** the server is started from `backend/chat` directory with `--config config/examples/05-gemini-multi-llm.json`
- **THEN** the system resolves the path to `/Users/sbrook/Projects/flex-chat/config/examples/05-gemini-multi-llm.json` (not relative to backend/chat)
- **AND** the configuration loads successfully

#### Scenario: FLEX_CHAT_CONFIG_DIR Environment Variable
- **WHEN** `FLEX_CHAT_CONFIG_DIR` is set to `/Users/sbrook/Projects/flex-chat/config`
- **AND** a relative path `examples/05-gemini-multi-llm.json` is provided
- **THEN** the system resolves the path to `/Users/sbrook/Projects/flex-chat/config/examples/05-gemini-multi-llm.json`
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
