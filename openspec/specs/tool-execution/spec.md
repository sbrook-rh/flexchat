# tool-execution Specification

## Purpose
TBD - created by archiving change add-tool-calling. Update Purpose after archive.
## Requirements
### Requirement: Tool Execution Flow
The system SHALL execute tool calls with parameter validation, error handling, and execution time tracking.

#### Scenario: Successful tool execution
- **WHEN** a valid tool call is received
- **THEN** the system validates the tool exists
- **AND** the system validates parameters against the tool schema
- **AND** the system executes the tool based on implementation type
- **AND** the system returns `{success: true, result: <data>, tool_name: <name>, execution_time_ms: <time>}`

#### Scenario: Tool not found
- **WHEN** a tool call requests a non-existent tool
- **THEN** the system returns `{success: false, error: "Tool '<name>' not found", tool_name: <name>, execution_time_ms: <time>}`
- **AND** no exception is thrown

#### Scenario: Parameter validation failure
- **WHEN** required parameters are missing
- **THEN** the system returns `{success: false, error: "Invalid parameters: missing '<param>'", tool_name: <name>, execution_time_ms: <time>}`
- **AND** the tool is not executed

#### Scenario: Tool execution error
- **WHEN** a tool throws an exception during execution
- **THEN** the system catches the exception
- **AND** the system returns `{success: false, error: <error_message>, tool_name: <name>, execution_time_ms: <time>}`

### Requirement: Parameter Validation
The system SHALL validate tool parameters against JSON Schema before execution.

#### Scenario: Required parameter check
- **WHEN** a tool defines required parameters
- **THEN** the system verifies all required parameters are present
- **AND** missing parameters cause validation failure with specific error message

#### Scenario: Type checking
- **WHEN** a parameter has type constraints
- **THEN** the system validates the actual type matches expected type
- **AND** type="integer" validates Number.isInteger()
- **AND** type="string" validates typeof === 'string'

#### Scenario: Enum validation
- **WHEN** a parameter has enum constraints
- **THEN** the system validates the value is in the allowed set
- **AND** invalid values cause validation failure listing valid options

#### Scenario: Allow extra parameters
- **WHEN** a tool call includes parameters not in the schema
- **THEN** the system ignores extra parameters
- **AND** validation focuses only on defined parameters

### Requirement: Mock Tool Execution
The system SHALL execute mock tools by returning static responses for testing.

#### Scenario: Execute mock tool
- **WHEN** a tool with implementation.type = "mock" is executed
- **THEN** the system returns implementation.mock_response directly
- **AND** parameters are logged but not used
- **AND** execution completes in < 10ms

### Requirement: Builtin Tool Execution
The system SHALL execute builtin tools by calling registered JavaScript functions.

#### Scenario: Execute builtin tool
- **WHEN** a tool with implementation.type = "builtin" is executed
- **THEN** the system looks up the handler by implementation.handler name
- **AND** the system calls the handler function with parameters
- **AND** the system returns the handler result

#### Scenario: Builtin handler not found
- **WHEN** a builtin tool references a non-existent handler
- **THEN** the system throws an error "Builtin handler '<name>' not found"
- **AND** the error is caught and returned as tool execution error

#### Scenario: Math evaluation handler
- **WHEN** the "math_eval" builtin handler is called with {expression: "2+2"}
- **THEN** the system uses mathjs library to evaluate the expression safely
- **AND** the system returns {result: 4}
- **AND** invalid expressions throw errors with descriptive messages

#### Scenario: Echo handler
- **WHEN** the "echo" builtin handler is called with parameters
- **THEN** the system returns {echo: <parameters>}
- **AND** the response mirrors the input for testing purposes

### Requirement: Internal Tool Execution
The system SHALL execute internal tools by calling Flex Chat service integrations.

#### Scenario: Execute internal tool
- **WHEN** a tool with implementation.type = "internal" is executed
- **THEN** the system looks up the handler by implementation.handler name
- **AND** the system calls the internal service handler with parameters
- **AND** the system returns the service result

#### Scenario: Internal handler not found
- **WHEN** an internal tool references a non-existent handler
- **THEN** the system throws an error "Internal handler '<name>' not found"
- **AND** the error is caught and returned as tool execution error

### Requirement: Execution Time Tracking
The system SHALL track execution time for all tool calls for observability.

#### Scenario: Track execution time
- **WHEN** any tool is executed
- **THEN** the system records start time before execution
- **AND** the system records end time after execution
- **AND** the system includes execution_time_ms in the result object

#### Scenario: Include time in error results
- **WHEN** a tool execution fails
- **THEN** the error result includes execution_time_ms
- **AND** the time reflects the full validation + execution attempt duration

### Requirement: Error Result Format
The system SHALL return consistent error result format for all failure modes.

#### Scenario: Error result structure
- **WHEN** any tool execution fails
- **THEN** the result MUST include: success=false, error (string), tool_name (string), execution_time_ms (number)
- **AND** the error message MUST be descriptive for debugging

#### Scenario: Success result structure
- **WHEN** a tool execution succeeds
- **THEN** the result MUST include: success=true, result (any), tool_name (string), execution_time_ms (number)
- **AND** the result field contains the tool's return value

