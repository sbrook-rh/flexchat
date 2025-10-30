# Toast Notification System Proposal

## Why

Flex Chat currently relies on ad-hoc UI patterns for communicating status to the user (`window.alert`, inline error banners in `Chat.jsx`, etc.). This leads to inconsistent messaging, duplicate logic, and unclear feedback during key flows such as imports, rate-limit errors, and session management actions. A unified toast notification system will provide consistent, non-blocking feedback across the application.

## What Changes

- Add a global toast/notification infrastructure that can display success, warning, and error messages with auto-dismiss timing.
- Provide a reusable API for feature modules (chat history, configuration builder, etc.) to enqueue notifications.
- Replace existing `window.alert` and inline chat error banner usage in Phase 1 features with toast notifications.

## Impact

- Affected specs: `ui-notifications` (new capability)
- Affected code:
  - Frontend shared components/context for toast management
  - `Chat.jsx` and chat history sidebar to emit toasts instead of alerts/banners
  - Future reuse by configuration builder and other UI modules

## Risks / Open Questions

- Accessibility: ensure toast timings and focus management satisfy WCAG guidance.
- Extensibility: provide API that can support future toast variants (actions, stacking) without breaking clients.
- Styling consistency: align with existing design system (Tailwind + app color palette).
