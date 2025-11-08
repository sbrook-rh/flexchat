# Add Configurable Topic Detection Prompt

## Why
Users need the ability to customize the topic detection prompt to better suit their specific use cases and domain contexts. Currently the prompt is hard-coded in `topic-detector.js`, making it impossible to tune topic detection behavior without modifying code.

Additionally, the current prompt performs inconsistently on very small models (e.g., gemma3:1b produces malformed JSON with extra fields). Making the prompt configurable enables users to optimize for their specific model sizes.

## What Changes
- Add optional `topic.prompt` field to configuration schema and validation
- Convert default prompt to use `{{placeholder}}` syntax instead of JS template literals
- Implement variable substitution in `identifyTopic()` for placeholders: `{{currentTopic}}`, `{{conversationContext}}`, `{{userMessage}}`
- Modify `identifyTopic()` function to accept and use configurable prompt
- Add UI in Topic Detection section for editing and testing custom prompts with placeholder hints
- Provide fallback to existing hard-coded prompt when not configured
- Update topic detection test endpoint to use custom prompt from configuration

## Impact
- Affected specs: `config-loader`, `chat-flow` (new spec for 6-phase processing flow)
- Affected code:
  - `backend/chat/lib/topic-detector.js` - Add prompt parameter and default fallback
  - `backend/chat/routes/chat.js` - Pass prompt from config to `identifyTopic()`
  - `backend/chat/routes/connections.js` - Pass prompt in test endpoint, add default prompt endpoint
  - `config/schema/config-schema.json` - Add `topic.prompt` property
  - `frontend/src/sections/TopicSection.jsx` - Add prompt editor and test UI

