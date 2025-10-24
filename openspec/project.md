# Project Context

## Purpose
Flex Chat is a configuration-driven, AI-powered chat application with topic-aware RAG (Retrieval-Augmented Generation), dynamic knowledge base management, and transparent multi-model support. The system provides a 6-phase processing flow for intelligent conversation handling with configurable AI providers and RAG services.

## Tech Stack
- **Frontend**: React 19.1.1, Vite 7.1.7, Tailwind CSS 4.1.14, React Router DOM 7.9.4
- **Backend**: Node.js 18+, Express 4.21.1, Commander.js 14.0.1
- **RAG Service**: Python 3.8+, FastAPI, ChromaDB, Uvicorn
- **AI Providers**: OpenAI API, Google Gemini, Ollama (local models)
- **Testing**: Jest 29.7.0, Supertest 7.1.3
- **Development**: ESLint 9.36.0, Nodemon 3.1.10, Vite dev server

## Project Conventions

### Code Style
- **JavaScript/JSX**: 2 spaces indentation, ES6+ modules, camelCase variables
- **Python**: 4 spaces indentation, snake_case variables, type hints with Pydantic
- **Naming**: kebab-case for files, camelCase for variables, PascalCase for components
- **Comments**: JSDoc for functions, inline comments for complex logic
- **Functions**: Keep small and focused, single responsibility principle

### Architecture Patterns
- **6-Phase Processing Flow**: Topic Detection → RAG Collection → Intent Detection → Profile Building → Response Handler Matching → Response Generation
- **Provider Abstraction**: Pluggable AI and RAG providers with unified interfaces
- **Configuration-Driven**: All behavior controlled by JSON configuration files
- **Microservices**: Separate frontend, chat server, and RAG wrapper services
- **RESTful APIs**: Standard HTTP methods with JSON payloads
- **Environment-based Configuration**: Support for multiple deployment environments

### Testing Strategy
- **Unit Tests**: Jest for Node.js backend with coverage reporting
- **Integration Tests**: API endpoint testing with Supertest
- **Manual Testing**: End-to-end workflow validation
- **Coverage**: Target 80%+ coverage for core modules
- **Test Structure**: `__tests__/` directories, `*.test.js` naming convention

### Git Workflow
- **Branching**: Feature branches from main, no long-lived branches
- **Commits**: Conventional commit messages (feat:, fix:, docs:, refactor:)
- **Atomic Commits**: Each commit contains complete logical changes
- **No `git add .`**: Explicit file staging, avoid committing unrelated changes
- **Pull Requests**: Required for all changes, CI/CD validation

## Domain Context
- **AI Chat System**: Multi-provider AI chat with RAG capabilities
- **Vector Databases**: ChromaDB for semantic search and document storage
- **Intent Detection**: Hybrid approach using vector similarity + LLM classification
- **Response Handlers**: Pattern-matching system for different conversation types
- **Collection Management**: Dynamic knowledge base creation and management
- **Model Transparency**: Per-message display of AI provider and model used

## Important Constraints
- **API Rate Limits**: OpenAI and other commercial APIs have usage limits
- **Memory Usage**: ChromaDB and embedding models require significant RAM
- **Network Dependencies**: Requires internet for OpenAI/Gemini, local for Ollama
- **Configuration Validation**: JSON schema validation for all configuration files
- **CORS**: Cross-origin requests enabled for development
- **Environment Variables**: Sensitive data (API keys) must use environment variables

## External Dependencies
- **OpenAI API**: GPT models and text-embedding-ada-002 embeddings
- **Google Gemini**: Alternative AI provider with different model capabilities
- **Ollama**: Local model hosting for offline/private deployments
- **ChromaDB**: Vector database for semantic search and document storage
- **FastAPI**: Python web framework for RAG service wrapper
- **Node.js Ecosystem**: Express, Axios, Commander.js for backend services
