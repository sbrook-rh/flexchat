# Design Document: Configurable Topic Detection Prompt

## Context
The current topic detection prompt is hard-coded using JavaScript template literals (`${variable}`) in `topic-detector.js`. To make it configurable, the prompt needs to be stored in JSON configuration, which requires a different approach to variable substitution.

The codebase already implements `{{variable}}` substitution in `response-generator.js` (lines 33-69) for response handler prompts. This proposal follows the same pattern for consistency.

## Goals
- Enable users to customize topic detection prompts via configuration
- Improve default prompt accuracy on small models (1B-3B parameters)
- Maintain backward compatibility with existing behavior
- Provide clear placeholder syntax that's JSON-safe
- Keep implementation simple and maintainable

## Non-Goals
- Full templating engine capabilities (conditionals, loops, etc.)
- Dynamic prompt generation based on complex logic
- Support for nested or computed placeholders
- Guaranteeing perfect accuracy on all model sizes (users can customize for their models)

## Decisions

### Decision 1: Placeholder Syntax
**Choice**: Use `{{variableName}}` (handlebars-style) syntax for placeholders

**Rationale**:
- Already used in `response-generator.js` for response handler prompts
- Maintains consistency across the codebase
- JSON-safe (doesn't conflict with JSON syntax)
- Familiar to users (handlebars, mustache, many template systems use this)
- Visually distinct from JavaScript template literals (`${}`)
- Easy to identify and substitute with regex
- Self-documenting in configuration files

**Alternatives Considered**:
- `${variable}` - Rejected: conflicts with JS template literals, confusing
- `{variable}` - Rejected: less visually distinct, easy to miss
- `%variable%` - Rejected: less common convention

### Decision 2: Standard Placeholder Set
**Standard placeholders**:
- `{{currentTopic}}` - Previously detected topic or "none"
- `{{conversationContext}}` - Recent conversation history (built from messages)
- `{{userMessage}}` - Latest user message

**Rationale**:
- Matches existing variables used in hard-coded prompt
- Covers the essential information needed for topic detection
- Small, focused set reduces complexity

### Decision 3: Variable Substitution Implementation
**Approach**: Simple string replacement using the same pattern as `response-generator.js`

```javascript
function substitutePromptVariables(template, variables) {
  if (!template) {
    return '';
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();
    
    // Handle special defaults
    if (trimmed === 'currentTopic') {
      return variables.currentTopic || 'none';
    }
    
    // Handle other variables
    const value = variables[trimmed];
    
    // Return value if found, otherwise keep placeholder
    return value !== undefined ? value : match;
  });
}
```

**Rationale**:
- Mirrors existing `substituteVariables()` pattern in `response-generator.js`
- Consistent regex approach: `/\{\{([^}]+)\}\}/g`
- No external dependencies
- Predictable behavior
- Easy to test and debug
- Keeps unknown placeholders intact (no errors)
- Sufficient for the use case

**Difference from response-generator.js**:
- Simpler: No nested path support (e.g., `service.prompt`)
- No special formatting logic (e.g., `rag_context` document formatting)
- Accepts flat `variables` object instead of nested `profile`
- Topic detection doesn't need the complexity

**Alternatives Considered**:
- Reuse `response-generator.js` function - Rejected: needs profile structure, overkill for topic detection
- Template library (handlebars, mustache) - Rejected: adds dependency for 3 variables
- `eval()` or `Function()` - Rejected: security concerns

### Decision 4: Default Prompt Storage
**Choice**: Store default prompt as a module-level constant with placeholder syntax

```javascript
const DEFAULT_TOPIC_PROMPT = `
You are a topic-detection assistant.

Your job:
- Identify the main topic of the conversation based on recent exchanges.
- The latest message may continue the same topic, ask a related follow-up, or change to a new subject.
- If it's related, slightly refine the topic; if it's new, describe the new topic clearly.
- If the current topic is none, and the Recent conversation is blank infer a clear starting topic from the latest message.
- If the user's new question is still about the same general domain or goal, treat it as a continuation with a broadened topic summary

Current known topic: "{{currentTopic}}"

Recent conversation:
{{conversationContext}}

Latest user message:
"{{userMessage}}"

Reply ONLY with valid JSON. Use short noun phrases (3-8 words max), not full sentences:
{
  "topic_status": "continuation" | "new_topic",
  "topic_summary": "short topic phrase here"
}

Example good summaries: "InstructLab model tuning", "OpenShift AI integration", "Recipe for tofu dinner"
Example bad summaries: "Begin discussion about...", "Provide a high-level overview of..."
`.trim();
```

**Rationale**:
- Single source of truth for default behavior
- Easy to update and test
- Can be exported for UI "show default" feature
- Maintains current prompt logic

### Decision 5: JSON Format Validation Helper
**Choice**: Add optional JSON extraction and validation with helpful error recovery

Current code already does:
```javascript
const match = raw.match(/\{[\s\S]*\}/); // extract JSON if wrapped in text
```

**Enhancement**: Log more details when JSON is malformed to help users debug their custom prompts

```javascript
try {
  parsed = match ? JSON.parse(match[0]) : { topic_status: "continuation", topic_summary: raw };
} catch (parseErr) {
  console.warn(`⚠️ Failed to parse JSON response from topic detection`);
  console.warn(`   Model output: ${raw.slice(0, 200)}`);
  console.warn(`   This may indicate the model is too small or the prompt needs adjustment`);
  parsed = { topic_status: "continuation", topic_summary: raw };
}
```

**Rationale**:
- Helps users diagnose issues with custom prompts
- Provides guidance on small model limitations
- Non-breaking: still falls back gracefully

### Decision 6: Configuration Schema
**Schema addition**:
```json
{
  "topic": {
    "type": "object",
    "properties": {
      "provider": { "..." },
      "prompt": {
        "type": "string",
        "description": "Custom prompt template for topic detection. Available placeholders: {{currentTopic}}, {{conversationContext}}, {{userMessage}}"
      }
    }
  }
}
```

**Rationale**:
- Optional field maintains backward compatibility
- Description documents available placeholders
- Simple string type is sufficient

### Decision 6: Improved Default Prompt for Small Models
**Problem**: Current prompt works well on 2.5B+ models and phi3-mini, but produces malformed JSON on very small models like gemma3:1b.

**Example error** (gemma3:1b):
```json
{ 
  "topic_status": "continuation", 
  "new_topic": "deployment",  // ❌ Extra field
  "topic_summary": "deploying the model to production"
}
```

**Improvements for small model accuracy**:

1. **More explicit JSON structure constraints**
   - Repeat the exact format multiple times
   - Use "ONLY these two fields" language
   - Add negative examples of wrong formats

2. **Simpler, clearer instructions**
   - Break down complex sentences
   - Use numbered lists for clarity
   - Avoid compound instructions

3. **JSON format enforcement**
   - Consider wrapping expected output in markdown code block
   - Add "No additional fields" instruction
   - Show exact field names in ALL CAPS in instructions

**Proposed improved default prompt**:
```javascript
const DEFAULT_TOPIC_PROMPT = `You are a topic-detection assistant.

TASK: Identify the conversation topic from recent messages.

Current topic: "{{currentTopic}}"
Recent conversation:
{{conversationContext}}
Latest message: "{{userMessage}}"

INSTRUCTIONS:
1. If the latest message continues the same topic → "continuation"
2. If it changes to a new topic → "new_topic"
3. Create a SHORT topic phrase (3-8 words, noun phrases only)

OUTPUT FORMAT - Use EXACTLY this JSON structure with NO extra fields:
{
  "topic_status": "continuation",
  "topic_summary": "short topic phrase"
}

GOOD topic phrases: "OpenShift AI setup", "Python debugging", "Recipe for pasta"
BAD topic phrases: "Let's discuss...", "The user is asking about..."

Return ONLY the JSON. No other text.`.trim();
```

**Changes from current**:
- ✅ Shorter, punchier sentences
- ✅ Numbered instructions for clarity
- ✅ Explicit "EXACTLY this JSON" constraint
- ✅ "NO extra fields" warning
- ✅ "Return ONLY the JSON" reminder at end
- ✅ ALL CAPS for emphasis on key constraints
- ✅ Still under 300 tokens for small model context

**Testing strategy**:
- Test on gemma3:1b, qwen2.5:0.5b, phi3-mini, qwen2.5:3b
- Measure: correct JSON rate, field accuracy, response format compliance
- Iterate if needed before marking complete

**Rationale**:
- Small models need more explicit structure guidance
- Repetition helps reinforce constraints
- Visual emphasis (CAPS) aids instruction following
- Users can still customize if this doesn't work for their model

### Decision 7: UI Placeholder Help
**Approach**: Show available placeholders as help text below the textarea

```
Available placeholders:
• {{currentTopic}} - Previously detected topic (or "none")
• {{conversationContext}} - Recent conversation history
• {{userMessage}} - Latest user message
```

**Rationale**:
- Users need to know what variables are available
- Help text is always visible while editing
- Simple, non-intrusive documentation

## Risks / Trade-offs

**Risk**: Users might expect more complex templating features
- **Mitigation**: Clear documentation that this is simple variable substitution only
- **Acceptable**: Can extend later if needed

**Risk**: Unknown placeholders silently left in prompt
- **Mitigation**: Log warning for unrecognized placeholders
- **Acceptable**: Doesn't break functionality, just passes through to LLM

**Trade-off**: Custom prompts might produce worse results
- **Mitigation**: Provide clear examples and keep default easily accessible
- **Acceptable**: Power users understand the risks of customization

## Migration Plan

**Phase 1**: Backend implementation
1. Add `substitutePromptVariables()` helper
2. Convert default prompt to use placeholders
3. Update `identifyTopic()` to accept custom prompt
4. Wire up configuration passing

**Phase 2**: Frontend implementation
1. Add prompt editor to TopicSection
2. Add placeholder help text
3. Wire up test endpoint with custom prompt

**Phase 3**: Testing and documentation
1. Test all placeholder substitution scenarios
2. Update user documentation
3. Add example custom prompts to docs

**Rollback**: If issues arise, the optional field means old configs work unchanged

## Additional Decisions Made During Implementation

### Decision 8: Default Prompt Distribution via UI Config
**Context**: Originally planned separate endpoint `/api/connections/topic/default-prompt`.

**Decision**: Add `defaultTopicPrompt` to existing `/api/ui-config` response.

**Rationale**:
- Eliminates extra network request
- Follows existing pattern (like `defaultHandlerIndex`, `llms`)
- Auto-refreshes on hot-reload
- More efficient - cached on app initialization

**Files Changed**:
- `backend/chat/routes/collections.js` - Added to ui-config response
- `frontend/src/sections/TopicSection.jsx` - Uses `uiConfig.defaultTopicPrompt`

### Decision 9: Smart Placeholder Insertion UX
**Context**: Initially placeholders appended to end of text.

**Decision**: Insert at cursor position with scroll preservation.

**Implementation**:
```javascript
const cursorPos = textarea.selectionStart;
const scrollTop = textarea.scrollTop;
// Insert at cursor
// Restore both cursor position and scroll
```

**Rationale**:
- Professional editor behavior
- Users edit middle of long prompts
- Scroll jumping is jarring UX

**Consistency**: Applied same pattern to `HandlerModal.jsx` for response handler prompts.

### Decision 10: Streamlined Test Flow
**Context**: Original flow had conversation selector in modal (extra step).

**Decision**: Move conversation selector to main page, auto-start analysis on Test click.

**Rationale**:
- Reduces clicks: 4 steps → 2 steps
- Immediate feedback (modal opens with spinner)
- Clear context (shows conversation name in modal header)

**User Flow**:
1. Select conversation (main page)
2. Click Test → Modal opens already analyzing

### Decision 11: JSON Format Safety Warnings
**Context**: User-editable prompts risk breaking required JSON output format.

**Decision**: Add prominent warnings about JSON requirements.

**Implementation**:
- Amber warning box above editor
- Blue info box with exact JSON structure below editor
- Clear field names: `topic_status`, `topic_summary`

**Rationale**:
- Critical that users understand format constraints
- Existing fallbacks help but warnings prevent issues
- Visual hierarchy: warning → placeholders → format reference

## Open Questions
None - all design decisions resolved during implementation

