# Implementation Tasks

## 1. Port Detection Logic
- [x] 1.1 Add helper function `getUsedPorts(services)` in RAGWizard.jsx to extract ports from service URLs
- [x] 1.2 Add helper function `getNextAvailablePort(basePort, usedPorts)` to find next sequential port
- [x] 1.3 Add unit tests or inline validation for port detection logic (inline validation via algorithm)

## 2. Wizard State Enhancement
- [x] 2.1 Accept `existingServices` prop in RAGWizard component (array of existing RAG service configs)
- [x] 2.2 Call smart default logic when provider is selected (step 1 → step 2 transition)
- [x] 2.3 Override schema default with computed smart default for `url` field
- [x] 2.4 Preserve edit mode behavior (don't change URL when editing existing service)

## 3. ConfigBuilder Integration
- [x] 3.1 Pass `services.rag` array to RAGWizard as `existingServices` prop
- [x] 3.2 Ensure services state includes the current configuration before opening wizard

## 4. Testing & Validation
- [x] 4.1 Manual test: No existing services → defaults to `http://localhost:5006`
- [x] 4.2 Manual test: One service on 5006 → defaults to `http://localhost:5007`
- [x] 4.3 Manual test: Services on 5006, 5007 → defaults to `http://localhost:5008`
- [x] 4.4 Manual test: Gap (5006, 5008) → defaults to `http://localhost:5007` (fills gap)
- [x] 4.5 Manual test: Edit existing service → keeps original URL (no smart default override)
- [x] 4.6 Manual test: Non-localhost URLs → ignored by smart default logic
- [x] 4.7 Verify no regression in LLM wizard (unchanged)

