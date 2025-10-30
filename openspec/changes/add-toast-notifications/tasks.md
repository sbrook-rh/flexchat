# Toast Notification System - Implementation Tasks

## 1. Foundation
- [ ] 1.1 Audit existing user feedback patterns (`Chat.jsx`, session import/export, config builder) and catalogue required toast types
- [ ] 1.2 Define Toast data model (id, message, type, duration, optional action)
- [ ] 1.3 Choose storage mechanism (React context + reducer) and placement in component tree

## 2. Toast Infrastructure
- [ ] 2.1 Implement `ToastProvider` with queue management (stacking, auto-dismiss)
- [ ] 2.2 Create toast container component with enter/exit animations and focus management
- [ ] 2.3 Implement imperative hook/helper (`useToasts`) for enqueue/dismiss
- [ ] 2.4 Add accessibility support (ARIA live region, pause on hover)

## 3. Visual Design
- [ ] 3.1 Define Tailwind utility classes for success/warning/error/info toasts
- [ ] 3.2 Add icons and layout consistent with existing design system
- [ ] 3.3 Support light/dark backgrounds

## 4. Integration - Chat & Chat History
- [ ] 4.1 Replace `window.alert` usage in chat history import/export flows with toasts
- [ ] 4.2 Replace chat rate-limit/network error banner with toast notifications (retain inline fallback for persistent errors)
- [ ] 4.3 Add success toasts for archive/delete/restore session actions
- [ ] 4.4 Ensure toast queue persists across route transitions (chat ↔ config builder)

## 5. Migration & Documentation
- [ ] 5.1 Update coding guidelines to reference new toast API
- [ ] 5.2 Document usage examples in developer docs (`docs/UI_NOTIFICATIONS.md`)
- [ ] 5.3 Add automated tests (unit + React Testing Library) for provider and container behaviour
- [ ] 5.4 Update OpenSpec checklist once all consumer modules migrated
