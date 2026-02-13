# Flex Chat

A configuration-driven, AI-powered chat application with topic-aware RAG (Retrieval-Augmented Generation), builtin tool calling, dynamic knowledge base management, and transparent multi-model support.

**[Project status](PROJECT_STATUS.md)**

---

## Quick Start

**Prerequisites:** Node.js 18+, Python 3.8+ (for RAG), and an API key (OpenAI, Gemini, or use Ollama locally).

**1. Install**
```bash
cd frontend && npm install
cd ../backend/chat && npm install
cd ../rag && pip install -r requirements.txt   # optional, for RAG
```

**2. Configure** — Either use the **Configuration Builder** (no file needed: run `./start.sh`, then open the UI), or copy an example: `cp config/examples/01-chat-only.json config/config.json` and set `OPENAI_API_KEY` (or use another provider).

**3. Start**
```bash
./start.sh
```
Then open **http://localhost:5173** — use the welcome screen to set up providers, or go to **Chat** if config is already in place.

**Other start options:** [tmux](#option-b---tmux-recommended-for-development) · [individual terminals](#option-c---individual-terminals)

---

## What You Get

- **Multi-provider AI** — OpenAI, Gemini, Ollama; switch via config; per-message model transparency
- **RAG + dynamic collections** — Topic-aware retrieval; create collections and upload docs in the UI; no config edits for new collections
- **6-phase flow + tool execution** — Topic → RAG → Intent → Profile → Handler match → Response (with optional Phase 6b tool loop when tools enabled)
- **Builtin tools** — Calculator, current datetime (timezone-aware), UUID; enable per-handler or globally; test in Config Builder
- **Visual Config Builder** — Zero-config startup, wizards, import/export; or edit JSON for automation

**Key links:** [Configuration](docs/CONFIGURATION_BUILDER.md) · [Architecture](docs/ARCHITECTURE.md) · [RAG & collections](docs/RAG_SERVICES.md) · [Troubleshooting](#troubleshooting)

---

## More: Start Options

### Option A — All-in-One script
```bash
./start.sh
# Or: ./start.sh --config config/examples/chat-only-ollama.json
```
Starts RAG wrapper (if needed), chat server, and frontend. `Ctrl+C` stops all.

### Option B — tmux (recommended for development)
```bash
tmuxp load flex-chat.yml
```
Opens all services in named windows with live logs. Edit `flex-chat.yml` to customise RAG services (ports, options).

### Option C — Individual terminals

**RAG Wrapper** (one per knowledge base, own port and data dir):
```bash
cd backend/rag
python3 server.py
# Or: python3 server.py --chroma-path ./chroma_db/products --port 5006
# With reranker: python3 server.py --chroma-path ./chroma_db/docs --port 5007 --cross-encoder BAAI/bge-reranker-base
```

**Chat server:** `cd backend/chat && node server.js` (port 5005)  
**Frontend:** `cd frontend && npm run dev` (port 5173)

**URLs:** Home `http://localhost:5173/` · Chat `http://localhost:5173/chat` · Collections `http://localhost:5173/collections`

See [docs/CHROMADB_WRAPPER.md](docs/CHROMADB_WRAPPER.md) for full RAG options.

---

## Architecture

6-phase processing flow (with optional **Phase 6b** when tools are enabled):

1. **Topic Detection** — Extract topic from message and history  
2. **RAG Collection** — Query selected collections; wrapper generates query embedding  
3. **Intent Detection** — Classify intent (fast path when RAG match)  
4. **Profile Building** — Build context from RAG results and intent  
5. **Response Handler Matching** — First matching rule wins  
6. **Response Generation** — LLM generates response; if handler has tools enabled → **Phase 6b** tool loop (iterate until model returns final text)

```
Frontend (React) → Chat Server (Node) → AI Providers (OpenAI, Gemini, Ollama)
                            ↘ ChromaDB Wrapper (Python) → ChromaDB
```

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Configuration

Config is JSON. Main sections: **LLMs**, **RAG Services** (vector DB connections), **Intent**, **Responses** (handlers). Embeddings are configured in the RAG wrapper and per collection, not in the Node config. See [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

**Example configs** (`config/examples/`): `01-chat-only.json`, `02-single-rag-dynamic.json`, `04-multi-rag-multi-llm.json`, `08-tool-calling.json`

**Specifying config:** `node server.js --config path/to/config.json` · or `FLEX_CHAT_CONFIG_FILE` / `FLEX_CHAT_CONFIG_DIR`

### Response Handlers

Match criteria (e.g. `service`, `intent_regexp`, `rag_results`, `reasoning`); first match wins. Prompt supports `{{rag_context}}`, `{{topic}}`, `{{intent}}`, etc.

### Tool Calling

Enable builtins in the `tools` section; optionally set `tools.enabled` per handler. Builtins: `calculator`, `get_current_datetime`, `generate_uuid`. Configure and test in **Config Builder → Tools**.

### RAG Services

```json
"rag_services": {
  "recipes": {
    "provider": "chromadb-wrapper",
    "url": "http://localhost:5006",
    "match_threshold": 0.3,
    "partial_threshold": 0.5
  }
}
```

Collections are created in the UI; each has an `embedding_model` from the wrapper’s available models. [docs/COLLECTION_MANAGEMENT.md](docs/COLLECTION_MANAGEMENT.md) · [docs/RAG_SERVICES.md](docs/RAG_SERVICES.md)

---

## Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and 6-phase flow |
| [CONFIGURATION.md](docs/CONFIGURATION.md) · [CONFIGURATION_BUILDER.md](docs/CONFIGURATION_BUILDER.md) | Config reference and UI guide |
| [RAG_SERVICES.md](docs/RAG_SERVICES.md) · [CHROMADB_WRAPPER.md](docs/CHROMADB_WRAPPER.md) | RAG and wrapper setup |
| [COLLECTION_MANAGEMENT.md](docs/COLLECTION_MANAGEMENT.md) | Dynamic collections |
| [REASONING_MODELS.md](docs/REASONING_MODELS.md) | Reasoning models (e.g. DeepSeek R1) |
| [CHANGELOG.md](CHANGELOG.md) · [TODO.md](TODO.md) · [CONTRIBUTING.md](CONTRIBUTING.md) | Project docs |

---

## Development

**Structure:** `frontend/` (React + Vite), `backend/chat/` (Node server, `lib/` = phase modules, `tools/` = tool pipeline, `ai-providers/`, `retrieval-providers/`), `backend/rag/` (Python FastAPI wrapper), `config/examples/`, `docs/`.

**Adding an AI provider:** Create a provider in `backend/chat/ai-providers/providers/` extending `AIProvider`; implement `generateChat()` (and optionally `generateEmbeddings()` if the provider is used for non-RAG embedding); register in `providers/index.js`.

**Adding a RAG provider:** Create a provider in `backend/chat/retrieval-providers/providers/` extending `RetrievalProvider`; implement `query()` and collection methods; register in `providers/index.js`. [docs/RAG_SERVICES.md](docs/RAG_SERVICES.md)

---

## Testing

Start all services, create a collection in the UI (e.g. "test_knowledge"), upload a document, open Chat, select the collection, and ask a question that should use the document. Confirm the response uses your system prompt and RAG context.

---

## Deployment

**Kubernetes/OpenShift:** Build frontend (React → nginx), chat server (Node), RAG wrapper (Python). Use a ConfigMap for `config.json`; set `OPENAI_API_KEY` (or equivalent) and config path. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for patterns.

---

## Troubleshooting

| Issue | Checks |
|-------|--------|
| **Collections not showing** | RAG service in config; wrapper running (`python3 backend/rag/server.py`); `url` in `rag_services` matches wrapper port |
| **Connection refused** | 5006 → wrapper; 5005 → chat server; 5173 → frontend (`npm run dev` in frontend/) |
| **No RAG results** | Collections have documents; lower `match_threshold`; wrapper has embedding models loaded and collection has `embedding_model` set |
| **LLM errors** | API keys (env or config); provider running (e.g. `ollama list`); rate limits; chat server logs |
| **Topic detection** | Intent/topic configured; LLM for detection accessible |

More: [docs/CONFIGURATION.md](docs/CONFIGURATION.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Contributing · License · Support

[CONTRIBUTING.md](CONTRIBUTING.md) · MIT (see LICENSE) · Issues and Discussions: use the GitHub repo.

**Acknowledgments:** OpenAI, ChromaDB, React, Vite, FastAPI.
