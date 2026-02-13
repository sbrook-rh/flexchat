# tool-registry Specification

## Purpose
TBD - created by archiving change add-tool-calling. Update Purpose after archive.
## Requirements
### Requirement: Tool Registration
The system SHALL maintain a central registry of tool definitions loaded from configuration at startup.

#### Scenario: Register tool from configuration
- **WHEN** the system starts with tools defined in config
- **THEN** each tool definition is validated and registered in the registry
- **AND** invalid tools are logged as errors but do not prevent startup

#### Scenario: Reject duplicate tool names
- **WHEN** two tools are defined with the same name
- **THEN** the second registration fails with an error
- **AND** the first tool remains registered

#### Scenario: Validate tool definition
- **WHEN** a tool is registered
- **THEN** the system validates that name and description are present
- **AND** the system validates that parameters follow JSON Schema format
- **AND** the system validates that parameters.type is "object"

### Requirement: Tool Lookup
The system SHALL provide fast lookup of tool definitions by name.

#### Scenario: Get tool by name
- **WHEN** a tool call requests a registered tool
- **THEN** the registry returns the tool definition
- **AND** the lookup completes in O(1) time

#### Scenario: Tool not found
- **WHEN** a tool call requests an unregistered tool
- **THEN** the registry returns undefined
- **AND** no error is thrown (caller handles missing tools)

#### Scenario: List all tools
- **WHEN** the system needs to enumerate available tools
- **THEN** the registry returns an array of all registered tool definitions

### Requirement: Provider Format Conversion
The system SHALL convert tool definitions to provider-specific formats for OpenAI, Ollama, and Gemini.

#### Scenario: Convert to OpenAI format
- **WHEN** tools are requested for OpenAI provider
- **THEN** each tool is formatted as `{type: "function", function: {name, description, parameters}}`
- **AND** the format conforms to OpenAI Chat Completions API

#### Scenario: Convert to Ollama format
- **WHEN** tools are requested for Ollama provider
- **THEN** tools use OpenAI-compatible format
- **AND** the format conforms to Ollama tool calling API (0.1.26+)

#### Scenario: Convert to Gemini format
- **WHEN** tools are requested for Gemini provider
- **THEN** each tool is formatted as `{functionDeclarations: [{name, description, parameters}]}`
- **AND** the format conforms to Google Generative AI function calling

#### Scenario: Filter by allowed tools
- **WHEN** tools are requested with an allowedTools filter
- **THEN** only tools whose names are in the allowed list are returned
- **AND** tools maintain their original order

#### Scenario: Unknown provider format
- **WHEN** tools are requested for an unknown provider
- **THEN** the system throws an error indicating the provider is not supported

### Requirement: Tool Definition Schema
The system SHALL enforce a consistent tool definition schema across all tool types.

#### Scenario: Tool definition structure
- **WHEN** a tool is defined in configuration
- **THEN** it MUST include: name (string), description (string), type ("function"), handler (string), parameters (JSONSchema)
- **AND** it MUST include: implementation object with type field

#### Scenario: Mock tool implementation
- **WHEN** a tool has implementation.type = "mock"
- **THEN** it MUST include implementation.mock_response field
- **AND** the mock_response can be any valid JSON value

#### Scenario: Builtin tool implementation
- **WHEN** a tool has implementation.type = "builtin"
- **THEN** it MUST include implementation.handler field
- **AND** the handler corresponds to a registered builtin function

#### Scenario: Internal tool implementation
- **WHEN** a tool has implementation.type = "internal"
- **THEN** it MUST include implementation.handler field
- **AND** the handler corresponds to an internal service integration

#### Scenario: HTTP tool implementation validation
- **WHEN** a tool has implementation.type = "http"
- **THEN** the system rejects registration with error "HTTP tools not yet supported (coming in v2)"
- **AND** the tool is not added to the registry

