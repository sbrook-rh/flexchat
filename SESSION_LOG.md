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
