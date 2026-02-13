## 1. Backend: Builtins Manifest

- [x] 1.1 Create `backend/chat/tools/builtins-manifest.js` exporting a static array of 3 builtin definitions: `calculator`, `get_current_datetime`, `generate_uuid`
- [x] 1.2 Add `get_current_datetime` handler to `backend/chat/tools/handlers.js` — uses `Intl.DateTimeFormat` and `Date`, no new dependencies, falls back to UTC on invalid timezone
- [x] 1.3 Add `generate_uuid` handler to `backend/chat/tools/handlers.js` — uses `crypto.randomUUID()`
- [x] 1.4 Remove `echo` handler registration from `handlers.js` (no longer a user-facing builtin)

## 2. Backend: Tool Manager + Registry

- [x] 2.1 Update `ToolManager.loadTools()` in `manager.js` to look up each registry entry by name in the manifest, apply optional `description` override, skip unknown names with a warning
- [x] 2.2 Update `ToolManager.isEnabled()` to return `true` when registry has at least one tool (remove dependency on explicit `enabled` flag)
- [x] 2.3 Update `ToolRegistry.register()` in `registry.js` to accept name-only entries (relax validation — full schema comes from manifest, not caller)
- [x] 2.4 Add deprecation warning in `loadTools()` when a registry entry contains unexpected fields beyond `name` and `description`

## 3. Backend: Server + Routes

- [x] 3.1 Update `server.js` to always create `ToolManager` (remove `if (processedConfig.tools)` guard), passing `processedConfig.tools || {}`
- [x] 3.2 Add `GET /api/tools/available` endpoint to `routes/tools.js` — returns all manifest builtins, always HTTP 200
- [x] 3.3 Extend `POST /api/tools/test` in `routes/tools.js` to support inline mode: accept `{ provider_config, model, query, registry }`, instantiate a temporary provider, resolve registry against manifest, run test
- [x] 3.4 Keep existing named-provider mode (`{ llm, model, query }`) working alongside new inline mode

## 4. Config + Example Update

- [x] 4.1 Update `config/examples/08-tool-calling.json` — replace full inline tool definitions with name-only entries, add `get_current_datetime` and `generate_uuid` entries, remove `get_weather` mock, update comments

## 5. Frontend: ToolsSection

- [x] 5.1 Create `frontend/src/sections/ToolsSection.jsx` — fetches `/api/tools/available` on mount, renders each builtin as a toggleable card showing name and description
- [x] 5.2 Implement toggle on/off: adds/removes `{ name }` entry from `workingConfig.tools.registry`; creates `tools: { enabled: true, max_iterations: 5, registry: [] }` if section absent; calls `onUpdate()`
- [x] 5.3 Implement description override field — shown when tool is enabled, writes `description` into the registry entry, clears field removes the key
- [x] 5.4 Add LLM provider + model selector to test panel — pulls providers from `workingConfig.llms`, fetches models per provider (reuse existing model discovery API)
- [x] 5.5 Implement Run Test — sends `{ provider_config, model, query, registry }` to `POST /api/tools/test`, shows loading state, disables button during run
- [x] 5.6 Render test results — tool calls (name, params, result, iteration, execution time), final response, metadata (model, provider, tool call count), max_iterations warning
- [x] 5.7 Disable Run Test button when no tools are toggled on or no providers configured; show explanatory message

## 6. Frontend: Config Builder Integration

- [x] 6.1 Add Tools tab to `NavigationSidebar.jsx` — icon 🔧, label "Tools", enabled when `llmCount > 0`, tooltip "Configure at least one LLM Provider first" when disabled, badge shows `workingConfig.tools?.registry?.length ?? 0`
- [x] 6.2 Add `tools` badge count to `getTabStates()` in `ConfigBuilder.jsx`
- [x] 6.3 Add `case 'tools':` to `renderActiveSection()` in `ConfigBuilder.jsx` — renders `<ToolsSection workingConfig={workingConfig} onUpdate={...} />`
- [x] 6.4 Import `ToolsSection` in `ConfigBuilder.jsx`

## 7. Frontend: Remove Standalone Tool Testing

- [x] 7.1 Delete `frontend/src/ToolTesting.jsx`
- [x] 7.2 Remove `/tools-testing` route and `ToolTesting` import from `frontend/src/App.jsx`

## 8. Verification

- [ ] 8.1 Start server with no `tools` config section — confirm `/api/tools/list` returns `[]`, `/api/tools/available` returns 3 builtins
- [ ] 8.2 Config Builder → Tools tab disabled with no LLM providers; enabled after adding one
- [ ] 8.3 Toggle `get_current_datetime` on → `workingConfig.tools.registry` gains `[{ name: "get_current_datetime" }]`; toggle off → entry removed
- [ ] 8.4 Run test query "What time is it in Tokyo?" with a tool-capable model — tool call executes, real time returned
- [ ] 8.5 Override description on `calculator` → export config → reimport → description present in registry entry
- [ ] 8.6 Confirm `/tools-testing` route returns 404 and "Tool Testing" link is gone from nav
- [x] 8.7 Run `npm test` in `backend/chat` — all existing tests pass
