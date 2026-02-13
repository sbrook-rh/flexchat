# tool-testing Specification

## Purpose
TBD - created by archiving change add-tool-calling. Update Purpose after archive.
## Requirements
### Requirement: Available Tools Display
The system SHALL display all registered tools with their metadata in the testing interface.

#### Scenario: List available tools
- **WHEN** the tool testing page loads
- **THEN** the system fetches all tools via `/api/tools/list`
- **AND** each tool is displayed with: name, description, implementation type
- **AND** tools are shown in a grid layout

#### Scenario: Empty tools list
- **WHEN** no tools are configured
- **THEN** the system displays an empty state message
- **AND** the message explains how to configure tools

#### Scenario: Tool implementation badge
- **WHEN** displaying a tool card
- **THEN** the implementation type is shown as a badge (mock/builtin/internal)
- **AND** different types have distinct visual styling

### Requirement: Model Selection
The system SHALL provide model selection with capability indicators for tool calling.

#### Scenario: Load available models
- **WHEN** the tool testing page loads
- **THEN** the system fetches all models via `/api/models/list`
- **AND** models are populated in a dropdown selector

#### Scenario: Function calling indicator
- **WHEN** a model supports function calling
- **THEN** the model displays a 🔧 icon in the dropdown
- **AND** the icon indicates tool calling capability

#### Scenario: Model selection required
- **WHEN** the user tries to run a test without selecting a model
- **THEN** the system shows an alert "Please enter a test query and select a model"
- **AND** the test is not executed

### Requirement: Test Query Input
The system SHALL accept user test queries for tool calling evaluation.

#### Scenario: Query input field
- **WHEN** the testing interface is displayed
- **THEN** a textarea is shown for test query input
- **AND** the placeholder suggests example queries (e.g., "What's the weather in Paris?")

#### Scenario: Query required validation
- **WHEN** the user tries to run a test without entering a query
- **THEN** the system shows an alert "Please enter a test query and select a model"
- **AND** the test is not executed

### Requirement: Test Execution
The system SHALL execute tool calling tests and display results with full visibility.

#### Scenario: Execute test
- **WHEN** the user clicks "Run Test" with valid query and model
- **THEN** the system sends POST to `/api/tools/test` with {query, model}
- **AND** the button shows "Testing..." while loading
- **AND** the button is disabled during execution

#### Scenario: Test results display
- **WHEN** a test completes successfully
- **THEN** the system displays the test results section
- **AND** the section shows: tool calls, final response, metadata

#### Scenario: Test execution error
- **WHEN** the test API call fails
- **THEN** the system displays the error message
- **AND** the error is shown in the results section

### Requirement: Tool Call Results Visualization
The system SHALL display detailed information about each tool call in a test.

#### Scenario: Tool calls section
- **WHEN** the test includes tool calls
- **THEN** the system displays a "Tool Calls (<count>)" section
- **AND** each tool call is shown with: tool name, parameters, result, iteration number, execution time

#### Scenario: Tool call formatting
- **WHEN** displaying a tool call
- **THEN** the tool name is highlighted in monospace font
- **AND** parameters are shown as formatted JSON
- **AND** results are shown in a collapsible code block

#### Scenario: No tool calls
- **WHEN** the test completes without tool calls
- **THEN** the tool calls section is not displayed
- **AND** only the final response is shown

#### Scenario: Execution time display
- **WHEN** displaying a tool call
- **THEN** the execution time is shown in milliseconds
- **AND** the iteration number is displayed

### Requirement: Final Response Display
The system SHALL display the model's final response after tool calling completes.

#### Scenario: Show final response
- **WHEN** test results are displayed
- **THEN** a "Final Response" section shows the model's text output
- **AND** the response is displayed in a readable format

#### Scenario: Show metadata
- **WHEN** test results are displayed
- **THEN** metadata is shown including: model name, service name
- **AND** if max_iterations was reached, a warning is displayed

#### Scenario: Max iterations warning
- **WHEN** the test reached max iterations
- **THEN** a warning "⚠️ Max iterations reached" is displayed
- **AND** the warning uses orange/warning styling

### Requirement: Example Test Scenarios
The system SHALL provide pre-built test queries for common tool calling patterns.

#### Scenario: Display example scenarios
- **WHEN** the testing interface is shown
- **THEN** example test queries are displayed as clickable cards
- **AND** examples include: weather query, calculator, direct answer test, RAG search

#### Scenario: Load example query
- **WHEN** the user clicks an example scenario card
- **THEN** the test query field is populated with the example text
- **AND** the user can immediately run the test

#### Scenario: Example query descriptions
- **WHEN** displaying example scenarios
- **THEN** each card shows: title and description text
- **AND** descriptions explain what the test demonstrates

### Requirement: Backend API Endpoints
The system SHALL provide API endpoints for listing tools and executing tests.

#### Scenario: List tools endpoint
- **WHEN** GET `/api/tools/list` is called
- **THEN** the system returns `{tools: [...]}`  with all registered tool definitions
- **AND** if tools are disabled, returns `{tools: []}`

#### Scenario: Test tool calling endpoint
- **WHEN** POST `/api/tools/test` is called with `{query, model}`
- **THEN** the system creates a test response rule with all tools enabled
- **AND** the system generates a response using the tool calling flow
- **AND** the system returns `{content, service, model, tool_calls, max_iterations_reached?}`

#### Scenario: Missing parameters
- **WHEN** POST `/api/tools/test` is called without query or model
- **THEN** the system returns 400 with `{error: "Missing query or model"}`

#### Scenario: Test execution error
- **WHEN** the test execution throws an error
- **THEN** the system returns 500 with `{error: <error_message>}`
- **AND** the error is logged to console

