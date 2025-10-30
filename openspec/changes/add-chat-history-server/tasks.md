# Chat History Server Storage - Implementation Tasks

## 1. Planning & Schema
- [ ] 1.1 Finalise database choice (SQLite default with pluggable adapters)
- [ ] 1.2 Design sessions/messages schema with migrations and indexes
- [ ] 1.3 Document API contract (`/api/sessions`) and query parameters

## 2. Backend Infrastructure
- [ ] 2.1 Implement session store abstraction (create/read/update/delete, pagination)
- [ ] 2.2 Add migration tooling (initial schema + future upgrades)
- [ ] 2.3 Implement REST routes:
  - [ ] 2.3.1 `GET /api/sessions`
  - [ ] 2.3.2 `GET /api/sessions/:id`
  - [ ] 2.3.3 `POST /api/sessions`
  - [ ] 2.3.4 `PUT /api/sessions/:id`
  - [ ] 2.3.5 `DELETE /api/sessions/:id`
  - [ ] 2.3.6 `POST /api/sessions/:id/archive`
- [ ] 2.4 Integrate chat route to append messages with session_id
- [ ] 2.5 Implement search/filter parameters (query string, date range, archived flag)

## 3. Frontend Integration
- [ ] 3.1 Create session API client with error handling and retries
- [ ] 3.2 Update session manager to fetch from API, cache locally, and fallback offline
- [ ] 3.3 Add optimistic updates for create/delete/archive actions
- [ ] 3.4 Build sync wizard to upload existing local sessions (with conflict resolution)
- [ ] 3.5 Enhance ChatHistory UI with server data (loading states, pagination, search)

## 4. AI Title Generation (Optional v2 Feature)
- [ ] 4.1 Implement title generation service using provider registry
- [ ] 4.2 Add background job/queue for batch processing
- [ ] 4.3 Expose manual regenerate endpoint + UI button

## 5. Quality & Docs
- [ ] 5.1 Add backend unit/integration tests for session API
- [ ] 5.2 Add frontend tests covering API integration and offline fallback
- [ ] 5.3 Update documentation (`docs/CHAT_HISTORY.md`, `README.md`, changelog)
- [ ] 5.4 Provide deployment guidance for database migrations
