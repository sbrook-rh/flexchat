## ADDED Requirements

### Requirement: Tools Tab in Config Builder
The system SHALL provide a Tools tab in the Config Builder navigation sidebar.

#### Scenario: Tab appears in sidebar
- **WHEN** the Config Builder is loaded
- **THEN** a "Tools" tab with a 🔧 icon is shown in the navigation sidebar
- **AND** the tab is enabled only when at least one LLM provider is configured in workingConfig
- **AND** when disabled, the tab tooltip reads "Configure at least one LLM Provider first"

#### Scenario: Tab badge shows active tool count
- **WHEN** workingConfig.tools.registry contains entries
- **THEN** the Tools tab badge shows the count of active tools
- **AND** when the registry is empty or absent, no badge is shown

#### Scenario: Tab navigates to Tools section
- **WHEN** the user clicks the Tools tab
- **THEN** the Tools section content is rendered in the main content area

### Requirement: Available Builtins Display
The system SHALL display all available builtin tools as toggleable cards.

#### Scenario: Load available tools on mount
- **WHEN** the Tools section mounts
- **THEN** it fetches GET /api/tools/available
- **AND** each builtin is displayed as a card showing: name, description, enabled/disabled state

#### Scenario: Enabled state reflects working config
- **WHEN** a builtin's name appears in workingConfig.tools?.registry
- **THEN** its card toggle is shown as enabled
- **AND** when the name is absent from the registry, the toggle is shown as disabled

#### Scenario: Empty state
- **WHEN** the available tools list is empty or fails to load
- **THEN** an informative message is displayed
- **AND** no error is thrown

### Requirement: Tool Toggle
The system SHALL allow users to enable or disable individual builtin tools in the working config.

#### Scenario: Enable a tool
- **WHEN** the user toggles a disabled tool to enabled
- **THEN** an entry { name: "<tool-name>" } is added to workingConfig.tools.registry
- **AND** if workingConfig.tools does not exist, it is created with enabled: true and max_iterations: 5
- **AND** onUpdate() is called with the updated working config
- **AND** the validation state is marked dirty

#### Scenario: Disable a tool
- **WHEN** the user toggles an enabled tool to disabled
- **THEN** the entry for that tool is removed from workingConfig.tools.registry
- **AND** onUpdate() is called with the updated working config
- **AND** the validation state is marked dirty

#### Scenario: Toggle does not affect other tools
- **WHEN** the user enables or disables one tool
- **THEN** all other registry entries remain unchanged

### Requirement: Description Override
The system SHALL allow users to optionally override a tool's description in the working config.

#### Scenario: Override description
- **WHEN** the user enters a custom description for an enabled tool
- **THEN** the registry entry is updated to { name: "<tool-name>", description: "<custom>" }
- **AND** onUpdate() is called with the updated working config

#### Scenario: Clear description override
- **WHEN** the user clears a custom description field
- **THEN** the registry entry reverts to { name: "<tool-name>" } with no description field
- **AND** onUpdate() is called with the updated working config

#### Scenario: Description override only available when enabled
- **WHEN** a tool is disabled (not in registry)
- **THEN** the description override field is not shown or is disabled

### Requirement: Inline Tool Testing
The system SHALL provide a tool test panel within the Tools section that operates against the working config.

#### Scenario: Test uses working config provider
- **WHEN** the user runs a test from the Tools section
- **THEN** the request sends provider_config (from workingConfig.llms[selectedLlm]) rather than an llm name
- **AND** the test succeeds even if the provider has not been applied to the server

#### Scenario: Test uses working config registry
- **WHEN** the user runs a test
- **THEN** the request includes registry: workingConfig.tools?.registry
- **AND** only tools currently toggled on in the working config are active during the test

#### Scenario: LLM provider selector
- **WHEN** the test panel is displayed
- **THEN** a dropdown lists all providers from workingConfig.llms
- **AND** selecting a provider fetches available models for that provider

#### Scenario: Model selector
- **WHEN** an LLM provider is selected
- **THEN** available models are fetched and shown in a model dropdown
- **AND** models with known function-calling capability show a 🔧 indicator

#### Scenario: Run test
- **WHEN** the user enters a query and clicks Run Test
- **THEN** POST /api/tools/test is called with { provider_config, model, query, registry }
- **AND** the button shows a loading state during execution
- **AND** the button is disabled while loading

#### Scenario: Test results display
- **WHEN** a test completes successfully
- **THEN** tool calls are shown (name, params, result, iteration, execution time)
- **AND** the final response text is shown
- **AND** metadata (model, provider, tool call count) is shown

#### Scenario: Test error display
- **WHEN** a test fails
- **THEN** the error message is shown
- **AND** a validation badge reflects the failure

#### Scenario: No tools enabled
- **WHEN** no tools are toggled on in the working config
- **THEN** the Run Test button is disabled
- **AND** a message explains that at least one tool must be enabled to test

#### Scenario: No providers configured
- **WHEN** workingConfig.llms is empty
- **THEN** the LLM selector shows "No providers configured"
- **AND** the Run Test button is disabled
