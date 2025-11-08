# Implementation Tasks

## 1. Backend Configuration Support
- [x] 1.1 Add `topic.prompt` field to `config/schema/config-schema.json` (optional string)
- [x] 1.2 Improve default prompt for small model accuracy (see design.md Decision 6)
- [x] 1.3 Convert improved prompt to use `{{currentTopic}}`, `{{conversationContext}}`, `{{userMessage}}` placeholders
- [x] 1.4 Extract converted prompt to module-level constant `DEFAULT_TOPIC_PROMPT`
- [x] 1.5 Enhance JSON parsing error logging to help debug custom prompts
- [x] 1.6 Implement `substitutePromptVariables(template, variables)` helper function (follow pattern from response-generator.js)
- [x] 1.7 Update substitution to handle `currentTopic` default ("none" if empty/null)
- [x] 1.8 Modify `identifyTopic()` signature to accept `customPrompt` parameter (optional)
- [x] 1.9 Update prompt construction to use: `substitutePromptVariables(customPrompt || DEFAULT_TOPIC_PROMPT, { currentTopic, conversationContext, userMessage })`
- [x] 1.10 Update `resolveTopicLLMConfig()` in `chat.js` to also return prompt from `config.topic?.prompt`
- [x] 1.11 Pass custom prompt to `identifyTopic()` call in chat flow
- [x] 1.12 Update topic test endpoint in `connections.js` to accept and use custom prompt from request body

## 2. Frontend UI for Prompt Configuration
- [x] 2.1 Add prompt editor textarea to `TopicSection.jsx` below model selector
- [x] 2.2 Load current prompt from `workingConfig.topic?.prompt` or show placeholder for default
- [x] 2.3 Add help text showing available placeholders: `{{currentTopic}}`, `{{conversationContext}}`, `{{userMessage}}`
- [x] 2.4 Add "Reset to Default" button to clear custom prompt (falls back to default)
- [x] 2.5 Save custom prompt to `workingConfig.topic.prompt` on change
- [x] 2.6 Include custom prompt in test modal payload when testing topic detection
- [x] 2.7 Display prompt being tested in test modal UI with placeholders highlighted

## 3. Testing and Validation
- [x] 3.1 Test default prompt on small models (gemma3:1b, qwen2.5:0.5b, phi3-mini) - verify correct JSON format
- [x] 3.2 Test default prompt on medium models (qwen2.5:3b, qwen2.5:7b) - verify accuracy maintained
- [x] 3.3 Test with no custom prompt (should use improved default)
- [x] 3.4 Test with custom prompt in configuration
- [x] 3.5 Test prompt reset functionality
- [x] 3.6 Verify test endpoint uses custom prompt
- [x] 3.7 Verify backward compatibility with configs lacking topic.prompt field
- [x] 3.8 Verify enhanced error logging helps diagnose malformed responses

## 4. Additional Enhancements (Implemented During Development)
- [x] 4.1 Bug fix: `resolveTopicLLMConfig()` now finds default handler correctly (first with no match criteria)
- [x] 4.2 Optimization: Added `defaultTopicPrompt` to `/api/ui-config` (eliminates separate fetch)
- [x] 4.3 UX: Clickable placeholders insert at cursor position (not just append)
- [x] 4.4 UX: Scroll position preserved when inserting placeholders
- [x] 4.5 Consistency: Applied same cursor/scroll improvements to HandlerModal
- [x] 4.6 UX: Streamlined test flow (conversation selector on main page, auto-start analysis)
- [x] 4.7 Safety: Added JSON format warnings to prevent users breaking topic detection

