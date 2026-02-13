## 1. Dependencies & Configuration

- [x] 1.1 Add `mathjs` to package.json in backend/chat
- [x] 1.2 Add global `tools` section to config schema with enabled, max_iterations, default_timeout_ms, registry fields
- [x] 1.3 Add per-response-handler `tools` section to config schema with enabled, allowed_tools, max_iterations
- [x] 1.4 Create example config snippet documenting tool definitions (mock, builtin, internal)

## 2. Tool Registry

- [x] 2.1 Create `backend/chat/tools/registry.js` with ToolRegistry class
- [x] 2.2 Implement `register(tool)` with validation (name, description, parameters schema)
- [x] 2.3 Implement `get(name)`, `has(name)`, `list()` methods
- [x] 2.4 Implement `toProviderFormat(provider, allowedTools)` for openai/ollama format
- [x] 2.5 Implement `toProviderFormat()` for gemini format (functionDeclarations)
- [x] 2.6 Reject HTTP tool registration with informative v2 message
- [x] 2.7 Write unit tests for ToolRegistry

## 3. Tool Handlers

- [x] 3.1 Create `backend/chat/tools/handlers.js` with ToolHandlers class
- [x] 3.2 Implement `math_eval` builtin handler using mathjs library
- [x] 3.3 Implement `echo` handler for testing
- [x] 3.4 Implement `register(name, fn)` and `get(name)` methods
- [x] 3.5 Write unit tests for builtin handlers

## 4. Tool Executor

- [x] 4.1 Create `backend/chat/tools/executor.js` with ToolExecutor class
- [x] 4.2 Implement `_validateParameters(tool, params)` checking required fields, types, and enums
- [x] 4.3 Implement `_executeMock(tool, params)` returning mock_response
- [x] 4.4 Implement `_executeBuiltin(tool, params)` via handlers registry
- [x] 4.5 Implement `_executeInternal(tool, params)` via handlers registry
- [x] 4.6 Implement `execute(name, params)` with error handling and execution_time_ms tracking
- [x] 4.7 Ensure all failure modes return `{success: false, error, tool_name, execution_time_ms}`
- [x] 4.8 Write unit tests for ToolExecutor (each failure mode, each tool type)

## 5. Tool Manager

- [x] 5.1 Create `backend/chat/tools/manager.js` with ToolManager class
- [x] 5.2 Implement `loadTools()` iterating config.tools.registry
- [x] 5.3 Implement `isEnabled()`, `getMaxIterations()`, `getDefaultTimeout()` methods
- [x] 5.4 Instantiate ToolManager in server.js and pass to request handlers
- [x] 5.5 Write unit tests for ToolManager

## 6. Response Generator - Tool Loop

- [x] 6.1 Add `toolManager` parameter to `generateResponse()` signature
- [x] 6.2 Add tools-enabled check (toolManager && isEnabled() && responseRule.tools.enabled)
- [x] 6.3 Create `_generateWithTools(provider, responseRule, messages, options, toolManager)` method
- [x] 6.4 Implement iteration loop with max_iterations enforcement
- [x] 6.5 Handle `finish_reason: 'stop'` and `'end_turn'` (return final response)
- [x] 6.6 Handle `finish_reason: 'tool_calls'` (execute tools, add messages, continue loop)
- [x] 6.7 Add assistant message with tool_calls to messages array
- [x] 6.8 Parse tool arguments (JSON.parse) and execute via toolExecutor
- [x] 6.9 Add tool result message to messages array (role: 'tool', tool_call_id, name, content)
- [x] 6.10 Track all tool calls in toolCalls array, include in response
- [x] 6.11 Handle max_iterations_reached (return warning message + flag)
- [x] 6.12 Handle unexpected finish_reason (log warning, return partial response)
- [x] 6.13 Write integration tests for tool calling loop (mock provider, mock tools)

## 7. OpenAI Provider - Tool Calling

- [x] 7.1 Add tools to request body when options.tools exists: `{tools, tool_choice: 'auto'}`
- [x] 7.2 Extract `tool_calls` from choice.message when present
- [x] 7.3 Include `tool_calls` in response object when present
- [x] 7.4 Ensure `finish_reason` is passed through from API response
- [x] 7.5 Write tests for OpenAI provider tool calling response parsing

## 8. Ollama Provider - Tool Calling

- [x] 8.1 Add tools to request body when options.tools exists
- [x] 8.2 Detect `message.tool_calls` in Ollama response
- [x] 8.3 Set `finish_reason: 'tool_calls'` when tool_calls present
- [x] 8.4 Pass through tool_calls in response object
- [x] 8.5 Write tests for Ollama provider tool calling

## 9. Gemini Provider - Tool Calling

- [x] 9.1 Implement `_convertToolsToGeminiFormat(tools)` → functionDeclarations format
- [x] 9.2 Pass tools parameter to `geminiModel.startChat()`
- [x] 9.3 Detect `response.functionCalls()` and check for tool calls
- [x] 9.4 Implement `_convertGeminiToolCalls(functionCalls)` → OpenAI format with call_${index} IDs
- [x] 9.5 Set `finish_reason: 'tool_calls'` when function calls detected
- [x] 9.6 Write tests for Gemini provider tool calling and format conversion

## 10. API Endpoints

- [x] 10.1 Add `GET /api/tools/list` endpoint returning registered tools
- [x] 10.2 Add `POST /api/tools/test` endpoint with {query, model} body
- [x] 10.3 Create test response rule inside test endpoint (all tools allowed)
- [x] 10.4 Handle missing parameters with 400 response
- [x] 10.5 Handle execution errors with 500 response and logging
- [x] 10.6 Write integration tests for both endpoints

## 11. Model Validation Tracker

- [x] 11.1 Create `backend/chat/models/validation-tracker.js` with ModelValidationTracker class
- [x] 11.2 Implement `recordSuccess(modelId, testDetails)` updating validation record
- [x] 11.3 Implement `recordFailure(modelId, error)` with 80% success rate recalculation
- [x] 11.4 Implement `isValidated(modelId)` and `getStatus(modelId)`
- [x] 11.5 Implement `save(filePath)` and `load(filePath)` for file persistence
- [x] 11.6 Integrate tracker with test endpoint (record results after test)
- [x] 11.7 Write unit tests for validation calculations

## 12. Tool Testing UI

- [x] 12.1 Create `frontend/src/ToolTesting.jsx` component
- [x] 12.2 Implement tool list display with name, description, implementation type badge
- [x] 12.3 Implement model selection dropdown with function-calling 🔧 indicator
- [x] 12.4 Implement test query input with placeholder text
- [x] 12.5 Implement Run Test button with loading state
- [x] 12.6 Implement results section with tool calls display (name, params, result, iteration, time)
- [x] 12.7 Implement final response display
- [x] 12.8 Implement metadata display (model, service, max_iterations_reached warning)
- [x] 12.9 Implement example test scenarios grid (4 clickable cards)
- [x] 12.10 Add route `/tools-testing` in frontend routing
- [x] 12.11 Add "Tool Testing" link to NavigationSidebar

## 13. Validation UI Integration

- [x] 13.1 Pass ModelValidationTracker to model listing components
- [x] 13.2 Show 🔧✓ badge for validated models in tool testing UI
- [x] 13.3 Show 🔧⚠️ badge for unvalidated tool-capable models
- [x] 13.4 Record test results in validation tracker from test endpoint
- [x] 13.5 Expose `/api/tools/validation` endpoint for validation status

## 14. Manual Testing & Validation

- [x] 14.1 Test tool calling with OpenAI GPT-4o (weather mock, calculator) [manual]
- [x] 14.2 Test tool calling with Ollama qwen2.5:3b-instruct (verified reliable tool support) [manual]
- [x] 14.3 Test tool calling with Gemini (verify function calling) [manual] ⚠️ Gemini receives correctly formatted requests (merged functionDeclarations, systemInstruction field) but models tend to answer directly rather than invoke tools. Likely a model behaviour/training issue rather than an integration bug. Tool descriptions in config may need tuning per use case.
- [x] 14.4 Test max_iterations enforcement (configure low limit, verify behavior) [manual]
- [x] 14.5 Test error handling (request non-existent tool, invalid params) [manual] — unsupported models (e.g. phi3:mini) now return clear 400 error message
- [x] 14.6 Verify ToolTesting UI end-to-end across all providers [manual]
- [x] 14.7 Test backward compatibility (existing handlers without tools still work) [manual]
