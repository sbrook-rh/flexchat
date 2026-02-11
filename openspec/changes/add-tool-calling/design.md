## Context

Flex Chat uses a 6-phase processing flow for conversation handling: Topic Detection → RAG Collection → Intent Detection → Profile Building → Response Handler Matching → Response Generation. Currently, Phase 6 (Response Generation) only generates text responses by calling LLM providers with formatted messages. This design extends Phase 6 with tool calling capabilities, enabling models to execute functions and use results in their responses.

**Current Architecture:**
- Provider abstraction: `AIProvider` base class with `generateChat(messages, model, options)`
- Three providers: OpenAIProvider, OllamaProvider, GeminiProvider
- Response generator: Builds messages, calls provider, returns text content
- Configuration-driven: All behavior controlled via JSON config

**Constraints:**
- Must support multiple providers (OpenAI, Ollama, Gemini) with different tool calling formats
- Must maintain backward compatibility (tool calling is optional per handler)
- Must prevent infinite loops and resource exhaustion
- RAG foundation already complete; tool calling is next strategic priority

**Stakeholders:**
- Enterprise AI capabilities (Natural Language Interfaces, Workflow Orchestration)
- Foundation for future AI-Ops automation

## Goals / Non-Goals

**Goals:**
- Multi-provider tool calling (OpenAI, Ollama, Gemini) from day 1
- Configuration-driven tool definitions (no code changes to add tools)
- Three tool types: mock (testing), builtin (native code), internal (Flex Chat services)
- Visual testing interface for validating model tool-calling capabilities
- Production-ready error handling (timeouts, validation, iteration limits)
- Model validation tracking (which models successfully use tools)

**Non-Goals:**
- HTTP tools (external API calls) - deferred to v2, fully documented for future
- MCP (Model Context Protocol) integration - deferred to Phase 2
- Tool versioning or migration strategies - future work
- Agent-to-agent tool delegation - future work
- Streaming support for tool calling - future enhancement

## Decisions

### Decision 1: Tool Registry + Executor Pattern

**Choice:** Separate registry (storage) from executor (runtime)

**Rationale:**
- Registry: Manages tool definitions, handles provider format conversion
- Executor: Validates parameters, executes tools, handles errors
- Manager: Coordinates both, loads from config

**Alternatives Considered:**
- Monolithic ToolService: Rejected - harder to test, violates SRP
- Per-provider tool implementations: Rejected - duplicates validation logic

**Benefits:**
- Clear separation of concerns (registration vs execution)
- Testable in isolation
- Registry can convert same tools to different provider formats

### Decision 2: Phase 6b Placement in Response Generator

**Choice:** Add tool calling loop as `_generateWithTools()` method in response-generator.js

**Rationale:**
- Response generator already orchestrates LLM calls
- Natural extension point - check `responseRule.tools.enabled`
- Keeps tool logic centralized in one place
- Backward compatible - falls back to standard flow if tools disabled

**Alternatives Considered:**
- New Phase 7: Rejected - breaks existing 6-phase mental model
- Middleware pattern: Rejected - adds complexity for marginal benefit
- Provider-level tool handling: Rejected - duplicates loop logic across providers

**Implementation:**
```javascript
async generateResponse(..., toolManager) {
  if (!toolsEnabled) {
    return standardFlow(); // Backward compatible
  }
  return await this._generateWithTools(...); // New path
}
```

### Decision 3: Provider Format Conversion

**Choice:** Registry converts tool definitions to provider-specific formats via `toProviderFormat(provider, allowedTools)`

**Rationale:**
- OpenAI/Ollama use identical format (OpenAI-compatible)
- Gemini uses different format (functionDeclarations)
- Conversion logic centralized in one place

**Implementation:**
```javascript
toProviderFormat(provider, allowedTools) {
  switch (provider) {
    case 'openai':
    case 'ollama':
      return tools.map(t => ({
        type: 'function',
        function: { name, description, parameters }
      }));
    case 'gemini':
      return tools.map(t => ({
        functionDeclarations: [{ name, description, parameters }]
      }));
  }
}
```

### Decision 4: Iteration Limit Enforcement

**Choice:** Two-level limit (global default + per-handler override)

**Rationale:**
- Prevents infinite loops from misbehaving models
- Different handlers may have different needs (weather: 3, docs: 2)
- Global default (5) provides safety net

**Configuration:**
```json
{
  "tools": {
    "max_iterations": 5  // Global default
  },
  "responses": [{
    "tools": {
      "max_iterations": 3  // Handler override
    }
  }]
}
```

### Decision 5: Error Handling Strategy

**Choice:** Return errors to model as tool results, let model handle gracefully

**Rationale:**
- Tool not found → model can apologize or try different approach
- Invalid parameters → model can retry with corrected params
- Execution failure → model can explain error to user
- Better UX than throwing exceptions

**Format:**
```javascript
{
  "success": false,
  "error": "Tool 'xyz' not found",
  "tool_name": "xyz",
  "execution_time_ms": 12
}
```

### Decision 6: Tool Type Architecture (v1 vs v2)

**Choice:** v1 supports mock, builtin, internal; defer HTTP to v2

**Rationale:**
- Mock: Essential for testing without dependencies
- Builtin: Calculator, string utils - simple, self-contained
- Internal: RAG search - most valuable, uses existing services
- HTTP: Adds complexity (auth, retries, rate limits) - defer to v2

**Migration Path:**
Mock tool in v1 → Replace with HTTP in v2 (config-only change):
```json
// v1: {"type": "mock", "mock_response": {...}}
// v2: {"type": "http", "url": "...", "method": "GET"}
```

### Decision 7: Parameter Validation Approach

**Choice:** JSON Schema validation before execution

**Rationale:**
- Tools define parameters as JSON Schema (OpenAPI style)
- Validate required fields, types, enum constraints before execution
- Fail fast with clear error messages

**Trade-off:** Basic validation only (no deep object validation) - keeps complexity low

### Decision 8: Model Validation Tracking

**Choice:** File-based validation tracker with 80% success threshold

**Rationale:**
- File-based: Simple, no database dependency, easy to inspect
- 80% threshold: Allows occasional failures while indicating model capability
- Test history: Debugging and trend analysis

**Alternatives Considered:**
- Database storage: Rejected - overkill for v1
- 100% threshold: Rejected - too strict, models sometimes fail for non-tool reasons

## Risks / Trade-offs

### Risk: Infinite Tool Call Loops
**Scenario:** Model repeatedly calls same tool or enters circular pattern
**Mitigation:**
- Hard iteration limit (max_iterations)
- Circular call detection (same tool + params > 2 times)
- Timeout per tool execution (default 30s)

### Risk: Provider API Differences
**Scenario:** Providers handle tools differently (format, finish_reason, error cases)
**Mitigation:**
- Provider-specific format conversion in registry
- Provider-specific response parsing in each provider class
- Comprehensive testing across all providers

### Risk: Tool Execution Security
**Scenario:** Model could request tool with malicious parameters (injection attacks)
**Mitigation:**
- Parameter validation against schema
- Per-handler tool allowlists (can't call arbitrary tools)
- Builtin tools use safe libraries (mathjs, not eval())
- HTTP tools deferred to v2 (time to design security properly)

### Risk: Configuration Complexity
**Scenario:** Users overwhelmed by tool definitions, parameters, allowlists
**Mitigation:**
- Comprehensive examples in docs (weather, calculator, RAG search)
- Testing UI provides immediate feedback
- Start simple (3 example tools), expand as needed

### Risk: Token Usage Explosion
**Scenario:** Tool calling adds messages (assistant + tool results), increases token cost
**Mitigation:**
- Iteration limits prevent runaway costs
- Tool results are JSON (concise)
- Future: Tool result summarization

### Trade-off: v1 Scope Limitations
**Limitation:** No HTTP tools in v1 means can't call external APIs
**Mitigation:**
- Mock tools simulate HTTP responses for testing
- v2 implementation fully documented and estimated (1 week)
- Config-based migration path (no code changes)

### Trade-off: File-based Validation Tracking
**Limitation:** No concurrent access control, could lose data if multiple processes
**Mitigation:**
- Single backend server process (current architecture)
- Future: Move to database if scaling needed

## Migration Plan

### Phase 1: Core Infrastructure (Week 1)
**Deploy Steps:**
1. Create `backend/chat/tools/` directory with registry, executor, handlers, manager
2. Extend response generator with `_generateWithTools()` method
3. Update OpenAI provider to pass tools and parse tool_calls
4. Add `mathjs` dependency (calculator tool)
5. Add global `tools` config section with example tools
6. Deploy to dev environment, test with OpenAI GPT-4o

**Rollback:** Remove `tools` config section, system falls back to standard flow

### Phase 2: Multi-Provider Support (Week 2)
**Deploy Steps:**
1. Extend Ollama provider (tool support)
2. Extend Gemini provider (function calling with format conversion)
3. Test same tools across all 3 providers
4. Document provider differences

**Rollback:** Disable tool calling for Ollama/Gemini (set `tools.enabled: false` per handler)

### Phase 3: Testing Interface (Week 3)
**Deploy Steps:**
1. Create ToolTesting.jsx React component
2. Add `/api/tools/list` and `/api/tools/test` endpoints
3. Add route to frontend navigation
4. Deploy UI, gather user feedback

**Rollback:** Remove route from navigation (backend remains functional)

### Phase 4: Validation & Polish (Week 4)
**Deploy Steps:**
1. Add ModelValidationTracker
2. Integrate validation badges into UI
3. Add more builtin tools (RAG search, date/time)
4. Performance testing and optimization

**Rollback:** Validation tracking optional (doesn't affect core functionality)

### Configuration Migration
**No breaking changes** - tools are opt-in per handler:
```json
{
  "tools": {
    "enabled": true,
    "registry": [...]
  },
  "responses": [{
    "tools": {
      "enabled": true,  // Opt-in per handler
      "allowed_tools": ["calculator"]
    }
  }]
}
```

Existing handlers without `tools` section continue working unchanged.

## Open Questions

1. **Tool result size limits**: Should we truncate large tool results (e.g., RAG search returns 50KB)?
   - Proposal: Add optional `max_result_size` config, truncate with ellipsis if exceeded
   - Decision: Defer to testing feedback

2. **Streaming support**: Should tool calls work with streaming responses?
   - Current: All providers use non-streaming mode for simplicity
   - Future: Streaming + tools requires buffering tool calls before executing
   - Decision: Non-streaming only in v1, revisit in v2 if needed

3. **Tool call observability**: How much tool execution detail should be logged?
   - Proposal: Log tool name, params (sanitized), success/failure, execution time
   - Decision: Implement comprehensive logging, add toggle for production (verbose/quiet)

4. **RAG search tool design**: Should RAG search be one tool or multiple (per collection)?
   - Option A: Single `search_documents` tool with `collection` parameter
   - Option B: Dynamic tools per collection (`search_openshift_docs`, `search_python_docs`)
   - Decision: Option A (simpler, more flexible), defer B to future if needed

5. **Validation tracking persistence**: When should validation data be saved to file?
   - Options: After each test, on shutdown, periodic interval
   - Proposal: After each test (immediate persistence, no data loss risk)
   - Decision: Implement after-each-test, add periodic backup if performance issues
