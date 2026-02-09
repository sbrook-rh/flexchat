# ai-providers Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

