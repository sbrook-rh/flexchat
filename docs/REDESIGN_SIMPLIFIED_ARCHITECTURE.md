# Architecture Redesign: Simplification Proposal

**Status**: 🚧 Design Phase  
**Branch**: `redesign/simplified-architecture`  
**Date**: October 15, 2025

---

## Executive Summary

The current configuration and strategy detection system, while functional, has become overengineered with multiple layers of nested functions, complex branching logic, and unclear data flow. This document proposes a simplified architecture that maintains the core functionality while making the code more maintainable and easier to reason about.

---

## Part 1: Current State Analysis

### The Problem: Overengineered Flow

**Current request-to-response flow:**

```
Incoming Request
    ↓
┌─────────────────────────────────────────────────┐
│ Strategy Detection (Multiple Stages)            │
│                                                  │
│  1. Check for dynamic collections               │
│     ↓                                            │
│  2. Query RAG sources (if applicable)           │
│     ↓                                            │
│  3. Discover collections (may be multiple)      │
│     ↓                                            │
│  4. Check relevance scores vs thresholds        │
│     ↓                                            │
│  5. Maybe ask LLM for intent detection          │
│     (using metadata from vector DB)             │
│     ↓                                            │
│  6. Create or select strategy (could be dynamic)│
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ Response Generation                              │
│  - Strategy object                               │
│  - Context from RAG (if detected and selected)  │
│  - System prompt (from strategy or metadata)    │
└─────────────────────────────────────────────────┘
    ↓
Response
```

### Key Complexity Issues

1. **Multiple "Maybe" Branches**
   - Maybe hit RAG
   - Maybe multiple collections
   - Maybe ask LLM for intent
   - Maybe use dynamic strategy
   - Makes it hard to predict behavior

2. **Nested Function Calls**
   - `detectStrategyWithDynamicCollections()`
     - `detectStrategyWithRAG()`
       - `detectStrategyWithLLM()`
         - `generateResponse()`
   - Poor man's OO pattern
   - Hard to trace execution flow

3. **Data Mixing**
   - Strategy configuration (config.json)
   - Collection metadata (vector DB)
   - Runtime decisions (threshold logic)
   - No clear separation of concerns

4. **Threshold Confusion**
   - Lower threshold (immediate match)
   - Upper threshold (candidate for LLM)
   - Fallback threshold
   - Multiple concepts doing similar things

5. **Strategy vs Collection Confusion**
   - Strategies reference knowledge bases
   - Knowledge bases reference collections
   - Collections have their own metadata
   - Dynamic collections create implicit strategies
   - Too many layers of indirection

### What Works Well (Keep These!)

- ✅ **Multi-provider AI support** - Easy to swap providers
- ✅ **Dynamic collection creation** - Users can add knowledge bases via UI
- ✅ **RAG with fallback to LLM** - Core use case is solid
- ✅ **Context injection** - Combining retrieved docs with prompts works well
- ✅ **Model selection** - User can choose response/reasoning models
- ✅ **Markdown rendering** - Chat UX is good

---

## Part 2: Proposed Simplified Architecture

### Design Principles

1. **Linear Reasoning**: Request → Process → Response (clear steps, no deep nesting)
2. **Explicit Over Implicit**: Configuration clearly states what happens
3. **Separation of Concerns**: Config, routing, retrieval, generation are distinct
4. **Reduce Indirection**: Fewer layers between request and response

### Proposed Config Structure

```json
{
  "llms": {
    "local": {
      "type": "ollama",
      "base_url": "http://localhost:11434"
    },
    "chatgpt": {
      "type": "openai",
      "api_key": "${OPEN_API_KEY}",
      "base_url": "https://api.openai.com/v1"
    }
  },
  "rag_services": {
    "my_local_chroma": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "comment": "No collection = dynamic collections from UI",
      "match_threshold": 0.2,
      "candidate_threshold": 0.45,
      "intent_identifier": "knowledge_base",
      "query_mode": "first"
    },
    "company_product_docs": {
      "type": "chromadb",
      "url": "https://chroma.company.vpn.local",
      "collection": "product_documentation",
      "embedding": {
        "model": "text-embedding-ada-002",
        "llm": "chatgpt"
      },
      "match_threshold": 0.2
    }
  },
  "intent_detection": {
    "llm": "local",
    "model": "qwen2.5:3b-instruct"
  },
  "embedding": {
    "model": "nomic-embed-text",
    "llm": "local"
  },
  "responses": [
    {
      "match": {
        "rag_result": "match",
        "service": "company_product_docs"
      },
      "prompt": "You are an expert Red Hat support engineer...",
      "max_tokens": 2000,
      "llm": "chatgpt",
      "model": "gpt-3.5-turbo"
    },
    {
      "match": {
        "rag_result": "match",
        "service": "my_local_chroma"
      },
      "prompt": "Optional intro here followed by: ${profile.service_prompt}",
      "max_tokens": "${profile.service_tokens}",
      "llm": "local",
      "model": "qwen2.5:14b-instruct"
    },
    {
      "match": {
        "rag_result": "candidate",
        "intent": "technical_support"
      },
      "prompt": "I found some potentially relevant information...",
      "llm": "local"
    },
    {
      "comment": "No match clause = fallback",
      "prompt": "I don't have specific knowledge about that topic...",
      "max_tokens": 200,
      "llm": "local",
      "model": "qwen2.5:7b-instruct"
    }
  ]
}
```

**Key Simplifications:**

1. **Named Resources**: LLMs and RAG services are named and reusable
2. **No "Strategies"**: Eliminated complex strategy objects
3. **Sequential Response Matching**: Simple array, first match wins
4. **Flat Configuration**: Less nesting, clearer structure
5. **Service-Level Config**: Thresholds and behavior at service level

### Proposed Request Flow

**Three-Phase Linear Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Build Profile                                          │
│                                                                  │
│ Input: User message + Selected collections (from UI)            │
│                                                                  │
│ 1. Query ONLY user-selected RAG services/collections            │
│    - Format: <service>/<collection>                             │
│    - Check distance against thresholds                          │
│    - Based on query_mode:                                       │
│      • "first": Stop on first match within match_threshold      │
│      • "all": Query all, collect results (future enhancement)   │
│                                                                  │
│ 2. Build profile object:                                        │
│    {                                                             │
│      rag_result: "match" | "candidate" | "none",               │
│      service: "my_local_chroma",                                │
│      collection: "openshift",                                   │
│      distance: 0.15,                                            │
│      context: [...docs...],                                     │
│      intent: "knowledge_base",  // from intent_identifier       │
│      service_prompt: "...",     // from collection metadata     │
│      service_tokens: 500        // from collection metadata     │
│    }                                                             │
│                                                                  │
│ 3. Optionally run intent_detection (if needed by responses)     │
│    - Can be lazy: only compute if response rule needs it        │
│    - Uses configured intent_detection LLM/model                 │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Match Response Rule                                    │
│                                                                  │
│ Iterate through responses array sequentially:                   │
│   for each response in config.responses:                        │
│     if matches(response.match, profile):                        │
│       return response                                            │
│                                                                  │
│ Match evaluation examples:                                      │
│   { rag_result: "match", service: "company_docs" }             │
│     → Check profile.rag_result == "match" AND                   │
│       profile.service == "company_docs"                         │
│                                                                  │
│   { collection_regexp: "/openshift/i" }                         │
│     → Check profile.collection matches regex                    │
│                                                                  │
│   { intent: "technical_support" }                               │
│     → Check profile.intent == "technical_support"               │
│                                                                  │
│   {} (empty match)                                              │
│     → Always matches (fallback)                                 │
│                                                                  │
│ First matching response wins!                                   │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Generate Response                                      │
│                                                                  │
│ Using matched response config:                                  │
│   1. Load LLM (from config.llms[response.llm])                  │
│   2. Construct prompt:                                          │
│      - Use response.prompt as template                          │
│      - Substitute ${profile.*} variables                        │
│      - Inject RAG context if rag_result is "match"              │
│   3. Call LLM with:                                             │
│      - Constructed prompt                                       │
│      - response.model                                           │
│      - response.max_tokens                                      │
│   4. Return response to user                                    │
└─────────────────────────────────────────────────────────────────┘
    ↓
Response
```

### Key Simplifications

#### What We Remove:
1. **❌ "Strategies" Object**: No more complex strategy definitions with detection/response split
2. **❌ Nested Detection Functions**: No more `detectStrategyWithDynamicCollections()` → `detectStrategyWithRAG()` → `detectStrategyWithLLM()`
3. **❌ "Knowledge Bases" Section**: RAG services defined once, referenced directly
4. **❌ Multiple Threshold Types**: Consolidate into service-level thresholds
5. **❌ Strategy Discovery Logic**: No need to "discover" which strategy applies
6. **❌ Implicit Behavior**: Everything explicit in config

#### What We Simplify:
1. **✓ Configuration Structure**: Flat, named resources instead of nested hierarchies
2. **✓ Flow Logic**: Three clear phases instead of recursive detection
3. **✓ Response Selection**: Simple array matching instead of complex routing
4. **✓ Threshold Logic**: Match vs. candidate at service level
5. **✓ Collection References**: Simple `<service>/<collection>` format

#### What We Consolidate:
1. **✓ Provider Config**: All LLM config in `llms`, all RAG config in `rag_services`
2. **✓ Embedding Config**: Global default, per-service override
3. **✓ Intent Detection**: Single global config, used when needed
4. **✓ Profile Pattern**: Single object carries all context through pipeline

#### What We Clarify:
1. **✓ User Control**: User selects collections, we query only those
2. **✓ Execution Order**: Sequential response matching, first wins
3. **✓ Data Flow**: Request → Profile → Match → Response
4. **✓ Variable Substitution**: Explicit `${profile.*}` syntax
5. **✓ Fallback Behavior**: Last response with no match clause is fallback

---

## Part 2B: Detailed Design Specifications

### The Profile Object

The profile is the key abstraction that bridges request processing and response matching.

#### Profile Structure (query_mode: "first")

```javascript
{
  // RAG Results
  rag_result: "match" | "candidate" | "none",
  service: "my_local_chroma",           // Which service matched
  collection: "openshift",               // Which collection matched
  distance: 0.15,                        // Actual similarity distance
  context: [                             // Retrieved documents
    { text: "...", metadata: {...} },
    { text: "...", metadata: {...} }
  ],
  
  // Intent Classification
  intent: "knowledge_base/openshift",    // From service.intent_identifier + "/" + collection name
  
  // Collection Metadata (from dynamic collections)
  service_prompt: "You are an expert...", // From collection metadata
  service_tokens: 500,                    // From collection metadata
  service_model: "qwen2.5:7b",           // From collection metadata (optional)
  
  // Request Metadata
  user_message: "original message",
  selected_collections: ["my_local_chroma/openshift", "my_local_chroma/kubernetes"],
  timestamp: "2025-10-16T10:30:00Z"
}
```

#### Profile Structure (query_mode: "all" - Future)

```javascript
{
  // Multiple RAG Results
  rag_results: [
    {
      service: "my_local_chroma",
      collection: "openshift",
      distance: 0.15,
      context: [...]
    },
    {
      service: "my_local_chroma",
      collection: "kubernetes",
      distance: 0.28,
      context: [...]
    }
  ],
  
  // Best single match (for compatibility)
  best_match: {
    rag_result: "match",
    service: "my_local_chroma",
    collection: "openshift",
    distance: 0.15,
    context: [...]
  },
  
  // Combined context (all results merged)
  combined_context: [...],
  
  // Intent and metadata
  intents: [
    "knowledge_base/openshift",
    "knowledge_base/kubernetes"
  ],
  primary_intent: "knowledge_base/openshift",  // Best match intent
  // ... other fields
}
```

### Query Modes

#### Mode: "first" (Default)

**Behavior:**
1. Query user-selected collections in order
2. Check each result against thresholds
3. **Stop on first match** within `match_threshold`
4. Set profile to that single result

**Use Cases:**
- Most common scenario
- User wants answer from specific knowledge base
- Optimize for speed (don't query everything)

**Example:**
```json
"my_local_chroma": {
  "query_mode": "first",
  "match_threshold": 0.2
}
```

If user selected `["my_local_chroma/openshift", "my_local_chroma/kubernetes"]`:
- Query "openshift" collection
- If distance < 0.2, use it and stop
- Otherwise query "kubernetes" collection
- If distance < 0.2, use it
- Otherwise, rag_result = "none"

#### Mode: "all" (Future Enhancement)

**Behavior:**
1. Query ALL user-selected collections in parallel
2. Collect all results
3. Build profile with multiple results
4. Allow response rules to match on multiple results

**Use Cases:**
- User wants comprehensive answer across knowledge bases
- Combining context from multiple domains
- More complex matching logic needed

**Future Implementation Considerations:**
- How to combine contexts?
- How to handle conflicting information?
- Response rules need richer matching (e.g., "matched at least 2 collections")

### Threshold Logic

#### match_threshold (Required)

```json
"match_threshold": 0.2
```

**Meaning:** If distance < match_threshold, this is a strong match.

**Behavior:**
- RAG query returns distance (cosine distance, lower = better)
- If `distance < match_threshold`: Set `profile.rag_result = "match"`
- Strong confidence, use this result immediately

#### candidate_threshold (Optional)

```json
"candidate_threshold": 0.45
```

**Meaning:** If distance is between match and candidate, this is a potential match that needs confirmation.

**Behavior:**
- If `match_threshold <= distance < candidate_threshold`: Set `profile.rag_result = "candidate"`
- Weak confidence, might need intent_detection to confirm
- Response rules can decide how to handle candidates

**If NOT specified:** Any result not matching is discarded (rag_result = "none")

#### Example Scenarios

```
Distance = 0.15:
  match_threshold = 0.2, candidate_threshold = 0.45
  → rag_result = "match" (0.15 < 0.2)

Distance = 0.35:
  match_threshold = 0.2, candidate_threshold = 0.45
  → rag_result = "candidate" (0.2 <= 0.35 < 0.45)

Distance = 0.55:
  match_threshold = 0.2, candidate_threshold = 0.45
  → rag_result = "none" (0.55 >= 0.45)

Distance = 0.35:
  match_threshold = 0.2, candidate_threshold = NOT_SET
  → rag_result = "none" (0.35 >= 0.2, no candidate range)
```

### Intent Identifier

**Purpose:** Tag profile with a category/type when a specific RAG service matches.

#### Configuration

```json
"rag_services": {
  "my_local_chroma": {
    "intent_identifier": "knowledge_base"
  }
}
```

#### Behavior

When this service matches, intent is composed from identifier and collection:
```javascript
profile.intent = `${service.intent_identifier}/${collection}`
// Example: "knowledge_base/openshift"
```

If no intent_identifier is specified, intent is just the collection:
```javascript
profile.intent = collection
// Example: "openshift"
```

#### Use Cases

**Example 1: Distinguish RAG sources**
```json
{
  "company_docs": {
    "collection": "product_docs",
    "intent_identifier": "internal_docs"
  },
  "my_local_chroma": {
    "intent_identifier": "user_knowledge"
  }
}

// Response can match based on intent:
{
  "match": { "intent_regexp": "/^internal_docs\\/" },
  "prompt": "Based on our internal documentation..."
}
// Matches: "internal_docs/product_docs"

// Or match specific collection:
{
  "match": { "intent": "user_knowledge/openshift" },
  "prompt": "Based on your OpenShift knowledge base..."
}
```

**Example 2: Match by service category**
```json
{
  "technical_kb": {
    "intent_identifier": "technical_support"
  }
}

// Match any collection under technical_support:
{
  "match": { "intent_regexp": "/^technical_support\\/" },
  "prompt": "Let me check our technical documentation..."
}
// Matches: "technical_support/kubernetes", "technical_support/openshift", etc.
```

**Example 3: Match by collection across services**
```json
// Match any "openshift" collection regardless of service
{
  "match": { "intent_regexp": "/\\/openshift$/" },
  "prompt": "OpenShift-specific guidance..."
}
// Matches: "knowledge_base/openshift", "technical_kb/openshift", etc.
```

### Response Matching Logic

#### Match Evaluation

Response rules contain a `match` object. Each field is ANDed together:

```json
{
  "match": {
    "rag_result": "match",
    "service": "company_docs",
    "intent": "technical_support"
  }
}
```

**Evaluates to:**
```javascript
profile.rag_result === "match" 
  && profile.service === "company_docs"
  && profile.intent === "technical_support"
```

#### Match Field Types

**Exact String Match:**
```json
{ "service": "my_local_chroma" }
→ profile.service === "my_local_chroma"
```

**Regular Expression Match:**
```json
{ "collection_regexp": "/openshift/i" }
→ /openshift/i.test(profile.collection)
```

**Enum Match:**
```json
{ "rag_result": "match" }
→ profile.rag_result === "match"
```

**Array Match (Future):**
```json
{ "intent_any": ["technical", "support", "help"] }
→ ["technical", "support", "help"].includes(profile.intent)
```

#### Empty Match (Fallback)

```json
{
  "comment": "Fallback response",
  "prompt": "I don't have specific information..."
}
```

If no `match` field present, or `match: {}`, this always matches.

**Best Practice:** Last response should have no match clause for guaranteed fallback.

### Variable Substitution

Response prompts can reference profile fields using `${profile.*}` syntax:

```json
{
  "prompt": "Based on ${profile.collection}, here's what I found: ${profile.context}"
}
```

#### Available Variables

**From Profile:**
- `${profile.service}` - Service name
- `${profile.collection}` - Collection name
- `${profile.distance}` - Similarity distance
- `${profile.context}` - Retrieved documents (formatted)
- `${profile.intent}` - Intent identifier
- `${profile.service_prompt}` - From collection metadata
- `${profile.service_tokens}` - From collection metadata
- `${profile.user_message}` - Original user query

**Special Variables:**
- `${context}` - Shorthand for `${profile.context}` (formatted as text)
- `${user}` - Shorthand for `${profile.user_message}`

#### Context Formatting

The `${context}` variable formats retrieved documents:

```
Based on the following information:

---
Document 1:
[document text]

---
Document 2:
[document text]

---
```

Alternative format configuration (future):
```json
{
  "context_format": "numbered" | "markdown" | "plain"
}
```

### Intent Detection Integration

#### When to Use

Intent detection can be triggered in two scenarios:

**1. Candidate Results:**
```json
{
  "match": {
    "rag_result": "candidate"  // Triggers intent check
  }
}
```

**2. No RAG Results:**
```json
{
  "match": {
    "rag_result": "none"
  }
}
```

Response rule can use intent_detection to classify query even without RAG match.

#### Configuration

```json
"intent_detection": {
  "llm": "local",
  "model": "qwen2.5:3b-instruct"
}
```

#### Prompt Template (Auto-Generated)

```
You are classifying user queries for a support system.

Available categories:
- technical_support
- general_information
- off_topic

User query: "How do I configure OpenShift networking?"

Respond with only the category name.
```

**Future:** Allow custom intent detection prompts in config.

---

## Part 2C: Example Use Cases

### Example 1: Simple RAG-Only System

**Scenario:** Single knowledge base, direct answers only.

```json
{
  "llms": {
    "local": { "type": "ollama", "base_url": "http://localhost:11434" }
  },
  "rag_services": {
    "my_docs": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.3
    }
  },
  "embedding": {
    "model": "nomic-embed-text",
    "llm": "local"
  },
  "responses": [
    {
      "match": { "rag_result": "match" },
      "prompt": "Based on the documentation:\n\n${context}\n\nAnswer: ",
      "llm": "local",
      "model": "qwen2.5:7b"
    },
    {
      "prompt": "I don't have information about that in my knowledge base.",
      "llm": "local",
      "model": "qwen2.5:7b"
    }
  ]
}
```

**Flow:**
1. User selects collection in UI
2. System queries collection
3. If match found → use context in answer
4. If no match → polite decline

### Example 2: Multi-Service with Intent Detection

**Scenario:** Company docs + dynamic collections, with smart routing.

```json
{
  "llms": {
    "production": { "type": "openai", "api_key": "${OPENAI_KEY}" },
    "local": { "type": "ollama", "base_url": "http://localhost:11434" }
  },
  "rag_services": {
    "company_docs": {
      "type": "chromadb",
      "url": "https://chroma.internal",
      "collection": "product_docs",
      "embedding": { "model": "text-embedding-ada-002", "llm": "production" },
      "match_threshold": 0.2,
      "intent_identifier": "company_knowledge"
    },
    "user_kb": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.25,
      "candidate_threshold": 0.45,
      "intent_identifier": "user_knowledge"
    }
  },
  "intent_detection": {
    "llm": "local",
    "model": "qwen2.5:3b-instruct"
  },
  "embedding": {
    "model": "nomic-embed-text",
    "llm": "local"
  },
  "responses": [
    {
      "match": { "rag_result": "match", "intent_regexp": "/^company_knowledge\\/" },
      "prompt": "According to our product documentation:\n\n${context}",
      "llm": "production",
      "model": "gpt-4o-mini",
      "max_tokens": 1000
    },
    {
      "match": { "rag_result": "match", "intent_regexp": "/^user_knowledge\\/" },
      "prompt": "${profile.service_prompt}\n\nContext: ${context}",
      "llm": "local",
      "model": "qwen2.5:14b"
    },
    {
      "match": { "rag_result": "candidate" },
      "prompt": "I found some potentially relevant information, but I'm not certain it answers your question.",
      "llm": "local",
      "model": "qwen2.5:7b"
    },
    {
      "prompt": "I don't have specific information to answer that question.",
      "llm": "local",
      "model": "qwen2.5:3b",
      "max_tokens": 100
    }
  ]
}
```

**Flow:**
1. User selects collections (e.g., `company_docs/product_docs`, `user_kb/openshift`)
2. System queries both
3. First match determines which response rule applies
4. Company docs → Use production OpenAI
5. User knowledge → Use local model with dynamic prompt
6. Candidate → Express uncertainty
7. No match → Decline politely

### Example 3: Collection-Specific Responses

**Scenario:** Different responses based on which collection matched.

```json
{
  "rag_services": {
    "my_kb": {
      "type": "chromadb-wrapper",
      "url": "http://localhost:5006",
      "match_threshold": 0.3
    }
  },
  "responses": [
    {
      "match": { 
        "rag_result": "match",
        "collection_regexp": "/kubernetes/i"
      },
      "prompt": "Kubernetes Answer:\n\n${context}\n\nFor more details, check kubectl docs.",
      "llm": "local",
      "model": "qwen2.5:7b"
    },
    {
      "match": { 
        "rag_result": "match",
        "collection_regexp": "/openshift/i"
      },
      "prompt": "OpenShift Answer:\n\n${context}\n\nFor more details, check oc docs.",
      "llm": "local",
      "model": "qwen2.5:7b"
    },
    {
      "match": { "rag_result": "match" },
      "prompt": "Based on ${profile.collection}:\n\n${context}",
      "llm": "local",
      "model": "qwen2.5:7b"
    },
    {
      "prompt": "No relevant information found.",
      "llm": "local",
      "model": "qwen2.5:3b"
    }
  ]
}
```

**Flow:**
1. Match on specific collections with regex
2. Tailor response based on which collection matched
3. Collection-specific instructions/links
4. Fallback for other collections

### Example 4: Chat-Only (No RAG)

**Scenario:** Simple conversational bot.

```json
{
  "llms": {
    "local": { "type": "ollama", "base_url": "http://localhost:11434" }
  },
  "responses": [
    {
      "prompt": "You are a helpful assistant. Be concise and friendly.",
      "llm": "local",
      "model": "qwen2.5:14b",
      "max_tokens": 500
    }
  ]
}
```

**Flow:**
1. No RAG services configured
2. No user-selected collections
3. Profile will have `rag_result: "none"`
4. First (only) response matches (no match clause)
5. Direct chat response

---

## Part 3: Impact Analysis

### Code Changes Required

#### High Impact (Major Rewrite)
- [ ] `backend/chat/server.js` - Main detection and routing logic
- [ ] Strategy detection functions (entire section)
- [ ] Response generation logic
- [ ] Configuration loading and validation

#### Medium Impact (Significant Changes)
- [ ] `backend/chat/ai-providers/` - May need adjustments
- [ ] `backend/chat/retrieval-providers/` - May need adjustments
- [ ] Frontend collection management (`Collections.jsx`)
- [ ] Frontend chat interface (`Chat.jsx`)

#### Low Impact (Minor Tweaks)
- [ ] RAG wrapper service (`backend/rag/server.py`)
- [ ] Provider implementations
- [ ] Health check endpoints

### Configuration Files

- [ ] **Delete/Archive**: All current example configs
- [ ] **Create New**: Examples for new config structure
  - [ ] Chat-only example
  - [ ] Single RAG collection example
  - [ ] Multi-collection example
  - [ ] Complex multi-domain example

### Documentation Updates

- [ ] **Major Rewrite**: 
  - [ ] `README.md` - Quick start and architecture
  - [ ] `docs/CONFIGURATION.md` - Complete rewrite
  - [ ] `docs/ARCHITECTURE.md` - Update with new flow
  - [ ] `docs/COLLECTION_MANAGEMENT.md` - Update if collection handling changes
  - [ ] `API_REFERENCE.md` - Update endpoint behaviors

- [ ] **Review & Update**:
  - [ ] `docs/DYNAMIC_COLLECTIONS_IMPLEMENTATION.md`
  - [ ] `docs/RETRIEVAL_PROVIDERS.md`
  - [ ] `docs/REASONING_MODELS.md`

### Testing Updates

#### Tests to Remove
- [ ] `__tests__/strategy-detection.test.js` - Current strategy detection logic (60+ outlined tests)
- [ ] Any tests tightly coupled to current nested structure

#### Tests to Keep/Update
- [ ] `__tests__/strategy-detection-example.test.js` - Update to new patterns
- [ ] `__tests__/multi-collection.test.js` - Update if collection handling changes
- [ ] Provider tests (if abstraction remains similar)

#### New Tests Needed
- [ ] Tests for new simplified flow
- [ ] Tests for new config structure
- [ ] Integration tests for new routing logic

### Migration Strategy

1. **Phase 1: Design** (Current)
   - Document new approach
   - Get alignment on design
   - Identify all impacts

2. **Phase 2: Core Implementation**
   - Rewrite server.js with new flow
   - Update config schema
   - Create new example configs

3. **Phase 3: Adaptation**
   - Update frontend if needed
   - Update provider interfaces if needed
   - Ensure RAG wrapper compatibility

4. **Phase 4: Documentation**
   - Rewrite all major docs
   - Update examples
   - Create migration guide (for existing users)

5. **Phase 5: Testing**
   - Write new test suite
   - Manual testing across scenarios
   - Performance validation

---

## Part 4: Open Questions

### Technical Questions

1. **Dynamic Collections**: How do they fit in the new model?
   - Still create collections via UI?
   - Still store metadata in vector DB?
   - How do they participate in routing?

2. **Multi-Collection Scenarios**: 
   - Do we still support querying multiple collections?
   - How do we combine results?
   - Is there still a "selection" mechanism?

3. **Fallback Logic**:
   - Still have RAG → LLM fallback?
   - How do we decide to fallback?
   - Simpler threshold logic?

4. **Provider Abstractions**:
   - Keep current AI provider abstraction?
   - Keep current retrieval provider abstraction?
   - Simplify either/both?

5. **Reasoning Models**:
   - Keep two-stage pipeline?
   - Still use separate reasoning models?
   - How does this fit in simplified flow?

### Product Questions

1. **Backward Compatibility**: 
   - Do we care about migrating existing configs?
   - Should we provide a migration tool?

2. **Breaking Changes**:
   - Is this a major version bump (2.0)?
   - Document breaking changes clearly?

3. **Timeline**:
   - How long for full implementation?
   - Phased rollout or big bang?

---

## Part 5: Implementation Considerations

### Code Structure (Proposed)

Instead of nested functions, use a clear pipeline:

```javascript
// server.js - Simplified structure

async function handleChatRequest(req, res) {
  const { message, selectedCollections, chatHistory } = req.body;
  
  try {
    // PHASE 1: Build Profile
    const profile = await buildProfile(message, selectedCollections, config);
    
    // PHASE 2: Match Response Rule
    const responseRule = matchResponseRule(profile, config.responses);
    
    // PHASE 3: Generate Response
    const response = await generateResponse(profile, responseRule, config);
    
    res.json({ response, profile }); // Include profile for debugging
  } catch (error) {
    handleError(error, res);
  }
}

async function buildProfile(message, selectedCollections, config) {
  const profile = {
    user_message: message,
    selected_collections: selectedCollections,
    rag_result: "none",
    timestamp: new Date().toISOString()
  };
  
  // Query selected RAG collections
  if (selectedCollections && selectedCollections.length > 0) {
    const ragResult = await queryRagServices(
      message, 
      selectedCollections, 
      config.rag_services,
      config.embedding
    );
    
    if (ragResult) {
      Object.assign(profile, ragResult);
    }
  }
  
  // Intent detection will be lazy - only computed if needed by response rule
  // (Can be added as a getter or computed on-demand)
  
  return profile;
}

async function queryRagServices(message, selectedCollections, ragServices, embeddingConfig) {
  for (const collectionRef of selectedCollections) {
    const [serviceName, collectionName] = collectionRef.split('/');
    const service = ragServices[serviceName];
    
    if (!service) continue;
    
    // Query this collection
    const result = await queryCollection(message, service, collectionName, embeddingConfig);
    
    // Check thresholds
    const ragResult = classifyResult(result.distance, service);
    
    if (ragResult === "match" || service.query_mode !== "first") {
      // Compose intent from service identifier + collection name
      const intent = service.intent_identifier 
        ? `${service.intent_identifier}/${collectionName}`
        : collectionName;
      
      return {
        rag_result: ragResult,
        service: serviceName,
        collection: collectionName,
        distance: result.distance,
        context: result.documents,
        intent: intent,  // e.g., "knowledge_base/openshift"
        service_prompt: result.metadata?.prompt || null,
        service_tokens: result.metadata?.max_tokens || null
      };
    }
    
    // If query_mode is "first" and not a match, try next collection
  }
  
  return null; // No matches
}

function classifyResult(distance, service) {
  if (distance < service.match_threshold) {
    return "match";
  }
  if (service.candidate_threshold && distance < service.candidate_threshold) {
    return "candidate";
  }
  return "none";
}

function matchResponseRule(profile, responses) {
  for (const response of responses) {
    if (!response.match || Object.keys(response.match).length === 0) {
      return response; // Fallback (no match clause)
    }
    
    if (evaluateMatch(response.match, profile)) {
      return response;
    }
  }
  
  // Should never reach here if config has fallback
  throw new Error("No matching response rule found");
}

function evaluateMatch(matchClause, profile) {
  for (const [key, value] of Object.entries(matchClause)) {
    if (key === "collection_regexp") {
      const regex = new RegExp(value.slice(1, -2), value.slice(-1)); // Parse /pattern/flags
      if (!regex.test(profile.collection)) return false;
    } else if (key.endsWith("_regexp")) {
      const field = key.replace("_regexp", "");
      const regex = new RegExp(value.slice(1, -2), value.slice(-1));
      if (!regex.test(profile[field])) return false;
    } else {
      // Direct equality check
      if (profile[key] !== value) return false;
    }
  }
  return true; // All conditions matched
}

async function generateResponse(profile, responseRule, config) {
  // Get LLM
  const llm = config.llms[responseRule.llm];
  if (!llm) throw new Error(`LLM '${responseRule.llm}' not found`);
  
  // Construct prompt with variable substitution
  let prompt = responseRule.prompt;
  prompt = substituteVariables(prompt, profile);
  
  // Call LLM
  const llmProvider = getLLMProvider(llm);
  const response = await llmProvider.chat({
    model: responseRule.model,
    prompt: prompt,
    max_tokens: responseRule.max_tokens || 500,
    // ... other options
  });
  
  return response;
}

function substituteVariables(template, profile) {
  return template.replace(/\$\{profile\.(\w+)\}|\$\{(\w+)\}/g, (match, profileKey, shortKey) => {
    if (profileKey) {
      return profile[profileKey] !== undefined ? String(profile[profileKey]) : match;
    }
    if (shortKey === 'context') {
      return formatContext(profile.context);
    }
    if (shortKey === 'user') {
      return profile.user_message;
    }
    return match;
  });
}

function formatContext(documents) {
  if (!documents || documents.length === 0) return "";
  
  let formatted = "Based on the following information:\n\n";
  documents.forEach((doc, idx) => {
    formatted += `---\nDocument ${idx + 1}:\n${doc.text}\n\n`;
  });
  return formatted;
}
```

### Testing Strategy

With this structure, testing becomes straightforward:

```javascript
// test/profile-building.test.js
describe('buildProfile', () => {
  test('builds profile with match result', async () => {
    const mockRagQuery = jest.fn().mockResolvedValue({
      distance: 0.15,
      documents: [{ text: "Test doc" }]
    });
    
    const profile = await buildProfile(
      "test message",
      ["my_kb/openshift"],
      mockConfig
    );
    
    expect(profile.rag_result).toBe("match");
    expect(profile.service).toBe("my_kb");
    expect(profile.collection).toBe("openshift");
  });
});

// test/response-matching.test.js
describe('matchResponseRule', () => {
  test('matches exact service and rag_result', () => {
    const profile = { rag_result: "match", service: "my_kb" };
    const responses = [
      { match: { rag_result: "match", service: "my_kb" }, prompt: "A" },
      { prompt: "B" }
    ];
    
    const matched = matchResponseRule(profile, responses);
    expect(matched.prompt).toBe("A");
  });
  
  test('falls back to no-match response', () => {
    const profile = { rag_result: "none" };
    const responses = [
      { match: { rag_result: "match" }, prompt: "A" },
      { prompt: "B" }
    ];
    
    const matched = matchResponseRule(profile, responses);
    expect(matched.prompt).toBe("B");
  });
});

// test/variable-substitution.test.js
describe('substituteVariables', () => {
  test('substitutes profile variables', () => {
    const template = "Service: ${profile.service}, Collection: ${profile.collection}";
    const profile = { service: "my_kb", collection: "openshift" };
    
    const result = substituteVariables(template, profile);
    expect(result).toBe("Service: my_kb, Collection: openshift");
  });
});
```

### Configuration Validation

Add schema validation on startup:

```javascript
function validateConfig(config) {
  const errors = [];
  
  // Check required sections
  if (!config.llms || Object.keys(config.llms).length === 0) {
    errors.push("Config must define at least one LLM");
  }
  
  if (!config.responses || config.responses.length === 0) {
    errors.push("Config must define at least one response rule");
  }
  
  // Check response rules reference valid LLMs
  config.responses?.forEach((response, idx) => {
    if (response.llm && !config.llms[response.llm]) {
      errors.push(`Response ${idx} references undefined LLM: ${response.llm}`);
    }
  });
  
  // Check RAG services reference valid LLMs for embedding
  Object.entries(config.rag_services || {}).forEach(([name, service]) => {
    if (service.embedding?.llm && !config.llms[service.embedding.llm]) {
      errors.push(`RAG service '${name}' references undefined LLM: ${service.embedding.llm}`);
    }
  });
  
  // Validate fallback exists
  const hasFallback = config.responses.some(r => !r.match || Object.keys(r.match).length === 0);
  if (!hasFallback) {
    errors.push("Config should have at least one response with no match clause (fallback)");
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}
```

### Migration Path

For existing users, provide migration tool:

```javascript
// migrate-config.js
function migrateOldToNew(oldConfig) {
  const newConfig = {
    llms: {},
    rag_services: {},
    embedding: oldConfig.embedding,
    responses: []
  };
  
  // Convert providers to llms
  Object.entries(oldConfig.providers).forEach(([name, provider]) => {
    newConfig.llms[name] = {
      type: provider.type,
      base_url: provider.base_url || provider.url,
      api_key: provider.api_key
    };
  });
  
  // Convert knowledge_bases to rag_services
  Object.entries(oldConfig.knowledge_bases || {}).forEach(([name, kb]) => {
    newConfig.rag_services[name] = {
      type: kb.type,
      url: kb.url,
      collection: kb.collection,
      match_threshold: kb.threshold || 0.3
    };
  });
  
  // Convert strategies to responses
  oldConfig.strategies?.forEach(strategy => {
    const response = {
      match: convertDetection(strategy.detection),
      prompt: strategy.response.system_prompt,
      llm: strategy.response.provider,
      model: strategy.response.model,
      max_tokens: strategy.response.max_tokens
    };
    newConfig.responses.push(response);
  });
  
  // Add fallback if not present
  if (oldConfig.default_strategy) {
    const defaultStrategy = oldConfig.strategies?.find(s => s.name === oldConfig.default_strategy);
    if (defaultStrategy) {
      newConfig.responses.push({
        prompt: defaultStrategy.response.system_prompt,
        llm: defaultStrategy.response.provider,
        model: defaultStrategy.response.model
      });
    }
  }
  
  return newConfig;
}
```

### Performance Optimizations

1. **Lazy Intent Detection**: Only call intent_detection LLM if a response rule actually needs `profile.intent`
2. **Parallel RAG Queries**: If query_mode is "all", query collections in parallel
3. **Caching**: Cache embedding results for repeated queries
4. **Connection Pooling**: Reuse HTTP connections to RAG services and LLM providers

### Debugging Support

Add profile logging for troubleshooting:

```javascript
// Add to response
res.json({
  response: response,
  debug: {
    profile: profile,
    matched_rule_index: matchedIndex,
    match_evaluation: matchEvaluationDetails
  }
});
```

Frontend can show this in a debug panel.

---

## Part 5B: Refined Implementation Flow (October 16, 2025)

### Core Design Principle

**Separate data collection from decision making.** Do not make routing decisions while collecting data. Instead:
1. Collect all relevant data
2. Evaluate what you collected
3. Make decisions based on evaluation
4. Execute decision

This prevents nested logic and keeps each phase focused on a single responsibility.

---

### Detailed Phase Breakdown

#### Phase 1: RAG Queries (Data Collection Only)

**Goal:** Collect RAG query results. Don't make routing decisions yet.

**Input:** 
- User message
- Selected collections from UI (array of strings like `["my_local_chroma/openshift", "my_local_chroma/kubernetes"]`)

**Process:**
```javascript
rag_results = {}  // or array - flat structure indexed by identifier

for each collection in selectedCollections:
  Parse identifier into service + collection name
  
  Query RAG service with user message
  Get: documents, distance
  Get from metadata: description, prompt, max_tokens, etc.
  
  Classify result based on service thresholds:
    if distance < match_threshold:
      result_type = "match"
    else if candidate_threshold exists AND distance < candidate_threshold:
      result_type = "partial"
    else:
      skip this result (not relevant enough)
  
  Store in rag_results[identifier]:
    {
      identifier: "service/collection",
      result_type: "match" | "partial",
      service: "my_local_chroma",
      collection: "openshift",
      documents: [...],
      distance: 0.15,
      description: "..." (from collection metadata),
      metadata: { prompt, max_tokens, ... } (from collection)
    }
  
  if result_type === "match":
    break  // Stop iterating, we found a definitive match
```

**Output:** `rag_results` object/array containing all collected results

**Key Point:** This phase ONLY collects data. It doesn't set profile.intent, doesn't call LLMs, doesn't make routing decisions.

---

#### Phase 1b: Evaluate RAG Results

**Goal:** Look at what we collected and build the initial profile.

**Input:** `rag_results` from Phase 1

**Process:**
```javascript
profile = {
  user_message: "...",
  selected_collections: [...],
  timestamp: "...",
  rag_results: rag_results,  // Keep reference to all results
  intent: undefined  // Will be set in this phase or next
}

// Evaluate what we have
if rag_results has any "match":
  match = the first/only match result
  profile.rag_result = "match"
  profile.intent = match.identifier  // e.g., "knowledge_base/openshift"
  profile.service = match.service
  profile.collection = match.collection
  profile.distance = match.distance
  profile.context = match.documents
  profile.service_prompt = match.metadata.prompt
  profile.service_tokens = match.metadata.max_tokens
  
else if rag_results has any "partial":
  profile.rag_result = "partial"
  profile.intent = undefined  // Needs detection in Phase 2
  // Keep all partial results available for expanded_rag_context
  
else:
  profile.rag_result = "none"
  profile.intent = undefined  // Needs detection in Phase 2
```

**Output:** `profile` object with intent either set (if match) or undefined (needs detection)

**Key Point:** This phase only evaluates and organizes data. No LLM calls, no external queries.

---

#### Phase 2: Intent Detection (Conditional)

**Goal:** Only runs if `profile.intent` is NOT already set. Classify the user's intent.

**Input:** `profile` from Phase 1b

**Process:**
```javascript
if profile.intent is already set:
  skip this phase  // Intent was set from a "match" result
  
else:
  // Build intent detection prompt
  categories = []
  
  // Add general categories from config.intent.detection
  for each [key, description] in config.intent.detection:
    categories.push({
      name: key,  // e.g., "support"
      description: description
    })
  
  // Add partial match collections as potential categories
  for each result in rag_results where result_type === "partial":
    categories.push({
      name: result.identifier,  // e.g., "knowledge_base/openshift"
      description: result.description || `Information about ${result.collection}`
    })
  
  // Build prompt
  prompt = `
    You are classifying user queries.
    
    Available categories:
    ${categories.map(c => `- "${c.name}": ${c.description}`).join('\n')}
    
    User query: "${profile.user_message}"
    
    Respond with only the category name.
  `
  
  // Call intent detection LLM
  llm = getLLM(config.intent.provider.llm)
  intent = await llm.complete(prompt, config.intent.provider.model)
  
  profile.intent = intent.trim()
```

**Output:** `profile` with intent definitely set

**Key Point:** This phase only runs when needed. It's not always executed.

---

#### Phase 3: Match Response Rule

**Goal:** Find which response rule applies to this profile.

**Input:** `profile` from Phase 1b or Phase 2

**Process:**
```javascript
for each response in config.responses:
  if response.match is empty or undefined:
    return response  // Fallback response (always matches)
  
  if evaluateMatch(response.match, profile):
    return response  // First match wins

throw Error("No matching response rule found")

// evaluateMatch function
function evaluateMatch(matchClause, profile):
  for each [key, value] in matchClause:
    if key ends with "_regexp":
      // Regular expression match
      field = key.replace("_regexp", "")
      if not regex(value).test(profile[field]):
        return false
    else if key === "rag_results" and value === true:
      // Match on any rag result (match or partial)
      if profile.rag_result !== "match" and profile.rag_result !== "partial":
        return false
    else if key === "rag_results":
      // Exact match on rag_result type
      if profile.rag_result !== value:
        return false
    else:
      // Direct equality
      if profile[key] !== value:
        return false
  
  return true  // All conditions passed
```

**Output:** The `response` rule object to use

**Key Point:** Simple sequential matching. No complex routing logic.

---

#### Phase 4: Generate Response

**Goal:** Build prompt and call LLM to generate final response.

**Input:** 
- `profile` from previous phases
- `response` rule from Phase 3

**Process:**
```javascript
// Get LLM
llm = getLLM(config.llms[response.llm])

// Substitute variables in prompt
prompt = substituteVariables(response.prompt, profile)

// Call LLM
result = await llm.chat({
  model: response.model,
  prompt: prompt,
  max_tokens: response.max_tokens || 500
})

return result

// Variable substitution
function substituteVariables(template, profile):
  template = template.replace(/\$\{profile\.(\w+)\}/g, (match, key) => {
    return profile[key] || match
  })
  
  template = template.replace(/\$\{service\.(\w+)\}/g, (match, key) => {
    return profile[`service_${key}`] || match
  })
  
  template = template.replace(/\$\{context\}/g, () => {
    return formatContext(profile.context)
  })
  
  template = template.replace(/\$\{expanded_rag_context\}/g, () => {
    return formatExpandedContext(profile.rag_results)
  })
  
  return template

function formatContext(documents):
  if not documents or documents.length === 0:
    return ""
  
  formatted = "Based on the following information:\n\n"
  for each doc in documents:
    formatted += `---\nDocument ${idx + 1}:\n${doc.text}\n\n`
  
  return formatted

function formatExpandedContext(rag_results):
  if not rag_results or empty:
    return ""
  
  formatted = "The following information may be relevant:\n\n"
  for each [identifier, result] in rag_results:
    formatted += `---\nFrom ${identifier} (distance: ${result.distance}):\n`
    for each doc in result.documents:
      formatted += `${doc.text}\n\n`
  
  return formatted
```

**Output:** Final LLM response to user

**Key Point:** All complexity is in variable substitution. The flow itself is straightforward.

---

### How ${expanded_rag_context} Works

**Key Insight:** `${expanded_rag_context}` includes ALL partial matches from Phase 1, regardless of what intent was detected.

**Scenario Example:**

1. **Phase 1:** User asks "How do I troubleshoot a pod that won't start?"
   - Query `my_local_chroma/openshift` → distance 0.35 (partial)
   - Query `my_local_chroma/kubernetes` → distance 0.38 (partial)
   - Query `my_local_chroma/linux` → distance 0.42 (partial)
   - No "match" found, all are "partial"

2. **Phase 2:** Intent detection
   - Prompt includes: "support", "subscriptions", "knowledge_base/openshift", "knowledge_base/kubernetes", "knowledge_base/linux"
   - LLM returns: "support" (general category, not a specific collection)

3. **Phase 3:** Match response rule
   ```json
   {
     "match": { "intent": "support", "rag_results": "partial" },
     "prompt": "You are Red Hat support. The following data may be helpful: ${expanded_rag_context}..."
   }
   ```

4. **Phase 4:** Generate response
   - `${expanded_rag_context}` expands to include ALL three partial results (openshift, kubernetes, linux)
   - Even though intent is "support", we still provide the partial matches as context
   - The prompt says "may be helpful" rather than "based on definitive information"

**Why This Is Powerful:**
- Separates classification (what kind of query is this?) from context provision (what info might help?)
- Allows general responses to still use specific context
- Response prompt can express uncertainty ("may be helpful") while still being useful

---

### Profile Structure (Final)

```javascript
{
  // Request metadata
  user_message: "How do I configure networking?",
  selected_collections: ["my_local_chroma/openshift", "my_local_chroma/kubernetes"],
  timestamp: "2025-10-16T10:30:00Z",
  
  // RAG results classification
  rag_result: "match" | "partial" | "none",
  
  // All RAG query results (for expanded context)
  rag_results: {
    "my_local_chroma/openshift": {
      identifier: "my_local_chroma/openshift",
      result_type: "partial",
      service: "my_local_chroma",
      collection: "openshift",
      documents: [...],
      distance: 0.35,
      description: "OpenShift container platform",
      metadata: { prompt: "...", max_tokens: 500 }
    },
    "my_local_chroma/kubernetes": {
      identifier: "my_local_chroma/kubernetes",
      result_type: "partial",
      service: "my_local_chroma",
      collection: "kubernetes",
      documents: [...],
      distance: 0.38,
      description: "Kubernetes orchestration",
      metadata: { prompt: "...", max_tokens: 500 }
    }
  },
  
  // If rag_result === "match", these are set:
  service: "my_local_chroma",
  collection: "openshift",
  distance: 0.15,
  context: [...documents...],
  service_prompt: "You are an OpenShift expert...",
  service_tokens: 500,
  
  // Intent (set from match or from intent detection)
  intent: "knowledge_base/openshift" | "support" | "subscriptions" | ...
}
```

---

### Design Anti-Patterns We're Avoiding

1. **❌ Nested Functions:** Don't call `detectWithRAG()` which calls `detectWithLLM()` which calls `generateResponse()`
2. **❌ Optional Return Values:** Don't return "candidates" sometimes and "matches" other times
3. **❌ Decision-While-Collecting:** Don't make routing decisions while iterating through collections
4. **❌ Hidden State:** Don't have variables that might or might not be set depending on execution path
5. **❌ Complex Branching:** Don't have "maybe RAG, maybe LLM, maybe both" logic

### Design Patterns We're Using

1. **✅ Sequential Phases:** Clear pipeline with defined inputs and outputs
2. **✅ Flat Data Structures:** All results in one object/array, no nesting
3. **✅ Separation of Concerns:** Collect, evaluate, decide, execute are separate
4. **✅ Explicit State:** Profile object always has the same structure
5. **✅ First-Match-Wins:** Response matching is simple and predictable

---

## Part 6: Next Steps

### Phase 0: Design Validation (Current)
- [x] Document current overengineered flow
- [x] Propose new config structure  
- [x] Define three-phase linear flow
- [x] Specify profile object pattern
- [x] Design response matching logic
- [x] **Review with stakeholder**
- [x] **Iterate on design based on feedback**
- [x] **Refine implementation flow and data structures**
- [ ] **Finalize config schema**

### Phase 1: Core Implementation (2-3 days)
- [ ] Rewrite `server.js` with new three-phase flow
  - [ ] `buildProfile()` function
  - [ ] `queryRagServices()` function  
  - [ ] `matchResponseRule()` function
  - [ ] `generateResponse()` function
  - [ ] Variable substitution logic
- [ ] Update config loading to support new structure
- [ ] Add configuration validation
- [ ] Create 3-4 example configs (chat-only, simple RAG, multi-service, complex)
- [ ] Test manually with each example config

### Phase 2: Provider Integration (1-2 days)
- [ ] Ensure AI provider abstraction still works
- [ ] Ensure retrieval provider abstraction still works
- [ ] Update any provider-specific code for new flow
- [ ] Test with multiple providers (OpenAI, Ollama, Gemini)

### Phase 3: Frontend Updates (1 day)
- [ ] Update API calls if response structure changed
- [ ] Collection selection still works with `<service>/<collection>` format
- [ ] Add debug panel to show profile (optional)
- [ ] Test UI flows

### Phase 4: Testing (2-3 days)
- [ ] Remove old strategy detection tests
- [ ] Write new unit tests:
  - [ ] Profile building
  - [ ] Response matching
  - [ ] Variable substitution
  - [ ] Threshold classification
- [ ] Write integration tests:
  - [ ] Full chat flow with mocked providers
  - [ ] Multiple scenarios from example configs
- [ ] Achieve 60%+ coverage

### Phase 5: Documentation (1-2 days)
- [ ] Rewrite `README.md`
- [ ] Rewrite `docs/CONFIGURATION.md`
- [ ] Update `docs/ARCHITECTURE.md`
- [ ] Update `API_REFERENCE.md`
- [ ] Update `docs/COLLECTION_MANAGEMENT.md`
- [ ] Create migration guide for existing users
- [ ] Archive old example configs

### Phase 6: Polish & Release
- [ ] Performance testing
- [ ] Load testing with multiple concurrent requests
- [ ] Fix any bugs found
- [ ] Create migration script (`migrate-config.js`)
- [ ] Version bump to 2.0.0
- [ ] Tag release
- [ ] Update CHANGELOG

**Estimated Total Time**: 10-15 days for complete implementation

### Success Criteria

- [ ] All example configs work correctly
- [ ] Code is linear and easy to follow (no deep nesting)
- [ ] Tests cover all major flows (60%+ coverage)
- [ ] Documentation is clear and comprehensive
- [ ] Performance is equal or better than current system
- [ ] Migration path exists for existing users

---

## Notes & Ideas

### User's Vision
> [Space for describing the ideal simplified approach]

### Design Iterations
> [Space for working through different approaches]

### Code Sketches
> [Space for pseudocode or example implementations]

---

## Appendix: Current Code Structure (For Reference)

### Current Strategy Detection Flow
```javascript
// High-level pseudocode of current implementation
async function detectStrategyWithDynamicCollections(userMessage, config) {
  // 1. Check if there are UI-selected collections
  // 2. If yes, query them and check results
  // 3. Based on thresholds, maybe call detectStrategyWithLLM
  // 4. Return strategy + context
}

async function detectStrategyWithRAG(userMessage, config) {
  // 1. Query knowledge base
  // 2. Check relevance
  // 3. If not relevant enough, fallback to detectStrategyWithLLM
  // 4. Return strategy + context
}

async function detectStrategyWithLLM(userMessage, config) {
  // 1. Call LLM to classify intent
  // 2. Map to strategy
  // 3. Return strategy (no context)
}

// Deep nesting, unclear flow
```

### Current Config Structure
```json
{
  "providers": { /* AI providers */ },
  "embedding": { /* Embedding config */ },
  "knowledge_bases": { /* KB definitions */ },
  "strategies": [
    {
      "name": "STRATEGY_NAME",
      "detection": { /* How to detect */ },
      "response": { /* How to respond */ }
    }
  ],
  "default_strategy": "GENERAL"
}
```

---

**End of Document**

