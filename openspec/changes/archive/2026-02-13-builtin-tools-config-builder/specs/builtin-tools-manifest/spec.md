## ADDED Requirements

### Requirement: Static Builtin Manifest
The system SHALL maintain a static manifest of all available builtin tool definitions as the single source of truth for tool schemas.

#### Scenario: Manifest contains all builtins
- **WHEN** the manifest module is loaded
- **THEN** it exports an array of tool definitions
- **AND** each entry includes: name, description, parameters (JSON Schema), handler name, type
- **AND** the manifest includes: calculator, get_current_datetime, generate_uuid

#### Scenario: Manifest is immutable at runtime
- **WHEN** the server is running
- **THEN** the manifest contents do not change
- **AND** no API or config can add or remove manifest entries at runtime

#### Scenario: Manifest entry structure
- **WHEN** a builtin is defined in the manifest
- **THEN** its entry MUST include: name (string), description (string), type ("builtin"), handler (string), parameters (JSON Schema object with type "object")

### Requirement: get_current_datetime Builtin
The system SHALL provide a builtin tool that returns the current date and time.

#### Scenario: Returns current UTC datetime
- **WHEN** get_current_datetime is called with no parameters
- **THEN** the system returns an object with: iso (ISO 8601 string), date (YYYY-MM-DD), time (HH:MM:SS), timezone ("UTC")
- **AND** the values reflect the actual current system time

#### Scenario: Returns datetime in requested timezone
- **WHEN** get_current_datetime is called with timezone = "Europe/London"
- **THEN** the system returns the current time adjusted to that timezone
- **AND** the timezone field reflects the requested timezone

#### Scenario: Invalid timezone falls back to UTC
- **WHEN** get_current_datetime is called with an unrecognised timezone string
- **THEN** the system returns UTC time
- **AND** the timezone field is "UTC"

#### Scenario: No external dependencies
- **WHEN** get_current_datetime executes
- **THEN** it uses only Node.js built-in Intl and Date APIs
- **AND** no npm packages are required

### Requirement: generate_uuid Builtin
The system SHALL provide a builtin tool that returns a cryptographically random UUID.

#### Scenario: Returns a valid UUID v4
- **WHEN** generate_uuid is called
- **THEN** the system returns an object with a single field: uuid (string)
- **AND** the uuid conforms to UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
- **AND** the uuid is cryptographically random

#### Scenario: No parameters required
- **WHEN** generate_uuid is called with no parameters
- **THEN** it executes successfully and returns a uuid
- **AND** no error is thrown for missing parameters

#### Scenario: No external dependencies
- **WHEN** generate_uuid executes
- **THEN** it uses only Node.js built-in crypto.randomUUID()
- **AND** no npm packages are required

### Requirement: Available Tools API Endpoint
The system SHALL expose all manifest entries via a stable API endpoint regardless of server configuration state.

#### Scenario: Returns all builtins in zero-config mode
- **WHEN** GET /api/tools/available is called with no tools configured
- **THEN** the system returns all manifest entries
- **AND** the response includes: tools (array), count (number)
- **AND** HTTP 200 is returned

#### Scenario: Returns all builtins when tools are configured
- **WHEN** GET /api/tools/available is called with tools configured
- **THEN** the system returns all manifest entries regardless of which are active
- **AND** active state is NOT indicated in this response (that is in /api/tools/list)

#### Scenario: Endpoint always available
- **WHEN** the server starts with no config file
- **THEN** GET /api/tools/available still returns all builtins
- **AND** ToolManager is initialised unconditionally at startup
