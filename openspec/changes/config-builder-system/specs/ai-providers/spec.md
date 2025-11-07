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

## ADDED Requirements

### Requirement: Topic Detection with Structured Output
The system SHALL provide topic detection that returns structured results with both topic summary and status, enabling better conversation flow management.

#### Scenario: Topic Detection Returns Structured Result
- **WHEN** `identifyTopic()` is called with user message, conversation history, and current topic
- **THEN** it returns an object with `{ topic: string, status: string }` structure
- **AND** the status indicates `new_topic` or `continuation`

#### Scenario: First Message Always New Topic
- **WHEN** topic detection is called with no current topic (empty string or null)
- **THEN** the status is automatically set to `new_topic` regardless of LLM output
- **AND** ensures consistent behavior for conversation starts

#### Scenario: Improved Topic Prompt for Conciseness
- **WHEN** the topic detection prompt is constructed
- **THEN** it includes explicit examples of good summaries (short noun phrases like "InstructLab model tuning")
- **AND** includes examples of bad summaries to avoid (verbose sentences like "Begin discussion about...")
- **AND** requests JSON-only output with 3-8 word max for topic_summary

#### Scenario: Robust JSON Parsing with Fallbacks
- **WHEN** the LLM returns topic detection results
- **THEN** the system attempts to extract and parse JSON from the response
- **AND** if parsing fails, it falls back to using the raw content as the topic with status "continuation"
- **AND** validates that the topic summary is not generic (not "none", "general", or "conversation")

#### Scenario: Topic Detection Error Handling
- **WHEN** topic detection fails due to provider error
- **THEN** it returns `{ topic: userMessage, status: 'new_topic' }` as a safe fallback
- **AND** logs the error for debugging without disrupting the chat flow

