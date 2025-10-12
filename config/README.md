# Configuration System

This directory contains the configuration system for the flexible chat application.

## Structure

```
config/
├── examples/           # Sample configurations for different use cases
├── schema/            # JSON schemas for validation
└── README.md          # This file
```

## Configuration Files

### Main Configuration

The main configuration file defines:
- AI providers and their credentials
- Knowledge bases (vector databases)
- Response strategies with detection and response configuration

**Location**: `config/config.json` (or specify via environment variable)
**Note**: This file is NOT version controlled - mount as ConfigMap in deployment

**Schema**: See `schema/config-schema.json`

### Example Configurations

- **`redhat-complex.json`** - Complex multi-domain Red Hat support bot
- **`chat-only.json`** - Simple conversational bot without RAG
- **`rag-only-llm-fallback.json`** - RAG-only with LLM fallback
- **`rag-only-static-fallback.json`** - RAG-only with static fallback
- **`multi-domain.json`** - Multi-domain bot (cooking, travel, tech, weather)

## Configuration Structure

### Top Level

- **`detection_provider`**: Provider/model for intent detection (required unless only one strategy with type "default")
- **`providers`**: AI provider configurations (OpenAI, Ollama, Gemini, etc.)
- **`knowledge_bases`**: Vector database configurations (ChromaDB, Milvus, etc.)
- **`strategies`**: Array of response strategies

### Strategy Structure

Each strategy has:
- **`name`**: Unique identifier (e.g., "OPENSHIFT", "CODING")
- **`detection`**: How to detect this strategy
  - `type`: "rag", "llm", or "default"
  - `knowledge_base`: Knowledge base name (for RAG)
  - `threshold`: Distance threshold for immediate detection
  - `fallback_threshold`: Optional upper threshold for hybrid detection
  - `description`: Text used in LLM intent detection
- **`response`**: How to generate responses
  - `provider`: AI provider name
  - `model`: Model to use
  - `max_tokens`: Token limit
  - `system_prompt`: System prompt OR
  - `static_response`: Static text response

## Detection Types

### RAG Detection (`"rag"`)
- Queries knowledge base directly
- If distance < threshold → strategy detected
- If fallback_threshold specified and distance in range → include in LLM detection
- If distance > fallback_threshold → exclude from LLM detection

### LLM Detection (`"llm"`)
- Included in LLM intent detection query
- Uses description field in prompt

### Default (`"default"`)
- Catch-all strategy when nothing else matches
- No detection needed

## Environment Variables

- `CHAT_CONFIG_PATH` - Path to main configuration file (default: `config/config.json`)
- Use `${VARIABLE_NAME}` in config files for environment variable substitution

## Usage

1. Choose an example configuration that matches your use case
2. Copy it to `config/config.json`
3. Replace `${OPENAI_API_KEY}` and other placeholders with actual values
4. Configure knowledge bases and providers for your setup
5. Start the chat server

## Validation

Use the JSON schema to validate your configuration:

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate configuration
ajv validate -s schema/config-schema.json -d config.json
```

## Deployment

In OpenShift/Kubernetes:
1. Create ConfigMap from config.json (with secrets replaced)
2. Mount ConfigMap at `/app/config/config.json`
3. Or use environment variable `CHAT_CONFIG_PATH` to point to mounted location
