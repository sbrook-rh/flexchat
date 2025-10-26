# ai-providers Specification Deltas

## ADDED Requirements

### Requirement: Provider Configuration Schema Interface
All AI providers SHALL expose their configuration requirements through a standardized schema interface for UI-driven configuration.

#### Scenario: Get Provider Configuration Schema
- **WHEN** `getConnectionSchema()` is called on any provider class
- **THEN** it returns a schema object describing required and optional configuration fields
- **AND** includes field types, descriptions, validation rules, and default values

#### Scenario: Schema Field Types
- **WHEN** a provider schema is returned
- **THEN** each field specifies its type: `string`, `number`, `boolean`, `enum`, `url`, `api_key`
- **AND** includes appropriate validation constraints (min/max, pattern, enum values)

#### Scenario: Schema Required vs Optional Fields
- **WHEN** a provider schema is returned
- **THEN** it clearly distinguishes required fields from optional fields
- **AND** specifies which fields have default values

#### Scenario: Schema Environment Variable Support
- **WHEN** a schema field supports environment variables
- **THEN** it indicates this with `supports_env_var: true`
- **AND** suggests common environment variable names (e.g., `OPENAI_API_KEY`)

#### Scenario: Schema Validation Rules
- **WHEN** a schema field has validation rules
- **THEN** it includes validation patterns, min/max values, or allowed enum values
- **AND** provides user-friendly error messages for validation failures

## ADDED Requirements

### Requirement: Provider Model Discovery
All AI providers SHALL support dynamic model discovery for UI-driven model selection.

#### Scenario: List Available Models
- **WHEN** `listModels()` is called on a configured provider instance
- **THEN** it returns a list of available models from the provider
- **AND** includes model metadata (name, type, capabilities, context length)

#### Scenario: Model Capability Detection
- **WHEN** listing models
- **THEN** each model indicates its capabilities: `chat`, `embeddings`, `reasoning`, `vision`, `function_calling`
- **AND** allows UI to filter models by capability

#### Scenario: Model Discovery Caching
- **WHEN** models are discovered from a provider
- **THEN** the system caches the results for a reasonable duration (e.g., 5 minutes)
- **AND** provides a way to force refresh

#### Scenario: Model Discovery Failure
- **WHEN** model discovery fails (network error, auth error, etc.)
- **THEN** the provider returns a specific error with troubleshooting guidance
- **AND** falls back to a known model list if available

## ADDED Requirements

### Requirement: Connection Testing Interface
All AI providers SHALL support connection testing for validation before saving configuration.

#### Scenario: Test Provider Connection
- **WHEN** `testConnection()` is called with provider configuration
- **THEN** the provider attempts to connect and perform a simple operation
- **AND** returns success status with latency information

#### Scenario: Test Connection Failure
- **WHEN** connection testing fails
- **THEN** the provider returns specific error details (auth failure, network timeout, invalid URL, etc.)
- **AND** provides actionable suggestions for fixing the issue

#### Scenario: Test Connection Timeout
- **WHEN** a connection test takes longer than the specified timeout (default 10s)
- **THEN** the provider cancels the operation
- **AND** returns a timeout error with suggestion to check network/firewall

#### Scenario: Test Connection with Partial Config
- **WHEN** testing a connection with incomplete configuration
- **THEN** the provider validates required fields first
- **AND** returns validation errors before attempting connection

## MODIFIED Requirements

### Requirement: Base AI Provider Interface
All AI providers SHALL implement a standardized interface that ensures consistent behavior across different AI services, including configuration schema and testing capabilities.

#### Scenario: Provider Initialization with Schema
- **WHEN** a provider is instantiated
- **THEN** it exposes its configuration schema via `getConnectionSchema()`
- **AND** validates provided configuration against the schema
- **AND** initializes successfully if configuration is valid

#### Scenario: Provider Capabilities Declaration
- **WHEN** querying a provider's capabilities
- **THEN** it returns supported operations: `chat`, `embeddings`, `reasoning`, `streaming`, `function_calling`
- **AND** allows UI to show/hide features based on capabilities

