## Ways of Working
- Discuss → Confirm → Run: we talk through intent first, then I make changes only after your explicit go-ahead.
- Transparency: I announce planned commands and summarize expected effects before running them.
- Safety: anything requiring network or privileged access is requested before execution.
- Scope control: changes are surgical and focused; I won't fix unrelated issues without agreement.
- Logging: impactful commands and changes are recorded in `SESSION_LOG.md`.
- Documentation: Keep only README.md in root; all other documentation goes in `docs/` folder.

## Documentation Guidelines
- **Document what we DO, not what we DON'T**: Avoid negative statements like "we don't store X" or "this won't do Y" - they cause confusion later. Focus on what the system actually does.
  - ❌ Bad: "We don't store RAG documents with messages (too large)"
  - ✅ Good: "Store topic and rag_result with each message"
- **Be concise**: Documentation should be scannable. Use the README as an overview that points to detailed docs.
- **Update systematically**: When changing functionality, update related docs immediately (README, CHANGELOG, TODO, relevant docs/).
- **Link liberally**: Cross-reference related documentation rather than duplicating information.

## Code Comment Guidelines
- **Describe WHAT, not WHY or HISTORY**: Comments should explain what the code is doing, not why it was changed or what it fixes.
  - ❌ Bad: `// Fixed bug where RAG context was lost` or `// Changed to support multiple collections`
  - ❌ Bad: `// TODO: This needs refactoring because the old approach was slow`
  - ✅ Good: `// Query all configured RAG services with the detected topic`
  - ✅ Good: `// Combine documents from multiple collections, removing duplicates`
- **Commit messages are for history**: Use git commits to document why changes were made, what problems they solve, and design decisions.
- **JSDoc for APIs**: Use JSDoc comments for function signatures, parameters, and return values.
- **Inline comments for clarity**: Use inline comments sparingly to explain complex logic or non-obvious code.
- **Remove outdated comments**: Delete comments that no longer apply rather than leaving them to cause confusion.

## Change Planning
- Simplicity first: prefer the minimal, robust fix over broader refactors.
- Evidence before edits: capture one concrete log/command showing the issue and the expected vs. actual behavior.
- Minimal-first fix: add the smallest instrumentation to confirm the hypothesis, apply the smallest viable change in one place, validate, then consider refactors.
- **NEVER make assumptions**: If you don't know the answer, STOP and investigate. Don't code based on guesses.
- **Discuss-first triggers**: pause and align before making ANY edits when any apply:
  - Changes span multiple files or >50 lines, or alter cross-cutting behavior
  - External contracts/data shapes are uncertain or unverified
  - Adding/removing routes/endpoints, or touching persistence
  - I cannot reproduce locally and would be guessing
  - Making ANY assumption about how something should work
  - Adding new fields/parameters without verifying they're needed
- **Stop if it grows**: If you start a change and realize it's becoming larger or touching more things than expected, STOP and discuss breaking it into smaller steps. Don't barrel through.
- Git safety: 
  - NEVER use `git add -A` or `git add .` - always add files individually to avoid accidentally committing secrets or sensitive files.
  - Make atomic commits where each commit contains all changes required for a single logical change.
  - Avoid "initial commit" with all code - build up the repository incrementally with meaningful commits.
  - Always review what's being committed before committing.
- Proposal template I'll use:
  - Evidence (1–2 observations from actual code/config/logs)
  - Options (A: smallest, B: robust, C: longer-term)
  - Expected outcome (what we'll see if it works)
  - Rollback (what to revert if it doesn't)

## Debugging Complex Logic Flows
When investigating or changing complex multi-step logic (e.g., strategy detection, RAG flows):

1. **Walk Through Current Flow**
   - Trace the actual code execution path step-by-step
   - Document what happens at each decision point
   - Identify where the current behavior diverges from expected

2. **Real-World Scenario Analysis**
   - Create a concrete, realistic example scenario
   - Walk through what WOULD happen with actual data
   - Identify bugs, gaps, or inefficiencies in the flow

3. **Design Optimal Outcome**
   - Discuss what the IDEAL behavior should be from a user/business perspective
   - Consider edge cases (e.g., multiple matches, no matches, partial matches)
   - Define what the final result should look like (data structure, context, etc.)
   
4. **Plot Implementation Steps**
   - Break down the changes needed to achieve the optimal outcome
   - Identify which functions/sections need modification
   - Confirm the approach before coding

5. **Implement & Validate**
   - Make the changes systematically
   - Update related documentation (TODO, CHANGELOG, etc.)
   - Commit with clear explanation of the problem solved and approach taken
   - Use atomic commits - group all files that are part of the same logical change

**Example:** When fixing multi-collection RAG context combining, we:
- Traced current flow and found it returned after first candidate (bug)
- Analyzed real scenario: 2 collections both have relevant context
- Designed optimal outcome: combine context from all relevant collections
- Plotted steps: collect all candidates → dedupe prompt → combine context
- Implemented with clear code (no historical comments about the bug)
- Committed with message explaining what was fixed and why

## Testing Strategy
- **Mock external dependencies**: LLM responses, RAG query results, embeddings
- **Test the flow logic**: Topic detection, RAG collection search, profile building, response matching
- **Unit tests first**: Test individual functions with mocked dependencies
- **Integration tests**: Test full 4-phase flow end-to-end with mocks
- **E2E tests optional**: With real services for validation, not required for CI
- **Coverage priorities**:
  1. Topic detection and intent extraction (Phase 1)
  2. Multi-collection RAG search and context combining (Phase 2)
  3. Profile building and intent detection (Phase 3)
  4. Response handler matching logic (Phase 4a)
  5. Threshold and fallback logic
  6. Error handling and edge cases
  7. Provider abstraction interfaces

## Project Architecture (v2.0)
Flex Chat uses a **6-phase processing flow** for all chat requests:

1. **Topic Detection** (`lib/topic-detector.js`) - Extract user intent as a topic
2. **RAG Collection** (`lib/rag-collector.js`) - Query configured RAG services with topic, return normalized envelope
3. **Intent Detection** (`lib/intent-detector.js`) - Detect user intent with fast path for matches
4. **Profile Building** (`lib/profile-builder.js`) - Construct context from RAG results and intent
5. **Response Handler Matching** (`lib/response-matcher.js`) - Find first matching response rule
6. **Response Generation** (`lib/response-generator.js`) - Generate final response using matched handler

**Key Terminology:**
- **Response Handlers** (not "strategies") - Rules in `responses` array with match criteria
- **RAG Services** (not "knowledge bases") - Vector databases configured in `rag_services`
- **Profile** - Context object built in Phase 4, used for response handler matching
- **Topic** - User intent extracted in Phase 1, used for RAG queries
- **RAG Envelope** - Normalized `{ result: "match"|"partial"|"none", data }` format from Phase 2

**Configuration Structure:**
- `llms` - AI provider connections
- `rag_services` - Vector database connections
- `embedding` - Default embedding configuration
- `intent` - Intent detection settings
- `responses` - Response handlers (first match wins)

See `docs/ARCHITECTURE.md` for detailed documentation.

## Key Scripts and Config
- `./start.sh` - Start all services (frontend, chat server, RAG wrapper)
- `backend/chat/server.js --config <file>` - Start chat server with specific config
- `backend/rag/server.py --chroma-path <path> --port <port>` - Start RAG wrapper
- `config/examples/*.json` - Example configurations
- `FLEX_CHAT_CONFIG_FILE=<filename>` - Environment variable for config selection

## Common Tasks / Runbook


## Build and Deployment Operations

## How We Use the Session Log
Each session gets a dated section capturing decisions and changes. Keep entries **scannable and concise** - detailed "what" lives in git history, session log captures "why" and "what changed".

### Core Template (6 sections)

```markdown
## YYYY-MM-DD

### Context
- Brief: What were we trying to accomplish?
- Scope: What area of the system?

### Decisions
- Key design choices and rationale
- Tradeoffs considered
- Changes to approach during session

### Commands Run
- Only impactful commands (deployments, migrations, etc.)
- Skip routine file edits
- Include outputs if relevant for future troubleshooting

### Changes Made
- Group by type (Documentation, Features, Refactoring, Bug Fixes)
- One-liners with file/module names
- Link to commits for details (not full file lists)

### TODOs / Next
- Immediate next steps
- Blockers or dependencies

### Open Questions
- Unresolved issues
- Design decisions to revisit
```

### Guidelines

- **Be concise**: Aim for 30-60 lines per session, not 100+
- **Focus on decisions**: Why we chose approach A over B
- **Link, don't list**: "See commit abc123" instead of listing every file
- **Extra sections sparingly**: Add "Key Technical Points" or "Testing Done" only for complex implementation sessions
- **Group related changes**: "Updated 5 docs to v2.0" instead of listing each doc separately
