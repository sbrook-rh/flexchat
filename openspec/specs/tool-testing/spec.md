## MODIFIED Requirements

### Requirement: Test Execution
The system SHALL execute tool calling tests via POST /api/tools/test, supporting both registered-provider and inline-provider modes.

#### Scenario: Execute test with inline provider config
- **WHEN** POST /api/tools/test is called with { provider_config, model, query, registry }
- **THEN** the system instantiates a temporary provider from provider_config
- **AND** resolves registry entries against the builtins manifest to build full tool definitions
- **AND** runs the tool calling flow using those tools and provider
- **AND** returns { content, model, service, tool_calls, max_iterations_reached? }

#### Scenario: Execute test with registered provider name
- **WHEN** POST /api/tools/test is called with { llm, model, query }
- **THEN** the system looks up the registered provider by llm name (existing behaviour)
- **AND** uses all currently active tools from the registry
- **AND** returns { content, model, service, tool_calls, max_iterations_reached? }

#### Scenario: Inline mode ignores applied config
- **WHEN** POST /api/tools/test is called with provider_config and registry
- **THEN** the test succeeds even if the provider has not been applied to the server
- **AND** only the tools named in the request registry are active for this test

#### Scenario: Missing parameters - inline mode
- **WHEN** POST /api/tools/test is called with provider_config but missing model or query
- **THEN** the system returns 400 with { error: "Missing required parameters: query, model" }

#### Scenario: Missing parameters - named mode
- **WHEN** POST /api/tools/test is called with llm but missing model or query
- **THEN** the system returns 400 with { error: "Missing required parameters: query, model, llm" }

#### Scenario: Unknown builtin in inline registry
- **WHEN** the inline registry contains a name not in the manifest
- **THEN** the unknown entry is skipped with a warning
- **AND** the test proceeds with the remaining valid tools

### Requirement: Backend API Endpoints
The system SHALL provide API endpoints for listing active tools, listing available builtins, and executing tests.

#### Scenario: List active tools endpoint
- **WHEN** GET /api/tools/list is called
- **THEN** the system returns { tools: [...], count, enabled, max_iterations } for currently active tools
- **AND** if no tools are configured, returns { tools: [], count: 0 }

#### Scenario: List available tools endpoint
- **WHEN** GET /api/tools/available is called
- **THEN** the system returns { tools: [...], count } with all manifest builtins
- **AND** the response is identical regardless of which tools are configured
- **AND** HTTP 200 is returned even in zero-config mode

#### Scenario: Missing parameters
- **WHEN** POST /api/tools/test is called without query or model
- **THEN** the system returns 400 with an error describing the missing fields

#### Scenario: Test execution error
- **WHEN** the test execution throws an error
- **THEN** the system returns 500 with { error: <message> }
- **AND** the error is logged to console

## REMOVED Requirements

### Requirement: Available Tools Display (standalone page)
**Reason**: The standalone /tools-testing route and ToolTesting component are removed. Tool display and testing now live in the Config Builder Tools section.
**Migration**: Use the Config Builder Tools tab (navigate to /config, select Tools in the sidebar). All tool display, toggling, and test execution functionality is available there.

### Requirement: Example Test Scenarios (standalone page)
**Reason**: Removed with the standalone tool testing page.
**Migration**: No migration needed. Example queries can be entered manually in the Config Builder Tools test panel.
