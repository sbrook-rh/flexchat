*** Begin Patch
*** Add File: /Users/sbrook/Projects/flex-chat/openspec/changes/add-chat-history-server/specs/chat-history/spec.md
## ADDED Requirements

### Requirement: Server-Side Session Management
The system SHALL provide backend API endpoints for creating, retrieving, updating, and deleting chat sessions with server-side persistence.

#### Scenario: Create Session via API
- **WHEN** a POST request is made to `/api/sessions` with `{ title, topic }`
- **THEN** the server creates a new session in the database and returns the session with generated ID and timestamps

#### Scenario: List Sessions via API
- **WHEN** a GET request is made to `/api/sessions` with optional `?page`, `?limit`, and `?archived` parameters
- **THEN** the server returns a paginated list of sessions sorted by `updated_at` descending

#### Scenario: Retrieve Session with Messages
- **WHEN** a GET request is made to `/api/sessions/:id`
- **THEN** the server returns the session along with all associated messages ordered by timestamp

#### Scenario: Update Session
- **WHEN** a PUT request is made to `/api/sessions/:id` with updates to title or appended messages
- **THEN** the session is updated and the new message(s) are persisted atomically

#### Scenario: Delete Session via API
- **WHEN** a DELETE request is made to `/api/sessions/:id`
- **THEN** the server permanently deletes the session and its messages

#### Scenario: Archive Session via API
- **WHEN** a POST request is made to `/api/sessions/:id/archive`
- **THEN** the session's `archived` flag is toggled and the updated session is returned

### Requirement: Database Persistence
The system SHALL persist sessions and messages in a relational database with referential integrity and query performance considerations.

#### Scenario: Session Table Schema
- **WHEN** migrations are applied
- **THEN** a `sessions` table is created with columns: `id`, `title`, `topic`, `created_at`, `updated_at`, `archived`, `metadata`

#### Scenario: Messages Table Schema
- **WHEN** migrations are applied
- **THEN** a `messages` table is created with columns: `id`, `session_id`, `type`, `text`, `topic`, `service`, `model`, `timestamp` and foreign key constraint to `sessions(id)` with `ON DELETE CASCADE`

#### Scenario: Indexed Queries
- **WHEN** sessions are queried by `updated_at`, `created_at`, or `session_id`
- **THEN** appropriate indexes exist to keep query latency under 100ms for 10k sessions

### Requirement: Frontend API Integration
The system SHALL integrate the chat history UI with the server API while providing graceful offline fallback to localStorage.

#### Scenario: API-First Session Loading
- **WHEN** the chat screen mounts
- **THEN** it requests sessions from `/api/sessions` and falls back to localStorage only if the API request fails

#### Scenario: Offline Fallback
- **WHEN** the server returns an error or is unreachable
- **THEN** the UI displays a warning toast and continues operating using localStorage sessions

#### Scenario: Sync Local Sessions
- **WHEN** a user runs the sync flow
- **THEN** local sessions are uploaded via the API with conflict resolution (rename duplicate IDs)

#### Scenario: Optimistic Updates
- **WHEN** a session is created, archived, or deleted via the UI
- **THEN** the UI updates immediately and rolls back if the API request fails

### Requirement: Search and Filter
The system SHALL support searching and filtering server-side sessions by title, topic, and date.

#### Scenario: Text Search
- **WHEN** a user provides a `query` parameter
- **THEN** the API returns sessions whose title or message contents match the query (case-insensitive)

#### Scenario: Date Range Filter
- **WHEN** `from` and/or `to` parameters are provided
- **THEN** the API restricts results to sessions updated within the range

### Requirement: Cross-Device Access
The system SHALL keep sessions consistent across devices by handling concurrent edits.

#### Scenario: Polling for Updates
- **WHEN** the chat UI is open
- **THEN** it periodically polls `/api/sessions?updated_after=<timestamp>` to fetch new changes

#### Scenario: Conflict Resolution
- **WHEN** two devices update the same session concurrently
- **THEN** the server applies last-write-wins based on `updated_at` and returns the resolved session to both clients

### Requirement: AI-Generated Titles (Optional)
The system SHALL support AI-generated session titles when the feature is enabled in configuration.

#### Scenario: Automatic Title Generation
- **WHEN** a session exceeds 10 messages and has no custom title
- **THEN** the server queues a title generation job and updates the session once complete

#### Scenario: Manual Regeneration
- **WHEN** a user requests title regeneration via `POST /api/sessions/:id/regenerate-title`
- **THEN** the server reprocesses the session and updates the title if generation succeeds
*** End Patch
