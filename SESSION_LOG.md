# Session Log

## 2025-10-13

### Context
- User wanted to implement dynamic collection management system
- Goal: Allow users to create/manage knowledge bases via UI without config changes
- System should use collection metadata to drive AI behavior

### Decisions
- Collections store metadata (system_prompt, threshold, max_tokens, temperature) in ChromaDB
- Dynamic detection runs after configured strategies but before LLM fallback
- ChromaDB wrapper vs direct ChromaDB use different ports (5006 vs 8000) for clarity
- Documentation moved to `docs/` folder, keeping only README.md at root

### Commands Run
```bash
# Created docs directory
mkdir -p docs

# Moved documentation files
mv ARCHITECTURE.md COLLECTION_MANAGEMENT.md RETRIEVAL_PROVIDERS.md docs/
mv config/PROVIDER_COMPARISON.md docs/
mv SESSION_SUMMARY.md docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md

# Verified structure
ls -1 *.md  # Check root markdown files
ls docs/    # Check docs folder
```

### Changes Made

**Backend - Python Wrapper (`backend/rag/server.py`):**
- Created new enhanced wrapper with collection management endpoints
- Added: GET/POST /collections, POST /collections/:name/documents, DELETE /collections/:name
- Added CORS support for frontend integration
- Dynamic collection support in query endpoint

**Backend - Node.js Server (`backend/chat/server.js`):**
- Added collection management API endpoints
- Implemented `detectStrategyWithDynamicCollections()` function
- Modified chat endpoint to accept `selectedCollections` parameter
- Collections endpoints proxy to Python wrapper

**Backend - Retrieval Provider (`backend/chat/retrieval-providers/providers/ChromaDBWrapperProvider.js`):**
- Added `listCollections()` method
- Added `getCollectionInfo(collectionName)` method
- Enhanced `query()` to support dynamic collection parameter
- Added document upload proxy

**Frontend - Collections Page (`frontend/src/Collections.jsx`):**
- Full collection management UI
- Create collections with metadata form
- Upload documents (files or paste text)
- List/delete collections

**Frontend - Chat UI (`frontend/src/Chat.jsx`):**
- Added collection selector with checkboxes
- Shows document counts
- Select/Deselect all functionality
- Passes selected collections to backend

**Frontend - Navigation (`frontend/src/NavBar.jsx`, `frontend/src/App.jsx`):**
- Conditional Collections link (only shows if wrapper configured)
- Added /collections route

**Configuration Examples:**
- Fixed `redhat-complex.json` to use chromadb-wrapper type
- Created `chromadb-direct-server.json` example
- Updated `config/README.md` with port clarifications

**Documentation:**
- Created `docs/COLLECTION_MANAGEMENT.md` - Dynamic collections guide
- Created `docs/RETRIEVAL_PROVIDERS.md` - Retrieval abstraction details
- Created `docs/PROVIDER_COMPARISON.md` - ChromaDB provider comparison
- Created `docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md` - Detailed implementation summary
- Updated `README.md` - Complete rewrite with modern architecture
- Updated `config/README.md` - Reorganized examples by provider type
- Moved documentation to `docs/` folder
- Updated `CONTEXT.md` - Added documentation organization principle

**Scripts:**
- Updated `setup.sh` - Modern setup reflecting new architecture
- Updated `start.sh` - Intelligent wrapper detection and conditional startup

### TODOs / Next
- [ ] Test end-to-end collection creation and querying
- [ ] Test integration with example configurations
- [ ] Update package.json if additional dependencies needed

### Open Questions
- None - system is feature complete and ready for testing

### Key Technical Points
- **Port 5006:** ChromaDB wrapper (Python FastAPI)
- **Port 8000:** Direct ChromaDB HTTP server
- **Port 5005:** Chat server (Node.js)
- **Port 5173:** Frontend (React/Vite)

### Reference Documentation
See `docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md` for comprehensive implementation details including:
- Complete architecture diagrams
- Detailed flow explanations
- All files created/modified
- Configuration examples
- Testing checklist

---

## 2025-10-17

### Context
- Working on **Architecture Simplification Redesign** (see `docs/REDESIGN_SIMPLIFIED_ARCHITECTURE.md`)
- Goal: Replace complex nested strategy detection with simple linear flow
- Build: Phase 1 (RAG Collection), Phase 1b (Profile Building), Phase 2 (Intent Detection)
- Implemented conversational context handling with topic detection

### Key Design Decisions

**1. collectRagResults Return Type**
- Returns **single match object** when match found (not in array)
- Returns **array of partial results** when no match
- Returns **empty array** when no results meet thresholds
- Simplifies caller logic: `if (object && !isArray)` = match, else = partials/none

**2. Profile Structure**
- **Match**: `{rag_results: "match", service, collection, intent: identifier, documents}`
- **Partial/None**: `{rag_results: "partial|none", documents, intent: <detected>}`
- Intent parsed into service/collection if identifier format (e.g., "my_local_chroma/openshift-ai")
- NO user_message in profile (not needed for response matching)

**3. Topic Detection (NEW - not in original design)**
- Created `lib/topic-detector.js` to handle conversational follow-ups
- Runs BEFORE RAG collection
- Uses LLM to resolve unclear references ("it", "that", "them")
- Detects topic changes (ignores old context when topic shifts)
- Provides clear topic description for both RAG queries and intent detection
- Removed conversation history from intent detection (now redundant)

**4. Variable Substitution Syntax**
- `${VAR}` = environment variables (substituted at config load time)
- `{{variable}}` = template variables (substituted at response generation time)

**5. Intent Detection**
- Added "other" category for off-topic queries
- Uses detected topic (not raw message) for classification
- No longer needs conversation history (topic detector handles it)

**6. RAG Provider Query Response**
- Changed from returning array to returning `{results: [...], collectionMetadata: {}}`
- VectorProvider base class returns this structure
- ChromaDBWrapperProvider includes metadata from wrapper service
- Description comes from collection metadata for intent detection

### Changes from Original Design

**Added:**
- Topic detection phase (before RAG collection)
- "other" intent category
- Collection metadata in RAG responses
- Conversation history handling

**Changed:**
- collectRagResults returns single object for match (not array)
- Profile builder doesn't receive userMessage (receives topic instead)
- Intent detection simplified (no history, uses topic)
- Document structure: `{text, title, source}` only (no full metadata)

**Removed:**
- Collection metadata fields (prompt, max_tokens) from RAG results (responses handle this now)
- Conversation history from intent detection prompt

### Files Created

**New modules in backend/chat/lib/:**
- `config-loader.js` - Loads config, substitutes ${ENV_VARS}
- `rag-collector.js` - Phase 1: Collects RAG results, classifies match/partial
- `profile-builder.js` - Phase 1b: Builds profile, Phase 2: Detects intent
- `topic-detector.js` - Pre-Phase 1: Resolves conversational context

**New server:**
- `backend/chat/server-v2.js` - Clean orchestrator for new flow

### Files Modified

**Backend:**
- `backend/chat/retrieval-providers/base/VectorProvider.js` - Returns {results, collectionMetadata}
- `backend/chat/retrieval-providers/providers/ChromaDBWrapperProvider.js` - Returns metadata from wrapper
- `backend/chat/retrieval-providers/providers/ChromaDBProvider.js` - Updated for nested embedding config
- `backend/rag/server.py` - Returns collection_metadata in query response

**Config:**
- `config/examples/new_config.json` - Example for new architecture (not committed yet)

### Important Implementation Details

**1. Message Structure:**
```javascript
previousMessages: [{ role: "user", text: "..." }]
// NOTE: It's msg.text, NOT msg.content!
```

**2. Intent Config Structure:**
```javascript
intent: {
  provider: {
    llm: "local",
    model: "qwen2.5:3b-instruct"
  },
  detection: {
    "support": "Description...",
    "subscriptions": "Description..."
  }
}
```

**3. RAG Provider Query:**
```javascript
const response = await provider.query(text, options);
// Returns: { results: [...], collectionMetadata: {...} }
const results = response.results;
const metadata = response.collectionMetadata;
```

**4. Flow Summary:**
```
1. Extract recentUserMessages (last 3 user messages)
2. identifyTopic(userMessage, recentUserMessages) → topic
3. collectRagResults(topic, ...) → single match object OR array
4. IF match: buildProfileFromMatch(result)
   ELSE: buildProfileFromPartials(result, topic, ...)
      - Builds initial profile (rag_results, documents)
      - Detects intent via LLM (using topic + categories)
      - Parses service/collection if intent is identifier
5. Return profile for Phase 3 (Response Matching)
```

### Testing Done

**Scenarios tested:**
1. ✅ Direct match: "What is OpenShift AI?" → match, documents returned
2. ✅ No collections: "Red Hat subscriptions" → none, intent detected  
3. ✅ Partial match: "Tell me about machine learning" → partial, intent detected
4. ✅ Follow-up query: "Is it easy to use?" (with history) → resolves "it" correctly
5. ✅ Topic change: InstructLab → Subscriptions → detects change, ignores old context
6. ✅ Multi-turn: 4-query conversation with topic changes works correctly

### Known Issues / Gotchas

1. **Collection descriptions must be accurate** - Intent detection depends on good descriptions
2. **Topic detector needs conversation history** - Works best with 2-3 recent user messages
3. **Debug logging** - Currently has debug logs in topic-detector and profile-builder (commented out in profile-builder)
4. **Config examples not committed** - `new_config.json` still evolving

### Next Session TODO

**Phase 3: Response Matching** (`lib/response-matcher.js`)
- Iterate through `config.responses` array
- Match based on profile fields (rag_results, intent, service, collection, etc.)
- Support regex matching (e.g., `intent_regexp`, `collection_regexp`)
- Support "any" values (e.g., `rag_results: "any"` matches both match and partial)
- Return first matching response rule

**Phase 4: Response Generation** (`lib/response-generator.js`, `lib/variable-substitution.js`)
- Substitute template variables: `{{rag_context}}`, `{{user_message}}`, `{{profile.collection}}`
- Format documents into context string
- Call LLM with substituted prompt
- Return final response

**Then: End-to-end testing and polish**

### Commits Made
- `efdfca5` - Phase 1: RAG Collection implementation
- `39149f7` - Documentation updates  
- `cb4fc24` - Phase 1b & Phase 2: Profile Building + Intent Detection
- `e3250be` - Conversational context with topic detection

### Reference Documentation
- Design: `docs/REDESIGN_SIMPLIFIED_ARCHITECTURE.md`
- Config example: `config/examples/new_config.json` (uncommitted)
- TODO: `TODO.md`
