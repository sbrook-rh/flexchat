# Configuration Builder Navigation Refactor

## Why

The Configuration Builder currently uses a flat layout that works well for Phase 2 (LLM and RAG provider configuration), but won't scale to accommodate the 6+ configuration sections planned for Phases 3-5:

1. **LLM Providers**
2. **RAG Services** (with Embeddings subsection)
3. **Embeddings** (only when RAG services exist)
4. **Intent Detection**
5. **Response Handlers**
6. **Reasoning** (future)

Without structured navigation, the UI will become overwhelming and confusing. Users need clear visual organization and the ability to focus on one configuration aspect at a time.

**Problem**: Flat layout doesn't provide clear section boundaries or navigation affordances.

**Opportunity**: Introduce vertical tab navigation before Phase 3 adds complexity, ensuring a scalable UX foundation.

## What Changes

### Navigation Architecture
- **Vertical tab sidebar** on the left side of ConfigBuilder
- **Tab sections** for each configuration area (Providers, Embeddings, Intent, Handlers, Reasoning)
- **Conditional tab enabling** (e.g., Embeddings tab only appears when RAG services configured)
- **Active tab highlighting** with visual indicators
- **Tab state persistence** (remember last active tab)

### Component Structure
```
ConfigBuilder (refactored)
├── NavigationSidebar (new)
│   └── Tab items with icons, labels, badges
├── ContentArea (new)
│   ├── ProvidersSection (existing ProviderList)
│   ├── EmbeddingsSection (Phase 3 - placeholder)
│   ├── IntentSection (Phase 3 - placeholder)
│   ├── HandlersSection (Phase 4 - placeholder)
│   └── ReasoningSection (Phase 5 - placeholder)
└── ActionBar (existing - Validate, Apply, Export)
```

### Visual Design
- **Icons** for each tab (e.g., 🔌 Providers, 📚 RAG, 🎯 Intent, 🔀 Handlers)
- **Badge indicators** showing counts (e.g., "3 LLMs", "2 RAG services")
- **Disabled state** for tabs that require prerequisites
- **Responsive layout** (collapsible sidebar for smaller screens - Phase 5)

### No Backend Changes
This is a pure frontend UX refactor. All existing APIs and state management remain unchanged.

## Impact

### Affected Specs
- `config-builder` - MODIFIED: Add navigation and section organization requirements

### Affected Code
- **Frontend** (`frontend/src/`):
  - Modified: `ConfigBuilder.jsx` - Add tab navigation and routing
  - New: `NavigationSidebar.jsx` - Tab list component
  - Modified: `ProviderList.jsx` - Wrapped in ProvidersSection
  - New: `ConfigSection.jsx` - Base component for content sections
  - Updated: Styling for two-column layout

### Breaking Changes
**NONE** - Pure UI refactor, no API or data model changes

### Dependencies
- **Depends on**: `config-builder-system` Phase 2 (complete)
- **Blocks**: `config-builder-system` Phase 3 (Intent & Embeddings UI)
- **Enables**: Scalable addition of future configuration sections

## Success Criteria

1. **Tab Navigation**: Users can switch between Providers, Embeddings, Intent, Handlers, Reasoning tabs
2. **Conditional Enabling**: Embeddings tab only appears when RAG services exist
3. **Visual Clarity**: Active tab is clearly highlighted, inactive tabs are visually distinct
4. **State Preservation**: Switching tabs preserves unsaved changes (workingConfig remains intact)
5. **Badge Indicators**: Tabs show counts of configured items (e.g., "3" badge on LLM Providers tab)
6. **Backward Compatibility**: Existing Phase 2 functionality (add/edit/delete providers) works unchanged

## Risks & Mitigations

### Risk: Breaking Existing Phase 2 Functionality
**Mitigation**: Wrap existing ProviderList in new layout without changing its internal logic. Test thoroughly.

### Risk: Over-Engineering the Navigation
**Mitigation**: Start with simple vertical tabs. Defer advanced features (search, collapsing, responsive) to Phase 5.

### Risk: Tab State Management Complexity
**Mitigation**: Use simple `activeTab` state in ConfigBuilder. No routing library needed yet.

## Open Questions

1. Should we use React Router for tab URLs (e.g., `/config#providers`)?
   - **Recommendation**: No, defer to Phase 5. Simple state-based tabs are sufficient.
2. Should tabs show validation status (errors/warnings)?
   - **Recommendation**: Yes, add error badge indicator (red dot) when section has validation issues.
3. Should we add keyboard shortcuts for tab switching?
   - **Recommendation**: Defer to Phase 5 polish.
4. Should disabled tabs show tooltips explaining prerequisites?
   - **Recommendation**: Yes, simple tooltip like "Configure RAG Services first".

## Estimated Complexity

**Small** (1-2 days)
- Create NavigationSidebar component (~2-3 hours)
- Refactor ConfigBuilder layout (~2-3 hours)
- Add tab state management (~1 hour)
- Add conditional tab enabling logic (~1 hour)
- Styling and polish (~2-3 hours)
- Testing existing functionality still works (~1-2 hours)

