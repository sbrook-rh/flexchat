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

