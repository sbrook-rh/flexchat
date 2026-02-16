# NEW SESSION - Start Here

**Instructions:** At the start of each new session, follow these steps to get up to speed quickly.

## Step 1: Read Core Context Files (In Order)

### 1. CONTEXT.md - How We Work
Read this first to understand:
- Working practices (Discuss → Confirm → Run)
- Complex logic flow debugging methodology
- Testing strategy (mock external deps)
- Git safety rules (atomic commits, no `git add .`)
- Change planning guidelines

### 2. PROJECT_STATUS.md - Current Priorities and Status
Read this to see:
- **What we're working on right now** - ETL, advanced RAG, pipeline system
- **Roadmap** - Phase 1–4 and strategic priorities
- **Ready for production** vs **on hold** - What's done and what's waiting
- **Tech stack and direction** - Profile system, cross-encoder, hierarchical metadata

### 3. README.md - Project Overview
Skim this for:
- Project architecture and key features
- Quick start instructions
- Main components (AI providers, RAG, frontend)

## Step 2: Check Recent Activity

```bash
# View last 10 commits to see recent work
git log --oneline -10

# Check for uncommitted changes
git status

# Check current branch
git branch
```

**Look for:**
- What was worked on in the last session
- Any patterns or themes in recent commits
- Unfinished work or WIP commits

## Step 3: Understand Current State

### Quick Project Structure Reminder
```
backend/
  chat/
    server.js - Main chat server with 6-phase processing flow
    lib/ - Core processing modules
      topic-detector.js - Phase 1: Topic detection
      rag-collector.js - Phase 2: RAG collection search
      intent-detector.js - Phase 3: Intent detection
      profile-builder.js - Phase 4: Profile building
      response-matcher.js - Phase 5: Response handler matching
      response-generator.js - Phase 6: Response generation
    ai-providers/ - AI provider abstraction (OpenAI, Ollama)
    retrieval-providers/ - RAG service abstraction (ChromaDB wrapper)
    __tests__/ - Jest tests
  rag/
    server.py - Python FastAPI wrapper for ChromaDB
    
frontend/
  src/
    Chat.jsx - Topic-aware chat interface
    Collections.jsx - Dynamic collection management UI
    
config/
  config.json - Main configuration
  examples/ - Example configurations (01-chat-only.json, etc.)
  
docs/
  ARCHITECTURE.md - v2.0 architecture and 4-phase flow
  CONFIGURATION.md - Complete configuration guide
  RAG_SERVICES.md - RAG service configuration
  CHROMADB_WRAPPER.md - Python service guide
```

### Key Technical Concepts (v2.0)
- **6-Phase Processing Flow**: Topic Detection → RAG Collection → Intent Detection → Profile Building → Response Handler Matching → Response Generation
- **Response Handlers** (not "strategies"): Rules in `responses` array with match criteria
- **RAG Services** (not "knowledge bases"): Vector databases configured in `rag_services`
- **RAG Envelope**: Normalized `{ result: "match"|"partial"|"none", data }` format
- **Profile Object**: Context built in Phase 4, contains topic, intent, rag_results, documents
- **Topic Awareness**: UI displays current topic and per-message topics
- **Model Transparency**: Each response shows which LLM/model was used
- **Dynamic Collections**: UI-created collections with metadata-driven behavior

## Step 4: Ask Clarifying Questions

Before starting work, ask the user:

1. **"What would you like to work on today?"**
2. If unclear: **"Should I continue from where we left off, or start something new?"**
3. If continuing: **"Let me review [specific area] to make sure I understand the current state."**

### Common Focus Areas
- **Testing**: Implementing more test cases (current: 15% coverage, target: 80%)
- **Chat History**: Backend storage with abstraction layer
- **Document Ingestion**: PDF, HTML, URL support
- **Configuration Wizard**: CLI tool for setup
- **New Features**: From PROJECT_STATUS.md or user request
- **Bug Fixes**: From user reports or testing
- **Documentation**: Updates or new guides

## Step 5: Verify Understanding

Once you understand the task:
1. **Summarize** what you're going to do
2. **Explain** the approach (referencing CONTEXT.md methodology if complex)
3. **Wait for confirmation** before making changes
4. **Ask questions** if anything is unclear

## Common Starting Points

### If Continuing Testing Work
1. Check `backend/chat/__tests__/` for existing tests
2. Review `PROJECT_STATUS.md` for testing priorities
3. Look at `strategy-detection.test.js` for outlined tests
4. Reference `strategy-detection-example.test.js` for patterns
5. Run `npm test` to see current state

### If Starting New Feature
1. Check PROJECT_STATUS.md for roadmap and priorities
2. Use "Complex Logic Flow Debugging" methodology from CONTEXT.md:
   - Walk through current flow
   - Real-world scenario analysis
   - Design optimal outcome
   - Plot implementation steps
   - Implement & validate

### If Fixing a Bug
1. Follow "Change Planning" from CONTEXT.md:
   - Evidence before edits (logs, reproduction)
   - Minimal-first fix
   - Validate before refactoring

## Quick Reference

### Important Files to Know
| File | Purpose | When to Check |
|------|---------|---------------|
| `CONTEXT.md` | Working practices, guidelines | Start of every session |
| `PROJECT_STATUS.md` | Roadmap, priorities, status | Start of every session |
| `README.md` | Project overview | When unclear on architecture |
| `docs/ARCHITECTURE.md` | v2.0 architecture, 4-phase flow | When working on core logic |
| `docs/CONFIGURATION.md` | Complete config guide | When working with config |
| `docs/RAG_SERVICES.md` | RAG service configuration | When working with RAG |
| `docs/CHROMADB_WRAPPER.md` | Python service guide | When working with embeddings/collections |
| `backend/chat/server.js` | Main server orchestrator | When working on chat flow |
| `backend/chat/lib/*.js` | Core processing modules | When working on specific phases |
| `backend/rag/server.py` | ChromaDB wrapper service | When working on collections/embeddings |
| `config/examples/*.json` | Example configurations | When setting up or testing |

### Test Commands
```bash
cd backend/chat
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Development Commands
```bash
./start.sh                # Start all services (frontend, chat, rag)
cd backend/chat && node server.js  # Chat server
cd backend/rag && python3 server.py  # RAG service (port 5006 by default)
cd frontend && npm run dev  # Frontend dev server (port 5173)
```

## Summary Checklist

At the start of each session, complete this checklist:

- [ ] Read CONTEXT.md (working practices)
- [ ] Read PROJECT_STATUS.md (current focus and status)
- [ ] Skim README.md (architecture refresh)
- [ ] Check `git log --oneline -10` (recent work)
- [ ] Check `git status` (uncommitted changes)
- [ ] Ask user: "What would you like to work on today?"
- [ ] Summarize understanding and wait for confirmation
- [ ] Proceed with work following CONTEXT.md guidelines

---

## For the AI Assistant

When the user says **"Follow NEW_SESSION instructions"** or **"Start new session"**:

1. Acknowledge and begin: "Starting new session - reading context files..."
2. Execute Step 1: Read CONTEXT.md, PROJECT_STATUS.md, README.md (mention key findings)
3. Execute Step 2: Check git log and status (report findings)
4. Execute Step 3: Confirm understanding of project structure and current state
5. Execute Step 4: Ask clarifying questions about today's focus
6. Execute Step 5: Summarize and wait for confirmation before proceeding

**Remember:** Always follow the "Discuss → Confirm → Run" pattern from CONTEXT.md!

