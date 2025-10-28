# Configuration Builder Navigation - Implementation Tasks

## Prerequisites
- [x] 0.1 Confirm `config-builder-system` Phase 2 is merged and deployed
- [x] 0.2 Review current ConfigBuilder.jsx structure

## 1. Component Creation

### 1.1 NavigationSidebar Component
- [x] 1.1.1 Create `frontend/src/NavigationSidebar.jsx`
- [x] 1.1.2 Define tab items data structure (id, label, icon, badge, enabled)
- [x] 1.1.3 Implement tab rendering with icons and labels
- [x] 1.1.4 Add active tab highlighting
- [x] 1.1.5 Add disabled tab styling with tooltips
- [x] 1.1.6 Add badge indicators for counts (LLMs, RAG services, handlers)
- [x] 1.1.7 Wire up onClick handlers for tab switching

### 1.2 ConfigSection Wrapper Component
- [x] 1.2.1 Create `frontend/src/ConfigSection.jsx` base component
- [x] 1.2.2 Add section title, description, and content area
- [x] 1.2.3 Add consistent padding and styling
- [x] 1.2.4 Support optional header actions (e.g., "Add Provider" button)

### 1.3 Section Components (Placeholders for Phase 3+)
- [x] 1.3.1 Create `frontend/src/sections/LLMProvidersSection.jsx` and `RAGServicesSection.jsx` (split from ProvidersSection)
- [x] 1.3.2 Create `frontend/src/sections/EmbeddingsSection.jsx` (placeholder, shows "Coming in Phase 3")
- [x] 1.3.3 Create `frontend/src/sections/IntentSection.jsx` (placeholder)
- [x] 1.3.4 Create `frontend/src/sections/HandlersSection.jsx` (placeholder)
- [x] 1.3.5 Create `frontend/src/sections/ReasoningSection.jsx` (placeholder)

## 2. ConfigBuilder Refactor

### 2.1 Layout Restructure
- [x] 2.1.1 Add two-column layout (sidebar + content area)
- [x] 2.1.2 Add `activeTab` state variable (default: 'llm-providers')
- [x] 2.1.3 Render NavigationSidebar in left column
- [x] 2.1.4 Render active section component in right column
- [x] 2.1.5 Preserve existing action bar (Validate, Apply, Export, Cancel)

### 2.2 Tab State Management
- [x] 2.2.1 Implement `handleTabChange(tabId)` function
- [x] 2.2.2 Calculate tab enabled states based on workingConfig
  - [x] Embeddings enabled only if `workingConfig.rag_services` has entries
  - [x] Intent enabled only if `workingConfig.llms` has entries
  - [x] Handlers always enabled
  - [x] Reasoning enabled only if `workingConfig.responses` has entries
- [x] 2.2.3 Calculate badge counts (LLM count, RAG count, handler count)
- [x] 2.2.4 Pass tab state and handlers to NavigationSidebar

### 2.3 Section Routing
- [x] 2.3.1 Create switch/case for activeTab to render correct section
- [x] 2.3.2 Pass necessary props to each section (workingConfig, handlers, etc.)
- [x] 2.3.3 Ensure ProviderList receives same props as before (no breaking changes)

## 3. Styling

### 3.1 Layout Styles
- [x] 3.1.1 Add two-column flexbox layout styles to ConfigBuilder
- [x] 3.1.2 Set sidebar width (220px fixed)
- [x] 3.1.3 Set content area to fill remaining space
- [x] 3.1.4 Add visual separator between sidebar and content

### 3.2 NavigationSidebar Styles
- [x] 3.2.1 Style tab items (padding, hover states, cursor)
- [x] 3.2.2 Style active tab (background, border, bold text)
- [x] 3.2.3 Style disabled tabs (muted colors, no-drop cursor)
- [x] 3.2.4 Style badge indicators (small circle with count)
- [x] 3.2.5 Add icons (emoji)

### 3.3 Section Styles
- [x] 3.3.1 Add consistent padding to all sections via ConfigSection wrapper
- [x] 3.3.2 Style section headers (title, description)
- [x] 3.3.3 Ensure ProviderList looks the same in new layout

## 4. Conditional Logic

### 4.1 Tab Enabling Rules
- [x] 4.1.1 Implement conditional enabling in `getTabStates()` helper
  - Returns true if `workingConfig.rag_services` has at least one entry
- [x] 4.1.2 Implement `isIntentEnabled()` helper
  - Returns true if at least one LLM provider configured
- [x] 4.1.3 Add tooltips for disabled tabs explaining prerequisites

### 4.2 Badge Calculation
- [x] 4.2.1 Calculate LLM count in `getTabStates()`
- [x] 4.2.2 Calculate RAG count in `getTabStates()`
- [x] 4.2.3 Calculate handler count in `getTabStates()`

## 5. Testing & Validation

### 5.1 Functionality Testing
- [x] 5.1.1 Test tab switching works (all tabs)
- [x] 5.1.2 Test active tab is highlighted correctly
- [x] 5.1.3 Test Embeddings tab enabled/disabled based on RAG services
- [x] 5.1.4 Test Intent tab enabled/disabled based on LLM providers
- [x] 5.1.5 Test disabled tabs show tooltips on hover
- [x] 5.1.6 Test badge counts update when providers added/removed
- [x] 5.1.7 Test existing provider add/edit/delete still works
- [x] 5.1.8 Test Validate/Apply/Export buttons still work
- [x] 5.1.9 Test unsaved changes preserved when switching tabs

### 5.2 Visual Testing
- [x] 5.2.1 Verify layout looks good (tested by user)
- [x] 5.2.2 Verify tab icons are visible and appropriate
- [x] 5.2.3 Verify badge counts are readable
- [x] 5.2.4 Verify disabled tabs are clearly distinct from enabled tabs

## 6. Documentation

### 6.1 Code Documentation
- [x] 6.1.1 Add JSDoc comments to NavigationSidebar component
- [x] 6.1.2 Add comments to tab state management functions
- [x] 6.1.3 Document tab enabling rules in ConfigBuilder

### 6.2 User-Facing Updates
- [x] 6.2.1 Create design.md with navigation architecture decisions
- [x] 6.2.2 Add ASCII mockup to design.md
- [x] 6.2.3 CHANGELOG update moved to config-builder-system/tasks.md (5.8.5)

## Summary

**Estimated Time**: 1-2 days
**Dependencies**: config-builder-system Phase 2 complete
**Blocks**: config-builder-system Phase 3 (Intent & Embeddings UI)
**Risk**: Low - Pure UI refactor with no API changes

