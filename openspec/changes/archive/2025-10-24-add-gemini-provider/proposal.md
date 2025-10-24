## Why
Flex Chat currently supports OpenAI and Ollama providers, but lacks Google Gemini integration. Adding Gemini support will provide users with an additional AI provider option, especially valuable for users who prefer Google's models or need to diversify their AI provider usage for cost/performance reasons.

**IMPORTANT**: This proposal requires thorough research of the `@google/genai` package API before implementation to avoid the mistakes made in the initial attempt.

## What Changes
- **ADDED** Gemini AI provider with proper `@google/genai` API integration
- **ADDED** Chat completion support for Gemini models (with correct model names)
- **ADDED** Configuration schema for Gemini provider
- **ADDED** Integration with existing 6-phase processing flow
- **ADDED** Error handling and validation for Gemini API
- **ADDED** Proper research phase to understand correct API usage

## Impact
- Affected specs: ai-providers capability
- Affected code: 
  - `backend/chat/ai-providers/providers/GeminiProvider.js` (new, after research)
  - `backend/chat/ai-providers/providers/index.js` (registration)
  - `config/examples/05-gemini-multi-llm.json` (already created)
  - `docs/PROVIDER_COMPARISON.md` (documentation)
