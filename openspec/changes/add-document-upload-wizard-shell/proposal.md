# Add Document Upload Wizard Shell

## Why

The Document Upload Wizard needs a foundational shell component to provide multi-step navigation, state management, and modal UI wrapper. Without this shell, the individual step components (File Upload, Field Mapping, Preview) have no framework to integrate with.

This wizard enables users to upload raw JSON documents with guided field mapping, eliminating the need for manual data transformation with external tools.

## What Changes

- Add `DocumentUploadWizard.jsx` modal component following established HandlerModal pattern
- Implement multi-step navigation with linear progression (Step 1 → 2 → 3)
- Create wizard-level state management for documents, schema, and progress
- Add step validation to prevent advancing without required data
- Implement Next/Back/Cancel navigation controls
- Provide framework for step components to plug into (Tasks 6-8)

## Impact

**Affected Specs:**
- **NEW**: `document-upload-ui` (capability being added for frontend)
- **RELATED**: `document-upload` (backend API implemented in previous task)

**Affected Code:**
- `frontend/src/DocumentUploadWizard.jsx` (new)
- `frontend/src/Collections.jsx` or integration point (modified to trigger wizard)

**Breaking Changes:** None (new functionality)

**Dependencies:**
- Existing modal pattern: `frontend/src/components/HandlerModal.jsx`
- Backend APIs: document-transformer and enhanced upload endpoint (already implemented)
- Tailwind CSS (already configured)
- React hooks (useState pattern established)

## Architecture Decisions

**Modal Pattern vs Page:**
- **Decision**: Use modal following HandlerModal pattern
- **Rationale**: Keeps user in context, matches existing UX patterns, non-disruptive workflow
- **Trade-off**: Slightly constrained screen space, but wizard width (`max-w-4xl`) accommodates field mapping UI

**Linear Steps vs Tabs:**
- **Decision**: Linear step progression (1→2→3) with validation
- **Rationale**: Wizard requires sequential data (can't map fields without uploaded file)
- **Trade-off**: Can't jump ahead, but prevents errors and confusion

**Single State Object vs Multiple States:**
- **Decision**: Single `wizardState` object containing all wizard data
- **Rationale**: Easier to pass to step components, clearer data flow, simpler debugging
- **Trade-off**: Larger state updates, but still performant for wizard use case

**Close Confirmation:**
- **Decision**: Confirm before closing if data entered
- **Rationale**: Prevents accidental data loss
- **Trade-off**: Extra click, but better UX safety

