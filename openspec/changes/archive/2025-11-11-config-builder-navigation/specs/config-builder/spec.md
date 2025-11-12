# config-builder Specification Deltas

## ADDED Requirements

### Requirement: Configuration Builder UI Layout
The Configuration Builder UI SHALL provide structured navigation for multiple configuration sections, allowing users to focus on one aspect of configuration at a time while maintaining awareness of overall system state.

#### Scenario: Vertical Tab Navigation
- **WHEN** the Configuration Builder is displayed
- **THEN** a vertical tab sidebar is rendered on the left side
- **AND** the sidebar contains tabs for: Providers, Embeddings, Intent, Handlers, Reasoning
- **AND** each tab displays an icon, label, and optional badge count
- **AND** clicking a tab switches the content area to that section
- **AND** the active tab is visually highlighted

#### Scenario: Tab Badge Indicators
- **WHEN** configuration items are added or removed
- **THEN** tab badges update to reflect current counts
- **AND** the Providers tab shows combined LLM + RAG count
- **AND** the Handlers tab shows response handler count
- **AND** empty sections show no badge

#### Scenario: Content Area Rendering
- **WHEN** a tab is active
- **THEN** the corresponding section component is rendered in the content area
- **AND** the section displays its title and description
- **AND** the section provides relevant configuration controls
- **AND** other tabs' content is unmounted (not just hidden)

#### Scenario: Action Bar Placement
- **WHEN** any tab is active
- **THEN** the action bar (Validate, Apply, Export, Cancel) remains visible at the bottom
- **AND** actions apply to the entire configuration, not individual sections
- **AND** validation status is displayed above the action bar

### Requirement: Conditional Tab Enabling
Configuration sections with dependencies SHALL be conditionally enabled based on prerequisite configuration, preventing user confusion and invalid configurations.

#### Scenario: Embeddings Tab Enabling
- **WHEN** no RAG services are configured
- **THEN** the Embeddings tab is disabled
- **AND** hovering over the disabled tab shows a tooltip: "Configure RAG Services first"
- **AND** clicking the disabled tab has no effect
- **WHEN** at least one RAG service is configured
- **THEN** the Embeddings tab becomes enabled
- **AND** clicking the tab switches to the Embeddings section

#### Scenario: Intent Tab Enabling
- **WHEN** no LLM providers are configured
- **THEN** the Intent tab is disabled
- **AND** hovering over the disabled tab shows a tooltip: "Configure at least one LLM Provider first"
- **WHEN** at least one LLM provider is configured
- **THEN** the Intent tab becomes enabled

#### Scenario: Handlers Tab Always Enabled
- **WHEN** the Configuration Builder is displayed
- **THEN** the Handlers tab is always enabled
- **AND** the Handlers section allows defining response handlers even if no LLMs exist yet
- **AND** validation will fail if handlers reference non-existent LLMs

#### Scenario: Reasoning Tab Enabling
- **WHEN** no response handlers are configured
- **THEN** the Reasoning tab is disabled
- **AND** hovering over the disabled tab shows a tooltip: "Configure at least one Response Handler first"
- **WHEN** at least one response handler is configured
- **THEN** the Reasoning tab becomes enabled

---

### Requirement: Tab State Management
The Configuration Builder SHALL maintain tab state within the component, preserving user context and unsaved changes when navigating between sections.

#### Scenario: Tab Switching Preserves State
- **GIVEN** user has made changes in the Providers section (unsaved)
- **WHEN** user switches to the Handlers tab
- **THEN** the Providers section unmounts
- **AND** the `workingConfig` state preserves unsaved provider changes
- **WHEN** user switches back to the Providers tab
- **THEN** the unsaved changes are still present
- **AND** the user can continue editing

#### Scenario: Tab State Does Not Persist Across Sessions
- **GIVEN** user is viewing the Intent tab
- **WHEN** user closes and reopens the Configuration Builder
- **THEN** the default tab (Providers) is active
- **AND** no tab state is restored from previous session

**Note:** Future enhancement (Phase 5) may add localStorage persistence.

---

### Requirement: Placeholder Sections for Future Phases
Tabs for unimplemented configuration sections SHALL be present but display placeholder content, providing visibility into planned features.

#### Scenario: Placeholder Section Display
- **WHEN** a placeholder tab (Intent, Embeddings, or Reasoning) is clicked
- **THEN** the content area displays the section title
- **AND** shows a message: "Coming in Phase X"
- **AND** optionally shows a mockup or description of planned functionality
- **AND** the section does not allow configuration yet

#### Scenario: Providers Section Fully Functional
- **WHEN** the Providers tab is active
- **THEN** the existing ProviderList component is rendered
- **AND** all Phase 2 functionality (add/edit/delete LLM and RAG) works unchanged
- **AND** the LLMWizard and RAGWizard continue to function as before

---

### Requirement: Visual Hierarchy and Affordances
The Configuration Builder navigation SHALL provide clear visual cues for tab state, section focus, and user actions.

#### Scenario: Active Tab Styling
- **WHEN** a tab is active
- **THEN** it has a distinct background color
- **AND** the tab label is bold or highlighted
- **AND** a visual indicator (border, accent) clearly marks the active tab
- **AND** inactive tabs have normal weight text and muted colors

#### Scenario: Disabled Tab Styling
- **WHEN** a tab is disabled
- **THEN** it has reduced opacity (50-60%)
- **AND** the cursor changes to "not-allowed" on hover
- **AND** the tab label is gray
- **AND** the badge (if present) is also muted

#### Scenario: Tab Hover States
- **WHEN** user hovers over an enabled, inactive tab
- **THEN** the tab background lightens or highlights
- **AND** the cursor changes to "pointer"
- **WHEN** user hovers over a disabled tab
- **THEN** a tooltip appears explaining the prerequisite
- **AND** the cursor changes to "not-allowed"

#### Scenario: Badge Visual Treatment
- **WHEN** a tab has a count badge
- **THEN** the badge is a small circle or rounded rectangle
- **AND** the badge displays the count as white text on a gray background
- **AND** the badge is positioned to the right of the tab label
- **AND** empty sections (count = 0) show no badge

---

## REMOVED Requirements

None. This is a pure addition to existing config-builder functionality.

---

## Cross-References

### Related Capabilities
- **config-builder** (this spec) - Navigation and layout structure
- **config-loader** - Backend configuration loading (unchanged by this refactor)
- **ai-providers** - LLM provider management (consumed by Providers section)
- **rag-providers** - RAG service management (consumed by Providers section)

### Dependencies
- **config-builder-system Phase 2** - Must be complete before navigation refactor
- **React state management** - Uses simple `useState` for tab state
- **Existing ProviderList component** - Wrapped by ProvidersSection, not modified

### Impacts
- **Phase 3 (Intent & Embeddings)** - Can now be implemented as separate section components
- **Phase 4 (Response Handlers)** - Will use HandlersSection placeholder as foundation
- **Phase 5 (Reasoning)** - Will use ReasoningSection placeholder as foundation

---

## Testing Scenarios

### Test: Tab Navigation Flow
1. Open Configuration Builder (default: Providers tab active)
2. Click Embeddings tab → verify disabled (no RAG services)
3. Add a RAG service in Providers section
4. Verify Embeddings tab becomes enabled
5. Click Embeddings tab → verify placeholder content displayed
6. Click Providers tab → verify RAG service still present

### Test: Badge Count Updates
1. Start with empty config
2. Add LLM provider → verify Providers badge shows "1"
3. Add another LLM → verify badge shows "2"
4. Add RAG service → verify badge shows "3" (combined LLM + RAG)
5. Delete LLM → verify badge shows "2"

### Test: State Preservation Across Tabs
1. Add LLM provider (do not click Apply)
2. Switch to Handlers tab
3. Switch back to Providers tab
4. Verify unsaved LLM is still in working config
5. Click Validate → verify LLM is included in validation

### Test: Disabled Tab Tooltips
1. Start with empty config
2. Hover over Embeddings tab → verify tooltip: "Configure RAG Services first"
3. Click Embeddings tab → verify no navigation occurs
4. Add RAG service
5. Hover over Embeddings tab → verify no tooltip (enabled)
6. Click Embeddings tab → verify navigation occurs

---

## Acceptance Criteria

- [ ] Vertical tab sidebar renders with 5 tabs: Providers, Embeddings, Intent, Handlers, Reasoning
- [ ] Active tab is visually distinct (highlighted, bold)
- [ ] Tab badges show accurate counts for Providers and Handlers sections
- [ ] Embeddings tab is disabled when no RAG services exist
- [ ] Embeddings tab becomes enabled after adding first RAG service
- [ ] Switching tabs preserves unsaved changes in `workingConfig`
- [ ] Disabled tabs show tooltips explaining prerequisites
- [ ] Existing Phase 2 functionality (add/edit/delete providers) works unchanged
- [ ] Action bar remains visible and functional on all tabs
- [ ] Placeholder sections (Embeddings, Intent, Handlers, Reasoning) display "Coming in Phase X" messages

