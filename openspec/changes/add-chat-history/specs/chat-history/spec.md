## ADDED Requirements

### Requirement: Session Management (Phase 1)
The system SHALL provide client-side session management using localStorage, allowing users to create, switch between, archive, and delete multiple chat conversations.

#### Scenario: Create New Session
- **WHEN** a user clicks "New Chat" button
- **THEN** the system creates a new session with a unique ID, sets it as active, and displays an empty message area

#### Scenario: Switch Between Sessions
- **WHEN** a user clicks on a session in the session list
- **THEN** the system loads that session's messages, updates the active session indicator, and displays the conversation

#### Scenario: Archive Session
- **WHEN** a user archives a session
- **THEN** the system marks the session as archived, moves it to the "Archived" section, and keeps messages intact for later restoration

#### Scenario: Delete Session
- **WHEN** a user deletes a session after confirming the action
- **THEN** the system permanently removes the session and its messages from localStorage and updates the UI

#### Scenario: Session Persistence
- **WHEN** a user sends or receives messages in a session
- **THEN** the system automatically saves the session data to localStorage and updates the session's `updatedAt` timestamp

#### Scenario: Session List Display
- **WHEN** the session list is rendered
- **THEN** it displays sessions sorted by most recently updated first, showing title, message count, and last updated date

### Requirement: Session Data Structure
The system SHALL store sessions in localStorage using a versioned JSON structure that supports metadata, messages, and extensibility.

#### Scenario: Session Storage Schema
- **WHEN** sessions are stored in localStorage
- **THEN** they follow the structure: `{ version, activeSessionId, sessions: [{ id, title, topic, createdAt, updatedAt, archived, messages[], metadata }] }`

#### Scenario: Message Format
- **WHEN** messages are stored in a session
- **THEN** each message includes: `{ type, text, topic, service, model, timestamp }` where type is "user" or "bot"

#### Scenario: Session Metadata
- **WHEN** session metadata is updated
- **THEN** it includes: `{ messageCount, lastService, lastModel }` for efficient UI rendering without parsing all messages

### Requirement: Migration from Legacy Storage
The system SHALL automatically migrate existing single-session chat history to the new multi-session structure on first load.

#### Scenario: Detect Legacy Data
- **WHEN** the app loads and detects old `chatMessages` localStorage key without a `version` field
- **THEN** it triggers the migration process

#### Scenario: Migration Execution
- **WHEN** migration runs
- **THEN** it creates a backup (`chatMessages_backup`), converts the old structure to a default session, sets `version: "2.0"`, and deletes the old key

#### Scenario: Migration Failure Recovery
- **WHEN** migration fails
- **THEN** the system preserves the `chatMessages_backup`, logs the error, and leaves the backup available for manual recovery

### Requirement: Session Export and Import
The system SHALL allow users to export sessions as JSON files and import previously exported sessions.

#### Scenario: Export Single Session
- **WHEN** a user exports a session
- **THEN** the system generates a JSON file with structure `{ exportVersion, exportedAt, session: {...} }` and triggers a download with filename `flex-chat-session-{topic}-{date}.json`

#### Scenario: Import Session
- **WHEN** a user uploads a session JSON file
- **THEN** the system validates the structure, checks for session ID conflicts, and adds the session to localStorage

#### Scenario: Import Conflict Resolution
- **WHEN** an imported session has an ID that already exists
- **THEN** the system prompts the user to either replace the existing session or generate a new ID for the imported session

### Requirement: Chat History UI
The system SHALL display a session list in the right sidebar, replacing the "Coming soon..." placeholder.

#### Scenario: Session List Rendering
- **WHEN** the right sidebar is expanded
- **THEN** it displays all active sessions sorted by most recent, with each item showing title, message count, and last updated date

#### Scenario: Active Session Indicator
- **WHEN** a session is active
- **THEN** it is highlighted in the session list with a distinct background color and visual indicator

#### Scenario: Session Actions Menu
- **WHEN** a user interacts with a session in the list
- **THEN** they can access actions: rename, archive, export, and delete via a context menu or action buttons

#### Scenario: Archived Sessions Section
- **WHEN** archived sessions exist
- **THEN** they are displayed in a collapsible "Archived" section below active sessions

#### Scenario: Empty State
- **WHEN** no sessions exist
- **THEN** the session list displays an empty state with a "Start your first conversation" message and "New Chat" button

### Requirement: localStorage Quota Management
The system SHALL monitor localStorage usage and warn users when approaching capacity limits.

#### Scenario: Storage Monitoring
- **WHEN** sessions are saved to localStorage
- **THEN** the system calculates total storage used and compares it to browser limits

#### Scenario: Storage Warning
- **WHEN** localStorage usage exceeds 80% of estimated capacity
- **THEN** the system displays a warning: "Chat history is nearly full. Consider exporting and archiving old sessions."

### Requirement: Session Interaction Optimization
The system SHALL optimize session loading and saving to minimize localStorage read/write operations.

#### Scenario: Lazy Message Loading
- **WHEN** a session is switched
- **THEN** the system loads only that session's messages (not all sessions) to minimize memory usage

#### Scenario: Concurrent Tab Synchronization
- **WHEN** localStorage is modified by another tab
- **THEN** the current tab listens for `storage` events and reloads sessions to stay synchronized

### Requirement: Server-Side Session Management (Phase 2)
The system SHALL provide backend API endpoints for creating, retrieving, updating, and deleting chat sessions with server-side persistence. *(Deferred to a future change proposal.)*

#### Scenario: Create Session via API
- **WHEN** a POST request is made to `/api/sessions` with `{ title, topic }`
- **THEN** the server creates a new session in the database, returns the session object with a unique ID and timestamps

#### Scenario: List Sessions via API
- **WHEN** a GET request is made to `/api/sessions` with optional query params `?page=1&limit=20&archived=false`
- **THEN** the server returns a paginated list of sessions sorted by `updated_at` descending

#### Scenario: Retrieve Session with Messages
- **WHEN** a GET request is made to `/api/sessions/:id`
- **THEN** the server returns the session object including all messages

#### Scenario: Update Session
- **WHEN** a PUT request is made to `/api/sessions/:id` with `{ title, messages }`
- **THEN** the server updates the session, appends new messages if provided, and returns the updated session

#### Scenario: Delete Session via API
- **WHEN** a DELETE request is made to `/api/sessions/:id`
- **THEN** the server permanently deletes the session and all associated messages from the database

#### Scenario: Archive Session via API
- **WHEN** a POST request is made to `/api/sessions/:id/archive`
- **THEN** the server sets the session's `archived` flag to true and returns the updated session

### Requirement: Database Persistence (Phase 2)
The system SHALL persist sessions and messages in a SQLite database with proper schema, indexes, and referential integrity.

#### Scenario: Session Table Schema
- **WHEN** the database is initialized
- **THEN** it creates a `sessions` table with columns: `id, title, topic, created_at, updated_at, archived, metadata`

#### Scenario: Messages Table Schema
- **WHEN** the database is initialized
- **THEN** it creates a `messages` table with columns: `id, session_id, type, text, topic, service, model, timestamp` and a foreign key to `sessions(id)`

#### Scenario: Message Cascade Delete
- **WHEN** a session is deleted
- **THEN** all associated messages are automatically deleted via `ON DELETE CASCADE`

#### Scenario: Query Performance
- **WHEN** sessions are queried by `updated_at` or `created_at`
- **THEN** the database uses indexes (`idx_session_created`, `idx_session_updated`) for efficient sorting

### Requirement: AI-Powered Title Generation (Phase 2)
The system SHALL generate human-readable session titles automatically using AI summarization.

#### Scenario: Title Generation Trigger
- **WHEN** a session reaches 10 messages AND no title has been generated yet
- **THEN** the system queues a title generation task

#### Scenario: Title Generation Execution
- **WHEN** the title generation task runs
- **THEN** it sends the conversation to an AI provider with the prompt "Summarize this conversation in 5-7 words" and updates the session title with the result

#### Scenario: Title Generation Fallback
- **WHEN** AI title generation fails (API error, timeout, etc.)
- **THEN** the system falls back to using the first user message (truncated to 50 characters) as the title

#### Scenario: Title Regeneration
- **WHEN** a user requests title regeneration via POST `/api/sessions/:id/regenerate-title`
- **THEN** the system re-runs title generation and updates the session with the new title

#### Scenario: Title Caching
- **WHEN** a title is generated
- **THEN** it is cached in the session record and not regenerated unless explicitly requested

### Requirement: Frontend API Integration (Phase 2)
The system SHALL integrate frontend session management with backend API endpoints, with graceful fallback to localStorage.

#### Scenario: API-First Session Loading
- **WHEN** the app loads
- **THEN** it attempts to fetch sessions from `/api/sessions`, and falls back to localStorage if the request fails

#### Scenario: Optimistic UI Updates
- **WHEN** a user creates or updates a session
- **THEN** the UI updates immediately (optimistic) while the API request is in flight, and rolls back on error

#### Scenario: Server Unavailable Fallback
- **WHEN** the server is unavailable (network error, 500 status)
- **THEN** the frontend displays a warning "Server unavailable, using local storage" and operates in Phase 1 mode

#### Scenario: Session Sync from localStorage to Server
- **WHEN** a user clicks "Sync to Server" button
- **THEN** the frontend uploads all localStorage sessions to the server via POST `/api/sessions` and confirms successful sync

### Requirement: Session Search and Filter (Phase 2)
The system SHALL allow users to search and filter sessions by title, content, topic, and date range.

#### Scenario: Search by Title or Content
- **WHEN** a user enters a query in the session search bar
- **THEN** the system filters sessions where the title or any message text contains the query (case-insensitive)

#### Scenario: Filter by Date Range
- **WHEN** a user selects a date filter (e.g., "Last 7 days")
- **THEN** the system displays only sessions with `updated_at` within the selected range

#### Scenario: Filter by Archived Status
- **WHEN** a user toggles "Show Archived"
- **THEN** the system includes or excludes archived sessions from the list

#### Scenario: Combined Filters
- **WHEN** multiple filters are applied (search + date + archived)
- **THEN** the system applies all filters cumulatively (AND logic)

### Requirement: Cross-Device Session Access (Phase 2)
The system SHALL allow users to access their sessions from multiple devices with automatic synchronization.

#### Scenario: Session Polling
- **WHEN** the frontend is active
- **THEN** it polls `/api/sessions` every 60 seconds to fetch updated sessions and displays new or modified sessions

#### Scenario: Manual Sync
- **WHEN** a user clicks "Refresh" button
- **THEN** the frontend immediately fetches sessions from the server and updates the UI

#### Scenario: Conflict Resolution
- **WHEN** a session is modified on multiple devices concurrently
- **THEN** the server uses last-write-wins strategy (session with most recent `updated_at` is preserved)

### Requirement: Session Statistics and Metadata
The system SHALL display session statistics and metadata to help users understand conversation history.

#### Scenario: Message Count Display
- **WHEN** a session is displayed in the list
- **THEN** it shows the total number of messages in the session

#### Scenario: Last Updated Timestamp
- **WHEN** a session is displayed
- **THEN** it shows a human-readable relative timestamp (e.g., "2 hours ago", "Yesterday")

#### Scenario: Session Duration
- **WHEN** session metadata is calculated
- **THEN** it includes duration as `createdAt` to `updatedAt` difference (displayed as "Active for 2 days")

#### Scenario: AI Model Usage Tracking
- **WHEN** messages are added to a session
- **THEN** the system tracks which AI services and models were used and displays this in session metadata

