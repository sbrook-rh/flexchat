# Config Loader Delta - Configurable Topic Prompt

## ADDED Requirements

### Requirement: Topic Detection Prompt Configuration
The system SHALL support optional custom prompts for topic detection in the configuration file.

#### Scenario: Load Configuration With Custom Topic Prompt
- **WHEN** a configuration file contains `topic.prompt` with a custom prompt string
- **THEN** the system loads and stores the custom prompt in the configuration
- **AND** validation passes without errors

#### Scenario: Load Configuration Without Topic Prompt
- **WHEN** a configuration file does not contain `topic.prompt`
- **THEN** the system loads successfully without the optional field
- **AND** topic detection falls back to the default hard-coded prompt

#### Scenario: Validate Topic Prompt Field Type
- **WHEN** a configuration contains `topic.prompt` with a non-string value
- **THEN** the system rejects the configuration with a validation error
- **AND** provides clear error message about expected string type

#### Scenario: Hot-Reload With Topic Prompt Changes
- **WHEN** configuration is hot-reloaded with a modified `topic.prompt` value
- **THEN** the system applies the new prompt for subsequent topic detection calls
- **AND** does not affect in-flight requests

#### Scenario: Export Configuration With Custom Prompt
- **WHEN** exporting configuration via `/api/config/export`
- **THEN** the system includes the `topic.prompt` field if present
- **AND** preserves the exact prompt text without modification

#### Scenario: UI Config Includes Default Topic Prompt
- **WHEN** requesting UI configuration via `/api/ui-config`
- **THEN** the response includes `defaultTopicPrompt` field with the system default prompt
- **AND** the prompt is available for UI to display/use without additional fetch
- **AND** the prompt updates automatically on server restart or hot-reload

