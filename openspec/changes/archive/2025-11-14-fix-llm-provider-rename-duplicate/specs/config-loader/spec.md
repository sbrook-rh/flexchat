## ADDED Requirements

### Requirement: Duplicate LLM Provider ID Validation
The system SHALL validate that no duplicate LLM provider IDs exist in the configuration, providing helpful error messages for manual configuration errors.

#### Scenario: Detect Duplicate LLM Provider IDs
- **WHEN** a configuration is loaded or validated
- **THEN** the system checks for duplicate keys in the `llms` object
- **AND** if duplicates are found, adds validation error: `Duplicate LLM provider IDs: {comma-separated list}`
- **AND** prevents configuration from being applied

#### Scenario: Allow Unique Provider IDs
- **WHEN** all LLM provider IDs are unique
- **THEN** the system passes validation without errors
- **AND** allows the configuration to be applied

#### Scenario: Helpful Error Context
- **WHEN** duplicate provider IDs are detected
- **THEN** the error message lists all duplicate IDs
- **AND** provides actionable guidance for resolution
- **AND** prevents server startup or configuration hot-reload until fixed

