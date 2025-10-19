# Configuration Guide

**Version**: 2.0  
**Last Updated**: October 19, 2025

This guide explains how to configure Flex Chat for your use case.

---

## Table of Contents

1. [Configuration File Location](#configuration-file-location)
2. [Configuration Structure](#configuration-structure)
3. [LLMs Section](#llms-section)
4. [RAG Services Section](#rag-services-section)
5. [Embedding Section](#embedding-section)
6. [Intent Section](#intent-section)
7. [Responses Section](#responses-section)
8. [Complete Example](#complete-example)
9. [Environment Variables](#environment-variables)

---

## Configuration File Location

### Specifying the Configuration File

Flex Chat looks for configuration in this order (first match wins):

#### 1. Command Line Argument (Highest Priority)

```bash
npm start -- --config /path/to/my-config.json
```

Or specify a directory (will look for `config.json` inside):

```bash
npm start -- --config /path/to/config-directory
```

#### 2. Environment Variables

**Just file name:**
```bash
export FLEX_CHAT_CONFIG_FILE=my-config.json
npm start
```

Or (alternative):
```bash
export FLEX_CHAT_CONFIG_FILE_PATH=/path/to/my-config.json
npm start
```

**Directory containing config.json:**
```bash
export FLEX_CHAT_CONFIG_DIR=/path/to/config-directory
npm start
```

#### 3. Default Location

If no config path is specified, defaults to:
```
./config/config.json
```
(Relative to current working directory)

### Best Practices

- **Development**: Use default location (`./config/config.json`)
- **Production**: Use environment variables
- **Multiple configs**: Use CLI argument for testing different configurations
- **Docker/Kubernetes**: Mount config as volume, set env var to path

---

## Configuration Structure

A Flex Chat configuration file has **5 main sections**:

```json
{
  "llms": { ... },          // AI/LLM providers (OpenAI, Ollama, etc.)
  "rag_services": { ... },  // RAG/vector database services
  "embedding": { ... },     // Default embedding configuration
  "intent": { ... },        // Intent detection settings
  "responses": [ ... ]      // Response handlers (matching & generation rules)
}
```

**Note**: `responses` may be renamed to `response_handlers` in a future version.

---

## LLMs Section

Define AI/LLM providers available for chat, reasoning, and intent detection.

### Structure

```json
{
  "llms": {
    "llm_reference_name": {
      "provider": "provider_type",
      "base_url": "http://...",
      "api_key": "${ENV_VAR}"
    }
  }
}
```

### Supported Providers

- **`ollama`**: Local Ollama models
- **`openai`**: OpenAI API (GPT models)
- **`gemini`**: Google Gemini (not yet implemented)

### Example: Multiple LLM Providers

```json
{
  "llms": {
    "local": {
      "provider": "ollama",
      "base_url": "http://localhost:11434"
    },
    "chatgpt": {
      "provider": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1"
    },
    "azure": {
      "provider": "openai",
      "api_key": "${AZURE_OPENAI_KEY}",
      "base_url": "https://your-resource.openai.azure.com/"
    }
  }
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `provider` | Yes | Provider type: `ollama`, `openai` |
| `base_url` | Yes | API endpoint URL |
| `api_key` | Conditional | Required for OpenAI, not needed for Ollama |

### Environment Variable Substitution

Use `${ENV_VAR}` syntax for sensitive values:

```json
{
  "api_key": "${OPENAI_API_KEY}"
}
```

The `OPENAI_API_KEY` environment variable will be substituted at runtime.

### Usage

LLM providers are referenced by name in:
- **Response handlers**: `"llm": "local"`
- **Intent detection**: `"intent.provider.llm": "chatgpt"`
- **Embeddings**: `"embedding.llm": "local"`

---

## RAG Services Section

Define RAG/vector database services for knowledge retrieval.

### Structure

```json
{
  "rag_services": {
    "service_name": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25,
      "partial_threshold": 0.5,
      "embedding": {
        "llm": "local",
        "model": "nomic-embed-text"
      }
    }
  }
}
```

### Supported Providers

- **`chromadb-wrapper`**: ChromaDB via Python FastAPI wrapper (recommended)
- **`chromadb`**: Direct ChromaDB connection (not yet implemented)

### Example: Multiple RAG Services

```json
{
  "rag_services": {
    "recipes": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5007",
      "match_threshold": 0.2,
      "partial_threshold": 0.5,
      "embedding": {
        "llm": "chatgpt",
        "model": "text-embedding-ada-002"
      }
    },
    "tech_docs": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25,
      "partial_threshold": 0.45,
      "intent_identifier": "technical_support"
      // Uses default embedding (from root "embedding" section)
    }
  }
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `provider` | Yes | Provider type: `chromadb-wrapper` |
| `url` | Yes | RAG service endpoint |
| `match_threshold` | No | Distance threshold for confident match (default: 0.25) |
| `partial_threshold` | No | Distance threshold for partial match (default: 0.5) |
| `embedding` | No | Service-specific embedding config (overrides default) |
| `intent_identifier` | No | Intent name when match found (defaults to service name) |

### Thresholds Explained

When a RAG query is performed, the distance between the query and documents is calculated:

- **`distance < match_threshold`**: **MATCH** - High confidence, use immediately
- **`match_threshold ≤ distance < partial_threshold`**: **PARTIAL** - Candidate result, perform intent detection
- **`distance ≥ partial_threshold`**: **NONE** - Not relevant

**Lower threshold = stricter matching**

Typical values:
- `match_threshold`: 0.15 - 0.3 (strict to moderate)
- `partial_threshold`: 0.4 - 0.6 (moderate to loose)

### Per-Service vs Default Embedding

You can specify embeddings:
1. **Per-service** (in `rag_services.<name>.embedding`)
2. **Default** (in root `embedding` section)

If a service doesn't specify embeddings, it uses the default.

---

## Embedding Section

Default embedding configuration for RAG services.

### Structure

```json
{
  "embedding": {
    "llm": "local",
    "model": "nomic-embed-text"
  }
}
```

### Example: Using OpenAI Embeddings

```json
{
  "embedding": {
    "llm": "chatgpt",
    "model": "text-embedding-ada-002"
  }
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `llm` | Yes | LLM provider name (must exist in `llms` section) |
| `model` | Yes | Embedding model name |

### Common Embedding Models

**Ollama (local):**
- `nomic-embed-text` - Good quality, fast
- `mxbai-embed-large` - Higher quality, slower

**OpenAI:**
- `text-embedding-ada-002` - Standard, cost-effective
- `text-embedding-3-small` - Newer, efficient
- `text-embedding-3-large` - Highest quality

**Important**: The embedding model must match what was used when documents were added to collections.

---

## Intent Section

Configure intent detection for non-RAG or partial-match scenarios.

### Structure

```json
{
  "intent": {
    "provider": {
      "llm": "local",
      "model": "qwen2.5:3b-instruct"
    },
    "detection": {
      "intent_name": "Description for LLM to classify this intent"
    }
  }
}
```

### Example: Multiple Intents

```json
{
  "intent": {
    "provider": {
      "llm": "local",
      "model": "llama3.2:3b"
    },
    "detection": {
      "support": "Request about Red Hat products, RHEL, Linux, or command line tools",
      "subscriptions": "Questions about Red Hat subscriptions, RHSM, or subscription manager",
      "general": "General conversation, greetings, or off-topic questions"
    }
  }
}
```

### When Intent Detection Runs

Intent detection is **only performed when**:
- RAG result is **NONE** (no relevant documents found)
- RAG result is **PARTIAL** (candidate documents, but need classification)

Intent detection is **skipped when**:
- RAG result is **MATCH** (confident match found)

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `provider.llm` | Yes | LLM provider name for intent detection |
| `provider.model` | Yes | Model to use for intent detection |
| `detection` | Yes | Map of intent names to descriptions |

### Intent Descriptions

Write clear descriptions that help the LLM classify user queries:

✅ **Good:**
```json
"recipe": "User is asking for cooking instructions, recipes, or food preparation steps"
```

❌ **Too vague:**
```json
"recipe": "cooking"
```

### Usage in Response Handlers

Detected intents are matched in response handlers:

```json
{
  "match": {
    "intent": "support",
    "rag_results": "partial"
  },
  ...
}
```

---

## Responses Section

**Response handlers** define how to match user queries and generate responses.

**Note**: This section may be renamed to `response_handlers` in a future version.

### Structure

```json
{
  "responses": [
    {
      "match": { ... },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "max_tokens": 500,
      "prompt": "System prompt with {{variables}}"
    }
  ]
}
```

### Execution Order

Response handlers are evaluated **sequentially, first-match wins**:

1. First handler where all `match` criteria are met is selected
2. Order matters! Put specific rules first, general rules last
3. Last handler typically has no `match` (catch-all)

### Match Criteria

Available match fields (all are optional, but at least one makes sense):

| Field | Type | Description |
|-------|------|-------------|
| `service` | string | RAG service name |
| `collection` | string | Exact collection name |
| `collection_contains` | string | Collection name contains this substring |
| `intent` | string | Detected intent name |
| `intent_regexp` | string | Intent matches regex (e.g., `"/(recipe|cooking)/"`) |
| `rag_results` | string | RAG result type: `"match"`, `"partial"`, `"none"`, `"any"` |
| `reasoning` | boolean | Whether reasoning is required (can be detected or user specified) |

### Example: Basic Response Handlers

```json
{
  "responses": [
    {
      "match": {
        "service": "recipes",
        "rag_results": "match"
      },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "max_tokens": 800,
      "prompt": "You are a cooking expert. Use this recipe context:\n\n{{rag_context}}"
    },
    {
      "match": {
        "intent": "general"
      },
      "llm": "local",
      "model": "qwen2.5:3b-instruct",
      "max_tokens": 200,
      "prompt": "You are a friendly assistant. Keep responses brief."
    },
    {
      "llm": "local",
      "model": "qwen2.5:3b-instruct",
      "max_tokens": 100,
      "prompt": "Politely indicate the query is off-topic. Keep it very short."
    }
  ]
}
```

### Example: With Reasoning

```json
{
  "responses": [
    {
      "match": {
        "service": "recipes",
        "intent_regexp": "/(cooking|recipe)/",
        "reasoning": true
      },
      "reasoning": {
        "model": "deepseek-r1:14b",
        "prompt": "Think through the cooking process step-by-step.\n\n{{rag_context}}"
      },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "max_tokens": 500,
      "prompt": "Based on this analysis:\n\n{{reasoning}}\n\nProvide a clear recipe."
    }
  ]
}
```

### Template Variables

Available variables in prompts:

| Variable | Description |
|----------|-------------|
| `{{rag_context}}` | Formatted RAG documents (if any) |
| `{{reasoning}}` | Reasoning stage output (if reasoning enabled) |
| `{{topic}}` | Current conversation topic |
| `{{intent}}` | Detected intent |
| `{{service.prompt}}` | Service-level prompt (if configured) |

### Prompt Best Practices

**Clear role definition:**
```json
"prompt": "You are a Red Hat support engineer..."
```

**Include context when available:**
```json
"prompt": "...Use this context:\n\n{{rag_context}}\n\nAnswer the user's question."
```

**Behavior guidance:**
```json
"prompt": "...Keep responses concise. If you don't know, say so."
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `match` | No | Matching criteria (omit for catch-all) |
| `llm` | Yes | LLM provider name |
| `model` | Yes | Model to use for response |
| `max_tokens` | No | Maximum tokens in response (default varies by provider) |
| `prompt` | Yes | System prompt (can use template variables) |
| `reasoning` | No | Reasoning configuration (enables two-stage generation) |

---

## Complete Example

Here's a complete, realistic configuration:

```json
{
  "llms": {
    "local": {
      "provider": "ollama",
      "base_url": "http://localhost:11434"
    },
    "chatgpt": {
      "provider": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1"
    }
  },
  
  "rag_services": {
    "recipes": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5007",
      "match_threshold": 0.2,
      "partial_threshold": 0.5
    },
    "tech_docs": {
      "provider": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25,
      "partial_threshold": 0.45,
      "embedding": {
        "llm": "chatgpt",
        "model": "text-embedding-ada-002"
      }
    }
  },
  
  "embedding": {
    "llm": "local",
    "model": "nomic-embed-text"
  },
  
  "intent": {
    "provider": {
      "llm": "local",
      "model": "llama3.2:3b"
    },
    "detection": {
      "recipe": "User wants cooking instructions or recipes",
      "technical": "Questions about software, documentation, or troubleshooting",
      "general": "General conversation or greetings"
    }
  },
  
  "responses": [
    {
      "match": {
        "service": "recipes",
        "rag_results": "match"
      },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "max_tokens": 800,
      "prompt": "You are a cooking expert. Here's relevant recipe information:\n\n{{rag_context}}\n\nProvide clear, helpful cooking advice."
    },
    {
      "match": {
        "service": "tech_docs",
        "rag_results": "any"
      },
      "llm": "chatgpt",
      "model": "gpt-4o-mini",
      "max_tokens": 1000,
      "prompt": "You are a technical support specialist. Use this documentation:\n\n{{rag_context}}\n\nHelp the user solve their problem."
    },
    {
      "match": {
        "intent": "general"
      },
      "llm": "local",
      "model": "llama3.2:3b",
      "max_tokens": 200,
      "prompt": "You are a friendly chatbot. Keep responses brief and helpful."
    },
    {
      "llm": "local",
      "model": "llama3.2:3b",
      "max_tokens": 100,
      "prompt": "The query is off-topic. Politely decline and keep it very short."
    }
  ]
}
```

---

## Environment Variables

### Configuration Path Variables

- `FLEX_CHAT_CONFIG_FILE` - Full path to config file
- `FLEX_CHAT_CONFIG_FILE_PATH` - Alternative to above
- `FLEX_CHAT_CONFIG_DIR` - Directory containing config.json

### Provider API Keys (N.B. You can specify your own)

- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key (when implemented)
- `AZURE_OPENAI_KEY` - Azure OpenAI key (if using Azure)

### RAG Service

- `EMBEDDING_PROVIDER` - Python RAG wrapper embedding provider
- `EMBEDDING_MODEL` - Python RAG wrapper embedding model
- `OLLAMA_BASE_URL` - Ollama endpoint (if not default)

### Setting Environment Variables

**Linux/Mac:**
```bash
export OPENAI_API_KEY="sk-..."
export FLEX_CHAT_CONFIG_FILE="/path/to/config.json"
npm start
```

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-..."
$env:FLEX_CHAT_CONFIG_FILE="C:\path\to\config.json"
npm start
```

**Docker:**
```bash
docker run -e OPENAI_API_KEY="sk-..." -e FLEX_CHAT_CONFIG_FILE="/config/prod.json" ...
```

**`.env` file** (development):
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
```

---

## Configuration Examples

See the `config/examples/` directory for complete configuration examples:

- **`01-chat-only.json`**: Simple chat without RAG
- **`02-single-rag-dynamic.json`**: Single RAG service, dynamic collections
- **`03-single-rag-pinned.json`**: Single RAG service, pinned collection
- **`04-multi-rag-multi-llm.json`**: Multiple RAG services and LLMs

---

## Tips & Best Practices

### Organizing Configurations

- **Development**: `config/config.json` (default)
- **Production**: Separate config file with env vars
- **Testing**: Multiple config files, switch with `--config`
- **Staging**: Use environment variables for secrets

### Security

- ✅ **Do**: Use environment variables for API keys
- ✅ **Do**: Add `*.env` to `.gitignore`
- ❌ **Don't**: Commit API keys to version control
- ❌ **Don't**: Hardcode sensitive values in config files

### Performance

- Use local models (Ollama) for intent detection (fast, low latency)
- Use cloud models (OpenAI) for complex responses (higher quality)
- Adjust `max_tokens` based on use case (lower = faster/cheaper)
- Set appropriate thresholds (tighter = fewer false positives)

### Debugging

- Start with one RAG service, add more later
- Use simple intent descriptions initially
- Test response handlers with sample queries
- Check logs for matched handlers and profile data

---

## Troubleshooting

### "Configuration error: ..."

- **Cause**: Invalid JSON syntax or missing required fields
- **Fix**: Validate JSON syntax, check all required fields present

### "AI provider not found: X"

- **Cause**: LLM referenced in response handler doesn't exist in `llms`
- **Fix**: Check `llm` field matches a key in `llms` section

### "Service name is required"

- **Cause**: Collection operation missing `service` parameter
- **Fix**: Specify which RAG service when creating/managing collections

### "Failed to initialize RAG service"

- **Cause**: RAG service URL unreachable or wrong
- **Fix**: Verify Python RAG service is running on specified URL

### Embeddings don't match

- **Cause**: Documents embedded with different model than queries
- **Fix**: Use same embedding model for indexing and querying

---

## Related Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System architecture and flow
- **[REASONING_MODELS.md](REASONING_MODELS.md)**: Reasoning configuration
- **[COLLECTION_MANAGEMENT.md](COLLECTION_MANAGEMENT.md)**: Managing collections
- **[config/examples/](../config/examples/)**: Configuration examples

---

## Version History

- **v2.0** (2025-10-19): Simplified configuration structure
- **v1.x**: Strategy-based configuration (deprecated)
