## Why

Builtin tools currently require their full schema (description, parameters, handler name) to be duplicated in every config file that uses them — coupling tool *existence* (defined in code) with tool *activation* (defined in config). This creates unnecessary boilerplate, risks drift between code and config, and buries tool configuration inside a standalone page rather than the Config Builder where users manage everything else.

## What Changes

- **New builtin tools**: `get_current_datetime` (returns real current time by timezone) and `generate_uuid` (returns a cryptographically random UUID) are added as first-class builtins alongside the existing `calculator` and `echo`.
- **Builtins manifest**: A static source-of-truth file in code defines the full schema for every builtin tool (name, description, parameters, handler). Config files no longer need to repeat this.
- **Config schema simplified** (**BREAKING**): The `tools.registry` array switches from full tool definitions to name-only activation entries. Existing configs with full definitions will need to be updated.
- **New API endpoint**: `GET /api/tools/available` returns all builtins from the manifest, enabling the UI to discover what can be enabled.
- **ToolManager always initialises**: Previously skipped if no `tools` config section; now always created so `/api/tools/available` works in zero-config mode.
- **Tools UI moves to Config Builder**: A new Tools tab in the Config Builder replaces the standalone `/tools-testing` route. Tool toggling, description overrides, and test execution all live there.
- **Standalone tool testing page removed**: `/tools-testing` route, the `ToolTesting` component, and the "Tool Testing" nav link are deleted.
- **Example config updated**: `08-tool-calling.json` switches to name-only registry entries and adds the two new builtins.

## Capabilities

### New Capabilities

- `builtin-tools-manifest`: A static manifest in code defines all available builtin tools (name, description, parameters, handler). The manifest is the single source of truth for tool schemas; config only activates tools by name.
- `tools-config-builder-section`: A Tools tab in the Config Builder allows users to discover available builtins, toggle them on/off, optionally override descriptions, and run test queries — replacing the standalone tool testing page.

### Modified Capabilities

- `tool-registry`: Registration changes from loading full definitions from config to looking up definitions from the manifest and applying optional config overrides (description only). A registry entry with only a `name` field is now valid.
- `tool-testing`: The standalone `/tools-testing` route and `ToolTesting` component are removed. Test execution capability moves into the Config Builder Tools section.

## Impact

- **Backend**: `backend/chat/tools/` — new `builtins-manifest.js`; updated `manager.js`, `handlers.js`, `registry.js`; updated `routes/tools.js` (new `/available` endpoint); updated `server.js` (always init ToolManager).
- **Frontend**: New `frontend/src/sections/ToolsSection.jsx`; updated `ConfigBuilder.jsx` and `NavigationSidebar.jsx`; removed `ToolTesting.jsx`; updated `App.jsx`.
- **Config**: `config/examples/08-tool-calling.json` updated to name-only registry format.
- **Breaking**: Any config using full tool definitions in `tools.registry` (type, builtin_handler, parameters inline) will need to be simplified to name-only entries, relying on the manifest for schema.
- **No new dependencies**: `get_current_datetime` uses Node's built-in `Intl` API; `generate_uuid` uses `crypto.randomUUID()`.
