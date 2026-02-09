# Smart Port Defaults for RAG Wizard

## Why
When configuring multiple ChromaDB Wrapper services, users typically run them on sequential ports (5006, 5007, 5008, etc.). Currently, the RAG wizard always defaults to `http://localhost:5006`, requiring manual editing when that port is already in use by another configured service. This leads to configuration conflicts and poor UX.

## What Changes
- RAG wizard detects which localhost ports are already used by existing RAG services in the current configuration
- When showing the URL field for ChromaDB Wrapper provider, suggest the next available sequential port (5006, 5007, 5008, etc.)
- Only applies to ChromaDB Wrapper provider (port 5006 base), not to direct ChromaDB (port 8000 base)
- Frontend logic only - no backend API changes needed

## Impact
- Affected specs: `config-builder` (wizard behavior)
- Affected code: `frontend/src/RAGWizard.jsx`, `frontend/src/ConfigBuilder.jsx` (services state)
- No breaking changes - existing configurations unaffected

