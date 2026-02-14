# Documentation Audit

**Purpose**: Checklist to keep docs aligned with current behavior. Source of truth: `openspec/specs/`.

---

## Checklist

### High priority — Done

| Doc | Status |
|-----|--------|
| CONFIGURATION_BUILDER.md | Done |
| CONFIGURATION.md | Done |
| ARCHITECTURE.md | Done |
| TOOL_USAGE_TESTING.md | Done |
| PHASE_05_MIGRATION.md | Done (replaced with redirect) |

### Medium priority — Done

| Doc | Status |
|-----|--------|
| RAG_SERVICES.md | Done |
| COLLECTION_MANAGEMENT.md | Done |
| RAG_TESTING.md | Done |
| CHROMADB_WRAPPER.md | Done |
| PROVIDER_COMPARISON.md | Done |
| DYNAMIC_COLLECTIONS_IMPLEMENTATION.md | Done |

### Lower priority — Done

| Doc | Status |
|-----|--------|
| AUTOMATED_TESTING_STRATEGY.md | Done |
| REASONING_MODELS.md | Done |
| MODEL_CLASSIFICATION_ENHANCEMENT.md | Done |
| GEMINI_PROVIDER_TESTING.md | Done |
| TOPIC_DETECTION.md | Done |
| DYNAMIC_COLLECTIONS_IMPLEMENTATION.md | Done (embedding wording) |
| Enterprise AI Capability Framework.md | No change (generic “embedding” only) |

---

## Reference: OpenSpec specs

- **config-builder**, **tools-config-builder-section**, **builtin-tools-manifest**: Config Builder UI, tools section
- **response-generation**, **tool-***: Phase 6b, tool registry, execution, testing
- **document-upload**, **document-upload-ui**: Text-only to wrapper; no embedding params
- **collections**: embedding_model from wrapper health; test endpoint; re-model for empty
- **rag-providers**: Wrapper generates query embeddings; collection embedding model; health embedding_models

---

Move this file to `docs/archive/` when the checklist is complete.
