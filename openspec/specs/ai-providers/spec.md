# ai-providers Specification

## Purpose
The AI Providers capability defines the standardized requirements for integrating AI providers into Flex Chat. This specification ensures consistent behavior, interface compliance, and proper integration when adding new AI providers (OpenAI, Gemini, Anthropic, etc.) to the system.
## Requirements
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

### Requirement: Provider Registry Integration
All AI providers SHALL integrate with the provider registry system for discovery and management.

#### Scenario: Provider Registration
- **WHEN** a new provider is added to the system
- **THEN** it registers itself with the provider registry and becomes discoverable

#### Scenario: Provider Discovery
- **WHEN** the system needs to find available providers
- **THEN** it queries the registry and returns all registered providers with their capabilities

#### Scenario: Provider Selection
- **WHEN** a provider is selected for use
- **THEN** the system loads the provider instance with proper configuration and error handling

### Requirement: 6-Phase Flow Integration
All AI providers SHALL integrate seamlessly with the 6-phase processing flow.

#### Scenario: Topic Detection Integration
- **WHEN** a chat request is processed through topic detection
- **THEN** the provider works with topic detection using the correct API format

#### Scenario: RAG Integration
- **WHEN** RAG context is provided to the provider
- **THEN** it processes the context and generates responses that incorporate the retrieved information

#### Scenario: Response Handler Integration
- **WHEN** response handlers are applied
- **THEN** the provider generates responses that work with the response handler system

### Requirement: Provider Implementations
The system SHALL provide specific AI provider implementations that follow the base interface requirements.

#### Scenario: Provider Implementation Structure
- **WHEN** a new provider is implemented
- **THEN** it follows the standardized interface and is documented in `specs/ai-providers/providers/[provider-name].md`

#### Scenario: Provider Documentation
- **WHEN** a provider implementation is completed
- **THEN** it has its own specification file with detailed requirements and scenarios

#### Scenario: Provider Testing
- **WHEN** a provider is implemented
- **THEN** it includes comprehensive test scenarios covering all interface requirements

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

