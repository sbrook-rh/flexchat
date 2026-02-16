# Reasoning Models - Two-Stage Response Generation

**Status**: Planned feature for v2.1+  
**Architecture**: Built into Response Handlers

---

## Overview

Reasoning models enable a two-stage pipeline for complex queries:

1. **Reasoning Stage**: Model performs deep analysis with step-by-step thinking
2. **Response Stage**: Model formats a clean, user-friendly answer based on the reasoning

This separation allows:
- Better quality responses for complex queries
- Cost optimization (reason with large model, respond with efficient model)
- Clearer thinking process separate from final communication
- Transparency (users can see the "thinking" in streaming mode)

---

## Architecture

### Request Flow with Reasoning

```
User Query: "Explain how Kubernetes networking works"
    ↓
[Phase 1-4: Topic, RAG, Intent, Profile Building]
    ↓
Profile: { intent: "kubernetes", reasoning: true, ... }
    ↓
[Phase 5: Response Handler Matching]
    Match: { intent: "kubernetes", reasoning: true }
    ↓
[Phase 6: Reasoning Stage (optional)]
    Prompt: reasoning_prompt
    Model: llama3.1:8b (or user-selected reasoning model)
    Output: "Let me think through this step-by-step... [analysis]"
    ↓
[Phase 6: Response Stage]
    Prompt: prompt (with {{reasoning}} variable populated)
    Model: llama3.2:3b (or response model)
    Input: Reasoning output + original query + RAG context
    Output: "Kubernetes networking works like this: [clean answer]"
    ↓
Final Response to User
```

---

## Configuration

### Response Handler with Reasoning

Add a `reasoning` configuration to any response handler:

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
        "prompt": "The user would like a detailed approach to their query.\nThe following context may be helpful:\n\n{{rag_context}}\n\nThink through this step-by-step..."
      },
      "llm": "local",
        "model": "qwen2.5:7b-instruct",
      "max_tokens": 500,
      "prompt": "Based on this analysis:\n\n{{reasoning}}\n\nProvide a clear, well-formatted recipe."
    }
  ]
}
```

### Configuration Fields

**Response Handler Fields:**
- `reasoning`: Configuration object for reasoning stage (presence enables two-stage reasoning)
- `reasoning.model`: Model to use for reasoning stage (can be different from response model)
- `reasoning.prompt`: System prompt for reasoning stage (can use `{{rag_context}}` and other variables)
- `reasoning.max_tokens`: Optional token limit for reasoning stage
- `llm`: LLM service for response stage
- `model`: Model for response stage
- `prompt`: System prompt for response stage (use `{{reasoning}}` to include reasoning output)

**Match Criteria:**
- `service`: RAG service name
- `intent_regexp`: Regex pattern for intent matching
- `reasoning: true` - Match only when reasoning is needed
- `reasoning: false` - Match only for non-reasoning requests
- Omit `reasoning` - Match regardless of reasoning status

**Profile Field:**
- `profile.reasoning`: Boolean indicating if reasoning should be used
- Set based on query complexity, user preference, or explicit configuration

---

## How Reasoning is Determined

### Option 1: Explicit Match (Simplest)

Different handlers for reasoning vs. non-reasoning:

```json
{
  "responses": [
    {
      "match": { "service": "recipes", "intent": "recipe", "reasoning": true },
      "reasoning": {
        "model": "deepseek-r1:14b",
        "prompt": "Think through the cooking process carefully.\n\n{{rag_context}}"
      },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "prompt": "Based on analysis:\n\n{{reasoning}}\n\n..."
    },
    {
      "match": { "service": "recipes", "intent": "recipe", "reasoning": false },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "prompt": "You are a cooking expert. Use this context:\n\n{{rag_context}}"
    }
  ]
}
```

Profile sets `reasoning: true/false` based on:
- Query complexity detection (contains "explain", "analyze", etc.)
- User preference (toggle in UI)
- Collection metadata (complex topics always use reasoning)

### Option 2: Always-On (Per Handler)

Handler always uses reasoning when matched:

```json
{
  "responses": [
    {
      "match": { "service": "tech_docs", "intent": "kubernetes" },
      "reasoning": {
        "model": "deepseek-r1:14b",
        "prompt": "Analyze this technical question thoroughly.\n\n{{rag_context}}"
      },
      "llm": "local",
      "model": "qwen2.5:7b-instruct",
      "prompt": "Based on analysis:\n\n{{reasoning}}\n\n..."
    }
  ]
}
```

No `reasoning` in match criteria = always uses reasoning for this handler.

---

## Template Variables

### In Response Prompt

- `{{reasoning}}`: Full output from reasoning stage
- `{{rag_context}}`: RAG documents (available in both stages)
- `{{topic}}`: Current conversation topic
- All standard variables available

### In Reasoning Prompt

- `{{rag_context}}`: RAG documents
- `{{topic}}`: Current conversation topic
- `{{intent}}`: Detected intent
- No `{{reasoning}}` (not yet generated)

---

## Streaming Integration

When streaming is enabled (future feature), reasoning shows separately:

```
[Phase Indicator] 🧠 Thinking...
  [Streaming reasoning output - optionally shown in expandable section]

[Phase Indicator] 💬 Responding...
  [Streaming final response]
  
✅ Complete
```

Users can:
- See the reasoning process in real-time
- Collapse/expand the "thinking" section
- Understand how the AI arrived at its answer

---

## Benefits

### Quality
- More thorough analysis before generating response
- Step-by-step thinking leads to better answers
- Separates "thinking" from "communication"

### Cost Optimization
- Use expensive model only for reasoning
- Use efficient model for final response
- Reduce tokens in response stage (reasoning already done)

### Transparency
- Users see the thinking process (in streaming mode)
- Builds trust through explainability
- Helpful for debugging and validation

### Flexibility
- Configure per intent/collection
- Mix reasoning and non-reasoning handlers
- User can toggle reasoning preference (future)

---

## Implementation Status

**Current (v2.0)**: Not implemented

**Planned (v2.1+)**:
1. Add `reasoning` field to profile object
2. Add `reasoning` configuration to response handlers
3. Implement two-stage generation in `response-generator.js`
4. Add `{{reasoning}}` template variable substitution
5. Add reasoning detection logic (query complexity, user preference)
6. Add match criteria support for `reasoning: true/false`

**Future Enhancements**:
- User toggle for reasoning preference in UI
- Real-time streaming of reasoning process
- Collapsible reasoning section in chat
- Reasoning model selection in UI
- Per-collection reasoning configuration

---

## Example Use Cases

### 1. Technical Documentation

```json
{
  "match": { "service": "tech_docs", "collection": "kubernetes_docs", "reasoning": true },
  "reasoning": {
    "model": "deepseek-r1:14b",
    "prompt": "Analyze the technical concepts thoroughly. Break down complex ideas.\n\n{{rag_context}}"
  },
  "llm": "local",
  "model": "qwen2.5:7b-instruct",
  "prompt": "Based on this technical analysis:\n\n{{reasoning}}\n\nExplain clearly to the user."
}
```

### 2. Complex Recipes

```json
{
  "match": { "service": "recipes", "intent_regexp": "/(recipe|cooking)/", "rag_result": "match" },
  "reasoning": {
    "model": "deepseek-r1:14b",
    "prompt": "Think through the cooking process, ingredient interactions, and techniques.\n\n{{rag_context}}"
  },
  "llm": "local",
  "model": "qwen2.5:7b-instruct",
  "prompt": "Using this analysis:\n\n{{reasoning}}\n\nProvide a clear, step-by-step recipe."
}
```

### 3. General Chat (No Reasoning)

```json
{
  "match": { "intent": "general" },
  "llm": "local",
  "model": "qwen2.5:7b-instruct",
  "prompt": "You are a friendly chatbot. Keep responses brief."
}
```

No `reasoning` configured = simple single-stage response.

---

## Related Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Response handler matching and generation
- **[CONFIGURATION.md](CONFIGURATION.md)**: Complete configuration reference
- **PROJECT_STATUS.md**: Roadmap; streaming responses are listed under current priorities

---

## Notes

- Reasoning is **opt-in per response handler**
- Not all queries need reasoning (simple questions work better without it)
- When streaming is implemented, reasoning visibility will be a key UX feature
- Consider token costs: reasoning stage can be expensive with large models
- Test thoroughly: some models are better at reasoning than others
