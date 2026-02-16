# Testing Model Tool Usage with Flex Chat

**Status**: Living Document  
**Last Updated**: 2026-02-13  
**Purpose**: Guide for testing whether AI models can effectively use tools/function calling with Flex Chat

---

## Current State

### What Flex Chat Has Now

✅ **Capability Detection**:
- Providers (OpenAI, Gemini, etc.) track tool/function-calling as a model capability
- Frontend displays 🔧 badge for models with function-calling support
- Model metadata includes capabilities array

✅ **Tool Calling Implementation**:
- **Tool registry**: Config defines `tools.registry` (builtin tools); Config Builder has a Tools tab to enable/disable them
- **Response handler integration**: Handlers can set `tools.enabled` (and optionally `tools.max_iterations`); when matched, Phase 6b runs
- **Phase 6b**: Response generation extends into a tool execution loop: the system passes tool definitions to the LLM, executes tool calls via the registry, and continues until the model returns a final text response
- **Builtin tools**: Manifest defines available builtins; tools are executed in Node and results are fed back to the model

❌ **Not yet**:
- No MCP (Model Context Protocol) integration
- Custom tool definitions (beyond builtins) are not yet configurable in the UI

### Architecture Context

Flex Chat uses a **6-phase linear flow** with an optional **Phase 6b** when tools are enabled:

1. Topic Detection → 2. RAG Collection → 3. Intent Detection → 4. Profile Building → 5. Response Handler Matching → 6. Response Generation (or Phase 6b tool loop)

When a response handler has `tools.enabled` and the selected model supports tool calling, Phase 6 becomes a tool execution loop (Phase 6b) until the model returns a normal stop. See [ARCHITECTURE.md](ARCHITECTURE.md) and [TOOL_CALLING_SPECIFICATION.md](TOOL_CALLING_SPECIFICATION.md).

---

## Approaches for Testing Tool Usage

### Approach 1: Simulated Tool Testing (Recommended for Initial Testing)

**Concept**: Use response handlers to simulate tool behavior without implementing full tool calling.

**How it works**:
1. Create a test collection with "tool documentation" (descriptions of available tools)
2. Configure response handlers that instruct the model to "use tools" via natural language
3. Evaluate whether the model:
   - Recognizes when tools are needed
   - Requests tools correctly
   - Uses tool results appropriately

**Example Configuration**:
```json
{
  "responses": [
    {
      "match": {
        "intent": "tool_usage_test"
      },
      "llm": "openai",
      "model": "gpt-4o",
      "prompt": "You have access to these tools:\n\n{{rag_context}}\n\nWhen the user asks a question, you should:\n1. Identify which tool(s) to use\n2. Describe what you would call\n3. Use the tool results to answer\n\nFormat your response as:\nTOOL_CALL: tool_name(params)\nRESULT: [simulated result]\nANSWER: [final answer]"
    }
  ]
}
```

**Pros**:
- Works with current flex-chat architecture
- No code changes needed
- Can test multiple models quickly
- Easy to iterate on test scenarios

**Cons**:
- Not true tool calling (model generates text, doesn't execute)
- Can't test actual tool execution
- Relies on model's ability to follow instructions

---

### Approach 2: Extend Response Generation with Tool Support

**Concept**: Add actual function calling support to Phase 6.

**What needs to be built**:

1. **Tool Definition in Configuration**:
```json
{
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "City name"
          },
          "units": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"],
            "default": "celsius"
          }
        },
        "required": ["location"]
      }
    }
  ]
}
```

2. **Tool Execution Layer**:
   - Parse model's tool call requests
   - Execute tools (mock or real)
   - Return results to model
   - Allow model to continue with tool results

3. **Response Handler Integration**:
   - Add `tools` field to response handlers
   - Enable tools per handler (some handlers use tools, others don't)
   - Template variable: `{{tool_results}}`

**Implementation Points**:
- `backend/chat/lib/response-generator.js` - Add tool calling logic
- `backend/chat/ai-providers/providers/OpenAIProvider.js` - Support `tools` parameter in API calls
- Configuration schema - Add `tools` section

**Pros**:
- Tests actual tool calling capability
- Can test tool execution correctness
- More realistic evaluation

**Cons**:
- Requires significant development
- Need to build tool execution infrastructure
- More complex testing setup

---

### Approach 3: MCP Integration (Future)

**Concept**: Use Model Context Protocol for standardized tool integration.

**Status**: Mentioned in PROJECT.md as Phase 4 (longer-term vision)

**What MCP provides**:
- Standardized tool definition format
- Tool discovery and registration
- Tool execution protocol
- Multi-model support

**When to use**:
- After MCP support is implemented
- For production tool integration
- For standardized tool testing

---

## Recommended Testing Strategy

### Phase 1: Baseline Testing (No Code Changes)

**Goal**: Understand current model behavior with tool-like instructions

**Setup**:
1. Create test collection: `tool_testing_docs`
2. Add documents describing "available tools":
   ```
   Tool: calculate
   Description: Performs mathematical calculations
   Parameters: expression (string) - e.g., "2+2", "sqrt(16)"
   
   Tool: lookup
   Description: Looks up information in a knowledge base
   Parameters: query (string) - search term
   ```

3. Create test queries:
   - "What is 15 * 23 + 7?"
   - "Look up information about Python decorators"
   - "Calculate the square root of 144"

4. Configure response handler:
```json
{
  "match": {
    "collection": "tool_testing_docs"
  },
  "llm": "openai",
  "model": "gpt-4o",
  "prompt": "You have access to tools described in the context below.\n\n{{rag_context}}\n\nWhen answering, show:\n1. Which tool you would use\n2. What parameters you would pass\n3. How you would use the result\n\nFormat: TOOL: name(params) → RESULT → ANSWER"
}
```

**Evaluation Criteria**:
- ✅ Model identifies correct tool
- ✅ Model provides correct parameters
- ✅ Model uses tool result appropriately
- ❌ Model ignores tools, answers directly
- ❌ Model hallucinates tool parameters

---

### Phase 2: Structured Tool Testing (Minimal Code Changes)

**Goal**: Test with structured tool definitions (JSON schema)

**Setup**:
1. Create tool definitions as JSON documents in collection
2. Use system prompt to enforce structured output
3. Parse model responses to validate tool call format

**Example Tool Definition Document**:
```json
{
  "id": "tool-calc",
  "text": "Tool: calculate\nType: function\nParameters: {\"expression\": \"string\"}\nReturns: number",
  "metadata": {
    "tool_name": "calculate",
    "tool_type": "function"
  }
}
```

**Response Handler**:
```json
{
  "prompt": "You must respond in this exact JSON format:\n{\n  \"tool_call\": {\"name\": \"tool_name\", \"params\": {...}},\n  \"reasoning\": \"why you chose this tool\",\n  \"answer\": \"final answer using tool result\"\n}\n\nAvailable tools:\n{{rag_context}}"
}
```

**Evaluation**:
- Parse JSON response
- Validate tool call structure
- Check parameter correctness
- Verify tool selection logic

---

### Phase 3: Full Tool Implementation (Development Required)

**Goal**: Implement actual tool calling in flex-chat

**Development Tasks**:

1. **Add Tool Configuration Schema**:
   - `config/schema/config-schema.json` - Add `tools` section
   - Support OpenAPI-style tool definitions

2. **Extend Response Generator**:
   - `backend/chat/lib/response-generator.js`
   - Add tool calling loop:
     ```
     while (model wants to call tool):
       - Parse tool call from model
       - Execute tool
       - Add tool result to conversation
       - Continue generation
     ```

3. **Tool Execution Layer**:
   - Create `backend/chat/lib/tool-executor.js`
   - Support mock tools for testing
   - Support real tools (API calls, calculations, etc.)

4. **Provider Integration**:
   - `OpenAIProvider.generateChat()` - Add `tools` parameter
   - Handle `tool_calls` in response
   - Support `tool` role in messages

5. **Testing Framework**:
   - Test suite for tool calling scenarios
   - Mock tool implementations
   - Validation of tool usage correctness

**Example Implementation**:
```javascript
// backend/chat/lib/tool-executor.js
class ToolExecutor {
  constructor(tools) {
    this.tools = tools;
  }

  async execute(toolName, params) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Tool ${toolName} not found`);
    
    // Mock implementation for testing
    if (tool.mock) {
      return tool.mock(params);
    }
    
    // Real implementation
    return await tool.handler(params);
  }
}
```

---

## Test Scenarios

### Scenario 1: Simple Tool Selection
**Query**: "What's the weather in Paris?"
**Expected**: Model identifies `get_weather` tool, calls with `location: "Paris"`

### Scenario 2: Multi-Tool Usage
**Query**: "Calculate 15% tip on a $45 bill, then convert to euros"
**Expected**: Model uses `calculate` tool twice, then `convert_currency` tool

### Scenario 3: Tool Chaining
**Query**: "Look up the capital of France, then get weather there"
**Expected**: Model uses `lookup` tool, extracts result, uses it as parameter for `get_weather`

### Scenario 4: Error Handling
**Query**: "Get weather for InvalidCity123"
**Expected**: Model handles tool error gracefully, explains issue

### Scenario 5: Tool vs Direct Answer
**Query**: "What is 2+2?"
**Expected**: Model either uses `calculate` tool OR answers directly (both acceptable, but tool usage preferred for testing)

---

## Evaluation Metrics

### Tool Usage Correctness
- **Tool Selection Accuracy**: % of queries where correct tool is selected
- **Parameter Accuracy**: % of tool calls with correct parameters
- **Tool Chaining**: Ability to use multiple tools in sequence
- **Error Recovery**: Handling of tool errors appropriately

### Response Quality
- **Answer Correctness**: Final answer is correct
- **Tool Integration**: Tool results are used appropriately
- **Natural Language**: Response reads naturally despite tool usage

### Model Comparison
- Compare different models on same test suite
- Track which models handle tools better
- Identify model-specific tool calling patterns

---

## Implementation Roadmap

### Immediate (No Code)
1. ✅ Create tool testing collection
2. ✅ Design test queries
3. ✅ Configure response handlers for simulated tool testing
4. ✅ Run baseline tests on multiple models
5. ✅ Document findings

### Short-term (Minimal Code)
1. Add structured tool definitions to collections
2. Enhance prompts for JSON-structured tool calls
3. Build simple parser for tool call validation
4. Create test evaluation script

### Medium-term (Full Implementation)
1. Design tool configuration schema
2. Implement tool execution layer
3. Extend response generator with tool calling
4. Add tool support to OpenAI provider
5. Create comprehensive test suite

### Long-term (MCP Integration)
1. Research MCP specification
2. Design MCP adapter for flex-chat
3. Implement MCP server/client
4. Migrate tool definitions to MCP format

---

## Example Test Collection Setup

### Collection: `tool_testing`

**Document 1: Calculator Tool**
```
Tool Name: calculate
Description: Performs mathematical calculations on numeric expressions
Parameters:
  - expression (string, required): Mathematical expression to evaluate
    Examples: "2+2", "sqrt(16)", "15 * 23 + 7"
Returns: number - The calculated result
```

**Document 2: Lookup Tool**
```
Tool Name: lookup
Description: Searches a knowledge base for information
Parameters:
  - query (string, required): Search query
  - max_results (number, optional): Maximum results to return (default: 5)
Returns: array of objects with 'title' and 'content' fields
```

**Document 3: Weather Tool**
```
Tool Name: get_weather
Description: Gets current weather conditions for a location
Parameters:
  - location (string, required): City name or coordinates
  - units (string, optional): "celsius" or "fahrenheit" (default: "celsius")
Returns: object with 'temperature', 'condition', 'humidity' fields
```

---

## Next Steps

1. **Start with Phase 1**: Create test collection and run baseline tests
2. **Document findings**: Which models handle tool-like instructions best?
3. **Design tool schema**: Based on test results, design actual tool configuration
4. **Implement incrementally**: Start with simple tools, add complexity
5. **Build test suite**: Automated evaluation of tool usage

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and 6-phase flow
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration system
- [REASONING_MODELS.md](REASONING_MODELS.md) - Two-stage generation (similar pattern to tool calling)
- [PROJECT_STATUS.md](../PROJECT_STATUS.md) - Roadmap and vision (including MCP integration)

---

## Questions to Consider

1. **What types of tools do you want to test?**
   - Simple calculations?
   - API calls?
   - Database queries?
   - File operations?

2. **What models do you want to test?**
   - OpenAI models (gpt-4o, gpt-4o-mini) - have function calling
   - Ollama models - may need different approach
   - Other providers?

3. **What's the primary goal?**
   - Model comparison (which models use tools best)?
   - Tool design validation (are tools well-designed)?
   - Integration testing (does tool calling work end-to-end)?

4. **Do you need real tool execution or is simulation sufficient?**
   - Mock tools are easier for testing
   - Real tools test actual integration

---

*This document is a living guide. Update as you discover what works best for your testing needs.*
