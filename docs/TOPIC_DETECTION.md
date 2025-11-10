# Topic Detection

## Overview

Topic detection is **Phase 1** of FlexChat's 6-phase chat processing flow. It analyzes the conversation to determine what the user is currently discussing, enabling smarter RAG retrieval and context management.

### What It Does

- Identifies the main topic from recent conversation exchanges
- Determines if the user is continuing the same topic or starting a new one
- Produces a concise topic summary (3-8 words) used throughout the chat flow
- Powers RAG collection selection and context filtering

### The 6-Phase Flow

```
1. Topic Detection    ← You are here
2. Intent Detection
3. RAG Retrieval
4. Reasoning (optional)
5. Response Generation
6. Response Formatting
```

Topic detection happens **first**, before any RAG retrieval or response generation, allowing the system to tailor its behavior to what the user is actually asking about.

---

## Default Behavior

### Out of the Box

FlexChat includes an optimized default prompt that works well across model sizes from 1B to 70B+ parameters. The prompt:

- Detects topic continuations vs new topics
- Generates short, descriptive noun phrases
- Produces consistent JSON output
- Handles edge cases (empty history, ambiguous messages)

### Fallback Logic

Topic detection is **optional**. If not explicitly configured:

1. **Priority 1**: Uses `config.topic.provider` settings if present
2. **Priority 2**: Falls back to `config.intent.provider` if configured
3. **Priority 3**: Uses the default/fallback response handler (first one with no `match` criteria)

This means topic detection "just works" as soon as you add your first LLM provider.

### Output Format

Topic detection always returns:

```json
{
  "topic_status": "continuation" | "new_topic",
  "topic_summary": "short topic phrase"
}
```

This JSON is then used throughout the processing flow.

---

## Customizing Topic Detection

### Why Customize?

You might want to customize the topic detection prompt to:

- Optimize for very small models (< 3B parameters)
- Add domain-specific instructions (e.g., "always include product names")
- Experiment with different topic tracking strategies
- Tune for your specific use case (technical docs, customer support, etc.)

### Accessing the Configuration

1. Open the **Config Builder** UI
2. Navigate to the **Topic Detection** section
3. The prompt editor is below the provider/model selectors

### Available Variables

Custom prompts support **variable substitution** using `{{placeholder}}` syntax:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{currentTopic}}` | Previously detected topic (or "none") | "OpenShift AI integration" |
| `{{conversationContext}}` | Recent conversation history | "User: How do I...?\nBot: You can..." |
| `{{userMessage}}` | Latest user message | "What about deployment?" |

These variables are replaced at runtime before the prompt is sent to the model.

### Prompt Editor Features

- **Load Default Prompt**: Populates editor with the system default (good starting point)
- **Clear**: Removes custom prompt, reverts to default behavior
- **Clickable Placeholders**: Click to insert variables at cursor position
- **Auto-save**: Changes save automatically to your working configuration

---

## Testing Topic Evolution

### The Testing Workflow

FlexChat includes a **Topic Evolution Analyzer** that lets you test prompts against saved conversations:

1. **Select a conversation**: Choose from your saved chat sessions
2. **Click "Test"**: The analyzer runs your custom prompt through the entire conversation
3. **Review results**: See how topics are detected at each turn

### What You See

The test shows:

- **Message-by-message analysis**: Each user message and detected topic
- **Topic changes**: Highlights when topics shift (continuation vs new_topic)
- **Topic history**: Complete timeline showing how topics evolve
- **Raw responses**: The actual JSON returned by the model

### Example Output

```
[0] new_topic: "InstructLab setup"
    User: "How do I install InstructLab?"
    
[2] continuation: "InstructLab setup"
    User: "Do I need Python 3.11?"
    
[4] new_topic: "model tuning"
    User: "How do I tune a model?"
    
[6] new_topic: "deployment"
    User: "How would I deploy to production?"
```

### Interpreting Results

**Good topic detection**:
- ✅ Related questions stay on the same topic
- ✅ Genuinely new subjects trigger topic changes
- ✅ Topic summaries are concise and descriptive

**Poor topic detection**:
- ❌ Every message triggers a new topic (too sensitive)
- ❌ Topics never change (too broad)
- ❌ Topic summaries are vague or repetitive

---

## Critical: JSON Format Requirements

### ⚠️ Required Output Format

**Your prompt MUST instruct the model to return valid JSON with these exact fields:**

```json
{
  "topic_status": "continuation" | "new_topic",
  "topic_summary": "short topic phrase"
}
```

### Why This Matters

FlexChat parses this JSON to extract the topic. If the model returns:
- Invalid JSON → Topic detection fails, fallback to user message
- Missing fields → Topic detection fails
- Extra fields → Might still work, but indicates the prompt is unclear

### Safety Guidelines

When writing custom prompts:

1. **Be explicit about format**: "Return ONLY valid JSON with these fields..."
2. **Repeat the structure**: Show the exact JSON format in your prompt
3. **Add constraints**: "No additional fields", "No explanatory text"
4. **Test thoroughly**: Use the analyzer to verify consistent output

The UI shows prominent warnings about this to help prevent issues.

---

## Examples

### Example 1: Domain-Specific Prompt

For technical documentation about a specific product:

```
You are a topic-detection assistant for OpenShift documentation.

Current topic: "{{currentTopic}}"
Conversation: {{conversationContext}}
Latest message: "{{userMessage}}"

Task:
- Identify the main OpenShift topic (features, installation, troubleshooting)
- Include product names when mentioned (OpenShift AI, Pipelines, etc.)
- If continuing same topic, keep the topic phrase
- If new topic, create a clear phrase with product context

Return ONLY this JSON:
{
  "topic_status": "continuation" | "new_topic",
  "topic_summary": "short topic phrase"
}
```

### Example 2: Advanced Multi-Level Tracking

For hierarchical topic tracking (experimental):

```
You are a topic-detection assistant.

Your task:
- Maintain a list of key terms representing the overall subject area (parent_topic)
- Identify the specific aspect the user is focusing on (topic)
- If staying in same subject area → continuation
- If moving to different subject → new_topic and reset parent_topic

Current parent_topic: {{currentParentTopic}}
Current topic: {{currentTopic}}
Conversation: {{conversationContext}}
Latest message: "{{userMessage}}"

Return ONLY this JSON:
{
  "topic_status": "continuation" | "new_topic",
  "parent_topic": ["list", "of", "terms"],
  "topic": "current focus"
}
```

**Note**: The advanced example requires extending the system to handle additional JSON fields. The current implementation uses `topic_status` and `topic_summary` only.

### Example 3: Very Small Models

For models < 2B parameters that struggle with JSON:

```
TASK: Identify conversation topic.

Current: "{{currentTopic}}"
History: {{conversationContext}}
Message: "{{userMessage}}"

RULES:
1. Same topic → "continuation"
2. New topic → "new_topic"
3. Topic = 3-8 words, noun phrase only

OUTPUT (NO extra fields):
{
  "topic_status": "continuation",
  "topic_summary": "short phrase"
}

Return ONLY the JSON above. No other text.
```

---

## Technical Reference

### Configuration Schema

The `topic.prompt` field in your configuration:

```json
{
  "topic": {
    "provider": {
      "llm": "ollama",
      "model": "qwen2.5:3b"
    },
    "prompt": "Your custom prompt with {{placeholders}}"
  }
}
```

**Field Details**:
- **Type**: `string` (optional)
- **Default**: System default prompt if not specified
- **Validation**: Must be valid string, no schema validation on content
- **Placeholders**: `{{currentTopic}}`, `{{conversationContext}}`, `{{userMessage}}`

### API Endpoints

#### Get Default Prompt

The default prompt is included in the UI configuration:

```bash
GET /api/ui-config
```

Response includes:
```json
{
  "defaultTopicPrompt": "You are a topic-detection assistant...",
  ...
}
```

#### Test Topic Detection

```bash
POST /api/connections/topic/test
Content-Type: application/json

{
  "provider_config": { "llm": "ollama", "model": "qwen2.5:3b" },
  "model": "qwen2.5:3b",
  "messages": [
    { "role": "user", "text": "How do I install InstructLab?" },
    { "role": "assistant", "text": "You can install it with pip..." }
  ],
  "custom_prompt": "Your custom prompt..."
}
```

### Implementation Details

**Backend Files**:
- `backend/chat/lib/topic-detector.js` - Core topic detection logic
- `backend/chat/routes/chat.js` - Integration into chat flow
- `backend/chat/routes/connections.js` - Test endpoint

**Frontend Files**:
- `frontend/src/sections/TopicSection.jsx` - UI for prompt editing and testing

**Variable Substitution**:
```javascript
function substitutePromptVariables(template, variables) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();
    if (trimmed === 'currentTopic') {
      return variables.currentTopic || 'none';
    }
    const value = variables[trimmed];
    return value !== undefined ? value : match;
  });
}
```

### OpenSpec References

Formal specifications for topic detection:

- **Chat Flow Spec**: `openspec/specs/chat-flow/spec.md`
  - Requirements for topic detection in the processing flow
  - Variable substitution behavior
  - Test endpoint requirements
  
- **Config Loader Spec**: `openspec/specs/config-loader/spec.md`
  - Configuration loading and validation
  - Hot-reload behavior
  - UI config endpoint requirements

---

## Troubleshooting

### Issue: Model Returns Malformed JSON

**Symptoms**: 
- Extra fields in response
- No JSON at all
- Parsing errors in logs

**Solutions**:
1. Add explicit "ONLY these two fields" instruction
2. Repeat the exact JSON structure multiple times
3. Add "No additional fields" constraint
4. Test with a slightly larger model
5. Check the "Load Default Prompt" as a reference

### Issue: Topics Change Too Frequently

**Symptoms**: Every message triggers a new topic

**Solutions**:
1. Emphasize "continuation" in your prompt instructions
2. Add examples of what counts as same topic
3. Include more conversation context (already automatic)
4. Test prompt against real conversations

### Issue: Topics Never Change

**Symptoms**: All messages marked as "continuation"

**Solutions**:
1. Make "new_topic" criteria more explicit
2. Add examples of topic changes
3. Reduce reliance on current topic in instructions
4. Consider if your use case really needs topic changes

### Issue: Topic Summaries Are Too Verbose

**Symptoms**: Long sentences instead of short phrases

**Solutions**:
1. Add explicit word limit: "3-8 words max"
2. Specify "noun phrases only, not sentences"
3. Show good/bad examples in prompt
4. Test against the default prompt's approach

---

## Best Practices

### Starting Point

1. **Use the default first**: Click "Load Default Prompt" to see what works
2. **Make small changes**: Tweak one thing at a time
3. **Test immediately**: Use the analyzer after each change
4. **Compare results**: Keep notes on what improves vs what doesn't

### Writing Effective Prompts

**Do**:
- ✅ Be explicit about JSON format
- ✅ Give clear examples
- ✅ Use simple, direct language
- ✅ Test on multiple model sizes
- ✅ Include the format twice (description + example)

**Don't**:
- ❌ Assume models understand JSON requirements
- ❌ Use complex, nested instructions
- ❌ Skip testing against real conversations
- ❌ Add fields the system doesn't use

### Model Selection

**Best for topic detection**:
- Models 2.5B+ parameters generally reliable
- Chat-tuned models perform better than base models
- Instruction-following models (qwen, phi, gemma) work well
- Very small models (<2B) may need careful prompt tuning

**Recommended models**:
- `qwen2.5:3b` - Excellent balance of speed and accuracy
- `phi3-mini` - Fast and reliable for simple topic detection
- `gemma3:2b` - Good for straightforward use cases

---

## Future Directions

### Advanced RAG Retrieval

The configurable prompt system enables future enhancements like:

- **Multi-level tracking**: Parent topics + specific focus
- **Product/entity extraction**: Detecting specific names in conversation
- **Hierarchical retrieval**: Using topic structure for smarter RAG queries
- **Profile-driven strategies**: Different prompts for different document types

See the **Advanced RAG Retrieval Strategies** epic (if implemented) for more information.

### Custom JSON Structures

Future versions may support:
- User-defined JSON schemas
- Additional extraction fields
- Validation against custom formats
- Profile-based prompt templates

---

## Additional Resources

- **Configuration Builder Guide**: `docs/CONFIGURATION_BUILDER.md` - Full config builder documentation
- **6-Phase Chat Flow**: `docs/ARCHITECTURE.md` - Understanding the complete processing pipeline
- **RAG Integration**: `docs/RAG_SERVICES.md` - How topics influence retrieval
- **OpenSpec**: `openspec/specs/chat-flow/spec.md` - Formal specifications

---

**Questions or Issues?**

If you encounter problems or have questions about topic detection customization, please open an issue on the project repository with:
- Your custom prompt
- Test conversation results
- Model being used
- Expected vs actual behavior

