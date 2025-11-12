# Configuration Builder Navigation - Design Decisions

## Overview

This document captures design decisions made during the navigation refactor of the Configuration Builder UI.

---

## Decision 1: Vertical Tab Layout

**Context:**  
The Configuration Builder will grow to include 6+ distinct configuration sections (Providers, Embeddings, Intent, Handlers, Reasoning). A flat single-page layout won't scale.

**Decision:**  
Implement a **vertical tab sidebar** on the left side of the ConfigBuilder with content area on the right.

**Alternatives Considered:**
1. **Horizontal tabs** (like browser tabs)
   - ❌ Doesn't scale well beyond 5-6 tabs
   - ❌ Long labels get truncated
   - ❌ Less room for badges and icons
2. **Accordion/collapsible sections** (all in one scrollable page)
   - ❌ Doesn't provide clear focus
   - ❌ User must scroll to find sections
   - ❌ Hard to see validation status at a glance
3. **Multi-step wizard** (with Next/Back buttons)
   - ❌ Too linear, prevents jumping between sections
   - ❌ Users may need to reference earlier sections while configuring later ones

**Rationale:**
- Vertical tabs scale to many sections without crowding
- Clear visual hierarchy and focus
- Room for icons, labels, and badge indicators
- Common pattern in settings UIs (VS Code, Jira, etc.)
- Allows non-linear navigation (jump directly to any section)

---

## Decision 2: Simple State-Based Tabs (No Routing Library)

**Context:**  
Tab state could be managed via React state, URL hash fragments (`#providers`), or a full routing library (React Router).

**Decision:**  
Use **simple React state** (`activeTab` string variable) for Phase 2.5. Defer URL routing to Phase 5.

**Rationale:**
- Simpler implementation (no new dependencies)
- Sufficient for current needs (no deep-linking required yet)
- Easier to test and reason about
- Can add URL routing later without breaking changes
- Reduces scope creep for this focused refactor

**Future Migration Path:**
Phase 5 can add `react-router-dom` and use URL hash or path-based routing if deep-linking becomes valuable.

---

## Decision 3: Conditional Tab Enabling

**Context:**  
Some configuration sections depend on others (e.g., Embeddings require RAG services, Intent requires at least one LLM).

**Decision:**  
Tabs have **enabled/disabled states** based on current `workingConfig`:
- **Embeddings tab**: Enabled only when `workingConfig.rag_services` has at least one entry
- **Intent tab**: Enabled only when `workingConfig.llms` has at least one entry (Phase 3+)
- **Handlers tab**: Always enabled
- **Reasoning tab**: Enabled only when at least one response handler exists (Phase 5+)

**Visual Treatment:**
- Disabled tabs are grayed out with reduced opacity
- Disabled tabs show a tooltip on hover explaining the prerequisite
- Disabled tabs cannot be clicked

**Rationale:**
- Prevents user confusion (can't configure embeddings without RAG)
- Provides clear affordance for configuration dependencies
- Tooltips guide users on what to do next
- Common pattern in multi-step configuration UIs

---

## Decision 4: Badge Indicators for Counts

**Context:**  
Users need quick visibility into how many items are configured in each section without navigating to that tab.

**Decision:**  
Display **badge counts** on relevant tabs:
- **LLM Providers tab**: Show count of configured LLMs (e.g., "3")
- **RAG Services tab**: Show count of configured RAG services (e.g., "2")
- **Response Handlers tab**: Show count of configured handlers (e.g., "5")
- **Intent tab**: Show count of defined intents (Phase 3+)

**Visual Treatment:**
- Small circular badge next to tab label
- Gray background with white text for counts
- Red background for validation errors in that section (Phase 5+)

**Rationale:**
- At-a-glance status visibility
- Users can quickly see if sections are populated
- Common pattern in navigation UIs (unread counts, notification badges)
- Supports future validation status indicators

---

## Decision 5: Section Component Architecture

**Context:**  
Need consistent structure for all configuration sections while allowing flexibility for different content types.

**Decision:**  
Create a **`ConfigSection` wrapper component** that provides:
- Section title
- Optional description text
- Content area (passed as children)
- Optional header actions (e.g., "Add Provider" button)

All section-specific components (ProvidersSection, IntentSection, etc.) use this wrapper for consistency.

**Component Hierarchy:**
```
ConfigBuilder
├── NavigationSidebar
│   └── Tab items (dynamic based on workingConfig)
├── ContentArea
│   └── {activeTab === 'providers' && <ProvidersSection />}
│   └── {activeTab === 'embeddings' && <EmbeddingsSection />}
│   └── {activeTab === 'intent' && <IntentSection />}
│   └── {activeTab === 'handlers' && <HandlersSection />}
│   └── {activeTab === 'reasoning' && <ReasoningSection />}
└── ActionBar (Validate, Apply, Export, Cancel)
```

**Rationale:**
- Consistent UX across all sections
- Easier to add new sections in future phases
- Separation of concerns (navigation vs. content)
- Reusable styling and layout logic

---

## Decision 6: Preserve Existing Provider Management

**Context:**  
Phase 2 already implements provider add/edit/delete with LLMWizard and RAGWizard. Must not break this functionality.

**Decision:**  
**Wrap existing `ProviderList` component** in a new `ProvidersSection` component without modifying its internal logic.

**Implementation:**
- `ProvidersSection.jsx` imports and renders `ProviderList`
- `ProviderList` receives the same props as before (`workingConfig`, `appliedConfig`, `onSave`, `onDelete`)
- All existing wizards (LLMWizard, RAGWizard) continue to work unchanged

**Rationale:**
- Minimizes risk of breaking existing functionality
- Separates navigation refactor from provider management logic
- Allows thorough testing of existing features in new layout
- Follows "wrap, don't rewrite" principle for low-risk refactors

---

## Decision 7: Tab Icons (Emoji-Based)

**Context:**  
Tab labels benefit from visual icons for quick scanning, but adding icon libraries increases bundle size.

**Decision:**  
Use **emoji icons** for initial implementation:
- 🔌 Providers (LLM + RAG)
- 📦 Embeddings
- 🎯 Intent
- 🔀 Handlers
- 🧠 Reasoning

**Future Migration:**
Phase 5 can replace with custom SVG icons or an icon library (lucide-react, heroicons) if needed.

**Rationale:**
- Zero dependencies, universal support
- Good enough for MVP navigation
- Easy to replace later if needed
- Reduces scope of this refactor

---

## Decision 8: Action Bar Placement (Bottom of Content)

**Context:**  
The action bar (Validate, Apply, Export, Cancel) needs to remain accessible regardless of active tab.

**Decision:**  
Keep action bar at the **bottom of the content area** (not in sidebar), spanning full width.

**Visual Treatment:**
- Fixed or sticky bottom bar (investigate based on content height)
- Always visible regardless of tab
- Same styling as Phase 2

**Rationale:**
- Actions apply to entire configuration, not individual tabs
- Consistent with Phase 2 behavior (no breaking UX change)
- Easier to implement than duplicate buttons per section
- Clear visual separation between navigation and actions

---

## Decision 9: Placeholder Sections for Future Phases

**Context:**  
Phases 3-5 will add Embeddings, Intent, and Handlers sections. Don't want to implement full functionality now, but want tabs to exist.

**Decision:**  
Create **placeholder section components** that display:
- Section title and description
- "Coming in Phase X" message
- Optional mockup or screenshot of planned UI

**Rationale:**
- Makes future scope visible to users (transparency)
- Validates navigation UX before building complex sections
- Easier to iterate on layout with all tabs present
- Reduces risk of major refactor later ("we didn't account for 6 tabs!")

---

## Decision 10: No Responsive Layout (Yet)

**Context:**  
Configuration Builder might be used on tablets or smaller laptop screens. Vertical sidebar could feel cramped.

**Decision:**  
**Defer responsive layout to Phase 5**. Initial implementation assumes desktop-class screen sizes (≥1280px width).

**Future Enhancements (Phase 5):**
- Collapsible sidebar on smaller screens
- Hamburger menu for tab navigation
- Mobile-optimized single-column layout

**Rationale:**
- Configuration is primarily a desktop/laptop task
- Reduces scope of this refactor
- Can gather user feedback on desktop UX first
- Mobile/tablet optimization is a separate concern

---

## Decision 11: Tab Validation Status Indicators

**Context:**  
When validation runs, some sections may have errors while others are valid. Users need to know which sections need attention.

**Decision:**  
**Phase 5 enhancement** - Add small red dot indicator on tabs with validation errors.

**Deferred because:**
- Phase 2 validation is global (validates entire config)
- Per-section error tracking requires deeper changes to validation logic
- Current scope is navigation structure, not validation UX

**Future Implementation:**
Validation results could be structured as:
```javascript
{
  providers: { errors: [...], warnings: [...] },
  embeddings: { errors: [...], warnings: [...] },
  intent: { errors: [...], warnings: [...] },
  handlers: { errors: [...], warnings: [...] }
}
```

---

## Decision 12: Tab Order

**Context:**  
Configuration sections have a logical dependency flow. Tab order should reflect recommended configuration sequence.

**Decision:**  
Fixed tab order (top to bottom):
1. **Providers** (LLMs + RAG) - Foundation
2. **Embeddings** - Depends on RAG services
3. **Intent** - Requires at least one LLM
4. **Handlers** - Defines response strategies
5. **Reasoning** - Advanced features (Phase 5+)

**Rationale:**
- Matches natural configuration workflow (providers → embeddings → routing → responses)
- Helps new users discover features in logical order
- Aligns with conditional enabling (dependencies flow downward)

**No Drag-and-Drop:**
Tab order is fixed, not user-customizable. Advanced users can jump tabs via click, but order remains constant.

---

## Open Questions (To Be Resolved During Implementation)

### Q1: Should we show "empty state" messaging in sections?
**Example:** "No LLM providers configured yet. Click 'Add LLM Provider' to get started."

**Recommendation:** Yes, add empty state messaging to all sections. Improves discoverability.

---

### Q2: Should tabs have keyboard shortcuts (e.g., Cmd+1, Cmd+2)?
**Recommendation:** Defer to Phase 5. Nice-to-have but not essential for MVP.

---

### Q3: Should we persist last active tab in localStorage?
**Recommendation:** Yes, simple enhancement. Store `lastActiveTab` and restore on next visit.

---

### Q4: Should switching tabs trigger auto-save of current tab's changes?
**Recommendation:** No. Tab switching preserves `workingConfig` state but doesn't commit. User must explicitly Validate → Apply.

---

## Visual Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│  Configuration Builder                        [Export] [×]   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  🔌 Providers│  Providers                                   │
│      (5)     │  ━━━━━━━━━                                   │
│              │                                              │
│  📦 Embeddings│  Configure your LLM and RAG providers here. │
│      (2)     │                                              │
│              │  LLM Providers (3)                           │
│  🎯 Intent   │  ┌────────────┐  ┌────────────┐             │
│      (0)     │  │ Ollama     │  │ OpenAI     │  [Add LLM]  │
│   [disabled] │  │ Connected  │  │ Connected  │             │
│              │  └────────────┘  └────────────┘             │
│  🔀 Handlers │                                              │
│      (3)     │  RAG Services (2)                            │
│              │  ┌────────────┐  ┌────────────┐             │
│  🧠 Reasoning│  │ Red Hat    │  │ Recipes    │  [Add RAG]  │
│   [Phase 5]  │  │ Connected  │  │ Connected  │             │
│              │  └────────────┘  └────────────┘             │
│              │                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  ⚠️ 2 warnings                                              │
│  [Validate] [Apply Changes] [Cancel]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This navigation refactor provides:
- ✅ Scalable UI for 6+ configuration sections
- ✅ Clear visual hierarchy and focus
- ✅ Conditional tab enabling based on dependencies
- ✅ At-a-glance status via badge counts
- ✅ No breaking changes to existing functionality
- ✅ Foundation for Phases 3-5 feature additions

**Next Steps:** Implement tasks in `tasks.md`, starting with NavigationSidebar component.

