# RAG Testing & Validation Guide

**Purpose**: Document how to test RAG retrieval, construct validation queries, and interpret results.

**Created**: 2025-11-12  
**Context**: Developed during Advanced RAG Retrieval Experiment 0 (baseline testing)

---

## 🎯 Overview

RAG testing validates semantic search quality, metadata usage, and LLM grounding. This guide documents the query patterns, expected outcomes, and debugging techniques discovered during baseline experiments.

---

## 📡 Query Construction

### Endpoint

```
POST http://localhost:5005/chat/api
```

### Request Format

```json
{
  "prompt": "Your question here",
  "previousMessages": [],
  "selectedCollections": [
    {
      "service": "recipes",
      "name": "fancy-desserts"
    }
  ],
  "topic": ""
}
```

**Required fields**:
- `prompt` (string): The user's question
- `selectedCollections` (array): Collections to query, each with:
  - `service`: RAG service name (from config)
  - `name`: Collection name

**Optional fields**:
- `previousMessages`: Conversation history for context
- `topic`: Previous topic (empty string for first message)

The RAG wrapper generates query embeddings using each collection's configured `embedding_model`; no embedding parameters are sent in the request.

### Example: Using curl

```bash
curl -X POST http://localhost:5005/chat/api \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How do I make sticky toffee pudding?",
    "selectedCollections": [{
      "service": "recipes",
      "name": "fancy-desserts"
    }],
    "previousMessages": [],
    "topic": ""
  }'
```

---

## 🧪 Validation Query Patterns

### 1. Specific Item Query

**Purpose**: Test exact match retrieval and answer synthesis

**Pattern**: "How do I make [specific item]?"

**Example**:
```json
{
  "prompt": "How do I make sticky toffee pudding?"
}
```

**What to observe**:
- Does it find the exact item?
- Are related items also retrieved (semantic similarity)?
- Is the answer synthesized correctly from RAG data?
- Any hallucination or training data leakage?

---

### 2. Categorical Query

**Purpose**: Test metadata-based filtering and regional/categorical search

**Pattern**: "What are some [category] [items]?"

**Example**:
```json
{
  "prompt": "What are some British desserts?"
}
```

**What to observe**:
- Does it filter by metadata (e.g., region)?
- Does semantic search respect categories?
- Are results all from the requested category?
- Does LLM hallucinate items not in data?

**Known issue** (Baseline): Semantic search doesn't filter by metadata, returns wrong categories

---

### 3. Ingredient-Based Query

**Purpose**: Test content search within recipe text

**Pattern**: "Show me recipes with [ingredient]"

**Example**:
```json
{
  "prompt": "Show me recipes with chocolate"
}
```

**What to observe**:
- Does it find recipes mentioning the ingredient?
- Does it work for ingredients in both title and instructions?
- Does it return all relevant recipes or miss some?

---

### 4. Technique-Based Query

**Purpose**: Test inference from instructions (most challenging)

**Pattern**: "What [items] are [technique]?"

**Example**:
```json
{
  "prompt": "What desserts are baked?"
}
```

**What to observe**:
- Can it infer techniques from instructions?
- Does it distinguish baked from chilled/frozen?
- Does it understand culinary terminology?

**Expected difficulty**: High - requires semantic understanding of techniques

---

## 📊 Result Evaluation Criteria

### Semantic Matching
- ✅ **Good**: Finds exact item + semantically similar items
- ⚠️ **Acceptable**: Finds exact item, misses some similar
- ❌ **Poor**: Misses exact item or returns irrelevant items

### Metadata Usage
- ✅ **Good**: Filters by metadata (region, category, type)
- ⚠️ **Acceptable**: Partial metadata filtering
- ❌ **Poor**: Ignores metadata completely

### Context Completeness
- ✅ **Good**: Full recipe/document with all details
- ⚠️ **Acceptable**: Partial but usable information
- ❌ **Poor**: Fragmented or incomplete

### Relevance Ranking
- ✅ **Good**: Top results all highly relevant
- ⚠️ **Acceptable**: Some relevant, some not
- ❌ **Poor**: Top results mostly irrelevant

### LLM Grounding
- ✅ **Good**: Answer uses ONLY RAG data
- ⚠️ **Acceptable**: Mostly RAG, minor synthesis
- ❌ **Poor**: Hallucinates items not in RAG data

---

## 🔍 Debug Output Interpretation

### Server Log Sections

#### 1. RAG Collection
```
🔍 Collecting RAG results...
   📝 Query text: "What are some British desserts?"
   📊 Min distance: 0.5139
   ✅ Result: partial (distance: 0.5139)
   📄 Documents retrieved: 3 (top_k: 3)
   📋 Document titles: Chocolate Brownies, Icebox Cake, Apple Crumble
   📦 Collected 1 partial result(s)
```

**What this tells you**:
- **Distance**: How close the match is (lower = better)
  - `< 0.2`: "match" (high confidence)
  - `0.2-0.6`: "partial" (medium confidence)
  - `> 0.6`: "none" (too far, skipped)
- **Documents retrieved**: Always 3 (top_k setting)
- **Partial results**: Number of COLLECTIONS with matches (not documents)

#### 2. Profile Building
```
📦 Partial results: 1 collection(s)
📄 Total documents in profile: 3
📋 Document titles: Chocolate Brownies, Icebox Cake, Apple Crumble
```

**What this tells you**:
- How many documents made it through to the LLM
- Confirms all retrieved documents are included (no filtering at this stage)

#### 3. RAG Context Assembly
```
🔧 RAG Context Assembly:
   📄 Documents in context: 3
   📏 Total context length: 1938 chars
```

**What this tells you**:
- Exactly what the LLM sees in its prompt
- Context size (helps understand token usage)

#### 4. System Prompt
```
📝 System prompt: You are a cooking lover that likes to share recipes. 
Here are some recipies that might help with the user's query:
### Chocolate Brownies (from fancy-desserts)
[full recipe text]
---
### Icebox Cake (from fancy-desserts)
[full recipe text]
---
### Apple Crumble (from fancy-desserts)
[full recipe text]
```

**What this tells you**:
- The EXACT prompt sent to the LLM
- Whether prompt encourages grounding or allows hallucination
- How recipes are formatted in context

---

## 📝 Experiment 0 Baseline Results

**Date**: 2025-11-12  
**Collection**: fancy-desserts (54 recipes)  
**Embedding model**: e.g. minilm (id from wrapper embeddings YAML)

### Query 1: Specific Recipe

**Query**: "How do I make sticky toffee pudding?"

**Retrieved**:
- Sticky Toffee Pudding (exact match) ✓
- Bread and Butter Pudding (similar British pudding)
- Treacle Sponge Pudding (similar British pudding)

**Distance**: ~0.3 (good match)

**LLM Response**: ✅ Accurate summary from RAG data, no hallucination

**Assessment**: **Good** - Specific queries work well with flat data

---

### Query 2: Categorical (Regional)

**Query**: "What are some British desserts?"

**Retrieved**:
- Chocolate Brownies (American) ❌
- Icebox Cake (American) ❌
- Apple Crumble (British) ✓

**Distance**: 0.5139 (partial match - relatively far)

**LLM Response**: ❌ Listed 7 desserts (2 from RAG, 5 hallucinated)

**Assessment**: **Poor** - Categorical queries fail without metadata filtering

**Issues identified**:
1. Semantic search ignores metadata (region field not used)
2. High distance indicates poor match quality
3. Weak prompt allows LLM to fill gaps with training data

---

### Query 3: Ingredient-Based (Schema v1)

**Query**: "Show me recipes with chocolate"

**Schema**: `text_fields: ["title", "region", "instructions"]` (ingredients NOT embedded)

**Retrieved**:
- Chocolate Brownies (chocolate in title/instructions) ✓
- Vegan Chocolate Truffles (chocolate in title) ✓
- Profiteroles (chocolate sauce in instructions) ✓

**Distance**: 0.4505 (better than Query 2)

**LLM Response**: ✅ Listed all 3 recipes from RAG data

**Assessment**: **Good** - Works when ingredient appears in embedded fields

---

### Query 3 Redux: Ingredient-Based (Schema v2)

**Query**: "Show me recipes with chocolate" (SAME query, updated schema)

**Schema**: `text_fields: ["title", "region", "instructions", "ingredients"]` (ingredients NOW embedded)

**Retrieved**:
- Chocolate Brownies ✓
- Profiteroles ✓
- Vegan Chocolate Truffles ✓

**Distance**: 0.4134 (IMPROVED from 0.4505! ⬇️ 8.2%)

**LLM Response**: ✅ Listed all 3 with detailed ingredient lists

**Assessment**: **Better** - Embedding ingredients improves match quality

**Schema Impact**: Adding `ingredients` to `text_fields` improved:
- Match distance (0.4505 → 0.4134)
- Response quality (now includes ingredient lists)
- Searchability (can now find by ingredients list content)

---

### Query 4: Ingredient-Based (New Ingredient)

**Query**: "Show me recipes with caramel"

**Schema**: `text_fields: ["title", "region", "instructions", "ingredients"]` (v2)

**Retrieved**:
- Tarte Tatin (caramel in instructions: "Caramel base") ✓
- Gulab Jamun (syrup-based, semantic similarity)
- Peach Cobbler (fruit dessert, weaker match)

**Distance**: 0.4919 (moderate)

**LLM Response (before grounding fix)**: ❌ Hallucinated "Salted Caramel Brownies" with complete fake recipe

**LLM Response (after grounding fix)**: ✅ Only mentioned Tarte Tatin (actually retrieved)

**Assessment**: **Demonstrates critical issues**:
1. Schema allows ingredient search ✓
2. BUT: Weak prompt allows severe hallucination ❌
3. Fix: Stricter grounding prompt prevents fabrication ✓

---

### Grounding Prompt Fix

**Problem**: LLM was adding recipes from training data when RAG results were partial matches

**Original Prompt**:
```
You are a cooking lover that likes to share recipes. 
Here are some recipies that might help with the user's query:
{{rag_context}}
```

**Updated Prompt**:
```
You are a cooking assistant. Answer the user's query using ONLY 
the recipes provided below. DO NOT create, suggest, or describe 
any recipes that are not in the provided list. If none of the 
provided recipes match the user's request, say so clearly.

Provided recipes:
{{rag_context}}
```

**Impact**:
- Query 2 (British desserts): Reduced hallucination significantly
- Query 4 (caramel): Eliminated complete recipe fabrication
- Trade-off: Less helpful when RAG data is incomplete, but more accurate

---

## 💡 Key Findings

### What Works (Baseline)
- ✅ Specific item queries with good semantic matches
- ✅ Text embedding captures semantic relationships
- ✅ Flat, self-contained documents work well
- ✅ LLM synthesis from good RAG data is accurate
- ✅ **Schema design directly impacts match quality** (8.2% improvement when ingredients embedded)
- ✅ **Strict grounding prompts prevent hallucination** (critical for accuracy)

### What Doesn't Work (Baseline)
- ❌ Categorical queries without metadata filtering
- ❌ Regional/taxonomic searches (can't filter by region)
- ❌ Weak prompt grounding (LLM adds training data)
- ❌ Partial matches (distance > 0.5) lead to wrong results
- ❌ **Metadata-only fields are NOT searchable** (must be in `text_fields` to be embedded)

### Root Causes
1. **No metadata filtering**: Semantic search alone can't distinguish regions/categories
2. **Single-pass retrieval**: No opportunity to refine or filter results
3. **Prompt constraint**: "might help with" allows hallucination ← FIXED
4. **No reasoning step**: Can't analyze retrieved docs before answering
5. **Schema blindness**: System doesn't expose which fields are searchable vs metadata-only

### Critical Discoveries

#### 1. Schema Design is Paramount
- **What gets embedded determines what's searchable**
- Adding `ingredients` to `text_fields` improved distance by 8.2%
- Metadata-only fields (even if present) are invisible to semantic search
- **Implication**: Profile system must make schema design transparent and user-configurable

#### 2. LLM Grounding is Non-Negotiable
- Permissive prompts cause severe hallucination (complete fabricated recipes)
- "might help with" → LLM treats RAG as suggestions, not constraints
- "ONLY use provided" → LLM treats RAG as authoritative
- **Implication**: Response handlers must enforce strict grounding by default

#### 3. Schema-Query Mismatch Detection
- System has no way to warn users when query won't work
- Example: Searching for "British desserts" when `region` is metadata-only
- Distance alone doesn't indicate schema mismatch (0.5139 could be bad data OR bad schema)
- **Implication**: Need query analyzer to detect likely mismatches

---

## 🚀 Future Improvements (Advanced RAG)

### Immediate (Experiments 1-2)
- Test with hierarchical data (documentation fragments)
- Compare flat vs hierarchical retrieval quality
- Measure context reconstruction needs

### Near-term (Experiments 3-4)
- **Metadata filtering**: Filter by region BEFORE semantic search ← CRITICAL for categorical queries
- **Multi-pass retrieval**: Broad → focused → direct
- ~~**Stricter prompts**~~: ✅ COMPLETED - Now default behavior

### Long-term (Pipeline Architecture)
- **Profile-driven retrieval**: Collection-specific strategies
- **Schema transparency**: Show users which fields are searchable
- **Query analyzer**: Detect schema-query mismatches BEFORE querying
- **LLM processing step**: Rank/deduplicate/synthesize with reasoning
- **Hierarchy reconstruction**: Gather related chunks for context
- **ProfileBuilder UI**: User-configurable retrieval strategies + schema design

See [ADVANCED_RAG_RETRIEVAL_PATH.md](ADVANCED_RAG_RETRIEVAL_PATH.md) for the synthesised path from experiments 01–07 to multi-step retrieval and pipeline design.

### Validated Priorities (from Experiment 0)

**High Priority** (blocks effective use):
1. Metadata filtering (enables categorical queries)
2. Schema design UI (makes searchability transparent)
3. Query-schema mismatch detection (prevents user confusion)

**Medium Priority** (improves quality):
4. Multi-pass retrieval (refine results)
5. LLM ranking step (better result ordering)

**Low Priority** (nice-to-have):
6. Hierarchy reconstruction (only needed for fragmented docs)

---

## 📚 Related Documentation

- **Advanced RAG path (multi-step retrieval):** [ADVANCED_RAG_RETRIEVAL_PATH.md](ADVANCED_RAG_RETRIEVAL_PATH.md) — Synthesises experiments 01–07 and path to pipeline-based retrieval
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Collection Management: [COLLECTION_MANAGEMENT.md](COLLECTION_MANAGEMENT.md)

---

## 📊 Experiment 0 Summary

**Status**: ✅ COMPLETE (2025-11-12)

**Queries Tested**: 4 (specific, categorical, ingredient-based x2, schema comparison)

**Major Findings**:
1. Schema design directly impacts match quality (8.2% improvement)
2. LLM grounding is critical (fixed severe hallucination)
3. Metadata-only fields are NOT searchable (architectural insight)

**Improvements Made**:
- ✅ Updated recipe response handler with strict grounding
- ✅ Re-uploaded recipes with ingredients in `text_fields`
- ✅ Documented schema design impact

**Next**: Experiment 1 - Load hierarchical documentation data and measure fragmentation impact

---

*Last Updated: 2025-11-12*  
*Status: Experiment 0 complete with major architectural insights*
