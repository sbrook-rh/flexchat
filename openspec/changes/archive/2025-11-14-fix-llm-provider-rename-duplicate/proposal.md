# Fix LLM Provider Rename Duplicate Bug

## Why

**Bug**: Editing an LLM provider and changing its name creates a duplicate connection instead of renaming the existing one.

Users experience this workflow issue:
1. Edit existing LLM provider (e.g., "local")
2. Change name in wizard to "my-local-ollama"
3. System creates NEW connection with the new name
4. Original connection remains unchanged
5. Result: Two connections to the same provider instance

This is the exact same root cause as the RAG service bug we fixed in `fix-rag-service-rename-duplicate` (deployed 2025-11-13): the provider name is used as both the configuration key (immutable ID) and the display label (should be mutable).

## What Changes

Apply the proven RAG service pattern to LLM providers:

**Frontend:**
- Separate stable ID from user-editable display name in LLM provider data model
- Generate kebab-case IDs from display names on creation (e.g., "My Local Ollama" → `my-local-ollama`)
- Lock provider IDs during edit (show read-only), allow display name changes
- Update `ConfigBuilder` to use provider ID as configuration key
- Update `LLMWizard` to manage separate ID and description fields
- Update `LLMProviderList` to display friendly names while maintaining stable ID references

**Backend:**
- Add duplicate LLM ID validation (prevent manual config errors)

**Benefits:**
- Renaming providers no longer creates duplicates
- Consistent pattern with RAG services
- Backward compatible with existing configs (fallback to ID if no description)
- All existing references continue to work (response handlers, embeddings, intent config, topic config)

## Impact

**Affected specs:**
- `config-builder` - LLM provider UI and save logic
- `config-loader` - Backend duplicate ID validation

**Affected code:**
- `backend/chat/lib/config-loader.js` - Add duplicate LLM ID validation
- `frontend/src/LLMWizard.jsx` - ID generation, dual-field UI, state management
- `frontend/src/ConfigBuilder.jsx` - Fix save logic (use ID as key), display logic
- `frontend/src/LLMProviderList.jsx` - Update display to show description with ID as secondary info

**Breaking changes:** None (backward compatible with existing configurations)

**Migration:** Existing configs without `description` field will display the provider ID as fallback. On first edit, users can set a friendly description.

**References:** All system integration points already use object keys:
- Response handlers: `response.llm` field
- Topic config: `config.topic.provider.llm`
- Intent config: `config.intent.provider.llm`
- Embeddings config: `config.embedding.llm`
- RAG service embeddings: `rag_services[x].embedding.llm`

Adding the `description` field does not break any references.

