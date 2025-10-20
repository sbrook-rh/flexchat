# Flex Chat - TODO List

## 📋 About This Document

This document tracks **future work and improvements**. For completed features and changes, see [CHANGELOG.md](CHANGELOG.md).

**Current Version**: 2.0.0 (Simplified Architecture)  
**Branch**: `redesign/simplified-architecture`  
**Last Updated**: October 19, 2025

---

## 🎯 Immediate Priorities

### Manual Testing & Validation ✅
- [x] End-to-end testing with real services
  - [x] Test Ollama + ChromaDB integration
  - [x] Test OpenAI provider
  - [ ] Test Gemini provider
  - [x] Test all collection CRUD operations
  - [x] Test topic persistence across sessions
  - [x] Test pinned vs dynamic collections
  - [x] Test multi-service RAG with different embeddings
- [ ] Performance testing
  - [ ] Concurrent requests
  - [ ] Large document uploads
  - [ ] Query performance with large collections
- [x] Load configuration from different sources
  - [x] Test CLI `--config` flag
  - [x] Test FLEX_CHAT_CONFIG_FILE
  - [x] Test FLEX_CHAT_CONFIG_DIR
  - [x] Test default config.json

**Status**: Core functionality validated manually. System working well!

### Documentation Updates ⚠️ CRITICAL - OUTDATED
**Status**: ARCHITECTURE.md and other docs still reflect old strategy-based architecture

- [x] **Update ARCHITECTURE.md** ✅ COMPLETED
  - [x] Remove references to "Strategies Configuration" (old architecture)
  - [x] Document new 4-phase flow:
    1. Topic Detection (`lib/topic-detector.js`)
    2. RAG Collection (`lib/rag-collector.js`)
    3. Profile Building (`lib/profile-builder.js`)
    4. Response Matching (`lib/response-matcher.js`)
    5. Response Generation (`lib/response-generator.js`)
  - [x] Document new configuration structure (llms, rag_services, intent, responses)
  - [x] Update data flow diagrams (Match, Partial, None scenarios)
  - [x] Document collection management system
  - [x] Add sequence diagrams for common scenarios
  - [x] Document Profile object pattern
  - [x] Remove outdated "intent detection" references (now part of profile-builder)
- [x] Update main README.md ✅ **UPDATED**
  - [x] Updated architecture overview with 4-phase flow diagram
  - [x] Fixed all outdated terminology (strategies → response handlers, knowledge bases → RAG services)
  - [x] Updated configuration section with proper example files
  - [x] Added links to CONFIGURATION.md, RAG_SERVICES.md, CHROMADB_WRAPPER.md
  - [x] Updated Quick Start with correct config files and env vars
  - [x] Fixed Python service startup command (python3 server.py)
  - [x] Updated Key Concepts section with v2.0 examples
  - [x] Reorganized documentation links
  - [x] Updated project structure to show lib/ modules
  - [x] Enhanced troubleshooting section
  - [ ] Add environment variables section (FLEX_CHAT_*)
  - [ ] Update configuration examples references
- [ ] Review other docs for outdated content ⚠️ ALL NEED UPDATES
  - [x] **CONFIGURATION.md** - ✅ REWRITTEN & USER-UPDATED
    - Updated to v2.0 structure: `llms`, `rag_services`, `intent`, `responses`
    - Added comprehensive "How to specify config file" section (CLI, env vars)
    - Detailed breakdown of each section with examples
    - Thresholds explained (match vs partial)
    - Template variables documented
    - Response handler matching explained (first-match wins)
    - Complete realistic example included
    - Environment variables section
    - Troubleshooting section
    - **User updates**: Fixed FLEX_CHAT_CONFIG_FILE usage, clarified terminology
  - [ ] **COLLECTION_MANAGEMENT.md** - PARTIALLY OUTDATED
    - References "Configured Strategies" (old architecture)
    - Should reference "Response Rules" instead
    - Metadata structure may need verification
    - Overall flow seems mostly accurate
  - [x] **RETRIEVAL_PROVIDERS.md → RAG_SERVICES.md** - ✅ REWRITTEN & RENAMED
    - Renamed to match `rag_services` terminology
    - Updated all examples to use `rag_services` structure
    - Documented ChromaDB wrapper (recommended provider)
    - Explained distance-based matching and thresholds
    - Provider architecture and interface documented
    - Guide for adding new providers
    - Comprehensive troubleshooting section
    - Best practices for embeddings, thresholds, collections
    - Corrected startup instructions (python3 server.py)
    - Links to new CHROMADB_WRAPPER.md document
  - [x] **CHROMADB_WRAPPER.md** - ✅ NEW DOCUMENT CREATED
    - Complete guide for Python ChromaDB wrapper service
    - Command-line arguments (--chroma-path, --port)
    - Running multiple instances on different ports
    - Environment variables for Ollama, OpenAI, Gemini
    - API endpoints reference
    - Data storage and backup
    - Embedding consistency critical requirements
    - Troubleshooting section
    - Production deployment guide
  - [x] **REASONING_MODELS.md** - ✅ REWRITTEN
    - Removed all `strategies` references
    - Updated to response handler architecture
    - Documented reasoning as opt-in feature per handler
    - Shows `reasoning` config with two prompts (reasoning_prompt + prompt)
    - Marked as "Planned" feature for v2.1+
    - Clean, simple documentation aligned with v2.0
  - [ ] **DYNAMIC_COLLECTIONS_IMPLEMENTATION.md** - NEEDS REVIEW
    - May reference old architecture
    - Verify against current collection management system
  - [ ] **PROVIDER_COMPARISON.md** - LIKELY OK
    - Appears to be provider comparison, probably architecture-agnostic
    - Quick review recommended
- [ ] Create deployment guide
  - [ ] OpenShift deployment
  - [ ] Kubernetes deployment
  - [ ] Docker compose setup
- [ ] Create troubleshooting guide
  - [ ] Common configuration errors
  - [ ] RAG service connection issues
  - [ ] Collection management problems

---

## 🧪 Automated Testing (NEXT PRIORITY)

**Note**: Manual testing complete and system validated. Now need to write comprehensive automated tests to ensure stability and enable confident refactoring.

**Important**: Existing tests in `backend/chat/__tests__/` are for the **old strategy-based architecture** and need to be replaced with tests for the new simplified 4-phase flow.

### Setup Required
- [ ] Archive or remove old strategy detection tests
- [ ] Update test README for new architecture
- [ ] Set up test framework for new flow

### Unit Tests
- [ ] Collection Management
  - [ ] `collection-manager.js` functions
  - [ ] ChromaDBWrapperProvider CRUD methods
  - [ ] Validation and error handling
- [ ] Topic Detection
  - [ ] Stateful topic tracking
  - [ ] Conversation context building
  - [ ] Topic change detection
  - [ ] Smart compression logic
- [ ] RAG Flow
  - [ ] Threshold-based classification
  - [ ] Metadata override logic
  - [ ] Service/collection selection
- [ ] Response Matching
  - [ ] Sequential pattern matching
  - [ ] Match clause evaluation
  - [ ] Variable substitution

### Integration Tests
- [ ] Full request flow
  - [ ] Chat-only flow
  - [ ] RAG match flow
  - [ ] RAG partial flow
  - [ ] Intent detection
  - [ ] Response generation with context
- [ ] Collection Management
  - [ ] Create collection via API
  - [ ] Upload documents
  - [ ] Update metadata
  - [ ] Delete collection
  - [ ] List collections
- [ ] Error scenarios
  - [ ] Provider down
  - [ ] Rate limits
  - [ ] Timeouts
  - [ ] Invalid configurations

---

## 🎨 Frontend Improvements

### UI Enhancements
- [ ] Model selection improvements
  - [ ] Add "(default)" label next to default models
  - [ ] Show which models were used in response
  - [ ] Add model selection presets
- [ ] Reasoning model features
  - [ ] Real-time indicators ("🧠 Analyzing..." / "💬 Generating...")
  - [ ] Expandable section for raw reasoning output
  - [ ] Show `<think>` tags in debug mode
- [ ] Collection management
  - [ ] Search/filter collections
  - [ ] Bulk operations (import/export)
  - [ ] Collection usage statistics
  - [ ] Advanced metadata editor

### Topic Interaction Features (REFACTOR_FLOW.md)
**Status**: Basic topic display implemented ✅
- [x] Display current topic near input area (subtle indicator next to "Clear Chat")
- [x] Show topic on each bot message (subtle badge at bottom)
- [x] **Show service/model used for each response**
  - [x] Backend: Return service/model metadata from `generateResponse()`
  - [x] Backend: Include in `/chat/api` response payload
  - [x] Frontend: Store service/model with each message
  - [x] Frontend: Display as subtle badge (similar to topic badge)
  - [x] Format: "via [llm] / [model]" or similar
  - [ ] **TERMINOLOGY FIX**: Rename to `llm` instead of `service` (avoid confusion with `rag_services`)
- [ ] **Edit and resubmit with topic override**
  - [ ] Add edit button/icon to topic badge on bot messages
  - [ ] Click to edit opens inline editor for that message's topic
  - [ ] Resubmit button appears when topic is edited
  - [ ] **Conversation branching**: Warn user that resubmitting will:
    - Truncate conversation to that point (delete all subsequent messages)
    - Resubmit the user's question with the new topic as `topicHint`
    - Create a new conversation branch from that point
  - [ ] Confirmation dialog: "Editing this message will discard all responses after it. Continue?"
- [ ] **Topic change visualization**
  - [ ] Highlight topic badge when topic changes between messages
  - [ ] Add subtle color/border change for different topics
  - [ ] Optional: add small "🔄 Topic changed" indicator between messages
- [ ] **Topic history**
  - [ ] Show topic evolution in a collapsible timeline/sidebar
  - [ ] Click topic in history to jump to that part of conversation

### 🔄 Per-Message Model Switching (THE BETTER IDEA)

**Status**: Planned feature - replaces sidebar model selection concept

**Vision**: Instead of pre-selecting models (can't predict which handler matches), allow retroactive model switching on any bot message.

#### Why This Approach Is Better
- **Context-aware**: Uses exact profile/RAG context from original response
- **Comparative**: See how different models handle same query
- **No prediction needed**: Don't guess which handler will match
- **User-driven**: Only generate alternatives when wanted
- **Experimental**: Perfect for testing model quality

#### User Flow
1. User sees bot response with "via ollama / llama3.2:3b"
2. Clicks "🔄 Try Different Model" button on message
3. Overlay appears with LLM and model dropdowns
4. Selects different LLM/model (e.g., chatgpt / gpt-4o)
5. Clicks "Generate Alternative"
6. New response generated using same context
7. Overlay shows alternative response
8. User can:
   - **Replace original**: Swap in new response
   - **Keep original**: Close overlay
   - **Try another**: Select different model

#### Implementation Phases

- [ ] **Phase 1: Backend Regeneration Endpoint**
  - [ ] Create `/chat/api/regenerate` endpoint
  - [ ] Accept: `llm`, `model`, `userMessage`, `previousMessages`, `topic`, `rag_result`
  - [ ] Use provided topic (bypass topic detection phase)
  - [ ] Query RAG service with topic (if rag_result is not "none")
  - [ ] Reconstruct conversation context from provided messages
  - [ ] Build profile from RAG results + context
  - [ ] Call `generateResponse()` with specified LLM/model
  - [ ] Return: `{ response, llm, model }`

- [ ] **Phase 2: Store Minimal Regeneration Context**
  - [ ] Backend includes regeneration metadata in response payload:
    - `topic`: Topic used for RAG query
    - `rag_result`: "match", "partial", or "none"
  - [ ] Frontend stores this with each bot message
  - [ ] Frontend reconstructs conversation from existing messages in UI

- [ ] **Phase 3: Frontend UI**
  - [ ] Add "🔄" button to message footer (next to llm/model display)
  - [ ] Overlay/modal component for model selection
  - [ ] Fetch available LLMs from config (new endpoint? or hardcode?)
  - [ ] Fetch available models per LLM (from `llms.<name>.models`?)
  - [ ] Loading state while generating
  - [ ] Show alternative response in overlay

- [ ] **Phase 4: Response Comparison UI**
  - [ ] Side-by-side view: Original vs Alternative
  - [ ] Highlight differences (optional, advanced)
  - [ ] Model info for each (llm, model, token count?)
  - [ ] "Replace" button to swap original with alternative
  - [ ] "Try Another" to test more models
  - [ ] "Cancel" to keep original

- [ ] **Phase 5: Response History** (Advanced)
  - [ ] Store all generated alternatives for a message
  - [ ] "View all alternatives" to see history
  - [ ] Compare multiple model outputs
  - [ ] Mark favorites or rate responses
  - [ ] Export comparison data

#### Technical Considerations

**Backend:**
- Reconstruct conversation context from provided messages
- Re-query RAG service using stored topic
- If `rag_result === "none"`: Skip RAG query
- If `rag_result === "match" or "partial"`: Query RAG with topic
- Will automatically benefit from RAG caching if implemented
- Should regeneration count against rate limits differently?

**Frontend:**
- Where to show "Try Different Model" button?
  - In message footer next to llm/model display
  - Or in message context menu (right-click)?
- Overlay vs modal vs inline expansion?
- Should we allow model switching on user messages too? (Re-submit with different model)

**Context Stored with Each Message:**
```javascript
{
  text: "Here's a minestrone recipe...",
  llm: "ollama",
  model: "llama3.2:3b",
  topic: "minestrone soup",
  rag_result: "match"            // "match", "partial", or "none"
}
```

**API Design:**
```javascript
POST /chat/api/regenerate
{
  "llm": "chatgpt",
  "model": "gpt-4o",
  "userMessage": "How do I make minestrone?",
  "previousMessages": [
    { type: "user", text: "..." },
    { type: "bot", text: "..." }
  ],
  "topic": "minestrone soup",
  "rag_result": "match"          // "match", "partial", or "none"
}

Response:
{
  "response": "Here's a detailed minestrone recipe...",
  "llm": "chatgpt",
  "model": "gpt-4o",
  "tokens": 450
}
```

#### Benefits

**For Users:**
- Experiment with different models without re-asking
- Compare quality, style, detail level
- Find the best model for specific use cases
- No need to predict which handler will match

**For Development:**
- Test model quality easily
- Compare outputs for same context
- Debug response quality issues
- Validate RAG context effectiveness

**For Future:**
- Foundation for "ensemble" responses (combine multiple models)
- A/B testing different models
- User preferences (favorite models per domain)
- Quality ratings and model recommendations

#### Open Questions

1. ~~Should profile be stored with every message?~~ ✅ **RESOLVED**: Store topic and rag_result only
2. Allow regeneration of old messages? (Context might be stale)
3. Limit number of regenerations per message? (Prevent abuse/cost)
4. Show token count and cost estimates?
5. Allow tweaking prompt during regeneration? (Advanced feature)
6. Store regeneration history permanently or just in session?
7. RAG caching per topic? (Would benefit regeneration automatically)

#### Related Features

- Ties into model transparency (shows which model was used)
- Could enable "Compare Models" mode (generate with 2-3 models simultaneously)
- Foundation for user model preferences
- Enables A/B testing in production

---

### User Experience
- [ ] Loading states and progress indicators
- [ ] Error boundaries and better error messages
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Dark mode toggle
- [ ] Customizable themes

---

## 🔧 Backend Enhancements

### Topic-Aware RAG Flow (REFACTOR_FLOW.md)

- [ ] **Phase 1: Topic Detection Enhancements**
  - [ ] Accept `topicHint` parameter from frontend (user override)
  - [ ] Use `topicHint || currentTopic` for RAG search (user override takes precedence)
  - [ ] Return topic status: `{ topic, status: 'new'|'continued'|'overridden' }`

- [x] **Phase 2: RAG Result Standardization** ✅ COMPLETED
  - [x] Refactor `collectRagResults()` to return structured format:
    ```js
    { result: "match" | "partial" | "none", data: {...} | [...] | null }
    ```
  - [x] Update profile builders to handle new format
  - [x] Add per-collection threshold configuration
  - [x] Extract intent detection into separate `intent-detector.js` module
  - [x] Create unified `buildProfile()` function handling all RAG result types
  - [x] Refactor server.js to use new 6-phase flow
  - [x] Update phase annotations across all modules

- [ ] **Phase 3: Conditional Intent Detection (OPTIMIZATION)**
  - [ ] Skip intent detection entirely when `rag.result === "match"`
  - [ ] For `rag.result === "partial"`: include partial collections in intent prompt
  - [ ] For `rag.result === "none"`: use only configured intents
  - [ ] This saves LLM calls and reduces latency on good RAG matches

- [ ] **Phase 4: Intent Refinement Logic**
  - [ ] When `profile.intent === "other"` and partials exist:
    - [ ] Promote best (lowest distance) partial result
    - [ ] Avoid "other" classification when we have domain context

- [ ] **Phase 5: Profile Construction Updates**
  - [ ] Ensure match → single doc from `rag.data`
  - [ ] Ensure partial → merged summary from `rag.data[]`
  - [ ] Ensure none → intent-only profile

### Streaming Responses
**Status**: Planning phase - significant UX improvement, essential for reasoning models

**Why Streaming:**
- Reduced perceived latency - users see responses as they generate
- Reasoning model transparency - show "thinking" phase separately from response
- Better UX for long responses - can start reading immediately
- Progress indication - clear the system is working on complex queries

**Recommended Approach: Server-Sent Events (SSE)**
- Simple HTTP-based protocol, works with existing Express setup
- Built-in reconnection, widely supported
- One-way communication is sufficient for this use case

#### Implementation Phases

- [ ] **Phase 1: Provider Streaming Interface**
  - [ ] Add `generateChatStream()` method to `AIProvider` base class
  - [ ] Implement in `OllamaProvider` (good test case, supports streaming)
  - [ ] Implement in `OpenAIProvider` (standard SSE format)
  - [ ] Implement in `GeminiProvider` (uses different streaming format)
  - [ ] Fallback: if provider doesn't support streaming, send full response as single chunk

- [ ] **Phase 2: Backend SSE Endpoint**
  - [ ] Create new `/chat/api/stream` endpoint (or modify existing with Accept header)
  - [ ] Set proper SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
  - [ ] Keep connection alive with periodic heartbeat
  - [ ] Stream format (JSON per event):
    ```javascript
    // Processing stage
    { type: "status", phase: "topic", message: "Detecting topic..." }
    { type: "status", phase: "rag", message: "Searching collections..." }
    
    // Response chunks
    { type: "chunk", content: "Here is ", role: "assistant" }
    { type: "chunk", content: "your answer...", role: "assistant" }
    
    // Metadata at end
    { type: "done", topic: "...", service: "...", model: "..." }
    ```
  - [ ] Error handling: `{ type: "error", message: "..." }`

- [ ] **Phase 3: Reasoning Model Support**
  - [ ] Detect reasoning model usage from config
  - [ ] Stream thinking phase separately:
    ```javascript
    { type: "thinking_start" }
    { type: "thinking_chunk", content: "..." }
    { type: "thinking_end" }
    { type: "response_start" }
    { type: "response_chunk", content: "..." }
    { type: "response_end" }
    ```
  - [ ] Parse `<think>` tags from reasoning model output
  - [ ] Send thinking content separately from response content

- [ ] **Phase 4: Frontend SSE Client**
  - [ ] Use `EventSource` API for SSE connection
  - [ ] Create streaming state: `isStreaming`, `streamBuffer`, `streamPhase`
  - [ ] Update UI in real-time as chunks arrive
  - [ ] Show phase indicators:
    - "🔍 Detecting topic..."
    - "📚 Searching knowledge..."
    - "🧠 Thinking..." (for reasoning models, with optional expandable section)
    - "💬 Responding..." (streaming text appears)
  - [ ] Handle connection errors and reconnection
  - [ ] Don't save to localStorage until `type: "done"` received
  - [ ] Add cancel button to abort long-running requests

- [ ] **Phase 5: UI Polish**
  - [ ] Animated "typing" indicator at cursor position
  - [ ] Smooth scroll to follow streaming content
  - [ ] Collapsible "thinking" section (show/hide reasoning)
  - [ ] Progress spinner during processing phases
  - [ ] Graceful degradation if SSE not supported (fallback to regular endpoint)
  - [ ] Settings toggle: "Enable streaming" (allow users to opt-out)

- [ ] **Phase 6: Error Handling & Edge Cases**
  - [ ] Handle stream interruption (network drop, server error)
  - [ ] Show partial content with error indicator
  - [ ] Retry logic with exponential backoff
  - [ ] Rate limiting: detect 429 mid-stream and show friendly message
  - [ ] Handle browser tab backgrounding (pause/resume stream)
  - [ ] Clean up event listeners on component unmount

#### Technical Considerations

**Backend:**
- Keep connection alive with comments or heartbeat every 30s
- Set reasonable timeout (5 minutes max)
- Properly close connections on client disconnect
- Log streaming sessions for debugging

**Frontend:**
- EventSource automatically reconnects (use `retry` field)
- Consider using `fetch()` with ReadableStream as alternative to EventSource for more control
- Buffer chunks briefly to avoid excessive re-renders (use requestAnimationFrame)
- Accessibility: ensure screen readers handle streaming content well

**Testing:**
- Mock streaming endpoints with delayed chunks
- Test error scenarios (disconnect, timeout, rate limit)
- Test reasoning model thinking/response separation
- Performance test with very long responses (>10k tokens)

**Future Enhancements:**
- [ ] Show token count and generation speed (tokens/sec)
- [ ] Allow user to stop generation mid-stream (save what's generated so far)
- [ ] Stream RAG context preview ("Found 3 relevant documents...")
- [ ] Multi-model streaming (reasoning + response in parallel)

### Chat History Management
- [ ] Design chat history storage abstraction
- [ ] Implement storage providers
  - [ ] SQLite provider
  - [ ] PostgreSQL provider
  - [ ] MongoDB provider
  - [ ] File-based provider (JSON/JSONL)
- [ ] Add configuration option to enable/disable
- [ ] Create conversation management API
  - [ ] List conversations
  - [ ] Search conversations
  - [ ] Delete conversations
  - [ ] Export conversations
- [ ] Frontend integration
  - [ ] Conversation list UI
  - [ ] Search and filtering
  - [ ] Load from backend

### LLM-based Summarization
- [ ] Detect when conversation exceeds token limit
- [ ] Summarize older messages
- [ ] Preserve chronological order and context
- [ ] Keep recent messages unsummarized
- [ ] Store original and summarized versions

### Configuration Management
- [ ] JSON schema validation at runtime
- [ ] Interactive configuration wizard CLI
  - [ ] Auto-detect local Ollama
  - [ ] Guide through provider selection
  - [ ] Configure embedding providers
  - [ ] Set up initial responses
- [ ] Configuration validation improvements
  - [ ] Better error messages
  - [ ] Suggestions for fixes
  - [ ] Warnings for suboptimal settings

---

## 🔌 Provider Implementations

### AI Providers
- [x] OpenAI provider (chat + embeddings)
- [x] Ollama provider (chat + embeddings)
- [ ] Google Gemini provider (chat + embeddings) ⚠️ Not implemented yet
- [ ] Anthropic Claude provider
- [ ] Azure OpenAI provider
- [ ] Cohere provider
- [ ] Hugging Face provider

### Retrieval Providers
- [x] ChromaDB wrapper (with Python service) - **Best for**: FAQs, simple Q&A format
- [ ] ChromaDB direct (native JS client)
- [ ] Milvus provider - **Best for**: Structured multi-field data (recipes, products)
- [ ] Postgres/pgvector provider
- [ ] Pinecone provider
- [ ] Weaviate provider - **Best for**: Flexible schema, multi-modal data
- [ ] Qdrant provider

---

## 📄 Advanced RAG Features

### Provider Data Structure Specialization 🆕

**Concept**: Different RAG providers optimized for different data structures

- [ ] **Provider Description & Usage Metadata**
  - [ ] Add `description` and `recommended_for` fields to provider classes
  - [ ] Document data structure best practices in provider code
  - [ ] Examples:
    - ChromaDB Wrapper: "Simple text-based, FAQ/Q&A format"
    - Milvus: "Structured multi-field data with schema (recipes, products)"
    - Weaviate: "Flexible schema, multi-modal content"

- [ ] **Data Structure Examples**
  - [ ] Simple Text (ChromaDB): `{"text": "...", "metadata": {...}}`
  - [ ] Structured (Milvus): `{"id": "...", "title": "...", "ingredients": [...], "instructions": "..."}`
  - [ ] See: `logs/recipe_data_for_structured_db.json` for structured example

- [ ] **Structured Data Provider Implementation** (Milvus/Qdrant)
  - [ ] **Chunking Strategy**:
    - [ ] Implement 512-1024 token chunking for long text fields
    - [ ] Preserve markdown structure (`### Headers`, bullets)
    - [ ] Configurable chunk size per collection
  - [ ] **Schema Management**:
    - [ ] Define filterable fields (title, region, prep_time, etc.)
    - [ ] Support for typed fields (string, number, array, datetime)
    - [ ] Auto-generate UUIDs or accept user-provided IDs
  - [ ] **Data Transformation**:
    - [ ] New wrapper service must transform/normalize structured JSON
    - [ ] Flatten nested objects for indexing
    - [ ] Handle array fields (ingredients as searchable text)
  - [ ] **Embedding Configuration**:
    - [ ] Support rich embedding models (text-embedding-3-large, instructor-xl)
    - [ ] Per-field embedding strategies (instructions vs. title)
  - [ ] **Query Features**:
    - [ ] Filtered search: semantic + structured filters (e.g., "British desserts")
    - [ ] Hybrid queries: combine vector similarity with field constraints
    - [ ] Result ranking with field weighting

- [ ] **Provider Selection Guide in Docs** ✅ DOCUMENTED
  - [x] Added "Choosing a RAG Provider" section to RAG_SERVICES.md
  - [x] Comparison table by data complexity
  - [x] Use case recommendations
  - [ ] Add to UI: Provider selection wizard based on data structure

**Status**: Documented concept, ready for implementation when Milvus/Weaviate providers added

### Document Ingestion
- [ ] Advanced document parsing
  - [ ] PDF parsing and chunking
  - [ ] HTML/web page extraction
  - [ ] Microsoft Word (.docx)
  - [ ] Markdown with structure preservation
  - [ ] URL fetching
- [ ] Smart chunking
  - [ ] Semantic boundary detection
  - [ ] Overlap strategies
  - [ ] Size optimization
- [ ] Metadata extraction
  - [ ] Title, author, date
  - [ ] Custom metadata fields
- [ ] Deduplication
  - [ ] Content hash comparison
  - [ ] Semantic similarity check
- [ ] Bulk operations
  - [ ] Bulk upload API
  - [ ] Progress tracking
  - [ ] Error recovery

### Query Enhancement
- [ ] Hybrid search (keyword + vector)
- [ ] Query expansion
- [ ] Reranking strategies
- [ ] Multi-vector retrieval
- [ ] Contextual embeddings

### Source Attribution & Context Formatting
**Status**: Planning phase - improves transparency and enables citation

**Why Source Attribution:**
- LLM can cite specific sources in its response ("According to the Soup Recipes collection...")
- Critical for multi-collection scenarios (user knows which collection provided which info)
- Builds trust through transparency
- Enables verification of claims
- Better for partial matches where context comes from multiple sources

**Current State:**
- `{{rag_context}}` just concatenates document text with newlines
- No indication of which collection each document came from
- Documents from different collections are indistinguishable

**Proposed Enhancement:**

#### Implementation Phases

- [ ] **Phase 1: Enhanced Context Formatting**
  - [ ] Modify `profile-builder.js` to include source metadata with documents
  - [ ] Update `{{rag_context}}` substitution in `response-generator.js`
  - [ ] Format structure:
    ```
    --- From collection "Soup Recipes from Around the World" ---
    
    [Document 1 text]
    [Document 2 text]
    
    --- From collection "Vegetarian Cooking Basics" ---
    
    [Document 3 text]
    [Document 4 text]
    ```
  - [ ] Alternative format (more compact):
    ```
    [Source: Soup Recipes from Around the World]
    [Document 1 text]
    
    [Source: Soup Recipes from Around the World]
    [Document 2 text]
    
    [Source: Vegetarian Cooking Basics]
    [Document 3 text]
    ```

- [ ] **Phase 2: Collection Display Names**
  - [ ] Use `metadata.display_name` if available, fallback to collection name
  - [ ] Makes sources more user-friendly in LLM responses
  - [ ] Example: "Comfort Soups" instead of "comfort-soups-2024"

- [ ] **Phase 3: Document-Level Metadata**
  - [ ] Include document title/filename if available
  - [ ] Format: `[Source: Collection Name / Document Title]`
  - [ ] Example: `[Source: Soup Recipes / "Minestrone Variations.pdf"]`
  - [ ] Enables even more specific citations

- [ ] **Phase 4: Citation Support in Responses**
  - [ ] Update system prompts to encourage citations
  - [ ] Prompt includes instruction: "When using information from the context, cite the source collection"
  - [ ] Example response: "According to the Soup Recipes from Around the World collection, minestrone typically includes..."

- [ ] **Phase 5: Frontend Citation Display** (Future enhancement)
  - [ ] Parse citations from LLM response
  - [ ] Make them clickable to show source document
  - [ ] Highlight which collection was cited
  - [ ] Show document snippet in tooltip or modal

#### Format Options to Consider

**Option A: Section Headers (Recommended)**
```
--- Context from "Soup Recipes from Around the World" ---

Traditional minestrone is a hearty Italian soup...
A good vegetarian minestrone includes...

--- Context from "Vegetarian Cooking Basics" ---

When making vegetarian soups, consider...
```

**Pros:** 
- Clear visual separation
- Easy for LLM to understand grouping
- Minimal token overhead
- Works well with multiple documents per collection

**Cons:**
- Slightly more verbose

**Option B: Inline Source Tags**
```
[Source: Soup Recipes] Traditional minestrone is a hearty Italian soup...

[Source: Soup Recipes] A good vegetarian minestrone includes...

[Source: Vegetarian Cooking] When making vegetarian soups, consider...
```

**Pros:**
- More compact
- Source directly attached to each document
- Easy to parse

**Cons:**
- Repetitive if many docs from same collection
- Harder to scan visually

**Option C: Numbered References**
```
[1] Traditional minestrone is a hearty Italian soup...
[2] A good vegetarian minestrone includes...
[3] When making vegetarian soups, consider...

Sources:
[1] Soup Recipes from Around the World
[2] Soup Recipes from Around the World
[3] Vegetarian Cooking Basics
```

**Pros:**
- Very compact in context
- Academic citation style
- LLM can reference by number

**Cons:**
- Requires looking up references
- More complex to implement
- Less immediately clear

#### Configuration Options

Add to response rule config:
```json
{
  "responses": [
    {
      "match": { ... },
      "prompt": "...",
      "citation_format": "section_headers",  // or "inline_tags" or "numbered"
      "include_document_titles": true,
      "encourage_citations": true
    }
  ]
}
```

#### Benefits

**For Single Collection:**
- Clearer context structure
- Can still include document-level attribution

**For Multiple Collections (Partial Matches):**
- Essential for understanding which source provided which info
- Prevents confusion when collections have similar content
- Enables LLM to qualify responses ("According to X collection...")
- User can verify by checking specific collection

**For User Trust:**
- Complete transparency about information sources
- Can verify claims against original documents
- Builds confidence in RAG-based responses

#### Implementation Notes

- Start with Option A (section headers) as default
- Keep format configurable per response rule
- Ensure format doesn't significantly increase token usage
- Test with various LLMs to ensure they use citations appropriately
- Consider language model prompting best practices for citation

---

## 🚀 Future Features

### 🎨 UI-Driven Configuration System (THE VISION)

**Status**: Future major feature - the ultimate goal for Flex Chat

**Vision**: Start with a blank configuration and build everything through the UI. No JSON editing required.

#### Why This Matters
- **Zero-config start**: New users don't need to understand JSON configuration
- **Visual workflow**: See your system configuration as you build it
- **Validation**: Real-time validation prevents configuration errors
- **Discovery**: UI guides you through what's possible
- **Iteration**: Quickly test and refine without file editing
- **Accessibility**: Non-technical users can configure complex RAG systems

#### Components to Build

- [ ] **LLM Provider Management UI**
  - [ ] Add/edit/delete LLM providers (OpenAI, Ollama, etc.)
  - [ ] Test connection and list available models
  - [ ] Configure API keys, base URLs
  - [ ] Set default models for chat/reasoning/embeddings
  - [ ] Visual health status indicators

- [ ] **RAG Service Configuration UI**
  - [ ] Add/edit/delete RAG services
  - [ ] Configure embeddings (provider + model)
  - [ ] Set thresholds (match, partial)
  - [ ] Test connection to ChromaDB/vector DB
  - [ ] Configure per-service settings

- [ ] **Response Handler Builder** ⭐ CORE FEATURE
  - [ ] Visual rule builder with drag-and-drop
  - [ ] Match criteria configurator:
    - Service dropdown
    - Intent pattern editor (with regex help)
    - RAG result selector (match/partial/none)
    - Reasoning toggle
    - Collection selector
  - [ ] Prompt template editor with syntax highlighting
  - [ ] Variable insertion helper ({{rag_context}}, {{topic}}, etc.)
  - [ ] Model selection dropdown (from configured LLMs)
  - [ ] Preview/test response handler
  - [ ] Rule ordering (drag to reorder, first-match wins)
  - [ ] Duplicate/clone rules
  - [ ] Enable/disable rules without deleting

- [ ] **Reasoning Configuration UI**
  - [ ] Toggle reasoning on/off per handler
  - [ ] Select reasoning model (from configured LLMs)
  - [ ] Separate prompt editors for reasoning vs response
  - [ ] Preview two-stage flow
  - [ ] Configure when reasoning triggers (complexity detection, user preference)

- [ ] **Intent Configuration UI**
  - [ ] Add/edit/delete intents
  - [ ] Description editor with guidance
  - [ ] Select LLM for intent detection
  - [ ] Test intent detection with sample queries

- [ ] **Collection Management UI** (Partially Complete ✅)
  - [x] Create/delete collections
  - [x] Upload documents
  - [x] Edit metadata (display names, descriptions)
  - [ ] Bulk document operations
  - [ ] Collection settings (thresholds, prompts)
  - [ ] Document preview and search
  - [ ] Collection statistics dashboard

- [ ] **Configuration Import/Export**
  - [ ] Export current config to JSON
  - [ ] Import JSON config
  - [ ] Share configurations (templates)
  - [ ] Version control (save/restore configs)
  - [ ] Configuration presets (chat-only, RAG, multi-service)

- [ ] **Visual Flow Designer** (Advanced)
  - [ ] Node-based visual editor
  - [ ] See complete flow: Topic → RAG → Profile → Response
  - [ ] Visual representation of rule matching
  - [ ] Debug mode: see which rules match for test queries
  - [ ] Simulate request flow with sample data

- [ ] **Configuration Validation & Testing**
  - [ ] Real-time validation (check references, required fields)
  - [ ] Test queries through UI
  - [ ] See which handler matches
  - [ ] Preview generated prompts
  - [ ] Dry-run mode (see what would happen without calling LLM)

#### Implementation Approach

**Phase 1: Foundation** (v2.x)
- Backend API for configuration CRUD operations
- Simple UI for basic settings
- File-based config with UI overlay

**Phase 2: Response Handler Builder** (v3.0)
- Visual rule builder
- Complete response handler management
- Rule testing and preview

**Phase 3: Full Visual Config** (v3.5+)
- All configuration through UI
- No JSON editing needed
- Import/export for power users
- Configuration templates and presets

**Phase 4: Visual Flow Designer** (v4.0+)
- Node-based visual editor
- Complete flow visualization
- Advanced debugging tools

#### Technical Considerations

**Backend:**
- `/api/config` endpoints for CRUD operations
- Configuration validation service
- Hot-reload without server restart
- Configuration versioning/backup

**Frontend:**
- Multi-step wizard for initial setup
- Rich text editors for prompts (CodeMirror?)
- Form validation with helpful messages
- Undo/redo support
- Auto-save drafts

**Storage:**
- Still use JSON files as source of truth
- UI reads/writes JSON through API
- Keep JSON structure human-readable for power users
- Optional: Database storage for multi-user deployments

**User Experience:**
- Guided tour for first-time users
- Tooltips and inline help
- Example configurations to start from
- "Import from template" for common use cases
- Preview before saving

#### Benefits

**For New Users:**
- Start using Flex Chat in minutes
- No need to learn JSON structure
- Discover features through UI exploration
- Visual feedback prevents errors

**For Power Users:**
- Faster iteration and testing
- Visual overview of entire system
- Still have JSON access for version control
- Export configurations for sharing

**For Development:**
- Clear separation of concerns (UI ↔ config ↔ logic)
- Configuration becomes data, not code
- Easier to add new features (just extend config schema)
- Better testing (validate configs programmatically)

---

### Toolbox & Workspace System
Reusable "toolbox" templates creating specialized workspaces:
- [ ] Core architecture
  - [ ] Toolbox definition schema
  - [ ] Workspace data model
  - [ ] Tool framework and executor
  - [ ] Safety and approval system
- [ ] Built-in toolboxes
  - [ ] 🗃️ Database Explorer
  - [ ] 📧 Email Manager
  - [ ] 📄 Document Analyzer
  - [ ] 🖥️ System Admin

### Configuration Viewer & Management UI 🆕

**Phase 1: Display Only (Easy Win!)** 🎯 HIGH PRIORITY
- [ ] **Backend Endpoint**: `GET /config/api` or `/config/api/:section`
  - [ ] Return current loaded configuration (already sanitized - env vars resolved)
  - [ ] **Important**: Return deep clone, not reference to global config object
  - [ ] Verify global config hasn't been mutated during runtime
  - [ ] Support section queries: `/config/api/llms`, `/config/api/rag_services`, etc.
  - [ ] Return metadata: config file path, last loaded time, env var usage
  
- [ ] **Frontend Config Viewer Page** (`/config` route)
  - [ ] Tab-based or accordion UI for sections:
    - LLMs (providers, models)
    - RAG Services (services, thresholds)
    - Embedding (default provider)
    - Intent Detection (categories, model)
    - Response Handlers (match criteria, prompts)
  - [ ] JSON viewer with syntax highlighting
  - [ ] Search/filter within config
  - [ ] Copy to clipboard buttons
  - [ ] "Reload Config" button (restart required notice)
  
- [ ] **Navigation**: Add "Configuration" link to NavBar
  - [ ] Only show if user has access (future: RBAC)
  
**Phase 2: Live Editing** (Future)
- [ ] **Architecture Decision**: Config mutation approach
  - [ ] Investigate: Is global config object being mutated during runtime?
  - [ ] Option A: Allow safe runtime mutation (with validation + rollback)
  - [ ] Option B: Immutable config, requires file write + reload
  - [ ] Safety filters: Validate before applying, preview impact
  
- [ ] **UI Features**:
  - [ ] Edit mode with schema validation
  - [ ] Test response handler matching (dry-run)
  - [ ] Preview: "Which handler would match this query?"
  - [ ] Save changes to file (with automatic backup)
  - [ ] Hot reload configuration without restart (if mutation approach)
  - [ ] Diff view showing changes before/after
  
- [ ] **Safety & Approval System**:
  - [ ] Validate changes against schema
  - [ ] Check for breaking changes (e.g., removing active LLM)
  - [ ] Confirmation dialog with impact summary
  - [ ] Rollback mechanism if something breaks
  - [ ] Audit log of config changes

**Phase 3: Advanced Features** (Future)
- [ ] **Configuration Presets & Snapshots** 🆕
  - [ ] **Save Config as Preset**:
    - [ ] "Save As Preset" button in config viewer
    - [ ] User provides name: "recipes-only", "support-bot", "dev-testing"
    - [ ] Optional description and tags
    - [ ] Store in `config/presets/` directory
    - [ ] Include metadata: created_at, description, author, based_on
  
  - [ ] **Preset Management**:
    - [ ] List available presets in UI (card grid or list)
    - [ ] Preview preset contents before switching
    - [ ] "Load Preset" - switch to preset (restart or hot reload)
    - [ ] "Duplicate and Edit" - clone preset, modify, save as new
    - [ ] Delete preset (with confirmation)
    - [ ] Mark preset as "favorite" or "production"
  
  - [ ] **Use Cases**:
    - Development: Quick switch between test configs
    - Staging: "staging-openai", "staging-ollama" presets
    - Production: Versioned production configs
    - Experiments: "try-reasoning", "multi-rag-test"
    - Team: Share preset via export → teammate imports
  
- [ ] **Configuration Management**:
  - [ ] Runtime config selection from presets dropdown
  - [ ] Initial configuration wizard (no-config mode)
  - [ ] Configuration versioning and rollback
  - [ ] Import/export configurations (JSON file)
  - [ ] Share presets with team (export with sanitized secrets)
  
- [ ] **Advanced Editing**:
  - [ ] Secrets management integration (vault, env vars)
  - [ ] Visual response handler builder (drag-and-drop)
  - [ ] Template variables helper (shows available: {{rag_context}}, etc.)
  - [ ] Response handler testing sandbox

**Why Start with Display Only:**
- ✅ Easy to implement (just backend endpoint + React component)
- ✅ Immediately useful for debugging
- ✅ See which response handlers match your query
- ✅ Understand current system configuration
- ✅ No risk of breaking config (read-only)
- ✅ Foundation for future editing features
- ✅ **Important discovery opportunity**: 
  - Reveals if config object is being mutated at runtime
  - Shows how env vars are resolved vs. file contents
  - Identifies safe pathways for future runtime config changes
  - Tests deep cloning approach before allowing edits

**Key Technical Insight:**
Phase 1 helps us understand the current config lifecycle:
1. Config loaded from file at startup
2. Environment variables substituted (`${VAR}` → actual values)
3. Global config object passed around the application
4. **Question to answer**: Is this object being mutated during operation?

This understanding is **critical** for Phase 2 design:
- If config is immutable → Changes require file write + restart
- If config can be safely mutated → Enable hot reload with validation
- Phase 1 viewer reveals the current state and any unexpected mutations

---

## 🔌 Connection Builder Interface

**Goal**: UI-driven wizard for creating LLM and RAG service connections without ever exposing API keys in the browser.

**Status**: 📝 Documented (Ready for implementation after Config Viewer Phase 1)

**Documentation**: `docs/CONNECTION_BUILDER.md`

### Core Principles
- 🔐 **Security First**: NEVER ask users to paste API keys in browser
- 🎯 **Schema-Driven**: Forms generated from provider `getConnectionSchema()` 
- 🔌 **Provider-Agnostic**: Works with any provider that implements schema interface
- 📥 **Portable**: Generated configs shareable (secrets stay in environment)

### Phase 1: Core Infrastructure
- [ ] **Provider Schema Interface**:
  - [ ] Add `getConnectionSchema()` method to base provider classes
  - [ ] Implement schemas for OpenAI, Ollama, Anthropic
  - [ ] Implement schemas for ChromaDB, Milvus (future)
  - [ ] Schema includes: fields, types, hints, defaults, UI display names
  
- [ ] **Backend API Endpoints**:
  - [ ] `GET /connections/providers?type=llm|rag` - List provider schemas
  - [ ] `POST /connections/test` - Test connection with env var resolution
  - [ ] `GET /connections/env-vars` - List available `FLEX_CHAT_*` vars (names only)
  - [ ] `POST /connections/validate-name` - Check for config clashes
  - [ ] `POST /connections/merge` - Merge connection into loaded config
  
- [ ] **Frontend UI - Basic Wizard**:
  - [ ] Step 1: Choose type (LLM / RAG)
  - [ ] Step 2: Choose provider
  - [ ] Step 3: Dynamic form from schema
  - [ ] Step 4: Review & export (snippet + instructions)
  - [ ] Form validation and field hints
  
- [ ] **Environment Variable Handling** (Pattern-Based):
  - [ ] Schema defines `env_var_pattern` per field: `FLEX_CHAT_OPENAI_*`
  - [ ] Schema defines `env_var_suggestion`: `FLEX_CHAT_OPENAI_KEY`
  - [ ] Dropdown shows only vars matching provider's pattern
  - [ ] Filter: `FLEX_CHAT_OPENAI_KEY`, `FLEX_CHAT_OPENAI_PROD_KEY` ✅
  - [ ] Hidden: `FLEX_CHAT_ANTHROPIC_KEY` ❌ (wrong provider)
  - [ ] Exclude reserved vars (`FLEX_CHAT_CONFIG*`)
  - [ ] Validate custom input against pattern
  - [ ] Warn if env var not set in environment
  - [ ] Config output uses references: `${FLEX_CHAT_OPENAI_KEY}`
  - [ ] Backend endpoint: `GET /connections/env-vars?pattern=FLEX_CHAT_OPENAI_*`

### Phase 2: Enhanced UX
- [ ] **Model Discovery & Selection**:
  - [ ] `POST /connections/models` - Query provider for available models
  - [ ] UI: List models, filter, select subset
  - [ ] Add selected models to config (saves startup query)
  - [ ] Collection selection for RAG services
  
- [ ] **Connection Name Auto-Suggest**:
  - [ ] Detect clashes with loaded config
  - [ ] Suggest: `openai-1`, `openai-2`, etc.
  - [ ] Show warnings if name exists
  - [ ] Provide alternative suggestions
  
- [ ] **Full Config Merge**:
  - [ ] Backend merges new connection into loaded config
  - [ ] Download complete `config.json`
  - [ ] Generate setup instructions (env vars, restart, test)
  
- [ ] **Connection Testing**:
  - [ ] Test if env var is set (backend only)
  - [ ] Show connection status (success/pending/error)
  - [ ] Display response time and capabilities
  - [ ] Clear instructions if env var missing

### Phase 3: Advanced Features
- [ ] **Reconfigure/Refresh Connection**:
  - [ ] Load existing connection config into wizard
  - [ ] Update settings (base_url, timeout, etc.)
  - [ ] Refresh model list (query API again)
  - [ ] Add/remove selected models
  - [ ] Use case: New models released, endpoint changed
  
- [ ] **Connection Health Monitoring**:
  - [ ] "Test All Connections" dashboard
  - [ ] Latency tracking per connection
  - [ ] Auto-detect offline connections
  - [ ] Connection usage statistics
  
- [ ] **Batch Operations**:
  - [ ] Import multiple connections at once
  - [ ] Connection templates (common setups)
  - [ ] Duplicate connection with different name
  - [ ] Export connection subset

### Key Features

**Secure Secret Handling (Pattern-Based)**:
```
Schema defines: env_var_pattern: "FLEX_CHAT_OPENAI_*"
Schema suggests: env_var_suggestion: "FLEX_CHAT_OPENAI_KEY"

Dropdown shows (filtered by pattern):
  ✅ FLEX_CHAT_OPENAI_KEY (suggested)
  ✅ FLEX_CHAT_OPENAI_PROD_KEY (detected)
  ❌ FLEX_CHAT_ANTHROPIC_KEY (hidden - wrong pattern)

Generated config: "api_key": "${FLEX_CHAT_OPENAI_KEY}"
Instructions: export FLEX_CHAT_OPENAI_KEY="sk-..."
```

**Schema-Driven Forms**:
```javascript
// Provider implements:
getConnectionSchema() {
  return {
    fields: [
      { name: "base_url", type: "url", default: "...", hint: "..." },
      { 
        name: "api_key", 
        type: "secret", 
        env_var_pattern: "FLEX_CHAT_OPENAI_*",
        env_var_suggestion: "FLEX_CHAT_OPENAI_KEY"
      }
    ],
    capabilities: { list_models: true, test_connection: true }
  }
}
```

**Model Discovery** (saves startup query):
```
Query provider → List 25 models → User selects 3
Generated config includes: "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
Backend skips model query at startup (already in config)
```

**Output Options**:
1. Copy config snippet + instructions (manual paste)
2. Download full merged config.json (replace file)

### Use Cases
- **Onboarding**: New users set up connections without reading docs
- **Development**: Quick switch between dev/staging/prod connections
- **Experimentation**: Test new providers without manual JSON editing
- **Troubleshooting**: Verify connections, diagnose issues
- **Team Sharing**: Export config (no secrets) → teammates import → set own env vars

### Integration Points
- **Config Viewer UI**: Display and test configured connections
- **Config Presets**: Save connection setups as presets
- **UI-Driven Config**: Build entire config from scratch

**Why This Matters**: Transforms configuration from error-prone manual editing to secure, guided, testable experience. New providers automatically get great setup UX by implementing schema interface.

---

### Performance & Monitoring
- [ ] Prometheus/Grafana integration
- [ ] Request tracing and logging
- [ ] Performance profiling
- [ ] Caching layer for queries
- [ ] Rate limiting per user/API key
- [ ] Query analytics and insights

### Platform Features
- [ ] Multi-user support with authentication
- [ ] Role-based access control (RBAC)
- [ ] Team workspaces
- [ ] API key management
- [ ] Usage quotas and billing
- [ ] Audit logs

### Alternative Interfaces
- [ ] GraphQL API
- [ ] WebSocket support for real-time updates
- [ ] Streaming responses
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] CLI tool
- [ ] VS Code extension

---

## 🔨 Maintenance & Operations

### Regular Tasks
- [ ] Review and update dependencies (monthly)
- [ ] Security audit and updates (quarterly)
- [ ] Performance profiling and optimization (quarterly)
- [ ] Documentation review and updates (monthly)
- [ ] Example configurations validation (monthly)

### Technical Debt
- [ ] Add comprehensive error boundaries in React
- [ ] Implement proper logging framework (Winston/Pino)
- [ ] Add request tracing/correlation IDs
- [ ] Improve error messages for config validation
- [ ] Add configuration migration tool for version upgrades
- [ ] Refactor long functions (>100 lines)
- [ ] Add TypeScript types (gradual migration)

---

## 📚 Reference

For information about completed features, architecture decisions, and changes, see:
- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)** - Configuration guide
- **[config/examples/](config/examples/)** - Example configurations

### Key Environment Variables
- `FLEX_CHAT_CONFIG_FILE` - Full path to specific config file
- `FLEX_CHAT_CONFIG_FILE_PATH` - Alias for above
- `FLEX_CHAT_CONFIG_DIR` - Directory containing config.json
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `EMBEDDING_PROVIDER` - RAG wrapper embedding provider
- `OLLAMA_BASE_URL` - Ollama server URL

---

**Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.  
**Issues**: Report bugs and feature requests via GitHub Issues.
