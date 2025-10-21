## Development Workflow

**For detailed development workflow and collaboration practices, see:**
- `ai/WORKFLOW.md` - Portable development workflow (can be copied to other projects)
- `ai/PROJECT.md` - Flex Chat specific context and guidelines

**Quick Reference:**
- **Ways of Working**: Discuss → Confirm → Run, Transparency, Safety, Scope control
- **Code Comments**: Describe WHAT, not WHY or HISTORY
- **Change Planning**: Simplicity first, Evidence before edits, Never make assumptions
- **Git Safety**: Atomic commits, individual file adds, review before committing

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
