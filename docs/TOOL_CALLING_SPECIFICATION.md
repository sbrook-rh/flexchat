# Tool Calling Implementation Specification

**Status**: Draft Specification
**Version**: 1.0
**Created**: 2025-02-09
**Purpose**: Detailed technical specification for implementing function/tool calling in Flex Chat

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Configuration Schema](#configuration-schema)
4. [Tool Registry & Execution](#tool-registry--execution)
5. [Response Generation Integration](#response-generation-integration)
6. [Provider Implementations](#provider-implementations)
7. [Testing Interface](#testing-interface)
8. [Model Validation Tracking](#model-validation-tracking)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Version Scope

### v1 (This Specification)

**Included**:
- ✅ Multi-provider support (OpenAI, Ollama, Gemini)
- ✅ Tool types: Mock, Builtin, Internal
- ✅ Configuration-driven tool definitions
- ✅ Testing interface with model validation tracking
- ✅ Tool execution loop (Phase 6b)
- ✅ Error handling and iteration limits
- ✅ Built-in tools: calculator, echo, RAG search

**Deferred to v2** (documented for future):
- ⏭️ HTTP tools (external API calls)
- ⏭️ MCP (Model Context Protocol) integration
- ⏭️ Advanced tool composition
- ⏭️ Tool versioning

---

## Overview

### Goals

1. **Multi-Provider Support**: OpenAI, Ollama, Gemini (day 1)
2. **Configuration-Driven**: Tools defined in config, no code changes needed
3. **Testing Interface**: Visual tool to test model tool-calling capabilities
4. **Model Validation**: Track which models successfully use tools
5. **Production-Ready**: Error handling, iteration limits, observability

### Strategic Context

From the Enterprise AI Capability Framework, this implementation enables:

- **Level 1: Natural Language Interfaces** - Tools bridge natural language to system actions
- **Level 2: Intelligent Workflow Orchestration** - Tools enable semantic routing and action
- **Foundation for AI-Ops** - Tools are prerequisites for autonomous operations

### Non-Goals (Deferred to Future)

- **HTTP Tools (external API calls)** - v2 (documented below for future implementation)
- MCP (Model Context Protocol) integration - Phase 2
- Agent-to-agent tool sharing - Phase 3
- Tool versioning and migration - Phase 3
- Complex tool composition/chaining - Phase 3

---

## Architecture Design

### High-Level Flow

```
User Message
    ↓
[Phases 1-5: Topic, RAG, Intent, Profile, Matching]
    ↓
Phase 6: Response Generation
    ↓
┌─────────────────────────────────────────┐
│  Response Generator (Extended)          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 1. Build initial messages       │   │
│  │ 2. Add tools from config        │   │
│  │ 3. Call LLM with tools          │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │ Check finish_reason:            │   │
│  │ - 'stop' → return response      │   │
│  │ - 'tool_calls' → execute tools  │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │ Phase 6b: Tool Execution Loop   │   │
│  │                                 │   │
│  │ For each tool call:             │   │
│  │   1. Validate tool exists       │   │
│  │   2. Parse parameters           │   │
│  │   3. Execute via registry       │   │
│  │   4. Add to messages:           │   │
│  │      - Assistant (tool_calls)   │   │
│  │      - Tool (result)            │   │
│  │   5. Call LLM again             │   │
│  │                                 │   │
│  │ Repeat until:                   │   │
│  │   - finish_reason = 'stop'      │   │
│  │   - max_iterations reached      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
    ↓
Final Response to User
```

### Key Components

#### 1. Tool Registry (`backend/chat/tools/registry.js`)

**Responsibility**: Central registry for all available tools

```javascript
class ToolRegistry {
  constructor()
  register(tool: ToolDefinition): void
  get(name: string): ToolDefinition | undefined
  execute(name: string, params: object): Promise<any>
  list(): ToolDefinition[]
  toProviderFormat(provider: string): ProviderToolSchema[]
}
```

#### 2. Tool Executor (`backend/chat/tools/executor.js`)

**Responsibility**: Execute individual tools with error handling

```javascript
class ToolExecutor {
  async execute(tool: ToolDefinition, params: object): Promise<ToolResult>
  validate(tool: ToolDefinition, params: object): ValidationResult
}
```

#### 3. Tool Manager (`backend/chat/tools/manager.js`)

**Responsibility**: Load tools from config, coordinate registry and executor

```javascript
class ToolManager {
  constructor(config: ToolsConfig)
  loadTools(): void
  getRegistry(): ToolRegistry
  getExecutor(): ToolExecutor
}
```

#### 4. Response Generator Extensions (`backend/chat/lib/response-generator.js`)

**New capabilities**:
- Tool calling loop (Phase 6b)
- Message building with tool calls/results
- Iteration limit enforcement
- Tool call tracking/logging

---

## Configuration Schema

### Global Tools Definition

```json
{
  "tools": {
    "enabled": true,
    "max_iterations": 5,
    "default_timeout_ms": 30000,
    "registry": [
      {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "type": "function",
        "handler": "weather",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or coordinates"
            },
            "units": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"],
              "default": "celsius"
            }
          },
          "required": ["location"]
        },
        "implementation": {
          "type": "mock",
          "mock_response": {
            "temperature": 22,
            "condition": "sunny",
            "humidity": 65
          }
        }
      },
      {
        "name": "calculate",
        "description": "Evaluate a mathematical expression",
        "type": "function",
        "handler": "calculator",
        "parameters": {
          "type": "object",
          "properties": {
            "expression": {
              "type": "string",
              "description": "Math expression to evaluate, e.g., '2+2' or 'sqrt(16)'"
            }
          },
          "required": ["expression"]
        },
        "implementation": {
          "type": "builtin",
          "handler": "math_eval"
        }
      },
      {
        "name": "search_documents",
        "description": "Search RAG collections for information",
        "type": "function",
        "handler": "rag_search",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query"
            },
            "collection": {
              "type": "string",
              "description": "Optional collection name to search"
            },
            "max_results": {
              "type": "integer",
              "default": 5
            }
          },
          "required": ["query"]
        },
        "implementation": {
          "type": "internal",
          "handler": "rag_query"
        }
      }
    ]
  }
}
```

### Per-Response Handler Tool Configuration

```json
{
  "responses": [
    {
      "match": {
        "intent_regexp": "/(weather|forecast)/"
      },
      "llm": "openai",
      "model": "gpt-4o",
      "prompt": "You are a helpful weather assistant.\n\nUser: {{user_message}}",
      "tools": {
        "enabled": true,
        "allowed_tools": ["get_weather", "calculate"],
        "max_iterations": 3
      }
    },
    {
      "match": {
        "service": "technical_docs"
      },
      "llm": "ollama",
      "model": "llama3.2:3b",
      "prompt": "Answer based on documentation.\n\n{{rag_context}}\n\nUser: {{user_message}}",
      "tools": {
        "enabled": true,
        "allowed_tools": ["search_documents"],
        "max_iterations": 2
      }
    }
  ]
}
```

### Tool Implementation Types (v1)

| Type | Use Case | Example | Implementation | v1 Support |
|------|----------|---------|----------------|------------|
| **mock** | Testing, prototyping | Fake weather data | Returns static JSON | ✅ Yes |
| **builtin** | Native functionality | Calculator, string utils | JavaScript function | ✅ Yes |
| **internal** | Flex Chat services | RAG search, DB query | Calls existing service | ✅ Yes |
| **http** | External APIs | Real weather, CRM | HTTP request to API | ⏭️ v2 |

**Quick Example**:

```javascript
// Mock tool (v1) - for testing
{
  "name": "get_weather",
  "implementation": {
    "type": "mock",
    "mock_response": { "temperature": 22 }
  }
}

// Builtin tool (v1) - native code
{
  "name": "calculate",
  "implementation": {
    "type": "builtin",
    "handler": "math_eval"  // JavaScript function
  }
}

// Internal tool (v1) - your services
{
  "name": "search_docs",
  "implementation": {
    "type": "internal",
    "handler": "rag_query"  // Calls your RAG service
  }
}

// HTTP tool (v2) - deferred but documented
{
  "name": "get_weather",
  "implementation": {
    "type": "http",
    "url": "https://api.weather.com/...",
    "method": "GET"
  }
}
```

### Tool Definition Schema

```typescript
interface ToolDefinition {
  name: string;                    // Unique tool identifier
  description: string;             // What the tool does (for LLM)
  type: 'function';                // Standard OpenAI type
  handler: string;                 // Handler identifier
  parameters: JSONSchema;          // OpenAPI-style parameter schema
  implementation: ToolImplementation;
}

interface ToolImplementation {
  type: 'mock' | 'builtin' | 'internal' | 'http';  // v1: mock, builtin, internal; v2: http

  // For mock tools (testing)
  mock_response?: any;

  // For builtin handlers (implemented in code)
  handler?: string;

  // For internal tools (RAG, etc.)
  service?: string;

  // For HTTP tools (v2 - deferred but documented)
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  params_mapping?: Record<string, string>;
  response_path?: string;  // JSONPath to extract result from response
}

interface ToolsConfig {
  enabled: boolean;
  max_iterations: number;          // System-wide max (default: 5)
  default_timeout_ms: number;      // Per-tool timeout (default: 30000)
  registry: ToolDefinition[];
}

interface ResponseHandlerToolConfig {
  enabled: boolean;
  allowed_tools: string[];         // Tool names allowed for this handler
  max_iterations?: number;         // Override system max
}
```

---

## Tool Registry & Execution

### Answer to Key Question: "How do we implement tool calling?"

**The tool execution flow:**

```
LLM returns tool_calls → Registry lookup → Executor runs → Result added to messages → LLM continues
```

### Tool Registry Implementation

**File**: `backend/chat/tools/registry.js`

```javascript
/**
 * Central registry for all available tools
 * Loaded from configuration at startup
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map(); // name -> ToolDefinition
  }

  /**
   * Register a tool definition
   */
  register(tool) {
    if (!tool.name || !tool.description) {
      throw new Error('Tool must have name and description');
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }

    // Validate parameters schema
    this._validateParametersSchema(tool.parameters);

    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Get tool definition by name
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Check if tool exists
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * List all registered tools
   */
  list() {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools in provider-specific format
   * @param {string} provider - 'openai', 'ollama', 'gemini'
   * @param {string[]} allowedTools - Optional filter for allowed tool names
   */
  toProviderFormat(provider, allowedTools = null) {
    let tools = this.list();

    // Filter to allowed tools if specified
    if (allowedTools && allowedTools.length > 0) {
      tools = tools.filter(t => allowedTools.includes(t.name));
    }

    // Convert to provider format
    switch (provider) {
      case 'openai':
      case 'ollama':
        // OpenAI format (Ollama uses same format)
        return tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }));

      case 'gemini':
        // Gemini format (may differ, needs research)
        return tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }));

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Validate JSON Schema for parameters
   */
  _validateParametersSchema(schema) {
    if (!schema || schema.type !== 'object') {
      throw new Error('Tool parameters must be an object schema');
    }
    // Additional validation can be added here
  }
}

module.exports = { ToolRegistry };
```

### Tool Executor Implementation

**File**: `backend/chat/tools/executor.js`

```javascript
const { ToolHandlers } = require('./handlers');

/**
 * Executes tool calls with error handling and validation
 */
class ToolExecutor {
  constructor(registry) {
    this.registry = registry;
    this.handlers = new ToolHandlers();
  }

  /**
   * Execute a tool call
   * @param {string} name - Tool name
   * @param {object} params - Tool parameters
   * @returns {Promise<ToolResult>}
   */
  async execute(name, params) {
    const startTime = Date.now();

    try {
      // 1. Get tool definition
      const tool = this.registry.get(name);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${name}' not found`,
          tool_name: name,
          execution_time_ms: Date.now() - startTime
        };
      }

      // 2. Validate parameters
      const validation = this._validateParameters(tool, params);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid parameters: ${validation.errors.join(', ')}`,
          tool_name: name,
          execution_time_ms: Date.now() - startTime
        };
      }

      // 3. Execute based on implementation type
      let result;
      switch (tool.implementation.type) {
        case 'mock':
          result = await this._executeMock(tool, params);
          break;

        case 'builtin':
          result = await this._executeBuiltin(tool, params);
          break;

        case 'internal':
          result = await this._executeInternal(tool, params);
          break;

        case 'http':
          // v2 feature - documented but not implemented in v1
          throw new Error('HTTP tools are not yet supported (coming in v2)');
          // result = await this._executeHttp(tool, params);
          break;

        default:
          throw new Error(`Unknown implementation type: ${tool.implementation.type}`);
      }

      return {
        success: true,
        result: result,
        tool_name: name,
        execution_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error(`[ToolExecutor] Error executing ${name}:`, error);
      return {
        success: false,
        error: error.message,
        tool_name: name,
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Validate parameters against tool schema
   */
  _validateParameters(tool, params) {
    const errors = [];
    const schema = tool.parameters;

    // Check required parameters
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in params)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    // Type checking (basic)
    for (const [key, value] of Object.entries(params)) {
      if (schema.properties && schema.properties[key]) {
        const propSchema = schema.properties[key];
        const actualType = typeof value;
        const expectedType = propSchema.type;

        if (expectedType === 'integer' && !Number.isInteger(value)) {
          errors.push(`${key} must be an integer`);
        } else if (expectedType === 'string' && actualType !== 'string') {
          errors.push(`${key} must be a string`);
        }

        // Check enum constraints
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(`${key} must be one of: ${propSchema.enum.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Execute mock tool (returns static response)
   */
  async _executeMock(tool, params) {
    console.log(`[ToolExecutor] Mock execution: ${tool.name}`, params);
    return tool.implementation.mock_response;
  }

  /**
   * Execute builtin tool handler
   */
  async _executeBuiltin(tool, params) {
    const handler = this.handlers.get(tool.implementation.handler);
    if (!handler) {
      throw new Error(`Builtin handler '${tool.implementation.handler}' not found`);
    }
    return await handler(params);
  }

  /**
   * Execute internal service tool (e.g., RAG query)
   */
  async _executeInternal(tool, params) {
    const handler = this.handlers.get(tool.implementation.handler);
    if (!handler) {
      throw new Error(`Internal handler '${tool.implementation.handler}' not found`);
    }
    return await handler(params);
  }

  /**
   * Execute HTTP tool (v2 - not implemented in v1)
   * Documentation for future implementation
   */
  async _executeHttp(tool, params) {
    // This will be implemented in v2
    // See "HTTP Tools (v2)" section below for full specification
    throw new Error('HTTP tools not yet implemented (coming in v2)');
  }
}

module.exports = { ToolExecutor };
```

---

## HTTP Tools (v2 - Future Implementation)

**Status**: Documented but deferred to v2

**Decision Rationale**:
- v1 focuses on core tool calling infrastructure with builtin, internal, and mock tools
- HTTP tools add complexity (auth, rate limiting, error handling, retries)
- Most valuable initial tools are internal (RAG) or builtin (calculator)
- Architecture is designed to support HTTP tools when needed

### HTTP Tool Configuration (v2)

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "type": "function",
  "handler": "weather_api",
  "parameters": {
    "type": "object",
    "properties": {
      "location": { "type": "string" },
      "units": { "type": "string", "enum": ["celsius", "fahrenheit"] }
    },
    "required": ["location"]
  },
  "implementation": {
    "type": "http",
    "url": "https://api.openweathermap.org/data/2.5/weather",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer ${WEATHER_API_KEY}"
    },
    "params_mapping": {
      "location": "q",
      "units": "units"
    },
    "response_path": "$.data",
    "timeout_ms": 5000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  }
}
```

### HTTP Tool Implementation (v2)

```javascript
/**
 * Execute HTTP tool - v2 implementation
 */
async _executeHttp(tool, params) {
  const axios = require('axios');
  const config = tool.implementation;

  // 1. Map parameters to API format
  const queryParams = {};
  if (config.params_mapping) {
    for (const [toolParam, apiParam] of Object.entries(config.params_mapping)) {
      if (params[toolParam] !== undefined) {
        queryParams[apiParam] = params[toolParam];
      }
    }
  }

  // 2. Substitute environment variables in headers
  const headers = {};
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      headers[key] = this._substituteEnvVars(value);
    }
  }

  // 3. Make HTTP request with retry logic
  const maxAttempts = config.retry?.max_attempts || 1;
  const backoffMs = config.retry?.backoff_ms || 1000;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios({
        method: config.method || 'GET',
        url: config.url,
        params: config.method === 'GET' ? queryParams : undefined,
        data: config.method === 'POST' ? params : undefined,
        headers: headers,
        timeout: config.timeout_ms || 10000
      });

      // 4. Extract result using JSONPath if specified
      let result = response.data;
      if (config.response_path) {
        result = this._extractByPath(response.data, config.response_path);
      }

      return result;

    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      // Retry on server errors (5xx) or network issues
      if (attempt < maxAttempts) {
        console.log(`[ToolExecutor] HTTP attempt ${attempt} failed, retrying...`);
        await this._sleep(backoffMs * attempt);
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Substitute environment variables in string
 */
_substituteEnvVars(str) {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
}

/**
 * Extract value from object using JSONPath
 */
_extractByPath(obj, path) {
  // Simple implementation - use jsonpath library in real implementation
  const keys = path.replace('$.', '').split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
  }
  return result;
}

/**
 * Sleep utility for retry backoff
 */
_sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### HTTP Tool Features (v2)

1. **Authentication**
   - Bearer tokens via headers
   - API keys via query params or headers
   - Environment variable substitution for secrets

2. **Parameter Mapping**
   - Map tool parameters to API-specific names
   - Support query params (GET) and body params (POST)

3. **Response Handling**
   - JSONPath extraction for nested responses
   - Error handling for HTTP status codes
   - Timeout configuration

4. **Reliability**
   - Retry logic with exponential backoff
   - Circuit breaker pattern (future)
   - Rate limiting (future)

5. **Security**
   - Secrets via environment variables (never in config files)
   - Domain allowlisting
   - Request/response logging for audit

### Example HTTP Tools (v2)

**Weather API:**
```json
{
  "name": "get_weather",
  "implementation": {
    "type": "http",
    "url": "https://api.openweathermap.org/data/2.5/weather",
    "method": "GET",
    "headers": { "Authorization": "Bearer ${WEATHER_API_KEY}" },
    "params_mapping": { "location": "q" }
  }
}
```

**REST API Call:**
```json
{
  "name": "create_ticket",
  "implementation": {
    "type": "http",
    "url": "https://api.example.com/tickets",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}",
      "Content-Type": "application/json"
    }
  }
}
```

**Search API:**
```json
{
  "name": "web_search",
  "implementation": {
    "type": "http",
    "url": "https://api.search.com/v1/search",
    "method": "GET",
    "params_mapping": { "query": "q", "max_results": "limit" },
    "response_path": "$.results",
    "timeout_ms": 3000
  }
}
```

### v2 Implementation Estimate

**HTTP Tools Feature**: 1 week
- HTTP request handling with retries: 2 days
- Authentication and secrets management: 1 day
- Response parsing and error handling: 1 day
- Testing and documentation: 1 day

### Migration Path (v1 → v2)

**Step 1**: Use mock tools in v1
```json
{
  "name": "get_weather",
  "implementation": {
    "type": "mock",
    "mock_response": { "temperature": 22, "condition": "sunny" }
  }
}
```

**Step 2**: Replace with HTTP in v2
```json
{
  "name": "get_weather",
  "implementation": {
    "type": "http",
    "url": "https://api.openweathermap.org/...",
    "method": "GET"
  }
}
```

**No code changes needed** - just config update!

---

### Tool Handlers

**File**: `backend/chat/tools/handlers.js`

```javascript
const math = require('mathjs');

/**
 * Built-in tool handlers
 */
class ToolHandlers {
  constructor() {
    this.handlers = new Map();
    this._registerBuiltinHandlers();
  }

  /**
   * Register all builtin handlers
   */
  _registerBuiltinHandlers() {
    // Math calculator
    this.register('math_eval', async (params) => {
      try {
        const result = math.evaluate(params.expression);
        return { result: result };
      } catch (error) {
        throw new Error(`Math evaluation failed: ${error.message}`);
      }
    });

    // More handlers can be added here
    this.register('echo', async (params) => {
      return { echo: params };
    });
  }

  /**
   * Register a handler function
   */
  register(name, handler) {
    this.handlers.set(name, handler);
  }

  /**
   * Get handler by name
   */
  get(name) {
    return this.handlers.get(name);
  }
}

module.exports = { ToolHandlers };
```

### Tool Manager (Coordinator)

**File**: `backend/chat/tools/manager.js`

```javascript
const { ToolRegistry } = require('./registry');
const { ToolExecutor } = require('./executor');

/**
 * Manages tool lifecycle: loading, registry, execution
 */
class ToolManager {
  constructor(config) {
    this.config = config;
    this.registry = new ToolRegistry();
    this.executor = new ToolExecutor(this.registry);

    if (config.tools && config.tools.enabled) {
      this.loadTools();
    }
  }

  /**
   * Load tools from configuration
   */
  loadTools() {
    const toolsConfig = this.config.tools;

    if (!toolsConfig.registry || toolsConfig.registry.length === 0) {
      console.log('[ToolManager] No tools defined in configuration');
      return;
    }

    for (const toolDef of toolsConfig.registry) {
      try {
        this.registry.register(toolDef);
      } catch (error) {
        console.error(`[ToolManager] Failed to register tool ${toolDef.name}:`, error.message);
      }
    }

    console.log(`[ToolManager] Loaded ${this.registry.list().length} tools`);
  }

  /**
   * Get the registry
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * Get the executor
   */
  getExecutor() {
    return this.executor;
  }

  /**
   * Check if tools are enabled
   */
  isEnabled() {
    return this.config.tools && this.config.tools.enabled;
  }

  /**
   * Get max iterations limit
   */
  getMaxIterations() {
    return this.config.tools?.max_iterations || 5;
  }

  /**
   * Get default timeout
   */
  getDefaultTimeout() {
    return this.config.tools?.default_timeout_ms || 30000;
  }
}

module.exports = { ToolManager };
```

---

## Response Generation Integration

### Extended Response Generator

**File**: `backend/chat/lib/response-generator.js` (modifications)

```javascript
/**
 * Generate response with optional tool calling
 */
async generateResponse(profile, responseRule, aiProviders, userMessage, previousMessages, toolManager) {
  // 1. Build system prompt
  const systemPrompt = substituteVariables(responseRule.prompt, profile);

  // 2. Build messages
  let messages = [
    { role: 'system', content: systemPrompt },
    ...this._convertPreviousMessages(previousMessages),
    { role: 'user', content: userMessage }
  ];

  // 3. Get provider
  const provider = aiProviders.get(responseRule.llm);
  if (!provider) {
    throw new Error(`Provider ${responseRule.llm} not found`);
  }

  // 4. Prepare options
  const options = {
    max_tokens: responseRule.max_tokens,
    temperature: responseRule.temperature
  };

  // 5. Check if tools are enabled for this handler
  const toolsEnabled = toolManager &&
                       toolManager.isEnabled() &&
                       responseRule.tools &&
                       responseRule.tools.enabled;

  if (!toolsEnabled) {
    // Standard flow without tools
    const result = await provider.generateChat(messages, responseRule.model, options);
    return {
      content: result.content,
      service: responseRule.llm,
      model: responseRule.model
    };
  }

  // 6. Tool calling flow
  return await this._generateWithTools(
    provider,
    responseRule,
    messages,
    options,
    toolManager
  );
}

/**
 * Generate response with tool calling loop
 */
async _generateWithTools(provider, responseRule, messages, options, toolManager) {
  const registry = toolManager.getRegistry();
  const executor = toolManager.getExecutor();

  // Get allowed tools for this handler
  const allowedTools = responseRule.tools.allowed_tools || [];

  // Get tools in provider format
  const tools = registry.toProviderFormat(
    provider.constructor.name.replace('Provider', '').toLowerCase(),
    allowedTools
  );

  if (tools.length === 0) {
    console.warn('[ResponseGenerator] No tools available for handler');
    // Fall back to standard generation
    const result = await provider.generateChat(messages, responseRule.model, options);
    return {
      content: result.content,
      service: responseRule.llm,
      model: responseRule.model
    };
  }

  // Add tools to options
  options.tools = tools;

  // Iteration limits
  const maxIterations = responseRule.tools.max_iterations || toolManager.getMaxIterations();
  let iteration = 0;

  // Tracking
  const toolCalls = [];

  // Tool calling loop
  while (iteration < maxIterations) {
    console.log(`[ResponseGenerator] Tool calling iteration ${iteration + 1}/${maxIterations}`);

    // Call LLM
    const result = await provider.generateChat(messages, responseRule.model, options);

    // Check finish reason
    if (result.finish_reason === 'stop' || result.finish_reason === 'end_turn') {
      // Normal completion
      return {
        content: result.content,
        service: responseRule.llm,
        model: responseRule.model,
        tool_calls: toolCalls
      };
    }

    if (result.finish_reason === 'tool_calls' && result.tool_calls && result.tool_calls.length > 0) {
      // Model wants to call tools
      console.log(`[ResponseGenerator] Model requested ${result.tool_calls.length} tool calls`);

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.tool_calls
      });

      // Execute each tool call
      for (const toolCall of result.tool_calls) {
        const toolName = toolCall.function.name;
        const toolParams = JSON.parse(toolCall.function.arguments);

        console.log(`[ResponseGenerator] Executing tool: ${toolName}`, toolParams);

        // Execute tool
        const toolResult = await executor.execute(toolName, toolParams);

        // Track tool call
        toolCalls.push({
          tool: toolName,
          params: toolParams,
          result: toolResult,
          iteration: iteration + 1
        });

        // Add tool result message
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult)
        });
      }

      iteration++;
      continue; // Loop back to LLM with tool results
    }

    // Unexpected finish reason
    console.warn(`[ResponseGenerator] Unexpected finish_reason: ${result.finish_reason}`);
    return {
      content: result.content || 'I encountered an issue processing your request.',
      service: responseRule.llm,
      model: responseRule.model,
      tool_calls: toolCalls
    };
  }

  // Max iterations reached
  console.warn(`[ResponseGenerator] Max tool calling iterations (${maxIterations}) reached`);
  return {
    content: 'I reached the maximum number of tool calls. Please try rephrasing your request.',
    service: responseRule.llm,
    model: responseRule.model,
    tool_calls: toolCalls,
    max_iterations_reached: true
  };
}

/**
 * Convert previous messages to standard format
 */
_convertPreviousMessages(previousMessages) {
  return previousMessages.map(msg => ({
    role: msg.role || 'user',
    content: msg.content
  }));
}
```

---

## Provider Implementations

### OpenAI Provider Extensions

**File**: `backend/chat/ai-providers/providers/OpenAIProvider.js` (modifications)

```javascript
/**
 * Generate chat completion with optional tool support
 */
async generateChat(messages, model, options = {}) {
  const requestBody = {
    model: model,
    messages: messages,
    max_tokens: options.max_tokens,
    temperature: options.temperature || 0.7
  };

  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
    requestBody.tool_choice = 'auto'; // Let model decide when to use tools
  }

  try {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      requestBody,
      { headers: this._getHeaders() }
    );

    const choice = response.data.choices[0];

    // Build result object
    const result = {
      content: choice.message.content,
      finish_reason: choice.finish_reason,
      usage: response.data.usage
    };

    // Include tool calls if present
    if (choice.message.tool_calls) {
      result.tool_calls = choice.message.tool_calls;
    }

    return result;

  } catch (error) {
    throw this._handleError(error);
  }
}
```

### Ollama Provider Extensions

**File**: `backend/chat/ai-providers/providers/OllamaProvider.js` (modifications)

```javascript
/**
 * Generate chat completion with optional tool support
 * Ollama uses OpenAI-compatible format for tools
 */
async generateChat(messages, model, options = {}) {
  const requestBody = {
    model: model,
    messages: messages,
    stream: false,
    options: {
      temperature: options.temperature || 0.7
    }
  };

  // Add max_tokens if provided
  if (options.max_tokens) {
    requestBody.options.num_predict = options.max_tokens;
  }

  // Add tools if provided (Ollama 0.1.26+)
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
  }

  try {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const message = response.data.message;

    const result = {
      content: message.content,
      finish_reason: response.data.done ? 'stop' : 'length'
    };

    // Include tool calls if present
    if (message.tool_calls) {
      result.tool_calls = message.tool_calls;
      result.finish_reason = 'tool_calls';
    }

    return result;

  } catch (error) {
    throw this._handleError(error);
  }
}
```

### Gemini Provider Extensions

**File**: `backend/chat/ai-providers/providers/GeminiProvider.js` (modifications)

```javascript
/**
 * Generate chat completion with optional tool support
 * Note: Gemini has different function calling format
 */
async generateChat(messages, model, options = {}) {
  const genAI = new GoogleGenerativeAI(this.apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: model });

  // Convert messages to Gemini format
  const geminiMessages = this._convertMessages(messages);

  // Build generation config
  const generationConfig = {
    temperature: options.temperature || 0.7,
    maxOutputTokens: options.max_tokens
  };

  // Add tools if provided (Gemini format)
  let tools = undefined;
  if (options.tools && options.tools.length > 0) {
    tools = this._convertToolsToGeminiFormat(options.tools);
  }

  try {
    const chat = geminiModel.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: generationConfig,
      tools: tools
    });

    const result = await chat.sendMessage(
      geminiMessages[geminiMessages.length - 1].parts
    );

    const response = result.response;
    const text = response.text();

    // Check for function calls
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return {
        content: text,
        finish_reason: 'tool_calls',
        tool_calls: this._convertGeminiToolCalls(functionCalls)
      };
    }

    return {
      content: text,
      finish_reason: 'stop'
    };

  } catch (error) {
    throw this._handleError(error);
  }
}

/**
 * Convert OpenAI tool format to Gemini format
 */
_convertToolsToGeminiFormat(tools) {
  return tools.map(tool => ({
    functionDeclarations: [{
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }]
  }));
}

/**
 * Convert Gemini function calls to OpenAI format
 */
_convertGeminiToolCalls(functionCalls) {
  return functionCalls.map((fc, index) => ({
    id: `call_${index}`,
    type: 'function',
    function: {
      name: fc.name,
      arguments: JSON.stringify(fc.args)
    }
  }));
}
```

---

## Testing Interface

### Tool Testing Component

**File**: `frontend/src/ToolTesting.jsx`

```jsx
import React, { useState, useEffect } from 'react';

/**
 * Tool Testing Interface
 * Similar to RAG Calibration and Topic Detection testing
 */
function ToolTesting() {
  const [tools, setTools] = useState([]);
  const [testQuery, setTestQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTools();
    loadModels();
  }, []);

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools/list');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models/list');
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const runTest = async () => {
    if (!testQuery || !selectedModel) {
      alert('Please enter a test query and select a model');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          model: selectedModel
        })
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tool Calling Testing</h1>

      {/* Available Tools */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => (
            <div key={tool.name} className="border rounded p-4 bg-white shadow">
              <h3 className="font-bold text-lg">{tool.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{tool.description}</p>
              <div className="mt-2">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {tool.implementation.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Test Query */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Test Tool Calling</h2>

        <div className="bg-white p-6 rounded shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">-- Select Model --</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.capabilities.includes('function-calling') ? '🔧' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test Query</label>
            <textarea
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="e.g., What's the weather in Paris?"
              className="w-full border rounded px-3 py-2 h-24"
            />
          </div>

          <button
            onClick={runTest}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>
      </section>

      {/* Test Results */}
      {testResult && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Test Results</h2>

          <div className="bg-white p-6 rounded shadow">
            {/* Tool Calls */}
            {testResult.tool_calls && testResult.tool_calls.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Tool Calls ({testResult.tool_calls.length})</h3>
                {testResult.tool_calls.map((call, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 mb-4">
                    <div className="font-mono text-sm">
                      <span className="text-blue-600">{call.tool}</span>(
                      {JSON.stringify(call.params)}
                      )
                    </div>
                    <div className="mt-2 bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-500">Result:</div>
                      <pre className="text-sm">{JSON.stringify(call.result, null, 2)}</pre>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Iteration: {call.iteration} |
                      Execution time: {call.result.execution_time_ms}ms
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Final Response */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Final Response</h3>
              <div className="bg-gray-50 p-4 rounded">
                {testResult.content}
              </div>
            </div>

            {/* Metadata */}
            <div className="text-sm text-gray-600">
              <div>Model: {testResult.model}</div>
              <div>Service: {testResult.service}</div>
              {testResult.max_iterations_reached && (
                <div className="text-orange-600 font-semibold mt-2">
                  ⚠️ Max iterations reached
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Test Scenarios */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Example Test Queries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="border rounded p-4 bg-white shadow cursor-pointer hover:bg-gray-50"
            onClick={() => setTestQuery("What's the weather in Paris?")}
          >
            <div className="font-medium">Simple Tool Call</div>
            <div className="text-sm text-gray-600">What's the weather in Paris?</div>
          </div>
          <div
            className="border rounded p-4 bg-white shadow cursor-pointer hover:bg-gray-50"
            onClick={() => setTestQuery("Calculate 15% tip on $45")}
          >
            <div className="font-medium">Calculator</div>
            <div className="text-sm text-gray-600">Calculate 15% tip on $45</div>
          </div>
          <div
            className="border rounded p-4 bg-white shadow cursor-pointer hover:bg-gray-50"
            onClick={() => setTestQuery("What's 2+2?")}
          >
            <div className="font-medium">Direct Answer Test</div>
            <div className="text-sm text-gray-600">What's 2+2? (test if model uses tool or answers directly)</div>
          </div>
          <div
            className="border rounded p-4 bg-white shadow cursor-pointer hover:bg-gray-50"
            onClick={() => setTestQuery("Search for Python decorators in the docs")}
          >
            <div className="font-medium">RAG Tool</div>
            <div className="text-sm text-gray-600">Search for Python decorators in the docs</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ToolTesting;
```

### Backend API Endpoints

**File**: `backend/chat/server.js` (additions)

```javascript
/**
 * List available tools
 */
app.get('/api/tools/list', (req, res) => {
  if (!toolManager || !toolManager.isEnabled()) {
    return res.json({ tools: [] });
  }

  const tools = toolManager.getRegistry().list();
  res.json({ tools: tools });
});

/**
 * Test tool calling with a query
 */
app.post('/api/tools/test', async (req, res) => {
  const { query, model } = req.body;

  if (!query || !model) {
    return res.status(400).json({ error: 'Missing query or model' });
  }

  try {
    // Create a test response rule with tool calling enabled
    const testRule = {
      llm: model.split(':')[0], // e.g., 'openai' from 'openai:gpt-4o'
      model: model.split(':')[1] || model,
      prompt: 'You are a helpful assistant with access to tools. Use them when appropriate.',
      max_tokens: 500,
      tools: {
        enabled: true,
        allowed_tools: toolManager.getRegistry().list().map(t => t.name)
      }
    };

    // Build minimal profile
    const profile = {
      topic: 'tool_testing',
      user_message: query
    };

    // Generate response
    const result = await responseGenerator.generateResponse(
      profile,
      testRule,
      aiProviders,
      query,
      [],
      toolManager
    );

    res.json(result);

  } catch (error) {
    console.error('[API] Tool test error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Model Validation Tracking

### Model Validation Schema

**File**: `backend/chat/models/validation-tracker.js`

```javascript
/**
 * Tracks which models have been validated for tool calling
 */
class ModelValidationTracker {
  constructor() {
    this.validations = new Map(); // modelId -> ValidationRecord
  }

  /**
   * Record a successful tool calling test
   */
  recordSuccess(modelId, testDetails) {
    const record = this.validations.get(modelId) || {
      model_id: modelId,
      tested: false,
      validated: false,
      test_count: 0,
      success_count: 0,
      last_tested: null,
      test_history: []
    };

    record.tested = true;
    record.validated = true;
    record.test_count++;
    record.success_count++;
    record.last_tested = new Date().toISOString();
    record.test_history.push({
      timestamp: new Date().toISOString(),
      success: true,
      details: testDetails
    });

    this.validations.set(modelId, record);
  }

  /**
   * Record a failed tool calling test
   */
  recordFailure(modelId, error) {
    const record = this.validations.get(modelId) || {
      model_id: modelId,
      tested: false,
      validated: false,
      test_count: 0,
      success_count: 0,
      last_tested: null,
      test_history: []
    };

    record.tested = true;
    record.test_count++;
    record.last_tested = new Date().toISOString();
    record.test_history.push({
      timestamp: new Date().toISOString(),
      success: false,
      error: error
    });

    // Only mark as validated if success rate >= 80%
    record.validated = (record.success_count / record.test_count) >= 0.8;

    this.validations.set(modelId, record);
  }

  /**
   * Check if model is validated
   */
  isValidated(modelId) {
    const record = this.validations.get(modelId);
    return record ? record.validated : false;
  }

  /**
   * Get validation status
   */
  getStatus(modelId) {
    return this.validations.get(modelId) || {
      model_id: modelId,
      tested: false,
      validated: false
    };
  }

  /**
   * Get all validations
   */
  getAllValidations() {
    return Array.from(this.validations.values());
  }

  /**
   * Persist to file (optional)
   */
  async save(filePath) {
    const fs = require('fs').promises;
    const data = JSON.stringify(Array.from(this.validations.entries()), null, 2);
    await fs.writeFile(filePath, data);
  }

  /**
   * Load from file (optional)
   */
  async load(filePath) {
    const fs = require('fs').promises;
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const entries = JSON.parse(data);
      this.validations = new Map(entries);
    } catch (error) {
      console.log('[ValidationTracker] No existing validation data found');
    }
  }
}

module.exports = { ModelValidationTracker };
```

### UI Integration

**Display validation badge in model selection:**

```jsx
{model.capabilities.includes('function-calling') ? (
  <span className="ml-2">
    {validationTracker.isValidated(model.id) ?
      '🔧✓' : // Validated for tools
      '🔧⚠️'  // Supports tools but not validated
    }
  </span>
) : null}
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Get basic tool calling working with OpenAI

**Scope**: Support tool types: `mock`, `builtin`, `internal` (HTTP deferred to v2)

**Tasks**:
1. Create tool registry, executor, manager (`backend/chat/tools/`)
   - `registry.js` - ToolRegistry class
   - `executor.js` - ToolExecutor class (with stub for HTTP)
   - `handlers.js` - Built-in handlers (math_eval, echo)
   - `manager.js` - ToolManager coordinator
   - Estimated: 2 days

2. Extend response generator with tool loop
   - Add `_generateWithTools()` method
   - Implement iteration limiting
   - Add tool call tracking
   - Estimated: 1 day

3. Update OpenAI provider
   - Pass `tools` parameter
   - Parse `tool_calls` in response
   - Handle `finish_reason: 'tool_calls'`
   - Estimated: 0.5 days

4. Add config schema for tools
   - Global tools section
   - Per-handler tools config
   - Validation
   - Estimated: 0.5 days

5. Basic testing with manual API calls
   - Create test config with 2-3 tools
   - Test with curl/Postman
   - Verify tool execution
   - Estimated: 1 day

**Deliverable**: Working tool calling with OpenAI GPT-4o

---

### Phase 2: Multi-Provider Support (Week 2)

**Goal**: Add Ollama and Gemini support

**Tasks**:
1. Extend Ollama provider
   - Research Ollama tool calling format
   - Implement tool support
   - Test with llama3.2
   - Estimated: 1 day

2. Extend Gemini provider
   - Research Gemini function calling format
   - Convert tool formats
   - Test with gemini-1.5-pro
   - Estimated: 1.5 days

3. Provider-specific tool format conversion
   - Enhance `registry.toProviderFormat()`
   - Handle provider differences
   - Estimated: 0.5 days

4. Cross-provider testing
   - Same tool, multiple providers
   - Document provider differences
   - Estimated: 1 day

5. Update documentation
   - Provider comparison for tools
   - Known limitations per provider
   - Estimated: 1 day

**Deliverable**: Tool calling works across OpenAI, Ollama, Gemini

---

### Phase 3: Testing Interface (Week 3)

**Goal**: Build visual tool testing UI

**Tasks**:
1. Create `ToolTesting.jsx` component
   - List available tools
   - Model selection
   - Test query input
   - Results display
   - Estimated: 2 days

2. Add backend API endpoints
   - `/api/tools/list` - List tools
   - `/api/tools/test` - Run test
   - `/api/tools/validate` - Record validation
   - Estimated: 1 day

3. Integrate with navigation
   - Add route `/tools-testing`
   - Add nav link
   - Estimated: 0.5 days

4. Create test scenarios
   - Pre-built test queries
   - Expected behavior documentation
   - Estimated: 0.5 days

5. User testing and refinement
   - Gather feedback
   - Fix UI issues
   - Estimated: 1 day

**Deliverable**: Fully functional tool testing UI

---

### Phase 4: Model Validation & Polish (Week 4)

**Goal**: Track validated models, add production features

**Tasks**:
1. Implement ModelValidationTracker
   - Track test results
   - Calculate validation status
   - Persist to file
   - Estimated: 1 day

2. Integrate validation into UI
   - Show validation badges
   - Warning for unvalidated models
   - Validation history view
   - Estimated: 1 day

3. Add more built-in tools
   - RAG search tool (internal)
   - Date/time tools
   - String manipulation
   - Estimated: 1 day

4. Error handling improvements
   - Better error messages
   - Retry logic for transient failures
   - Timeout handling
   - Estimated: 1 day

5. Documentation
   - User guide for tool calling
   - Developer guide for adding tools
   - Configuration examples
   - Estimated: 1 day

**Deliverable**: Production-ready tool calling system

---

## Edge Cases & Error Handling

### Error Scenarios

1. **Tool Not Found**
   - Scenario: Model requests tool that doesn't exist
   - Handling: Return error to model, let it recover or apologize
   - Message: `{"success": false, "error": "Tool 'xyz' not found"}`

2. **Invalid Parameters**
   - Scenario: Model provides wrong parameter types or missing required params
   - Handling: Validate before execution, return validation error to model
   - Message: `{"success": false, "error": "Invalid parameters: missing 'location'"}`

3. **Tool Execution Failure**
   - Scenario: Tool throws exception during execution
   - Handling: Catch exception, return error message to model
   - Message: `{"success": false, "error": "Math evaluation failed: invalid expression"}`

4. **Max Iterations Reached**
   - Scenario: Model keeps calling tools beyond limit
   - Handling: Break loop, return final response with warning
   - Message to user: "I reached the maximum number of tool calls..."

5. **Timeout**
   - Scenario: Tool takes too long to execute
   - Handling: Abort execution after timeout, return error to model
   - Implementation: Use `Promise.race()` with timeout promise

6. **Circular Tool Calls**
   - Scenario: Model calls same tool repeatedly with same params
   - Handling: Detect repeated calls, warn model or break loop
   - Implementation: Track call history per iteration

7. **Malformed Tool Call**
   - Scenario: Model returns invalid JSON in tool arguments
   - Handling: Try to parse, return parse error if fails
   - Fallback: Ask model to retry with correct format

### Error Handling Implementation

```javascript
// In ToolExecutor
async execute(name, params) {
  const timeout = this.getTimeout(name);

  try {
    // Race between execution and timeout
    const result = await Promise.race([
      this._executeWithTimeout(name, params),
      this._timeoutPromise(timeout)
    ]);

    return {
      success: true,
      result: result,
      tool_name: name
    };

  } catch (error) {
    if (error.name === 'TimeoutError') {
      return {
        success: false,
        error: `Tool execution timed out after ${timeout}ms`,
        tool_name: name
      };
    }

    return {
      success: false,
      error: error.message,
      tool_name: name
    };
  }
}

_timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error('Tool execution timeout');
      error.name = 'TimeoutError';
      reject(error);
    }, ms);
  });
}
```

### Circular Call Detection

```javascript
// In Response Generator
_detectCircularCalls(toolCalls) {
  const callSignatures = toolCalls.map(tc =>
    `${tc.tool}:${JSON.stringify(tc.params)}`
  );

  // Check if same signature appears more than 2 times
  const counts = {};
  for (const sig of callSignatures) {
    counts[sig] = (counts[sig] || 0) + 1;
    if (counts[sig] > 2) {
      console.warn('[ResponseGenerator] Circular tool call detected:', sig);
      return true;
    }
  }

  return false;
}
```

---

## Security Considerations

### Tool Execution Sandboxing

1. **Parameter Validation**
   - Always validate against schema before execution
   - Sanitize string inputs (prevent injection)
   - Limit array/object sizes

2. **Execution Isolation**
   - Run tools in separate process/container (future)
   - Resource limits (CPU, memory)
   - Network access control

3. **Allowlist per Handler**
   - Response handlers specify `allowed_tools`
   - Prevents models from calling arbitrary tools
   - Reduces attack surface

4. **Built-in Tool Safety**
   - Math eval: Use safe evaluator (mathjs, not `eval()`)
   - File operations: Restrict to specific directories
   - HTTP tools: Allowlist domains

### Configuration Security

1. **Secrets Management**
   - Never put API keys in tool definitions
   - Use environment variables
   - Secure credential storage

2. **User Input Validation**
   - Validate all parameters from model
   - Prevent SQL injection in database tools
   - Sanitize file paths

3. **Rate Limiting**
   - Limit tool calls per user session
   - Prevent abuse of expensive tools
   - Track usage metrics

---

## Observability & Monitoring

### Metrics to Track

1. **Tool Usage**
   - Calls per tool
   - Success/failure rates
   - Average execution time
   - Most common parameters

2. **Model Behavior**
   - Which models use tools most
   - Tool selection accuracy
   - Iteration depths
   - Max iterations frequency

3. **Performance**
   - End-to-end latency with tools
   - Tool execution time distribution
   - Response generation time (with vs without tools)

4. **Errors**
   - Tool not found errors
   - Parameter validation failures
   - Execution errors by tool
   - Timeout frequency

### Logging

```javascript
// Tool execution log
console.log('[ToolExecutor]', {
  tool: name,
  params: params,
  success: result.success,
  execution_time_ms: result.execution_time_ms,
  timestamp: new Date().toISOString()
});

// Tool calling loop log
console.log('[ResponseGenerator]', {
  iteration: iteration,
  tool_calls: result.tool_calls.length,
  finish_reason: result.finish_reason,
  model: responseRule.model
});
```

---

## Future Enhancements (Post-v1)

### v2: HTTP Tools (Next Priority)

**Estimated Effort**: 1 week

**Features**:
- External API calls via HTTP/HTTPS
- Authentication (Bearer tokens, API keys)
- Parameter mapping and response parsing
- Retry logic with exponential backoff
- Environment variable substitution for secrets

**Benefits**:
- Call real external services (weather, search, CRM, etc.)
- Bridge to third-party APIs
- Enables real-world integrations

**See**: "HTTP Tools (v2 - Future Implementation)" section above for full specification.

---

### Phase 5: MCP Integration

- Implement Model Context Protocol support
- MCP server discovery
- Dynamic tool registration from MCP servers
- Standardized tool formats

### Phase 6: Advanced Features

- Tool composition (multi-step tools)
- Tool versioning and migration
- Tool marketplace/sharing
- Agent-to-agent tool delegation
- Parallel tool execution
- Tool caching and memoization

### Phase 7: Enterprise Features

- Tool audit logs
- Compliance tracking
- Role-based tool access
- Tool cost tracking
- SLA monitoring
- A/B testing for tools

---

## Appendix: Example Configurations

### Example 1: Weather Assistant

```json
{
  "tools": {
    "enabled": true,
    "max_iterations": 3,
    "registry": [
      {
        "name": "get_weather",
        "description": "Get current weather conditions",
        "type": "function",
        "handler": "weather",
        "parameters": {
          "type": "object",
          "properties": {
            "location": { "type": "string" },
            "units": { "type": "string", "enum": ["celsius", "fahrenheit"] }
          },
          "required": ["location"]
        },
        "implementation": {
          "type": "mock",
          "mock_response": { "temperature": 22, "condition": "sunny" }
        }
      }
    ]
  },
  "responses": [
    {
      "match": { "intent_regexp": "/(weather|forecast)/" },
      "llm": "openai",
      "model": "gpt-4o",
      "prompt": "You are a weather assistant.\n\nUser: {{user_message}}",
      "tools": {
        "enabled": true,
        "allowed_tools": ["get_weather"]
      }
    }
  ]
}
```

### Example 2: Technical Documentation Assistant

```json
{
  "tools": {
    "enabled": true,
    "registry": [
      {
        "name": "search_docs",
        "description": "Search technical documentation",
        "type": "function",
        "handler": "rag_search",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string" },
            "max_results": { "type": "integer", "default": 5 }
          },
          "required": ["query"]
        },
        "implementation": {
          "type": "internal",
          "handler": "rag_query"
        }
      }
    ]
  },
  "responses": [
    {
      "match": { "service": "technical_docs" },
      "llm": "ollama",
      "model": "llama3.2:3b",
      "prompt": "You are a technical documentation assistant.\n\nUser: {{user_message}}",
      "tools": {
        "enabled": true,
        "allowed_tools": ["search_docs"],
        "max_iterations": 2
      }
    }
  ]
}
```

---

## Summary

This specification provides a complete implementation plan for tool calling in Flex Chat:

**Architecture**: Tool registry + executor pattern with Phase 6b loop
**Configuration**: Global + per-handler tool definitions
**Multi-Provider**: OpenAI, Ollama, Gemini support from day 1
**Tool Types (v1)**: Mock, Builtin, Internal (HTTP deferred to v2)
**Testing**: Visual interface for model validation
**Validation**: Track which models successfully use tools
**Timeline**: 4 weeks for production-ready v1 implementation

**Next Steps**:
1. Review and approve specification
2. Create implementation tickets from roadmap
3. Begin Phase 1: Core Infrastructure
4. Iterate based on testing results

---

**Decisions Made**:
✅ HTTP tools deferred to v2 (documented in spec for future implementation)

**Questions for Review**:
1. Is the tool definition schema comprehensive enough?
2. What built-in tools are must-haves for initial release?
3. Should validation tracking be file-based or database?
4. Any security concerns not addressed?

---

## Document History

**Version 1.0** - 2025-02-09

Initial specification:
- Comprehensive tool calling implementation plan
- Multi-provider support (OpenAI, Ollama, Gemini)
- 4-week implementation roadmap
- Full architecture and code examples

**Version 1.1** - 2025-02-09

HTTP tools deferred to v2:
- **Decision**: Focus v1 on mock, builtin, and internal tools only
- **Rationale**: Simpler initial implementation; most valuable tools are internal (RAG, calculator)
- **Documentation**: HTTP tool specification fully documented in dedicated section for v2 implementation
- **Impact**: Reduced v1 scope to 4 weeks; HTTP tools add ~1 week in v2
- **Migration Path**: Mock tools can be replaced with HTTP tools in v2 via config-only change (no code changes needed)
