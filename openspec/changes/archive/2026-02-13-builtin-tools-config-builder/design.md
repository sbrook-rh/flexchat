## Context

Tool calling exists and works end-to-end. The current model requires every tool's full schema (description, parameters, handler, type) to be written into the config file. This is appropriate for mock tools and external HTTP tools (future), but wasteful for builtins whose schema is already defined in code. It also means configs silently drift if a builtin's description changes in code.

The standalone `/tools-testing` page duplicates provider and model selection machinery that exists elsewhere in the Config Builder, and lives outside the config workflow — users have to leave the Config Builder to test tools.

The current `ToolManager` is only instantiated when a `tools` config section is present, which means `/api/tools/available` can't exist as a stable endpoint in zero-config mode.

## Goals / Non-Goals

**Goals:**
- Builtins defined once in code; config only names them to activate
- Config Builder gains a Tools tab: discover, toggle, override, test — without leaving the builder
- Tool tests work against the *working config* (unapplied) using the same inline provider pattern as topic/intent testing
- Two new useful builtins: `get_current_datetime`, `generate_uuid`
- No new npm dependencies

**Non-Goals:**
- HTTP/external tool support (deferred to v2)
- Per-tool parameter configuration in the UI (description override only)
- Mock tool management in the UI (mock tools remain config-file-only for now)
- Persistent test history

## Decisions

### Decision 1: Manifest as static module, not dynamic registry

The builtins manifest (`builtins-manifest.js`) is a plain exported array of tool definitions — not a class, not a registry pattern. Builtins are known at build time; there is no plugin system or runtime registration needed. A static array is simpler to test, reason about, and extend.

**Alternative considered**: Extend `ToolHandlers` with a `getManifest()` method. Rejected — mixes handler implementation concerns with schema declaration. The manifest is pure data; it belongs separate from execution logic.

### Decision 2: Config registry entries are name-only (activation, not definition)

A registry entry `{ "name": "calculator" }` means "activate this builtin". The full schema comes from the manifest. An optional `description` field overrides the manifest description for this deployment.

This is a **breaking change** for the existing `08-tool-calling.json` example config and any user configs with full tool definitions. The migration path is mechanical: replace each full registry entry with `{ "name": "<tool-name>" }` and optionally keep a custom description.

**Why not support both formats?** Supporting both creates ambiguity and maintenance burden — "did I change the description in the manifest or the config?" One canonical source of truth per concept is cleaner.

### Decision 3: ToolManager always initialises; enabled state comes from registry length

Previously `toolManager` was `null` when no `tools` config section existed. Now it always initialises (with an empty registry if no config). `isEnabled()` returns `true` if the registry has at least one tool — no separate `enabled` flag needed.

**Why remove the explicit `enabled` flag?** An empty registry means zero tools — the LLM never sees any tools, which is functionally identical to `enabled: false`. Having both a flag and an empty registry as two ways to express "no tools" adds confusion.

### Decision 4: Inline provider testing via extended `POST /api/tools/test`

The existing `/api/tools/test` endpoint accepts `{ llm, model, query }` where `llm` is a registered provider name. A new parallel mode accepts `{ provider_config, model, query, registry }` — the full provider config object and the working registry array — and instantiates a temporary provider on the fly.

This mirrors the pattern established by `/api/connections/topic/test` and `/api/connections/intent/test`. The two modes are distinguished by presence of `provider_config` vs `llm` in the request body. Both modes remain supported so the standalone test API (if used directly) is not broken.

**Why not a separate endpoint?** The operation is the same — run a tool test. The only difference is how the provider is resolved. A single endpoint with two resolution modes is simpler to document and call.

### Decision 5: Tools Section fetches available builtins once on mount

`ToolsSection` fetches `GET /api/tools/available` on mount to get the full manifest. It derives the "enabled" state per tool by checking if that tool's name appears in `workingConfig.tools?.registry`. Toggling a tool on/off writes directly to `workingConfig.tools.registry` via `onUpdate()`. No local copy of the registry is maintained — the source of truth is `workingConfig`.

### Decision 6: Tool test in Config Builder uses working config's registry

When the user runs a test from the Tools section, the request sends:
- `provider_config`: `workingConfig.llms[selectedLlm]`
- `model`: the selected model
- `query`: the test query
- `registry`: `workingConfig.tools?.registry ?? []`

The backend resolves registry names against the manifest and runs the test. This means the user can test tools that are toggled on in the working config *before* applying — consistent with how topic/intent testing works.

### Decision 7: Remove ToolTesting standalone page entirely

The standalone `/tools-testing` route, `ToolTesting.jsx` component, and nav link are deleted. The test functionality is fully replicated inside `ToolsSection`. There is no migration needed — it was not a persistent feature (no saved state).

## Risks / Trade-offs

- **Breaking config change** → Migration is mechanical (name-only entries). The example config is updated. Users with custom configs need to update manually; a startup warning is logged if a registry entry contains fields beyond `name` and `description`.
- **Manifest divergence from handlers** → If someone adds a handler but forgets to add it to the manifest (or vice versa), the system will either have an unexecutable tool or an invisible tool. Mitigation: `ToolManager.loadTools()` logs a warning if a manifest tool has no registered handler at startup.
- **`isEnabled()` semantic change** → Code that checks `toolManager.isEnabled()` now gets `true` whenever tools are configured, rather than only when `enabled: true` is set. Existing callers in the response-generation pipeline use this correctly — they gate tool calls on `isEnabled()` returning true, which is now driven by registry content.

## Migration Plan

1. Update `backend/chat/tools/` — manifest, handlers, manager, registry validation relaxed for name-only entries
2. Update `backend/chat/routes/tools.js` — add `/available`, extend `/test` with inline mode
3. Update `backend/chat/server.js` — unconditional ToolManager init
4. Update `config/examples/08-tool-calling.json` — name-only registry
5. Add `frontend/src/sections/ToolsSection.jsx`
6. Update `ConfigBuilder.jsx` + `NavigationSidebar.jsx`
7. Remove `ToolTesting.jsx`, update `App.jsx`

Rollback: revert the above files. No database migrations, no persistent state changes.

## Open Questions

_None — resolved in design session._
