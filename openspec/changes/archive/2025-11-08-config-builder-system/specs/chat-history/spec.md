# chat-history Specification Deltas

## MODIFIED Requirements

### Requirement: Session Management (Phase 1)
The system SHALL provide client-side session management using localStorage, allowing users to create, switch between, archive, delete multiple chat conversations, and manage individual messages within active sessions.

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

#### Scenario: Delete Last Message
- **WHEN** a user hovers over the last message in an active session
- **THEN** a delete button (🗑️) appears in the top-right corner of the message
- **AND WHEN** the user clicks the delete button and confirms the action
- **THEN** the system removes the last message from the session, updates the session's topic to match the new last message's topic, and persists the change to localStorage

#### Scenario: Resend Last User Message
- **WHEN** a user hovers over the last message and it is a user message (not loading)
- **THEN** a resend button (↻) appears alongside the delete button
- **AND WHEN** the user clicks the resend button
- **THEN** the system removes the message from history, updates the topic state, and populates the input field with the message text for editing before resending

#### Scenario: Topic State Synchronization
- **WHEN** the last message is deleted via the delete button
- **THEN** the system updates the active session's topic to match the topic of the new last message (or clears it if no messages remain)
- **AND** subsequent queries use the correct historical topic for context

#### Scenario: Session Persistence
- **WHEN** a user sends or receives messages in a session
- **THEN** the system automatically saves the session data to localStorage and updates the session's `updatedAt` timestamp

#### Scenario: Session List Display
- **WHEN** the session list is rendered
- **THEN** it displays sessions sorted by most recently updated first, showing title, message count, and last updated date

