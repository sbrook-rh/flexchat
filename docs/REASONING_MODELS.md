# Reasoning Models - Two-Stage Response Generation

## Overview

The reasoning model feature implements a two-stage pipeline for complex queries:

1. **Reasoning Stage**: Use a specialized model to perform deep analysis and step-by-step thinking
2. **Response Stage**: Use the target model to format a clean, user-friendly answer based on the reasoning

This separation allows:
- Better quality responses for complex queries
- Cost optimization (reason with large model, respond with efficient model)
- Clearer thinking process separate from communication

---

## Architecture

```
User Query: "Explain how Kubernetes networking works"
    ↓
[Detection: Does this need reasoning?]
    ↓ YES (contains "explain", complex topic)
    
[Reasoning Stage]
    Model: qwen2.5:32b-instruct (user's reasoning model selection)
    Prompt: "Think through this step-by-step. Analyze thoroughly."
    Output: Detailed technical analysis (may be verbose/technical)
    ↓
    
[Response Stage]
    Model: qwen2.5:7b-instruct (strategy's target model)
    Input: Reasoning output + original query + context
    Prompt: "Based on this analysis, provide a clear answer to: {query}"
    Output: Clean, well-formatted user response
    ↓
    
Final Response to User
```

---

## Configuration

### Minimal Configuration (Auto-detection)

```json
{
  "strategies": [
    {
      "name": "DYNAMIC_RAG",
      "response": {
        "provider": "ollama",
        "model": "qwen2.5:7b-instruct",
        "allow_model_selection": true,
        "reasoning": {
          "enabled": true
        }
      }
    }
  ]
}
```

This enables reasoning with:
- Auto-detection of reasoning models (deepseek, r1, etc.)
- User selects reasoning model in UI (or chooses "None")
- Default system prompts and response templates

### With Explicit Model List

Override auto-detection with specific models:

```json
"reasoning": {
  "enabled": true,
  "models": ["deepseek-r1:8b", "qwen2.5:32b-instruct"]
}
```

Only these models will be shown as reasoning options.

### With Additional Models

Extend auto-detection by including specific chat models:

```json
"reasoning": {
  "enabled": true,
  "include_models": ["qwen2.5:7b-instruct", "llama3:70b"]
}
```

Shows auto-detected reasoning models PLUS these additional models.

### With Custom Prompts (Advanced)

```json
"reasoning": {
  "enabled": true,
  "include_models": ["qwen2.5:7b-instruct"],
  "system_prompt": "Analyze this problem step-by-step. Break down complex concepts.",
  "response_prompt_template": "Based on this analysis:\n\n{reasoning}\n\nProvide a clear answer to: {query}"
}
```

### Configuration Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `enabled` | Yes | - | Enable reasoning for this strategy |
| `models` | No | null | Explicit list of reasoning models (overrides auto-detection) |
| `include_models` | No | [] | Additional models to include (extends auto-detection) |
| `system_prompt` | No | Generic reasoning prompt | System prompt for reasoning stage |
| `response_prompt_template` | No | Generic template | Template for response stage. Use `{reasoning}` and `{query}` placeholders |
| `response_max_tokens` | No | `max_tokens * 2` | Max tokens for final response (auto-doubled when reasoning used) |

### Default Prompts

**Default Reasoning System Prompt:**
```
"Think through this step-by-step. Break down the problem, analyze each part, 
and show your reasoning process clearly."
```

**Default Response Template:**
```
"Based on the following analysis:\n\n{reasoning}\n\n
Provide a clear, concise answer to the user's question: {query}"
```

---

## Model Classification

### Auto-Detection

Models are automatically classified as reasoning-capable based on:

**Ollama Models:**
- Parameter size ≥ 30B
- Name contains "instruct" or "chat"
- Examples: `qwen2.5:32b-instruct`, `llama3:70b-instruct`

**OpenAI Models:**
- Models with "o1" prefix (o1-preview, o1-mini)
- GPT-4 variants (optional)

**Gemini Models:**
- `gemini-1.5-pro` and larger

### Capabilities

Reasoning models have capabilities: `['chat', 'reasoning']`

This allows them to:
- Appear in reasoning model selector in UI
- Be used for both normal chat and reasoning tasks

---

## Detection

### LLM-Based Detection

Reasoning needs are detected using the configured `detection_provider`:

```json
{
  "detection_provider": {
    "provider": "ollama",
    "model": "qwen2.5:7b-instruct"
  }
}
```

**Detection Process:**
1. Send query to detection provider with classification prompt
2. Prompt: "Does this query require deep reasoning, step-by-step analysis, or complex problem-solving? Answer only YES or NO."
3. If response contains "YES" → trigger reasoning stage
4. Otherwise → use normal single-stage generation

**If `detection_provider` not configured:**
- Fall back to simple keyword detection
- Keywords: "explain", "why", "how does", "analyze", "step by step", "reasoning"
- This is less accurate but requires no extra LLM call

### Query Types That Trigger Reasoning

- **Explanations**: "Explain how X works", "Why does Y happen"
- **Analysis**: "Analyze this code", "What's wrong with..."
- **Complex problems**: "How do I debug...", "What's the best approach..."
- **Multi-step questions**: Questions requiring multiple steps to answer

---

## User Interface

### Model Selection

When reasoning is enabled for a provider, the UI shows two separate selectors:

```
┌────────────────────────────────────────┐
│ Model Selection                        │
├────────────────────────────────────────┤
│ Response Model                         │
│ Ollama: [▼ qwen2.5:7b-instruct       ] │
│                                        │
│ Reasoning Model                        │
│ Ollama: [▼ (None - use response model)] │
│            deepseek-r1:8b              │
│            qwen2.5:7b-instruct         │
│         🧠 Used for complex queries    │
└────────────────────────────────────────┘
```

By default, "(None)" is selected - reasoning is disabled until user selects a model.

### Response Indicators

When reasoning is triggered, users see progress:

```
🧠 Analyzing your question... (qwen2.5:32b-instruct)
💬 Generating response... (qwen2.5:7b-instruct)
```

### Viewing Reasoning Process (Future Feature)

*Planned feature - not yet implemented*

Allow users to expand and view the raw reasoning output:

```
Response from AI
[🧠 View reasoning process ▼]

When expanded:
┌─────────────────────────────────────┐
│ Reasoning Analysis                  │
│ (raw output from reasoning model)   │
└─────────────────────────────────────┘
```

---

## Provider Constraints

### Same-Provider Requirement

The reasoning model MUST be from the same provider as the strategy's response provider.

**Why?**
- Simpler configuration and state management
- Provider-specific authentication is already set up
- Avoids cross-provider API complexity

**Example:**
- Strategy uses `ollama` → reasoning model must be from Ollama
- Strategy uses `openai` → reasoning model must be from OpenAI

**What happens with mismatched providers?**
- User selection is ignored
- Falls back to default reasoning model for the strategy's provider

---

## Implementation Details

### Backend Flow

```javascript
async function generateResponse(strategy, userQuery, chatHistory, context, selectedModels) {
  const provider = strategy.response.provider;
  
  // 1. Check if reasoning is needed
  const needsReasoning = strategy.response.reasoning?.enabled && 
    await detectReasoningNeeded(userQuery);
  
  if (needsReasoning) {
    // 2. Get reasoning model (user selection or default)
    const reasoningModelKey = `${provider}_reasoning`;
    const reasoningModel = selectedModels[reasoningModelKey] || 
                          strategy.response.reasoning.default_model;
    
    // 3. Stage 1: Reasoning
    const reasoningMessages = [
      { 
        role: 'system', 
        content: strategy.response.reasoning.system_prompt ||
                 "Think through this step-by-step. Provide detailed analysis."
      },
      { role: 'user', content: userQuery }
    ];
    
    await aiService.setActiveProvider(provider);
    const reasoningResponse = await aiService.generateChat(reasoningMessages, {
      model: reasoningModel,
      max_tokens: 2000
    });
    
    // 4. Stage 2: Response using reasoning as context
    const responseModel = selectedModels[provider] || strategy.response.model;
    
    const responsePrompt = (strategy.response.reasoning.response_prompt_template ||
      "Based on this analysis:\n\n{reasoning}\n\nProvide a clear answer to: {query}")
      .replace('{reasoning}', reasoningResponse.content)
      .replace('{query}', userQuery);
    
    const responseMessages = [
      { role: 'system', content: strategy.response.system_prompt },
      ...chatHistoryMessages,
      { role: 'user', content: responsePrompt }
    ];
    
    const finalResponse = await aiService.generateChat(responseMessages, {
      model: responseModel,
      max_tokens: strategy.response.max_tokens
    });
    
    return {
      content: finalResponse.content,
      metadata: {
        reasoning_used: true,
        reasoning_model: reasoningModel,
        response_model: responseModel
      }
    };
  } else {
    // Normal single-stage generation
    return await generateNormalResponse(...);
  }
}
```

### Detection Function

```javascript
async function detectReasoningNeeded(userQuery) {
  // If detection_provider configured, use LLM detection
  if (config.detection_provider) {
    const detectionPrompt = 
      "Does this query require deep reasoning, step-by-step analysis, or " +
      "complex problem-solving? Answer only YES or NO.\n\n" +
      `Query: ${userQuery}`;
    
    await aiService.setActiveProvider(config.detection_provider.provider);
    const response = await aiService.generateChat([
      { role: 'system', content: 'You are a query classifier.' },
      { role: 'user', content: detectionPrompt }
    ], {
      model: config.detection_provider.model,
      max_tokens: 10
    });
    
    return response.content.trim().toUpperCase().includes('YES');
  }
  
  // Fallback: keyword detection
  const keywords = ['explain', 'why', 'how does', 'analyze', 'step by step', 'reasoning'];
  return keywords.some(kw => userQuery.toLowerCase().includes(kw));
}
```

---

## Use Cases

### 1. Technical Explanations

**Query:** "Explain how Kubernetes pod networking works with CNI plugins"

**Without reasoning:** Generic answer, may miss nuances

**With reasoning:**
- Reasoning stage: Breaks down CNI architecture, pod networking flow, plugin chain
- Response stage: Clear, structured explanation formatted for the user

### 2. Code Analysis

**Query:** "Why is this code causing a memory leak?"

**Without reasoning:** Quick surface-level answer

**With reasoning:**
- Reasoning stage: Analyzes code flow, identifies retention issues, traces object lifecycle
- Response stage: Concise explanation with fix suggestions

### 3. Multi-Step Problems

**Query:** "How do I set up monitoring for a distributed microservices architecture?"

**Without reasoning:** Simple, possibly incomplete answer

**With reasoning:**
- Reasoning stage: Considers different monitoring strategies, tools, trade-offs
- Response stage: Step-by-step guide with recommendations

---

## Performance Considerations

### Latency

- Reasoning stage adds extra LLM call (2-10 seconds depending on model)
- Detection adds minimal overhead (if using LLM detection, ~1 second)
- Total overhead: 3-11 seconds for reasoning-enabled queries

### Cost (API-based providers)

- Reasoning models are typically more expensive (larger, specialized)
- Two-stage approach doubles token usage
- Mitigation: Use efficient models for response stage

### When to Enable

Enable reasoning when:
- Quality > speed for your use case
- Users ask complex, analytical questions
- You have local models (Ollama) or sufficient API budget

Disable reasoning when:
- Speed is critical
- Simple Q&A use case
- Cost constraints

---

## Observations from Real-World Usage

### Reasoning Models Show Internal Thinking

DeepSeek R1 and similar reasoning models output their internal thought process within `<think>` tags:

```
<think>
Okay, I'm trying to figure out how to test and tune a machine learning model...
First, I know that InstructLab is an environment...
[detailed step-by-step analysis]
</think>

[Final structured answer]
```

This internal reasoning is then used by the response model to generate the final answer. Even when RAG context is limited, the reasoning model can:
- Break down complex problems systematically
- Consider multiple approaches
- Structure comprehensive answers
- Identify gaps and address them

**Current Behavior:** The full reasoning output (including `<think>` tags) is passed to the response model, which extracts the key points and formats a clean answer.

**Observation:** This works well, producing high-quality responses even with minimal RAG context. The reasoning stage adds significant value by thinking through the problem thoroughly.

---

## Future Enhancements

### High Priority Improvements

1. **Configurable Reasoning Prompts Per Strategy**
   Allow users to customize reasoning and response prompts in the UI or config:
   ```json
   "reasoning": {
     "enabled": true,
     "system_prompt": "Custom reasoning instructions for this strategy...",
     "response_prompt_template": "Custom template: {reasoning} -> {query}"
   }
   ```
   **Benefit:** Different strategies could use different reasoning approaches (analytical, creative, technical, etc.)

2. **Fine-tune Reasoning → Response Handoff**
   Currently uses a generic template. Could be optimized based on:
   - Query type (how-to, explanation, troubleshooting)
   - Strategy purpose (documentation Q&A, code analysis, general knowledge)
   - Whether `<think>` tags should be stripped or preserved
   
   **Example:**
   ```json
   "reasoning": {
     "response_prompt_template": "Extract the key steps from this analysis:\n\n{reasoning}\n\nProvide a clear, actionable guide for: {query}"
   }
   ```

3. **Reasoning Output Processing**
   Options for handling reasoning output:
   - Strip `<think>` tags (use only final answer)
   - Extract structured sections (steps, considerations, recommendations)
   - Preserve full reasoning for transparency
   - Hybrid: use thinking for context, structured answer for display

### Planned Features

4. **Pattern Matching for Model Selection**: 
   ```json
   "reasoning": {
     "enabled": true,
     "model_patterns": ["*32b*", "*70b*", "deepseek*", "*r1*"]
   }
   ```
   Use glob patterns to match model names. Includes any model matching the patterns in addition to auto-detected reasoning models.

5. **Reasoning Visibility in UI**: Show/hide reasoning process in chat
6. **Reasoning Cache**: Cache reasoning for similar queries
7. **User Feedback**: Learn which queries benefit from reasoning
8. **Reasoning Depth**: Configurable depth levels (quick vs. deep reasoning)
9. **Reasoning Templates**: Pre-built templates for different query types

### Potential Improvements

- Stream reasoning output in real-time
- Multi-stage reasoning (research → analyze → synthesize)
- Reasoning model fallback (try large model, fall back to medium if unavailable)
- Cross-provider reasoning (OpenAI o1 + Ollama response)

---

## Configuration Examples

### Example 1: Simple RAG with Reasoning

```json
{
  "detection_provider": {
    "provider": "ollama",
    "model": "qwen2.5:7b-instruct"
  },
  "strategies": [
    {
      "name": "DYNAMIC_RAG",
      "detection": { "type": "rag", "knowledge_base": "dynamic" },
      "response": {
        "provider": "ollama",
        "model": "qwen2.5:7b-instruct",
        "allow_model_selection": true,
        "reasoning": {
          "enabled": true,
          "allow_model_selection": true,
          "default_model": "qwen2.5:32b-instruct"
        }
      }
    }
  ]
}
```

### Example 2: Multi-Provider with Selective Reasoning

```json
{
  "strategies": [
    {
      "name": "CODE_ANALYSIS",
      "detection": { "type": "rag", "knowledge_base": "code_docs" },
      "response": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "reasoning": {
          "enabled": true,
          "default_model": "o1-preview",
          "system_prompt": "Analyze this code problem systematically."
        }
      }
    },
    {
      "name": "GENERAL",
      "detection": { "type": "default" },
      "response": {
        "provider": "ollama",
        "model": "qwen2.5:7b-instruct"
        // No reasoning for general queries
      }
    }
  ]
}
```

---

## Troubleshooting

### Reasoning not triggering

**Check:**
1. Is `reasoning.enabled: true` in strategy?
2. Is `detection_provider` configured?
3. Does query match detection criteria?
4. Check backend logs for detection results

### Wrong model used

**Check:**
1. Is reasoning model available on provider?
2. Does model have reasoning capability?
3. Is user selection matching provider?

### Performance issues

**Solutions:**
1. Use smaller reasoning model
2. Disable reasoning for simple strategies
3. Adjust max_tokens for reasoning stage
4. Consider caching (future feature)

---

## Summary

The reasoning model feature provides:
- ✅ Two-stage pipeline (reason → respond)
- ✅ Auto-detection of reasoning needs
- ✅ User-selectable reasoning models
- ✅ Provider-matched reasoning
- ✅ Flexible configuration per strategy

Best for:
- Technical documentation Q&A
- Code analysis and debugging
- Educational/explanatory content
- Complex multi-step problems

