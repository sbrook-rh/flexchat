## 1. Dependencies & Configuration

- [ ] 1.1 Add `mathjs` to package.json in backend/chat
- [ ] 1.2 Add global `tools` section to config schema with enabled, max_iterations, default_timeout_ms, registry fields
- [ ] 1.3 Add per-response-handler `tools` section to config schema with enabled, allowed_tools, max_iterations
- [ ] 1.4 Create example config snippet documenting tool definitions (mock, builtin, internal)

## 2. Tool Registry

- [ ] 2.1 Create `backend/chat/tools/registry.js` with ToolRegistry class
- [ ] 2.2 Implement `register(tool)` with validation (name, description, parameters schema)
- [ ] 2.3 Implement `get(name)`, `has(name)`, `list()` methods
- [ ] 2.4 Implement `toProviderFormat(provider, allowedTools)` for openai/ollama format
- [ ] 2.5 Implement `toProviderFormat()` for gemini format (functionDeclarations)
- [ ] 2.6 Reject HTTP tool registration with informative v2 message
- [ ] 2.7 Write unit tests for ToolRegistry

## 3. Tool Handlers

- [ ] 3.1 Create `backend/chat/tools/handlers.js` with ToolHandlers class
- [ ] 3.2 Implement `math_eval` builtin handler using mathjs library
- [ ] 3.3 Implement `echo` handler for testing
- [ ] 3.4 Implement `register(name, fn)` and `get(name)` methods
- [ ] 3.5 Write unit tests for builtin handlers

## 4. Tool Executor

- [ ] 4.1 Create `backend/chat/tools/executor.js` with ToolExecutor class
- [ ] 4.2 Implement `_validateParameters(tool, params)` checking required fields, types, and enums
- [ ] 4.3 Implement `_executeMock(tool, params)` returning mock_response
- [ ] 4.4 Implement `_executeBuiltin(tool, params)` via handlers registry
- [ ] 4.5 Implement `_executeInternal(tool, params)` via handlers registry
- [ ] 4.6 Implement `execute(name, params)` with error handling and execution_time_ms tracking
- [ ] 4.7 Ensure all failure modes return `{success: false, error, tool_name, execution_time_ms}`
- [ ] 4.8 Write unit tests for ToolExecutor (each failure mode, each tool type)

## 5. Tool Manager

- [ ] 5.1 Create `backend/chat/tools/manager.js` with ToolManager class
- [ ] 5.2 Implement `loadTools()` iterating config.tools.registry
- [ ] 5.3 Implement `isEnabled()`, `getMaxIterations()`, `getDefaultTimeout()` methods
- [ ] 5.4 Instantiate ToolManager in server.js and pass to request handlers
- [ ] 5.5 Write unit tests for ToolManager

## 6. Response Generator - Tool Loop

- [ ] 6.1 Add `toolManager` parameter to `generateResponse()` signature
- [ ] 6.2 Add tools-enabled check (toolManager && isEnabled() && responseRule.tools.enabled)
- [ ] 6.3 Create `_generateWithTools(provider, responseRule, messages, options, toolManager)` method
- [ ] 6.4 Implement iteration loop with max_iterations enforcement
- [ ] 6.5 Handle `finish_reason: 'stop'` and `'end_turn'` (return final response)
- [ ] 6.6 Handle `finish_reason: 'tool_calls'` (execute tools, add messages, continue loop)
- [ ] 6.7 Add assistant message with tool_calls to messages array
- [ ] 6.8 Parse tool arguments (JSON.parse) and execute via toolExecutor
- [ ] 6.9 Add tool result message to messages array (role: 'tool', tool_call_id, name, content)
- [ ] 6.10 Track all tool calls in toolCalls array, include in response
- [ ] 6.11 Handle max_iterations_reached (return warning message + flag)
- [ ] 6.12 Handle unexpected finish_reason (log warning, return partial response)
- [ ] 6.13 Write integration tests for tool calling loop (mock provider, mock tools)

## 7. OpenAI Provider - Tool Calling

- [ ] 7.1 Add tools to request body when options.tools exists: `{tools, tool_choice: 'auto'}`
- [ ] 7.2 Extract `tool_calls` from choice.message when present
- [ ] 7.3 Include `tool_calls` in response object when present
- [ ] 7.4 Ensure `finish_reason` is passed through from API response
- [ ] 7.5 Write tests for OpenAI provider tool calling response parsing

## 8. Ollama Provider - Tool Calling

- [ ] 8.1 Add tools to request body when options.tools exists
- [ ] 8.2 Detect `message.tool_calls` in Ollama response
- [ ] 8.3 Set `finish_reason: 'tool_calls'` when tool_calls present
- [ ] 8.4 Pass through tool_calls in response object
- [ ] 8.5 Write tests for Ollama provider tool calling

## 9. Gemini Provider - Tool Calling

- [ ] 9.1 Implement `_convertToolsToGeminiFormat(tools)` → functionDeclarations format
- [ ] 9.2 Pass tools parameter to `geminiModel.startChat()`
- [ ] 9.3 Detect `response.functionCalls()` and check for tool calls
- [ ] 9.4 Implement `_convertGeminiToolCalls(functionCalls)` → OpenAI format with call_${index} IDs
- [ ] 9.5 Set `finish_reason: 'tool_calls'` when function calls detected
- [ ] 9.6 Write tests for Gemini provider tool calling and format conversion

## 10. API Endpoints

- [ ] 10.1 Add `GET /api/tools/list` endpoint returning registered tools
- [ ] 10.2 Add `POST /api/tools/test` endpoint with {query, model} body
- [ ] 10.3 Create test response rule inside test endpoint (all tools allowed)
- [ ] 10.4 Handle missing parameters with 400 response
- [ ] 10.5 Handle execution errors with 500 response and logging
- [ ] 10.6 Write integration tests for both endpoints

## 11. Model Validation Tracker

- [ ] 11.1 Create `backend/chat/models/validation-tracker.js` with ModelValidationTracker class
- [ ] 11.2 Implement `recordSuccess(modelId, testDetails)` updating validation record
- [ ] 11.3 Implement `recordFailure(modelId, error)` with 80% success rate recalculation
- [ ] 11.4 Implement `isValidated(modelId)` and `getStatus(modelId)`
- [ ] 11.5 Implement `save(filePath)` and `load(filePath)` for file persistence
- [ ] 11.6 Integrate tracker with test endpoint (record results after test)
- [ ] 11.7 Write unit tests for validation calculations

## 12. Tool Testing UI

- [ ] 12.1 Create `frontend/src/ToolTesting.jsx` component
- [ ] 12.2 Implement tool list display with name, description, implementation type badge
- [ ] 12.3 Implement model selection dropdown with function-calling 🔧 indicator
- [ ] 12.4 Implement test query input with placeholder text
- [ ] 12.5 Implement Run Test button with loading state
- [ ] 12.6 Implement results section with tool calls display (name, params, result, iteration, time)
- [ ] 12.7 Implement final response display
- [ ] 12.8 Implement metadata display (model, service, max_iterations_reached warning)
- [ ] 12.9 Implement example test scenarios grid (4 clickable cards)
- [ ] 12.10 Add route `/tools-testing` in frontend routing
- [ ] 12.11 Add "Tool Testing" link to NavigationSidebar

## 13. Validation UI Integration

- [ ] 13.1 Pass ModelValidationTracker to model listing components
- [ ] 13.2 Show 🔧✓ badge for validated models in tool testing UI
- [ ] 13.3 Show 🔧⚠️ badge for unvalidated tool-capable models
- [ ] 13.4 Record test results in validation tracker from test endpoint
- [ ] 13.5 Expose `/api/tools/validation` endpoint for validation status

## 14. Manual Testing & Validation

- [ ] 14.1 Test tool calling with OpenAI GPT-4o (weather mock, calculator)
- [ ] 14.2 Test tool calling with Ollama llama3.2 (verify tool support)
- [ ] 14.3 Test tool calling with Gemini (verify function calling)
- [ ] 14.4 Test max_iterations enforcement (configure low limit, verify behavior)
- [ ] 14.5 Test error handling (request non-existent tool, invalid params)
- [ ] 14.6 Verify ToolTesting UI end-to-end across all providers
- [ ] 14.7 Test backward compatibility (existing handlers without tools still work)
