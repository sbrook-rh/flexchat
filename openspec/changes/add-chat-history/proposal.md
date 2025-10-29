# Chat History Management Proposal

## Why

Flex Chat currently stores chat messages only in browser localStorage, which limits users to a single device and provides no way to manage multiple conversations. Users lose all chat history when clearing browser data or switching devices. There is no way to organize, search, or revisit past conversations across different topics.

The Chat History Management capability enables users to:
- Persist conversations beyond browser storage
- Manage multiple chat sessions with distinct topics
- Switch between active conversations
- Export and download conversation history
- (Phase 2) Store conversations server-side for cross-device access
- (Phase 2) Auto-generate conversation titles from AI summaries

This shifts Flex Chat from a "single ephemeral conversation" model to a "multi-conversation management" model while maintaining the current localStorage behavior as the foundation for Phase 1.

## What Changes

### Phase 1: Client-Side History (localStorage-based)

**New Capabilities**:
- **Session Management** - Create, list, switch between multiple chat sessions stored in localStorage
- **Chat History UI** - Right sidebar displays list of saved sessions with metadata
- **Session Export** - Download individual sessions as JSON files
- **Session Import** - Load previously exported session JSON files
- **Session Metadata** - Track creation date, last updated, message count, topic
- **Active Session Management** - Visual indication of current session, ability to archive/delete sessions

**Modified Capabilities**:
- Frontend chat component extends to support multiple sessions (localStorage structure change)
- Current "Clear Chat" becomes "Archive Session" with option to delete

### Phase 2: Server-Side Storage (Future)

**New Capabilities** (Phase 2 only):
- **Server-Side Persistence** - REST API endpoints for session CRUD operations
- **Database Integration** - Session and message storage (SQLite or JSON file-based)
- **AI-Generated Titles** - Automatic conversation title generation using LLM summaries
- **Cross-Device Sync** - Access conversations from any device
- **Search & Filter** - Search across all conversations by content, topic, or date

**Modified Capabilities** (Phase 2 only):
- Chat History UI connects to backend API instead of localStorage
- Session management uses server-generated IDs and timestamps

## Impact

### Affected Specs
- `chat-history` - NEW: Complete specification for session management and history UI

### Affected Code

#### Phase 1 (Client-Side)
- **Frontend** (`frontend/src/`):
  - Modified: `Chat.jsx` - Session management, localStorage multi-session structure
  - New: `ChatHistory.jsx` - Right sidebar session list component
  - New: `SessionManager.jsx` - Session create/switch/archive/delete logic
  - New: `lib/sessionStorage.js` - localStorage abstraction for multi-session management
  - Modified: Right sidebar in `Chat.jsx` to render session list (currently shows "Coming soon...")

#### Phase 2 (Server-Side)
- **Backend** (`backend/chat/`):
  - New: `routes/sessions.js` - `/api/sessions/*` endpoints (CRUD operations)
  - New: `lib/session-store.js` - Session persistence layer (SQLite or JSON file)
  - New: `lib/title-generator.js` - AI-powered title generation service
  - Modified: `routes/chat.js` - Track session ID in request/response
  - New: Database schema or JSON file structure for sessions and messages

- **Documentation**:
  - New: `docs/CHAT_HISTORY.md`
  - Modified: `docs/ARCHITECTURE.md` - Add session management architecture

### Breaking Changes
**NONE** - All changes are additive.
- Phase 1: Existing localStorage `chatMessages` will be migrated to a default session automatically
- Phase 2: Client-side sessions can optionally be synced to server (migration path provided)

### Dependencies
- **Phase 1**: No new dependencies
- **Phase 2**: 
  - Database library (better-sqlite3 or use JSON file persistence)
  - Title generation uses existing AI provider infrastructure

## Phases

### Phase 1: Client-Side Session Management (localStorage)
**Goal**: Enable users to manage multiple chat sessions locally with export/import capabilities

**Deliverables**:
- Multi-session localStorage structure (migrate existing single session)
- Session creation, switching, archiving, deletion
- Right sidebar session list UI (replaces "Coming soon..." placeholder)
- Session metadata display (date, message count, topic)
- Active session indicator
- Session export to JSON download
- Session import from JSON file upload
- Automatic migration of existing `chatMessages` localStorage to default session

**Estimated Complexity**: Small-Medium (1-2 weeks)

**Non-Goals**:
- Server-side storage
- Cross-device sync
- AI-generated titles
- Full-text search

### Phase 2: Server-Side Storage & AI Titles
**Goal**: Persist sessions server-side with AI-generated titles and cross-device access

**Deliverables**:
- Backend REST API for session management (`/api/sessions/*`)
- Session database schema and persistence layer
- AI-powered title generation (summary-based)
- Frontend integration with backend API (fallback to localStorage)
- Session sync from localStorage to server (one-time migration helper)
- Cross-device session access
- Enhanced session list with AI-generated titles
- Search and filter across conversations (content, topic, date)

**Depends On**: Phase 1 (builds on top of client-side session structure)

**Estimated Complexity**: Medium-Large (2-3 weeks)

**Open Questions**:
1. Database choice: SQLite (simple, file-based) vs PostgreSQL (future-proof, scalable)?
   - **Recommendation**: Start with SQLite or JSON file persistence (aligns with project simplicity)
2. Title generation: Real-time on message send or batch generation?
   - **Recommendation**: Generate on session close or after N messages (avoid API spam)
3. Session storage limit: How many sessions/messages per user?
   - **Recommendation**: No hard limit in Phase 1 (localStorage); Phase 2 introduces configurable limits

## Success Criteria

### Phase 1
1. **Multi-Session Support**: Users can create, switch between, and manage multiple chat sessions
2. **Persistent Sessions**: Sessions persist in localStorage across browser sessions
3. **Session Export**: Users can download any session as JSON
4. **Session Import**: Users can upload and restore exported sessions
5. **Migration**: Existing single-session chat history is automatically migrated
6. **UI Polish**: Right sidebar shows clean session list with metadata

### Phase 2
1. **Server Persistence**: All sessions are stored server-side (with localStorage fallback)
2. **AI Titles**: Sessions display AI-generated titles based on conversation content
3. **Cross-Device**: Sessions are accessible from any device (same user)
4. **Search**: Users can search across all conversations
5. **Backward Compatibility**: Phase 1 localStorage sessions can be synced to server

## Risks & Mitigations

### Risk: localStorage Size Limits
**Mitigation**: 
- Limit stored messages per session (e.g., 200 messages max)
- Provide clear UI feedback when approaching limits
- Phase 2 moves to server storage without limits

### Risk: Data Loss on localStorage Clear
**Mitigation**: 
- Prominent "Export All Sessions" button
- Regular export reminders (or auto-export to downloads)
- Phase 2 provides server-side backup

### Risk: Session Migration Bugs
**Mitigation**: 
- Create backup of old localStorage structure before migration
- Graceful fallback if migration fails
- Comprehensive testing of migration path

### Risk: Title Generation Cost (Phase 2)
**Mitigation**: 
- Batch title generation (not real-time)
- Cache generated titles
- User can manually edit titles
- Make title generation optional/configurable

## Open Questions

1. **Session Naming**: Should users manually name sessions or rely on AI titles?
   - **Recommendation**: Phase 1 uses topic as default name (editable); Phase 2 adds AI titles
2. **Session Limit**: How many sessions should be stored in localStorage?
   - **Recommendation**: No hard limit, but warn user at 50 sessions (localStorage size concerns)
3. **Message Retention**: Should old messages be truncated per session?
   - **Recommendation**: Phase 1 keeps last 200 messages per session; Phase 2 no limit
4. **Export Format**: Should we support formats beyond JSON (CSV, Markdown)?
   - **Recommendation**: Start with JSON only; add Markdown export if requested
5. **Backend Auth**: Does Phase 2 require user authentication for multi-user support?
   - **Recommendation**: Defer auth to future; Phase 2 assumes single-user (or basic API key)

