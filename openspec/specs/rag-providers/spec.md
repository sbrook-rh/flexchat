# rag-providers Specification

## Purpose
TBD - created by archiving change config-builder-system. Update Purpose after archive.
## Requirements
### Requirement: RAG Provider Registry Integration
All RAG providers SHALL integrate with the provider registry system for discovery and management.

#### Scenario: RAG Provider Registration
- **WHEN** a new RAG provider is added to the system
- **THEN** it registers itself with the RAG provider registry and becomes discoverable

#### Scenario: RAG Provider Discovery
- **WHEN** the system needs to find available RAG providers
- **THEN** it queries the registry and returns all registered providers with their capabilities

#### Scenario: RAG Provider Selection
- **WHEN** a RAG provider is selected for use
- **THEN** the system loads the provider instance with proper configuration and error handling

### Requirement: Base RAG Provider Interface
All RAG providers SHALL implement a standardized interface that ensures consistent behavior across different RAG services, including configuration schema and testing capabilities.

#### Scenario: Provider Initialization with Schema
- **WHEN** a RAG provider is instantiated
- **THEN** it exposes its configuration schema via `getConnectionSchema()`
- **AND** validates provided configuration against the schema
- **AND** initializes successfully if configuration is valid

#### Scenario: Provider Capabilities Declaration
- **WHEN** querying a RAG provider's capabilities
- **THEN** it returns supported operations: `collections`, `search`, `embeddings`, `metadata_filtering`
- **AND** allows UI to show/hide features based on capabilities

#### Scenario: Health Check with Details
- **WHEN** the system checks RAG provider health
- **THEN** it returns standardized health status with timestamp and error details
- **AND** includes service-specific information (collection count, storage size, etc.)

### Requirement: Hybrid Query Strategy for Contextual Continuity
The RAG query system SHALL use an intelligent hybrid approach to balance semantic richness with conversational context continuity.

#### Scenario: First Message Query Strategy
- **WHEN** a user sends the first message in a conversation (no current topic exists)
- **THEN** the system uses the raw user message text for embedding generation and RAG query
- **AND** logs the query strategy as "first message (raw query)"
- **AND** achieves optimal semantic matching for standalone questions

#### Scenario: Follow-up Message Query Strategy
- **WHEN** a user sends a follow-up message (current topic exists from previous exchanges)
- **THEN** the system uses the accumulated contextualized topic for embedding generation and RAG query
- **AND** logs the query strategy as "follow-up (contextualized topic)"
- **AND** resolves pronouns and implicit references through topic accumulation

#### Scenario: Pronoun Resolution via Topic Context
- **WHEN** a user asks a follow-up question with pronouns (e.g., "Does it integrate with OpenShift AI?")
- **THEN** the accumulated topic maintains the subject context (e.g., "InstructLab and OpenShift AI integration")
- **AND** the query embedding includes the full context, preventing loss of domain specificity
- **AND** retrieves relevant documents that match the implicit subject

#### Scenario: Query Text Selection Logic
- **WHEN** the RAG collector determines which text to embed
- **THEN** it checks if `currentTopic` is empty or whitespace-only
- **AND** if empty, uses `userMessage` (first message strategy)
- **AND** if present, uses normalized `topic` (follow-up strategy)

#### Scenario: Embedding Cache Efficiency
- **WHEN** multiple collections use the same embedding connection and model
- **THEN** the system generates the embedding once and caches it with key `connectionId:model`
- **AND** reuses the cached embedding for subsequent collection queries
- **AND** logs cache hits for observability

