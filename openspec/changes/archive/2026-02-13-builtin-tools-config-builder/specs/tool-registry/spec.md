## MODIFIED Requirements

### Requirement: Tool Registration
The system SHALL maintain a central registry of tool definitions loaded from the builtins manifest at startup, activated by name-only entries in the config.

#### Scenario: Register tool from manifest via config name
- **WHEN** the system starts with a registry entry { "name": "calculator" } in config
- **THEN** the system looks up "calculator" in the builtins manifest
- **AND** registers the full definition (name, description, parameters, handler, type) from the manifest
- **AND** the tool is available in the registry

#### Scenario: Unknown tool name is skipped with warning
- **WHEN** a registry entry names a tool not present in the manifest
- **THEN** the system logs a warning identifying the unknown name
- **AND** the entry is skipped
- **AND** all other valid entries are still registered

#### Scenario: Description override applied
- **WHEN** a registry entry contains { "name": "calculator", "description": "Custom text" }
- **THEN** the manifest description is replaced with "Custom text"
- **AND** all other fields come from the manifest unchanged

#### Scenario: Reject duplicate tool names
- **WHEN** two registry entries name the same tool
- **THEN** the second registration fails with an error
- **AND** the first tool remains registered

#### Scenario: Empty registry produces no active tools
- **WHEN** the config has no tools section, or tools.registry is empty
- **THEN** the registry contains no tools
- **AND** /api/tools/list returns an empty array
- **AND** the LLM is not offered any tools

#### Scenario: ToolManager initialises without tools config
- **WHEN** the server starts with no tools section in config
- **THEN** ToolManager is still created with an empty registry
- **AND** /api/tools/available returns all manifest builtins
- **AND** no error is thrown at startup

## MODIFIED Requirements

### Requirement: Tool Definition Schema
The system SHALL accept name-only activation entries in tools.registry, resolving full schemas from the builtins manifest.

#### Scenario: Name-only entry is valid
- **WHEN** a registry entry contains only { "name": "calculator" }
- **THEN** the system accepts the entry without error
- **AND** resolves the full schema (description, parameters, handler, type) from the manifest

#### Scenario: Name plus description override is valid
- **WHEN** a registry entry contains { "name": "calculator", "description": "Custom" }
- **THEN** the system accepts the entry
- **AND** uses the custom description, manifest values for all other fields

#### Scenario: Warn on unexpected extra fields
- **WHEN** a registry entry contains fields beyond name and description (e.g., type, parameters, builtin_handler)
- **THEN** the system logs a deprecation warning identifying the extra fields
- **AND** ignores the extra fields, using manifest values instead
- **AND** registration proceeds successfully

## REMOVED Requirements

### Requirement: Tool Definition Schema (full inline definition)
**Reason**: Tool schemas are now defined in the builtins manifest. Config entries are activation-only (name + optional description override). Full inline definitions (type, parameters, builtin_handler) in config are no longer supported.
**Migration**: Replace each full registry entry with `{ "name": "<tool-name>" }`. If a custom description was set, add `"description": "<custom>"`. All other fields (type, parameters, handler) come from the manifest automatically.
