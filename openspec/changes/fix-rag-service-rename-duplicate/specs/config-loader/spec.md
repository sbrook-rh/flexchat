## ADDED Requirements

### Requirement: RAG Service Reference Validation
The system SHALL validate that response handlers do not reference non-existent RAG services, matching the same validation pattern used for LLM references.

#### Scenario: Detect Orphaned RAG Service References
- **WHEN** a configuration contains response handlers with `match.service` field
- **THEN** the system validates each referenced service exists in `config.rag_services`
- **AND** if a handler references an undefined service, adds validation error: `Response rule {idx + 1} references undefined RAG service: "{service_name}"`
- **AND** the validation error format matches LLM validation errors exactly

#### Scenario: Allow Handlers Without Service References
- **WHEN** a response handler does not have a `match.service` field
- **THEN** the system skips RAG service validation for that handler
- **AND** validation passes without errors

#### Scenario: Multiple Orphaned References
- **WHEN** multiple response handlers reference the same deleted RAG service
- **THEN** the system reports a validation error for each handler
- **AND** lists all affected handler indices in error messages

#### Scenario: Validation Prevents Config Apply
- **WHEN** configuration validation fails due to orphaned RAG service references
- **THEN** the system prevents hot-reload/apply
- **AND** maintains the current working configuration
- **AND** returns validation errors to the UI for correction

