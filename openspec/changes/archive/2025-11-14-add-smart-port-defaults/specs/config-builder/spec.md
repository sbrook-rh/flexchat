# config-builder Spec Deltas

## ADDED Requirements

### Requirement: Smart Port Defaults for RAG Services
The RAG wizard SHALL suggest the next available sequential port when configuring ChromaDB Wrapper services to avoid port conflicts in multi-service setups.

#### Scenario: First ChromaDB Wrapper service
- **WHEN** user selects "ChromaDB Wrapper" provider in RAG wizard
- **AND** no existing RAG services are configured with localhost URLs
- **THEN** the URL field defaults to `http://localhost:5006`

#### Scenario: Port already in use
- **WHEN** user selects "ChromaDB Wrapper" provider
- **AND** an existing RAG service is configured with `http://localhost:5006`
- **THEN** the URL field defaults to `http://localhost:5007`

#### Scenario: Multiple ports in use (sequential)
- **WHEN** user selects "ChromaDB Wrapper" provider
- **AND** existing services use ports 5006 and 5007
- **THEN** the URL field defaults to `http://localhost:5008`

#### Scenario: Multiple ports with gap
- **WHEN** user selects "ChromaDB Wrapper" provider
- **AND** existing services use ports 5006 and 5008 (gap at 5007)
- **THEN** the URL field defaults to `http://localhost:5007` (fills the gap)

#### Scenario: Edit mode preserves original URL
- **WHEN** user opens RAG wizard in edit mode for an existing service
- **THEN** the URL field shows the existing service's URL
- **AND** smart port defaulting does NOT override the existing value

#### Scenario: Only applies to ChromaDB Wrapper
- **WHEN** user selects a different provider (e.g., "ChromaDB" direct)
- **THEN** smart port detection does not apply
- **AND** the provider's original default from `getConnectionSchema()` is used

#### Scenario: Non-localhost URLs ignored
- **WHEN** existing RAG services use non-localhost URLs (e.g., `https://remote-server.com`)
- **THEN** those URLs are excluded from port detection
- **AND** only localhost URLs contribute to the smart default calculation

