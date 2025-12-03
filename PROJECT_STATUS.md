FlexChat is growing into a **profile-driven conversational AI platform** where users control how it thinks, searches, and responds—using visual tools instead of code.

At the core of this is a simple idea: **everything is driven by profiles**.

## Vision: Profile-Driven Everything

Profiles are configurations that tell the system how to behave. Instead of hardcoding logic, you define it in profiles that the UI can edit and test.

### 1. ETL Profiles (nice-to-have, partly done)

These control how raw documents turn into structured, searchable chunks:

- Break content into chapters, sections, and topics
- Capture hierarchy from headings (chapter → section → topic)
- Classify chunks as procedural, conceptual, reference, or troubleshooting

This is already working: we’ve loaded **15,912 OpenShift docs** with full hierarchical metadata.

### 2. Pipeline Profiles (core – next big step)

These define how a user’s query turns into context the model can use:

- A pipeline is a series of steps: categorize → filter → rank → reconstruct
- Each step is configurable and testable in the UI
- Pipelines will replace separate topic detection, intent detection, and query profiles

Architecture is done, we’ve run **8 successful experiments**, and it’s ready to implement.

### 3. Collection Schemas (already working)

These define the structure and metadata of a document collection:

- What metadata exists (chapter, section, topic, etc.)
- How documents are linked hierarchically
- How retrieval can use that structure for smarter results

These schemas are in production and support both flat and hierarchical data.

---

## Composable Pipelines: The Big Shift

Right now, retrieval is basically:

> embed query → search → return top-k results

That works, but it’s one-size-fits-all.

We’re moving to **user-defined pipelines** where you can describe the steps, like this:

```yaml
pipeline_profile: "technical-documentation"
steps:
  - id: "detect_intent"
    type: "cross_encoder_categorization"
    target_field: "content_type"
    categories:
      procedural: ["how to", "configuration steps"]
      conceptual: ["what is", "overview"]
    threshold: 0.5

  - id: "search_parent"
    type: "semantic_query"
    where:
      section_level: 3
      content_type: detect_intent.category
    top_k: 10

  - id: "rank_sections"
    type: "cross_encoder_rerank"
    source: search_parent.results
    top_k: 3

  - id: "expand_hierarchy"
    type: "fetch_by_metadata"
    where:
      section: rank_sections.results[*].metadata.section

  - id: "final_rank"
    type: "cross_encoder_rerank"
    source: expand_hierarchy.results
    top_k: 5
```

Each step:

- Has clear inputs and outputs
- Can be tested in the UI with real data
- Feeds into the next step

The full pipeline is stored as configuration, not code.

---

## Roadmap: Where We’re Going

### Phase 1: Foundation (now – mostly done)

- Profile-driven ETL with hierarchical chunking (15K+ docs)
- Cross-encoder infra for reranking and classification
- Collection metadata and schemas in place
- ConfigBuilder UI for editing config visually
- Embedding refactor: RAG services now fully self-contained

### Phase 2: Pipeline System (next)

- One unified pipeline profile format
- Step-by-step testing UI (an evolution of the current RAG calibration tool)
- Topic/intent detection becomes just pipeline steps
- Visual pipeline builder using the ConfigBuilder pattern
- UI for enriching metadata (classify and tag existing collections)

### Phase 3: Intelligence Layer (future)

- More advanced, hierarchy-aware ranking
- Shareable profile templates
- Support for multiple vector DBs (e.g., Milvus)

### Phase 4: Integration & Tooling (longer-term)

- MCP (Model Context Protocol) integration
- Agent/tool support
- Better analytics and monitoring

---

## What We’re Working on Right Now

### 1. ETL Service Integration

- Validating a modular transform pipeline
- Hierarchical extraction is working in practice
- 15,912 OpenShift docs loaded with chapter/section/topic
- Current task: validate modular transform pipeline

### 2. Advanced RAG Retrieval

- 8 experiments completed (cross-encoder, ranking, classification)
- RAG Pipeline System Architecture is written (1,328 lines)
- Cross-encoder categorization is **20–50x faster than LLMs**
- Ready to split work into implementation tasks

### Ready for Production

- Cross-encoder categorization and reranking
- Hierarchical metadata (chapter → section → topic with reset rules)
- Content classification (procedural, conceptual, reference, troubleshooting)
- Multi-stage retrieval (search → rank → expand → rank)
- Self-contained RAG services (embeddings + cross-encoder + vectors)

### On Hold (waiting for time)

- Server-side chat history
- Toast notifications

Recent big work that’s done:

- Configuration Builder system (from zero-config to full visual config)
- Embedding architecture refactor (Python RAG services self-contained, 524 Node lines removed)
- Cross-Encoder Reranking service (BAAI/bge-reranker)
- Document Upload Wizard (batch upload, JSONL, 40K+ docs tested)
- Query Profile UI (for categorical filters)

---

## Strategic Priorities

In order of importance:

1. **Profile-Driven Pipeline System**
   - Finish validating ETL pipeline
   - Implement composable retrieval pipelines
   - Build visual pipeline builder + testing UI

2. **Metadata Intelligence**
   - UI to enrich metadata (classify and tag existing collections)
   - Better RAG calibration tools (more metadata, more flexible filters)
   - Smarter reconstruction strategies using hierarchy

3. **Production Polish** (after pipelines)
   - Server-side chat history
   - Toast notifications
   - Usage analytics

4. **Technical Debt**
   - Archive completed work
   - Update docs to match profile-driven reality

What matters most right now:

- Make all “intelligence” configurable in the UI
- Make every step testable before it goes live
- Keep everything composable: complex behavior from small, reusable steps

---

## Tech Stack and Direction

### Current Stack

- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4
- **Backend**: Node.js + Express (simple, text-only calls to RAG services)
- **RAG Services**: Python + FastAPI + ChromaDB
- **AI Providers**: OpenAI, Google Gemini, Ollama

### Profile System

- Config lives in a main JSON config, not scattered files
- Pipelines are reusable, ID-based sequences of steps
- Step types include:
  - `query`
  - `cross_encoder`
  - `llm_call`
  - `fetch`
  - `filter`
  - `reconstruct`
  - `detect_and_filter`
- Testing follows the “topic detection” pattern: configure → test with live data → validate

### Cross-Encoder Intelligence

- Models: `BAAI/bge-reranker-base` and `bge-reranker-large`
- Use cases:
  - Intent detection
  - Reranking results
  - Relevance scoring
  - Categorical detection
- Performance: ~10–20ms vs 200–500ms for LLM classification
- Deterministic and stable, with confidence scores

### Hierarchical Metadata

Stable keys across chunks:

- `chapter`
- `section`
- `topic`

Chunk-specific keys:

- `chunk_heading`
- `chunk_level`

Reset rules when hierarchy changes (e.g., new section resets topic).

This enables:

- Searching at section level
- Reconstructing full sections with their subsections
- Targeted filtering (e.g., only reference content)

### RAG Service Architecture (After Refactor)

Each RAG service:

- Loads its own embedding models and cross-encoders
- Talks directly to ChromaDB
- Node only passes text and receives results

Examples:

- **Port 5008**: `red-hat-product-documentation`
  - Embeddings: `mxbai-embed-large` (1024d), `nomic-embed-text` (768d)
  - Cross-encoder: `bge-reranker-large`

- **Port 5006**: `red_hat_products`
  - Embeddings: `nomic-embed-text` (768d)
  - Cross-encoder: `bge-reranker-base`

Benefit: all ML-heavy work stays inside each RAG service, no extra hops.

### Processing Architecture

The pipeline runs in phases, with:

- Modular stages you can experiment with
- Profile-driven config for behavior
- Provider abstraction so we can plug in different AI backends

Future plans include support for more vector DBs (like Milvus or Pinecone), MCP integration, and more advanced reasoning models.

---

## How We Work

- **OpenPlan**: For exploration, design, decomposition, and validation
- **OpenSpec**: For actual implementation specs and tracked changes

We aim for:

- Small, focused changes (<5 days)
- Simple solutions first (<100 lines of new code when possible)
- “Boring” tech over clever but fragile ideas
- Documentation that reflects current behavior, not history or “we don’t do X” statements
- User-facing value with each change

Everything is trending toward:

- Visual configuration (no code edits for behavior changes)
- Testable steps for every part of a pipeline
- Gradual evolution from basic flat search to rich, multi-step pipelines

We’re also careful with testing:

- Mock external services where possible
- Unit tests first, then integration
- UI-based step testing with live data
- End-to-end validation with real RAG services before big releases

---

## Activity Snapshot (as of 2025-11-30)

- 27 tracked OpenPlan items:
  - 7 new
  - 2 in decomposition (advanced RAG retrieval, ETL integration)
  - 18 completed and archived

Active epics:

- Advanced RAG Retrieval Strategies
- ETL Service Integration

Recent major completions:

- Embedding architecture refactor
- Cross-encoder reranking (production-ready)
- Document Upload Wizard (JSONL, 40K+ docs)
- Query Profile UI
- Configuration Builder system

We’ve shifted from “exploring advanced RAG” to **building the profile-driven pipeline system** and putting it into production.