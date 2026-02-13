# Model Classification Enhancement

## Current Issues

### 1. **Weak Size Detection**
- Currently matches parameter size in model name (e.g., "3b", "1.5b")
- Misses "1b" models (no "b" suffix match)
- Uses hardcoded strings like "mini" which is fragile

### 2. **Provider Inconsistency**
- **OpenAI/Gemini**: APIs return capability metadata
- **Ollama**: Local models with no capability info from API
- No unified classification system across providers

### 3. **UI Limitations**
- Only shows ⚡ for "small/fast" models
- No way to distinguish base vs instruct vs chat variants
- No indication of model quality/generation

## Proposed Solution

### New `characteristics` Field
Add a provider-specific classification system that outputs standardized characteristics:

```javascript
{
  id: "qwen2.5:1.5b",
  name: "Qwen 2.5 1.5B",
  characteristics: {
    size: "small",        // tiny, small, medium, large, xlarge
    variant: "instruct",  // base, instruct, chat
    generation: "2.5",    // model version/generation
    speed: "fast",        // fast, medium, slow
    capabilities: ["text"] // text, vision, reasoning, function-calling, etc.
  }
}
```

### Provider-Specific Classification

#### **OllamaProvider**
Implement heuristic-based classification from model name:
- Parse parameter count: `1b`, `1.5b`, `3b`, `7b`, etc.
- Detect variant: `instruct`, `chat`, no suffix = `base`
- Detect vision: `:vision` or `llava`
- Map to size classes:
  - `tiny`: < 1B params (e.g., 0.5b)
  - `small`: 1-3B params → ⚡
  - `medium`: 7-13B params
  - `large`: 30-70B params
  - `xlarge`: 70B+ params

#### **OpenAI/Gemini Providers**
Use API-provided metadata when available, fall back to known model lists.

### Future Enhancement: Web Scraping
- Periodically fetch model metadata from:
  - Ollama library (https://ollama.com/library)
  - HuggingFace model cards
  - LLM registries
- Cache characteristics locally
- Allow manual override in config

### UI Improvements

#### Current
```
qwen2.5:1.5b ⚡
```

#### Proposed
```
qwen2.5:1.5b ⚡ [instruct]
```

Or with badges:
```
qwen2.5:1.5b  [⚡ fast] [instruct] [gen 2.5]
```

### Implementation Notes

1. **Backward Compatibility**: Existing `isSmallModel()` helper should continue to work
2. **Gradual Migration**: Add `characteristics` field without breaking existing code
3. **Provider Interface**: Update `ModelInfo` class to include characteristics
4. **Caching**: Store parsed characteristics to avoid re-parsing on every render

### Files to Update

- `backend/chat/ai-providers/base/ModelInfo.js` - Add characteristics field
- `backend/chat/ai-providers/providers/OllamaProvider.js` - Implement classification logic
- `frontend/src/sections/IntentSection.jsx` - Update UI to show characteristics
- `frontend/src/sections/TopicSection.jsx` - Update UI to show characteristics
- `frontend/src/LLMWizard.jsx` - Show characteristics in model selection

### Example: OllamaProvider Enhancement

```javascript
classifyModelCharacteristics(modelName) {
  const name = modelName.toLowerCase();
  
  // Parse parameter size
  const paramMatch = name.match(/(\d+\.?\d*)b/);
  const params = paramMatch ? parseFloat(paramMatch[1]) : null;
  
  // Determine size class
  let size = 'unknown';
  if (params) {
    if (params < 1) size = 'tiny';
    else if (params <= 3) size = 'small';
    else if (params <= 13) size = 'medium';
    else if (params <= 70) size = 'large';
    else size = 'xlarge';
  }
  
  // Determine variant
  let variant = 'base';
  if (name.includes('instruct')) variant = 'instruct';
  else if (name.includes('chat')) variant = 'chat';
  
  // Detect capabilities
  const capabilities = ['text'];
  if (name.includes('vision') || name.includes('llava')) {
    capabilities.push('vision');
  }
  
  return {
    size,
    variant,
    speed: size === 'small' || size === 'tiny' ? 'fast' : 'medium',
    capabilities
  };
}
```

### Benefits

1. ✅ Consistent model classification across providers
2. ✅ Better UI for model selection (show capabilities at a glance)
3. ✅ Easier to filter/sort models by characteristics
4. ✅ Foundation for future web scraping enhancements
5. ✅ More accurate "fast model" detection (includes 1b models!)
6. ✅ Helps users choose appropriate models for different tasks

## Related Issues

- Lightning bolt (⚡) missing for 1b models
- No distinction between base/instruct/chat variants
- No way to filter models by speed/size
- Intent detection model selection could benefit from showing "recommended for classification" badge

## Priority

**Medium** - Would improve UX but not blocking core functionality.

## Estimated Effort

- Backend classification logic: 2-3 hours
- UI updates: 1-2 hours
- Testing across providers: 1 hour
- **Total: ~4-6 hours**

