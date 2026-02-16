# Advanced RAG Retrieval: Path to Multi-Step Retrieval

This document synthesises advanced RAG experiments into a single path from single-pass retrieval to multi-step, pipeline-based retrieval. It is the main reference for understanding what was validated and what remains to implement.

**Related docs:**
- [RAG_TESTING.md](RAG_TESTING.md) — How to test RAG (endpoints, query patterns, validation)
- [PROJECT_STATUS.md](../PROJECT_STATUS.md) — Roadmap and pipeline system vision
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture and 6-phase flow

---

## 1. Current State vs Target

| Aspect | Current (single-pass) | Target (multi-step pipeline) |
|--------|------------------------|------------------------------|
| Retrieval | Embed query → semantic search → top-k | Categorise → filter → search → rank → expand → rank → top-k |
| Filtering | None or manual | Content-type, hierarchy level, metadata |
| Ranking | Embedding distance only | Cross-encoder rerank on candidate set |
| Context | Isolated chunks or full section | Configurable: section siblings, chapter, or top-k only |
| Configuration | RAG service + collection | Pipeline profile (steps defined in config) |

The experiments below validate individual pieces; the pipeline system (Phase 2 in PROJECT_STATUS) will make them composable and UI-configurable.

---

## 2. Experiment Sequence and Findings

Order below is logical (baseline → hierarchy → reconstruction → classification → reranking).

### Flat-data baseline (recipes)

| Id | Objective | Finding |
|----|-----------|---------|
| 0 | Baseline retrieval, schema, grounding ([RAG_TESTING.md](RAG_TESTING.md)) | Schema design (which fields are embedded) drives match quality; strict grounding prevents hallucination; metadata-only fields are not searchable. |
| 0b | Field labels ("Title:", "Region:") | Structural labels **worsened** results (3–14%); not recommended. |
| 0c | Collection prefix on title | Semantic prefix ("Desserts from around the world: ") **improved** results (1–4%). |
| 0d | Multi-field semantic prefixes | Mixed; some query types benefit, others not; title prefix is the main win. |

### Hierarchical documentation

| Id | Objective | Finding |
|----|-----------|---------|
| 01 | Baseline on fragmented docs (chapter/section/paragraph) | Fragmentation hurts: single paragraphs rank without full section context; hierarchy reconstruction is needed. |
| 02 | Gather siblings by `section_id` (no LLM) | Deterministic sibling gathering yields **complete section** content; fixes incomplete procedural answers. |
| 03 | Full OpenShift dataset (all chapters) | With complete data, cross-chapter retrieval works; procedural and conceptual content both surface. |
| 03b | Validate metadata filtering endpoint | `GET /collections/{name}/documents?where=...` enables sibling gathering in a profile-driven way. |

### Chunking and reconstruction

| Id | Objective | Finding |
|----|-----------|---------|
| 04 | Section-level vs paragraph-level chunking | Section-level chunks (heading-boundary) give coherent units; compared all-minilm vs mxbai-embed-large on 21K chunks. |
| 05 | Does reconstruction improve completeness? | Reconstruction (chapter-level siblings) gives **complete** context but **too large** for LLM. Critical finding: **ranking is the problem** — the ideal section (9.2.6) existed but did not rank in top 5; semantic search favored short CLI snippets over full procedures. |

### Classification and reranking

| Id | Objective | Finding |
|----|-----------|---------|
| 06 | Content-type classification (procedural, conceptual, reference) | Heuristics + optional LLM sampling; many sections are "mixed"; filtering by `content_type: procedural` removes noise. |
| 07 | End-to-end: filter + cross-encoder rerank | Content-type filter + BAAI/bge-reranker-base: **best section (2.13.2) promoted from #8 to #1** (0.998). Multi-pass (unfiltered + filtered) + dedup + rerank also works; 15–20 candidates before rerank recommended. |

---

## 3. Implications for the Multi-Step Path

### Validated and in use or ready

- **Metadata filtering** — Sibling gathering by `section_id` (or other metadata) is validated; endpoint exists.
- **Section-level chunking** — ETL produces section-level chunks with hierarchy metadata; 15K+ OpenShift docs in production.
- **Content-type classification** — Procedural / conceptual / reference / troubleshooting; cross-encoder categorization is 20–50x faster than LLM.
- **Cross-encoder reranking** — Reranking after semantic search significantly improves ranking; best answer often outside top 5 before rerank.
- **Strict grounding** — Response handlers must use strict "only use provided context" style; per Experiment 0.

### Design conclusions

1. **Ranking before reconstruction** — Experiments 05 and 07 show that improving ranking (filter + rerank) is more impactful than gathering ever-larger sections. First get the right sections in the top-k, then optionally expand (siblings) if needed.
2. **Filter then rank** — Content-type filter (e.g. procedural) removes API/reference noise; cross-encoder then selects best within that set.
3. **Pipeline order** — Semantic search (broad) → optional filter by metadata/content_type → optional expand (siblings) → rerank → top-k. Exact steps should be configurable per pipeline profile.
4. **Candidate set size** — 15–20 candidates before rerank gives better final top-5 than 10 (Experiment 07).

### Not yet implemented as a single pipeline

- **Unified pipeline profile** — Steps (query, filter, cross_encoder, fetch, reconstruct) are designed but not yet one config-driven pipeline in the chat server.
- **Step-by-step testing UI** — Validation is currently script/curl; UI to run pipeline steps and inspect outputs is Phase 2.
- **Reconstruction strategies** — Section-level vs chapter-level vs top-k-only should be pipeline options, not hardcoded.

See [PROJECT_STATUS.md](../PROJECT_STATUS.md) for Phase 2 pipeline system and roadmap.

---

## 4. Where to Find What

| Need | Where |
|------|--------|
| How to run RAG queries, interpret results | [RAG_TESTING.md](RAG_TESTING.md) |
| Roadmap and pipeline vision | [PROJECT_STATUS.md](../PROJECT_STATUS.md) |
| Architecture and 6-phase flow | [ARCHITECTURE.md](ARCHITECTURE.md) |
| RAG services and wrapper | [RAG_SERVICES.md](RAG_SERVICES.md), [CHROMADB_WRAPPER.md](CHROMADB_WRAPPER.md) |
