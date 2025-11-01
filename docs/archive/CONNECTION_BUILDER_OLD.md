# Connection Builder Interface

**Status**: 📝 Documented (Not Yet Implemented)

---

## Overview

A UI-driven wizard for creating LLM and RAG service connections without ever asking users to paste API keys in the browser. The interface dynamically generates forms from provider schemas and outputs ready-to-use configuration snippets.

---

## Core Principles

### 🔐 Security First
- **NEVER** ask users to type API keys in the UI
- **ALWAYS** use environment variable references in generated configs
- Secrets stay in the environment, never in browser/localStorage/config files

### 🎯 User Experience
- Schema-driven: Forms generated automatically from provider definitions
- Guided wizard: Step-by-step connection setup
- Testable: Verify connections if env vars are already set
- Portable: Generated configs can be shared (no embedded secrets)

### 🔌 Provider-Agnostic
- Works with any LLM provider (OpenAI, Ollama, Anthropic, etc.)
- Works with any RAG service (ChromaDB, Milvus, Qdrant, etc.)
- Custom providers automatically supported if they implement the schema interface

---

## How It Works

### 1. Provider Schema Interface

Each provider implements a `getConnectionSchema()` method that returns its configuration requirements:

```javascript
// Example: OpenAI Provider Schema
{
  "provider": "openai",
  "display_name": "OpenAI",
  "description": "Connect to OpenAI's API for GPT models",
  "fields": [
    {
      "name": "base_url",
      "type": "url",
      "display_name": "API Base URL",
      "hint": "Usually https://api.openai.com/v1",
      "default": "https://api.openai.com/v1",
      "required": true
    },
    {
      "name": "api_key",
      "type": "secret",
      "display_name": "API Key",
      "hint": "Your OpenAI API key (set as environment variable)",
      "env_var_pattern": "FLEX_CHAT_OPENAI_*",
      "env_var_suggestion": "FLEX_CHAT_OPENAI_KEY",
      "required": true
    },
    {
      "name": "organization_id",
      "type": "secret",
      "display_name": "Organization ID",
      "hint": "Optional OpenAI organization ID",
      "env_var_pattern": "FLEX_CHAT_OPENAI_*",
      "env_var_suggestion": "FLEX_CHAT_OPENAI_ORG_ID",
      "required": false
    },
    {
      "name": "timeout",
      "type": "number",
      "display_name": "Request Timeout (ms)",
      "hint": "Maximum time to wait for API response",
      "default": 30000,
      "required": false
    }
  ],
  "capabilities": {
    "list_models": true,
    "test_connection": true
  }
}
```

```javascript
// Example: Ollama Provider Schema (no API key needed!)
{
  "provider": "ollama",
  "display_name": "Ollama (Local)",
  "description": "Connect to locally running Ollama instance",
  "fields": [
    {
      "name": "base_url",
      "type": "url",
      "display_name": "Ollama URL",
      "hint": "Usually http://localhost:11434",
      "default": "http://localhost:11434",
      "required": true
    }
  ],
  "capabilities": {
    "list_models": true,
    "test_connection": true
  }
}
```

---

### 2. Secure Secret Handling

**The Key Principle**: Environment variable references, not actual secrets.

#### User Flow

1. **UI suggests env var name**: `FLEX_CHAT_OPENAI_KEY`
2. **User can**:
   - Accept the suggestion
   - Choose from dropdown of existing `FLEX_CHAT_*` vars
   - Type custom env var name (excluding reserved `FLEX_CHAT_CONFIG*`)
3. **Generated config uses reference**: `"api_key": "${FLEX_CHAT_OPENAI_KEY}"`

#### Environment Variable Dropdown (Pattern-Filtered)

**Schema-defined patterns** ensure only relevant env vars appear for each provider:

```
OpenAI API Key: [FLEX_CHAT_OPENAI_KEY ▼]
Pattern: FLEX_CHAT_OPENAI_*

Dropdown shows (filtered by pattern):
  ✅ FLEX_CHAT_OPENAI_KEY (suggested, detected)
  ✅ FLEX_CHAT_OPENAI_PROD_KEY (detected)
  ✅ FLEX_CHAT_OPENAI_DEV_KEY (detected)
  ➕ Type custom name (must match pattern)
  
Hidden (doesn't match pattern):
  ❌ FLEX_CHAT_ANTHROPIC_KEY (wrong provider)
  ❌ FLEX_CHAT_OLLAMA_TOKEN (wrong provider)
  
Always excluded:
  ❌ FLEX_CHAT_CONFIG_FILE (reserved system var)
  ❌ FLEX_CHAT_CONFIG_DIR (reserved system var)
```

**Benefits:**
- **Organization**: Provider-specific namespacing (`OPENAI_*`, `ANTHROPIC_*`)
- **Discovery**: Set `FLEX_CHAT_OPENAI_PROD_KEY` → shows in OpenAI wizard automatically
- **Safety**: Can't accidentally use wrong provider's key
- **Multiple Secrets**: Provider can have multiple secret fields (key, org_id, etc.)
- **Validation**: User input validated against pattern

#### Pattern Validation

When user types custom env var name, validate against schema pattern:

```
User types: "FLEX_CHAT_ANTHROPIC_KEY"

UI validation:
  ⚠️ Must match pattern: FLEX_CHAT_OPENAI_*
  
  Suggestions:
    - FLEX_CHAT_OPENAI_KEY
    - FLEX_CHAT_OPENAI_API_KEY
    - FLEX_CHAT_OPENAI_TOKEN
```

```
User types: "MY_OPENAI_KEY"

UI validation:
  ⚠️ Must match pattern: FLEX_CHAT_OPENAI_*
  
  Did you mean?
    - FLEX_CHAT_OPENAI_KEY (recommended)
```

```
User types: "FLEX_CHAT_OPENAI_STAGING_KEY"

UI validation:
  ✅ Matches pattern FLEX_CHAT_OPENAI_*
  ⚠️ Not currently set in environment
  
  To use this key:
    export FLEX_CHAT_OPENAI_STAGING_KEY="sk-..."
```

---

### 3. Connection Testing

**If environment variable is set**: Backend can test the connection

```javascript
// Backend endpoint: POST /connections/test
{
  "provider": "openai",
  "base_url": "https://api.openai.com/v1",
  "api_key": "${FLEX_CHAT_OPENAI_KEY}"  // Backend resolves from process.env
}

// Response (success):
{
  "status": "success",
  "message": "Connection successful! Found 25 models.",
  "capabilities": {
    "models_available": 25,
    "response_time_ms": 342
  }
}

// Response (env var not set):
{
  "status": "pending",
  "message": "Environment variable FLEX_CHAT_OPENAI_KEY not found",
  "instructions": "Set this variable and restart the backend to test."
}

// Response (failure):
{
  "status": "error",
  "message": "Authentication failed (401)",
  "hint": "Check that FLEX_CHAT_OPENAI_KEY is set correctly"
}
```

---

### 4. Model Discovery & Selection

For providers that support `list_models`, users can query and select specific models to include in their config.

#### UI Flow

```
Step: Model Selection
  🔍 Querying OpenAI for available models...
  
  ✅ Found 25 models
  
  [ ] Select All
  [x] gpt-4o
  [x] gpt-4o-mini
  [x] gpt-3.5-turbo
  [ ] gpt-4-turbo
  [ ] text-embedding-3-large
  ... (25 total)
  
  Filter: [gpt-4] 🔍
  Categories: [Chat ▼] [Embedding] [Reasoning]
```

#### Generated Config (With Selected Models)

```json
{
  "llms": {
    "openai-prod": {
      "provider": "openai",
      "base_url": "https://api.openai.com/v1",
      "api_key": "${FLEX_CHAT_OPENAI_KEY}",
      "models": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-3.5-turbo"
      ]
    }
  }
}
```

**Benefit**: Saves a startup model query! If `models` array is present in config, we don't need to call the provider's `listModels()` at runtime.

---

### 5. Configuration Output

#### Option A: Config Snippet (Copy/Paste)

```json
// Add this to your config.json under "llms":
{
  "openai-prod": {
    "provider": "openai",
    "base_url": "https://api.openai.com/v1",
    "api_key": "${FLEX_CHAT_OPENAI_KEY}",
    "models": ["gpt-4o", "gpt-4o-mini"]
  }
}
```

**Instructions**:
```
✅ Step 1: Add the snippet above to config/config.json under "llms"
✅ Step 2: Set environment variable:
   export FLEX_CHAT_OPENAI_KEY="your-api-key-here"
✅ Step 3: Restart the backend server
✅ Step 4: Test connection in Configuration Viewer
```

#### Option B: Download Full Config (Merged)

Backend merges new connection into loaded config and returns complete file:

```javascript
// POST /connections/merge
{
  "type": "llm",
  "name": "openai-prod",
  "config": { /* connection config */ }
}

// Response: Complete merged config.json
{
  "llms": {
    "local": { /* existing */ },
    "openai-prod": { /* NEW */ }
  },
  "rag_services": { /* existing */ },
  "responses": [ /* existing */ ]
}
```

User downloads `config.json` → replaces their file → restarts backend.

---

### 6. Connection Name Auto-Suggestion

#### Smart Naming

```javascript
// Provider: openai
// Existing llms: { "openai-1": {...} }

Suggested name: "openai-2"  (detects clash, increments)

// Provider: ollama
// Existing llms: { "local": {...} }

Suggested name: "ollama-1"  (no clash)

// Provider: chromadb
// Existing rag_services: { "chroma-recipes": {...} }

Suggested name: "chroma-1"  (increments)
```

#### Clash Detection

```
User types: "local"
UI shows: ⚠️ Name "local" already exists in loaded config
          Please choose a different name
          
Suggestions:
  - local-2
  - local-backup
  - local-dev
```

---

## UI Wizard Flow

### Step 1: Choose Connection Type

```
┌─────────────────────────────────────┐
│  New Connection                     │
├─────────────────────────────────────┤
│                                     │
│  What would you like to connect?   │
│                                     │
│  ○ LLM Service (OpenAI, Ollama...)  │
│  ○ RAG Service (ChromaDB, Milvus...)│
│                                     │
│            [Next →]                 │
└─────────────────────────────────────┘
```

---

### Step 2: Choose Provider

```
┌─────────────────────────────────────┐
│  New LLM Connection                 │
├─────────────────────────────────────┤
│                                     │
│  Choose a provider:                 │
│                                     │
│  [OpenAI]      Commercial API       │
│  [Ollama]      Local models         │
│  [Anthropic]   Claude API           │
│  [Custom]      Custom endpoint      │
│                                     │
│  [← Back]           [Next →]        │
└─────────────────────────────────────┘
```

---

### Step 3: Configure Connection

Form generated dynamically from provider schema:

```
┌─────────────────────────────────────┐
│  Configure OpenAI Connection        │
├─────────────────────────────────────┤
│                                     │
│  Connection Name: *                 │
│  [openai-2___________] ✅           │
│  Auto-suggested (no clash detected) │
│                                     │
│  API Base URL: *                    │
│  [https://api.openai.com/v1______]  │
│  Usually https://api.openai.com/v1  │
│                                     │
│  API Key (Environment Variable): *  │
│  [FLEX_CHAT_OPENAI_KEY ▼]          │
│  ⚠️ Not set in environment          │
│                                     │
│  Request Timeout (ms):              │
│  [30000______]                      │
│  Maximum time to wait for response  │
│                                     │
│  [Test Connection] (disabled)       │
│  ℹ️ Set env var to enable testing   │
│                                     │
│  [← Back]           [Next →]        │
└─────────────────────────────────────┘
```

---

### Step 4: Model Selection (Optional)

If provider supports `list_models` and connection test succeeded:

```
┌─────────────────────────────────────┐
│  Select Models (Optional)           │
├─────────────────────────────────────┤
│                                     │
│  🔍 Querying OpenAI API...          │
│  ✅ Found 25 models                  │
│                                     │
│  [ ] Select All (25)                │
│  [Filter: gpt-4___] 🔍              │
│                                     │
│  [x] gpt-4o                         │
│  [x] gpt-4o-mini                    │
│  [x] gpt-3.5-turbo                  │
│  [ ] gpt-4-turbo                    │
│  [ ] text-embedding-3-large         │
│  ... (20 more)                      │
│                                     │
│  ℹ️ Saves model query at startup    │
│  ℹ️ Leave empty to query at runtime │
│                                     │
│  [← Back]      [Skip] [Next →]      │
└─────────────────────────────────────┘
```

If connection test failed or env var not set:

```
┌─────────────────────────────────────┐
│  Model Selection Unavailable        │
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Cannot query models              │
│                                     │
│  Reason:                            │
│  Environment variable               │
│  FLEX_CHAT_OPENAI_KEY not set       │
│                                     │
│  You can set this later and use     │
│  "Reconfigure Connection" to list   │
│  and select models.                 │
│                                     │
│  [← Back]           [Next →]        │
└─────────────────────────────────────┘
```

---

### Step 5: Review & Export

```
┌─────────────────────────────────────┐
│  Connection Ready!                  │
├─────────────────────────────────────┤
│                                     │
│  ✅ openai-prod configured           │
│  ✅ 3 models selected                │
│                                     │
│  📋 Config Snippet:                 │
│  ┌─────────────────────────────┐   │
│  │ {                           │   │
│  │   "openai-prod": {          │   │
│  │     "provider": "openai",   │   │
│  │     "base_url": "...",      │   │
│  │     "api_key": "${FLEX_...}",│  │
│  │     "models": [...]         │   │
│  │   }                         │   │
│  │ }                           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Copy Snippet] [Download Config]  │
│                                     │
│  📝 Setup Instructions:             │
│  1. Add to config/config.json       │
│  2. export FLEX_CHAT_OPENAI_KEY="..."│
│  3. Restart backend                 │
│  4. Test in Configuration Viewer    │
│                                     │
│  [← Back]    [Done]                 │
└─────────────────────────────────────┘
```

---

## Reconfigure / Refresh Connection

**Enhancement**: Update existing connections

```
User clicks "Reconfigure" on existing "openai-prod" connection

→ Loads current config
→ Pre-fills form with existing values
→ User can:
  - Change settings (base_url, timeout, etc.)
  - Refresh model list (query API again)
  - Add/remove selected models
  - Test connection with current env var

→ Generates updated config snippet
→ Download merged config or copy snippet
```

**Use Cases**:
- OpenAI released new models → refresh list
- Changed API endpoint → update base_url
- Want to add more models → re-query and select
- Troubleshooting → test connection with current env vars

---

## Backend API Endpoints

### Get Provider Schemas

```
GET /connections/providers?type=llm

Response:
{
  "providers": [
    {
      "provider": "openai",
      "display_name": "OpenAI",
      "description": "Connect to OpenAI's API",
      "fields": [...]
    },
    {
      "provider": "ollama",
      "display_name": "Ollama (Local)",
      "description": "Local Ollama instance",
      "fields": [...]
    }
  ]
}
```

---

### Test Connection

```
POST /connections/test

Body:
{
  "provider": "openai",
  "config": {
    "base_url": "https://api.openai.com/v1",
    "api_key": "${FLEX_CHAT_OPENAI_KEY}"
  }
}

Response (success):
{
  "status": "success",
  "message": "Connection successful!",
  "capabilities": {
    "models_available": 25,
    "response_time_ms": 342
  }
}

Response (env var missing):
{
  "status": "pending",
  "message": "Environment variable FLEX_CHAT_OPENAI_KEY not found",
  "instructions": "Set this variable and restart the backend"
}
```

---

### List Models

```
POST /connections/models

Body:
{
  "provider": "openai",
  "config": {
    "base_url": "https://api.openai.com/v1",
    "api_key": "${FLEX_CHAT_OPENAI_KEY}"
  }
}

Response:
{
  "status": "success",
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4 Optimized",
      "category": "chat"
    },
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4 Optimized Mini",
      "category": "chat"
    },
    ...
  ]
}
```

---

### Get Available Environment Variables (Pattern-Filtered)

```
GET /connections/env-vars?pattern=FLEX_CHAT_OPENAI_*

Response:
{
  "pattern": "FLEX_CHAT_OPENAI_*",
  "matched": [
    "FLEX_CHAT_OPENAI_KEY",
    "FLEX_CHAT_OPENAI_PROD_KEY",
    "FLEX_CHAT_OPENAI_DEV_KEY"
  ],
  "reserved": [
    "FLEX_CHAT_CONFIG_FILE",
    "FLEX_CHAT_CONFIG_DIR"
  ]
}
```

**Without pattern (all FLEX_CHAT_*):**
```
GET /connections/env-vars

Response:
{
  "available": [
    "FLEX_CHAT_OPENAI_KEY",
    "FLEX_CHAT_OPENAI_PROD_KEY",
    "FLEX_CHAT_ANTHROPIC_KEY",
    "FLEX_CHAT_OLLAMA_TOKEN"
  ],
  "reserved": [
    "FLEX_CHAT_CONFIG_FILE",
    "FLEX_CHAT_CONFIG_DIR"
  ]
}
```

---

### Validate Connection Name

```
POST /connections/validate-name

Body:
{
  "type": "llm",
  "name": "local"
}

Response (clash):
{
  "valid": false,
  "message": "Name 'local' already exists in llms",
  "suggestions": ["local-2", "local-backup", "local-dev"]
}

Response (ok):
{
  "valid": true,
  "message": "Name available"
}
```

---

### Merge Connection into Config

```
POST /connections/merge

Body:
{
  "type": "llm",
  "name": "openai-prod",
  "config": {
    "provider": "openai",
    "base_url": "https://api.openai.com/v1",
    "api_key": "${FLEX_CHAT_OPENAI_KEY}",
    "models": ["gpt-4o", "gpt-4o-mini"]
  }
}

Response:
{
  "merged_config": { /* full config.json with new connection */ },
  "snippet": { /* just the new connection */ },
  "instructions": "1. Add to config/config.json...",
  "env_vars": ["FLEX_CHAT_OPENAI_KEY"]
}
```

---

## Security Considerations

### ✅ Safe

- Environment variable references in config: `"${FLEX_CHAT_OPENAI_KEY}"`
- Testing connections with env vars already set on backend
- Listing available `FLEX_CHAT_*` env vars (no values exposed)
- Downloading config files (only references, no actual secrets)

### ⚠️ Risks & Mitigations

**Risk**: User accidentally types secret in browser form
**Mitigation**: 
- Never provide text input for secrets (only env var dropdowns)
- Clear UI messaging: "Use environment variables, not actual keys"
- Form validation: Reject if field looks like actual secret

**Risk**: User sets env var with actual key in name (e.g., `FLEX_CHAT_KEY_sk123abc`)
**Mitigation**: 
- Warn if env var name contains suspicious patterns
- Documentation: Best practices for env var naming

**Risk**: Exposing backend env vars list
**Mitigation**: 
- Only expose `FLEX_CHAT_*` prefixed vars (by name, not value)
- Never expose reserved system vars
- No values ever sent to frontend

---

## Benefits

### 🎯 For Users

1. **No Manual JSON Editing**: Guided wizard vs. error-prone text editing
2. **Provider Discovery**: See what's available and what fields they need
3. **Connection Testing**: Verify it works before adding to config
4. **Model Discovery**: See available models, select what you need
5. **Secure**: API keys stay in environment, never in browser
6. **Portable**: Share configs with team (they set their own env vars)

### 🚀 For Development

1. **Onboarding**: New users set up connections without reading docs
2. **Experimentation**: Quick setup for testing new providers
3. **Troubleshooting**: Test connections to diagnose issues
4. **Multi-Environment**: Easily create dev/staging/prod configs

### 🔌 For Ecosystem

1. **Provider-Agnostic**: New providers "just work" (implement schema interface)
2. **Extensible**: Custom providers supported automatically
3. **Standardized**: Consistent setup experience across all providers

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Provider schema interface (`getConnectionSchema()` method)
- [ ] Backend endpoints: `/connections/providers`, `/connections/test`
- [ ] Simple form generation from schema
- [ ] Config snippet output
- [ ] Basic validation

### Phase 2: Enhanced UX
- [ ] Model discovery and selection
- [ ] Environment variable dropdown
- [ ] Connection name clash detection
- [ ] Full config merge and download
- [ ] Setup instructions generation

### Phase 3: Advanced Features
- [ ] Reconfigure/refresh existing connections
- [ ] Connection health monitoring
- [ ] Model list caching (skip query if models in config)
- [ ] Batch connection setup (import multiple)
- [ ] Connection templates (common setups)

---

## Example: RAG Service Connection

RAG services follow the same pattern:

```javascript
// ChromaDB Wrapper Schema
{
  "provider": "chromadb",
  "display_name": "ChromaDB (Python Wrapper)",
  "description": "Connect to ChromaDB vector database",
  "fields": [
    {
      "name": "base_url",
      "type": "url",
      "display_name": "ChromaDB URL",
      "hint": "Usually http://localhost:5006",
      "default": "http://localhost:5006",
      "required": true
    },
    {
      "name": "timeout",
      "type": "number",
      "display_name": "Query Timeout (ms)",
      "default": 10000,
      "required": false
    }
  ],
  "capabilities": {
    "list_collections": true,
    "test_connection": true
  }
}
```

Model selection becomes **collection selection**:

```
Step: Collection Selection
  🔍 Querying ChromaDB for collections...
  
  ✅ Found 3 collections
  
  [x] recipes
  [x] red_hat_products  
  [ ] archived_docs
```

Generated config includes selected collections (optional optimization):

```json
{
  "rag_services": {
    "chroma-local": {
      "provider": "chromadb",
      "base_url": "http://localhost:5006",
      "collections": ["recipes", "red_hat_products"]
    }
  }
}
```

---

## Future Enhancements

### 🔮 Smart Defaults
- Detect Ollama running on localhost → auto-suggest connection
- Detect ChromaDB on port 5006 → auto-suggest connection
- Import from `.env` file → auto-populate env var names

### 🧪 Testing Suite
- "Test All Connections" - verify all configured services
- Connection health dashboard
- Latency monitoring

### 🎨 Visual Config Builder
- Drag-and-drop response handler creation
- Visual connection graph (which LLMs connect to which handlers)
- Config diff viewer (compare presets)

---

## Related Features

This feature integrates with:
- **Configuration Viewer UI** (Phase 1): Display connections, test them
- **Configuration Presets** (Phase 3): Save connection setups as presets
- **UI-Driven Configuration** (Long-term): Build entire config from scratch

---

## Questions & Design Decisions

### Q: What if provider doesn't implement `getConnectionSchema()`?
**A**: Fall back to generic form (base_url, timeout). Provider must implement this for full experience.

### Q: What about OAuth providers?
**A**: Future enhancement. For now, OAuth tokens handled as env vars like API keys.

### Q: Can users edit generated config before saving?
**A**: Yes! Download merged config → edit manually → use that file. Connection Builder is a starting point.

### Q: What about secrets managers (Vault, AWS Secrets)?
**A**: Future integration. For now, env vars are the baseline. Could extend to support secret references.

---

## Conclusion

The Connection Builder Interface transforms configuration from error-prone manual JSON editing to a secure, guided, testable experience. By keeping secrets in the environment and using provider schemas to drive the UI, we achieve both security and flexibility.

**Key Insight**: The schema-driven approach means new providers automatically get a great setup experience without additional UI code. Implement the schema interface → Connection Builder "just works".

---

**Status**: Ready for implementation after Configuration Viewer UI (Phase 1) is complete. The two features complement each other: Viewer shows what you have, Builder creates what you need.

