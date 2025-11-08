# chat-flow Specification

## Purpose
TBD - created by archiving change add-configurable-topic-prompt. Update Purpose after archive.
## Requirements
### Requirement: Configurable Topic Detection Prompts
The system SHALL support custom prompts for Phase 1 (Topic Detection) with variable substitution.

#### Scenario: Topic Detection With Default Prompt
- **WHEN** no custom prompt is configured in `config.topic.prompt`
- **THEN** the system uses the built-in default prompt optimized for small models
- **AND** returns structured result `{ topic: string, status: string }`

#### Scenario: Topic Detection With Custom Prompt
- **WHEN** a custom prompt is configured in `config.topic.prompt`
- **THEN** the system uses the custom prompt instead of the default
- **AND** substitutes `{{currentTopic}}`, `{{conversationContext}}`, `{{userMessage}}` placeholders
- **AND** returns structured result with topic and status

#### Scenario: Topic Detection Variable Substitution
- **WHEN** processing a prompt template with placeholders
- **THEN** the system substitutes `{{currentTopic}}` with current topic or "none"
- **AND** substitutes `{{conversationContext}}` with recent conversation history
- **AND** substitutes `{{userMessage}}` with the latest user message
- **AND** leaves unknown placeholders unchanged

#### Scenario: Topic Detection Error Handling
- **WHEN** topic detection fails due to provider error or malformed response
- **THEN** the system returns `{ topic: userMessage, status: 'new_topic' }` as safe fallback
- **AND** logs detailed error including model output for debugging
- **AND** continues the chat flow without disruption

#### Scenario: Topic Detection Test Endpoint
- **WHEN** testing topic detection via `/api/connections/topic/test` with conversation history
- **THEN** the system processes messages incrementally showing topic evolution
- **AND** uses custom prompt if provided in request body
- **AND** returns evolution array with detected topics and status for each message

#### Scenario: Default Prompt Retrieval
- **WHEN** requesting the default prompt via `/api/connections/topic/default-prompt`
- **THEN** the system returns the current default prompt template
- **AND** allows users to load it for customization in the UI

#### Scenario: Backward Compatibility
- **WHEN** processing configurations without `topic.prompt` field
- **THEN** topic detection works identically to previous behavior
- **AND** uses the default prompt without errors

