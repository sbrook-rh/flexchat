# Screenshot guide for Flex Chat docs

Use this as a checklist for which screenshots to take and where they go.

**Where to put files:** `docs/screenshots/`  
Reference them from docs as: `![Alt text](screenshots/filename.png)`

---

## Priority 1 — First-run / README

| Screenshot | Filename | Where to use | What to capture |
|------------|----------|--------------|-----------------|
| Welcome / zero-config screen | `welcome_zero_config.png` | README Quick Start (after “open http://localhost:5173”) | First-time view: “Build Configuration” and “Import Configuration” so users see the entry point. |
| Chat with one exchange | `chat_with_message.png` | README “What You Get” or end of Quick Start | Chat UI with one user message and one model reply; optional: topic and model badge visible. |

---

## Priority 2 — Configuration Builder

| Screenshot | Filename | Where to use | What to capture |
|------------|----------|--------------|-----------------|
| Config Builder main view (tabs) | `config_builder_tabs.png` | CONFIGURATION_BUILDER.md “Navigation” / “Using the Configuration Builder” | Sidebar with tabs (LLM Providers, RAG Services, Tools, Topic, Intent, Handlers) and main content. |
| LLM provider wizard (one step) | `config_builder_llm_wizard.png` | CONFIGURATION_BUILDER.md “Adding an LLM Provider” | One step of the add-LLM flow (e.g. connection or model selection). |
| Handlers list | `config_builder_handlers.png` | CONFIGURATION_BUILDER.md “Building Response Handlers” | Handlers tab with 2–3 handlers and match criteria visible. |
| Tools section | `config_builder_tools.png` | CONFIGURATION_BUILDER.md “Configuring Tools” | Tools tab with builtin cards (calculator, datetime, UUID) and toggles. |

---

## Priority 3 — Collections & RAG

| Screenshot | Filename | Where to use | What to capture |
|------------|----------|--------------|-----------------|
| Collections list | `collections_list.png` | COLLECTION_MANAGEMENT.md “Collection Selection” or overview | `/collections` with at least one collection (name, count, maybe description). |
| Create Collection modal | `collection_create_modal.png` | COLLECTION_MANAGEMENT.md “Collection Creation (UI)” | Create New Collection modal with name, description, embedding model (if shown), threshold. |
| Document Upload Wizard Step 1 | `document_upload_wizard_step_1.png` | COLLECTION_MANAGEMENT.md (already referenced) | Upload JSON wizard – file upload / field discovery. |
| Document Upload Wizard Step 2 | `document_upload_wizard_step_2.png` | COLLECTION_MANAGEMENT.md (already referenced) | Field mapping (TEXT / ID / METADATA / SKIP). |
| Document Upload Wizard Step 3 | `document_upload_wizard_step_3.png` | COLLECTION_MANAGEMENT.md (already referenced) | Preview & upload / schema save options. |

---

## Priority 4 — Optional

| Screenshot | Filename | Where to use | What to capture |
|------------|----------|--------------|-----------------|
| Chat with collection selector | `chat_collections_selected.png` | RAG_SERVICES.md or README | Chat UI with “Search In” / collection checkboxes and at least one selected. |
| Topic Detection tab | `config_builder_topic.png` | CONFIGURATION_BUILDER.md “Configuring Topic Detection” | Topic Detection tab with provider/model and prompt area. |
| Intent tab | `config_builder_intent.png` | CONFIGURATION_BUILDER.md “Configuring Intent Detection” | Intent tab with intents list. |

---

## Tips

- **Size:** ~1200px wide or similar; crop to the relevant panel to keep file size down.
- **Format:** PNG for UI; consider WebP in the future if you want smaller assets.
- **Content:** Use neutral test data (e.g. “Test collection”, “sample”) so screenshots stay usable.
- **Create the folder:** `mkdir -p docs/screenshots` and add a `.gitkeep` if you want to commit the folder before adding images.
- COLLECTION_MANAGEMENT.md already references the three upload wizard images; add those files so the links resolve.

---

## Quick reference: doc → screenshots

| Doc | Screenshots to add |
|-----|--------------------|
| **README** | `welcome_zero_config.png`, optionally `chat_with_message.png` |
| **CONFIGURATION_BUILDER** | `config_builder_tabs.png`, `config_builder_llm_wizard.png`, `config_builder_handlers.png`, `config_builder_tools.png` (+ optional topic/intent) |
| **COLLECTION_MANAGEMENT** | `collections_list.png`, `collection_create_modal.png`, `document_upload_wizard_step_1.png`, `document_upload_wizard_step_2.png`, `document_upload_wizard_step_3.png` |
| **RAG_SERVICES** (optional) | `chat_collections_selected.png` |

Delete this file once screenshots are in place and linked, or keep it as a maintenance checklist.
