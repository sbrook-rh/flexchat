# ai-providers Specification

## Purpose
The AI Providers capability defines the standardized requirements for integrating AI providers into Flex Chat. This specification ensures consistent behavior, interface compliance, and proper integration when adding new AI providers (OpenAI, Gemini, Anthropic, etc.) to the system.
## Requirements
### Requirement: Base AI Provider Interface
All AI providers SHALL implement a standardized interface that ensures consistent behavior across different AI services.

#### Scenario: Provider Initialization
- **WHEN** a provider is instantiated with configuration
- **THEN** it validates required configuration fields and initializes successfully

#### Scenario: Model Discovery
- **WHEN** the system requests available models from any provider
- **THEN** it returns a standardized list of models with type, capabilities, and metadata

#### Scenario: Chat Completion
- **WHEN** a chat request is made to any provider
- **THEN** it generates responses using the specified model with consistent message format

#### Scenario: Embedding Generation
- **WHEN** text array is provided to `generateEmbeddings(texts)` method
- **THEN** it generates embeddings using the configured embedding model and returns array of vectors with consistent dimensions

#### Scenario: Batch Embedding Generation
- **WHEN** large text array (>100 texts) is provided for embedding generation
- **THEN** the provider handles batching automatically according to provider-specific limits and returns all embeddings

#### Scenario: Embedding Configuration
- **WHEN** a provider is configured with embedding model specification
- **THEN** it validates the embedding model is available and returns dimensions for that model

#### Scenario: Embedding Error Handling
- **WHEN** embedding generation fails (API error, rate limit, invalid model)
- **THEN** it throws a descriptive error with provider name, model, and failure reason

#### Scenario: Health Check
- **WHEN** the system checks provider health
- **THEN** it returns standardized health status with timestamp and error details

#### Scenario: Configuration Validation
- **WHEN** provider configuration is validated
- **THEN** it checks required fields and returns validation results with specific error messages

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

### Requirement: Embedding Generation Module
The system SHALL provide a centralized embedding generation module that uses configured LLM providers to generate embeddings.

#### Scenario: Generate Embeddings with Valid Connection
- **WHEN** `generateEmbeddings(texts, connectionId, config)` is called with valid connection ID
- **THEN** it retrieves the LLM provider, generates embeddings, and returns array of vectors

#### Scenario: Invalid Connection ID
- **WHEN** `generateEmbeddings()` is called with non-existent connection ID
- **THEN** it throws error: `LLM connection "[id]" not found`

#### Scenario: Provider Without Embedding Support
- **WHEN** `generateEmbeddings()` is called with connection that doesn't support embeddings
- **THEN** it throws error indicating which provider and that embedding generation is not supported

#### Scenario: Empty Text Array
- **WHEN** `generateEmbeddings()` is called with empty text array
- **THEN** it returns empty array without making API calls

### Requirement: OpenAI Provider Embedding Support
The OpenAI provider SHALL implement embedding generation using OpenAI's embedding models.

#### Scenario: Generate OpenAI Embeddings
- **WHEN** `generateEmbeddings(texts)` is called on OpenAI provider
- **THEN** it uses the configured embedding model (default: `text-embedding-3-small`) and returns embeddings

#### Scenario: OpenAI Embedding Model Configuration
- **WHEN** OpenAI provider is configured with `embeddingModel` field
- **THEN** it uses that model for all embedding generation requests

#### Scenario: OpenAI Embedding Dimensions
- **WHEN** OpenAI provider generates embeddings with `text-embedding-3-small`
- **THEN** each embedding has 1536 dimensions

### Requirement: Ollama Provider Embedding Support
The Ollama provider SHALL implement embedding generation using Ollama's embedding models.

#### Scenario: Generate Ollama Embeddings
- **WHEN** `generateEmbeddings(texts)` is called on Ollama provider
- **THEN** it uses the configured embedding model (default: `nomic-embed-text`) and returns embeddings

#### Scenario: Ollama Embedding Model Configuration
- **WHEN** Ollama provider is configured with `embeddingModel` field
- **THEN** it uses that model for all embedding generation requests

#### Scenario: Ollama Embedding Dimensions
- **WHEN** Ollama provider generates embeddings with `nomic-embed-text`
- **THEN** each embedding has 768 dimensions

### Requirement: Gemini Provider Embedding Support
The Gemini provider SHALL implement embedding generation using Google's embedding models.

#### Scenario: Generate Gemini Embeddings
- **WHEN** `generateEmbeddings(texts)` is called on Gemini provider
- **THEN** it uses the configured embedding model (default: `text-embedding-004`) and returns embeddings

#### Scenario: Gemini Embedding Model Configuration
- **WHEN** Gemini provider is configured with `embeddingModel` field
- **THEN** it uses that model for all embedding generation requests

#### Scenario: Gemini Embedding Dimensions
- **WHEN** Gemini provider generates embeddings with `text-embedding-004`
- **THEN** each embedding has 768 dimensions

