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

### 2. TODO.md - What Needs Doing
Read this to see:
- **Current Focus section** (if present) - What we're actively working on
- **Recent Accomplishments** - What was just completed
- Completed items (✅) - What's already done
- Pending items (☐) - What's left to do
- HIGH PRIORITY items - What's most important

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
    server.js - Main chat server with multi-stage strategy detection
    ai-providers/ - AI provider abstraction (OpenAI, Gemini, Ollama)
    retrieval-providers/ - RAG abstraction (ChromaDB wrapper)
    __tests__/ - Jest tests (3 passing, 60+ outlined)
  rag/
    server.py - Python FastAPI wrapper for ChromaDB
    
frontend/
  src/
    Chat.jsx - Main chat interface
    Collections.jsx - Dynamic collection management UI
    
config/
  config.json - Main configuration
  examples/ - Example configurations
  
docs/
  CONFIGURATION.md - Practical config guide
```

### Key Technical Concepts
- **Multi-stage strategy detection**: Dynamic collections → Static RAG → LLM fallback → Default
- **Dynamic collections**: UI-created collections with metadata-driven behavior
- **Hybrid embedding config**: Model specified in config.json, credentials in .env
- **Fallback thresholds**: Lower (immediate match) and upper (LLM candidate)
- **Multi-collection combining**: Combines context from all matching candidates

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
- **New Features**: From TODO.md or user request
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
2. Review `TODO.md` → Testing & Validation section
3. Look at `strategy-detection.test.js` for outlined tests
4. Reference `strategy-detection-example.test.js` for patterns
5. Run `npm test` to see current state

### If Starting New Feature
1. Check if it's in TODO.md (use that priority/structure)
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
| `CONTEXT.md` | Working practices | Start of every session |
| `TODO.md` | Task list and priorities | Start of every session |
| `README.md` | Project overview | When unclear on architecture |
| `docs/CONFIGURATION.md` | Config guide | When working with config |
| `backend/chat/server.js` | Main server logic | When working on detection/routing |
| `backend/rag/server.py` | RAG service | When working on embeddings/collections |
| `config/config.json` | Main config | When testing or changing behavior |

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
cd backend/chat && npm run dev   # Chat server with auto-reload
cd backend/rag && uvicorn server:app --reload  # RAG service with auto-reload
cd frontend && npm start  # Frontend dev server
```

## Summary Checklist

At the start of each session, complete this checklist:

- [ ] Read CONTEXT.md (working practices)
- [ ] Read TODO.md (current focus and status)
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
2. Execute Step 1: Read CONTEXT.md, TODO.md, README.md (mention key findings)
3. Execute Step 2: Check git log and status (report findings)
4. Execute Step 3: Confirm understanding of project structure and current state
5. Execute Step 4: Ask clarifying questions about today's focus
6. Execute Step 5: Summarize and wait for confirmation before proceeding

**Remember:** Always follow the "Discuss → Confirm → Run" pattern from CONTEXT.md!

