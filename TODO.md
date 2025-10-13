# Chat Starter - TODO List

## Configuration System
- [x] Design strategy-based configuration structure
- [x] Create JSON schema for configuration validation
- [x] Create example configurations for different use cases
- [x] Document configuration system
- [ ] Add configuration validation at runtime
- [ ] Support environment variable substitution in config files

## AI Provider Abstraction
- [x] Create AI provider abstraction layer supporting multiple services (OpenAI, Ollama, etc.)
- [x] Implement model discovery - query available models from each provider
- [x] Build configuration system for provider selection and model choice
- [ ] Create new chat server.js using AI provider abstraction
- [ ] Update documentation to reflect new multi-provider capabilities

## Vector Database Abstraction
- [ ] Create vector database provider abstraction layer
- [ ] Implement ChromaDB provider
- [ ] Support for multiple knowledge bases
- [ ] Create new RAG server.py using vector provider abstraction
- [ ] Support Milvus provider (future)
- [ ] Support Postgres/pgvector provider (future)

## Architecture Improvements
- [x] Design provider interface with common methods (chat, embeddings, model list)
- [x] Create provider registry for easy addition of new services
- [x] Implement provider-specific configuration schemas
- [x] Add provider health checks and fallback mechanisms
- [x] Design strategy detection flow (RAG-first, LLM fallback)
- [ ] Implement unified response generation system

## Provider Implementations
- [x] OpenAI provider (existing functionality)
- [ ] Ollama provider (local models)
- [ ] Anthropic Claude provider (future)
- [ ] Google Gemini provider (future)
- [ ] Azure OpenAI provider (future)

## Chat Server Implementation
- [ ] Create new server.js with strategy-based routing
- [ ] Implement RAG detection (query knowledge bases in order)
- [ ] Implement LLM detection (single query with detection_provider)
- [ ] Implement unified response generation
- [ ] Support static response fallback
- [ ] Handle context injection for RAG strategies
- [ ] Add proper error handling and rate limiting
- [ ] Update package.json dependencies

## RAG Service Implementation
- [ ] Create new server.py with vector provider abstraction
- [ ] Support multiple knowledge bases
- [ ] Support multiple vector database types
- [ ] Implement embedding generation via AI providers
- [ ] Add distance-based relevance scoring
- [ ] Add proper error handling

## Frontend Updates
- [ ] Update Chat.jsx to work with new backend API (if needed)
- [ ] Add model selection UI (future)
- [ ] Add configuration management UI (future)

## Testing & Validation
- [ ] Test chat-only configuration
- [ ] Test RAG-only configuration (LLM fallback)
- [ ] Test RAG-only configuration (static fallback)
- [ ] Test multi-domain configuration
- [ ] Test complex Red Hat configuration
- [ ] Unit tests for provider abstraction
- [ ] Integration tests with multiple providers
- [ ] Error handling and fallback testing

## Documentation
- [x] Update ARCHITECTURE.md with strategy-based approach
- [x] Create config/README.md
- [x] Update SESSION_LOG.md
- [ ] Update main README.md
- [ ] Create API_REFERENCE.md updates
- [ ] Add deployment guide for OpenShift/Kubernetes
- [ ] Document environment variable substitution

## Deployment
- [ ] Create .gitignore entry for config/config.json
- [ ] Create example .env files
- [ ] Document ConfigMap setup for OpenShift
- [ ] Document secrets management
- [ ] Add health check endpoints
- [ ] Add readiness/liveness probes

## Future Enhancements
- [ ] Tool calling support
- [ ] Backend chat history management
- [ ] Advanced RAG features (hybrid search, query expansion)
- [ ] Conversation summarization
- [ ] Multiple vector database support
- [ ] Performance monitoring and metrics
- [ ] Smart document chunking/ingestion (integrate LangChain/LlamaIndex for JSON arrays, PDFs, etc.)
- [ ] Embedding model selection helper/UI (guide users on choosing compatible models per provider)
