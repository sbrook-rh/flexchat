# Chat History Management - Design Document

## Context

Flex Chat currently stores all chat messages in a single localStorage key (`chatMessages`), with no concept of sessions or conversation history. The right sidebar has a placeholder ("Coming soon...") for chat history. Users lose messages when clearing browser data, cannot organize conversations, and have no cross-device access.

This design adds multi-session management in two phases:
1. **Phase 1**: localStorage-based sessions (immediate value, no backend changes)
2. **Phase 2**: Server-side persistence with AI-generated titles (future enhancement)

### Stakeholders
- **End Users**: Want to manage multiple conversations, export chat history, and (eventually) access from multiple devices
- **Developers**: Need clear data structures, migration paths, and extensible architecture for Phase 2

### Constraints
- Must maintain backward compatibility (existing single-session users should not lose data)
- Phase 1 must work entirely client-side (no backend changes)
- Phase 2 must gracefully degrade to Phase 1 if server is unavailable
- localStorage has ~5-10MB limit per domain (varies by browser)

---

## Goals / Non-Goals

### Goals
**Phase 1**:
- Enable users to create and manage multiple chat sessions locally
- Provide session export/import for data portability
- Migrate existing `chatMessages` seamlessly to new session structure
- Implement right sidebar session list (replace placeholder)
- No backend changes required

**Phase 2**:
- Persist sessions server-side for durability and cross-device access
- Generate AI-powered session titles automatically
- Enable search and filter across all conversations
- Graceful fallback to Phase 1 if server is unavailable

### Non-Goals
**Phase 1**:
- ❌ Server-side storage (Phase 2)
- ❌ AI-generated titles (Phase 2)
- ❌ Cross-device sync (Phase 2)
- ❌ User authentication (future)
- ❌ Real-time collaboration (future)

**Phase 2**:
- ❌ Real-time message sync (WebSocket-based)
- ❌ End-to-end encryption
- ❌ Message editing/deletion
- ❌ Multi-user support (deferred to future auth work)

---

## Decisions

### Decision 1: Two-Phase Rollout
**Choice**: Implement localStorage-based sessions first (Phase 1), then add server storage (Phase 2)

**Rationale**:
- Phase 1 delivers immediate value without backend complexity
- Allows user testing and feedback before committing to database choice
- Graceful degradation: Phase 2 can fall back to Phase 1
- Reduces risk: smaller, incremental changes

**Alternatives Considered**:
- **Server-first approach**: Would delay user value, require database choice upfront, higher implementation risk
- **Hybrid from start**: Would add complexity, harder to test, no clear migration path

---

### Decision 2: localStorage Data Structure (Phase 1)

**Choice**: Nested JSON structure with sessions array

```json
{
  "version": "2.0",
  "activeSessi onId": "uuid-1",
  "sessions": [
    {
      "id": "uuid-1",
      "title": "Conversation on React Hooks",
      "topic": "react hooks",
      "createdAt": "2025-10-29T10:00:00Z",
      "updatedAt": "2025-10-29T10:15:00Z",
      "archived": false,
      "messages": [
        {
          "type": "user",
          "text": "How do I use useEffect?",
          "timestamp": "2025-10-29T10:00:00Z"
        },
        {
          "type": "bot",
          "text": "useEffect is a React hook...",
          "topic": "react hooks",
          "service": "openai",
          "model": "gpt-4",
          "timestamp": "2025-10-29T10:00:05Z"
        }
      ],
      "metadata": {
        "messageCount": 2,
        "lastService": "openai",
        "lastModel": "gpt-4"
      }
    }
  ]
}
```

**Rationale**:
- Allows efficient session switching (load one session's messages)
- Version field enables future migration detection
- Metadata enables quick UI rendering without parsing all messages
- `archived` flag allows soft-delete (can be restored)

**Alternatives Considered**:
- **Separate localStorage keys per session**: Would hit key limits (~1000 keys), harder to list all sessions
- **Flat message array with session tags**: Inefficient filtering, harder to manage metadata

**Migration Strategy**:
1. Detect old `chatMessages` key (no `version` field)
2. Create backup: `chatMessages_backup`
3. Create new structure with single default session
4. Move messages to default session
5. Set `version: "2.0"`
6. Delete old `chatMessages` key

---

### Decision 3: Session ID Generation

**Choice**: Use UUID v4 (client-generated in Phase 1)

**Rationale**:
- Client-generated IDs work for Phase 1 (no server coordination needed)
- UUID v4 has negligible collision risk (2^122 possible values)
- Compatible with Phase 2: server can accept client-provided IDs or generate its own

**Alternatives Considered**:
- **Auto-incrementing integers**: Collision risk if importing sessions from multiple devices
- **Timestamp-based**: Collision risk if multiple sessions created in same millisecond

---

### Decision 4: Session Title Strategy

**Phase 1 Choice**: Use topic (detected by existing topic detection system) as default title

**Rationale**:
- Reuses existing topic detection (no new logic)
- Better than generic "New Chat" (provides context)
- Users can manually rename if desired

**Phase 2 Enhancement**: AI-generated titles replace topic-based titles

**Title Generation Strategy (Phase 2)**:
- Trigger: After 10 messages OR on session close (whichever comes first)
- Prompt: "Summarize this conversation in 5-7 words"
- Fallback: Use first user message (truncated to 50 chars) if AI fails
- Cache: Store generated title in session metadata, don't regenerate unless user requests

---

### Decision 5: Database Choice (Phase 2)

**Choice**: Use SQLite (better-sqlite3) for initial Phase 2 implementation

**Rationale**:
- Simple file-based storage (no external database server required)
- Aligns with project's "simplicity first" philosophy (per `openspec/project.md`)
- Synchronous API (better-sqlite3) is faster and simpler than async
- Easy to back up (single file)
- Sufficient for single-user or small team deployments
- Can migrate to PostgreSQL later if needed (schema is compatible)

**Schema**:
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT,
  created_at TEXT NOT NULL,  -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,
  archived INTEGER DEFAULT 0,  -- Boolean (0 = active, 1 = archived)
  metadata TEXT  -- JSON string for extensibility
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'user' or 'bot'
  text TEXT NOT NULL,
  topic TEXT,
  service TEXT,
  model TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_created ON sessions(created_at DESC);
CREATE INDEX idx_session_updated ON sessions(updated_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

**Alternatives Considered**:
- **JSON file per session**: Simple but no query support, no transactions, harder to search
- **PostgreSQL**: Overkill for initial implementation, requires external server, harder setup
- **MongoDB**: Adds unnecessary dependency, overkill for simple relational data

---

### Decision 6: Export/Import Format

**Choice**: Single-session JSON files (matching localStorage structure)

**Rationale**:
- Human-readable and editable (JSON)
- Compatible with localStorage structure (easy round-trip)
- Can include metadata for versioning and validation

**Export Format**:
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-10-29T10:30:00Z",
  "session": {
    "id": "uuid-1",
    "title": "Conversation on React Hooks",
    "topic": "react hooks",
    "createdAt": "2025-10-29T10:00:00Z",
    "updatedAt": "2025-10-29T10:15:00Z",
    "messages": [ /* ... */ ]
  }
}
```

**"Export All" Format**: ZIP file containing multiple JSON files + manifest

**Alternatives Considered**:
- **Markdown format**: Would lose metadata (service, model, timestamps), harder to re-import
- **CSV format**: Poor fit for nested message data, no metadata support

---

### Decision 7: Frontend State Management (Phase 1)

**Choice**: Use React Context + useReducer for session management state

**Rationale**:
- Built-in React feature (no new dependencies)
- Sufficient for Phase 1 complexity
- Works well with localStorage persistence
- Easy to extend in Phase 2 (add API calls)

**State Structure**:
```javascript
{
  sessions: Session[],        // All sessions
  activeSessionId: string,    // Currently viewed session
  isLoading: boolean,
  error: string | null
}
```

**Actions**:
- `CREATE_SESSION`
- `SWITCH_SESSION`
- `UPDATE_SESSION`
- `DELETE_SESSION`
- `ARCHIVE_SESSION`
- `ADD_MESSAGE`
- `LOAD_SESSIONS`
- `IMPORT_SESSION`

**Alternatives Considered**:
- **Zustand/Redux**: Overkill for Phase 1, adds dependency
- **Direct useState**: Would scatter state logic, harder to maintain
- **React Query**: Better for Phase 2 (server state), unnecessary for Phase 1 (localStorage)

---

### Decision 8: Backend API Design (Phase 2)

**Choice**: RESTful API with standard CRUD operations

**Endpoints**:
```
GET    /api/sessions              # List all sessions (with pagination)
GET    /api/sessions/:id          # Get session with messages
POST   /api/sessions              # Create session
PUT    /api/sessions/:id          # Update session (title, add messages)
DELETE /api/sessions/:id          # Delete session
POST   /api/sessions/:id/archive  # Archive session
POST   /api/sessions/:id/regenerate-title  # Regenerate AI title
```

**Rationale**:
- Follows existing backend patterns (see `routes/collections.js`, `routes/connections.js`)
- Standard HTTP verbs (easy to understand)
- Supports pagination (critical for 100+ sessions)
- Separates concerns (title regeneration is separate from general update)

**Request/Response Examples**:
```javascript
// POST /api/sessions - Create
Request: { title: "New Chat", topic: "react" }
Response: { id: "uuid-1", title: "New Chat", topic: "react", createdAt: "...", messages: [] }

// PUT /api/sessions/:id - Add message
Request: { 
  messages: [{ type: "user", text: "Hello", timestamp: "..." }]
}
Response: { id: "uuid-1", messageCount: 5, updatedAt: "..." }

// GET /api/sessions - List (with pagination)
Query: ?page=1&limit=20&archived=false&sort=updated_at
Response: {
  sessions: [ /* session list */ ],
  pagination: { page: 1, limit: 20, total: 45 }
}
```

**Alternatives Considered**:
- **GraphQL**: Overkill for simple CRUD, adds complexity, steeper learning curve
- **Single monolithic endpoint**: Harder to cache, less RESTful, poor separation of concerns

---

### Decision 9: Title Generation Timing (Phase 2)

**Choice**: Generate titles asynchronously after 10 messages OR on session archive

**Rationale**:
- Avoids blocking user interaction (async generation)
- 10 messages provides enough context for meaningful summary
- Generating on archive catches sessions that end before 10 messages
- Reduces API costs (don't regenerate on every message)

**Implementation**:
1. Track `titleGeneratedAt` in session metadata
2. Backend task checks if session has 10+ messages and no title
3. Call AI provider with prompt: "Summarize this conversation in 5-7 words"
4. Update session title in database
5. Frontend polls or receives title update on next fetch

**Fallback**: If AI fails, use `[First user message]` (truncated to 50 chars)

**Alternatives Considered**:
- **Real-time on every message**: Too expensive (API costs), unnecessary for most messages
- **Only on explicit user action**: Worse UX (extra step), many sessions would never get titles
- **Batch process all sessions nightly**: Delays value, poor UX for active users

---

### Decision 10: Fallback Strategy (Phase 2)

**Choice**: Graceful degradation to localStorage if server is unavailable

**Implementation**:
1. On app load, attempt to fetch sessions from server
2. If server is down (network error, 500, timeout):
   - Display warning toast: "Server unavailable, using local storage"
   - Load sessions from localStorage (Phase 1 behavior)
   - Disable server-only features (search, AI titles)
3. If server comes back online:
   - Show "Sync" button to upload localStorage sessions
4. All Phase 1 localStorage code remains functional

**Rationale**:
- Ensures app always works (even if server is down)
- Smooth migration path (users don't lose Phase 1 capability)
- Reduces deployment risk (Phase 2 can be rolled back without breaking users)

**Alternatives Considered**:
- **Server-only**: Would break app if server is down, worse UX, higher risk
- **Dual persistence**: Would cause sync conflicts, complex state management, bug-prone

---

## Risks / Trade-offs

### Risk: localStorage Quota Exceeded (Phase 1)
**Scenario**: User has 50+ sessions with 100+ messages each (>5MB data)

**Mitigations**:
1. Limit stored messages per session (last 200 messages)
2. Monitor localStorage size and warn user at 80% capacity
3. Provide "Export All" before clearing old sessions
4. Phase 2 provides unlimited server storage

**Trade-off**: Limits Phase 1 long-term viability, but acceptable for interim solution

---

### Risk: Data Loss on localStorage Clear
**Scenario**: User clears browser data or reinstalls OS

**Mitigations**:
1. Prominent "Export" button in UI (encourage regular backups)
2. Browser warning: "Clearing localStorage will delete all chat history"
3. Phase 2 provides server-side backup

**Trade-off**: Inherent limitation of localStorage, Phase 2 solves this

---

### Risk: Session Migration Bugs
**Scenario**: Migration from `chatMessages` to new structure fails, data is corrupted

**Mitigations**:
1. Create `chatMessages_backup` before migration
2. Validate new structure after migration (check message count)
3. Provide manual "Restore Backup" button if migration fails
4. Log migration errors to console for debugging

**Trade-off**: Migration complexity, but necessary for backward compatibility

---

### Risk: Title Generation Cost (Phase 2)
**Scenario**: 1000 sessions × $0.01 per title = $10 cost

**Mitigations**:
1. Batch generation: Process 10 sessions per minute (rate-limited)
2. Cache titles aggressively (regenerate only on user request)
3. Make title generation optional in config (`titleGeneration: { enabled: true }`)
4. Use cheaper models for titles (e.g., GPT-3.5 instead of GPT-4)

**Trade-off**: Delays title availability, but reduces cost

---

### Risk: Database Schema Changes (Phase 2)
**Scenario**: Need to change schema after Phase 2 deployment (e.g., add `user_id` column)

**Mitigations**:
1. Use migration system (e.g., `better-sqlite3-helper` migrations)
2. Version schema: Include `schema_version` in database metadata
3. Write forward-compatible queries (handle optional columns gracefully)

**Trade-off**: Migration complexity, but standard practice for database systems

---

### Risk: Concurrent Tab Behavior
**Scenario**: User has Flex Chat open in 2 tabs, makes changes in both

**Phase 1 Mitigation**:
1. Listen for `storage` events (localStorage changes from other tabs)
2. Reload sessions when external change is detected
3. Warn user if active session is modified in another tab

**Phase 2 Mitigation**:
1. Use `updatedAt` timestamps for conflict detection
2. Last-write-wins strategy (simple but lossy)
3. OR: Merge messages by timestamp (more complex but safer)

**Trade-off**: Complexity vs. data integrity

---

## Migration Plan

### Phase 1 Deployment
1. **Pre-Deployment**:
   - Review code changes: `Chat.jsx`, new `SessionManager.jsx`, `ChatHistory.jsx`
   - Test migration with existing `chatMessages` data
   - Test export/import round-trip

2. **Deployment**:
   - Deploy frontend changes (no backend changes required)
   - User visits app, migration runs automatically on first load
   - Display success message: "Your chat history has been upgraded! You can now manage multiple conversations."

3. **Post-Deployment**:
   - Monitor error logs for migration failures
   - Provide support for users with corrupted localStorage
   - Gather feedback on session management UX

**Rollback Plan**:
- If migration has critical bugs:
  1. Revert frontend changes
  2. Users' `chatMessages_backup` is preserved (can manually restore)
  3. Future deployment includes migration fix

---

### Phase 2 Deployment
1. **Pre-Deployment**:
   - Set up database (SQLite file, schema migrations)
   - Test backend API endpoints (CRUD operations)
   - Test title generation with various conversation lengths
   - Test localStorage-to-server sync

2. **Deployment**:
   - Deploy backend changes first (new `/api/sessions` endpoints)
   - Deploy frontend changes (API integration, fallback logic)
   - Provide "Sync to Server" button in UI (opt-in migration)

3. **Post-Deployment**:
   - Monitor API performance (response times, error rates)
   - Monitor title generation costs (API usage)
   - Gradually migrate users from localStorage to server

**Rollback Plan**:
- If Phase 2 has critical bugs:
  1. Disable server persistence (environment flag: `SESSIONS_STORAGE=local`)
  2. Frontend falls back to Phase 1 (localStorage)
  3. Users' data is safe in localStorage (no data loss)

---

## Open Questions

### Q1: Should Phase 2 support multi-user access?
**Context**: Current backend has no authentication. Adding sessions introduces potential for user separation.

**Options**:
1. **Single-user mode**: No auth, all sessions belong to single user (simpler, aligns with current system)
2. **API key per user**: Simple auth, sessions scoped to API key (medium complexity)
3. **Full OAuth**: Proper user accounts (high complexity, out of scope)

**Recommendation**: Start with single-user mode (Option 1). Add API key auth in future if multi-user demand exists.

---

### Q2: Should sessions have message limits?
**Context**: Unlimited messages could cause performance issues (large DB queries, slow UI rendering)

**Options**:
1. **No limit**: Store all messages forever (simple, but potential performance issues)
2. **Soft limit with pagination**: Store all, but load messages in chunks (medium complexity)
3. **Hard limit**: Cap at 500 messages per session (simple, but may frustrate power users)

**Recommendation**: 
- Phase 1: Soft limit (last 200 messages in localStorage)
- Phase 2: No limit in database, but paginate message loading (load last 50, fetch older on scroll)

---

### Q3: Should title generation be configurable per user?
**Context**: Some users may prefer manual titles, others want AI titles

**Options**:
1. **Global config**: Single setting in `config.json` (simple, one-size-fits-all)
2. **Per-user preference**: User can toggle AI titles on/off (medium complexity, better UX)

**Recommendation**: Start with global config (Phase 2). Add per-user preference if requested (future enhancement).

---

### Q4: Should archived sessions be automatically deleted?
**Context**: Archived sessions accumulate over time, taking up storage

**Options**:
1. **Never delete**: User must manually delete (simple, but clutter)
2. **Auto-delete after N days**: E.g., delete after 90 days (medium complexity, reduces clutter)
3. **Prompt user**: "You have 50 archived sessions. Delete old ones?" (medium complexity, user control)

**Recommendation**: Phase 1 never deletes (simple). Phase 2 adds auto-delete with config option (`archivedRetentionDays: 90`).

---

## Summary

This design provides a clear path from localStorage-based sessions (Phase 1) to server-side persistence (Phase 2), with graceful degradation and backward compatibility at each step. Key decisions prioritize simplicity (SQLite, REST API, UUID) while maintaining extensibility for future enhancements (search, multi-user, real-time sync).

**Next Steps**:
1. Review and approve design
2. Implement Phase 1 tasks (see `tasks.md`)
3. User testing and feedback
4. Plan Phase 2 implementation (if demand exists)

