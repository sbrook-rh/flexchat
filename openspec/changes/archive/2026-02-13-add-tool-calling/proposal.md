## Why

Tool calling enables Flex Chat to bridge natural language to system actions, unlocking **Level 2 capabilities** from the Enterprise AI Capability Framework (Natural Language Interfaces and Intelligent Workflow Orchestration). This is foundational infrastructure for AI-Ops and autonomous operations. Without tool calling, the system can only generate text responses; with it, models can query knowledge bases, perform calculations, and execute structured operations based on user intent.

## What Changes

This change implements a production-ready tool calling system with multi-provider support:

- **Tool Registry & Execution Engine**: Central registry for tool definitions with type-safe execution (mock, builtin, internal tools)
- **Phase 6b Tool Loop**: Extends response generation with iterative tool calling (model requests tool → execute → return result → model continues)
- **Multi-Provider Support**: OpenAI, Ollama, and Gemini provider extensions for function calling APIs
- **Configuration-Driven Tools**: Tools defined in config with per-handler allowlists and iteration limits
- **Testing Interface**: Visual UI for testing model tool-calling capabilities with validation tracking
- **Model Validation System**: Track which models successfully use tools (80% success threshold)
- **Error Handling**: Tool not found, invalid parameters, execution failures, iteration limits, timeouts
- **Security Controls**: Parameter validation, per-handler tool allowlists, timeout enforcement

**Scope**: v1 supports mock, builtin, and internal tool types. HTTP tools (external API calls) are deferred to v2 but fully documented.

## Capabilities

### New Capabilities

- `tool-registry`: Central tool definition registry with provider-specific format conversion (OpenAI, Ollama, Gemini)
- `tool-execution`: Tool executor with parameter validation, error handling, timeout enforcement, and execution tracking
- `tool-testing`: React component for testing tool calling with model selection, query input, and result visualization
- `tool-validation`: Model validation tracker with success rate calculation, test history, and badge indicators
- `response-generation`: Response generation orchestration including Phase 6b tool execution loop (new spec, implements Phase 6 behavior)

### Modified Capabilities

- `ai-providers`: Add tool calling support to OpenAI, Ollama, and Gemini providers (pass tools, parse tool_calls, handle finish_reason)

## Impact

**New Files**:
- `backend/chat/tools/registry.js` - ToolRegistry class
- `backend/chat/tools/executor.js` - ToolExecutor class with validation
- `backend/chat/tools/handlers.js` - Built-in tool handlers (math_eval, echo)
- `backend/chat/tools/manager.js` - ToolManager coordinator
- `frontend/src/ToolTesting.jsx` - Testing interface component
- `backend/chat/models/validation-tracker.js` - Model validation tracking

**Modified Files**:
- `backend/chat/lib/response-generator.js` - Add `_generateWithTools()` method and Phase 6b loop
- `backend/chat/ai-providers/providers/OpenAIProvider.js` - Pass tools, parse tool_calls
- `backend/chat/ai-providers/providers/OllamaProvider.js` - Add tool support (Ollama 0.1.26+)
- `backend/chat/ai-providers/providers/GeminiProvider.js` - Add function calling with format conversion
- `backend/chat/server.js` - Add `/api/tools/list` and `/api/tools/test` endpoints

**Configuration Schema**:
- Add global `tools` section with registry, max_iterations, default_timeout_ms
- Add per-response-handler `tools` config with enabled, allowed_tools, max_iterations

**Dependencies**:
- `mathjs` library for calculator tool (builtin handler)

**Testing**:
- Unit tests for registry, executor, validation
- Integration tests for full tool calling flow
- Manual testing via ToolTesting UI

**Timeline**: 4 weeks (Phase 1: Core infrastructure, Phase 2: Multi-provider, Phase 3: Testing UI, Phase 4: Validation & polish)
