# Session Log

## 2024-12-19

### Context
- Working on a flexible, configurable chat system with AI provider abstraction
- Project copied from another implementation with React frontend, Node.js backend, and Python RAG service
- Original implementations renamed to `server-orig.js` and `server-orig.py`
- AI provider abstraction already built in `backend/ai-providers/`
- Need to create new implementations using the abstraction and configuration system

### Decisions
- **Configuration-first approach**: All behavior controlled by JSON configuration files, not hardcoded logic
- **Intent detection methods**: RAG detection, hybrid detection, LLM detection
- **Detection strategy**: "skip" for single intent (no detection), "auto" for normal detection flow
- **Fallback requirements**: Required for "auto" detection, optional for "skip" detection
- **RAG-first detection**: Knowledge base queries are the best intent detectors for their own domain
- **Unified response generation**: Single method handles all response types with configurable prompts and models

### Commands Run
- Created configuration examples and schema files
- Updated ARCHITECTURE.md with new intent detection understanding
- Updated JSON schema with conditional validation

### Changes Made
- **ARCHITECTURE.md**: Updated with new "strategies" structure and configuration sections
- **config/examples/**: Created 5 sample configurations with new structure:
  - `redhat-complex.json` - Multi-domain Red Hat support bot with 3 RAG knowledge bases
  - `chat-only.json` - Simple conversational bot with skip detection
  - `rag-only-llm-fallback.json` - RAG-only with LLM fallback
  - `rag-only-static-fallback.json` - RAG-only with static response fallback
  - `multi-domain.json` - Multi-domain bot (cooking, travel, tech, weather)
- **config/schema/config-schema.json**: Created comprehensive JSON schema with:
  - Providers configuration (OpenAI, Ollama, Gemini, Anthropic)
  - Knowledge bases configuration (ChromaDB, Milvus, Postgres, Pinecone)
  - Strategies configuration with detection and response sections
  - Conditional validation for detection_strategy
- **config/README.md**: Complete configuration documentation with examples

### Key Understanding Achieved
- **"Strategies" not "Intents"**: Configuration defines response strategies with detection and response sections
- **Detection flow**: RAG queries first (in order), stop if any hit threshold, filter strategies exceeding fallback_threshold, single LLM query with detection_provider for remaining strategies
- **Response generation**: Each strategy specifies its own provider and model for response generation
- **Single detection provider**: One provider/model handles all intent detection to avoid "which provider" problem
- **Configuration structure**: 
  - `providers`: AI provider configurations with credentials
  - `knowledge_bases`: Vector database configurations with embedding settings
  - `strategies`: Array with `detection` and `response` sections
- **Detection types**: RAG (knowledge base query), LLM (text description), Default (catch-all)
- **Response options**: LLM-generated (with provider/model) or static text
- **No version control**: Single config file (config.json) not in git, mounted as ConfigMap in deployment

### TODOs / Next
- Create new chat server.js using AI provider abstraction
- Create new RAG server.py using AI provider abstraction  
- Update package.json dependencies for JSON parsing
- Test the new implementation end-to-end
- Update README and other docs to reflect new architecture

### Open Questions
- How to handle multiple knowledge bases in the RAG service?
- Should we support different vector database providers?
- How to handle configuration validation at runtime?
- Should we support environment variable overrides for configuration values?
