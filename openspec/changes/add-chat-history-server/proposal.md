# Chat History Server Storage Proposal

## Why

Phase 1 delivered client-side chat history via localStorage. To support cross-device access, durability, and richer session management, we need server-side persistence with a REST API. This unlocks shared access, AI-generated titles, and advanced search in future iterations while keeping the existing local fallback.

## What Changes

- Add backend session storage (SQLite-based by default) with CRUD endpoints under `/api/sessions`.
- Persist chat messages with metadata (model, timestamps) and expose pagination/search filters.
- Integrate the frontend chat history UI with the new API while retaining a fallback to localStorage when offline.
- Provide a one-time sync tool to migrate local sessions to the server.

## Impact

- Affected specs: `chat-history` (server persistence requirements), potential documentation updates.
- Affected code:
  - Backend: new routes, session store, migrations, and chat route integration to save responses.
  - Frontend: API client, updated session manager, enhanced ChatHistory UI, offline fallback logic.
- Requires database bundling (SQLite file) or configuration for external DB.

## Risks / Open Questions

- Migration strategy: providing safe upload of existing localStorage sessions without data loss.
- Conflict resolution: defining last-write-wins vs merge logic for concurrent edits.
- Performance: ensuring pagination and indexes handle large histories efficiently.
